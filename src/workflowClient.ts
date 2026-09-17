import { createHash } from 'node:crypto';
import type { Auth } from './auth.js';
import type { Config } from './config.js';
import type { ToolJetClient } from './tooljetClient.js';
import { definition, type Definition } from './workflows/graph.js';

export interface WorkflowSnapshot {
  workflow_id: string; version_id: string; workspace_id: string; environment_id: string;
  editable: boolean; enabled: boolean; editor_url: string; definition: Definition;
}
export type WorkflowClient = ReturnType<typeof createWorkflowClient>;
const record = (x: unknown): Record<string, unknown> => x && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, unknown> : {};
const required = (x: unknown, label: string) => { if (typeof x !== 'string' || !x) throw new Error(`Workflow response missing ${label}.`); return x; };
export function createWorkflowClient(auth: Auth, config: Config, queries: Pick<ToolJetClient, 'getQueries' | 'listDatasources' | 'createQuery' | 'updateQuery' | 'getDevelopmentEnvironmentId'>) {
  async function request(path: string, body?: unknown, method = 'POST') {
    const mutation = body !== undefined;
    let response: Response;
    try {
      response = await auth.authedFetch(path, { ...(mutation ? { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(90_000) });
    } catch {
      throw new Error(mutation ? `Workflow request outcome is unknown (${method} ${path}). Inspect persisted state before retrying; it may have completed.` : `Workflow read failed (${path}).`);
    }
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 600);
      throw new Error(`Workflow API ${method === 'POST' && !mutation ? 'GET' : method} ${path} failed (HTTP ${response.status}). Check session, workspace, permissions, license and version state.${detail ? ` Response: ${detail}` : ''}`);
    }
    if (response.status === 204) return {};
    const text = await response.text();
    return text ? JSON.parse(text) as unknown : {};
  }
  const versionPath = (id: string, version: string) => `/api/v2/apps/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}`;
  async function get(workflowId: string, versionId?: string): Promise<WorkflowSnapshot> {
    if (!versionId) {
      const app = record(await request(`/api/apps/${encodeURIComponent(workflowId)}`));
      versionId = required(record(app.editing_version ?? app.editingVersion).id, 'editing version');
    }
    const app = record(await request(versionPath(workflowId, versionId)));
    if (app.type !== 'workflow') throw new Error('Target is not a workflow.');
    const workspace = await auth.getOrganizationId();
    if ((app.organizationId ?? app.organization_id) !== workspace) throw new Error('Workflow does not belong to the active workspace.');
    if (app.id !== workflowId) throw new Error('Workflow response ID mismatch.');
    const version = record(app.editing_version ?? app.editingVersion);
    if (version.id !== versionId) throw new Error('Workflow version response mismatch.');
    const environmentId = required(version.currentEnvironmentId ?? version.current_environment_id, 'environment ID');
    const status = String(version.status ?? '').toUpperCase();
    const released = (app.currentVersionId ?? app.current_version_id) === versionId;
    const frozen = Boolean(app.should_freeze_editor ?? app.shouldFreezeEditor);
    return {
      workflow_id: workflowId, version_id: versionId, workspace_id: workspace, environment_id: environmentId,
      editable: status === 'DRAFT' && !released && !frozen,
      enabled: (app.isMaintenanceOn ?? app.is_maintenance_on) === true,
      editor_url: `${config.appUrl}/${encodeURIComponent(await auth.getOrganizationSlug())}/apps/${encodeURIComponent(typeof app.slug === 'string' && app.slug ? app.slug : workflowId)}`,
      definition: definition(version.definition),
    };
  }
  return {
    ...queries,
    workspaceId: () => auth.getOrganizationId(),
    async planScope() { return createHash('sha256').update(JSON.stringify([config.apiUrl, config.sessionToken ?? config.pat, await auth.getOrganizationId()])).digest('hex'); },
    async list(page = 1, search = '') { return request(`/api/apps?${new URLSearchParams({ type: 'workflow', page: String(page), searchKey: search })}`); },
    get,
    async create(name: string) {
      const created = record(await request('/api/workflows', { name, type: 'workflow' }));
      const id = required(created.id, 'created workflow ID');
      try { return await get(id); } catch (error) {
        throw new Error(`Workflow ${id} was created, but readback failed. Do not recreate it. ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    async save(snapshot: WorkflowSnapshot, graph: Definition) {
      if (!snapshot.editable) throw new Error('Only editable draft workflow versions can be changed.');
      return request(versionPath(snapshot.workflow_id, snapshot.version_id), { definition: graph }, 'PUT');
    },
    /** Workflow nodes use their own creation route. It supplies ToolJet's static RunJS source
     * when no datasource is needed, and carries workflow-specific guards/metadata. */
    async createWorkflowQuery(params: {
      workflowId: string; versionId: string; name: string; kind: string;
      options: Record<string, unknown>; dataSourceId?: string;
    }) {
      const body = record(await request('/api/data-queries/workflow-node', {
        app_id: params.workflowId,
        app_version_id: params.versionId,
        name: params.name,
        kind: params.kind,
        options: params.options,
        ...(params.dataSourceId ? { data_source_id: params.dataSourceId } : {}),
      }));
      return { query_id: required(body.id, 'created workflow query ID'), name: required(body.name, 'created workflow query name') };
    },
    async run(workflowId: string, versionId: string, environmentId: string, params: Record<string, unknown>) {
      const snapshot = await get(workflowId, versionId);
      if (snapshot.environment_id !== environmentId) throw new Error('Environment must match the selected workflow version.');
      if (!snapshot.enabled) throw new Error('Workflow is disabled. Enable it in ToolJet before running it.');
      return request('/api/workflow_executions', { executeUsing: 'version', appVersionId: versionId, appId: workflowId, environmentId, params });
    },
    async execution(id: string, page = 1, perPage = 20) {
      const base = `/api/workflow_executions/${encodeURIComponent(id)}`;
      const status = await request(`${base}/status`);
      const nodes = await request(`${base}/nodes?${new URLSearchParams({ page: String(page), per_page: String(perPage) })}`);
      return { execution_id: id, status, nodes, page, per_page: perPage };
    },
  };
}
