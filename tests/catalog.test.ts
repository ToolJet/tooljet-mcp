import { describe, it, expect } from 'vitest';
import { getCatalog } from '../src/catalog.js';

describe('getCatalog', () => {
  it('includes Table and Text', () => {
    const types = getCatalog().map((e) => e.type);
    expect(types).toContain('Table');
    expect(types).toContain('Text');
  });

  it('Table documents the bindable data property', () => {
    const table = getCatalog().find((e) => e.type === 'Table')!;
    const data = table.properties.find((p) => p.name === 'data')!;
    expect(data.binds).toBe(true);
    expect(data.example).toContain('{{queries');
  });
});
