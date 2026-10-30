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

## Live compatibility check — 29 October 2026

Grok Build 1.0.60 stable was tested with the installed package in an isolated Grok
profile against a dedicated private ToolJet Cloud workspace. Native OAuth login and
workspace discovery succeeded. Grok inspected an existing synthetic QA app, changed
one Text component, read the exact value back, and passed structural validation with
no errors or warnings. A separate browser check confirmed the saved text and working
table search and sorting. This was a bounded edit, not a full new-app generation test.

After the original access token's documented ten-minute maximum lifetime, a fresh
native Grok diagnostic completed the authenticated handshake and discovered 72 tools.
A restarted Grok session then read the saved app text successfully without another
login. This is behavioral evidence of renewal and reconnect, not a wire-level token
endpoint trace or a long-running soak test. No PAT fallback or credential transfer was
used, and no OAuth credential store was inspected.

## Maintainer and reviewer checks

`plugins/tooljet-grok/` is a generated, self-contained distribution, not another skill
source. Do not edit its skill files or README directly. Maintain the shared generator,
references and browser-audit source used by `scripts/generate-skill.mjs`, and edit this
setup guide here. Run `npm run build:grok-plugin` to regenerate the canonical skill and
then package it for Grok. This build directory is ignored by Git. It is uploaded as
a CI artifact for review; the generated skill and README are not committed to the
source branch.

CI builds a fresh Grok distribution from the shared source and runs its package tests.
There is no separately committed Grok skill to synchronize. Existing shared generated
files remain protected by the repository's normal generation checks. Run
`node --test tests/grokPackage.test.mjs` and the native validator above.

Before claiming live compatibility, verify Grok Build's own OAuth login, tool discovery,
app read/write/readback, reconnect and automatic token renewal. A Codex OAuth success
does not establish Grok compatibility. Use synthetic data in a private QA app; do not
send credentials or real customer data in the submission. Record the Grok version and
limits of the checks. Never relax ToolJet's resource/client checks to pass a client test.

## Publish the distribution

After reviewing and merging the source, a maintainer manually runs **Publish Grok
plugin distribution** from `main` in GitHub Actions. It builds and tests the package,
then commits only the installable files at the root of `codex/grok-plugin-dist` in this
repository. Updates append commits; the workflow does not force-push. It never runs
on pull requests or automatically publishes when source changes.

The workflow summary reports the source commit and full distribution commit. Add one
remote-source entry in `xai-org/plugin-marketplace` using this repository's URL and that
distribution commit as `source.sha`. Omit `source.path`: the plugin is at the root of
the distribution commit. Generate the component index with xAI's scripts. Use
brand-specific keywords and ToolJet-owned domains. Do not submit a source-branch SHA,
placeholder pin or CI artifact URL; the catalog installs public Git commits.

Publishing a distribution does not submit the xAI marketplace PR. The publisher must
review the resulting package and separately approve that submission.

Support: https://github.com/ToolJet/tooljet-mcp/issues

## License

ISC; see the included LICENSE. Grok Build and ToolJet account/service terms remain separate.
