import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { addQueryTool } from '../src/tools/addQuery.js';
import { addQueriesTool } from '../src/tools/addQueries.js';
import { updateQueryTool } from '../src/tools/updateQuery.js';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';
import { applyAppPhaseTool } from '../src/tools/applyAppPhase.js';
import { lintPlannedApp, type AppSpecLintResult } from '../src/appSpecLint.js';
import { clearAppPlansForTests, storeAppPlan } from '../src/appPlanStore.js';

// ToolJet stores the query panel's four toggles as booleans and tests them for truthiness without evaluating them,
// so any text (including "{{false}}") turns the toggle on. Every route that writes query options must hand the
// client a boolean or leave the key out, whether or not the datasource kind is known on that route.

const TOGGLES = ['runOnPageLoad', 'runOnDependencyChange', 'requestConfirmation', 'showSuccessNotification'] as const;
const OMIT = Symbol('omitted');
type Case = { label: string; input: unknown; expected: boolean | undefined | 'refused' };
const CASES: Case[] = [
  { label: 'true', input: true, expected: true },
  { label: 'false', input: false, expected: false },
  { label: '"true"', input: 'true', expected: true },
  { label: '"{{false}}"', input: '{{false}}', expected: false },
  { label: '" {{ true }} "', input: ' {{ true }} ', expected: true },
  { label: '"{{variables.x}}"', input: '{{variables.x}}', expected: 'refused' },
  { label: '[]', input: [], expected: 'refused' },
  { label: '{}', input: {}, expected: 'refused' },
  { label: '1', input: 1, expected: 'refused' },
  { label: 'null', input: null, expected: 'refused' },
  { label: 'omitted', input: OMIT, expected: undefined },
];
const MATRIX = TOGGLES.flatMap((toggle) => CASES.map((c) => ({ toggle, ...c })));

function optionsWith(toggle: string, input: unknown): Record<string, unknown> {
  const options: Record<string, unknown> = { code: 'return 1;' };
  if (input !== OMIT) options[toggle] = structuredClone(input);
  return options;
}

function textOf(result: { content: Array<{ text: string }> }): any {
  return JSON.parse(result.content[0]!.text);
}

function fakeClient() {
  const written: Array<Record<string, unknown>> = [];
  const client = {
    listDatasources: vi.fn().mockResolvedValue([{ id: 'js', name: 'runjsdefault', kind: 'runjs' }]),
    listTables: vi.fn().mockResolvedValue([]),
    getQueries: vi.fn().mockResolvedValue([]),
    getAppSummary: vi.fn().mockResolvedValue({
      app_id: 'app1', name: 'App', version_id: 'v1',
      pages: [{ id: 'home', name: 'Home', handle: 'home', components: [] }],
      queries: [{ id: 'q1', name: 'compute', kind: 'runjs', data_source_id: 'js', options: { code: 'return 0;' } }],
      events: [],
    }),
    renameApp: vi.fn(),
    createTables: vi.fn().mockResolvedValue([]),
    createPages: vi.fn().mockResolvedValue([]),
    updatePages: vi.fn(),
    insertRowsBatch: vi.fn().mockResolvedValue([]),
    createQuery: vi.fn().mockImplementation(async (params: { options: Record<string, unknown>; name: string }) => {
      written.push(params.options);
      return { query_id: 'q-new', name: params.name };
    }),
    createQueries: vi.fn().mockImplementation(async (params: { queries: Array<{ options: Record<string, unknown>; name: string }> }) => {
      written.push(...params.queries.map((query) => query.options));
      return params.queries.map((query, index) => ({ query_id: `q-${index}`, name: query.name }));
    }),
    updateQuery: vi.fn().mockImplementation(async (params: { options: Record<string, unknown>; queryId: string }) => {
      written.push(params.options);
      return { query_id: params.queryId };
    }),
    updateQueryDatasource: vi.fn(),
    createComponents: vi.fn().mockResolvedValue([]),
    createEvents: vi.fn().mockResolvedValue({ created: 0 }),
  };
  return { client: client as unknown as ToolJetClient, raw: client, written };
}

type Route = (client: ToolJetClient, options: Record<string, unknown>) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

