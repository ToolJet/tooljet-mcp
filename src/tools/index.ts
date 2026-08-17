import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolJetClient } from '../tooljetClient.js';
import type { ToolDef } from './types.js';
import { createAppTool } from './createApp.js';
import { listDatasourcesTool } from './listDatasources.js';
import { getComponentCatalogTool } from './getComponentCatalog.js';
import { getAppTool } from './getApp.js';
import { addQueryTool } from './addQuery.js';
import { addComponentTool } from './addComponent.js';

export function registerTools(server: McpServer, client: ToolJetClient): void {
  const tools: ToolDef[] = [
    createAppTool(client),
    listDatasourcesTool(client),
    getComponentCatalogTool(client),
    getAppTool(client),
    addQueryTool(client),
    addComponentTool(client),
  ];

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      (args: any) => tool.handler(args) as any
    );
  }
}
