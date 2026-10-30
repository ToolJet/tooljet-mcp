# ToolJet for Grok Build

Build and edit ToolJet apps through Grok Build using ToolJet's hosted MCP service and
the same app-builder guidance maintained in this repository. The Cloud package uses
native Streamable HTTP and OAuth; it contains no PAT, local MCP runtime, install hook,
or credential-handling helper.

## Connect your ToolJet Cloud workspace

1. Open the intended ToolJet workspace. Copy the UUID from its URL:
   `https://app.tooljet.ai/<workspace-id>`. Use a dedicated test workspace first.
2. Before launching Grok Build, set that non-secret workspace ID in the terminal:

   ```sh
   export TOOLJET_WORKSPACE_ID='YOUR-WORKSPACE-UUID'
   ```

   Keep this value available in each terminal used to launch Grok. It is a workspace
   selector, not a password or token. Do not paste a PAT into it.
3. Install the reviewed package from its published, pinned source. Until a marketplace
   listing is approved, a maintainer can build and test the local package:

   ```sh
   npm run build:grok-plugin
   grok plugin validate ./plugins/tooljet-grok
   grok plugin install ./plugins/tooljet-grok --trust
   grok plugin enable tooljet
   ```

   `--trust` allows this package's skill and MCP connection to load. Review its manifest
   and source first. The explicit enable step is required for the installed plugin
   to participate in discovery. Launch Grok outside this source checkout so the repository's
   separate PAT-based `.mcp.json` cannot shadow the Cloud connection.
4. In Grok, open `/mcps`, select the ToolJet plugin's server and authenticate with `i`.
   Sign in to ToolJet and review the selected workspace and requested permissions.
   Complete the access grant yourself. Grok manages its OAuth credentials; neither the
   plugin nor the model needs to see them.
5. Ask Grok to inspect the connected workspace before creating anything:
   "Use ToolJet to confirm the connected workspace and report the MCP runtime version."

ToolJet's endpoint is `https://mcp-oauth.tooljet.com/mcp/<workspace-id>`. Do not use
`mcp.tooljet.com` for this Cloud OAuth connection, add an Authorization header, or
configure a second PAT connection as an automatic fallback. Native Grok URL interpolation
fills `${TOOLJET_WORKSPACE_ID}` from the environment.

The approval is limited by the ToolJet user's current workspace permissions. Discovery
currently advertises app, data, workflow and workspace-user scopes; these do not give a
builder administrator permissions. You can disconnect the grant under ToolJet profile
settings → Connected AI clients. For self-hosted/PAT setup, use the repository's separate
standard MCP configuration rather than changing this Cloud plugin's authentication.

## Useful starting prompts

- "Build a shared support-ticket dashboard in ToolJet using synthetic data. Include a
  searchable table and status filters; keep it private while we review it."
- "Help turn our spreadsheet-based request tracker into a ToolJet internal app. First
  propose the data model, import approach and employee/manager access rules."
- "Build an operations approval tool in ToolJet. Plan the pages and workflow before
  changing anything, and ask before connecting real data or executing the workflow."

Use approved data sources only. Review permissions, SQL and custom code before a real
deployment. The plugin does not make an app public, migrate a spreadsheet automatically,
or promise authorization correctness from a visual preview.

## Maintainer and reviewer checks

Build with `npm run build:grok-plugin`; this copies the canonical skill rather than
maintaining a separate Grok-specific app-building prompt. Run
`node --test tests/grokPackage.test.mjs` and the native validator above.

Before claiming live compatibility, verify Grok Build's own OAuth login, tool discovery,
app read/write/readback, reconnect and automatic token renewal. A Codex OAuth success
does not establish Grok compatibility. Use synthetic data in a private QA app; do not
send credentials or real customer data in the submission. Record the Grok version and
limits of the checks. Never relax ToolJet's resource/client checks to pass a client test.

For marketplace publication, add one remote-source entry in `xai-org/plugin-marketplace`,
point to this repository's `plugins/tooljet-grok` directory, pin a public full commit SHA,
and generate the component index with xAI's scripts. Use brand-specific keywords and
ToolJet-owned domains. Do not submit placeholder SHAs or claim completed OAuth tests.

Support: https://github.com/ToolJet/tooljet-mcp/issues

## License

ISC; see the included LICENSE. Grok Build and ToolJet account/service terms remain separate.
