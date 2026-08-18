import { describe, expect, it, vi } from 'vitest';
import type { AppSummary, ToolJetClient } from '../src/tooljetClient.js';
import { expandQueryLifecycles } from '../src/queryLifecycle.js';
import { addQueryLifecyclesTool } from '../src/tools/addQueryLifecycles.js';

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
  it('expands the common mutation flow in deterministic order', () => {
    const result = expandQueryLifecycles(summary, [{
      queryId: 'create',
      refreshQueryIds: ['list'],
      clearComponentIds: ['title'],
      closeModalId: 'modal',
      successAlert: { message: 'Case created' },
      failureAlert: { message: 'Could not create case' },
    }]);
    expect(result.events.map((event) => [event.trigger, event.action.actionId])).toEqual([
      ['onDataQuerySuccess', 'run-query'],
      ['onDataQuerySuccess', 'control-component'],
      ['onDataQuerySuccess', 'close-modal'],
      ['onDataQuerySuccess', 'show-alert'],
      ['onDataQueryFailure', 'show-alert'],
    ]);
    expect(result.events[0].action).toMatchObject({ queryId: 'list', queryName: 'list_cases' });
  });

  it('rejects a non-modal close target', () => {
    expect(() => expandQueryLifecycles(summary, [{ queryId: 'create', closeModalId: 'title' }])).toThrow(/not a Modal/i);
  });
});

describe('add_query_lifecycles tool', () => {
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
