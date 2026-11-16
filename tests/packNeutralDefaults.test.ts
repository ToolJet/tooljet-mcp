import { describe, expect, it } from 'vitest';
import { packFromBuiltin } from '../src/packCatalog.js';

// 2026-11-13: add_components saved "" for antd Empty's description ("No data") and the shadcn ListView's actionLabel
// ("View"), neutral text the pack draws by default, because the sample-text rule goes by property name. And the catalog
// advertised every blanked default (Hero "Good morning, Ada") although "" was saved, so a build left it out expecting it.
const built = packFromBuiltin({ pack: 'demo', displayName: 'Demo', version: '1.0.0' } as never, {
  components: {
    Empty: { props: [{ name: 'description', type: 'string', default: 'No data' }] },
    ListView: { props: [{ name: 'actionLabel', type: 'string', default: 'View' }] },
    Hero: {
      props: [
        { name: 'eyebrow', type: 'string', default: 'Operations' },
        { name: 'title', type: 'string', default: 'Good morning, Ada' },
        { name: 'meta', type: 'array', default: ['14 bookings'] },
        { name: 'background', type: 'string', default: 'tint' },
      ],
    },
  },
} as never)!;

const saved = (type: string, key: string) =>
  (built.definitions[type] as { properties: Record<string, { value: unknown }> }).properties[key]?.value;
const advertised = (type: string, key: string) =>
  ((built.schemas[type] as unknown as { exposedVariables: Array<{ name: string; default?: unknown }> }).exposedVariables ?? []).find(
    (variable) => variable.name === key
  )?.default;

describe('pack defaults an agent-built component is saved with', () => {
  it.each([
    ['Lib_demo_Empty', 'description', 'No data'],
    ['Lib_demo_ListView', 'actionLabel', 'View'],
  ])('keep %s %s, neutral text', (type, key, value) => {
    expect(saved(type, key)).toBe(value);
    expect(advertised(type, key)).toBe(value);
  });

  it('blank sample content, and the catalog says so', () => {
    expect(saved('Lib_demo_Hero', 'eyebrow')).toBe('');
    expect(saved('Lib_demo_Hero', 'title')).toBe('');
    expect(saved('Lib_demo_Hero', 'meta')).toBe('{{[]}}');
    expect(advertised('Lib_demo_Hero', 'eyebrow')).toBe('');
    expect(advertised('Lib_demo_Hero', 'title')).toBe('');
    expect(advertised('Lib_demo_Hero', 'meta')).toEqual([]);
  });

  it('keep a neutral setting', () => {
    expect(saved('Lib_demo_Hero', 'background')).toBe('tint');
    expect(advertised('Lib_demo_Hero', 'background')).toBe('tint');
  });
});
