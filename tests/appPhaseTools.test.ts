import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PartialWriteError } from '../src/tooljetClient.js';
import type { AppSummary, EventSpec, ToolJetClient } from '../src/tooljetClient.js';
import { clearAppPlansForTests } from '../src/appPlanStore.js';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';
import { applyAppPhaseTool } from '../src/tools/applyAppPhase.js';

function textOf(result: { content: Array<{ text: string }> }): any {
  return JSON.parse(result.content[0]!.text);
}

describe('plan token + apply_app_phase', () => {
  beforeEach(() => clearAppPlansForTests());

  it('applies the exact validated phase, resolves refs, combines events, and consumes the token', async () => {
    let persistedEvents: EventSpec[] = [];
    let summaryReads = 0;
    let tableCreated = false;
    let appName = 'Cases';
    let pageName = 'Home';
    let pageIcon = 'IconHome2';
    const componentSummaries = [
      {
        id: 'title-id', name: 'caseTitle', type: 'TextInput',
        properties: { label: { value: 'Title' } }, styles: { alignment: { value: 'top' } },
        layouts: { desktop: { top: 20, left: 2, width: 20, height: 60 } },
      },
      {
        id: 'save-id', name: 'saveCase', type: 'Button',
        properties: { text: { value: 'Save' } },
        layouts: { desktop: { top: 120, left: 2, width: 6, height: 40 } },
      },
    ];
    const currentSummary = (): AppSummary => ({
      app_id: 'app1',
      name: appName,
      version_id: 'v1',
      pages: [{
        id: 'home-id', name: pageName, handle: 'home', icon: pageIcon, components: summaryReads === 1 ? [] : componentSummaries,
      }],
      queries: summaryReads === 1 ? [] : [
        { id: 'list-id', name: 'list_cases', kind: 'tooljetdb', data_source_id: 'tjdb', options: { operation: 'list_rows', table_id: 'table-id', list_rows: {} } },
        { id: 'create-id', name: 'create_case', kind: 'tooljetdb', data_source_id: 'tjdb', options: { operation: 'create_row', table_id: 'table-id', create_row: { 0: { column: 'title', value: '{{components.caseTitle.value}}' } } } },
      ],
      events: persistedEvents.map((event, index) => ({
        id: `event-${index}`,
        name: event.name,
        sourceId: event.sourceId,
        target: event.sourceType,
        event: { eventId: event.trigger, ...(event.ref ? { ref: event.ref } : {}), ...event.action },
        index,
      })),
    });
    const client = {
      listTables: vi.fn().mockImplementation(async () => tableCreated
        ? [{ id: 'table-id', table_name: 'cases' }]
        : []),
      listDatasources: vi.fn().mockResolvedValue([{ id: 'tjdb', name: 'ToolJet DB', kind: 'tooljetdb' }]),
      getAppSummary: vi.fn().mockImplementation(async () => {
        summaryReads += 1;
        return currentSummary();
      }),
      renameApp: vi.fn().mockImplementation(async (_appId: string, _versionId: string, name: string) => {
        appName = name;
      }),
      createTables: vi.fn().mockImplementation(async () => {
        tableCreated = true;
        return [{ table_id: 'table-id', table_name: 'cases' }];
      }),
      getTableSchema: vi
        .fn()
        .mockRejectedValueOnce(new Error('schema cache stale'))
        .mockResolvedValue([{ name: 'id', type: 'serial', isPrimaryKey: true }]),
      createPages: vi.fn(),
      updatePages: vi.fn().mockImplementation(async ({ updates }) => {
        pageName = updates?.[0]?.name ?? pageName;
        pageIcon = updates?.[0]?.icon ?? pageIcon;
      }),
      insertRowsBatch: vi.fn().mockResolvedValue([{ table_name: 'cases', processed_rows: 1 }]),
      createQueries: vi.fn().mockResolvedValue([
        { query_id: 'list-id', name: 'list_cases' },
        { query_id: 'create-id', name: 'create_case' },
      ]),
      createComponents: vi.fn().mockResolvedValue([
        { component_id: 'title-id', name: 'caseTitle' },
        { component_id: 'save-id', name: 'saveCase' },
      ]),
      createEvents: vi.fn().mockImplementation(async ({ events }: { events: EventSpec[] }) => {
        persistedEvents = events;
        return { created: events.length };
      }),
    } as unknown as ToolJetClient;

    const lintResult = await lintAppSpecTool(client).handler({
      version_id: 'v1', app_name: 'Support Cases',
      tables: [{ table_name: 'cases', columns: [{ name: 'title', type: 'string' }] }],
      seed_data: [{ table_name: 'cases', rows: [{ title: 'Broken login' }] }],
      queries: [
        { client_ref: 'list', datasource_id: 'tjdb', table_ref: 'cases', name: 'list_cases', options: { operation: 'list_rows', list_rows: {} } },
        { client_ref: 'create', datasource_id: 'tjdb', table_ref: 'cases', name: 'create_case', options: { operation: 'create_row', create_row: { 0: { column: 'title', value: '{{components.caseTitle.value}}' } } } },
      ],
      pages: [{
        client_ref: 'home', name: 'Overview', icon: 'IconLayoutDashboard',
        components: [
          { client_ref: 'title', name: 'caseTitle', type: 'TextInput', properties: { label: 'Title' }, styles: { alignment: 'top' }, layout: { top: 20, left: 2, width: 20, height: 60 } },
          { client_ref: 'save', name: 'saveCase', type: 'Button', properties: { text: 'Save' }, layout: { top: 120, left: 2, width: 6, height: 40 } },
        ],
      }],
      events: [{ source_ref: 'save', source_type: 'component', trigger: 'onClick', action: { actionId: 'run-query', target_ref: 'create' } }],
      lifecycles: [{ query_ref: 'create', refresh_query_refs: ['list'], clear_component_refs: ['title'], success_alert: { message: 'Created' }, failure_alert: { message: 'Failed' } }],
    });
    const planToken = textOf(lintResult).plan_token;
    expect(planToken).toEqual(expect.any(String));

    const applyResult = await applyAppPhaseTool(client).handler({ app_id: 'app1', version_id: 'v1', plan_token: planToken });
    const body = textOf(applyResult);
    expect(body.applied).toMatchObject({ app_metadata: 1, tables: 1, seed_rows: 1, pages: 0, queries: 2, components: 2, events: 5 });
    expect(body.refs).toMatchObject({
      pages: { home: 'home-id' },
      queries: { list: 'list-id', create: 'create-id' },
      components: { title: 'title-id', save: 'save-id' },
    });
    expect(body.validation.ok).toBe(true);
    expect(client.createPages).not.toHaveBeenCalled();
    expect(client.renameApp).toHaveBeenCalledWith('app1', 'v1', 'Support Cases');
    expect(client.getTableSchema).toHaveBeenCalledTimes(2);
    expect(client.updatePages).toHaveBeenCalledWith(expect.objectContaining({
      updates: [expect.objectContaining({ pageId: 'home-id', name: 'Overview', icon: 'IconLayoutDashboard' })],
    }));
    expect(client.createQueries).toHaveBeenCalledWith(expect.objectContaining({
      queries: expect.arrayContaining([expect.objectContaining({ options: expect.objectContaining({ table_id: 'table-id' }) })]),
    }));
    expect(client.createEvents).toHaveBeenCalledOnce();

    const retry = await applyAppPhaseTool(client).handler({ app_id: 'app1', version_id: 'v1', plan_token: planToken });
    expect(retry.isError).toBe(true);
    expect(retry.content[0]!.text).toMatch(/Unknown or expired plan_token/i);
  });

  it('rejects seed rows that omit a required non-generated planned key', async () => {
    const client = {
      listTables: vi.fn().mockResolvedValue([]),
      listDatasources: vi.fn().mockResolvedValue([]),
    } as unknown as ToolJetClient;

    const result = await lintAppSpecTool(client).handler({
      tables: [{
        table_name: 'tickets',
        columns: [
          { name: 'id', type: 'integer', primaryKey: true },
          { name: 'subject', type: 'string', notNull: true },
        ],
      }],
      seed_data: [{ table_name: 'tickets', rows: [{ subject: 'Login broken' }] }],
    });

    const body = textOf(result);
    expect(body.ok).toBe(false);
    expect(body.errors.join(' ')).toMatch(/required non-generated column "id".*type "serial"/i);
  });

  it('reports partial page persistence instead of claiming the failed batch wrote nothing', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({
        app_id: 'app1', version_id: 'v1',
        pages: [{ id: 'home', name: 'Home', handle: 'home', components: [] }],
        queries: [], events: [],
      }),
      listTables: vi.fn().mockResolvedValue([]),
      listDatasources: vi.fn().mockResolvedValue([]),
      createPages: vi.fn().mockRejectedValue(new PartialWriteError('createPages', [
        { page_id: 'page-a', name: 'Queue', index: 2, icon: 'IconList' },
      ], ['Reports: upstream failure'])),
    } as unknown as ToolJetClient;

    const lintResult = await lintAppSpecTool(client).handler({
      version_id: 'v1',
      pages: [
        { name: 'Queue', icon: 'IconList' },
        { name: 'Reports', icon: 'IconChartBar' },
      ],
    });
    const result = await applyAppPhaseTool(client).handler({
      app_id: 'app1', version_id: 'v1', plan_token: textOf(lintResult).plan_token,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/Applied before failure:.*pages=1/i);
    expect(result.content[0]!.text).toMatch(/no resources were auto-deleted/i);
    expect(result.content[0]!.text).toMatch(/Persisted before failure.*page-a/i);
  });

  it('applies a repair phase that targets an existing query without recreating it', async () => {
    let created = false;
    let persistedEvents: EventSpec[] = [];
    const client = {
      getAppSummary: vi.fn().mockImplementation(async () => ({
        app_id: 'app1', name: 'Returns', version_id: 'v1',
        pages: [{
          id: 'home-id', name: 'Home', handle: 'home', icon: 'IconHome2', hidden: true,
          components: created ? [{
            id: 'refresh-id', name: 'refreshReturns', type: 'Button',
            properties: { text: { value: 'Refresh' } },
            layouts: { desktop: { top: 20, left: 2, width: 6, height: 40 } },
          }] : [],
        }],
        queries: [{
          id: 'returns-id', name: 'returnsPage', kind: 'tooljetdb', data_source_id: 'tjdb',
          options: { operation: 'list_rows', table_id: 'returns-table', list_rows: { limit: 7 } },
        }],
        events: persistedEvents.map((event, index) => ({
          id: `event-${index}`, name: event.name, sourceId: event.sourceId, target: event.sourceType,
          event: { eventId: event.trigger, ...event.action },
        })),
      })),
      listTables: vi.fn().mockResolvedValue([]),
      createPages: vi.fn(),
      updatePages: vi.fn(),
      insertRowsBatch: vi.fn(),
      createQueries: vi.fn(),
      createComponents: vi.fn().mockImplementation(async () => {
        created = true;
        return [{ component_id: 'refresh-id', name: 'refreshReturns' }];
      }),
      createEvents: vi.fn().mockImplementation(async ({ events }: { events: EventSpec[] }) => {
        persistedEvents = events;
        return { created: events.length };
      }),
    } as unknown as ToolJetClient;

    const lintResult = await lintAppSpecTool(client).handler({
      app_id: 'app1', version_id: 'v1',
      pages: [{
        client_ref: 'home', name: 'Home', icon: 'IconHome2',
        components: [{
          client_ref: 'refresh', name: 'refreshReturns', type: 'Button',
          properties: { text: 'Refresh' }, layout: { top: 20, left: 2, width: 6, height: 40 },
        }],
      }],
      events: [{
        source_ref: 'refresh', source_type: 'component', trigger: 'onClick',
        action: { actionId: 'run-query', target_ref: 'returnsPage' },
      }],
    });
    expect(textOf(lintResult).ok).toBe(true);

    const result = await applyAppPhaseTool(client).handler({
      app_id: 'app1', version_id: 'v1', plan_token: textOf(lintResult).plan_token,
    });
    const body = textOf(result);
    expect(body.applied).toMatchObject({ queries: 0, components: 1, events: 1 });
    expect(body.refs.queries).toEqual({});
    expect(client.createQueries).not.toHaveBeenCalled();
    expect(client.updatePages).not.toHaveBeenCalled();
    expect(client.createEvents).toHaveBeenCalledWith(expect.objectContaining({
      events: [expect.objectContaining({ action: expect.objectContaining({ queryId: 'returns-id' }) })],
    }));
  });
});
