# Security and authorization boundaries

Read this before adding sensitive data access, user-scoped behavior, permissions, or destructive writes.

## Security boundary — UI behavior is not authorization

- Component visibility/disable rules are UX only. Never present a hidden button, page, or modal as an access-control boundary.
- Use server-side datasource permissions and row-level security for sensitive data. In server-executed queries, prefer `globals.server.currentUser` for user-scoped filters; client-side `globals.currentUser` can be inspected or changed by the client.
- Server-side current-user variables are not available inside RunJS/RunPy. Do not move an authorization check into client-executed code.
- Ask about roles/ownership before adding destructive or sensitive writes. If the MCP surface cannot configure the required query/page permission or RLS policy, state the exact manual ToolJet step instead of claiming the app is secured.
- Never place credentials, tokens, or secrets in component properties, RunJS, query parameters, alerts, or seeded placeholder data.

## SQL parameters — never splice a component value into the statement

A SQL query built from a component value must pass it as a **parameter**, not paste it into the statement text. ToolJet hands `query_params` to the driver, which escapes them.

```
query:        SELECT ... FROM tickets WHERE priority = :priority
query_params: [["priority", "{{components.priorityFilter.value}}"]]
```

Not `WHERE priority = '{{components.priorityFilter.value}}'` — that is escaped only by the two quotes you typed. Measured against a real table: with the value `P1' OR '1'='1`, the spliced query returned all 15,000 rows with the filter bypassed, while the parameterised query returned 0. A dropdown with fixed options happens to be safe today; the same query becomes exploitable the moment someone points it at a text input, and that edit will not look dangerous to whoever makes it.

- Every value from a component, a URL parameter, or anything a user can influence goes in `query_params` with a `:name` placeholder.
- Parameters bind **values**, not identifiers. A table or column name cannot be a parameter, so choose those from a fixed allowlist in the query text rather than from user input.
- An empty component still needs a valid statement. Handle the empty case in SQL (`WHERE (:priority = '' OR priority = :priority)`) rather than by removing the placeholder.
- Constants you wrote yourself are not the concern. This is about values you do not control.
