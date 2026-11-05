# ToolJet App Builder

Build data-connected dashboards, internal tools, and back-office applications in ToolJet Cloud, then refine them in the visual editor. This plugin includes the app-builder skill and connects to ToolJet's hosted MCP server using OAuth. It acts with your approved workspace permissions.

## Set up

Install **ToolJet App Builder** from the Claude directory. In Claude Code, you can also use the ToolJet marketplace:

```text
/plugin marketplace add ToolJet/tooljet-mcp
/plugin install tooljet-app-builder@tooljet
```

Connect ToolJet when Claude prompts you. In Claude Code, open `/mcp`, select the plugin's ToolJet server, and authenticate. The browser opens ToolJet login and workspace selection. Review the account, workspace, and requested permissions before approving. No personal access token, shell environment variable, or local Node.js installation is needed. If migrating from the local plugin, reconnect through OAuth; existing PAT settings are not reused.

This package requires a ToolJet Cloud account. For self-hosted ToolJet, use the standalone MCP setup in the [repository documentation](https://github.com/ToolJet/tooljet-mcp#readme) with the separate **ToolJet App Builder Skills** package. Do not enable multiple ToolJet connections for the same task unless you explicitly need them.

## Use and data access

Ask Claude to build or update a ToolJet application, or invoke `/tooljet-app-builder:tooljet-app-builder` in Claude Code. Confirm the target workspace and review destructive changes. The connection can read and modify apps, queries, data, workflows, and workspace users, subject to your approved scopes and current ToolJet permissions. Data returned by tools is available to Claude in your conversation.

MCP requests go to `https://mcp-oauth.tooljet.com/mcp`; authentication uses ToolJet at `https://app.tooljet.ai/api/mcp-oauth`. OAuth credentials are managed by Claude's connection flow. The plugin contains no credential reader, local server, install hook, or dependency download. The shared skill includes an optional readable browser audit script that Claude can use to inspect an app you ask it to verify; it is not run at installation or startup.

Each connection is bound to one workspace. To change workspaces, disconnect and authorize again. Revoke access in ToolJet's **Profile settings → Connected AI clients** for that workspace.

[Privacy policy](https://tooljet.com/privacy).

## Package and support

This package contains the shared skill and references, the remote MCP declaration, a ToolJet icon, and the license. Tool execution and runtime catalogs are provided by the hosted server. Source and issues: [ToolJet MCP](https://github.com/ToolJet/tooljet-mcp). Connection details: [OAuth documentation](https://github.com/ToolJet/tooljet-mcp/blob/main/docs/oauth.md).
