# Antigravity distribution

Generate this package separately so Antigravity requirements do not change the existing
Claude Code, Codex or Agent Plugins manifests. The shared skill is copied unchanged.

## Cloud OAuth package (experimental opt-in)

```sh
npm ci
npm run build:plugin
npm run build:antigravity-plugin -- --auth=oauth
agy plugin validate --strict ./plugins/tooljet-antigravity
agy plugin install ./plugins/tooljet-antigravity
```

Enable ToolJet in Antigravity, enter the workspace UUID from the ToolJet Cloud workspace URL,
and use Authenticate. Sign in to ToolJet and check the workspace, requested permissions and
callback before approving. Enter any callback code only into Antigravity's authentication
panel, not an agent prompt or support message. This connection needs no PAT or local Node.js
MCP process. Current ToolJet OAuth support is Cloud-only.

The native `mcp_config.json` contains one remote server:
`https://mcp-oauth.tooljet.com/mcp/${TOOLJET_WORKSPACE_ID}`. Antigravity keeps a plugin with
unfilled variables disabled. Do not enable its config before completing setup.

Cloud discovery:

- Authorization metadata: `https://app.tooljet.ai/.well-known/oauth-authorization-server/api/mcp-oauth`
- Issuer: `https://app.tooljet.ai/api/mcp-oauth`
- Workspace resource: `https://mcp-oauth.tooljet.com/mcp/<workspace-id>`
- Resource metadata: `https://mcp-oauth.tooljet.com/.well-known/oauth-protected-resource/mcp/<workspace-id>`

Both metadata documents were read successfully in Chrome. The OAuth host's `/health`
returned `status: ok`, `transport: streamable-http`, `authorization: oauth`.
The separate `mcp.tooljet.com` host returned plain Unauthorized; do not substitute it for
the public OAuth service or disable its internal gateway protection.

## Default PAT package

```sh
npm run build:antigravity-plugin -- --auth=pat
agy plugin validate --strict ./plugins/tooljet-antigravity
```

This replaces the generated directory with a single local stdio server configuration for the
same plugin identity. PAT remains the default until the client refresh issue below is fixed.
This is an alternative build, not a second marketplace listing or an
automatic fallback. It needs Node.js 20+ and a ToolJet workspace PAT. Setup asks for the
frontend deployment URL, API URL and PAT. Use the same URL for both when origins are shared;
otherwise use the actual API origin separately. Supply tokens only in credential setup.
Never include credentials in prompts, repositories, screenshots or support issues.

Enable only one ToolJet server and shared app-builder skill per session. A disposable test
containing an OAuth server plus a disabled PAT server still required the PAT variables before
the plugin could be enabled; it did not provide a usable mutually exclusive auth chooser.
Each supported build therefore declares exactly one connection and never downgrades auth.

## Package validation and live QA

Antigravity CLI 1.4.10 strictly validates both authentication variants. The generated package
includes the native manifest, actual ToolJet logo, three starter prompts, unchanged shared
skill, local bundle/catalogs for the PAT variant, README and repository MIT license. It reads
no user credentials while building, refuses symlinks/credential files in copied trees, and
leaves the other client manifests unchanged. Rebuild for every release so versions agree.
Generated output is Git-ignored. Logo source: ToolJet/ToolJet `docs/static/img/tooljet-favicon.svg`.

Verified on 29 October 2026:

- The local PAT bundle starts outside the checkout and, without credentials, safely exposes
  only `tooljet_status`. This is not an authenticated PAT app-building test.
- Actual Antigravity CLI discovered the public OAuth service, registered a client, requested
  S256 PKCE and the documented Google callback, and completed browser consent plus token exchange.
- It connected as `[Authed]`, discovered 72 tools and made authenticated workspace/runtime reads
  against a dedicated Cloud test workspace. The acting workspace matched and runtime was 0.10.0.
- An earlier exchange returned `invalid_grant`; a fresh authorization attempt succeeded. The
  first failure's cause was not established and the old code was not replayed.
- Private QA app creation succeeded. Later live tool calls failed with OAuth `invalid_request`
  during renewal; components/queries and interactions were not completed or verified.
- A local synthetic fixture reproduced the client defect: code exchange includes `resource`
  and body `client_id`; refresh omits both and sends HTTP Basic, despite DCR method `none`.
  ToolJet requires the workspace resource on refresh and body client_id for that public method.
  See `docs/antigravity-oauth-refresh-repro.md`. No security check or fallback was changed.
- Browser rendering, successful refresh/reconnect and packaged variable onboarding remain
  unverified. Keep the PR draft and the OAuth build opt-in until these release gates pass.

All 56 targeted auth/OAuth/package-mode checks pass locally. These cover local
behavior; they do not substitute for live browser consent and real MCP tool calls.
Before marking ready, finish app creation/readback and main interactions, reconnect/refresh,
and package onboarding. Use synthetic data only; never test against customer workspaces.

## Marketplace submission

Google's partner intake is linked from https://antigravity.google/docs/marketplace.
A listing requires Google's review; validation and local installation confer no listing status.
The user retains final submission of the prepared application. Update the application to match
the final package/auth mode before submitting; do not claim unverified functionality.

Reference: https://antigravity.google/docs/mcp#oauth
