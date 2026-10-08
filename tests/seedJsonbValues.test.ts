import { describe, expect, it } from 'vitest';
import { lintPlannedApp } from '../src/appSpecLint.js';

// rn50 (2026-10-01): a jsonb column seeded with plain strings passed lint, and ToolJet DB refused the insert ("Expected
// JSON values in the following columns: affected_assets") twice, each failure consuming a plan token.
const table = { tableName: 't_incidents', columns: [{ name: 'id', type: 'serial', primaryKey: true }, { name: 'assets', type: 'jsonb' }, { name: 'title', type: 'string' }] };
const lint = (rows: Array<Record<string, unknown>>) => lintPlannedApp({ tables: [table], seedData: [{ tableName: 't_incidents', rows }] } as never);

describe('seed values for a jsonb column', () => {
  it('refuses a plain string or number, naming the column and rows', () => {
    const { errors } = lint([{ title: 'a', assets: ['srv-1'] }, { title: 'b', assets: 'srv-2, srv-3' }, { title: 'c', assets: 7 }]);
    expect(errors.join(' ')).toMatch(/"assets".*jsonb.*row\(s\) 2, 3/);
  });

  it('accepts objects, arrays, null and an omitted value', () => {
    expect(lint([{ title: 'a', assets: { items: ['x'] } }, { title: 'b', assets: [] }, { title: 'c', assets: null }, { title: 'd' }]).errors).toEqual([]);
  });
});
