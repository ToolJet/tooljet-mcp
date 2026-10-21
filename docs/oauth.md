# Connect through OAuth

OAuth mode lets a remote MCP client open ToolJet in the browser and ask the user to authorize one workspace. The user does not create or paste a PAT. This release is Cloud-only. It requires a ToolJet backend configured with `TOOLJET_EDITION=cloud`, `MCP_OAUTH_ENABLED=true`, and all five OAuth database migrations applied. CE and self-hosted EE do not enable these OAuth endpoints, even when the feature flag is set.

Consent displays the exact callback URI, including remote hosts, and explains that client-supplied names are unverified. Check that the displayed destination belongs to the client you started before approving.

SSO display-name edits and saves with unchanged secrets preserve existing ciphertext and approvals. Real secret rotations, even when later restored, still change the security policy and revoke grants. Secrets remain encrypted with random nonces when first stored or changed.

## Apply the database migrations

Apply these ToolJet migrations in timestamp order before enabling this backend version:

| Migration | Database changes |
|---|---|
| `1789416000000-AddMcpOAuth.ts` | Creates `mcp_oauth_clients`, `mcp_oauth_grants` and `mcp_oauth_artifacts`, their primary/foreign keys and checks, and four secondary indexes. Existing PAT tables are unchanged. |
| `1791290000000-AddMcpOAuthRevocationHooks.ts` | Adds two database functions, nine triggers and two partial indexes to make selected local security changes durably revoke grants. |
| `1791763200000-AddMcpOAuthClientAuthentication.ts` | Adds `token_endpoint_auth_method`, `client_secret_hash` and nullable `first_authorized_at` to `mcp_oauth_clients`, plus one check constraint requiring a consistent method/hash pair. No new tables, indexes, triggers or functions. |
| `1792540800000-ReduceMcpOAuthPolicyContention.ts` | Replaces policy functions and narrows security triggers; independent security changes share the lock while new approvals take it exclusively. No new tables, columns, indexes or constraints. |
| `1792627200000-RevokeMcpOAuthOnInstanceBan.ts` | Adds an instance-ban revocation function/trigger, a case-insensitive ban-email index and a partial pending-client index. Revokes existing grants and expires PATs for already-banned users. No new tables, columns or constraints. |

The second migration's hooks cover user status; workspace status, slug and login restrictions; membership; workspace bans; client disabling; SSO settings; OIDC group-sync settings; and selected instance login settings. The ninth trigger coordinates new grant creation with policy changes. They prevent disable/re-enable or policy change/restore from reviving an old grant. They do not observe offboarding changes that an external IdP has not communicated to ToolJet.

The third migration gives existing client rows `none`, preserving their public-client behavior. This database default differs from the DCR default for new requests described below. It also backfills every existing row's `first_authorized_at` from `created_at`: the old schema cannot prove historical consent, so this preserves cached legacy registrations without creating or restoring a user grant. New DCR rows start with a null timestamp; only successful consent sets it. Rolling back disables confidential clients before removing the columns and constraint; it does not silently turn them into public clients. Applying code or setting `MCP_OAUTH_ENABLED` does not apply migrations. Check that all five migrations have been applied to the intended deployment before rollout.

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

