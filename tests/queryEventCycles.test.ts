import { describe, expect, it, vi } from 'vitest';
import { validateEvents } from '../src/eventValidation.js';
import { expandQueryLifecycles } from '../src/queryLifecycle.js';
import { addQueryLifecyclesTool } from '../src/tools/addQueryLifecycles.js';
import type { AppSummary, EventSpec, ToolJetClient } from '../src/tooljetClient.js';

const fixture = (): AppSummary => ({app_id:'app',pages:[],events:[],queries:[
  {id:'write',name:'Record task status change'}, {id:'read',name:'Get tasks'}, {id:'third',name:'Workload'},
]});
const event = (source: string, target: string, guard?: unknown, trigger='onDataQuerySuccess'): EventSpec => ({
  sourceId:source,sourceType:'data_query',trigger,action:{actionId:'run-query',queryId:target,...(guard === undefined ? {} : {runOnlyIf:guard})},
});
const cycles = (summary: AppSummary, events: EventSpec[], includePersistedChains=true) =>
  validateEvents(summary, events, {includePersistedChains}).errors.filter(e => /unconditional query/.test(e));

describe('query lifecycle loop prevention', () => {
  it('rejects the observed mutation refreshing itself and permits normal reads', () => {
    expect(() => expandQueryLifecycles(fixture(), [{queryId:'write',refreshQueryIds:['read','write','third']}])).toThrow(/cannot refresh itself/);
    expect(expandQueryLifecycles(fixture(), [{queryId:'write',refreshQueryIds:['read','third']}]).events).toHaveLength(2);
  });
  it.each(['refresh', 'custom success', 'custom failure'])('rejects %s self loops before any event write', async mode => {
    const client = {getAppSummary:vi.fn().mockResolvedValue(fixture()),createEvents:vi.fn()} as unknown as ToolJetClient;
    const lifecycle = mode === 'refresh' ? {query_id:'write',refresh_query_ids:['write']} : {
      query_id:'write', [mode === 'custom success' ? 'success_actions' : 'failure_actions']:[{actionId:'run-query',queryId:'write'}],
    };
    const result = await addQueryLifecyclesTool(client).handler({app_id:'app',version_id:'v',lifecycles:[lifecycle]});
    expect(result.isError).toBe(true); expect(client.createEvents).not.toHaveBeenCalled();
  });
  it('rejects direct self calls including uniquely resolved names and static true guards', () => {
    expect(cycles(fixture(),[event('write','Record task status change','{{ true }}')])).toHaveLength(1);
  });
  it('rejects two- and three-query unconditional success cycles', () => {
    expect(cycles(fixture(),[event('write','read'),event('read','write')])).toHaveLength(2);
    expect(cycles(fixture(),[event('write','read'),event('read','third'),event('third','write')])).toHaveLength(3);
  });
  it('detects an added edge closing a persisted chain, but respects replacement mode', () => {
    const s = fixture();s.events=[{id:'existing',sourceId:'write',target:'data_query',event:{eventId:'onDataQuerySuccess',actionId:'run-query',queryId:'read'}}];
    expect(cycles(s,[event('read','write')])).toHaveLength(1);
    expect(cycles(s,[event('read','write')],false)).toEqual([]);
  });
  it.each(['{{variables.retryCount < 3}}','{{ false }}','false'])('leaves guarded retries/cycles unverified: %s', guard => {
    expect(cycles(fixture(),[event('write','write',guard,'onDataQueryFailure')])).toEqual([]);
    expect(cycles(fixture(),[event('write','read'),event('read','write',guard)])).toEqual([]);
  });
  it('ignores disabled handlers, unrelated existing cycles and acyclic refresh', () => {
    const s=fixture();s.events=[{id:'existing',sourceId:'write',target:'data_query',event:{eventId:'onDataQuerySuccess',actionId:'run-query',queryId:'write'}}];
    expect(cycles(s,[event('third','read')])).toEqual([]);
    const disabled=event('write','write');disabled.action.disabled=true;
    expect(cycles(fixture(),[disabled])).toEqual([]);
    expect(cycles(fixture(),[event('write','read'),event('write','third')])).toEqual([]);
  });
  it('matches the runtime: a boolean false guard is absent, unlike the string binding', () => {
    expect(cycles(fixture(),[event('write','write',false)])).toHaveLength(1);
  });
});
