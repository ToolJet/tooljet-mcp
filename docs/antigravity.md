# Antigravity distribution

The Antigravity package is generated separately so native Antigravity requirements do not
change the existing Claude Code, Codex or Agent Plugins manifests.

## Build and validate

```sh
npm ci
npm run build:plugin
npm run build:antigravity-plugin
agy plugin validate --strict ./plugins/tooljet-antigravity
agy plugin install ./plugins/tooljet-antigravity
agy plugin list --json
```

The output is ignored by Git. Rebuild it for each release so bundle, data catalogs, shared skill
and manifest version agree. The source skill is copied unchanged; regenerate that source through
its existing generator when changing guidance. No credentials or environment files are packaged.
The package uses the repository's MIT LICENSE file.

Antigravity CLI 1.4.10 validated and installed this package. Its native `mcp_config.json` declares
one stdio server with user-prompted variables. The installed plugin stays disabled until configured.
Node.js 20+ must be available on PATH. Supply the API and frontend origins separately when the
ToolJet instance uses split-origin hosting; otherwise enter the deployment origin in both fields.

## Submission checks

- Strict validation must report zero errors and warnings.
- Install and confirm one shared skill and one MCP server are discovered.
- Verify the packaged server starts from outside the source checkout.
- Without credentials, initialization must explain the missing token and expose only its read-only
  `tooljet_status` tool. This checks startup and safe failure; it is not an authenticated app test.
- Before claiming end-to-end support, configure a dedicated ToolJet test workspace through the
  Antigravity credential dialog. Build a small app, check saved components/queries, reopen it in
  ToolJet and verify the main interactions. Never use a production customer's workspace for QA.
- Include the README, bundled logo, version and public support URL. State any unverified behavior
  in the marketplace application; do not imply the plugin is already listed.

Google's partner intake is linked from https://antigravity.google/docs/marketplace.
A marketplace listing requires Google's review; local validation does not confer listing status.

Logo: the existing ToolJet favicon from ToolJet/ToolJet, docs/static/img/tooljet-favicon.svg.

## Authentication verification (29 October 2026)

Antigravity CLI 1.4.10 accepts remote Streamable HTTP MCP configurations and local stdio
configurations. Its published OAuth guide supports automatic discovery/DCR and manually
registered clients. ToolJet's current OAuth service is Cloud-only and workspace-specific;
repository support does not establish that an arbitrary Cloud instance has it enabled.

A disposable plugin containing a remote OAuth connection and a disabled local PAT connection
was strictly validated, installed and removed. Installation still disabled the entire plugin
until the PAT variables were configured. A disabled PAT entry therefore does not provide a
confirmed OAuth-first onboarding flow. No documented mutually-exclusive auth selector was found.

Keep one active connection per ToolJet plugin/session. For a future OAuth-first marketplace
package, validate the actual Cloud workspace MCP URL before replacing the current PAT connection.
Document self-hosted PAT configuration as an explicit alternative; do not automatically retry
OAuth failures using PAT credentials or register both transports as active by default.

The existing `tests/auth.test.ts` and `tests/oauthHttp.test.ts` passed all 53 tests locally.
These cover ToolJet's auth boundaries, not Antigravity's deployed browser sign-in. The following
remain unverified: DCR/client authentication, consent/callback handling, token refresh,
reconnect, and real app creation/readback in Antigravity. A dedicated Cloud test workspace is
now available, but its public MCP resource endpoint has not yet been identified.
The packaged PAT path also still needs an authenticated Antigravity app test.

Cloud authorization-server discovery was read successfully in Chrome at
`https://app.tooljet.ai/.well-known/oauth-authorization-server/api/mcp-oauth`.
It advertises issuer `https://app.tooljet.ai/api/mcp-oauth`, registration, authorization,
token and revocation endpoints, S256 PKCE, code/refresh grants, all three documented client
authentication methods, and the four ToolJet scopes. This proves metadata delivery only;
it does not prove registration, login, consent or MCP tool calls work in Antigravity.

The workspace-specific protected-resource path tried on `app.tooljet.ai` led to a frontend
error page rather than resource metadata. Do not infer the MCP resource URL from the browser
workspace URL or treat the authorization issuer as the MCP server. Obtain the deployed
`MCP_OAUTH_RESOURCE_URL` value (not the exchange secret or a token), append the workspace ID,
and verify that exact service's challenge and resource metadata before configuring the client.

Reference: https://antigravity.google/docs/mcp#oauth
