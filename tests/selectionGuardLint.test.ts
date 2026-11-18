import { describe, expect, it } from 'vitest';
import { lintTruthySelectionGuards } from '../src/selectionGuardLint.js';

const c = (name: string, type: string, properties: Record<string, unknown>) => ({ name, type, properties });

describe('lintTruthySelectionGuards', () => {
  // Expense build (2026-10-12): a details sheet guarded every value with `components.tableExpenses.selectedRow ? ... : '-'`.
  // A Table's selectedRow is {} when nothing is selected, so the guard always passed and every value drew blank ($0.00).
  it('flags a ternary or && on the selected-row object itself, on any widget', () => {
    const w = lintTruthySelectionGuards([
      c('sheetValueDept', 'ShadText', { text: { value: "{{ components.tableExpenses.selectedRow ? components.tableExpenses.selectedRow.department : '-' }}" } }),
      c('sheetAmount', 'ShadHeading', { text: { value: '{{components.t.selectedRow && components.t.selectedRow.amount}}' } }),
      c('detailTitle', 'ShadHeading', { text: { value: "{{components.grid.selectedItem ? components.grid.selectedItem.name : ''}}" } }),
    ]);
    expect(w).toHaveLength(3);
    expect(w[0]).toContain('sheetValueDept');
    expect(w[0]).toContain('selectedRow?.id');
  });

  it('accepts a guard on a stable key or optional chaining with a fallback', () => {
    expect(
      lintTruthySelectionGuards([
        c('a', 'ShadText', { text: { value: "{{components.t.selectedRow?.id ? components.t.selectedRow.department : '-'}}" } }),
        c('b', 'ShadText', { text: { value: "{{components.t.selectedRow?.department ?? '-'}}" } }),
        c('d', 'ShadText', { text: { value: "{{components.t.selectedRow.id ? 'x' : 'y'}}" } }),
        c('e', 'ShadText', { text: { value: 'plain text' } }),
      ])
    ).toEqual([]);
  });
});
