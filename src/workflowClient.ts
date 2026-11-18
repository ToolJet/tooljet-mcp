import { workflowOperations, type WorkflowOperationName } from './workflows/operations.js';
import { resolveWorkflowReference, type WorkflowConsumer } from './workflowReference.js';
import { createHash } from 'node:crypto';
import type { Auth } from './auth.js';
import { branchIdFor, type Config } from './config.js';
import type { ToolJetClient } from './tooljetClient.js';
import { definition, type Definition } from './workflows/graph.js';

export interface WorkflowSnapshot {
  workflow_id: string; version_id: string; workspace_id: string; environment_id: string;
  editable: boolean; enabled: boolean; webhook_enabled?: boolean; branch_id?: string; status?: string; editor_url: string; definition: Definition;
}
export type WorkflowClient = ReturnType<typeof createWorkflowClient>;
const record = (x: unknown): Record<string, unknown> => x && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, unknown> : {};
const required = (x: unknown, label: string) => { if (typeof x !== 'string' || !x) throw new Error(`Workflow response missing ${label}.`); return x; };
export function createWorkflowClient(auth: Auth, config: Config, queries: Pick<ToolJetClient, 'assertDatasourceAllowed' | 'getQueries' | 'listDatasources' | 'createQuery' | 'updateQuery' | 'deleteQuery' | 'getDevelopmentEnvironmentId'>) {
  async function request(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST') {
    const mutation = method !== 'GET';
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
    // The version endpoint recursively camel-cases opaque definition keys. The
    // existing export API returns the stored JSON unchanged. Never fall back to
    // the lossy definition, including when export permission is unavailable.
    const exported = record(await request('/api/v2/resources/export', {
      organization_id: workspace,
      app: [{ id: workflowId, search_params: { version_id: versionId } }],
    }));
    const apps = Array.isArray(exported.app) ? exported.app : [];
    const rawApp = record(record(record(apps[0]).definition).appV2);
    if (apps.length !== 1 || rawApp.id !== workflowId || rawApp.type !== 'workflow' || rawApp.organizationId !== workspace) {
      throw new Error('Lossless workflow export response mismatch. No definition can be safely edited.');
    }
    const versions = Array.isArray(rawApp.appVersions) ? rawApp.appVersions : [];
    const rawVersion = record(versions.find(candidate => record(candidate).id === versionId));
    if (rawVersion.id !== versionId || !Object.hasOwn(rawVersion, 'definition')) {
      throw new Error('Lossless workflow export is missing the requested version definition.');
    }
    const branchName = record(version.branch).name;
    const branchQuery = typeof branchName === 'string' && branchName ? `?branch=${encodeURIComponent(branchName)}` : '';
    return {
      workflow_id: workflowId, version_id: versionId, workspace_id: workspace, environment_id: environmentId,
      editable: status === 'DRAFT' && !released && !frozen,
      enabled: (app.isMaintenanceOn ?? app.is_maintenance_on) === true,
      webhook_enabled: (version.workflowEnabled ?? version.workflow_enabled) === true,
      branch_id: typeof (version.branchId ?? version.branch_id ?? record(version.branch).id) === 'string' ? String(version.branchId ?? version.branch_id ?? record(version.branch).id) : undefined, status,
      editor_url: `${config.appUrl}/${encodeURIComponent(await auth.getOrganizationSlug())}/apps/${encodeURIComponent(typeof app.slug === 'string' && app.slug ? app.slug : workflowId)}${branchQuery}`,
      definition: definition(rawVersion.definition),
    };
  }
  async function assertWorkflowDatasources(versionId: string, environmentId: string, graph: Definition, visited = new Set<string>(), consumer?: WorkflowConsumer): Promise<void> {
    if (visited.has(versionId)) return;
    if (visited.size >= 50) throw new Error('Cannot verify all nested workflow datasources; refusing AI execution.');
    visited.add(versionId);
    const saved = await queries.getQueries(versionId);
    const savedIds = new Set(saved.map(query => query.id));
    // ToolJet executes definition mappings by bare query ID. Imported/copy leftovers
    // must not reach an unchecked query belonging to another version.
    if (graph.queries.some(mapping => !savedIds.has(mapping.id))) {
      throw new Error('Workflow definition references a query outside its version; refusing AI execution.');
    }
    if (saved.some(query => !query.data_source_id)) throw new Error('Cannot verify a workflow query datasource; refusing AI execution.');
    if (saved.length) await queries.listDatasources(versionId);
    await Promise.all([...new Set(saved.map(query => query.data_source_id!))]
      .map(id => queries.assertDatasourceAllowed(id, versionId, environmentId)));
    for (const query of saved) {
      if (query.kind !== 'workflows') continue;
      const resolved = await resolveWorkflowReference(auth, record(query.options), consumer);
      const workflowId = resolved.workflow_id;
      const childVersionId = required(resolved.version_id, 'nested workflow released or pinned version');
      if (visited.has(childVersionId)) continue;
      const childApp = record(await request(versionPath(workflowId, childVersionId)));
      const child = record(childApp.editing_version ?? childApp.editingVersion);
      if (childApp.type !== 'workflow' || childApp.id !== workflowId || child.id !== childVersionId ||
          (childApp.organizationId ?? childApp.organization_id) !== await auth.getOrganizationId() ||
          !Object.hasOwn(child, 'definition')) {
        throw new Error('Cannot verify the nested workflow version definition; refusing AI execution.');
      }
      // Only query mapping IDs are inspected, so camel-casing of opaque definition
      // content by the version endpoint cannot alter the authorization check.
      await assertWorkflowDatasources(childVersionId, environmentId, definition(child.definition), visited, {branch_id: String(child.branchId ?? child.branch_id ?? record(child.branch).id ?? '') || undefined, status: String(child.status ?? '')});
    }
  }
  return {
    ...queries,
    resolveReference: (options: Record<string, unknown>, consumer?: WorkflowConsumer | string) => resolveWorkflowReference(auth, options, consumer),
    workspaceId: () => auth.getOrganizationId(),
    async planScope() {
      if (config.isOAuthDelegation && !config.oauthGrantId) throw new Error('OAuth workflow plans require a trusted grant identifier.');
      // Delegation JWTs change per request; the same live approval must retain its linted plan.
      const identity = config.isOAuthDelegation ? ['oauth', config.oauthGrantId] : config.sessionToken ?? config.pat;
      return createHash('sha256').update(JSON.stringify([config.apiUrl, identity, await auth.getOrganizationId(), branchIdFor(config)])).digest('hex');
    },
    async list(page = 1, search = '') { return request(`/api/apps?${new URLSearchParams({ type: 'workflow', page: String(page), searchKey: search })}`); },
    get,
    async create(name: string) {
      const branchId = branchIdFor(config);
      const created = record(await request('/api/workflows', { name, type: 'workflow', ...(branchId ? { branchId } : {}) }));
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
      if (params.dataSourceId) await queries.assertDatasourceAllowed(params.dataSourceId, params.versionId);
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
    async run(workflowId: string, versionId: string, environmentId: string, params: Record<string, unknown>, step?: { start_node_id?: string; state?: Record<string, unknown> }) {
      const snapshot = await get(workflowId, versionId);
      if (snapshot.environment_id !== environmentId) throw new Error('Environment must match the selected workflow version.');
      if (!snapshot.enabled) throw new Error('Workflow is disabled. Enable it in ToolJet before running it.');
      await assertWorkflowDatasources(versionId, environmentId, snapshot.definition, new Set(), snapshot);
      if (step?.start_node_id && !snapshot.definition.nodes.some(node => node.id === step.start_node_id)) throw new Error('Step node does not belong to this version.');
      if (step?.state && ['__humanDecision','__waitResume'].some(key => Object.hasOwn(step.state!, key))) throw new Error('Internal resume markers are not accepted.');
      return request('/api/workflow_executions', { executeUsing: 'version', appVersionId: versionId, appId: workflowId, environmentId, params, ...(step?.start_node_id ? { startNodeId: step.start_node_id, injectedState: step.state ?? {} } : {}) });
    },
    async manage(name: WorkflowOperationName, input: unknown) {
      const operation = workflowOperations[name];
      const args = operation.schema.parse(input) as any;
      if ('draft' in operation && operation.draft && !(await get(args.workflow_id, args.version_id)).editable) throw new Error('Package changes require an editable draft.');
      if (name === 'set_workflow_packages' && (args.language === 'python' ? typeof args.dependencies !== 'string' : typeof args.dependencies !== 'object' || Array.isArray(args.dependencies))) throw new Error('JavaScript requires a dependency map; Python requires requirements text.');
      if (name === 'preview_workflow_node') {
        const snapshot = await get(args.workflow_id, args.version_id);
        if (snapshot.environment_id !== args.environment_id) throw new Error('Environment must match the selected workflow version.');
        const node = snapshot.definition.nodes.find(node => node.id === args.node_id);
        if (!node) throw new Error('Preview node does not belong to this version.');
        const queryId = snapshot.definition.queries.find(query => query.idOnDefinition === node.data.idOnDefinition)?.id;
        if (args.query_id && args.query_id !== queryId) throw new Error('Preview query does not belong to this node.');
        args.query_id = queryId;
        if (['__humanDecision','__waitResume'].some(key => Object.hasOwn(args.state, key))) throw new Error('Internal resume markers are not accepted.');
        await assertWorkflowDatasources(args.version_id, args.environment_id, snapshot.definition, new Set(), snapshot);
      }
      if (['create_workflow_schedule','update_workflow_schedule','set_workflow_schedule_active'].includes(name) && !(name === 'set_workflow_schedule_active' && args.active === false)) {
        const existing = args.schedule_id ? record(await request(`/api/workflow-schedules/${args.schedule_id}`)) : {};
        const changes = args.changes ?? args;
        const versionId = required(changes.workflowId ?? record(existing.workflow).id ?? existing.workflowId, 'schedule version');
        const workflowId = required(args.workflow_id ?? existing.appId ?? existing.app_id, 'schedule workflow');
        const environmentId = required(changes.environmentId ?? existing.environmentId ?? existing.environment_id, 'schedule environment');
        const snapshot = await get(workflowId, versionId);
        if (snapshot.environment_id !== environmentId) throw new Error('Schedule environment must match its pinned version.');
        await assertWorkflowDatasources(versionId, environmentId, snapshot.definition, new Set(), snapshot);
      }
      if (name === 'set_workflow_webhook_enabled' && args.enabled) {
        // Webhooks can execute the release or a caller-selected named version. Enabling
        // the trigger must check those versions, not only the editor's current draft.
        const app = record(await request(`/api/apps/${encodeURIComponent(args.workflow_id)}`));
        const listing = record(await request(`/api/apps/${encodeURIComponent(args.workflow_id)}/versions?includeDefaultBranchVersions=true`));
        if (!Array.isArray(listing.versions)) throw new Error('Cannot verify webhook versions.');
        const versions = new Set(listing.versions.map(value => required(record(value).id, 'webhook version')));
        const released = app.current_version_id ?? app.currentVersionId;
        if (typeof released === 'string') versions.add(released);
        const editing = record(app.editing_version ?? app.editingVersion).id;
        if (typeof editing === 'string') versions.add(editing);
        if (!versions.size || versions.size > 100) throw new Error('Cannot verify all webhook versions.');
        for (const versionId of versions) {
          const snapshot = await get(args.workflow_id, versionId);
          await assertWorkflowDatasources(snapshot.version_id, snapshot.environment_id, snapshot.definition, new Set(), snapshot);
        }
      }
      const result = await request(operation.path(args), 'body' in operation ? operation.body(args) : undefined, operation.method);
      if (record(result).success === false) throw new Error(String(record(result).message ?? 'Workflow operation failed.'));
      return result;
    },
    async webhook(workflowId: string, includeCredentials = false) {
      const snapshot = await get(workflowId);
      const app = record(await request(`/api/apps/${encodeURIComponent(workflowId)}`));
      const releasedId = app.current_version_id ?? app.currentVersionId;
      const released = typeof releasedId === 'string' ? await get(workflowId, releasedId) : undefined;
      return { workflow_id: workflowId, configured_version_id: snapshot.version_id, enabled: snapshot.webhook_enabled,
        trigger_url: `${config.apiUrl}/api/v2/webhooks/workflows/${encodeURIComponent(workflowId)}/trigger`,
        default_trigger: released ? { version_id: released.version_id, enabled: released.webhook_enabled,
          inputs: released.definition.workflowInputs ?? [], legacy_parameters: released.definition.webhookParams ?? [] }
          : { version_id: null, message: 'No released version. The default webhook URL cannot execute until a version is released.' },
        ...(includeCredentials ? { token: app.workflow_api_token ?? app.workflowApiToken } : {}),
        inputs: snapshot.definition.workflowInputs ?? [], legacy_parameters: snapshot.definition.webhookParams ?? [] };

    },
    async watch(executionId: string, seconds: number) {
      await request(`/api/workflow_executions/${encodeURIComponent(executionId)}/status`);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), seconds * 1000);
      const events: unknown[] = [];
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      try {
        const response = await auth.authedFetch(`/api/workflow_executions/${encodeURIComponent(executionId)}/stream`, { signal: controller.signal, headers: { Accept: 'text/event-stream' } });
        if (!response.ok || !response.body) throw new Error(`Workflow event stream failed (HTTP ${response.status}).`);
        reader = response.body.getReader();
        const decoder = new TextDecoder(); let buffer = ''; let bytes = 0;
        while (events.length < 100 && bytes < 60_000) {
          const chunk = await reader.read(); if (chunk.done) break;
          bytes += chunk.value.byteLength; if (bytes > 60_000) break; buffer += decoder.decode(chunk.value, { stream: true }); buffer = buffer.replace(/\r\n/g, '\n');
          let boundary: number;
          while (events.length < 100 && (boundary = buffer.indexOf('\n\n')) >= 0) {
            const frame = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
            const payload = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
            if (payload) { try { events.push(JSON.parse(payload)); } catch { events.push({ data: payload }); } }
          }
        }
        return { execution_id: executionId, events, bounded: true };
      } catch (error) {
        if (!controller.signal.aborted) throw error;
        return { execution_id: executionId, events, bounded: true };
      } finally { clearTimeout(timer); controller.abort(); await reader?.cancel().catch(() => {}); }
    },
    async execution(id: string, page = 1, perPage = 20) {
      const base = `/api/workflow_executions/${encodeURIComponent(id)}`;
      const response = record(await request(`${base}/status`));
      // /status repeats every node result. Only /nodes is paginated; omit those
      // duplicated results before applying the MCP response size limit.
      const detail = response.execution_status ? {} : record(await request(base));
      const executionStatus = response.execution_status ?? (detail.executed === false && detail.status === 'success' ? 'running' : detail.status) ?? 'unknown';
      let approvalId: unknown = response.approval_request_id ?? null;
      let approvalLookup: string | undefined;
      if (executionStatus === 'waiting' && !approvalId) {
        const appId = detail.app_id ?? detail.appId;
        if (typeof appId === 'string') {
          try {
            for (let approvalPage = 1; approvalPage <= 10; approvalPage++) {
              const result = record(await request(`/api/workflow-approvals?${new URLSearchParams({app_id:appId,status:'pending',page:String(approvalPage),per_page:'50'})}`));
              const rows = Array.isArray(result.requests) ? result.requests : [];
              const found = rows.map(record).find(row => (row.executionId ?? row.execution_id) === id);
              if (found) { approvalId = found.id; break; }
              if (rows.length < 50) break;
              if (approvalPage === 10) approvalLookup = 'More approvals are available; use list_workflow_approvals.';
            }
          } catch { approvalLookup = 'Approval lookup unavailable; use list_workflow_approvals with an authorized account.'; }
        }
      }
      if (executionStatus === 'waiting' && !approvalId && !approvalLookup) approvalLookup = 'No matching pending approval is visible to this account; use list_workflow_approvals with an authorized account.';
      const status = { status: response.status, execution_status: executionStatus, approval_request_id: approvalId, ...(approvalLookup ? {approval_lookup:approvalLookup} : {}), logs: response.logs };
      const nodes = await request(`${base}/nodes?${new URLSearchParams({ page: String(page), per_page: String(perPage) })}`);
      return { execution_id: id, status, nodes, page, per_page: perPage };
    },
  };
}
