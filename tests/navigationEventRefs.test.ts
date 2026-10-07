import { describe, expect, it, vi } from 'vitest';
import type { AppSummary, EventSpec, ToolJetClient } from '../src/tooljetClient.js';
import { persistedEventSpecs, validateEvents } from '../src/eventValidation.js';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';
import { addEventsTool } from '../src/tools/addEvents.js';
import { updateEventsTool } from '../src/tools/updateEvents.js';

const menu = [
  { id: 'home', isGroup: false },
  { id: 'group', isGroup: true, children: [{ id: 'reports', isGroup: false }] },
];
const app = (items: unknown = menu): AppSummary => ({
  app_id: 'app', version_id: 'v1',
  pages: [{ id: 'page', name: 'Home', components: [{ id: 'nav', name: 'navigation', type: 'Navigation',
    properties: { menuItems: { value: items } } }] }],
  queries: [{ id: 'query', name: 'refresh', kind: 'runjs', options: { code: 'return 1;' } }],
  events: [],
});
const run = (ref?: string): EventSpec => ({
  sourceId: 'nav', sourceType: 'component', trigger: 'onClick', ...(ref === undefined ? {} : { ref }),
  action: { actionId: 'run-query', queryId: 'query', queryName: 'refresh' },
});
const saved = (event: EventSpec, id: string): AppSummary['events'][number] => ({
  id, sourceId: event.sourceId, target: event.sourceType,
  event: { eventId: event.trigger, ...(event.ref === undefined ? {} : { ref: event.ref }), ...event.action },
});

