import { afterEach, describe, expect, it } from 'vitest';
import { loadInstalledPacks, packFromBuiltin, type InstalledLibrary } from '../src/packCatalog.js';
import { libraryPins, libraryTypeOf, registerLibraryPacks, toLibraryComponent } from '../src/libraryPack.js';
import { lintComponentSpec } from '../src/lint.js';

// ToolJet #18746 ships its packs (server builtin-packs) and stores a pack component as PackComponent with only
// { pack, componentName }: no library identity, no version pin. The manifest comes from `tooljet library build`,
// which writes no manifestVersion.
const info = { pack: 'antd', displayName: 'Ant Design', version: '1.4.28', hash: 'abc123', hasCss: true };
const manifest = {
  components: {
    Button: { props: [{ name: 'label', type: 'string', default: 'Save' }], events: [{ name: 'onClick' }] },
    Card: { props: [{ name: 'title', type: 'string' }], slots: [{ name: 'body', kind: 'free' }] },
  },
} as unknown as NonNullable<InstalledLibrary['manifest']>;

const library: InstalledLibrary = {
  id: 'lib-1',
  name: 'shadcn UI',
  correlationId: 'corr-1',
  revisions: [{ version: '2.1.29' }],
  manifest: { manifestVersion: 2, pack: 'shadcn', components: { Text: { props: [{ name: 'text', type: 'string' }] } } },
};

afterEach(() => registerLibraryPacks([]));

describe('a pack ToolJet ships (builtin-packs)', () => {
  it('becomes Lib_<pack>_<Component> catalogue types from a manifest without manifestVersion', () => {
    const out = packFromBuiltin(info, manifest)!;
    expect(out.pack).toMatchObject({ pack: 'antd', prefix: 'Lib_antd_', kind: 'builtin', version: '1.4.28' });
    expect(Object.keys(out.schemas)).toEqual(['Lib_antd_Button', 'Lib_antd_Card']);
  });

  it('is written as PackComponent naming only its pack and component, with no version pin', () => {
    registerLibraryPacks([packFromBuiltin(info, manifest)!.pack]);
    const stored = toLibraryComponent({ name: 'save', type: 'Lib_antd_Button', properties: { label: { value: 'Go' } } });
    expect(stored.type).toBe('PackComponent');
    expect(stored.properties).toEqual({
      label: { value: 'Go' },
      pack: { value: 'antd' },
      componentName: { value: 'Button' },
    });
    expect(JSON.stringify(stored)).not.toMatch(/libraryId|correlationId|libraryName/);
    expect(libraryPins()).toBeUndefined();
  });

  it('reads a stored PackComponent back as its Lib_* type', () => {
    registerLibraryPacks([packFromBuiltin(info, manifest)!.pack]);
    const props = { pack: { value: 'antd' }, componentName: { value: 'Card' } };
    expect(libraryTypeOf({ type: 'PackComponent', properties: props })).toBe('Lib_antd_Card');
    expect(libraryTypeOf({ type: 'PackComponent', properties: { pack: { value: 'antd' }, componentName: { value: 'Nope' } } })).toBeUndefined();
    expect(libraryTypeOf({ type: 'Button', properties: props })).toBeUndefined();
  });

  it('does not report the pack keys as unknown properties', () => {
    const spec = { name: 'b', type: 'Lib_shadcn_Button', properties: { pack: { value: 'shadcn' }, componentName: { value: 'Button' } } };
    expect(JSON.stringify(lintComponentSpec(spec as never, {} as never))).not.toMatch(/"pack"|componentName/);
  });
});

describe('loadInstalledPacks', () => {
  it('prefers the shipped packs over installed libraries', async () => {
    let librariesRead = false;
    const ids = await loadInstalledPacks(
      async () => { librariesRead = true; return [library]; },
      async () => [{ info, manifest }],
    );
    expect(ids).toEqual(['Ant Design 1.4.28']);
    expect(librariesRead).toBe(false);
  });

  it('falls back to installed libraries on a server without builtin-packs, still writing LibraryComponent with pins', async () => {
    const ids = await loadInstalledPacks(async () => [library], async () => null);
    expect(ids).toEqual(['shadcn UI 2.1.29']);
    const stored = toLibraryComponent({ name: 't', type: 'Lib_shadcn_Text', properties: {} });
    expect(stored.type).toBe('LibraryComponent');
    expect(stored.properties).toMatchObject({ libraryId: { value: 'lib-1' }, correlationId: { value: 'corr-1' } });
    expect(libraryPins()).toEqual({ corr1: '2.1.29' });
    expect(libraryTypeOf({ type: 'LibraryComponent', properties: stored.properties })).toBe('Lib_shadcn_Text');
  });

  it('falls back when listing the shipped packs throws', async () => {
    const ids = await loadInstalledPacks(async () => [library], async () => { throw new Error('boom'); });
    expect(ids).toEqual(['shadcn UI 2.1.29']);
  });
});
