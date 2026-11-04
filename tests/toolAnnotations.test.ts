import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/renderAuditAvailability.js', () => ({ renderAuditAvailable: vi.fn(() => true) }));
import { renderAuditAvailable } from '../src/renderAuditAvailability.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { getDatasourceQuerySchemaTool } from '../src/tools/getDatasourceQuerySchema.js';
import { getWorkflowCapabilitiesTool } from '../src/tools/getWorkflowCapabilities.js';
import { buildUnconfiguredServer } from '../src/server.js';
import { registerTools } from '../src/tools/index.js';

interface Registered {
  name: string;
  title?: string;
  description?: string;
  annotations?: ToolAnnotations;
}

/**
 * Every tool the server actually exposes, including the legacy singular aliases, which are off by
 * default but still reach clients that opt in — and would still be reviewed.
 */
function registeredTools(): Registered[] {
  const previous = process.env.TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS;
  process.env.TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS = 'true';
  try {
    const captured: Registered[] = [];
    const server = {
      registerTool(name: string, config: Omit<Registered, 'name'>) {
        captured.push({ name, ...config });
      },
    } as unknown as McpServer;
    registerTools(server, {} as ToolJetClient);
    return captured;
  } finally {
    if (previous === undefined) delete process.env.TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS;
    else process.env.TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS = previous;
  }
}

/**
 * Pinned by name, not derived from the code under test. Deriving it would let a tool that quietly
 * loses its destructive hint keep passing — the exact regression this guards.
 */
const MUST_BE_DESTRUCTIVE = [
  'delete_components', 'delete_event', 'delete_page', 'delete_query',
  'drop_table', 'drop_table_column', 'manage_theme', 'manage_workspace_groups',
  'run_queries', 'run_query',
  'apply_workflow_spec', 'run_workflow',
  'delete_workflow_node',
  'update_app_settings', 'update_components', 'update_events',
  'update_layout', 'update_pages', 'update_query', 'update_app_version',
  'invite_workspace_user', 'update_workspace_user', 'archive_workspace_user', 'unarchive_workspace_user',
  'set_app_resource_permission', 'clear_app_resource_permission', 'create_workspace_theme',
  'delete_workspace_theme', 'delete_workspace_group', 'remove_workspace_group_member',
  'update_workspace_group_permissions', 'update_workspace_group_access', 'delete_workspace_group_access',
];

const MUST_BE_READ_ONLY = [
  'generate_form_schema', 'get_app', 'get_app_settings', 'get_app_summary', 'get_component',
  'get_component_catalog', 'get_datasource_query_schema', 'get_runtime_info', 'get_table_schema',
  'inspect_datasource_schema', 'lint_app_spec', 'list_app_themes', 'list_datasources',
  'list_events', 'list_tables', 'list_workspaces', 'list_workspace_groups', 'prepare_sql_discovery_queries',
  'test_datasource_connection', 'use_workspace', 'validate_app', 'verify_page_render',
  'get_workflow', 'get_workflow_execution', 'get_workflow_node_catalog',
  'get_workflow_capabilities', 'list_workflows', 'lint_workflow_spec', 'validate_workflow',
];

const MUST_BE_ADDITIVE = ['create_workflow'];

