import { describe, expect, it } from 'vitest';
import { lintStageTables } from '../src/lint.js';

const table = (name: string, stage: string) => ({
  type: 'Table',
  name,
  properties: { data: { value: `{{(queries.candidates.data || []).filter((r) => r.stage === '${stage}')}}` } },
});

describe('tables that slice one query into stages', () => {
  it('suggests a board for three or more', () => {
    const warnings = lintStageTables(['Applied', 'Interview', 'Offer'].map((s) => table(s.toLowerCase(), s)) as never);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/ShadKanban.*statusField/);
  });
  it('stays quiet for two, or for unfiltered tables', () => {
    expect(lintStageTables([table('a', 'A'), table('b', 'B')] as never)).toEqual([]);
    const plain = ['x', 'y', 'z'].map((name) => ({ type: 'Table', name, properties: { data: { value: '{{queries.candidates.data}}' } } }));
    expect(lintStageTables(plain as never)).toEqual([]);
  });
});
