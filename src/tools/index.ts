import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolJetClient } from '../tooljetClient.js';
import type { ToolDef } from './types.js';
import { createAppTool } from './createApp.js';
import { listDatasourcesTool } from './listDatasources.js';
import { listTablesTool } from './listTables.js';
import { createTableTool } from './createTable.js';
import { getTableSchemaTool } from './getTableSchema.js';
import { insertRowsTool } from './insertRows.js';
import { getComponentCatalogTool } from './getComponentCatalog.js';
import { getAppTool } from './getApp.js';
import { addPageTool } from './addPage.js';
import { addQueryTool } from './addQuery.js';
import { addQueriesTool } from './addQueries.js';
import { addComponentTool } from './addComponent.js';
import { addComponentsTool } from './addComponents.js';

export function registerTools(server: McpServer, client: ToolJetClient): void {
  const tools: ToolDef[] = [
    createAppTool(client),
    listDatasourcesTool(client),
    listTablesTool(client),
    createTableTool(client),
    getTableSchemaTool(client),
    insertRowsTool(client),
    getComponentCatalogTool(client),
    getAppTool(client),
    addPageTool(client),
    addQueryTool(client),
    addQueriesTool(client),
    addComponentTool(client),
    addComponentsTool(client),
  ];

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      (args: any) => tool.handler(args) as any
    );
  }
}
