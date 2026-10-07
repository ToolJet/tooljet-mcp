import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSummary, EventSpec, ToolJetClient } from '../src/tooljetClient.js';
import { persistedEventSpecs, validateEvents } from '../src/eventValidation.js';
import { validatePersistedAppSummary } from '../src/appValidation.js';
import { clearAppPlansForTests } from '../src/appPlanStore.js';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';
import { addEventsTool } from '../src/tools/addEvents.js';
import { updateEventsTool } from '../src/tools/updateEvents.js';
import { withoutExistingEvents } from '../src/tools/applyAppPhase.js';

const gate = '{{ components.merchant.value }}';
const run = (over: Partial<EventSpec> = {}): EventSpec => ({
  sourceId: 'save', sourceType: 'component', trigger: 'onClick',
  action: { actionId: 'run-query', queryId: 'q_save', queryName: 'addExpenseQuery' },
  ...over,
});
const saved = (event: EventSpec, id: string): AppSummary['events'][number] => ({
  id, sourceId: event.sourceId, target: event.sourceType,
  event: { eventId: event.trigger, ...(event.ref !== undefined ? { ref: event.ref } : {}), ...event.action },
});
const summary = (): AppSummary => ({
  app_id: 'app', version_id: 'v1',
  pages: [{ id: 'page', name: 'Expenses', handle: 'expenses', components: [
    { id: 'save', name: 'button4', type: 'Button' },
    { id: 'merchant', name: 'merchant', type: 'TextInput' },
    { id: 'table', name: 'expensesTable', type: 'Table', properties: {
      columns: { value: [{ key: 'actions', name: 'Actions', columnType: 'button',
        buttons: [{ id: 'edit', buttonLabel: 'Edit' }, { id: 'delete', buttonLabel: 'Delete' }] }] },
    } },
  ] }],
  queries: [{ id: 'q_save', name: 'addExpenseQuery', kind: 'runjs', options: { code: 'return 1;' } }],
  events: [saved(run({ action: { ...run().action, runOnlyIf: gate } }), 'guarded')],
});
const refError = /ordinary component events cannot use ref/;
const clientFor = (app: AppSummary) => ({
  getAppSummary: vi.fn().mockResolvedValue(app), createEvents: vi.fn(), updateEvents: vi.fn(),
});

