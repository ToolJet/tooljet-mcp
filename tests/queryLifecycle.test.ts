import { describe, expect, it, vi } from 'vitest';
import type { AppSummary, ToolJetClient } from '../src/tooljetClient.js';
import { expandQueryLifecycles } from '../src/queryLifecycle.js';
import { addQueryLifecyclesTool } from '../src/tools/addQueryLifecycles.js';
import { appPlanSchema } from '../src/appPlanSchema.js';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';

const summary: AppSummary = {
  app_id: 'app1',
  pages: [{
    id: 'p1',
    name: 'Cases',
    components: [
      { id: 'title', name: 'caseTitle', type: 'TextInput' },
      { id: 'modal', name: 'newCaseModal', type: 'ModalV2' },
    ],
  }],
  queries: [
    { id: 'create', name: 'create_case' },
    { id: 'list', name: 'list_cases' },
  ],
  events: [],
};

function textOf(result: { content: Array<{ text: string }> }): any {
  return JSON.parse(result.content[0]!.text);
}

describe('query lifecycle expansion', () => {
  it('orders opt-in snapshot work before refresh without moving existing success actions', () => {
    const result = expandQueryLifecycles(summary, [{
      queryId: 'create',
      beforeRefreshActions: [{ actionId: 'set-custom-variable', key: 'completedId', value: 'C1' }],
      refreshQueryIds: ['list'],
      successActions: [{ actionId: 'unset-custom-variable', key: 'pendingId' }],
      successAlert: { message: 'Saved' },
    }]);
    expect(result.events.map(event => event.action)).toEqual([
      { actionId: 'set-custom-variable', key: 'completedId', value: 'C1' },
      { actionId: 'run-query', queryId: 'list', queryName: 'list_cases' },
      { actionId: 'unset-custom-variable', key: 'pendingId' },
      { actionId: 'show-alert', message: 'Saved', alertType: 'success' },
    ]);
  });

  it('expands the common mutation flow in deterministic order', () => {
    const result = expandQueryLifecycles(summary, [{
      queryId: 'create',
      refreshQueryIds: ['list'],
      clearComponentIds: ['title'],
      closeModalId: 'modal',
      successAlert: { message: 'Case created' },
      failureAlert: { message: 'Could not create case' },
      successActions: [{ actionId: 'set-custom-variable', key: 'saved', value: true }],
      failureActions: [{ actionId: 'set-custom-variable', key: 'failed', value: true }],
    }]);
    expect(result.events.map((event) => [event.trigger, event.action.actionId])).toEqual([
      ['onDataQuerySuccess', 'run-query'],
      ['onDataQuerySuccess', 'set-custom-variable'],
      ['onDataQuerySuccess', 'close-modal'],
      ['onDataQuerySuccess', 'control-component'],
      ['onDataQuerySuccess', 'show-alert'],
      ['onDataQueryFailure', 'set-custom-variable'],
      ['onDataQueryFailure', 'show-alert'],
    ]);
    expect(result.events[0].action).toMatchObject({ queryId: 'list', queryName: 'list_cases' });
    expect(result.events[3].action).toEqual({
      actionId: 'control-component',
      componentId: 'title',
      componentSpecificActionHandle: 'clear',
      componentSpecificActionParams: [],
    });
  });

  it('rejects a non-modal close target', () => {
    expect(() => expandQueryLifecycles(summary, [{ queryId: 'create', closeModalId: 'title' }])).toThrow(/not a Modal/i);
  });
});

describe('add_query_lifecycles tool', () => {
  it('accepts a before-refresh-only lifecycle and preserves it through schema parsing and write', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue(summary),
      createEvents: vi.fn().mockResolvedValue({ created: 1 }),
    } as unknown as ToolJetClient;
    const tool = addQueryLifecyclesTool(client);
    const lifecycles = tool.inputSchema.lifecycles.parse([{
      query_id: 'create',
      before_refresh_actions: [{ actionId: 'set-custom-variable', key: 'done', value: true }],
    }]);
    const result = await tool.handler({ app_id: 'app1', version_id: 'v1', lifecycles });
    expect(result.isError).not.toBe(true);
    expect(vi.mocked(client.createEvents).mock.calls[0][0].events[0].action).toEqual({
      actionId: 'set-custom-variable', key: 'done', value: true,
    });
  });

  it('validates before-refresh targets before any event write', async () => {
    const client = { getAppSummary: vi.fn().mockResolvedValue(summary), createEvents: vi.fn() } as unknown as ToolJetClient;
    const result = await addQueryLifecyclesTool(client).handler({
      app_id: 'app1', version_id: 'v1', lifecycles: [{
        query_id: 'create', before_refresh_actions: [{ actionId: 'run-query', queryId: 'missing' }],
      }],
    });
    expect(result.isError).toBe(true);
    expect(client.createEvents).not.toHaveBeenCalled();
  });

  it('does not drop a before-refresh logical target during plan preflight', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue(summary),
      listDatasources: vi.fn().mockResolvedValue([]),
    } as unknown as ToolJetClient;
    const args = appPlanSchema.parse({
      app_id: 'app1', version_id: 'v1', lifecycles: [{
        query_ref: 'create', before_refresh_actions: [{ actionId: 'run-query', target_ref: 'missing' }],
      }],
    });
    const body = textOf(await lintAppSpecTool(client).handler(args));
    expect(body.ok).toBe(false);
    expect(body.errors.join(' ')).toMatch(/before refresh.*unknown.*target_ref/i);
  });

  it('validates and writes every expanded event in one bulk call', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue(summary),
      createEvents: vi.fn().mockResolvedValue({ created: 3 }),
    } as unknown as ToolJetClient;
    const result = await addQueryLifecyclesTool(client).handler({
      app_id: 'app1',
      version_id: 'v1',
      lifecycles: [{
        query_id: 'create',
        refresh_query_ids: ['list'],
        success_alert: { message: 'Created' },
        failure_alert: { message: 'Failed' },
      }],
    });
    expect(client.createEvents).toHaveBeenCalledOnce();
    expect(client.createEvents).toHaveBeenCalledWith(expect.objectContaining({
      appId: 'app1',
      versionId: 'v1',
      events: expect.arrayContaining([
        expect.objectContaining({ sourceId: 'create', trigger: 'onDataQuerySuccess' }),
        expect.objectContaining({ sourceId: 'create', trigger: 'onDataQueryFailure' }),
      ]),
    }));
    expect(textOf(result)).toMatchObject({ created: 3, lifecycles: 1, warnings: [] });
  });

  it('blocks dangling targets before the bulk write', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue(summary),
      createEvents: vi.fn(),
    } as unknown as ToolJetClient;
    const result = await addQueryLifecyclesTool(client).handler({
      app_id: 'app1',
      version_id: 'v1',
      lifecycles: [{ query_id: 'create', refresh_query_ids: ['missing'] }],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/refresh target.*does not exist/i);
    expect(client.createEvents).not.toHaveBeenCalled();
  });
});
