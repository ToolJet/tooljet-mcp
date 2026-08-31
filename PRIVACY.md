# Privacy Policy

**Applies to:** the `tooljet-mcp` MCP server and the `tooljet-app-builder` plugin/skill distributed
from [github.com/ToolJet/tooljet-mcp](https://github.com/ToolJet/tooljet-mcp).

**Publisher:** ToolJet Solutions, Inc.
**Last updated:** 31 August 2026

This policy covers the connector software in this repository. ToolJet's company-wide policy, which
governs ToolJet Cloud and everything else we operate, is at
[tooljet.com/privacy](https://www.tooljet.com/privacy) and takes precedence wherever the two overlap.

## What this software is

`tooljet-mcp` runs **on your own machine or your own infrastructure**, under your control. It is a
client of your ToolJet instance, not a service we host on your behalf. ToolJet Solutions, Inc.
operates no server that this connector contacts, and receives no data from it.

## Data we collect

**None.** The publisher collects, receives, stores, and transmits no data through this connector.

There is no analytics endpoint, no crash reporter, no license check, and no update ping. Every
outbound HTTP request the server makes is addressed to the ToolJet instance you configured via
`TOOLJET_URL` — there is no code path that contacts any other host.

## Data the software handles locally

To do its job the server processes the following **in memory, on the machine where it runs**:

| Data | Source | Where it goes |
|---|---|---|
| ToolJet personal access token (`TOOLJET_PAT`) | Your environment, or a per-request header | Sent to your ToolJet instance as a credential; never written to disk by this server |
| Instance URLs (`TOOLJET_URL`, `TOOLJET_APP_URL`) | Your environment | Used as the request target |
| App, page, component, query, and theme definitions | Your ToolJet instance | Returned to the MCP client that asked for them |
| ToolJet DB table schemas and rows | Your ToolJet instance | Returned to the MCP client that asked for them |
| Datasource query results (`run_query`, `run_queries`) | The datasource your query targets | Returned to the MCP client that asked for them |

Because results are returned to your MCP client, **any data you ask this connector to read is
disclosed to the AI assistant you are using**, and is then subject to that assistant vendor's own
privacy policy — Anthropic's for Claude, and so on. Choose what you read accordingly; `run_query`
and `run_queries` can return production data from any datasource connected to your workspace, which
is why they are annotated as non-read-only and gated behind explicit approval for large or billable
reads.

## Storage and retention

The server is **stateless and keeps nothing between runs**. It has no database and no cache
directory. Two exceptions, both local and both bounded:

- **Plan tokens.** `lint_app_spec` holds a validated plan in process memory for up to 30 minutes so
  `apply_app_phase` can consume it. It is discarded on use or expiry, and lost entirely when the
  process exits.
- **Opt-in telemetry.** If — and only if — you set `TOOLJET_TELEMETRY_PATH`, the server appends
  metrics to that file on your own disk: tool name, duration, request count, byte counts, warning
  count, and whether the call errored. **No arguments, results, credentials, or record contents are
  written.** The file is yours; we never see it. Leave the variable unset and nothing is written at
  all.

Data held inside your ToolJet instance is retained according to your own configuration and, for
ToolJet Cloud, [ToolJet's privacy policy](https://www.tooljet.com/privacy).

## Third-party sharing

The publisher shares nothing, because the publisher receives nothing.

Data moves between exactly three parties you have already chosen: your MCP client (the AI assistant),
this connector, and your ToolJet instance — plus any datasource your instance is connected to, when
you run a query against it. No fourth party is involved.

## Credentials

Your personal access token is read from the environment (stdio) or taken per request
(`Authorization: Bearer` / `x-tooljet-pat` over HTTP). It is held in memory for the life of the
process, sent only to your configured instance, and never logged, persisted, or included in tool
output. In shared "gateway mode" a per-request PAT is rejected outright, so one user's build can
never be attributed to another user's token.

Revoke a token at any time from **Settings → Access tokens** in your ToolJet workspace; the
connector loses access immediately.

## Children's privacy

This is a developer tool and is not directed at children under 16.

## Changes

Material changes to this policy will be published in this file, with the date above updated. The
file is versioned in git, so the full history of changes is public.

## Contact

Questions about this policy, or about data handling in this connector:

- Email: [hello@tooljet.com](mailto:hello@tooljet.com)
- Issues: [github.com/ToolJet/tooljet-mcp/issues](https://github.com/ToolJet/tooljet-mcp/issues)
