import { describe, expect, it } from 'vitest';
import { navigationReorders, validateEvents } from '../src/eventValidation.js';

// A site inspection build (2026-10-04) spent four compiles on "Persisted event ... switch-page must be the LAST
// handler": a page patch added a handler to a query whose saved chain already ended in a page switch. apply_app_phase
// now moves the saved switch to the end, so its lint lets that through; add_events, which cannot reorder, still refuses.
const summary = {
  app_id: 'a', version_id: 'v',
  pages: [{ id: 'p1', name: 'Inspections', components: [] }, { id: 'p2', name: 'Inspect', components: [] }],
  queries: [{ id: 'q-sel', name: 'selectedInspection' }, { id: 'q-chk', name: 'checklist' }],
  events: [
    { id: 'e-run', index: 0, sourceId: 'q-sel', target: 'data_query', event: { eventId: 'onDataQuerySuccess', actionId: 'run-query', queryId: 'q-chk' } },
    { id: 'e-nav', index: 1, sourceId: 'q-sel', target: 'data_query', event: { eventId: 'onDataQuerySuccess', actionId: 'switch-page', pageId: 'p2' } },
  ],
};
const added = [{ sourceId: 'q-sel', sourceType: 'data_query', trigger: 'onDataQuerySuccess', action: { actionId: 'show-alert', message: 'Loaded', alertType: 'info' } }];

describe('a new handler on a chain that ends in a saved page switch', () => {
  it('is refused where nothing will reorder it', () => {
    expect(validateEvents(summary as never, added as never).errors.join(' ')).toMatch(/switch-page must be the LAST/);
  });
  it('passes when the apply moves the switch last', () => {
    expect(validateEvents(summary as never, added as never, { navigationMovedLast: true }).errors).toEqual([]);
  });
  it('still fails when a saved handler already follows the switch', () => {
    const broken = { ...summary, events: [...summary.events, { id: 'e-late', index: 2, sourceId: 'q-sel', target: 'data_query', event: { eventId: 'onDataQuerySuccess', actionId: 'run-query', queryId: 'q-chk' } }] };
    expect(validateEvents(broken as never, added as never, { navigationMovedLast: true }).errors.join(' ')).toMatch(/switch-page must be the LAST/);
  });
});

describe('navigationReorders', () => {
  it('moves a page switch that is no longer last to the end of its chain', () => {
    const after = { ...summary, events: [...summary.events, { id: 'e-new', index: 2, sourceId: 'q-sel', target: 'data_query', event: { eventId: 'onDataQuerySuccess', actionId: 'show-alert' } }] };
    expect(navigationReorders(after as never)).toEqual([{ eventId: 'e-nav', index: 3 }]);
  });
  it('leaves chains that already end in their switch, and other triggers, alone', () => {
    const other = { ...summary, events: [...summary.events, { id: 'e-fail', index: 2, sourceId: 'q-sel', target: 'data_query', event: { eventId: 'onDataQueryFailure', actionId: 'show-alert' } }] };
    expect(navigationReorders(other as never)).toEqual([]);
  });
});

// Review of round 3 (2026-10-04): the reorder scanned the whole app, so adding an alert to newButton also reordered
// oldButton's saved chain, which the plan never touched, and could make an unreachable handler (a write) run.
describe('navigationReorders limited to the chains a phase added to', () => {
  const app = {
    app_id: 'a', version_id: 'v', pages: [], queries: [],
    events: [
      { id: 'old-nav', index: 0, sourceId: 'oldButton', target: 'component', event: { eventId: 'onClick', actionId: 'switch-page', pageId: 'p2' } },
      { id: 'old-write', index: 1, sourceId: 'oldButton', target: 'component', event: { eventId: 'onClick', actionId: 'run-query', queryId: 'q-delete' } },
      { id: 'new-nav', index: 0, sourceId: 'newButton', target: 'component', event: { eventId: 'onClick', actionId: 'switch-page', pageId: 'p2' } },
      { id: 'new-alert', index: 1, sourceId: 'newButton', target: 'component', event: { eventId: 'onClick', actionId: 'show-alert' } },
    ],
  };
  const touched = [{ sourceId: 'newButton', sourceType: 'component', trigger: 'onClick', action: { actionId: 'show-alert' } }];

  it('moves the switch only in a chain the phase added a handler to', () => {
    expect(navigationReorders(app as never, touched as never)).toEqual([{ eventId: 'new-nav', index: 2 }]);
  });

  it('reports the untouched chain instead of changing it', () => {
    const diagnostics: string[] = [];
    navigationReorders(app as never, touched as never, diagnostics);
    expect(diagnostics.join(' ')).toMatch(/oldButton/);
  });
});
