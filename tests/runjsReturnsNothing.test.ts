import { describe, expect, it } from 'vitest';
import { validateAppStructure } from '../src/lint.js';
import { runjsReturnsNothing } from '../src/runjsReferences.js';
import type { AppSummary } from '../src/tooljetClient.js';

// An IT asset overview read every count from a RunJS query written as `(() => { ...; return totals; })()`. The body
// never returned at the top level, so the query's data was undefined and the overview showed dashes (staging, 2026-10-29).
const iife = '(() => { const rows = queries.qAssets.data || []; return { assigned: rows.length }; })()';

const app = (code: string, binding = '{{ (queries.metrics.data || {}).assigned }}'): AppSummary => ({
  app_id: 'a',
  pages: [{ id: 'p', name: 'Home', components: [{ id: 'c', name: 'stat1', type: 'Text', properties: { text: { value: binding } } }] }],
  queries: [
    { id: 'q1', name: 'qAssets', kind: 'tooljetdb', options: {} },
    { id: 'q2', name: 'metrics', kind: 'runjs', options: { code } },
  ],
  events: [],
});
const missingReturn = (summary: AppSummary) =>
  validateAppStructure(summary).errors.filter((e) => e.includes('never returns a value at the top level'));

describe('a RunJS query whose data is read but whose body never returns', () => {
  it('flags an expression body such as an IIFE', () => {
    expect(runjsReturnsNothing(iife)).toBe(true);
    const errors = missingReturn(app(iife));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('RunJS query "metrics"');
  });

  it('accepts a top-level return, also inside if, try and loops, and a returned IIFE', () => {
    for (const code of [
      'const rows = queries.qAssets.data || [];\nreturn { assigned: rows.length };',
      'if (!queries.qAssets.data) return {};\nreturn { assigned: 1 };',
      'try { return { assigned: 1 }; } catch (e) { return {}; }',
      `return ${iife};`,
    ]) {
      expect(runjsReturnsNothing(code)).toBe(false);
      expect(missingReturn(app(code))).toEqual([]);
    }
  });

  it('leaves a side-effect body alone when nothing reads its data', () => {
    expect(missingReturn(app('actions.showAlert("success", "Saved"); queries.qAssets.run();', '{{ 1 }}'))).toEqual([]);
  });

  it('finds bracket reads and leaves bodies that do not parse to the syntax check', () => {
    expect(missingReturn(app(iife, '{{ queries["metrics"].data.assigned }}'))).toHaveLength(1);
    expect(runjsReturnsNothing('const x = ;')).toBe(false);
  });
});
