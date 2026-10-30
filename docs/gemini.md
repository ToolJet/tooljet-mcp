# ToolJet for Gemini CLI

Build and edit private dashboards, internal tools and business applications with
Gemini CLI and ToolJet Cloud OAuth. The extension packages the maintained
`tooljet-app-builder` skill and its references, rather than a second skill source.

## Build and install locally

This is a source preparation, not a published gallery listing. From this checkout:

```sh
npm run build:gemini-extension
gemini extensions install /absolute/path/to/tooljet-mcp/plugins/tooljet-gemini
```

Review the native install confirmation. Restart Gemini after installing. The
generated directory is ignored by Git: edit the shared skill generator/references
and rebuild, never edit or commit its copied skill. The extension has no hooks,
server runtime, credentials, tool auto-approval policies or automatic publishing.

## Connect a Cloud workspace through OAuth

The extension supplies guidance; the native client manages the connection.

1. Open the intended workspace at `https://app.tooljet.ai/<workspace-id>` and copy
   its UUID. Start in a dedicated test workspace.
2. In a separate project, merge this configuration into `.gemini/settings.json`,
   replacing `YOUR-WORKSPACE-UUID` with that UUID before saving. Do not run inside
   the MCP source checkout, whose local-server setup serves a different purpose.

   ```json
   {
     "mcpServers": {
       "tooljet": {
         "httpUrl": "https://mcp-oauth.tooljet.com/mcp/YOUR-WORKSPACE-UUID",
         "oauth": { "enabled": true }
       }
     }
   }
   ```

3. Start Gemini CLI and run `/mcp auth tooljet` if prompted for authentication.
   Review the ToolJet browser consent and personally approve the intended
   workspace and permissions. Do not paste tokens into the terminal or chat.
4. Use `/mcp list` to check discovery and `/skills list` to check the app-builder
   skill. Ask Gemini to check the MCP runtime and active workspace before writes;
   restart if the runtime reports `restart_required`.

ToolJet's Cloud service currently requests app, data, workflow and workspace-user
scopes. Your workspace permissions still apply. Disconnect through ToolJet profile
settings → Connected AI clients. This guide does not establish self-hosted OAuth
support. Sign-in to Gemini itself is separate from approving ToolJet access.

## Starting prompts

- "Build a private ToolJet support dashboard with synthetic tickets and filters.
  Plan the app, validate it and verify the saved result."
- "Plan how to turn a spreadsheet request tracker into a shared ToolJet app.
  Explain the data model and permissions before importing any data."
- "Inspect this ToolJet back-office app and add a summary of outstanding work.
  Preserve existing queries and permissions and verify the change."

## Public distribution and gallery

Gemini requires `gemini-extension.json` at the root of the public repository or
release archive. This source checkout's ignored build directory is not a public
distribution. Publish only a reviewed generated artifact with an immutable source
commit, then verify installation from its public URL. The official gallery crawls
public repositories with the `gemini-cli-extension` topic daily; listing depends
on validation. Adding a topic to the unprepared MCP source root is insufficient.
Source approval does not create a repository, add topics or publish a release.

## Verification status

On 29 October 2026, Gemini CLI 0.66.0 installed the generated v0.11.0 extension
in an isolated profile and discovered the enabled `tooljet-app-builder` skill.
Its native MCP command reached the Cloud endpoint and reported authentication
required. Gemini account sign-in, ToolJet consent, live app editing and
reconnection remain pending; another client's OAuth success does not verify them.

Support: https://github.com/ToolJet/tooljet-mcp/issues

## Primary references

- https://geminicli.com/docs/extensions/reference/
- https://geminicli.com/docs/extensions/releasing/
- https://geminicli.com/docs/tools/mcp-server/

ISC; see LICENSE. Gemini and ToolJet account/service terms remain separate.