describe('ordinary component refs cannot disguise duplicate submissions', () => {
  beforeEach(() => clearAppPlansForTests());

  it.each(['event', 'action'] as const)('rejects a %s ref through lint_app_spec without a plan token', async (location) => {
    const app = summary();
    const before = structuredClone(app);
    const client = clientFor(app);
    const result = await lintAppSpecTool(client as unknown as ToolJetClient).handler({
      app_id: 'app', version_id: 'v1', events: [{
        source_ref: 'button4', source_type: 'component', trigger: 'onClick',
        ...(location === 'event' ? { ref: 'submit_addExpense' } : {}),
        action: { actionId: 'run-query', queryName: 'addExpenseQuery',
          ...(location === 'action' ? { ref: 'submit_addExpense' } : {}) },
      }],
    });
    const body = JSON.parse(result.content[0]!.text);
    expect(body.ok).toBe(false);
    expect(body.plan_token).toBeUndefined();
    expect(body.errors.join(' ')).toMatch(refError);
    expect(body.errors.join(' ')).toMatch(/already runs query "addExpenseQuery"/);
    expect(client.createEvents).not.toHaveBeenCalled();
    expect(app).toEqual(before);
  });

  it.each(['event', 'action'] as const)('blocks a %s ref in direct add_events before writing', async (location) => {
    const client = clientFor(summary());
    const result = await addEventsTool(client as unknown as ToolJetClient).handler({
      app_id: 'app', version_id: 'v1', events: [{
        source_id: 'save', source_type: 'component', trigger: 'onClick',
        ...(location === 'event' ? { ref: 'submit_addExpense' } : {}),
        action: { ...run().action, ...(location === 'action' ? { ref: 'submit_addExpense' } : {}) },
      }],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(refError);
    expect(client.createEvents).not.toHaveBeenCalled();
  });

  it('blocks update_events from inserting an ordinary ref before writing', async () => {
    const client = clientFor(summary());
    const result = await updateEventsTool(client as unknown as ToolJetClient).handler({
      app_id: 'app', version_id: 'v1', events: [{ event_id: 'guarded', name: 'Save expense',
        event: { eventId: 'onClick', ...run().action, ref: 'submit_addExpense', runOnlyIf: gate } }],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(refError);
    expect(client.updateEvents).not.toHaveBeenCalled();
  });

  // Self-review (2026-10-06): a ref saved before the check existed failed every later update_events in the app.
  it('lets update_events edit another handler when an older handler kept a saved ref', async () => {
    const app = summary();
    app.pages[0]!.components.push({ id: 'cancel', name: 'button5', type: 'Button' });
    app.events.push({ id: 'legacy', sourceId: 'merchant', target: 'component',
      event: { eventId: 'onChange', ref: 'old_ref', actionId: 'show-alert', message: 'changed', alertType: 'info' } });
    app.events.push({ id: 'other', sourceId: 'cancel', target: 'component',
      event: { eventId: 'onClick', actionId: 'show-alert', message: 'Cancelled', alertType: 'info' } });
    const client = clientFor(app);
    client.updateEvents.mockResolvedValue({});
    const result = await updateEventsTool(client as unknown as ToolJetClient).handler({
      app_id: 'app', version_id: 'v1', events: [{ event_id: 'other', name: 'Cancel',
        event: { eventId: 'onClick', actionId: 'show-alert', message: 'Cancelled.', alertType: 'info' } }],
    });
    expect(result.isError).toBeFalsy();
    expect(client.updateEvents).toHaveBeenCalled();
  });

  it.each([
    [undefined, 'submit_addExpense'], ['first', 'second'], ['same', 'same'],
  ])('finds persisted duplicate runs despite refs %j / %j', (left, right) => {
    const app = summary();
    app.events = [saved(run({ ref: left }), 'e1'), saved(run({ ref: right }), 'e2')];
    const before = structuredClone(app);
    const result = validatePersistedAppSummary(app);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(refError);
    expect(result.warnings.filter((w) => /runs query "addExpenseQuery" twice/.test(w))).toHaveLength(1);
    expect(app).toEqual(before);
  });

  it.each([42, false, {}, [], ' '])('reports malformed persisted ordinary ref %j instead of dropping it', (ref) => {
    const app = summary();
    app.events.push({ id: 'bad', sourceId: 'save', target: 'component',
      event: { eventId: 'onClick', ...run().action, ref } });
    const result = validatePersistedAppSummary(app);
    expect(result.errors.join(' ')).toMatch(refError);
    expect(result.warnings.filter((w) => /runs query "addExpenseQuery" twice/.test(w))).toHaveLength(1);
  });

  it.each([undefined, null, ''])('treats persisted ref placeholder %j as absent', (ref) => {
    const app = summary();
    app.events = [{ id: 'e1', sourceId: 'save', target: 'component',
      event: { eventId: 'onClick', ...run().action, ref } }];
    expect(validateEvents(app, persistedEventSpecs(app), { includePersistedChains: false }).errors).toEqual([]);
  });

  it('rejects an unreferenced addition against a malformed referenced held run', () => {
    const app = summary();
    app.events = [saved(run({ ref: 'old-invalid-ref' }), 'e1')];
    expect(validateEvents(app, [run()]).errors.join(' ')).toMatch(/already runs query "addExpenseQuery"/);
  });

  it('finds duplicate runs with different ordinary refs within one proposed batch', () => {
    const app = { ...summary(), events: [] };
    const result = validateEvents(app, [run({ ref: 'first' }), run({ ref: 'second' })]);
    expect(result.errors.join(' ')).toMatch(/runs query "addExpenseQuery" twice/);
  });

  it('still accepts and deduplicates an exact valid guarded restatement', () => {
    const app = summary();
    const event = run({ action: { ...run().action, runOnlyIf: gate } });
    expect(validateEvents(app, [event]).errors).toEqual([]);
    expect(withoutExistingEvents([event], app.events)).toEqual([]);
  });
});

describe('table and runtime query ref compatibility', () => {
  const columnRun = (ref: string): EventSpec => run({ sourceId: 'table', sourceType: 'table_column', ref });

  it('keeps different column buttons independent, including persisted events', () => {
    const app = summary();
    app.events = [saved(columnRun('actions::edit'), 'edit')];
    const event = columnRun('actions::delete');
    expect(validateEvents(app, [event]).errors).toEqual([]);
    expect(withoutExistingEvents([event], app.events)).toEqual([event]);
    app.events.push(saved(event, 'delete'));
    expect(validateEvents(app, persistedEventSpecs(app), { includePersistedChains: false }).errors).toEqual([]);
  });

  it('rejects a nonidentical second run for the same column button', () => {
    const app = summary();
    app.events = [saved(columnRun('actions::edit'), 'edit')];
    const event = columnRun('actions::edit');
    event.action = { ...event.action, runOnlyIf: '{{ true }}' };
    expect(validateEvents(app, [event]).errors.join(' ')).toMatch(/already runs query "addExpenseQuery"/);
  });

  it('preserves malformed-column diagnostics and legacy table_action deprecation', () => {
    const app = summary();
    expect(validateEvents(app, [columnRun('missing::edit')]).errors.join(' ')).toMatch(/no Button column/);
    const legacy = run({ sourceId: 'table', sourceType: 'table_action', ref: 'edit' });
    app.events = [saved(legacy, 'legacy')];
    expect(persistedEventSpecs(app)[0]!.ref).toBe('edit');
    const result = validateEvents(app, [legacy]);
    expect(result.errors.join(' ')).toMatch(/deprecated table_action/);
    expect(result.errors.join(' ')).not.toMatch(refError);
  });

  it.each(['onDataQuerySuccess', 'onDataQueryFailure'])('preserves runtime query refs for %s', (trigger) => {
    const app = summary();
    const event: EventSpec = { sourceId: 'q_save', sourceType: 'data_query', ref: 'q_save', trigger,
      action: { actionId: 'show-alert', message: 'Result', alertType: 'info' } };
    app.events = [saved(event, 'query-event')];
    const before = structuredClone(app);
    const converted = persistedEventSpecs(app);
    expect(converted[0]).toMatchObject(event);
    expect(validateEvents(app, converted, { includePersistedChains: false }).errors).toEqual([]);
    expect(validatePersistedAppSummary(app).errors.join(' ')).not.toMatch(refError);
    expect(withoutExistingEvents([event], app.events)).toEqual([]);
    expect(app).toEqual(before);
  });
});
