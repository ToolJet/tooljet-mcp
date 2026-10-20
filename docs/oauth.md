# Connect through OAuth

OAuth mode lets a remote MCP client open ToolJet in the browser and ask the user to authorize one workspace. The user does not create or paste a PAT. It requires an upgraded ToolJet backend with MCP OAuth enabled and all three additive database migrations applied.

## Apply the database migrations

Apply these ToolJet migrations in timestamp order before enabling this backend version:

| Migration | Database changes |
|---|---|
| `1789416000000-AddMcpOAuth.ts` | Creates `mcp_oauth_clients`, `mcp_oauth_grants` and `mcp_oauth_artifacts`, their primary/foreign keys and checks, and four secondary indexes. Existing PAT tables are unchanged. |
| `1791290000000-AddMcpOAuthRevocationHooks.ts` | Adds two database functions, nine triggers and two partial indexes to make selected local security changes durably revoke grants. |
| `1791763200000-AddMcpOAuthClientAuthentication.ts` | Adds `token_endpoint_auth_method`, `client_secret_hash` and nullable `first_authorized_at` to `mcp_oauth_clients`, plus one check constraint requiring a consistent method/hash pair. No new tables, indexes, triggers or functions. |

The second migration's hooks cover user status; workspace status, slug and login restrictions; membership; workspace bans; client disabling; SSO settings; OIDC group-sync settings; and selected instance login settings. The ninth trigger coordinates new grant creation with policy changes. They prevent disable/re-enable or policy change/restore from reviving an old grant. They do not observe offboarding changes that an external IdP has not communicated to ToolJet.

The third migration gives existing client rows `none`, preserving their public-client behavior. This database default differs from the DCR default for new requests described below. It also backfills every existing row's `first_authorized_at` from `created_at`: the old schema cannot prove historical consent, so this preserves cached legacy registrations without creating or restoring a user grant. New DCR rows start with a null timestamp; only successful consent sets it. Rolling back disables confidential clients before removing the columns and constraint; it does not silently turn them into public clients. Applying code or setting `MCP_OAUTH_ENABLED` does not apply migrations. Check that all three migrations have been applied to the intended deployment before rollout.

## Run the OAuth MCP service

Configure a separate process from the existing internal AI gateway:

```dotenv
MCP_TRANSPORT=http
MCP_OAUTH_ENABLED=true
MCP_OAUTH_ISSUER=https://tooljet.example.com/api/mcp-oauth
MCP_OAUTH_RESOURCE_URL=https://mcp.example.com/mcp
MCP_OAUTH_EXCHANGE_SECRET=<same independent service secret configured in ToolJet>
TOOLJET_DEPLOYMENT_URL=https://tooljet.example.com
TOOLJET_URL=https://tooljet.example.com
MCP_HTTP_HOST=0.0.0.0
PORT=8787
```

The service secret must contain at least 32 characters and belongs only in the ToolJet/MCP deployment secret stores. AI clients receive their own OAuth tokens. Do not set `MCP_SHARED_TOKEN` in this process: internal gateway bearer authentication and public OAuth are separate modes.

Run `npm run build:plugin`, then `node bundle/index.js` with the environment above. Terminate HTTPS at your reverse proxy. Both HTTP entry points support the same OAuth behavior; when using `npm run start:http`, use `TOOLJET_MCP_HTTP_HOST` and `TOOLJET_MCP_HTTP_PORT` for its bind address and port.

`TOOLJET_URL` is the configured backend base, including any ToolJet subpath but excluding `/api`. `TOOLJET_DEPLOYMENT_URL` is the browser base. Use separate values for split frontend/API installations. No incoming `x-tooljet-url`, `x-tooljet-pat`, or `x-tooljet-session` header can override these settings in OAuth mode. HTTPS is required except for explicit loopback development URLs.

For a container network with an HTTP-only internal ToolJet service, use the deployment's HTTPS API URL (or provide HTTPS internally). Do not expose the private exchange secret over an unencrypted non-loopback connection.

Proxy these paths to the MCP server:

- `/mcp/<workspace-id-or-slug>`: MCP requests.
- `/.well-known/oauth-protected-resource/mcp/<workspace-id-or-slug>`: resource metadata.
- `/health`: optional readiness check.

