import { beforeAll, describe, expect, it } from 'vitest';
import { packFromBuiltin } from '../src/packCatalog.js';
import { registerComponentSchemas } from '../src/catalog.js';
import { lintComponentSpec } from '../src/lint.js';

// 2026-11-13: a wrong-typed value for a pack boolean or number property was saved without a word, while a wrong enum
// value was refused. The pack converts what it can (packPropertyTypes.ts in ToolJet): 'true'/'false' and numbers to a
// boolean, numeric text to a number; anything else becomes the empty value, so showAvatar "yes" turned the avatar off.
beforeAll(() => {
  const pack = packFromBuiltin({ pack: 'shadcn', displayName: 'shadcn UI', version: '1.0.0' } as never, {
    components: {
      ListView: {
        props: [
          { name: 'showAvatar', type: 'boolean', default: true },
          { name: 'rowHeight', type: 'number', default: 72 },
          { name: 'mode', type: 'enumeration', enumValues: ['list', 'grid'], default: 'list' },
        ],
      },
      Slider: { props: [{ name: 'value', type: 'number', default: 50 }] },
    },
  } as never)!;
  registerComponentSchemas(pack.schemas);
});

const lint = (type: string, properties: Record<string, unknown>) =>
  lintComponentSpec({ name: 'w', type, properties, layout: { top: 0, left: 2, width: 20, height: 60 } } as never).errors.join(' ');

describe('a pack boolean property', () => {
  it.each([['yes'], ['on'], [{}], [[true]]])('refuses %j, which the pack would read as false', (value) => {
    expect(lint('Lib_shadcn_ListView', { showAvatar: value })).toMatch(/"w".*showAvatar.*boolean/);
  });

  it.each([[true], [false], ['true'], ['FALSE'], [0], [3], ['{{queries.q.data.length > 0}}']])('accepts %j', (value) => {
    expect(lint('Lib_shadcn_ListView', { showAvatar: value })).not.toMatch(/showAvatar/);
  });
});

describe('a pack number property', () => {
  it.each([['tall'], [true], [{}]])('refuses %j, which the pack would read as empty', (value) => {
    expect(lint('Lib_shadcn_ListView', { rowHeight: value })).toMatch(/"w".*rowHeight.*number/);
  });

  it.each([[64], ['64'], ['1,200'], ['12%'], [''], ['{{72}}'], ['{{components.s.value}}']])('accepts %j', (value) => {
    expect(lint('Lib_shadcn_ListView', { rowHeight: value })).not.toMatch(/rowHeight/);
  });

  it('accepts a Slider range, which the Slider takes as well as a number', () => {
    expect(lint('Lib_shadcn_Slider', { value: [10, 40] })).not.toMatch(/"value"/);
  });
});

// Review of PR #142: the pack reads null as the type's empty value without a word (packPropertyTypes.ts), and MUI's
// NumberField defaults value, min and max to null, so clearing a minimum with null was refused.
describe('null, the empty value', () => {
  it('is accepted for a number property', () => {
    expect(lint('Lib_shadcn_ListView', { rowHeight: null })).not.toMatch(/rowHeight/);
    expect(lint('Lib_shadcn_ListView', { rowHeight: { value: null } })).not.toMatch(/rowHeight/);
  });

  it('is accepted for a boolean property', () => {
    expect(lint('Lib_shadcn_ListView', { showAvatar: { value: null } })).not.toMatch(/showAvatar/);
  });
});

describe('an enum, as before', () => {
  it('is still refused outside its values', () => {
    expect(lint('Lib_shadcn_ListView', { mode: 'bogus' })).toMatch(/unsupported property value "bogus"/);
  });
});

describe('a ToolJet component', () => {
  it('is not judged by value type', () => {
    expect(lint('Text', { text: 5 })).not.toMatch(/must be a/);
  });
});