const ROUTES: Record<string, Route> = {
  add_query: (client, options) => addQueryTool(client).handler({ version_id: 'v1', datasource_id: 'js', name: 'fresh', options }),
  add_queries: (client, options) => addQueriesTool(client).handler({
    version_id: 'v1', queries: [{ datasource_id: 'js', name: 'fresh', options }],
  }),
  'update_query (query_id + version_id only)': (client, options) => updateQueryTool(client).handler({
    query_id: 'q1', version_id: 'v1', options,
  }),
  'update_query (kind)': (client, options) => updateQueryTool(client).handler({
    query_id: 'q1', version_id: 'v1', kind: 'runjs', options,
  }),
  'update_query (app_id)': (client, options) => updateQueryTool(client).handler({
    query_id: 'q1', version_id: 'v1', app_id: 'app1', options,
  }),
  'update_query (name only)': (client, options) => updateQueryTool(client).handler({
    name: 'compute', version_id: 'v1', options,
  }),
  'lint_app_spec then apply_app_phase': async (client, options) => {
    const lint = textOf(await lintAppSpecTool(client).handler({
      version_id: 'v1', queries: [{ datasource_id: 'js', name: 'fresh', options }],
    }));
    if (!lint.ok) return { isError: true, content: [{ text: JSON.stringify(lint) }] };
    return applyAppPhaseTool(client).handler({ app_id: 'app1', version_id: 'v1', plan_token: lint.plan_token });
  },
  // A stored plan that never passed the current lint (an older token, or a store written by another path) must
  // still be refused by apply itself before anything is written.
  'apply_app_phase (stored plan)': (client, options) => {
    const lint: AppSpecLintResult = { ok: true, errors: [], warnings: [], checked: [] } as unknown as AppSpecLintResult;
    const { plan_token } = storeAppPlan({
      version_id: 'v1', app_name: 'Renamed', queries: [{ datasource_id: 'js', name: 'fresh', options }],
    } as never, lint);
    return applyAppPhaseTool(client).handler({ app_id: 'app1', version_id: 'v1', plan_token });
  },
};

describe('query toggles reach the client as booleans on every write route', () => {
  beforeEach(() => clearAppPlansForTests());

  for (const [route, call] of Object.entries(ROUTES)) {
    it.each(MATRIX)(`${route}: $toggle = $label`, async ({ toggle, input, expected }) => {
      const { client, raw, written } = fakeClient();
      const result = await call(client, optionsWith(toggle, input));
      if (expected === 'refused') {
        expect(result.isError, result.content[0]?.text).toBe(true);
        expect(result.content[0]!.text).toContain(toggle);
        expect(result.content[0]!.text).toMatch(/true or false/);
        expect(written).toEqual([]);
        expect(raw.renameApp).not.toHaveBeenCalled();
        expect(raw.createTables).not.toHaveBeenCalled();
        expect(raw.updateQueryDatasource).not.toHaveBeenCalled();
        return;
      }
      expect(result.isError, result.content[0]?.text).toBeFalsy();
      expect(written).toHaveLength(1);
      if (expected === undefined) expect(written[0]).not.toHaveProperty(toggle);
      else expect(written[0]![toggle]).toBe(expected);
      for (const other of TOGGLES) if (other !== toggle) expect(written[0]).not.toHaveProperty(other);
    });
  }

  it('a normalized toggle is not reported as a column-map rewrite', async () => {
    const { client } = fakeClient();
    const body = textOf(await addQueryTool(client).handler({
      version_id: 'v1', datasource_id: 'js', name: 'fresh', options: { code: 'return 1;', runOnPageLoad: '{{false}}' },
    }));
    const warnings = body.warnings.join(' ');
    expect(warnings).not.toMatch(/column map/);
    expect(warnings).toMatch(/runOnPageLoad "\{\{false\}\}" saved as false/);
  });

  it('lintPlannedApp refuses a non-boolean toggle even when the query kind is unresolved', () => {
    const result = lintPlannedApp({ queries: [{ name: 'compute', datasourceId: 'js', options: { code: 'return 1;', runOnPageLoad: [] } }] });
    expect(result.errors.join(' ')).toMatch(/Query "compute": runOnPageLoad must be true or false/);
  });
});
