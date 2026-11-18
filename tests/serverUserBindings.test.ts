import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { addQueriesTool } from '../src/tools/addQueries.js';
import { updateQueryTool } from '../src/tools/updateQuery.js';
import { codeAppBuildTool, resetCodeSessionForTests } from '../src/tools/codeApp.js';
import { browserUserBindings, browserUserQueryProblems, isCodeModeApp } from '../src/serverUserBindings.js';
import { codeContext, DEPLOYMENT, WORKSPACE } from './codeContext.js';

// Roles test (2026-11-04): the own-request filter read {{globals.currentUser.email}}, which the browser resolves and
// sends with the run, so an employee listed a manager's requests by sending the manager's email.
const OWN_ROWS = {
  operation: 'list_rows',
  table_id: 't1',
  list_rows: { where_filters: { '0': { column: 'requester_email', operator: 'eq', value: '{{globals.currentUser.email}}' } } },
};
const SERVER_ROWS = {
  operation: 'list_rows',
  table_id: 't1',
  list_rows: { where_filters: { '0': { column: 'requester_email', operator: 'eq', value: '{{globals.server.currentUser.email}}' } } },
};

const codeApp = { id: 'app-1', build_mode: 'code', organizationId: WORKSPACE, pages: [] };
const visualApp = { id: 'app-1', build_mode: 'visual', organizationId: WORKSPACE, pages: [] };

function fakeClient(app: unknown) {
  const client = {
    getApp: vi.fn().mockResolvedValue(app),
    listDatasources: vi.fn().mockResolvedValue([{ id: 'db', name: 'tooljetdb', kind: 'tooljetdb' }]),
    listTables: vi.fn().mockResolvedValue([]),
    getQueries: vi.fn().mockResolvedValue([]),
    getAppSummary: vi.fn().mockResolvedValue({
      app_id: 'app-1', pages: [], events: [],
      queries: [{ id: 'q1', name: 'my_requests', kind: 'tooljetdb', data_source_id: 'db', options: SERVER_ROWS }],
    }),
    createQueries: vi.fn().mockImplementation(async (params: { queries: Array<{ name: string }> }) =>
      params.queries.map((query, index) => ({ query_id: `q-${index}`, name: query.name }))),
    updateQuery: vi.fn().mockResolvedValue({ query_id: 'q1' }),
  };
  return client as unknown as ToolJetClient & Record<string, ReturnType<typeof vi.fn>>;
}

