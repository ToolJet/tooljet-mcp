import { renderAuditAvailable } from '../renderAuditAvailability.js';
import { appVersionLifecycleTools } from './appVersionLifecycle.js';
import { listWorkspaceGroupsTool, manageWorkspaceGroupsTool, workspaceGroupActionTools } from './workspaceGroupManagement.js';
import { z } from 'zod';
import { withBranchContext } from '../config.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolJetClient } from '../tooljetClient.js';
import type { ToolDef } from './types.js';
import { listWorkspacesTool, listWorkspaceBranchesTool } from './listWorkspaces.js';
import { useWorkspaceTool } from './useWorkspace.js';
import { createAppTool } from './createApp.js';
import { createAppVersionTool } from './createAppVersion.js';
import { switchAppVersionTool } from './switchAppVersion.js';
import { releaseAppTool } from './releaseApp.js';
import { getAppSettingsTool } from './getAppSettings.js';
import { listAppThemesTool } from './listAppThemes.js';
import { updateAppSettingsTool } from './updateAppSettings.js';
import { listDatasourcesTool } from './listDatasources.js';
import { listTablesTool } from './listTables.js';
import { createTableTool } from './createTable.js';
import { createTablesTool } from './createTables.js';
import { addTableColumnTool } from './addTableColumn.js';
import { dropTableColumnTool } from './dropTableColumn.js';
import { dropTableTool } from './dropTable.js';
import { getTableSchemaTool } from './getTableSchema.js';
import { insertRowsTool } from './insertRows.js';
import { insertRowsBatchTool } from './insertRowsBatch.js';
import { getComponentCatalogTool } from './getComponentCatalog.js';
import { getDatasourceQuerySchemaTool } from './getDatasourceQuerySchema.js';
import { inspectDatasourceSchemaTool, datasourceMetadataTools } from './inspectDatasourceSchema.js';
import { testDatasourceConnectionTool } from './testDatasourceConnection.js';
import { prepareSqlDiscoveryQueriesTool } from './prepareSqlDiscoveryQueries.js';
import { generateFormSchemaTool } from './generateFormSchema.js';
import { generateEditContractTool } from './generateEditContract.js';
import { getAppTool } from './getApp.js';
import { getAppSummaryTool } from './getAppSummary.js';
import { getComponentTool } from './getComponent.js';
import { validateAppTool } from './validateApp.js';
import { verifyPageRenderTool } from './verifyPageRender.js';
import { lintAppSpecTool } from './lintAppSpec.js';
import { applyAppPhaseTool, renameAppTool } from './applyAppPhase.js';
import { addPageTool } from './addPage.js';
import { addPagesTool } from './addPages.js';
import { updatePagesTool } from './updatePages.js';
import { deletePageTool } from './deletePage.js';
import { addQueryTool } from './addQuery.js';
import { addQueriesTool } from './addQueries.js';
import { addComponentTool } from './addComponent.js';
import { addComponentsTool } from './addComponents.js';
import { addComponentBatchesTool } from './addComponentBatches.js';
import { updateComponentsTool } from './updateComponents.js';
import { deleteComponentsTool } from './deleteComponents.js';
import { updateLayoutTool } from './updateLayout.js';
import { addEventsTool } from './addEvents.js';
import { addQueryLifecyclesTool } from './addQueryLifecycles.js';
import { updateQueryTool } from './updateQuery.js';
import { deleteQueryTool } from './deleteQuery.js';
import { runQueryTool } from './runQuery.js';
import { runQueriesTool } from './runQueries.js';
import { listEventsTool } from './listEvents.js';
import { updateEventsTool } from './updateEvents.js';
import { deleteEventTool } from './deleteEvent.js';
import { withToolTelemetry } from '../telemetry.js';
import {
  runtimeFreshness,
  staleRuntimeResult,
  withRuntimeStatus,
  type RuntimeFreshnessMonitor,
} from '../runtimeFreshness.js';
import { getRuntimeInfoTool } from './getRuntimeInfo.js';
import { manageThemeTool, themeActionTools } from './manageTheme.js';
import { manageAppPermissionsTool, appPermissionActionTools } from './manageAppPermissions.js';
import {
  listWorkspaceAppsTool,
  listWorkspaceFoldersTool,
  listWorkspaceUsersTool,
  manageWorkspaceUsersTool,
  workspaceUserActionTools,
} from './workspaceUserManagement.js';
import { getWorkflowNodeCatalogTool } from './getWorkflowNodeCatalog.js';
import { getWorkflowCapabilitiesTool } from './getWorkflowCapabilities.js';
import { listWorkflowsTool } from './listWorkflows.js';
import { createWorkflowTool } from './createWorkflow.js';
import { getWorkflowTool } from './getWorkflow.js';
import { lintWorkflowSpecTool } from './lintWorkflowSpec.js';
import { applyWorkflowSpecTool, workflowMutationTools } from './applyWorkflowSpec.js';
import { deleteWorkflowNodeTool } from './deleteWorkflowNode.js';
import { validateWorkflowTool } from './validateWorkflow.js';
import { runWorkflowTool } from './runWorkflow.js';
import { getWorkflowExecutionTool } from './getWorkflowExecution.js';

export const LEGACY_SINGULAR_CREATE_TOOL_NAMES = new Set([
  'create_table',
  'insert_rows',
  'add_page',
  'add_query',
  'add_component',
]);

/* The HTTP transport builds a server per request and keeps it until the response closes, so every
   open request held its own copy of all input schemas (73 at the time): about 4.2 MB of zod closures each, which
   took the hosted server to its heap limit at roughly 115 open requests. A tool's schema depends only
   on its name (the factories build it from constants, never from the client), so the first copy is
   kept for the process and the per-request copies become garbage at once. */
