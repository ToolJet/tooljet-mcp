import { describe, expect, it } from 'vitest';
import { matchDatasourceByName } from '../src/datasourceNameMatch.js';

const sources = [
  { id: 'd1', name: 'tooljetdbdefault', kind: 'tooljetdb' },
  { id: 'd2', name: 'Fulfilment (MySQL)', kind: 'mysql' },
  { id: 'd3', name: 'restapidefault', kind: 'restapi' },
];

describe('matchDatasourceByName', () => {
  it('takes an exact name first', () => {
    expect(matchDatasourceByName(sources, 'Fulfilment (MySQL)')).toEqual({ id: 'd2', note: null });
  });
  it('maps names for the built-in database to the one tooljetdb source (a pets build gave up on "ToolJet Database")', () => {
    for (const name of ['ToolJet Database', 'ToolJet DB', 'tooljetdb', 'Tooljet database']) {
      const m = matchDatasourceByName(sources, name);
      expect(m?.id, name).toBe('d1');
      expect(m?.note).toContain('tooljetdbdefault');
    }
  });
  it('refuses a case mismatch of another source and an unknown name', () => {
    expect(matchDatasourceByName(sources, 'fulfilment (mysql)')).toBeNull();
    expect(matchDatasourceByName(sources, 'Salesforce')).toBeNull();
  });
  it('maps the built-in names only when the version has exactly one tooljetdb source', () => {
    expect(matchDatasourceByName([...sources, { id: 'd4', name: 'second', kind: 'tooljetdb' }], 'ToolJet DB')).toBeNull();
  });
});
