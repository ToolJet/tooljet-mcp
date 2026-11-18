# ToolJet App Builder

Build data-connected dashboards, internal tools, and back-office applications in ToolJet, then refine them in the visual editor. This plugin includes the app-builder skill and a local MCP server. It uses your personal access token and respects the permissions of its workspace. Node.js 20 or newer must already be installed; the plugin does not download or install dependencies.

## Set up

```text
/plugin install tooljet-app-builder --marketplace ToolJet/tooljet-mcp
```

Install `tooljet-app-builder@tooljet` from the ToolJet marketplace in Claude Code. In Claude's plugin configuration dialog, enter your ToolJet deployment URL and a personal access token created in **Settings → Access tokens** in the intended workspace. Enter the token only in the masked configuration field, never in a conversation. Claude stores sensitive configuration in its secure credential store.

Leave the optional API URL blank when the frontend and API share an origin. For a split-origin deployment, enter the API URL explicitly. The token is sent to that API URL, or to the deployment URL when no API URL is configured. Use HTTPS for remote deployments. Local HTTP instances remain supported.

To change these settings in Claude Code, run `/plugin configure tooljet-app-builder@tooljet`, then reload the plugin. The noninteractive shell install command does not open a configuration dialog; finish configuration in the interactive plugin interface. Existing environment-variable settings are not used by this package.

## Use

Ask Claude to build or update a ToolJet application, or invoke `/tooljet-app-builder:tooljet-app-builder`. The skill loads the relevant references as needed. Review the workspace and proposed changes before making destructive edits. The MCP server supports catalog discovery, app structure, queries, components, layouts, events, permissions, and workflows subject to the ToolJet instance's capabilities.

The local server runs in Claude Code and supported Cowork hosts. It cannot run in claude.ai chat. For ToolJet Cloud OAuth, connect the hosted ToolJet MCP server through Claude's connector settings and use the separate **ToolJet App Builder Skills** package. That mode uses ToolJet login and consent rather than this package's PAT. Do not enable both connections for the same task.

## Data access

The local MCP server sends tool requests and the configured PAT to your explicitly configured ToolJet API. The PAT is exchanged for a session in its workspace; tools use that session and your existing permissions. Tool results are available to Claude in the conversation. No hosted ToolJet OAuth MCP endpoint is required. Revoke the token from your ToolJet workspace to remove access. The shared skill includes a readable browser audit helper for inspecting apps you ask Claude to verify; it does not run at installation or startup. [Privacy policy](https://tooljet.com/privacy).

## Package

This is a Claude plugin, not a Desktop MCPB extension. It ships readable JavaScript modules, runtime catalogs, the shared skill, an icon, and license notices. There are no install hooks, lockfiles, credential files, or dependency downloads. Repository development instructions are intentionally outside this installable folder. The plugin's package version is independent of the embedded MCP server version.

Source and issues: [ToolJet MCP](https://github.com/ToolJet/tooljet-mcp). Hosted OAuth setup: [OAuth documentation](https://github.com/ToolJet/tooljet-mcp/blob/main/docs/oauth.md).
