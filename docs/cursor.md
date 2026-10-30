# ToolJet for Cursor

Build and edit ToolJet dashboards, internal tools and business applications with
Cursor and your own ToolJet MCP connection. This portable Agent Plugin contains
the same maintained app-builder skill as ToolJet's other integrations, including
planning, query/component guidance, permission boundaries and verification.

## Install the skill

This package is being prepared for Cursor marketplace review. It is not listed or
endorsed by Cursor. From a ToolJet MCP source checkout:

```sh
npm run build:cursor-plugin
```

The output is `plugins/tooljet-cursor/`. It is generated and ignored by source Git;
never edit or commit its copied skill. A maintainer can preview it with Cursor CLI:

```sh
cursor-agent --plugin-dir /absolute/path/to/tooljet-mcp/plugins/tooljet-cursor \
  --workspace /absolute/path/to/a/dedicated-test-project
```

Check `cursor-agent --version` first: another product can own the `agent` command.
Use Cursor's executable and its documented install instructions. Run outside the
MCP source checkout so its separate PAT configuration cannot shadow Cloud OAuth.

For an IDE local preview, copy the built directory into
`~/.cursor/plugins/local/tooljet` and reload Cursor. Review an existing directory
before replacing it. Cursor's local-plugin policies may restrict this on Enterprise.
Do not add a symlink outside that local directory; Cursor rejects it. CLI preview
does not by itself prove IDE marketplace installation.

For public release, use a reviewed distribution with `plugin.json` at its root and
record its immutable commit. Do not submit the MCP source repository root: it
describes a different local-server package, and the Cursor build directory is
ignored. Verify how Cursor's intake will select that distribution/ref before
submitting; its form currently asks for a public GitHub repository URL.

Cursor's current form starts with publisher onboarding: organization name/handle,
contact, logotype URL, description, repository and website. The account owner must
review the publisher identity and Publisher Terms before the final submission.
Source review does not accept those terms or submit an application.

## Connect your ToolJet Cloud workspace

The plugin supplies guidance. Add the actual MCP connection through Cursor's native
MCP configuration, then authorize it through OAuth. It ships no server runtime,
install hook, PAT fallback, credential helper or broken workspace URL placeholder.

1. Open the intended Cloud workspace. Copy its UUID from
   `https://app.tooljet.ai/<workspace-id>`. Start with a dedicated test workspace.
2. In your test project's `.cursor/mcp.json`, add the following server, replacing
   `YOUR-WORKSPACE-UUID` before saving. Merge with existing settings; do not replace
   other servers or commit credentials.

   ```json
   {
     "mcpServers": {
       "tooljet": {
         "url": "https://mcp-oauth.tooljet.com/mcp/YOUR-WORKSPACE-UUID"
       }
     }
   }
   ```

3. In Cursor, enable only this intended connection. For CLI setup, use
   `cursor-agent mcp enable tooljet` and `cursor-agent mcp login tooljet`.
4. Review the ToolJet browser consent: selected workspace, callback destination and
   requested permissions. Approve personally. Cursor manages OAuth credentials;
   do not paste tokens into chat or add authorization headers to the plugin.
5. `cursor-agent mcp list-tools tooljet` verifies discovery. Ask Cursor to check the
   MCP runtime and active workspace before changing an app. If `restart_required`
   is true, reload the client before continuing.

ToolJet's Cloud OAuth service currently requests app, data, workflow and
workspace-user scopes. Operations remain limited by the user's workspace
permissions. Disconnect through ToolJet profile settings → Connected AI clients.
These instructions do not establish self-hosted OAuth compatibility. Existing
self-hosted MCP connections keep their separately approved setup.

## Useful starting prompts

- "Build a private support-queue dashboard in ToolJet using synthetic tickets,
  with search and status filters. Validate it and show me the saved app."
- "Plan how to turn our spreadsheet approval tracker into a shared ToolJet app.
  Explain the data model and authorization rules before importing anything."
- "Inspect this ToolJet operations app and add a summary for outstanding requests.
  Preserve its permissions and existing queries; verify the saved change."

Review SQL, custom code, external data access and production authorization before
deployment. The skill does not make an app public or grant access to its data.

## QA and release status

On 29 October 2026, native Cursor CLI 2026.10.22-27dcf5f loaded the generated skill
from its package and discovered 72 tools through Cloud OAuth. A bounded live test
confirmed the selected private workspace and fresh runtime, changed only one
existing Text property, read the exact value back and passed structural validation
with no errors or warnings. Independent remote OAuth readback and browser rendering
also passed. A restarted native client read the saved app text more than ten
minutes after the first authenticated discovery, without another sign-in. This
is behavioral reconnection evidence; token stores and refresh HTTP traffic were
not inspected. This is an editing test, not a full app-generation benchmark. IDE
marketplace installation and a published distribution remain untested; other
clients' successes are not Cursor evidence.

The source builder shares packaging code with the Copilot target. CI builds both
as ignored artifacts. A public marketplace submission and acceptance are separate
from source approval. Nothing in the build command submits or publishes a listing.

Support: https://github.com/ToolJet/tooljet-mcp/issues

## Primary references

- https://cursor.com/docs/reference/plugins
- https://cursor.com/docs/cli/mcp
- https://cursor.com/marketplace/publish

## License

ISC; see LICENSE. Cursor and ToolJet account/service terms remain separate.
