import { describe, expect, it, vi } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { inspectDatasourceSchemaTool } from '../src/tools/inspectDatasourceSchema.js';
import { addTableColumnTool } from '../src/tools/addTableColumn.js';
import { dropTableColumnTool } from '../src/tools/dropTableColumn.js';
import { dropTableTool } from '../src/tools/dropTable.js';
import { updateComponentsTool } from '../src/tools/updateComponents.js';
import { updateEventsTool } from '../src/tools/updateEvents.js';
import { updateLayoutTool } from '../src/tools/updateLayout.js';

function textOf(result: { content: Array<{ text: string }> }): any {
  return JSON.parse(result.content[0]!.text);
}

describe('inspect_datasource_schema tool', () => {
  it('allows an advertised method and forwards only requested metadata args', async () => {
    const client = {
      listDatasources: vi.fn().mockResolvedValue([{ id: 'pg1', name: 'Postgres', kind: 'postgresql' }]),
      invokeDatasourceMethod: vi.fn().mockResolvedValue({ status: 'ok', data: [{ table_name: 'tickets' }] }),
    } as unknown as ToolJetClient;
    const result = await inspectDatasourceSchemaTool(client).handler({
      version_id: 'v1',
      datasource_id: 'pg1',
      method: 'listTables',
      schema: 'public',
      search: 'tick',
      page: 1,
      limit: 25,
    });
    expect(client.invokeDatasourceMethod).toHaveBeenCalledWith({
      dataSourceId: 'pg1',
      method: 'listTables',
      args: { values: { schema: 'public' }, search: 'tick', page: 1, limit: 25 },
    });
    expect(textOf(result)).toMatchObject({ datasource: { kind: 'postgresql' }, method: 'listTables' });
  });

  it('blocks methods the plugin contract does not advertise', async () => {
    const client = {
      listDatasources: vi.fn().mockResolvedValue([{ id: 'pg1', name: 'Postgres', kind: 'postgresql' }]),
      invokeDatasourceMethod: vi.fn(),
    } as unknown as ToolJetClient;
    const result = await inspectDatasourceSchemaTool(client).handler({
      version_id: 'v1',
      datasource_id: 'pg1',
      method: 'deleteEverything',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/Available methods: listColumns, listSchemas, listTables/);
    expect(client.invokeDatasourceMethod).not.toHaveBeenCalled();
  });

  it('batches independent column lookups after validating every method', async () => {
    const client = {
      listDatasources: vi.fn().mockResolvedValue([{ id: 'pg1', name: 'Postgres', kind: 'postgresql' }]),
      invokeDatasourceMethod: vi.fn()
        .mockResolvedValueOnce({ status: 'ok', data: [{ value: 'id', label: 'id' }] })
        .mockResolvedValueOnce({ status: 'ok', data: [{ value: 'email', label: 'email' }] }),
    } as unknown as ToolJetClient;
    const result = await inspectDatasourceSchemaTool(client).handler({
      version_id: 'v1', datasource_id: 'pg1',
      requests: [
        { method: 'listColumns', schema: 'public', table: 'users' },
        { method: 'listColumns', schema: 'public', table: 'accounts' },
      ],
    });
    expect(client.invokeDatasourceMethod).toHaveBeenCalledTimes(2);
    expect(textOf(result).results).toHaveLength(2);
    expect(textOf(result).results[0]).toMatchObject({ method: 'listColumns', schema: 'public', table: 'users' });
  });

  it('rejects an invalid batch before invoking any metadata method', async () => {
    const client = {
      listDatasources: vi.fn().mockResolvedValue([{ id: 'pg1', name: 'Postgres', kind: 'postgresql' }]),
      invokeDatasourceMethod: vi.fn(),
    } as unknown as ToolJetClient;
    const result = await inspectDatasourceSchemaTool(client).handler({
      version_id: 'v1', datasource_id: 'pg1',
      requests: [
        { method: 'listTables', schema: 'public' },
        { method: 'listIndexes', schema: 'public', table: 'users' },
      ],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/listIndexes.*Available methods/i);
    expect(client.invokeDatasourceMethod).not.toHaveBeenCalled();
  });
});

describe('ToolJet DB maintenance tools', () => {
  it('adds a column through the typed client contract', async () => {
    const client = { addTableColumn: vi.fn().mockResolvedValue({ added: true }) } as unknown as ToolJetClient;
    const result = await addTableColumnTool(client).handler({
      table_name: 'tickets',
      column: { name: 'summary', type: 'string' },
    });
    expect(client.addTableColumn).toHaveBeenCalledWith({
      tableName: 'tickets',
      column: { name: 'summary', type: 'string' },
      foreignKeys: undefined,
    });
    expect(textOf(result)).toEqual({ added: true });
  });

  it('requires literal confirmation for destructive tools', () => {
    const client = {} as ToolJetClient;
    expect(dropTableColumnTool(client).inputSchema.confirm.safeParse(undefined).success).toBe(false);
    expect(dropTableColumnTool(client).inputSchema.confirm.safeParse(true).success).toBe(true);
    expect(dropTableTool(client).inputSchema.confirm.safeParse(false).success).toBe(false);
  });
});

describe('update_components validation', () => {
  it('canonicalizes concise raw definition leaves before an update', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({
        app_id: 'app1',
        pages: [{ id: 'p1', components: [{
          id: 'title', name: 'pageTitle', type: 'Text',
          properties: { text: { value: 'Old' } }, styles: { textSize: { value: 20 } },
        }] }],
        queries: [], events: [],
      }),
      updateComponents: vi.fn().mockResolvedValue({ updated: 1 }),
    } as unknown as ToolJetClient;
    await updateComponentsTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      updates: [{
        component_id: 'title',
        definition: {
          properties: { text: 'Payments control tower' },
          styles: { textSize: 32 },
          others: { showOnDesktop: '{{true}}' },
        },
      }],
    });

    expect(client.updateComponents).toHaveBeenCalledWith(expect.objectContaining({
      updates: [expect.objectContaining({
        definition: expect.objectContaining({
          properties: { text: { value: 'Payments control tower' } },
          styles: { textSize: { value: 32 } },
          others: { showOnDesktop: { value: '{{true}}' } },
        }),
      })],
    }));
  });

  it('moves a body title into the current modal native header with slot_name only', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({
        app_id: 'app1',
        pages: [{ id: 'p1', components: [
          { id: 'm1', name: 'createCase', type: 'ModalV2', properties: { showHeader: { value: true } } },
          {
            id: 'title', name: 'modalTitle', type: 'Text', parent: 'm1',
            properties: { text: { value: 'Add a test case' } }, styles: { fontWeight: { value: 'bold' } },
          },
        ] }],
        queries: [], events: [],
      }),
      updateComponents: vi.fn().mockResolvedValue({ updated: 1 }),
    } as unknown as ToolJetClient;
    const result = await updateComponentsTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      updates: [{ component_id: 'title', slot_name: 'header' }],
    });
    expect(result.isError).not.toBe(true);
    expect(client.updateComponents).toHaveBeenCalledWith(expect.objectContaining({
      updates: [{ componentId: 'title', definition: undefined, name: undefined, parent: 'm1', slotName: 'header' }],
    }));
  });

  it('blocks duplicate Table column keys after merging the persisted component', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({
        app_id: 'app1',
        pages: [{ id: 'p1', components: [{ id: 't1', name: 'tickets', type: 'Table', properties: {} }] }],
        queries: [],
        events: [],
      }),
      updateComponents: vi.fn(),
    } as unknown as ToolJetClient;
    const result = await updateComponentsTool(client).handler({
      app_id: 'app1',
      version_id: 'v1',
      page_id: 'p1',
      updates: [{
        component_id: 't1',
        definition: {
          properties: {
            columns: { value: [{ name: 'First', key: 'same' }, { name: 'Second', key: 'same' }] },
          },
        },
      }],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/duplicate column key "same"/);
    expect(client.updateComponents).not.toHaveBeenCalled();
  });

  it('normalizes an unsafe explicit Table update before persisting it', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({
        app_id: 'app1',
        pages: [{ id: 'p1', components: [{
          id: 't1', name: 'tickets', type: 'Table',
          properties: {
            columns: { value: [{ name: 'Ticket', key: 'title' }] },
          },
        }] }],
        queries: [],
        events: [],
      }),
      updateComponents: vi.fn().mockResolvedValue({ updated: 1 }),
    } as unknown as ToolJetClient;
    const result = await updateComponentsTool(client).handler({
      app_id: 'app1',
      version_id: 'v1',
      page_id: 'p1',
      updates: [{
        component_id: 't1',
        definition: { properties: { autogenerateColumns: { value: false } } },
      }],
    });
    expect(result.isError).not.toBe(true);
    expect(client.updateComponents).toHaveBeenCalledWith(expect.objectContaining({
      updates: [expect.objectContaining({
        componentId: 't1',
        definition: expect.objectContaining({
          properties: expect.objectContaining({
            autogenerateColumns: { value: true },
            useDynamicColumn: expect.any(Object),
            columnData: expect.any(Object),
          }),
        }),
      })],
    }));
    expect(textOf(result).warnings.join(' ')).toMatch(/normalized autogenerateColumns from false to true/);
  });

  it('adds KeyValuePair demo-field deletion history to an explicit fields update', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({
        app_id: 'app1',
        pages: [{ id: 'p1', components: [{
          id: 'kv1', name: 'assetDetails', type: 'KeyValuePair',
          properties: { data: { value: '{{variables.selectedAsset}}' } },
        }] }],
        queries: [], events: [],
      }),
      updateComponents: vi.fn().mockResolvedValue({ updated: 1 }),
    } as unknown as ToolJetClient;
    await updateComponentsTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      updates: [{
        component_id: 'kv1',
        definition: { properties: { fields: { value: [
          { id: 'asset-custom', key: 'asset', name: 'Asset', autogenerated: false },
        ] } } },
      }],
    });

    expect(client.updateComponents).toHaveBeenCalledWith(expect.objectContaining({
      updates: [expect.objectContaining({
        definition: expect.objectContaining({
          properties: expect.objectContaining({
            fieldDeletionHistory: { value: expect.arrayContaining(['name', 'status']) },
          }),
        }),
      })],
    }));
  });

  it('warns when a style edit turns an authored-height gap into a rendered overlap', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({
        app_id: 'app1',
        pages: [{ id: 'p1', components: [
          {
            id: 'first', name: 'first', type: 'TextInput', properties: { label: { value: 'First' } },
            styles: { alignment: { value: 'side' } }, layouts: { desktop: { top: 0, left: 0, width: 18, height: 62 } },
          },
          {
            id: 'second', name: 'second', type: 'TextInput', properties: { label: { value: 'Second' } },
            styles: { alignment: { value: 'side' } }, layouts: { desktop: { top: 72, left: 0, width: 18, height: 62 } },
          },
        ] }],
        queries: [],
        events: [],
      }),
      updateComponents: vi.fn().mockResolvedValue({ updated: 1 }),
    } as unknown as ToolJetClient;
    const result = await updateComponentsTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      updates: [{ component_id: 'first', definition: { styles: { alignment: { value: 'top' } } } }],
    });
    expect(textOf(result).warnings.join(' ')).toMatch(/renders 82px tall.*authored 62px \+ 20px/);
    expect(client.updateComponents).toHaveBeenCalled();
  });
});