describe('the signed-in user in a Code mode query', () => {
  it('finds browser bindings by path and leaves the server form alone', () => {
    expect(browserUserBindings(OWN_ROWS)).toEqual(['list_rows.where_filters.0.value']);
    expect(browserUserBindings({ value: '{{ x ? globals.currentUser.email : "" }}' })).toEqual(['value']);
    expect(browserUserBindings(SERVER_ROWS)).toEqual([]);
    // RunJS reads it as code, in the browser, with no binding: not a server filter.
    expect(browserUserBindings({ code: 'return globals.currentUser.email;' })).toEqual([]);
  });

  it('knows a Code mode app by build_mode or by its Code mode page', () => {
    expect(isCodeModeApp(codeApp)).toBe(true);
    expect(isCodeModeApp(visualApp)).toBe(false);
    const withCodePage = { build_mode: 'visual', pages: [{ components: { root: { component: { definition: { properties: { codePage: { value: '{{true}}' } } } } } } }] };
    expect(isCodeModeApp(withCodePage)).toBe(true);
  });

  it('add_queries refuses the browser form in a Code mode app and writes nothing', async () => {
    const client = fakeClient(codeApp);
    const result = await addQueriesTool(client).handler({
      version_id: 'v1', app_id: 'app-1', queries: [{ datasource_id: 'db', name: 'my_requests', options: OWN_ROWS }],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/Query "my_requests": list_rows\.where_filters\.0\.value reads \{\{globals\.currentUser\.\*\}\}.*\{\{globals\.server\.currentUser\.\*\}\}/);
    expect(client.createQueries).not.toHaveBeenCalled();
  });

  it('add_queries leaves a Visual app, a call without app_id and the server form as they were', async () => {
    for (const [app, appId, options] of [[visualApp, 'app-1', OWN_ROWS], [codeApp, undefined, OWN_ROWS], [codeApp, 'app-1', SERVER_ROWS]] as const) {
      const client = fakeClient(app);
      const result = await addQueriesTool(client).handler({
        version_id: 'v1', ...(appId ? { app_id: appId } : {}), queries: [{ datasource_id: 'db', name: 'my_requests', options }],
      });
      expect(result.isError).toBeFalsy();
      expect(client.createQueries).toHaveBeenCalledTimes(1);
    }
    // No binding of the browser user: the app is not even read.
    const client = fakeClient(codeApp);
    await addQueriesTool(client).handler({ version_id: 'v1', app_id: 'app-1', queries: [{ datasource_id: 'db', name: 'q', options: SERVER_ROWS }] });
    expect(client.getApp).not.toHaveBeenCalled();
  });

  it('update_query refuses the browser form in a Code mode app, not in a Visual one', async () => {
    const code = fakeClient(codeApp);
    const refused = await updateQueryTool(code).handler({ query_id: 'my_requests', version_id: 'v1', app_id: 'app-1', options: OWN_ROWS });
    expect(refused.isError).toBe(true);
    expect(refused.content[0]!.text).toMatch(/Nothing was written/);
    expect(code.updateQuery).not.toHaveBeenCalled();
    const visual = fakeClient(visualApp);
    const kept = await updateQueryTool(visual).handler({ query_id: 'my_requests', version_id: 'v1', app_id: 'app-1', options: OWN_ROWS });
    expect(kept.isError).toBeFalsy();
    expect(visual.updateQuery).toHaveBeenCalled();
  });

  it('lists every offending saved query as a check line', () => {
    const app = { data_queries: [
      { name: 'my_requests', options: OWN_ROWS },
      { name: 'manager_queue', options: SERVER_ROWS },
      { name: 'create_event', options: { create_row: { '0': { column: 'actor', value: '{{globals.currentUser.email}}' } } } },
    ] };
    const lines = browserUserQueryProblems(app);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^Query "my_requests"/);
    expect(lines[1]).toMatch(/^Query "create_event": create_row\.0\.value/);
  });
});

const FAKE_CLI = `
const args = process.argv.slice(2);
if (args[1] === 'check') { console.log(JSON.stringify({ problems: [], security: { gate: 'pass', counts: {}, findings: [] } })); process.exit(0); }
if (args[0] === 'library') { console.log('✓ TypeScript compiled (0 errors)'); process.exit(0); }
console.log('Already at revision 1 (owner platform)');
`;

describe('code_app_build checks the saved queries', () => {
  let dir: string;
  const env = { ...process.env };
  const project = () => join(dir, 'apps', DEPLOYMENT, WORKSPACE, 'desk');

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tj-mcp-user-'));
    writeFileSync(join(dir, 'cli.js'), FAKE_CLI);
    for (const d of ['frontend/src/App', 'frontend/styles']) mkdirSync(join(project(), d), { recursive: true });
    writeFileSync(join(project(), 'app.json'), JSON.stringify({ appId: 'app-1' }));
    writeFileSync(join(project(), 'frontend/src/App/index.tsx'), 'export default function App() { return null; }\n');
    Object.assign(process.env, { TOOLJET_CLI: join(dir, 'cli.js'), TOOLJET_CODE_APP_ROOT: join(dir, 'apps') });
    resetCodeSessionForTests();
  });
  afterEach(() => {
    process.env = { ...env };
    rmSync(dir, { recursive: true, force: true });
    resetCodeSessionForTests();
  });

  const build = async (queries: unknown[]) => {
    const getAppSummary = async () => ({ app_id: 'app-1', pages: [], events: [], queries });
    const result = await codeAppBuildTool(codeContext({ client: { getAppSummary } as never })).handler({ name: 'desk' } as never);
    return JSON.parse(result.content[0]!.text);
  };

  it('is not ok while a query reads the browser user, and names it', async () => {
    const result = await build([{ name: 'my_requests', options: OWN_ROWS }]);
    expect(result.ok).toBe(false);
    expect(result.check[0]).toMatch(/^query check: Query "my_requests"/);
  });

  it('is ok once the queries read the server user', async () => {
    expect((await build([{ name: 'my_requests', options: SERVER_ROWS }])).ok).toBe(true);
  });
});
