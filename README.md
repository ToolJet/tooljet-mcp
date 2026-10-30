# tooljet-mcp

An MCP server that lets a coding agent (Codex, Claude Code, …) build and maintain **ToolJet** apps through ToolJet's governed APIs: workspaces, apps/pages, datasource queries, ToolJet DB tables, components, layouts, and lifecycle events. It includes generated component and datasource catalogs so agents use first-party contracts instead of guessing configuration keys.

## Browser OAuth connections

For remote HTTP clients, [OAuth setup](docs/oauth.md) connects through the workspace's ToolJet login and consent flow without copying a PAT. OAuth is Cloud-only in this release and requires the companion ToolJet Cloud backend with `MCP_OAUTH_ENABLED=true` and all five OAuth migrations. Existing local PAT plugins remain supported; the prerequisites below describe that local setup.

## Gemini CLI and Kiro

Build a [Gemini CLI extension](#tooljet-for-gemini-cli) or [Kiro power](#tooljet-for-kiro)
from the same maintained skill, then configure a native Cloud OAuth connection.
Generated packages are ignored build artifacts; local installation does not
establish public gallery availability or successful live OAuth/app editing.

## Prerequisites

- A ToolJet instance with personal access token support.
- A personal access token for the target ToolJet workspace.
- Node.js 20 or newer.

## Setup

```bash
git clone https://github.com/ToolJet/tooljet-mcp.git
cd tooljet-mcp
cp .env.example .env        # then edit .env with your creds
npm install
npm run build               # compiles to dist/
```

`.env`:
```
TOOLJET_URL=http://localhost:3000        # your ToolJet deployment
TOOLJET_PAT=tj_pat_...                   # Settings -> Access tokens, in the target workspace
# Only needed if the UI is served from a different origin than TOOLJET_URL (defaults to it otherwise):
# TOOLJET_DEPLOYMENT_URL=http://localhost:8082
```

The default MCP profile keeps tool selection compact by exposing batch create tools only; every batch accepts a single item. Older clients can restore the redundant singular aliases with `TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS=true`.

## Install as a Codex plugin

This repo is a self-contained **Codex plugin** that registers the bundled MCP server and the
`tooljet-app-builder` skill together. The Codex manifest is `.codex-plugin/plugin.json`, and
`.mcp.json` launches `bundle/index.js` without requiring an install or build on the user's side.

No public listing is needed: `.agents/plugins/marketplace.json` makes the repo its own marketplace.

```bash
codex plugin marketplace add ToolJet/tooljet-mcp --ref main
codex plugin add tooljet-app-builder@tooljet
```

On Codex desktop, run the marketplace command, restart the app, open Plugins, select the ToolJet
source and install **ToolJet App Builder**. In Codex CLI you can also install it from `/plugins`.

Before launching Codex, provide the same credentials used by the standalone MCP server:

```bash
export TOOLJET_DEPLOYMENT_URL="https://your-instance.tooljet.com"
export TOOLJET_PAT="tj_pat_..."
# only needed if the API lives on a different origin than TOOLJET_DEPLOYMENT_URL above:
# export TOOLJET_URL="https://api.your-instance.tooljet.com"
```

The plugin passes these environment variables to the MCP process; it does not store or change the
credential. Node 20 or newer must be available to Codex.

### Manual Codex registration

Codex reads MCP servers from `~/.codex/config.toml`. Add:

```toml
[mcp_servers.tooljet]
command = "node"
args = ["/absolute/path/to/tooljet-mcp/bundle/index.js"]

[mcp_servers.tooljet.env]
TOOLJET_DEPLOYMENT_URL = "https://your-instance.tooljet.com"
TOOLJET_PAT = "tj_pat_..."
# only if the API lives on a different origin than TOOLJET_DEPLOYMENT_URL above:
# TOOLJET_URL = "https://api.your-instance.tooljet.com"
```

Then install the skill so Codex knows how to drive the tools: copy the complete `skill/` directory into your Codex skills directory (or use `npm run sync:skill`). Its compact entry point progressively loads focused references for tables, forms, events, datasources, security, and QA.

Restart Codex; it should expose the ToolJet tools, including `create_app`, `list_datasources`, `get_datasource_query_schema`, `get_component_catalog`, `lint_app_spec`, the batch authoring tools, and `validate_app`.

## Run over Streamable HTTP

Two HTTP shapes, for two different jobs. Both authenticate the same way stdio does; what changes is
where the credential comes from.

**Direct mode** is you running the server and your own agent connecting to it. The shipped bundle
does this, so it needs nothing beyond Node:

```bash
MCP_TRANSPORT=http PORT=8787 TOOLJET_DEPLOYMENT_URL=https://your-instance.tooljet.com TOOLJET_PAT=tj_pat_... \
  node bundle/index.js
```

It binds `127.0.0.1` (override with `MCP_HTTP_HOST`) and serves `http://127.0.0.1:8787/mcp`. The
credential may come from either side:

- `TOOLJET_PAT` in the server's environment, or
- per request from the client, as `Authorization: Bearer <pat>` or `x-tooljet-pat: <pat>`

A per-request token replaces the process one outright rather than merging with it, so one server can
serve several people without any of them inheriting another's identity.

**Gateway mode** is one shared server fronting an instance, called only by ToolJet's AI shim. Set
`MCP_SHARED_TOKEN`: the server then binds `0.0.0.0`, requires that token as `Authorization: Bearer`,
and takes the acting user from `x-tooljet-session` plus `x-tooljet-workspace-id`. It rejects
`x-tooljet-pat` outright: a PAT names its owner and lives for weeks, so honouring one here would
attribute a build to a token holder rather than to the person who asked for it.

There is also `npm run start:http` (`src/http.ts`, port 3001, loopback, `TOOLJET_MCP_HTTP_HOST` /
`TOOLJET_MCP_HTTP_PORT`, plus a `/health` endpoint) for local development. It accepts the same
per-request credentials and, like direct mode, has no bearer gate of its own.

The local stateful transport binds identity at initialization. Send the same bearer and acting-user
headers on every POST, GET/SSE and DELETE; the session ID alone does not authenticate an authenticated
session. Build-token revocation/expiry ends access. It retains at most 256 sessions, evicts sessions
after 30 idle minutes or six hours total, and sweeps expired/revoked sessions every minute. These
limits are configurable through createHttpMcpServer options. Credential-free local sessions retain
the process-configured identity: keep this development transport on loopback, not a public endpoint.

Build-token minting is an impersonation authority for the trusted ToolJet backend, not an end-user
API. Keep MCP_BUILD_TOKEN_SECRET server-side. TOOLJET_MCP_TOKEN remains a compatibility fallback
for that minting secret; setting either enables the mint/revoke endpoint. Do not give the minting
secret to a sandbox/client; give it only the short-lived build token issued for the intended user.

### Render-audit boundary

verify_page_render uses an optional Playwright 1.48+ installation and Chrome on the MCP host.
It creates a fresh, unauthenticated context: private apps may need manual authenticated browser QA.
It does not load a stored viewer session, publish an app, or treat a sign-in/empty/error page as a pass.
Findings retain kind "unreachable" with a reason distinguishing missing browser, authentication,
network policy, HTTP errors and missing widgets.

The configured ToolJet viewer origin is trusted, including an explicitly configured localhost or
private/self-hosted address. Alternate viewer/API/CDN origins require the operator-controlled
MCP_RENDER_AUDIT_ALLOWED_ORIGINS comma-separated list. A tool argument cannot extend it.
All HTTP(S) resources use the same allowlist; HTTP redirects are not followed (configure canonical
URLs), service workers are blocked, and WebSocket dependencies are reported as unverified.
Use a dedicated browser container with infrastructure egress restrictions as defense in depth:
application-level URL checks are not a substitute for network isolation or DNS-rebinding protection.

## Install as a Copilot / VS Code agent plugin

`plugin.json` and `mcp.json` at the repo root follow the [Agent Plugins 1.0](https://agent-plugins.org)
format, which VS Code, Copilot CLI and the Copilot app share. Install with **Chat: Install Plugin
From Source** (or the Plugins tab of the Agent Customizations editor) and give it this repo's URL.

Skills are discovered from `skills/`, so the same `skills/tooljet-app-builder` that Claude Code loads
is picked up here with no second copy. Set `TOOLJET_DEPLOYMENT_URL` and `TOOLJET_PAT` in the
environment the editor launches from (`TOOLJET_URL` too, only if the API is on a different origin
than `TOOLJET_DEPLOYMENT_URL`); unset or blank values fall back to the server's own defaults, and a
missing token is reported at handshake rather than killing the server.

## Skill-only plugin for remote MCP connections

Use `tooljet-app-builder-skills` when ToolJet is already connected through remote
MCP/OAuth. It supplies the same app-builder skill, focused references, and browser audit
helper as the combined plugin. Component contracts come from the connected MCP's
`get_component_catalog` tool; generated offline catalog JSON is excluded. It registers no MCP
server, requests no credentials, and does not start a second PAT connection.

In Claude Code, add the marketplace and install the skill-only entry:

```text
/plugin marketplace add ToolJet/tooljet-mcp
/plugin install tooljet-app-builder-skills@tooljet
```

Connect and authenticate the remote ToolJet MCP server separately. The skill uses
the connection's exposed tool names, so the server does not need to be named
`tooljet`. Use either this package or the combined `tooljet-app-builder` plugin in
a session to avoid loading duplicate guidance. The Codex marketplace also exposes
`tooljet-app-builder-skills` with its own skill-only manifest.

Build the self-contained directory from the repository root:

```bash
npm run build:skill-plugin
claude plugin validate ./plugins/tooljet-app-builder-skills
claude --plugin-dir ./plugins/tooljet-app-builder-skills
```

The command regenerates the skill and references before packaging them in
`plugins/tooljet-app-builder-skills/`. No server bundle, running ToolJet instance,
TypeScript build, or credentials are needed to build it. Generated skill files are committed for installation
from Git; edit `scripts/generate-skill.mjs` or its referenced sources, then rebuild.
Package metadata comes from `scripts/build-skill-plugin.mjs` and `package.json`.

## Install as a Claude Code plugin

This repo is also a **self-contained Claude Code plugin** — installing it registers the MCP server *and* the `tooljet-app-builder` skill together. No `npm install`/build on the user's side: the entry (`bundle/index.js`), its readable ESM dependency chunks, and the runtime catalogs in `data/` are committed. Claude Code may still run its automatic lockfile install because the repository root contains `package.json` and `package-lock.json`; that separate directory review requirement remains.

**Install (no marketplace needed):**
```
/plugin install github:ToolJet/tooljet-mcp
```
Or via the marketplace, which lets you get updates:
```
/plugin marketplace add ToolJet/tooljet-mcp
/plugin install tooljet-app-builder@tooljet
```
For local development you can also install from a path: `/plugin install path:/absolute/path/to/tooljet-mcp`.

**Provide credentials.** A plugin cannot prompt for secrets, so the MCP server reads them from your environment (`TOOLJET_DEPLOYMENT_URL` defaults to localhost; `TOOLJET_URL` defaults to `TOOLJET_DEPLOYMENT_URL`). Before launching Claude Code:
```bash
export TOOLJET_DEPLOYMENT_URL="https://your-instance.tooljet.com"
export TOOLJET_PAT="tj_pat_..."
# only needed if the API lives on a different origin than TOOLJET_DEPLOYMENT_URL above:
# export TOOLJET_URL="https://api.your-instance.tooljet.com"
```
If `TOOLJET_DEPLOYMENT_URL` and `TOOLJET_PAT` are missing, the server exits during startup with a clear required-variable error. Set them and restart.

**What ships / how it's built.** `bundle/index.js` loads content-hashed ESM chunks with all runtime dependencies included, so it runs with no `node_modules`. The build uses esbuild module boundaries and Rollup to keep readable files below 256 KiB. Babel is built from the pinned package's published source modules; see `scripts/vendor/README.md`. Component and datasource catalogs use small index files plus standalone JSON parts in `data/`; their public MCP resource payloads and hashes are unchanged. `npm run check:plugin-package` enforces file sizes, file count, and the absence of packed artifacts. These packaging checks do not replace Anthropic's security review. When deploying or uploading the runtime, copy the entire `bundle/` and `data/` directories, preserving their subdirectories. Direct catalog-file readers should use `lib/catalogFiles.js` or the MCP catalog resources instead of treating the catalog index as the complete schema. `generate:skill` writes both `skill/` and the packaged `skills/tooljet-app-builder/` from the same source, including every focused reference. Rebuild all of that after a source or catalog change with:
```bash
npm run generate:catalogs && npm run generate:skill && npm run build:plugin
```
The plugin manifest is `.claude-plugin/plugin.json` (declares the MCP server via `${CLAUDE_PLUGIN_ROOT}/bundle/index.js`); the marketplace catalog is `.claude-plugin/marketplace.json`.

For skill-only changes, run `npm run generate:skill && npm run build:plugin`; no sibling checkout,
MCP server, Python MCP package, or credentials are needed. Generation uses the pinned grid/widget
snapshot in `data/skill-source-snapshot.json`. Refresh upstream facts explicitly with
`TOOLJET_ROOT=/path/to/ToolJet node scripts/generate-skill.mjs --refresh-source-snapshot`, review the
snapshot diff, then regenerate/package. Generated Markdown identifies its source; edit that source,
not the generated copy. Offline catalogs in both skill packages include full defaults, renderingHints
and defaultChildren and are rebuilt during generation, tests and plugin packaging. CI regenerates
Markdown, checks for drift, runs tests, builds the bundle and probes MCP initialization.

## Demo

In Codex:

> **Build me a tickets dashboard on my ToolJet DB.**

Codex should: `list_datasources` → `create_app` → `lint_app_spec` → `apply_app_phase`, using `add_queries`/`add_components` for later targeted additions. `create_app` returns an editor link for following the build and a viewer link for testing the completed page.

## Tools

| Tool | Purpose |
|---|---|
| `list_workspaces()` / `use_workspace(workspace_id)` | Inspect or switch the active ToolJet workspace; results include its manual datasource-settings URL |
| `manage_app_permissions(...)` | List eligible users/groups and inspect, restrict, or clear page/query/component access; mutations are confirmed and license-gated |
| `list_workspace_apps(...)` | List apps in the workspace pinned to the current PAT |
| `list_workspace_users(...)` | List/search workspace users with pagination and status filtering through PAT auth |
| `list_workspace_groups(...)` | List groups/members; read permission switches and granular rules with `include_permissions:true`; discover selectable resources with `resource_type` |
| `manage_workspace_groups(...)` | Create/rename/delete/duplicate groups, remove members, update permission switches, and create/update/delete granular access; requires confirmation and ToolJet admin permissions |
| `manage_workspace_users(...)` | Invite/update/archive workspace users through PAT auth; mutations require confirmation and remain subject to ToolJet role checks |
| `create_app(name)` | New app + version + Home page → ids, explicit editor/viewer links, and the workspace datasource-settings URL (`app_url` remains an editor alias) |
| `create_app_version(app_id, version_name, version_from_id, version_description?)` | Clone an existing version into a new draft and return its new `version_id` for continued editing |
| `switch_app_version(app_id, version_id)` | Validate an exact app version and return metadata the ToolJet editor can use to select it |
| `release_app(app_id, version_id, confirm:true)` | Publish and promote a specific version to production when needed, make it the live released version, and verify the change by reading the app back |
| `list_datasources(version_id)` | Workspace sources available automatically to new/existing apps, each with a direct settings URL; no per-app linking |
| `get_datasource_query_schema({datasource_id, version_id, operation?, sections?})` | Fetch compact request contracts plus response shape/status when known; also supports kind lookup and batches |
| `inspect_datasource_schema({datasource_id, version_id, method, ...})` | Invoke one plugin-advertised read-only metadata method (schemas/tables/columns/collections) |
| `list_tables()` / `get_table_schema(table_name)` | Inspect ToolJet DB tables, constraints, defaults, and relationships |
| `create_tables(...)` / `add_table_column(...)` | Create one or more ToolJet DB tables or evolve an existing model; the batch preflights dependencies before writes |
| `insert_rows_batch(...)` | Insert-only seed writes for one or several ToolJet DB tables; generated serial keys use the real sequence and conflicts fail loudly |
| `drop_table_column(..., confirm:true)` / `drop_table(..., confirm:true)` | Explicitly confirmed destructive ToolJet DB cleanup |
| `get_component_catalog({type?, types?, sections?, ...})` | Component palette or selective one/batched contracts, including nested `authoringHints` |
| `generate_form_schema({table_name, mode, ...})` | Generate one schema-driven create/edit Form from a ToolJet DB table |
| `lint_app_spec(...)` / `apply_app_phase(...)` / `validate_app(app_id)` | Dry-run a logical phase, apply its one-time plan token, then statically validate persisted state |
| `get_app_summary({app_id, sections?, filters?, *_fields?})` | Selectively inspect actual persisted values |
| `add_pages(...)` / `update_pages(...)` | Add pages, then rename, restyle, reorder, or hide individual non-Home pages; use `update_app_settings.navigation_hidden` for the whole menu |
| `delete_page(..., confirm:true)` | Permanently delete one non-Home/non-group page after checking event and component references |
| `add_queries(...)` | Create one or more datasource queries; use the schema tool for `options` |
| `add_components(...)` / `add_component_batches(...)` | Place one page or several independent pages, including atomic parent/child batches and native header/body/footer slots |
| `add_events(...)` / `add_query_lifecycles(...)` | Add arbitrary interactions or expand standard mutation success/failure flows in one batch |
| `update_*` / confirmed `delete_*` / `run_query(...)` | Repair apps in place; require exact-target confirmation for deletion and explicit approval for large/billable reads |

Group management stays within the PAT workspace. `manage_workspace_groups` supports `create`, `rename`, `delete`, `remove_member`, `duplicate`, `update_permissions`, `create_access`, `update_access`, and `delete_access`. Read groups and membership IDs with `list_workspace_groups`; add `group_id` and `include_permissions:true` for permission switches and granular rule IDs. Use `resource_type` (`app`, `module`, `workflow`, or `data_source`) to discover selectable resources.

Permission updates change only supplied switches. New granular rules disable omitted action switches; updates preserve unrelated actions. Enabling `canEdit`/`canView` or `canConfigure`/`canUse` disables its paired switch; both cannot be enabled together. `access.resource_ids` replaces the selected resources, while `access.is_all:true` includes all current and future resources of that type. Duplication requires at least one selected `copy` category. Disabled groups cannot be changed. Synthetic rules supplied by restricted plans are returned with `read_only:true` and a reason, without a writable rule ID. Role-changing updates require explicit `allow_role_change:true` and remain subject to ToolJet's authorization and license checks. Default Admin permissions and default role group names/memberships are protected. Existing `manage_workspace_users` adds members to custom groups.


Workspace theme creation and management are exposed through `manage_theme`; applying a theme to an app remains part
of `update_app_settings`. The definition structure and token-backed styling guidance are documented in
[`docs/theme-api-tool.md`](docs/theme-api-tool.md).

## Resources

Read-only catalog data, for clients that validate or build plans locally and need the same catalog this server
checks plans against. Each is `application/json`: `{ "mcp_version", "catalog_version", "data_version", "data" }`,
where `data` is the data file as the server reads it and `data_version` is the first 12 hex characters of its SHA-256.
`catalog_version` is the same kind of hash over all four parts together and is identical in each of them, so a client
that reads the parts one at a time can confirm they form one coherent catalog (not a mix from two servers during a
rolling deployment). The resource list carries both in each entry's `_meta`, so a client can skip a read it has cached.

| URI | Data |
|---|---|
| `tooljet://catalog/components` | Component types: properties, styles, events, actions, sizing and authoring hints (`data/component-schemas.json`) |
| `tooljet://catalog/component-compatibility` | Legacy component types and their replacements (`data/component-compatibility.json`) |
| `tooljet://catalog/datasources` | Query contract of every datasource kind (`data/datasource-schemas.json`) |
| `tooljet://catalog/page-icons` | Page icon package, version and names (`data/page-icons.json`) |

## Privacy Policy

This connector is covered by ToolJet's privacy policy: [tooljet.com/privacy](https://tooljet.com/privacy).

## Development

```bash
npm test          # vitest (unit tests, mocked HTTP)
npm run build     # tsc → dist/
npm run dev       # tsx src/index.ts (stdio server)
npm run dev:http  # tsx src/http.ts (Streamable HTTP server)
npm run generate:catalogs  # refresh component + datasource contracts from local ToolJet source
```

Endpoint implementation notes and their evidence level are in `docs/contracts.md`; current mocked contract tests are the regression source of truth.

<!-- agent-guide:gemini:start -->
## ToolJet for Gemini CLI

Build and edit private dashboards, internal tools and business applications with
Gemini CLI and ToolJet Cloud OAuth. The extension packages the maintained
`tooljet-app-builder` skill and its references, rather than a second skill source.

### Build and install locally

This is a source preparation, not a published gallery listing. From this checkout:

```sh
npm run build:gemini-extension
gemini extensions install /absolute/path/to/tooljet-mcp/plugins/tooljet-gemini
```

Review the native install confirmation. Restart Gemini after installing. The
generated directory is ignored by Git: edit the shared skill generator/references
and rebuild, never edit or commit its copied skill. The extension has no hooks,
server runtime, credentials, tool auto-approval policies or automatic publishing.

### Connect a Cloud workspace through OAuth

The extension supplies guidance; the native client manages the connection.

Gemini's model authentication is separate from ToolJet OAuth. Google has retired
consumer Google sign-in for Gemini CLI (including individuals, Google AI Pro and
Ultra); see https://developers.google.com/gemini-code-assist/docs/deprecations/code-assist-individuals.
Use a separately configured Gemini API key or an eligible existing enterprise /
Vertex AI setup according to Google's current instructions. Do not paste keys
into chat, put them in this extension, or infer that a Google browser sign-in
success establishes model access. Consumer users should consider Antigravity.

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

### Starting prompts

- "Build a private ToolJet support dashboard with synthetic tickets and filters.
  Plan the app, validate it and verify the saved result."
- "Plan how to turn a spreadsheet request tracker into a shared ToolJet app.
  Explain the data model and permissions before importing any data."
- "Inspect this ToolJet back-office app and add a summary of outstanding work.
  Preserve existing queries and permissions and verify the change."

### Public distribution and gallery

Gemini requires `gemini-extension.json` at the root of the public repository or
release archive. This source checkout's ignored build directory is not a public
distribution. Publish only a reviewed generated artifact with an immutable source
commit, then verify installation from its public URL. The official gallery crawls
public repositories with the `gemini-cli-extension` topic daily; listing depends
on validation. Adding a topic to the unprepared MCP source root is insufficient.
Source approval does not create a repository, add topics or publish a release.

### Verification status

On 29 October 2026, Gemini CLI 0.66.0 installed the generated v0.11.0 extension
in an isolated profile and discovered the enabled `tooljet-app-builder` skill.
Its native MCP command reached the Cloud endpoint and reported authentication
required. Google browser sign-in completed, but native model access was rejected with
`UNSUPPORTED_CLIENT` for the consumer tier. ToolJet consent, live app editing and
reconnection remain unverified. No API credentials, billing or subscriptions were
added. Another client's OAuth success does not verify Gemini.

Support: https://github.com/ToolJet/tooljet-mcp/issues

### Primary references

- https://geminicli.com/docs/extensions/reference/
- https://geminicli.com/docs/extensions/releasing/
- https://geminicli.com/docs/tools/mcp-server/

ISC; see LICENSE. Gemini and ToolJet account/service terms remain separate.

<!-- agent-guide:gemini:end -->

<!-- agent-guide:kiro:start -->
## ToolJet for Kiro

Use ToolJet's maintained app-builder skill as a Kiro power for dashboards,
spreadsheet-to-app projects, internal tools, back-office apps and workflows.
The package follows Agent Plugins 1.0, using the same shared guidance as the
other ToolJet clients. It is a skills-only power; configure Cloud OAuth separately.

### Build and install locally

```sh
npm run build:kiro-power
```

The ignored output is `plugins/tooljet-kiro/`. In Kiro's Powers panel choose
Add Custom Power → Import power from a folder and select that directory. Kiro
CLI with Powers support can use:

```sh
kiro-cli powers install /absolute/path/to/tooljet-mcp/plugins/tooljet-kiro
```

Review the native install prompt and test activation with a relevant task. Do not
edit or commit copied skills: update the shared generator/references and rebuild.
The package contains no MCP runtime, credential helper, hooks or auto-approval
configuration. It does not configure a PAT fallback.

### Connect a Cloud workspace through OAuth

1. Open the intended Cloud workspace and copy its UUID from
   `https://app.tooljet.ai/<workspace-id>`. Use a dedicated workspace for testing.
2. In a separate project, merge this into `.kiro/settings/mcp.json`, replacing
   `YOUR-WORKSPACE-UUID` before saving. Preserve other server settings and do not
   put secrets in the file. Native CLI configuration can differ by version; check
   `kiro-cli mcp --help` before choosing its equivalent add command.

   ```json
   {
     "mcpServers": {
       "tooljet": {
         "url": "https://mcp-oauth.tooljet.com/mcp/YOUR-WORKSPACE-UUID"
       }
     }
   }
   ```

3. Enable only the intended connection. Kiro can discover the OAuth authorization
   server and dynamically register a public client; no client secret is needed.
   Personally review and approve ToolJet's browser consent for that workspace.
4. Verify native discovery and power activation. Before writing, ask Kiro to check
   the runtime and active workspace. Restart if `restart_required` is true.

Sign-in to Kiro and approval of ToolJet access are separate. ToolJet's Cloud
service requests app, data, workflow and workspace-user scopes; your workspace
permissions still apply. Revoke access in ToolJet profile settings → Connected AI
clients. These instructions do not establish self-hosted OAuth support.

### Starting prompts

- "Build a ToolJet dashboard for our operations team using synthetic tickets.
  Include search and status filters, validate it and verify the saved app."
- "Plan a shared internal app to replace our spreadsheet approval tracker.
  Explain the ToolJet data model and authorization rules before importing data."
- "Inspect this ToolJet back-office app and add a summary of open requests.
  Preserve its permissions and queries and verify the change."

### Sharing and curated listing

Kiro supports powers imported from public GitHub repositories as well as local
folders. Its docs allow multiple powers in separate directories. Our generated
directory is ignored, so a reviewed public distribution is still required; the
MCP source root is a different package. Record an immutable source/distribution
commit and test importing it before asking users to install it.

A custom import does not make ToolJet a curated partner power. The public intake
is https://kiro.dev/powers/submit/ and requires a complete, tested power in a public
GitHub repository, a privacy link and support contact. It also accepts Publisher
Terms on submission; the account owner must review that separately. Kiro's enterprise MCP registry is an
administrator allowlist, not the public Powers catalog. Nothing in this builder
publishes a power, accepts terms or changes an existing account.

### Verification status

On 29 October 2026, Kiro CLI 2.36.0 installed the generated v0.11.0 power in an
isolated profile. The manifest passed the official Agent Plugins 1.0 schema.
Kiro account sign-in, native power activation and skill loading, ToolJet Cloud
OAuth, one bounded Text edit, exact persisted readback and structural validation
all passed. The selected workspace UUID matched; the API returned its UUID as the
name rather than the UI label. The runtime was fresh v0.11.0. A separate remote
OAuth client independently confirmed the saved value and clean validation.
A fresh native Kiro process read the exact saved value without another login
more than ten minutes after the first verified authenticated call. This is
behavioral reconnection evidence; token stores and refresh HTTP traffic were not
inspected. Visual rendering and IDE/Web installation were not tested; another
client's OAuth success is not Kiro evidence.

Support: https://github.com/ToolJet/tooljet-mcp/issues

ToolJet privacy policy: https://tooljet.com/privacy

### Primary references

- https://kiro.dev/docs/powers/create/
- https://kiro.dev/docs/powers/installation/
- https://kiro.dev/docs/mcp/configuration/

ISC; see LICENSE. Kiro and ToolJet account/service terms remain separate.

<!-- agent-guide:kiro:end -->