const inputSchemas = new Map<string, z.ZodObject>();

function sharedInputSchema(tool: ToolDef): z.ZodObject {
  let schema = inputSchemas.get(tool.name);
  if (!schema) {
    const fields = { ...tool.inputSchema, branch_id: z.string().uuid().optional().describe('Existing workspace branch ID from list_workspace_branches; pass consistently for this task.') };
    schema = tool.strictInput ? z.object(fields).strict() : z.object(fields);
    inputSchemas.set(tool.name, schema);
  }
  return schema;
}

function includeLegacySingularCreateTools(): boolean {
  return /^(1|true|yes)$/i.test(process.env.TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS ?? '');
}

export function registerTools(
  server: McpServer,
  client: ToolJetClient,
  runtime: RuntimeFreshnessMonitor = runtimeFreshness
): void {
  const tools: ToolDef[] = [
    getWorkflowNodeCatalogTool(client),
    getWorkflowCapabilitiesTool(client),
    listWorkflowsTool(client),
    createWorkflowTool(client),
    getWorkflowTool(client),
    lintWorkflowSpecTool(client),
    applyWorkflowSpecTool(client),
    deleteWorkflowNodeTool(client),
    validateWorkflowTool(client),
    runWorkflowTool(client),
    getWorkflowExecutionTool(client),
    getRuntimeInfoTool(runtime),
    listWorkspacesTool(client),
    listWorkspaceBranchesTool(client),
    useWorkspaceTool(client),
    manageAppPermissionsTool(client),
    listWorkspaceAppsTool(client),
    listWorkspaceFoldersTool(client),
    listWorkspaceUsersTool(client),
    manageWorkspaceUsersTool(client),
    listWorkspaceGroupsTool(client),
    manageWorkspaceGroupsTool(client),
    createAppTool(client),
    createAppVersionTool(client),
    ...appVersionLifecycleTools(client),
    switchAppVersionTool(client),
    releaseAppTool(client),
    getAppSettingsTool(client),
    listAppThemesTool(client),
    updateAppSettingsTool(client),
    listDatasourcesTool(client),
    listTablesTool(client),
    createTableTool(client),
    createTablesTool(client),
    addTableColumnTool(client),
    dropTableColumnTool(client),
    dropTableTool(client),
    getTableSchemaTool(client),
    insertRowsTool(client),
    insertRowsBatchTool(client),
    getDatasourceQuerySchemaTool(client),
    inspectDatasourceSchemaTool(client),
    testDatasourceConnectionTool(client),
    prepareSqlDiscoveryQueriesTool(client),
    generateFormSchemaTool(client),
    generateEditContractTool(),
    getComponentCatalogTool(client),
    getAppTool(client),
    getAppSummaryTool(client),
    getComponentTool(client),
    validateAppTool(client),
    verifyPageRenderTool(client, () => process.env.TOOLJET_APP_URL || process.env.TOOLJET_DEPLOYMENT_URL || 'http://localhost:8082'),
    lintAppSpecTool(client),
    applyAppPhaseTool(client),
    addPageTool(client),
    addPagesTool(client),
    updatePagesTool(client),
    deletePageTool(client),
    addQueryTool(client),
    addQueriesTool(client),
    updateQueryTool(client),
    deleteQueryTool(client),
    runQueryTool(client),
    runQueriesTool(client),
    addComponentTool(client),
    addComponentsTool(client),
    addComponentBatchesTool(client),
    updateComponentsTool(client),
    deleteComponentsTool(client),
    updateLayoutTool(client),
    addEventsTool(client),
    addQueryLifecyclesTool(client),
    listEventsTool(client),
    updateEventsTool(client),
    deleteEventTool(client),
    manageThemeTool(client),
  ];

  tools.push(...managementActionTools(tools));
  tools.push(...datasourceMetadataTools(tools.find(tool => tool.name === 'inspect_datasource_schema')!));
  tools.push(...workflowMutationTools(client));
  tools.push(renameAppTool(client));

  const exposedTools = includeLegacySingularCreateTools()
    ? tools
    : tools.filter((tool) => !LEGACY_SINGULAR_CREATE_TOOL_NAMES.has(tool.name));

  const canRender = renderAuditAvailable();
  for (const tool of exposedTools) {
    if (tool.name === 'verify_page_render' && !canRender) continue;
    // The callback takes the name and handler, not `tool`: holding the def would keep its own schema copy alive.
    const { name, handler } = tool;
    server.registerTool(
      name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: sharedInputSchema(tool),
        annotations: tool.annotations,
      },
      (args: any) => withToolTelemetry(name, async () => {
        const status = runtime.status();
        if (status.restart_required && name !== 'get_runtime_info') {
          return staleRuntimeResult(status);
        }
        const { branch_id, ...input } = args;
        return withRuntimeStatus(await withBranchContext(branch_id ?? client.branchId, () => handler(input)), status);
      }) as any
    );
  }
}

/** Compatibility tools stay callable while each fixed operation is also exposed upfront. */
export function managementActionTools(sources: ToolDef[]): ToolDef[] {
  const factories: Record<string, (source: ToolDef) => ToolDef[]> = {
    manage_app_permissions: appPermissionActionTools,
    manage_workspace_users: workspaceUserActionTools,
    manage_workspace_groups: workspaceGroupActionTools,
    manage_theme: themeActionTools,
  };
  return sources.flatMap(source => factories[source.name]?.(source) ?? []);
}
