import { describe, expect, it } from 'vitest';
import { validateAppStructure } from '../src/lint.js';
import { lintPlannedApp } from '../src/appSpecLint.js';
import type { AppSummary } from '../src/tooljetClient.js';

// Vet clinic build, 2026-09-23: the model created every query up front with add_queries, then
// planned the Today page alone. Queries for the Patients and Billing pages read components those
// pages had not built yet, and the phase lint rejected the Today page for it, so the model had to
// plan all three pages in one phase. A persisted query this plan does not touch cannot be
// fixed by this plan; its forward references are a note for a later page, not an error.
const summary: AppSummary = {
  app_id: 'a', name: 'Clinic', version_id: 'v', events: [],
  pages: [{ id: 'p1', name: 'Today', handle: 'today', components: [] } as never],
  queries: [
    { id: 'q1', name: 'q_add_visit', kind: 'tooljetdb', options: {
      operation: 'create_row', table_id: 't1',
      create_row: { 0: { column: 'note', value: '{{components.visitNote.value}}' }, 1: { column: 'pet_id', value: '{{components.tblPets.selectedRow.id}}' } },
    } },
    { id: 'q2', name: 'q_totals', kind: 'runjs', options: {
      code: 'return components.invoiceFilter.value;', runOnDependencyChange: false,
    } },
  ],
};

describe('persisted queries that read components a later page will build', () => {
  it('does not fail a plan that leaves those queries untouched', () => {
    const result = lintPlannedApp({}, summary);
    expect(result.errors.filter((e) => /visitNote|tblPets|invoiceFilter/.test(e))).toEqual([]);
    const notes = result.warnings.filter((e) => /q_add_visit|q_totals/.test(e));
    expect(notes).toHaveLength(2);
    expect(notes.join(' ')).toMatch(/q_add_visit.*visitNote.*tblPets/);
    expect(notes.join(' ')).toMatch(/exact name/);
  });

  it('still fails a planned query with the same missing reference', () => {
    const result = lintPlannedApp({ queries: [{ name: 'q_new', kind: 'runjs', options: {
      code: 'return components.visitNote.value;', runOnDependencyChange: false,
    } }] }, { ...summary, queries: [] });
    expect(result.errors.join(' ')).toMatch(/q_new.*visitNote/);
  });

  it('still fails the finished app in validate_app', () => {
    expect(validateAppStructure(summary).errors.join(' ')).toMatch(/q_add_visit.*visitNote/);
  });
});
