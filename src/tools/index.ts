import { appVersionLifecycleTools } from './appVersionLifecycle.js';
import { listWorkspaceGroupsTool, manageWorkspaceGroupsTool } from './workspaceGroupManagement.js';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolJetClient } from '../tooljetClient.js';
import type { ToolDef } from './types.js';
import { snapshotBeforeWrite, withSnapshotNote } from '../agentSnapshots.js';
import { createSnapshotTool } from './createSnapshot.js';
import { listWorkspacesTool } from './listWorkspaces.js';
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
import { inspectDatasourceSchemaTool } from './inspectDatasourceSchema.js';
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
import { applyAppPhaseTool } from './applyAppPhase.js';
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
import { manageThemeTool } from './manageTheme.js';
import { manageAppPermissionsTool } from './manageAppPermissions.js';
import {
  listWorkspaceAppsTool,
  listWorkspaceUsersTool,
  manageWorkspaceUsersTool,
} from './workspaceUserManagement.js';
import { getWorkflowNodeCatalogTool } from './getWorkflowNodeCatalog.js';
import { getWorkflowCapabilitiesTool } from './getWorkflowCapabilities.js';
import { listWorkflowsTool } from './listWorkflows.js';
import { createWorkflowTool } from './createWorkflow.js';
import { getWorkflowTool } from './getWorkflow.js';
import { lintWorkflowSpecTool } from './lintWorkflowSpec.js';
import { applyWorkflowSpecTool } from './applyWorkflowSpec.js';
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
   open request held its own copy of all 73 input schemas: about 4.2 MB of zod closures each, which
   took the hosted server to its heap limit at roughly 115 open requests. A tool's schema depends only
   on its name (the factories build it from constants, never from the client), so the first copy is
   kept for the process and the per-request copies become garbage at once. */
const inputSchemas = new Map<string, z.ZodObject>();

function sharedInputSchema(tool: ToolDef): z.ZodObject {
  let schema = inputSchemas.get(tool.name);
  if (!schema) {
    schema = tool.strictInput ? z.object(tool.inputSchema).strict() : z.object(tool.inputSchema);
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
    useWorkspaceTool(client),
    manageAppPermissionsTool(client),
    listWorkspaceAppsTool(client),
    listWorkspaceUsersTool(client),
    manageWorkspaceUsersTool(client),
    listWorkspaceGroupsTool(client),
    manageWorkspaceGroupsTool(client),
    createAppTool(client),
    createAppVersionTool(client),
    ...appVersionLifecycleTools(client),
    switchAppVersionTool(client),
    createSnapshotTool(client),
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

  const exposedTools = includeLegacySingularCreateTools()
    ? tools
    : tools.filter((tool) => !LEGACY_SINGULAR_CREATE_TOOL_NAMES.has(tool.name));

  for (const tool of exposedTools) {
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
        // Before an agent's first write to a version, ToolJet keeps a copy for the compare view (agentSnapshots.ts).
        const snapshot = await snapshotBeforeWrite(client, name, args);
        return withRuntimeStatus(withSnapshotNote(await handler(args), snapshot), status);
      }) as any
    );
  }
}
