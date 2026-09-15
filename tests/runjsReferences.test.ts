import { describe, expect, it } from 'vitest';
import { runjsQueryReferences } from '../src/runjsReferences.js';
import { validateAppStructure } from '../src/lint.js';
import { lintPlannedApp } from '../src/appSpecLint.js';
import type { AppSummary } from '../src/tooljetClient.js';

describe('RunJS literal query references', () => {
  it('finds dot, optional and bracket reads in full bodies and template expressions', () => {
    expect(runjsQueryReferences('const a = queries.rows?.data; await queries?.refresh.run(); return `${queries["Load bookings"].data} ${queries?.["more"]?.data}`;'))
      .toEqual(['rows', 'refresh', 'Load bookings', 'more']);
  });

  it('ignores strings, comments, regexes, dynamic properties and other objects', () => {
    expect(runjsQueryReferences('/* queries.fake */ const sample = "queries.fake"; const re = /queries.fake/; const text = `queries.fake`; // queries.fake\n return queries[key] ?? other.queries.fake;')).toEqual([]);
  });

  it.each([
    'const queries = {}; return queries.local;',
    'return ((queries) => queries.local)({});',
    'const { x: queries } = input; return queries.local;',
    'const [queries] = input; return queries.local;',
    'try {} catch (queries) { return queries.local; }',
    'function queries() {} return queries.local;',
    'with (input) { return queries.local; }',
  ])('does not reject a shadowed or ambiguous namespace: %s', (code) => {
    expect(runjsQueryReferences(code)).toEqual([]);
  });

  it('does not confuse a destructured key with the local binding', () => {
    expect(runjsQueryReferences('const { queries: local } = input; return queries.real.data;')).toEqual(['real']);
  });

  it('never runs code and leaves syntax errors to syntax validation', () => {
    expect(runjsQueryReferences('throw new Error("do not execute"); return queries.rows.data;')).toEqual(['rows']);
    expect(runjsQueryReferences('return queries.')).toEqual([]);
  });

  const summary: AppSummary = {
    app_id: 'a', name: 'Analytics', version_id: 'v', pages: [], events: [],
    queries: [
      { id: 'q1', name: 'Load bookings', kind: 'tooljetdb', options: {} },
      { id: 'q2', name: 'metrics', kind: 'runjs', options: {
        code: 'const rows = (queries.loadBookings && queries.loadBookings.data) || []; return { count: rows.length };',
        runOnDependencyChange: false,
      } },
    ],
  };

  it('catches the saved hotel regression even without reactive dependency mode', () => {
    const result = validateAppStructure(summary);
    expect(result.errors.filter((error) => error.includes('loadBookings'))).toHaveLength(1);
    expect(result.errors.join(' ')).toMatch(/RunJS query "metrics".*no query is named "loadBookings".*empty-array fallback/);
  });

  it('accepts the exact persisted name using brackets', () => {
    const fixed = structuredClone(summary);
    fixed.queries[1]!.options = { code: 'return queries["Load bookings"].data;', runOnDependencyChange: false };
    expect(validateAppStructure(fixed).errors).toEqual([]);
  });

  it('blocks the mismatch during plan validation, before saving the app', () => {
    const result = lintPlannedApp({ queries: [{ name: 'metrics', kind: 'runjs', options: {
      code: 'return queries.loadBookings.data || [];',
    } }] }, { ...summary, queries: [summary.queries[0]!] });
    expect(result.errors.join(' ')).toMatch(/no query is named "loadBookings"/);
  });
});
