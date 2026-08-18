import { describe, expect, it, vi } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';

function textOf(result: { content: Array<{ text: string }> }): any {
  return JSON.parse(result.content[0]!.text);
}

describe('lint_app_spec', () => {
  it('validates a complete planned flow through logical refs without writing', async () => {
    const client = {
      listDatasources: vi.fn().mockResolvedValue([{ id: 'tjdb', name: 'ToolJet DB', kind: 'tooljetdb' }]),
    } as unknown as ToolJetClient;
    const result = await lintAppSpecTool(client).handler({
      version_id: 'v1',
      tables: [{ table_name: 'cases', columns: [{ name: 'title', type: 'string' }] }],
      queries: [
        { client_ref: 'list', datasource_id: 'tjdb', name: 'list_cases', options: { operation: 'list_rows', table_id: 't1', list_rows: {} } },
        {
          client_ref: 'create', datasource_id: 'tjdb', name: 'create_case',
          options: { operation: 'create_row', table_id: 't1', create_row: { title: '{{components.caseTitle.value}}' } },
        },
      ],
      pages: [{
        client_ref: 'home', name: 'Home', icon: 'IconHome2',
        components: [
          {
            client_ref: 'caseTitle', name: 'caseTitle', type: 'TextInput',
            properties: { label: { value: 'Title' } }, styles: { alignment: { value: 'top' } },
            layout: { top: 20, left: 2, width: 20, height: 60 },
          },
          {
            client_ref: 'save', name: 'saveCase', type: 'Button', properties: { text: { value: 'Save' } },
            layout: { top: 120, left: 2, width: 6, height: 40 },
          },
        ],
      }],
      events: [{
        source_ref: 'save', source_type: 'component', trigger: 'onClick',
        action: { actionId: 'run-query', target_ref: 'create' },
      }],
      lifecycles: [{
        query_ref: 'create', refresh_query_refs: ['list'], clear_component_refs: ['caseTitle'],
        success_alert: { message: 'Created' }, failure_alert: { message: 'Failed' },
      }],
    });
    const body = textOf(result);
    expect(body.ok).toBe(true);
    expect(body.counts).toMatchObject({ tables: 1, pages: 1, components: 2, queries: 2, events: 5, lifecycles: 1 });
    expect(client.listDatasources).toHaveBeenCalledOnce();
  });

  it('collects mechanical failures across tables, components, queries, and events in one pass', async () => {
    const client = { listDatasources: vi.fn() } as unknown as ToolJetClient;
    const result = await lintAppSpecTool(client).handler({
      tables: [{ table_name: 'steps', columns: [{ name: 'action', type: 'string' }] }],
      queries: [{ kind: 'tooljetdb', name: 'bad_query', options: { operation: 'list_rows', table_id: 't1', order_filters: [] } }],
      pages: [{
        name: 'Cases', icon: 'IconChecklist',
        components: [
          {
            client_ref: 'title', name: 'title', type: 'Text', properties: { text: { value: 'Large heading' } },
            styles: { textSize: { value: 32 }, fontWeight: { value: 'bold' } },
            layout: { top: 0, left: 0, width: 20, height: 40 },
          },
          {
            client_ref: 'save', name: 'save', type: 'Button', properties: { text: { value: 'Save' } },
            layout: { top: 60, left: 0, width: 6, height: 40 },
          },
        ],
      }],
      events: [{
        source_ref: 'save', source_type: 'component', trigger: 'onChange',
        action: { actionId: 'run-query', target_ref: 'missing' },
      }],
    });
    const body = textOf(result);
    expect(body.ok).toBe(false);
    expect(body.errors.join(' ')).toMatch(/reserved column name/i);
    expect(body.errors.join(' ')).toMatch(/unknown.*target_ref/i);
    expect(body.errors.join(' ')).toMatch(/trigger "onChange" is not valid for Button/i);
    expect(body.warnings.join(' ')).toMatch(/order_filters|Unknown option key/i);
    expect(body.warnings.join(' ')).toMatch(/too short.*single line needs/i);
  });

  it('requires at least one spec section', async () => {
    const result = await lintAppSpecTool({} as ToolJetClient).handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/at least one table, query, page, event, or lifecycle/i);
  });
});
