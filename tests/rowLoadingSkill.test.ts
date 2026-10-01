import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Evaluate the published, repository-owned examples, not copied test expressions.
for (const host of ['skill', 'skills/tooljet-app-builder']) {
  const tables = readFileSync(new URL(`../${host}/references/tables.md`, import.meta.url), 'utf8');
  const section = tables.split('### Row-specific loading')[1].split('If an action needs a key')[0];
  const bindings = [...section.matchAll(/```json\n([^]*?)\n```/g)].map(match => JSON.parse(match[1]).loadingState);
  const [selected, captured] = bindings;
  const evaluate = (binding: string, state: Record<string, unknown>) =>
    runInNewContext(binding.slice(2, -2), state, { timeout: 100 });
  const state = (loading: boolean, selectedId: unknown, rowId: unknown, pendingId?: unknown) => ({
    queries: { runjs1: { isLoading: loading } },
    components: { table1: { selectedRow: { id: selectedId } } },
    variables: { pendingCloseId: pendingId },
    rowData: { id: rowId },
  });

  describe(`${host}: documented row loading`, () => {
    it('only loads the selected row during a request, including primary key zero', () => {
      expect(bindings).toHaveLength(2);
      for (const key of ['ticket-1', 0]) {
        expect(evaluate(selected, state(true, key, key))).toBe(true);
        expect(evaluate(selected, state(true, key, 'other'))).toBe(false);
        expect(evaluate(selected, state(false, key, key))).toBe(false);
      }
    });

    it('does not load missing keys or throw before the Table mounts', () => {
      expect(evaluate(selected, state(true, undefined, undefined))).toBe(false);
      expect(evaluate(selected, { ...state(true, 1, 1), components: {} })).toBe(false);
      expect(evaluate(selected, { ...state(true, 1, 1), components: { table1: {} } })).toBe(false);
    });

    it('keeps captured loading on the original row after selection changes', () => {
      expect(evaluate(captured, state(true, 'ticket-2', 'ticket-1', 'ticket-1'))).toBe(true);
      expect(evaluate(captured, state(true, 'ticket-2', 'ticket-2', 'ticket-1'))).toBe(false);
      expect(evaluate(captured, state(true, 2, 0, 0))).toBe(true);
    });

    it('stops captured loading when the request settles or the pending key is cleared', () => {
      expect(evaluate(captured, state(false, 2, 1, 1))).toBe(false);
      expect(evaluate(captured, state(true, 2, 1))).toBe(false);
      expect(evaluate(captured, state(true, undefined, undefined))).toBe(false);
    });
  });
}
