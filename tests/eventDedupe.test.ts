import { describe, expect, it } from 'vitest';
import { withoutExistingEvents } from '../src/tools/applyAppPhase.js';

// ds-tower d1 (2026-09-26): a phase re-planned a page whose queries the app kept, and re-created every query-sourced
// event (success flags and gated runs), so each fired twice.
describe('events the app already has', () => {
  const existing = [
    { id: 'e1', sourceId: 'q1', target: 'data_query', index: 0, event: { eventId: 'onDataQuerySuccess', actionId: 'set-custom-variable', key: '__ok_q1', value: '{{true}}' } },
    { id: 'e2', sourceId: 'q1', target: 'data_query', index: 1, event: { eventId: 'onDataQuerySuccess', actionId: 'run-query', queryId: 'q3', runOnlyIf: '{{ a }}' } },
  ];
  it('are not created again', () => {
    const planned = [
      { sourceId: 'q1', sourceType: 'data_query', trigger: 'onDataQuerySuccess', action: { actionId: 'set-custom-variable', key: '__ok_q1', value: '{{true}}' } },
      { sourceId: 'q1', sourceType: 'data_query', trigger: 'onDataQuerySuccess', action: { actionId: 'run-query', queryId: 'q3', runOnlyIf: '{{ b }}' } },
      { sourceId: 'q2', sourceType: 'data_query', trigger: 'onDataQuerySuccess', action: { actionId: 'set-custom-variable', key: '__ok_q1', value: '{{true}}' } },
    ];
    expect(withoutExistingEvents(planned as never, existing as never)).toEqual([planned[1], planned[2]]);
  });
});
