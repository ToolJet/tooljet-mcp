# ToolJet in the official MCP Registry

`registry/server.json` prepares a remote-only listing named
`io.github.ToolJet/tooljet-mcp`. It describes the deployed Cloud OAuth service,
not an npm/PyPI package or the local PAT server. No new package-registry account
or organization is needed. The initial public registry search on 29 October 2026
returned no ToolJet entry; repeat that check immediately before first publication.

The URL uses the registry's documented `{workspace_id}` variable. Clients supply
their own ToolJet Cloud workspace UUID, then use OAuth discovery and user consent.
It has no sample customer workspace, default workspace, PAT, static authorization
header or credentials. The registry only publishes metadata; it does not host the
server or establish a grant. Users still need a ToolJet account and workspace access.

## Validate

Use the official `mcp-publisher` from modelcontextprotocol/registry releases:

```sh
mcp-publisher validate registry/server.json
```

This submits the public candidate metadata to the registry's validation endpoint;
it does not publish or require a registry token. Validate the current remote URL's
OAuth metadata and its unauthenticated 401 challenge as a separate deployment
check. A server requiring OAuth is not expected to return a successful anonymous
MCP session. Keep the listing version aligned with the deployed version and the
reviewed source. Successful schema validation alone does not prove client setup.

## Publication

The manual `Publish MCP Registry metadata` GitHub Actions workflow is prepared for
the reviewed default branch only. It checks the exact server name and version,
verifies a pinned publisher download, validates metadata, and uses GitHub Actions
OIDC to prove repository ownership before publication. There are no long-lived
registry keys or organization PATs. PRs and normal pushes never publish metadata.

After source review/merge and explicit publication approval, a maintainer can run
that workflow from `main`, entering `io.github.ToolJet/tooljet-mcp` as confirmation.
Then verify the exact version and resolved metadata through the public registry
API. Do not claim a listing exists until that check succeeds. OIDC authentication
and first publication remain untested until the reviewed workflow runs on GitHub.
If publication succeeds but public verification fails, inspect the exact version
through the API before retrying the write.

The registry currently documents an organization-namespace limitation in interactive
GitHub device login; use its supported OIDC route rather than attempting to publish
under a personal namespace or creating another organization. A future domain-based
name would require a separately reviewed ownership-verification change.

This listing does not automatically submit the plugin to Cursor, Copilot, Grok or
their curated marketplaces. Each has its own review and installation requirements.

## References

- https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx
- https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/remote-servers.mdx
- https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/authentication.mdx
- https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/github-actions.mdx