describe('update_layout geometry warnings', () => {
  it('warns when a resize makes a Statistics tile unreadably narrow', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({
        app_id: 'app1',
        pages: [{ id: 'p1', components: [{
          id: 'kpi', name: 'openCases', type: 'Statistics',
          properties: { hideSecondary: { value: false } },
          layouts: { desktop: { top: 0, left: 0, width: 18, height: 120 } },
        }] }],
        queries: [],
        events: [],
      }),
      updateLayouts: vi.fn().mockResolvedValue({ updated: 1 }),
    } as unknown as ToolJetClient;
    const result = await updateLayoutTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      layouts: [{ component_id: 'kpi', desktop: { top: 0, left: 0, width: 9, height: 120 } }],
    });
    expect(textOf(result).warnings.join(' ')).toMatch(/width 9 columns is too narrow.*at least 18/is);
    expect(client.updateLayouts).toHaveBeenCalled();
  });

  it('checks the projected full-page layout before writing and returns overlap warnings', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({
        app_id: 'app1',
        pages: [{ id: 'p1', components: [
          {
            id: 'first', name: 'first', type: 'TextInput', properties: { label: { value: 'First' } },
            styles: { alignment: { value: 'top' } }, layouts: { desktop: { top: 0, left: 0, width: 18, height: 62 } },
          },
          {
            id: 'second', name: 'second', type: 'TextInput', properties: { label: { value: 'Second' } },
            styles: { alignment: { value: 'top' } }, layouts: { desktop: { top: 100, left: 0, width: 18, height: 62 } },
          },
        ] }],
        queries: [],
        events: [],
      }),
      updateLayouts: vi.fn().mockResolvedValue({ updated: 1 }),
    } as unknown as ToolJetClient;
    const result = await updateLayoutTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      layouts: [{ component_id: 'second', desktop: { top: 72, left: 0, width: 18, height: 62 } }],
    });
    expect(textOf(result).warnings.join(' ')).toMatch(/overlap at rendered desktop size/);
    expect(client.updateLayouts).toHaveBeenCalled();
  });
});

