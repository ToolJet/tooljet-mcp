import { describe, expect, it } from 'vitest';
import { selectAppSummary } from '../src/appSummarySelection.js';

// Agent builds (2026-10-05) asked get_app_summary for event_fields "source_type", "trigger" and "sourceType" and each
// lost a call to "must start with one of: id, name, sourceId, target, event". The names a model reaches for are read as
// the field they mean: the trigger is the event's name, the source type is its target, the action is its event.
describe('event_fields under the names a model writes', () => {
  const summary = { app_id: 'a', name: 'A', version_id: 'v', pages: [], queries: [],
    events: [{ id: 'e1', name: 'onClick', sourceId: 'c1', target: 'component', event: { actionId: 'run-query' } }] };
  it('are read as the fields they mean', () => {
    const out = selectAppSummary(summary as never, { detail: 'full', eventFields: ['id', 'trigger', 'sourceType', 'source_type', 'source_id', 'action', 'actionId'] }) as { events: Array<Record<string, unknown>> };
    expect(out.events[0]).toMatchObject({ id: 'e1', name: 'onClick', target: 'component', sourceId: 'c1' });
    expect(JSON.stringify(out.events[0])).toContain('run-query');
  });
});
