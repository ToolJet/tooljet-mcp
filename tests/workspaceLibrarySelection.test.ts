import { describe, expect, it } from 'vitest';
import { inPackSet, newPackSet } from '../src/packScope.js';
import { loadInstalledPacks } from '../src/packCatalog.js';
import { checkedLibrarySelection, componentLibraryChoices, resolveComponentLibrary, verifyLibrarySelection } from '../src/componentLibrary.js';
import { serverLibraryPacks, toLibraryComponent, missingLibraryPins } from '../src/libraryPack.js';

describe('workspace library selection', () => {
  it('keeps published SDK libraries alongside shipped packs and preserves their picker identity', async () => {
    await inPackSet(newPackSet(), async () => {
      const manifest = { components: { Gauge: { props: [] } } };
      const published = { id: 'orchard-id', correlationId: 'abcd-1234', name: 'Orchard Kit', revisions: [{ version: '1.7.0' }], manifest };
      await loadInstalledPacks(async () => [published, { ...published, id: 'draft', revisions: [] }, { ...published, id: 'internal', name: 'Internal', codeMode: true }], async () => [
        { info: { pack: 'polar', displayName: 'Polar Design', version: '2', hash: 'p' }, manifest },
      ]);
      expect(serverLibraryPacks().map(p => p.libraryName)).toEqual(['Polar Design', 'Orchard Kit']);
      const pick = resolveComponentLibrary({ componentLibrary: 'lib:orchard-id' }, []);
      expect(pick).toMatchObject({ library: 'ui2', selection: 'lib:orchard-id', source: 'saved' });
      const pack = serverLibraryPacks().find(p => p.libraryId === published.id)!;
      const value = 'lib:orchard-id';
      expect(checkedLibrarySelection(value)).toBe(value);
      expect(() => checkedLibrarySelection('lib:draft')).toThrow(/unavailable/);
      expect(() => checkedLibrarySelection(value, 'ui1')).toThrow(/only one/);
      const native = { id: 'old', type: 'Button' };
      const gauge = { id: 'new', type: pack.prefix + 'Gauge' };
      expect(verifyLibrarySelection(pick, [{ components: [native, gauge] }], value, ['old'])).toEqual([]);
      expect(verifyLibrarySelection(pick, [{ components: [native] }], value, [])).toHaveLength(1);
      expect(verifyLibrarySelection(pick, [{ components: [{ ...gauge, type: 'Lib_polar_Gauge' }] }], value, [])).toHaveLength(1);
      expect(verifyLibrarySelection(pick, [{ components: [gauge] }], 'pack:polar', [])).toHaveLength(1);
      const stored = toLibraryComponent({ type: pack.prefix + 'Gauge', properties: {} });
      expect(stored).toMatchObject({ type: 'LibraryComponent', properties: { libraryId: { value: published.id }, componentName: { value: 'Gauge' } } });
      expect(missingLibraryPins([stored], {})).toEqual({ abcd1234: '1.7.0' });
    });
  });

  it('offers the picker name and server alias for Rocket and distinguishes a workspace library with the same name', async () => {
    await inPackSet(newPackSet(), async () => {
      const manifest = { components: { Gauge: { props: [] } } };
      await loadInstalledPacks(async () => [
        { id: 'orchard-id', name: 'Rocket 2.0', correlationId: 'orchard-ref', revisions: [{ version: '1' }], manifest },
      ], async () => [{ info: { pack: 'shadcn', displayName: 'shadcn UI', version: '2', hash: 's' }, manifest }]);
      expect(componentLibraryChoices()).toEqual([
        { value: 'pack:shadcn', pack: 'shadcn', name: 'Rocket 2.0', aliases: ['shadcn UI'] },
        { value: 'lib:orchard-id', pack: 'liborchardid', name: 'Rocket 2.0' },
      ]);
    });
  });
});