If the resource URL uses a longer path, include the entire resource path after `/.well-known/oauth-protected-resource`. The metadata lives at the origin root. Also proxy the authorization-server metadata path to ToolJet: `/.well-known/oauth-authorization-server/api/mcp-oauth` (with the issuer's complete path if it uses a subpath).

Treat discovery as a deployment gate, not only process health. Fetch the exact authorization-server and protected-resource URLs through the public proxy and require a JSON `content-type`; a `200 text/html` response is a broken frontend fallback, not healthy OAuth. Verify that the advertised issuer, authorization/token endpoints, protected resource and the unauthenticated MCP `WWW-Authenticate` `resource_metadata` URL exactly match the two configured public addresses. Then complete one browser authorization and MCP `initialize` request. This catches proxy, cookie and subpath failures that `/health` cannot detect.

The ToolJet public proxy must also keep the browser-facing `/<subpath>/api/mcp-oauth/authorize`, `interactions/*`, `token`, `revoke`, `exchange`, `viewer`, and `connections/*` routes on the configured issuer host. Do not route the well-known path to the frontend catch-all. In a split frontend/backend deployment, custom domains must proxy the same `/<subpath>/api` path to the trusted ToolJet backend so consent cookies remain first-party; broad CORS or third-party-cookie exceptions are not a substitute.

## Optional hosted MCP analytics

Set these variables on the **OAuth MCP service**, then restart it:

```dotenv
POSTHOG_PROJECT_TOKEN=phc_your_project_token
POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_ENVIRONMENT=production
```

Use the project token from PostHog project settings, not a personal API key. Use `https://eu.i.posthog.com` for an EU project, or your own HTTPS ingestion host. `POSTHOG_ENVIRONMENT` is optional and defaults to `unspecified`. Without a project token, tracking is disabled. A missing or invalid host disables tracking with a generic startup warning. These settings do not enable tracking for stdio plugins, PAT HTTP, or the internal AI gateway.

The service sends two events through PostHog's [batch capture API](https://posthog.com/docs/api/capture):

| Event | Properties |
|---|---|
| `mcp_client_initialized` | Successful authenticated initialization; recognized client family (`claude`, `codex`, `cursor`, `grok`, `windsurf`, `vscode`, or `other`). The family comes from client-supplied metadata and is not a verified identity. |
| `mcp_tool_completed` | Tool name, duration in milliseconds, ToolJet HTTP request count, upstream response bytes reported by Content-Length, result bytes, warning count, and an error boolean. Errors returned or thrown by an executed tool handler are counted. SDK rejections before handler execution, such as unknown tools or invalid arguments, are excluded. |

Both include environment, MCP version, `oauth_http` transport, a hashed workspace ID, and a hashed OAuth approval ID as PostHog's `distinct_id`. Hashes are scoped to the configured issuer and are **pseudonymous, not anonymous**: someone with the issuer URL and a raw ID can recompute its hash. This measures connections, **not unique people**: multiple approvals from one person are distinct, while refreshes retain their connection ID. The events share that ID so initialization and tool usage can be correlated. Completed reinitializations are counted separately; initialize notifications without a request ID do not count. Browser login, consent, token exchange, SDK validation rejections, and unauthenticated calls are not tracked here.

Events use an explicit metadata allowlist. Prompts, tool arguments/results, error messages, raw client names, credentials, email addresses, callback URLs, and raw workspace/approval IDs are not sent. Person-profile processing and GeoIP enrichment are disabled. No database schema changes are needed.

Delivery is best effort and never awaited by tool execution. The in-memory queue holds up to 1,000 pending events, sends batches of up to 20 every five seconds or when full, and gives each request a two-second timeout. After a successful send, remaining full batches drain immediately; a partial batch waits for the next flush. Network errors, HTTP 429 and server errors get at most three attempts with stable event UUIDs. Retry delays grow from five seconds to a one-minute cap, honoring a longer `Retry-After` value; incoming events cannot bypass that delay. Other HTTP errors are dropped. Each safe warning category is logged at most once every ten minutes, so persistent delivery failures remain visible.

Both HTTP entry points allow up to two seconds for connections to close, including open event streams, followed by up to five seconds to drain analytics (seven seconds total). Shutdown respects retry delays and drops pending events when the remaining delay exceeds the drain budget. A full queue, sustained outage, or forced process termination can lose events; this is usage analytics, not an audit log. Collector response bodies and event contents are never logged.

To validate without a PostHog account, run `npx vitest run tests/posthog.test.ts tests/posthogHttp.test.ts tests/telemetry.test.ts`. The integration tests use an ephemeral loopback HTTP collector and synthetic credentials; no PostHog traffic is sent. A loopback HTTP host is accepted for local testing only.

## Workspace custom domains

A workspace custom domain changes only human browser navigation and links. It does not change `MCP_OAUTH_ISSUER`, `MCP_OAUTH_RESOURCE_URL`, the API target receiving delegation credentials, or the canonical origin used by restricted render verification. Existing grants therefore remain usable when a browser domain is replaced or removed.

The custom domain must be active, TLS-ready, currently owned by the workspace, and available under its current license when authorization starts and completes. A change during the flow invalidates the unfinished interaction and the user must restart from the AI client. Disconnect accepts the canonical browser origin or that workspace's current approved custom origin, never another workspace's or a removed domain.

Password, LDAP, OIDC and SAML login run on the workspace domain. Register the exact custom-domain OIDC callback and SAML ACS URL with the customer's identity provider before enabling it; ToolJet cannot update an external provider configuration. Google and GitHub continue to use the canonical callback registered for the ToolJet deployment and return to the same server-bound interaction. The short-lived custom-domain bootstrap is interaction/workspace/origin bound and does not transfer a general login session.

For MCP clients that make requests from a browser origin, list exact trusted origins in `MCP_OAUTH_ALLOWED_ORIGINS`, comma-separated. Server-side/desktop clients normally send no Origin. The server rejects unlisted browser origins.

Browser render verification also needs `playwright-core` and Chrome on the MCP host. If the package is outside normal module resolution, set `MCP_RENDER_AUDIT_PLAYWRIGHT` to its local package directory and `MCP_RENDER_AUDIT_CHROME` to the Chrome executable. These are deployment settings, not client-supplied paths. For a frontend that calls a separate API origin, include that exact trusted API origin in `MCP_RENDER_AUDIT_ALLOWED_ORIGINS`; otherwise the browser audit blocks its bootstrap requests. OAuth viewer navigation remains fixed to `TOOLJET_DEPLOYMENT_URL`; custom-domain human links never move the restricted viewer credential.

Cloud and self-hosted deployments use this same configuration contract. One process targets one trusted ToolJet installation and can serve its workspace URLs. The implementation does not require self-hosted installations to use a ToolJet-hosted authentication service.

## Connect an AI client

Add the workspace-specific URL in a client supporting HTTP MCP, OAuth Authorization Code with S256 PKCE, and a supported dynamic or previously registered client:

```text
https://mcp.example.com/mcp/<workspace-id>
```

Prefer the workspace's immutable ID over its editable slug. For example, Claude Code supports adding an HTTP MCP server and completing browser authorization through its MCP controls; see the [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp).

The client receives a 401 discovery challenge, discovers ToolJet's authorization endpoint, and opens its browser flow. ToolJet shows the workspace's existing sign-in methods, then consent. The connection never starts from a new ToolJet “Connect” button.

### Choose the client authentication method

ToolJet's registration endpoint accepts these `token_endpoint_auth_method` values:

| Method | Registration and subsequent requests |
|---|---|
| `none` | Explicit public-client registration. Returns a client ID without a secret. Send `client_id` in token and revocation form bodies. |
| `client_secret_basic` | Returns a client ID and secret. Authenticate token and revocation requests using HTTP Basic. This is the default for a **new DCR request that omits the method**. |
| `client_secret_post` | Returns a client ID and secret. Send both in token and revocation form bodies. |

Existing public registrations remain `none` after migration. New desktop/public integrations should explicitly send `token_endpoint_auth_method: "none"`; omitting it no longer registers a public client. Clients must use the method they registered. Do not combine Basic authentication with client credentials in the form body.

For either confidential method, DCR returns `client_secret` once and `client_secret_expires_at: 0`, meaning no scheduled secret expiry. The secret is randomly generated; only its SHA-256 hash is stored in ToolJet. Save the original securely in the client service. It is separate from the deployment exchange secret, the user's password and any PAT. No secret recovery or rotation interface is added here.

Client-secret authentication does not replace the user's browser login or consent. Every client still needs S256 PKCE, a registered redirect, the workspace `resource`, the approved scopes and a live grant. HTTP loopback callbacks may change their port during authorization; the host, path and query must still match the registration. Code exchange must use the exact callback selected during authorization. Authorization-code exchange and refresh both require the resource. Token and revocation requests use form encoding. Only `authorization_code` and `refresh_token` grants are supported; this change does not add the machine-to-machine `client_credentials` grant or mint PATs.

OAuth preflight responses allow the `Authorization` header used by Basic requests. The global CORS middleware and endpoint handling are covered by regression tests; the MCP service's configured browser-origin restrictions still apply.

Resource metadata, the initial challenge, and the default consent request advertise `apps data workflows workspace_users`, matching the existing workspace PAT capability ceiling. User/group management remains subject to the user's actual administrative permissions, feature limits, and the tools' confirmation controls. A client may request fewer scopes. Existing connections approved for fewer scopes must reconnect and approve the broader request to use those capabilities. Consent is a limit on top of the user's current permissions. It does not give a viewer edit rights or a builder admin rights.

Profile settings → **Connected AI clients** lets the user disconnect an approval in that workspace. Disconnecting takes effect on subsequent authenticated requests. Tokens also stop working when user/workspace membership is disabled, the workspace is archived/suspended, or its applicable login policy no longer matches the approval.

Access tokens last at most 10 minutes and the client refreshes them automatically. Refresh tokens rotate; clients must serialize refresh requests. Reusing a code or refresh token revokes the connection, including any newly issued replacement tokens. A connection has a 30-day absolute lifetime and refresh tokens have a 7-day inactivity lifetime.

Daily cleanup deletes expired grants and credentials but preserves approved client registrations and migrated legacy registrations. A client can therefore reuse its cached ID to obtain a new approval after expiry; expired or revoked tokens still fail. New registrations with null `first_authorized_at` become eligible for cleanup after 24 hours only when they have no remaining grant or artifact. Start, preview, denied consent and failed consent do not mark approval. A pending interaction temporarily prevents cleanup until it expires. The daily 04:00 sweep means 24 hours is an eligibility threshold, not an exact deletion deadline.

Registration remains capped at 10,000 clients per ToolJet installation, with existing rate limiting. Collecting abandoned new registrations limits idle accumulation; approved and migrated legacy registrations still occupy capacity. Monitor the quota and retain deployment controls against sustained registration abuse. No registration-management or secret-rotation dashboard is included.

The OAuth service uses stateless MCP HTTP requests: every POST, GET and DELETE is authenticated. An MCP session ID never provides access. Existing tool implementations run with a separate constrained ToolJet delegation, and the backend rechecks live access and scope restrictions.

Workflow lint/apply plans remain in the MCP process's memory for up to 30 minutes. OAuth plans belong to the same approval, API target and workspace across token renewal. Route lint and apply to the same replica; a process restart or a different replica requires linting again. The plan does not bypass the backend's current permissions or revocation checks.

Revocation stops later requests that perform their authorization check after the change is committed. It does not cancel or undo an API operation already running. A long tool making several API calls can stop between calls when access expires or is revoked. Do not retry an uncertain write automatically.

OAuth HTTP accepts JSON request bodies up to 15 MiB, matching the current MCP image payload allowance. Larger bodies return HTTP 413. The public process must not carry fallback PATs or expose the internal `/build-token` minting interface.

`verify_page_render` requests a separate browser credential for the app being audited. It lasts at most 120 seconds, is pinned to that app and the live OAuth grant, and uses the dedicated HttpOnly `tj_oauth_viewer` cookie on the configured ToolJet deployment origin. The API delegation never becomes a browser cookie, and no PAT is minted. The backend applies its app-viewer access rules and current user permissions, while the browser audit blocks writes, unverified queries, redirects, sockets, and unconfigured destinations. Failed viewer authorization stops the audit without another authentication fallback. Existing authenticated rendering through the PAT/in-product paths is unchanged. A missing browser or blocked runtime dependency is still reported as unverified.

For OAuth principals, including viewers, session-bootstrap and workspace-authorization responses return empty SSO user-information objects. This withholds stored IdP token fields and custom SSO attributes at those response boundaries while retaining ordinary account name/email fields. Normal browser/PAT responses and shared server-side SSO query-binding data remain unchanged. Apps whose browser bindings depend on custom SSO attributes may lack those values during OAuth rendering. This response change needs no additional migration.

## Existing integrations

PAT-based stdio plugins and explicitly configured legacy HTTP processes keep their existing behavior. OAuth is an additional HTTP mode; installing an existing stdio plugin alone does not switch it to browser OAuth. Keep the ToolJet app-builder skill installed in the AI client if its workflow uses that skill.

The companion ToolJet deployment must enable MCP OAuth. Each workspace keeps the login providers and features available under its current plan. This change does not unlock paid SSO providers or implement the built-in AI Builder in Community Edition.

Private self-hosted services must be reachable by the client (for example over a desktop VPN). Hosted AI clients need an appropriate reachable MCP endpoint. OAuth itself does not provide network connectivity.

This implementation retains the installed MCP SDK's `2025-11-25` protocol and earlier supported versions. It does not claim the newer `2026-07-28` transport semantics. Client metadata document URLs, `private_key_jwt` client assertions and enterprise-managed identity assertion grants are not implemented. Use a supported DCR method or a previously registered client with matching credentials and redirect. Adding confidential-client support removes the earlier public-only limitation; it does not prove Microsoft or any other hosted client works end to end. Validate each supported client, refresh/reconnect behavior and real SSO provider in the target deployment.