describe('tool annotations', () => {
  const tools = registeredTools();

  it.each([
    { legacy: false, render: false, count: 96 },
    { legacy: true, render: false, count: 101 },
    { legacy: false, render: true, count: 97 },
    { legacy: true, render: true, count: 102 },
  ])('publishes complete wire annotations with legacy=$legacy and render=$render', async ({ legacy, render, count }) => {
    const previous = process.env.TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS;
    process.env.TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS = String(legacy);
    vi.mocked(renderAuditAvailable).mockReturnValue(render);
    const server = new McpServer({ name: 'annotation-contract', version: '1' });
    const client = new Client({ name: 'annotation-reader', version: '1' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    try {
      registerTools(server, {} as ToolJetClient);
      await server.connect(serverTransport); await client.connect(clientTransport);
      const { tools: published } = await client.listTools();
      expect(published).toHaveLength(count);
      expect(published.some(tool => tool.name === 'verify_page_render')).toBe(render);
      for (const tool of published) {
        for (const hint of ['readOnlyHint', 'destructiveHint', 'openWorldHint'] as const) {
          expect(Object.hasOwn(tool.annotations ?? {}, hint), tool.name + '.' + hint).toBe(true);
          expect(typeof tool.annotations?.[hint], tool.name + '.' + hint).toBe('boolean');
        }
      }
    } finally {
      await client.close(); await server.close();
      if (previous === undefined) delete process.env.TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS;
      else process.env.TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS = previous;
      vi.mocked(renderAuditAvailable).mockReturnValue(true);
    }
  });

  it('serializes explicit annotations for the unconfigured status tool', async () => {
    const server = buildUnconfiguredServer('Synthetic configuration unavailable');
    const client = new Client({ name: 'status-contract', version: '1' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    try {
      await server.connect(serverTransport); await client.connect(clientTransport);
      const result = await client.listTools();
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0]).toMatchObject({ name: 'tooljet_status', annotations: {
        readOnlyHint: true, destructiveHint: false, openWorldHint: false,
      } });
    } finally { await client.close(); await server.close(); }
  });

  it('registers every tool with a human-readable title', () => {
    const untitled = tools.filter((t) => !t.title?.trim());
    expect(untitled.map((t) => t.name)).toEqual([]);
  });

  it('gives each tool a title distinct from its identifier', () => {
    const echoed = tools.filter((t) => t.title === t.name);
    expect(echoed.map((t) => t.name)).toEqual([]);
  });

  it.each(['readOnlyHint', 'destructiveHint', 'openWorldHint'] as const)('states %s as a direct boolean on every tool', (hint) => {
    expect(tools.filter(t => !Object.hasOwn(t.annotations ?? {}, hint) || typeof t.annotations?.[hint] !== 'boolean').map(t => t.name)).toEqual([]);
  });

  it('reserves open-world annotations for execution, connected-service probes, rendering, and invitations', () => {
    expect(tools.filter(t => t.annotations?.openWorldHint).map(t => t.name).sort()).toEqual([
      'inspect_datasource_schema', 'invite_workspace_user', 'manage_workspace_users',
      'run_queries', 'run_query', 'run_workflow', 'test_datasource_connection', 'verify_page_render',
    ]);
  });

  it('never marks a read-only tool destructive', () => {
    const contradictory = tools.filter(
      (t) => t.annotations?.readOnlyHint === true && t.annotations?.destructiveHint === true
    );
    expect(contradictory.map((t) => t.name)).toEqual([]);
  });

  it.each(MUST_BE_DESTRUCTIVE)('flags %s as destructive', (name) => {
    const tool = tools.find((t) => t.name === name);
    expect(tool, `${name} is no longer registered`).toBeDefined();
    expect(tool!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true });
  });

  it.each(MUST_BE_READ_ONLY)('flags %s as read-only', (name) => {
    const tool = tools.find((t) => t.name === name);
    expect(tool, `${name} is no longer registered`).toBeDefined();
    expect(tool!.annotations?.readOnlyHint).toBe(true);
  });

  it.each(MUST_BE_ADDITIVE)('flags %s as non-destructive', (name) => {
    const tool = tools.find((t) => t.name === name);
    expect(tool, `${name} is no longer registered`).toBeDefined();
    expect(tool!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false });
  });

  it('keeps titles unique so clients can disambiguate them', () => {
    const titles = tools.map((t) => t.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

// These two tools return authoring metadata. An operation selector must never become an executor.
function readOnlyClient() {
  const datasources = [{ id: 'b1000000-0000-4000-8000-000000000001', name: 'Observatory records', kind: 'postgresql' }];
  const read = vi.fn().mockResolvedValue(datasources);
  const client = new Proxy({ listDatasources: read, workflows: { listDatasources: read } }, {
    get(target, key) {
      if (key in target) return target[key as keyof typeof target];
      throw new Error(`Unexpected non-catalog operation: ${String(key)}`);
    },
  }) as unknown as ToolJetClient;
  return { client, read, datasource: datasources[0].id };
}

describe('catalog tool execution boundaries', () => {
  it('looks up operation schemas locally and only reads datasource metadata to resolve an ID', async () => {
    const { client, read, datasource } = readOnlyClient();
    const tool = getDatasourceQuerySchemaTool(client);
    expect((await tool.handler({ kind: 'postgresql', operation: 'sql' })).isError).not.toBe(true);
    expect(read).not.toHaveBeenCalled();
    expect((await tool.handler({ datasource_id: datasource, version_id: 'observatory-version', operation: 'sql' })).isError).not.toBe(true);
    expect(read).toHaveBeenCalledExactlyOnceWith('observatory-version');
  });

  it('classifies workflow datasources without invoking any capability', async () => {
    const { client, read } = readOnlyClient();
    const version = 'b2000000-0000-4000-8000-000000000002';
    const result = await getWorkflowCapabilitiesTool(client).handler({ version_id: version });
    expect(result.isError).not.toBe(true);
    expect(JSON.parse(result.content[0].text).datasources[0].capabilities).toEqual(['query']);
    expect(read).toHaveBeenCalledExactlyOnceWith(version);
  });
});
