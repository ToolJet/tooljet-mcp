import { describe, expect, it } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { ToolJetClient } from '../src/tooljetClient.js';
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
  'drop_table', 'drop_table_column', 'manage_theme',
  'run_queries', 'run_query',
  'update_app_settings', 'update_components', 'update_events',
  'update_layout', 'update_pages', 'update_query',
];

const MUST_BE_READ_ONLY = [
  'generate_form_schema', 'get_app', 'get_app_settings', 'get_app_summary', 'get_component',
  'get_component_catalog', 'get_datasource_query_schema', 'get_runtime_info', 'get_table_schema',
  'inspect_datasource_schema', 'lint_app_spec', 'list_app_themes', 'list_datasources',
  'list_events', 'list_tables', 'list_workspaces', 'prepare_sql_discovery_queries',
  'test_datasource_connection', 'use_workspace', 'validate_app',
];

describe('tool annotations', () => {
  const tools = registeredTools();

  it('registers every tool with a human-readable title', () => {
    const untitled = tools.filter((t) => !t.title?.trim());
    expect(untitled.map((t) => t.name)).toEqual([]);
  });

  it('gives each tool a title distinct from its identifier', () => {
    const echoed = tools.filter((t) => t.title === t.name);
    expect(echoed.map((t) => t.name)).toEqual([]);
  });

  it('states readOnlyHint explicitly on every tool', () => {
    const unstated = tools.filter((t) => typeof t.annotations?.readOnlyHint !== 'boolean');
    expect(unstated.map((t) => t.name)).toEqual([]);
  });

  it('states destructiveHint explicitly on every writing tool', () => {
    // An omitted destructiveHint defaults to true under the spec, so silence here would mislabel
    // the additive majority as dangerous rather than simply leaving them undescribed.
    const unstated = tools.filter(
      (t) => t.annotations?.readOnlyHint === false && typeof t.annotations?.destructiveHint !== 'boolean'
    );
    expect(unstated.map((t) => t.name)).toEqual([]);
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

  it('keeps titles unique so clients can disambiguate them', () => {
    const titles = tools.map((t) => t.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
