import { describe, expect, it } from 'vitest';
import { runjsComponentReferences, runjsQueryReferences } from '../src/runjsReferences.js';
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

describe('RunJS literal component references', () => {
  it('reads dot, optional, bracket and template-expression references without executing code', () => {
    const code = 'throw new Error("never execute"); const q = components.quarter?.value; return `${components["Quarter filter"].value} ${components?.["region"]?.value} ${components?.segment.value}`;';
    expect(runjsComponentReferences(code)).toEqual(['quarter', 'Quarter filter', 'region', 'segment']);
  });

  it('ignores examples, regex, comments, dynamic names and non-global namespace members', () => {
    expect(runjsComponentReferences('const example = "components.fake"; const re = /components.fake/; /* components.fake */ const text = `components.fake`; return other.components.fake ?? components[key];')).toEqual([]);
  });

  it.each([
    'const components = {}; return components.local;',
    'return ((components) => components.local)({});',
    'const { x: components } = input; return components.local;',
    'const [components] = input; return components.local;',
    'try {} catch (components) { return components.local; }',
    'class components {} return components.local;',
    'function x(...components) { return components.local; }',
    'with (input) { return components.local; }',
    'eval(source); return components.local;',
  ])('does not block shadowed or ambiguous references: %s', code => {
    expect(runjsComponentReferences(code)).toEqual([]);
  });

  it('keeps namespace shadowing independent and leaves dynamic/syntax cases unverified', () => {
    expect(runjsComponentReferences('const queries = {}; return components.real.value;')).toEqual(['real']);
    expect(runjsQueryReferences('const components = {}; return queries.real.data;')).toEqual(['real']);
    expect(runjsComponentReferences('const { components: local } = input; return components.real.value;')).toEqual(['real']);
    expect(runjsComponentReferences('return components.')).toEqual([]);
  });

  const summary: AppSummary = {
    app_id: 'a', name: 'Revenue', version_id: 'v', events: [],
    pages: [{ id: 'home', name: 'Revenue', handle: 'home', components: [
      { id: 'quarter', name: 'Quarter filter', type: 'DropdownV2', properties: { options: { value: [{ label: 'Q3 2026', value: 'Q3 2026', default: true }] } } },
    ] }],
    queries: [{ id: 'summary', name: 'metrics', kind: 'runjs', options: {
      code: 'return (components.quarter_filter && components.quarter_filter.value) || "Q3 2026";',
      runOnDependencyChange: false,
    } }],
  };

  it('catches the persisted Meridian fallback regression once per missing name', () => {
    const result = validateAppStructure(summary);
    expect(result.errors.filter(error => error.includes('quarter_filter'))).toHaveLength(1);
    expect(result.errors.join(' ')).toMatch(/RunJS query "metrics".*no component is named "quarter_filter".*client_ref.*fallback/);
  });

  it('accepts exact persisted component names and valid local objects', () => {
    for (const code of [
      'return components["Quarter filter"].value;',
      'const components = { local: 3 }; return components.local;',
    ]) {
      const fixed = structuredClone(summary);
      fixed.queries[0]!.options = { code };
      expect(validateAppStructure(fixed).errors).toEqual([]);
    }
  });

  it('blocks the mismatch in a plan before writing; accepts the real name', () => {
    const context = { ...summary, queries: [] };
    const bad = lintPlannedApp({ queries: [{ name: 'metrics', kind: 'runjs', options: {
      code: 'return components.quarter_filter?.value || "Q3 2026";',
    } }] }, context);
    expect(bad.errors.join(' ')).toMatch(/no component is named "quarter_filter"/);
    const good = lintPlannedApp({ queries: [{ name: 'metrics', kind: 'runjs', options: {
      code: 'return components["Quarter filter"].value;',
    } }] }, context);
    expect(good.errors).toEqual([]);
  });
});