describe('update_events validation', () => {
  it('accepts an update that keeps state-setting before the final navigation handler', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({
        app_id: 'app1',
        pages: [
          { id: 'p1', components: [{ id: 'button1', name: 'open', type: 'Button', properties: {} }] },
          { id: 'p2', components: [] },
        ],
        queries: [],
        events: [
          {
            id: 'state', index: 0, name: 'Old alert', sourceId: 'button1', target: 'component',
            event: { eventId: 'onClick', actionId: 'show-alert', message: 'Opening', alertType: 'info' },
          },
          {
            id: 'nav', index: 1, name: 'Navigate', sourceId: 'button1', target: 'component',
            event: { eventId: 'onClick', actionId: 'switch-page', pageId: 'p2' },
          },
        ],
      }),
      updateEvents: vi.fn().mockResolvedValue({ updated: 1 }),
    } as unknown as ToolJetClient;

    const result = await updateEventsTool(client).handler({
      app_id: 'app1', version_id: 'v1', update_type: 'update',
      events: [{
        event_id: 'state', name: 'Select row',
        event: { eventId: 'onClick', actionId: 'set-custom-variable', key: 'selectedId', value: '{{1}}' },
      }],
    });

    expect(result.isError).not.toBe(true);
    expect(client.updateEvents).toHaveBeenCalledOnce();
  });

  it('blocks a reorder that moves switch-page before another same-trigger handler', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({
        app_id: 'app1',
        pages: [
          { id: 'p1', components: [{ id: 'button1', name: 'open', type: 'Button', properties: {} }] },
          { id: 'p2', components: [] },
        ],
        queries: [{ id: 'q1', name: 'loadDetails' }],
        events: [
          {
            id: 'run', index: 0, name: 'Load', sourceId: 'button1', target: 'component',
            event: { eventId: 'onClick', actionId: 'run-query', queryId: 'q1' },
          },
          {
            id: 'nav', index: 1, name: 'Navigate', sourceId: 'button1', target: 'component',
            event: { eventId: 'onClick', actionId: 'switch-page', pageId: 'p2' },
          },
        ],
      }),
      updateEvents: vi.fn(),
    } as unknown as ToolJetClient;
    const result = await updateEventsTool(client).handler({
      app_id: 'app1',
      version_id: 'v1',
      update_type: 'reorder',
      events: [
        { event_id: 'nav', index: 0 },
        { event_id: 'run', index: 1 },
      ],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/switch-page must be the LAST handler/);
    expect(client.updateEvents).not.toHaveBeenCalled();
  });

  it('blocks a trigger that cannot bind to the persisted component type', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({
        app_id: 'app1',
        pages: [{ id: 'p1', components: [{ id: 'button1', name: 'save', type: 'Button', properties: {} }] }],
        queries: [],
        events: [{
          id: 'e1',
          name: 'Save',
          sourceId: 'button1',
          target: 'component',
          event: { eventId: 'onClick', actionId: 'show-alert', message: 'Saved' },
        }],
      }),
      updateEvents: vi.fn(),
    } as unknown as ToolJetClient;
    const result = await updateEventsTool(client).handler({
      app_id: 'app1',
      version_id: 'v1',
      events: [{
        event_id: 'e1',
        name: 'Broken',
        event: { eventId: 'onTableActionButtonClicked', actionId: 'show-alert', message: 'Nope' },
      }],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/not valid for Button/);
    expect(client.updateEvents).not.toHaveBeenCalled();
  });
});
