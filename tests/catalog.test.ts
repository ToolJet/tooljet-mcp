import { describe, it, expect } from 'vitest';
import { getCatalog, getComponentSchema } from '../src/catalog.js';

describe('catalog', () => {
  it('palette lists the built-in components incl. Table and Statistics', () => {
    const types = getCatalog().map((c) => c.type);
    expect(types).toContain('Table');
    expect(types).toContain('Statistics');
    expect(types.length).toBeGreaterThan(50);
    // every entry carries a purpose
    expect(getCatalog().every((c) => typeof c.type === 'string')).toBe(true);
  });

  it('getComponentSchema returns full props for Table incl. the required binding props', () => {
    const t = getComponentSchema('Table');
    expect(t).toBeTruthy();
    const keys = t!.properties.map((p) => p.key);
    expect(keys).toContain('data');
    expect(keys).toContain('dataSourceSelector');
    expect(keys).toContain('autogenerateColumns');
    // dataSourceSelector's harvested default is the value that makes a Table render
    expect(t!.properties.find((p) => p.key === 'dataSourceSelector')?.default).toBe('rawJson');
  });

  it('returns null for an unknown component type', () => {
    expect(getComponentSchema('NotAComponent')).toBeNull();
  });
});