The ToolJet backend accepts `MCP_OAUTH_TRUSTED_PROXIES`, a comma-separated list of proxy IPs/CIDRs (for example, the deployment's internal proxy subnet). Only list actual proxy networks, and prevent clients from reaching the backend through an untrusted alternate path. The proxy must append or overwrite `X-Forwarded-For`. The OAuth guard walks addresses from the socket toward the client and stops at the first untrusted address; with no configuration it uses the socket address and ignores forwarded headers. This does not change Express trust settings for unrelated APIs.

Backend registration permits 10 requests/minute per resolved address. Token/revoke requests that prove possession of a stored credential and satisfy client authentication use a separate 120/minute bucket per grant; viewer minting uses the verified delegation's grant. A client ID or unsigned claim cannot select someone else's bucket. Invalid credentials use address buckets and cannot spend verified-grant capacity, even when the same proxy or MCP process forwards both. The fixed-size anonymous and authenticated stores are separate and local to each backend replica; edge limits still need to handle volumetric traffic. A rejected request returns HTTP 429 with `Retry-After: 60`.

## Workspace custom domains

A workspace custom domain changes only human browser navigation and links. It does not change `MCP_OAUTH_ISSUER`, `MCP_OAUTH_RESOURCE_URL`, the API target receiving delegation credentials, or the canonical origin used by restricted render verification. Existing grants therefore remain usable when a browser domain is replaced or removed.

The custom domain must be active, TLS-ready, currently owned by the workspace, and available under its current license when authorization starts and completes. A change during the flow invalidates the unfinished interaction and the user must restart from the AI client. Disconnect accepts the canonical browser origin or that workspace's current approved custom origin, never another workspace's or a removed domain.

Password, LDAP, OIDC and SAML login run on the workspace domain. Register the exact custom-domain OIDC callback and SAML ACS URL with the customer's identity provider before enabling it; ToolJet cannot update an external provider configuration. Google and GitHub continue to use the canonical callback registered for the ToolJet deployment and return to the same server-bound interaction. The short-lived custom-domain bootstrap is interaction/workspace/origin bound and does not transfer a general login session.

For MCP clients that make requests from a browser origin, list exact trusted origins in `MCP_OAUTH_ALLOWED_ORIGINS`, comma-separated. Server-side/desktop clients normally send no Origin. The server rejects unlisted browser origins.

Browser render verification also needs `playwright-core` and Chrome on the MCP host. If the package is outside normal module resolution, set `MCP_RENDER_AUDIT_PLAYWRIGHT` to its local package directory and `MCP_RENDER_AUDIT_CHROME` to the Chrome executable. These are deployment settings, not client-supplied paths. For a frontend that calls a separate API origin, include that exact trusted API origin in `MCP_RENDER_AUDIT_ALLOWED_ORIGINS`; otherwise the browser audit blocks its bootstrap requests. OAuth viewer navigation remains fixed to `TOOLJET_DEPLOYMENT_URL`; custom-domain human links never move the restricted viewer credential.

The public OAuth MCP process targets one trusted ToolJet Cloud installation and can serve its workspace URLs. Self-hosted OAuth support is outside this release; existing PAT and internal MCP integrations remain available.

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

Profile settings → **Connected AI clients** lets the user disconnect an approval in that workspace. Disconnecting takes effect on subsequent authenticated requests. Instance bans revoke all existing OAuth grants and expire PATs for the matching email, case-insensitively; unbanning does not restore them. Cloud administrative session termination, including password resets, also revokes grants and expires PATs in the session-deletion transaction. Ordinary logout remains session-only. Tokens also stop working when user/workspace membership is disabled, the workspace is archived/suspended, or its applicable login policy no longer matches the approval.

Access tokens last at most 10 minutes and the client refreshes them automatically. Refresh tokens rotate; clients must serialize refresh requests. Reusing a code or refresh token revokes the connection, including any newly issued replacement tokens. A connection has a 30-day absolute lifetime and refresh tokens have a 7-day inactivity lifetime.

Daily cleanup deletes expired grants and credentials but preserves approved client registrations and migrated legacy registrations. A client can therefore reuse its cached ID to obtain a new approval after expiry; expired or revoked tokens still fail. New registrations with null `first_authorized_at` remain pending until successful consent. Start, preview, denied consent and failed consent do not mark approval. Each registration transaction removes pending rows older than one hour and evicts the oldest pending rows when necessary to keep at most 1,000. Eviction cascades unfinished interactions; during sustained registration churn a user may need to restart a pending login. The daily 04:00 cleanup also removes expired credentials and unused pending registrations.

The separate 10,000-client installation quota counts only approved and migrated legacy clients, and is checked atomically when a pending client first gains approval. Anonymous registrations cannot spend it. Already-approved clients can reconnect at capacity. Pending cache pruning and promotion serialize across replicas. Monitor approved capacity and retain edge controls against sustained traffic; no registration-management or secret-rotation dashboard is included.

The OAuth service uses stateless MCP HTTP requests: every POST is authenticated. The workspace endpoint accepts POST and OPTIONS; GET and DELETE return 405 before credential exchange because there are no server-initiated streams or persistent sessions. Resource metadata remains available through GET on the well-known endpoint. An MCP session ID never provides access. Existing tool implementations run with a separate constrained ToolJet delegation, and the backend rechecks live access and scope restrictions.

An invalid or expired user token returns 401 with an OAuth challenge. Exchange-service configuration failures (including mismatched `MCP_OAUTH_EXCHANGE_SECRET` values) return 503 `temporarily_unavailable` without asking the user to log in again. Check the service diagnostic status/code and matching deployment secrets; diagnostic logs never include tokens or backend response bodies.

Workflow lint/apply plans remain in the MCP process's memory for up to 30 minutes. OAuth plans belong to the same approval, API target and workspace across token renewal. Route lint and apply to the same replica; a process restart or a different replica requires linting again. The plan does not bypass the backend's current permissions or revocation checks.

Revocation stops later requests that perform their authorization check after the change is committed. It does not cancel or undo an API operation already running. A long tool making several API calls can stop between calls when access expires or is revoked. Do not retry an uncertain write automatically.

OAuth HTTP accepts JSON request bodies up to 15 MiB, matching the current MCP image payload allowance. Larger bodies return HTTP 413. The public process must not carry fallback PATs or expose the internal `/build-token` minting interface.

`verify_page_render` requests a separate browser credential for the app being audited. It lasts at most 120 seconds, is pinned to that app and the live OAuth grant, and uses the dedicated HttpOnly `tj_oauth_viewer` cookie on the configured ToolJet deployment origin. The API delegation never becomes a browser cookie, and no PAT is minted. The backend applies its app-viewer access rules and current user permissions, while the browser audit blocks writes, unverified queries, redirects, sockets, and unconfigured destinations. Failed viewer authorization stops the audit without another authentication fallback. Existing authenticated rendering through the PAT/in-product paths is unchanged. A missing browser or blocked runtime dependency is still reported as unverified.

For OAuth principals, including viewers, session-bootstrap and workspace-authorization responses return empty SSO user-information objects. This withholds stored IdP token fields and custom SSO attributes at those response boundaries while retaining ordinary account name/email fields. Normal browser/PAT responses and shared server-side SSO query-binding data remain unchanged. Apps whose browser bindings depend on custom SSO attributes may lack those values during OAuth rendering. This response change needs no additional migration.

## Existing integrations

PAT-based stdio plugins and explicitly configured legacy HTTP processes keep their existing behavior. OAuth is an additional HTTP mode; installing an existing stdio plugin alone does not switch it to browser OAuth. Keep the ToolJet app-builder skill installed in the AI client if its workflow uses that skill.

The companion ToolJet deployment must enable MCP OAuth. Each workspace keeps the login providers and features available under its current plan. This change does not unlock paid SSO providers or implement the built-in AI Builder in Community Edition.

Cloud MCP endpoints must be reachable by the configured AI client. OAuth itself does not provide network connectivity.

This implementation retains the installed MCP SDK's `2025-11-25` protocol and earlier supported versions. It does not claim the newer `2026-07-28` transport semantics. Client metadata document URLs, `private_key_jwt` client assertions and enterprise-managed identity assertion grants are not implemented. Use a supported DCR method or a previously registered client with matching credentials and redirect. Adding confidential-client support removes the earlier public-only limitation; it does not prove Microsoft or any other hosted client works end to end. Validate each supported client, refresh/reconnect behavior and real SSO provider in the target deployment.

### Hosted resource limits

Rate-limit `/mcp/*` at the reverse proxy by the real client address; enforce a shared limit across replicas. The MCP process also limits failed-token exchanges to 300 per minute per source IP (`MCP_OAUTH_EXCHANGE_RATE_LIMIT`, 1–10000). Excess requests receive 429 and `Retry-After` before any backend call. By default only the socket address is trusted. Set `MCP_OAUTH_TRUST_PROXY_HOPS` (0–10) only for a fixed, trusted proxy chain that overwrites forwarded headers and prevents direct access to the MCP listener. Successful exchanges do not consume this failure budget. A bounded cache of recently verified token/resource hashes bypasses the IP gate for 60 seconds, preserving active clients behind shared egress addresses; every request still exchanges with the backend and invalidation removes the hint. New or idle credentials may wait for the shared failure bucket to reset. A shared proxy address otherwise shares one failure bucket. The process also caps in-flight exchanges at 64 and times each out after ten seconds; capacity exhaustion returns 503 with `Retry-After`. Do not trust a caller-supplied forwarded address.

Render verification has a process-wide browser cap (`MCP_RENDER_AUDIT_MAX_BROWSERS`, default 2, maximum 32) and allows one concurrent audit per OAuth grant. Busy requests fail as unverified and release capacity on completion or failure. Browser launch keeps Chromium's sandbox enabled and disables non-proxied WebRTC traffic. Hosts must support sandboxed Chromium; do not work around launch failures by disabling its sandbox.

The minimal Docker image has no browser and sets `MCP_RENDER_AUDIT_ENABLED=false`. `verify_page_render` is omitted when its driver or executable is unavailable. Use the skill's manual visual checks and report rendering as unverified. A browser-equipped host can set a valid `MCP_RENDER_AUDIT_CHROME` path and install `playwright-core` (or configure `MCP_RENDER_AUDIT_PLAYWRIGHT`); remove the image's disabled override after configuring these dependencies.

A viewer credential lasts up to 120 seconds, bounded by the live grant rather than the parent access token's remaining lifetime. Revocation, policy changes, workspace membership and app binding are still checked on every viewer request.

Concurrent retries of the same refresh request can recover the same rotated token pair for five seconds while that pair remains unused. The retry response is encrypted at rest with a purpose-specific key derived from the installation signing secret and bound to the consumed artifact. Replays outside that window, with changed scopes, or after the child refresh has rotated revoke the grant. This bounded retry window is an availability/security tradeoff; it does not distinguish a stolen bearer token from a legitimate retry within those five seconds.
