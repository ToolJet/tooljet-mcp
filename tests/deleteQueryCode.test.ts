import { describe, expect, it, vi } from 'vitest';
import type { AppSummary, ToolJetClient } from '../src/tooljetClient.js';
import { codeReferences, deleteQueryTool } from '../src/tools/deleteQuery.js';

/*
  delete_query checked component, query and event references, never a Code mode app's stored code, so a query the
  screens call through useAppQuery('<name>') was deleted cleanly and the app broke.
*/
const summary = (queries = [{ id: 'q-approve', name: 'approveRequest', kind: 'postgresql', options: {} }]): AppSummary =>
  ({ app_id: 'app1', pages: [{ id: 'home', components: [] }], queries, events: [] } as unknown as AppSummary);

const SOURCE = [
  { path: 'frontend/src/tooljet.gen.ts', content: "export type Queries = 'approveRequest' | 'listRequests';\n" },
  { path: 'frontend/src/App/Requests.tsx', content: "import { useAppQuery } from '../tooljet.gen';\nconst approve = useAppQuery('approveRequest');\n" },
  { path: 'app.json', content: '{"routes":[]}' },
];

describe('delete_query in a Code mode app', () => {
  it('finds string literals naming the query, not the generated hooks or prefixes', () => {
    expect(codeReferences(SOURCE, 'approveRequest')).toEqual(['frontend/src/App/Requests.tsx:2']);
    expect(codeReferences(SOURCE, 'listRequests')).toEqual([]);
    expect(codeReferences([{ path: 'frontend/src/a.ts', content: 'run(`approve`); x("approveRequestOld")' }], 'approve')).toEqual(['frontend/src/a.ts:1']);
    expect(codeReferences([{ path: 'frontend/src/a.ts', content: 'x("approveRequestOld")' }], 'approveRequest')).toEqual([]);
  });

  it('refuses to delete a query the stored code calls, and names where', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue(summary()),
      codeSourceFiles: vi.fn().mockResolvedValue(SOURCE),
      deleteQuery: vi.fn(),
    } as unknown as ToolJetClient;
    const result = await deleteQueryTool(client).handler({ app_id: 'app1', version_id: 'v1', query_id: 'q-approve', confirm: true });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/the app's code calls approveRequest at frontend\/src\/App\/Requests\.tsx:2/);
    expect(client.codeSourceFiles).toHaveBeenCalledWith('app1', 'v1');
    expect(client.deleteQuery).not.toHaveBeenCalled();
  });

  it('refuses when the code cannot be read, and deletes when no code names the query', async () => {
    const unreadable = {
      getAppSummary: vi.fn().mockResolvedValue(summary()),
      codeSourceFiles: vi.fn().mockRejectedValue(new Error('codeSourceFiles failed: 500')),
      deleteQuery: vi.fn(),
    } as unknown as ToolJetClient;
    const refused = await deleteQueryTool(unreadable).handler({ app_id: 'app1', version_id: 'v1', query_id: 'q-approve', confirm: true });
    expect(refused.content[0]!.text).toMatch(/could not read the app's code/);
    expect(unreadable.deleteQuery).not.toHaveBeenCalled();

    const visual = {
      getAppSummary: vi.fn().mockResolvedValueOnce(summary()).mockResolvedValueOnce(summary([])),
      codeSourceFiles: vi.fn().mockResolvedValue(null),
      deleteQuery: vi.fn().mockResolvedValue({ deleted: true }),
    } as unknown as ToolJetClient;
    const deleted = await deleteQueryTool(visual).handler({ app_id: 'app1', version_id: 'v1', query_id: 'q-approve', confirm: true });
    expect(deleted.isError).toBeFalsy();
    expect(visual.deleteQuery).toHaveBeenCalledOnce();
  });
});
