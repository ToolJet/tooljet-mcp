# Security and authorization boundaries

Read this before adding sensitive data access, user-scoped behavior, permissions, or destructive writes.

## Security boundary — UI behavior is not authorization

- Component visibility/disable rules are UX only. Never present a hidden button, page, or modal as an access-control boundary.
- Use server-side datasource permissions and row-level security for sensitive data. In server-executed queries, prefer `globals.server.currentUser` for user-scoped filters; client-side `globals.currentUser` can be inspected or changed by the client.
- Server-side current-user variables are not available inside RunJS/RunPy. Do not move an authorization check into client-executed code.
- Ask about roles/ownership before adding destructive or sensitive writes. If the MCP surface cannot configure the required query/page permission or RLS policy, state the exact manual ToolJet step instead of claiming the app is secured.
- Never place credentials, tokens, or secrets in component properties, RunJS, query parameters, alerts, or seeded placeholder data.
