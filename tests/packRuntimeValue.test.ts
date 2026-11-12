import { describe, expect, it } from 'vitest';
import { loadInstalledPacks, packFromLibrary, type InstalledLibrary } from '../src/packCatalog.js';
import { normalizeComponentSpec } from '../src/componentNormalization.js';

// A pack input keeps what the user typed in a hidden `value` and starts from `defaultValue`. Offered as a setting,
// `value` was where a build "cleared" a money field's default: the field still opened at 1 (codex staging audit
// UI-05, 2026-10-26).
const library: InstalledLibrary = {
  id: 'lib-1',
  name: 'shadcn UI',
  correlationId: 'corr-1',
  revisions: [{ version: '2.1.29' }],
  manifest: {
    manifestVersion: 2,
    pack: 'shadcn',
    components: {
      NumberInput: {
        props: [
          { name: 'label', type: 'string', default: 'Quantity' },
          { name: 'defaultValue', type: 'number', default: 1 },
          { name: 'value', type: 'number', default: 1, inspector: 'hidden' },
          { name: 'required', type: 'boolean', default: false, inspector: 'hidden' },
        ],
      },
    },
  },
};

describe('a pack input\'s runtime value', () => {
  it('is exposed but not offered as a setting when the input has a default value', () => {
    const { schemas, definitions } = packFromLibrary(library)!;
    const schema = schemas.Lib_shadcn_NumberInput as unknown as {
      properties: Array<{ key: string }>;
      exposedVariables: Array<{ name: string }>;
    };
    const keys = schema.properties.map((p) => p.key);
    expect(keys).toContain('defaultValue');
    expect(keys).not.toContain('value');
    // Hidden settings the widget still honours stay settable.
    expect(keys).toContain('required');
    expect(schema.exposedVariables.map((v) => v.name)).toContain('value');
    expect(Object.keys((definitions.Lib_shadcn_NumberInput as { properties: object }).properties)).not.toContain('value');
  });

  it('moves a written value to the default value, and drops it beside one', async () => {
    await loadInstalledPacks(async () => [library]);
    const moved = normalizeComponentSpec({
      name: 'amountInput',
      type: 'Lib_shadcn_NumberInput',
      properties: { label: { value: 'Quoted amount' }, value: { value: '' } },
    } as never);
    const props = (moved.component as { properties: Record<string, { value: unknown }> }).properties;
    expect(props.defaultValue?.value).toBe('');
    expect(props.value).toBeUndefined();
    expect(moved.warnings.join('\n')).toMatch(/value.*defaultValue/);

    const both = normalizeComponentSpec({
      name: 'qty',
      type: 'Lib_shadcn_NumberInput',
      properties: { defaultValue: { value: '{{3}}' }, value: { value: '{{5}}' } },
    } as never);
    const kept = (both.component as { properties: Record<string, { value: unknown }> }).properties;
    expect(kept.defaultValue?.value).toBe('{{3}}');
    expect(kept.value).toBeUndefined();
  });
});
