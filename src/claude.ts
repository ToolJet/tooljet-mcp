#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildConfiguredServer, buildUnconfiguredServer } from './server.js';
import { claudePluginConfig } from './claudeConfig.js';

// A local plugin is always stdio. HTTP/OAuth/gateway deployment remains in index.ts.
// These three variables are explicitly supplied by Claude's manifest userConfig mapping.
let server;
try {
  server = buildConfiguredServer(claudePluginConfig({
    TOOLJET_CLAUDE_PAT: process.env.TOOLJET_CLAUDE_PAT,
    TOOLJET_CLAUDE_DEPLOYMENT_URL: process.env.TOOLJET_CLAUDE_DEPLOYMENT_URL,
    TOOLJET_CLAUDE_API_URL: process.env.TOOLJET_CLAUDE_API_URL,
  }));
} catch (error) {
  server = buildUnconfiguredServer(error instanceof Error ? error.message : 'Invalid plugin configuration.');
}
await server.connect(new StdioServerTransport());