describe('Navigation item refs match the renderer and dispatcher', () => {
  it('accepts root and grouped leaf items running the same query in separate scopes', () => {
    const summary = app();
    expect(validateEvents(summary, [run('home'), run('reports')]).errors).toEqual([]);
    summary.events = [saved(run('home'), 'home')];
    expect(validateEvents(summary, [run('reports')]).errors).toEqual([]);
    summary.events.push(saved(run('reports'), 'reports'));
    const result = validateEvents(summary, persistedEventSpecs(summary), { includePersistedChains: false });
    expect(result.errors).toEqual([]);
    expect(result.warnings.join(' ')).not.toMatch(/twice/);
  });

  it.each(['group', 'missing'])('rejects static non-item ref %s', (ref) => {
    expect(validateEvents(app(), [run(ref)]).errors.join(' ')).toMatch(/does not identify a non-group menu item/);
  });

  it('does not accept the internal dispatch signal as an authored item trigger', () => {
    expect(validateEvents(app(), [{ ...run('home'), trigger: 'onNavigationItemClicked' }]).errors.join(' '))
      .toMatch(/ordinary component events cannot use ref/);
  });

  it.each([null, '{{ queries.menu.data }}'])('reports unresolved membership for menu %j without merging distinct scopes', (items) => {
    const result = validateEvents(app(items), [run('home'), run('reports')]);
    expect(result.errors).toEqual([]);
    expect(result.warnings.filter((w) => /membership cannot be verified/.test(w))).toHaveLength(2);
    expect(result.warnings.join(' ')).not.toMatch(/twice/);
  });

  it('does not treat an explicitly empty static menu as dynamic', () => {
    expect(validateEvents(app([]), [run('home')]).errors.join(' ')).toMatch(/does not identify a non-group menu item/);
    expect(validateEvents(app([{ id: 'group', isGroup: true }]), [run('home')]).errors.join(' '))
      .toMatch(/does not identify a non-group menu item/);
  });

  it('handles raw menu arrays and unresolved group children without accepting group refs', () => {
    const summary = app();
    summary.pages[0]!.components[0]!.properties = { menuItems: menu };
    expect(validateEvents(summary, [run('reports')]).errors).toEqual([]);
    const dynamic = app([{ id: 'group', isGroup: true, children: '{{ queries.menu.data }}' }]);
    expect(validateEvents(dynamic, [run('reports')]).warnings.join(' ')).toMatch(/membership cannot be verified/);
    expect(validateEvents(dynamic, [run('group')]).errors.join(' ')).toMatch(/does not identify a non-group menu item/);
  });

  it.each([42, false, {}, ' ', '{{ variables.itemId }}'])('rejects malformed or nonliteral persisted ref %j', (ref) => {
    const summary = app();
    summary.events = [{ ...saved(run(), 'bad'), event: { eventId: 'onClick', ...run().action, ref } }];
    expect(validateEvents(summary, persistedEventSpecs(summary), { includePersistedChains: false }).errors.join(' '))
      .toMatch(/literal non-empty item id/);
  });

  it('rejects repeated runs within the same item, but accepts an exact held restatement', () => {
    const summary = app();
    summary.events = [saved(run('home'), 'existing')];
    expect(validateEvents(summary, [run('home')]).errors).toEqual([]);
    expect(validateEvents(summary, [{ ...run('home'), action: { ...run().action, runOnlyIf: '{{ true }}' } }]).errors.join(' '))
      .toMatch(/already runs query/);
    expect(validateEvents(app(), [run('home'), run('home')]).errors.join(' ')).toMatch(/twice/);
    summary.events.push(saved(run('home'), 'duplicate'));
    expect(validateEvents(summary, persistedEventSpecs(summary), { includePersistedChains: false }).warnings.join(' ')).toMatch(/twice/);
  });

  it.each([true, false])('detects item/component-wide overlap in both orders (item first: %s)', (itemFirst) => {
    const events = itemFirst ? [run('home'), run()] : [run(), run('home')];
    expect(validateEvents(app(), events).errors.join(' ')).toMatch(/twice/);
    const summary = app();
    summary.events = [saved(events[0]!, 'existing')];
    expect(validateEvents(summary, [events[1]!]).errors.join(' ')).toMatch(/already runs query/);
    summary.events.push(saved(events[1]!, 'second'));
    expect(validateEvents(summary, persistedEventSpecs(summary), { includePersistedChains: false }).warnings.join(' ')).toMatch(/twice/);
  });

  it('uses the actual payload ref when action.ref overrides event.ref', () => {
    const event = { ...run('reports'), action: { ...run().action, ref: 'home' } };
    expect(validateEvents(app(), [run('home'), event]).errors.join(' ')).toMatch(/twice/);
    expect(validateEvents(app(), [run('reports'), event]).errors).toEqual([]);
    expect(validateEvents(app(), [run('home'), { ...event, action: { ...run().action, ref: null } }]).errors.join(' ')).toMatch(/twice/);
  });

  it('allows item refs through the direct schema, validates membership, and preserves the write payload', async () => {
    const client = { getAppSummary: vi.fn().mockResolvedValue(app()), createEvents: vi.fn().mockResolvedValue({ created: 1 }) };
    const tool = addEventsTool(client as unknown as ToolJetClient);
    const events = tool.inputSchema.events.parse([{ component_id: 'nav', ref: 'reports', trigger: 'onClick', action: run().action }]);
    const result = await tool.handler({ app_id: 'app', version_id: 'v1', events });
    expect(result.isError).not.toBe(true);
    expect(client.createEvents.mock.calls[0]![0].events[0]).toMatchObject(run('reports'));
    client.createEvents.mockClear();
    expect((await tool.handler({ app_id: 'app', version_id: 'v1', events: [{ ...events[0], ref: 'missing' }] })).isError).toBe(true);
    expect(client.createEvents).not.toHaveBeenCalled();
  });

  it('still rejects a fake Button ref after direct schema parsing', async () => {
    const summary = app();
    summary.pages[0]!.components[0]!.type = 'Button';
    const client = { getAppSummary: vi.fn().mockResolvedValue(summary), createEvents: vi.fn() };
    const tool = addEventsTool(client as unknown as ToolJetClient);
    const events = tool.inputSchema.events.parse([{ component_id: 'nav', ref: 'home', trigger: 'onClick', action: run().action }]);
    const result = await tool.handler({ app_id: 'app', version_id: 'v1', events });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/ordinary component events cannot use ref/);
    expect(client.createEvents).not.toHaveBeenCalled();
  });

  it('accepts Navigation refs through lint_app_spec and update_events', async () => {
    const summary = app();
    const client = { getAppSummary: vi.fn().mockResolvedValue(summary), updateEvents: vi.fn().mockResolvedValue({ updated: 1 }) };
    const result = await lintAppSpecTool(client as unknown as ToolJetClient).handler({ app_id: 'app', version_id: 'v1',
      events: ['home', 'reports'].map((ref) => ({ source_ref: 'navigation', source_type: 'component', trigger: 'onClick', ref,
        action: { actionId: 'run-query', queryName: 'refresh' } })) });
    const body = JSON.parse(result.content[0]!.text);
    expect(body.ok, JSON.stringify(body.errors)).toBe(true);
    expect(body.plan_token).toBeTruthy();
    summary.events = [saved(run('home'), 'existing')];
    const updated = await updateEventsTool(client as unknown as ToolJetClient).handler({ app_id: 'app', version_id: 'v1',
      events: [{ event_id: 'existing', name: 'Reports', event: { eventId: 'onClick', ...run().action, ref: 'reports' } }] });
    expect(updated.isError).not.toBe(true);
    expect(client.updateEvents.mock.calls[0]![0].events[0].event.ref).toBe('reports');
  });
});
