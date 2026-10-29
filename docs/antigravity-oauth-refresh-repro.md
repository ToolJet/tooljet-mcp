# Antigravity 1.4.10 OAuth refresh compatibility

Initial ToolJet Cloud OAuth sign-in, MCP discovery, authenticated reads and private QA app
creation succeeded. Later live tool calls failed with OAuth `invalid_request` during renewal.
The app test stopped before its components and queries were applied. No public release,
real data import or deployment/security configuration change was made.

A separate loopback fixture reproduced a client request mismatch without real credentials:

| Request | Form fields | HTTP Basic header |
| --- | --- | --- |
| Dynamic registration | `token_endpoint_auth_method: none` | — |
| Code exchange | `client_id`, `code`, `code_verifier`, `grant_type`, `redirect_uri`, `resource` | No |
| Token refresh | `grant_type`, `refresh_token` | Yes |

Refresh omits the workspace resource and changes the registered public client's authentication.
ToolJet's documented contract requires `resource` on both exchange and refresh. For method
`none`, it requires body `client_id`; confidential methods use their registered authentication.
The observed refresh request violates those requirements. A live proxy/request trace was not
captured, so the loopback repro establishes the client behavior; it does not identify which
server-side validation produced each live error.

## Reproduce without ToolJet access

1. Run `node scripts/probe-antigravity-oauth-refresh.mjs` (Node 20+). It binds only
   `127.0.0.1:12162` and prints a temporary QA-project directory. Supply another port as its
   first argument if needed. It makes no outbound requests and logs no credential values.
2. In a second terminal, change to the printed directory and run Antigravity CLI 1.4.10.
3. Open `/mcp`, select `synthetic-oauth-refresh`, and choose Authenticate.
4. Enter `synthetic-code` in that CLI authentication field. This fixture needs no actual
   browser consent and grants no access to a real service. It returns a one-second fake token.
5. Wait two seconds, then return to the MCP panel. The client renews the synthetic token.
6. Inspect the QA directory's `observations.ndjson`. Compare the code and refresh fields.
7. Exit that test CLI and stop the fixture with Ctrl-C. Do not use this permissive fixture as
   a production OAuth server or point a real workspace at it.

## Release gate

Have the Antigravity client retain the protected resource during refresh and honor the
registered token authentication method. Then repeat live refresh, reconnect, packaged setup
and the synthetic app's readback/browser interactions. A backend compatibility design, if
proposed, needs its own security review and tests; do not simply remove resource/client checks.

The package remains PAT by default with an explicit experimental `--auth=oauth` build.
No automatic PAT fallback or two simultaneously active ToolJet connections are added.
Do not mark the OAuth release ready based only on successful initial login.
