import { describe, expect, it } from 'vitest';
import { validateEvents } from '../src/eventValidation.js';
import type { AppSummary, EventSpec } from '../src/tooljetClient.js';

/** An edit on 2026-09-30 added a "Cancel visit" button through a compiled page, then planned the same click by hand
 *  with a slightly different guard (`?.` dropped). The two handlers were not an exact match, so both were kept and
 *  one click ran the cancelling write twice. */
const gate = '{{ variables.visitId && components.reason?.value }}';
const summary: AppSummary = {
  app_id: 'a',
  pages: [{ id: 'today', name: 'Today', handle: 'home', components: [{ id: 'confirm', name: 'confirmCancel', type: 'Button' }, { id: 'other', name: 'otherButton', type: 'Button' }] }],
  queries: [
    { id: 'q_cancel', name: 'cancelVisit', kind: 'tooljetdb', options: { operation: 'update_rows' } },
    { id: 'q_visits', name: 'visits', kind: 'tooljetdb', options: { operation: 'list_rows' } },
  ],
  events: [
    { id: 'e1', sourceId: 'confirm', target: 'component', event: { eventId: 'onClick', actionId: 'run-query', queryId: 'q_cancel', queryName: 'cancelVisit', runOnlyIf: gate } },
  ],
};
const run = (sourceId: string, queryId: string, runOnlyIf?: string): EventSpec => ({
  sourceId, sourceType: 'component', trigger: 'onClick',
  action: { actionId: 'run-query', queryId, queryName: queryId === 'q_cancel' ? 'cancelVisit' : 'visits', ...(runOnlyIf ? { runOnlyIf } : {}) },
});

describe('a click that would run one query twice', () => {
  it('refuses a second run of a query the same click already runs, naming the handler to change', () => {
    const [error] = validateEvents(summary, [run('confirm', 'q_cancel', '{{ variables.visitId && components.reason.value }}')]).errors;
    expect(error).toMatch(/"confirmCancel" onClick already runs query "cancelVisit"/);
    expect(error).toMatch(/event e1/);
    expect(error).toMatch(/update_events/);
  });

  it('accepts the same handler declared again (it is not created a second time)', () => {
    expect(validateEvents(summary, [run('confirm', 'q_cancel', gate)]).errors).toEqual([]);
  });

  it('accepts another query on that click, and that query on another component', () => {
    expect(validateEvents(summary, [run('confirm', 'q_visits'), run('other', 'q_cancel')]).errors).toEqual([]);
  });

  it('refuses two runs of one query on one click within a plan', () => {
    const [error] = validateEvents({ ...summary, events: [] }, [run('other', 'q_cancel'), run('other', 'q_cancel', '{{ true }}')]).errors;
    expect(error).toMatch(/"otherButton" onClick runs query "cancelVisit" twice/);
  });

  it('reports handlers an app already holds twice as a warning, once', () => {
    const held: AppSummary = { ...summary, events: [...summary.events,
      { id: 'e2', sourceId: 'confirm', target: 'component', event: { eventId: 'onClick', actionId: 'run-query', queryId: 'q_cancel', queryName: 'cancelVisit' } }] };
    const persisted: EventSpec[] = held.events.map((e) => {
      const { eventId, ...action } = e.event as Record<string, unknown>;
      return { sourceId: e.sourceId!, sourceType: 'component', trigger: String(eventId), action };
    });
    const result = validateEvents(held, persisted, { includePersistedChains: false });
    expect(result.errors).toEqual([]);
    expect(result.warnings.filter((w) => /runs query "cancelVisit" twice/.test(w))).toHaveLength(1);
  });
});
