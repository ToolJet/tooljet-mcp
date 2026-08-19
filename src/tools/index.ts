import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolJetClient } from '../tooljetClient.js';
import type { ToolDef } from './types.js';
import { listWorkspacesTool } from './listWorkspaces.js';
import { useWorkspaceTool } from './useWorkspace.js';
import { createAppTool } from './createApp.js';
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
import { generateFormSchemaTool } from './generateFormSchema.js';
import { getAppTool } from './getApp.js';
import { getAppSummaryTool } from './getAppSummary.js';
import { getComponentTool } from './getComponent.js';
import { validateAppTool } from './validateApp.js';
import { lintAppSpecTool } from './lintAppSpec.js';
import { applyAppPhaseTool } from './applyAppPhase.js';
import { addPageTool } from './addPage.js';
import { addPagesTool } from './addPages.js';
import { updatePagesTool } from './updatePages.js';
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

export const LEGACY_SINGULAR_CREATE_TOOL_NAMES = new Set([
  'create_table',
  'insert_rows',
  'add_page',
  'add_query',
  'add_component',
]);

function includeLegacySingularCreateTools(): boolean {
  return /^(1|true|yes)$/i.test(process.env.TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS ?? '');
}

export function registerTools(server: McpServer, client: ToolJetClient): void {
  const tools: ToolDef[] = [
    listWorkspacesTool(client),
    useWorkspaceTool(client),
    createAppTool(client),
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
    generateFormSchemaTool(client),
    getComponentCatalogTool(client),
    getAppTool(client),
    getAppSummaryTool(client),
    getComponentTool(client),
    validateAppTool(client),
    lintAppSpecTool(client),
    applyAppPhaseTool(client),
    addPageTool(client),
    addPagesTool(client),
    updatePagesTool(client),
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
  ];

  const exposedTools = includeLegacySingularCreateTools()
    ? tools
    : tools.filter((tool) => !LEGACY_SINGULAR_CREATE_TOOL_NAMES.has(tool.name));

  for (const tool of exposedTools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      (args: any) => withToolTelemetry(tool.name, () => tool.handler(args)) as any
    );
  }
}
