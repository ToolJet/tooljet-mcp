# Security and authorization boundaries

Read this before adding sensitive data access, user-scoped behavior, permissions, or destructive writes.

## Security boundary — UI behavior is not authorization

- Component visibility/disable rules are UX only. Never present a hidden button, page, or modal as an access-control boundary.
- Use server-side datasource permissions and row-level security for sensitive data. In server-executed queries, prefer `globals.server.currentUser` for user-scoped filters; client-side `globals.currentUser` can be inspected or changed by the client.
- Server-side current-user variables are not available inside RunJS/RunPy. Do not move an authorization check into client-executed code.
- Ask about roles/ownership before adding destructive or sensitive writes. When the user requests page, query, or component access control, use `manage_app_permissions`: call `list_subjects`, resolve exact resource ids with `get_app_summary`, then use confirmed `set` or `clear`. Only users/groups that already have app access are eligible, and ToolJet license gates still apply.
- Page permissions restrict page access, query permissions restrict execution, and component permissions restrict access to that component. These persisted permissions are different from visibility/disable expressions. Query permissions do not replace datasource permissions or row-level security; if the required authorization cannot be configured through the available surface, state the exact remaining ToolJet/RLS step instead of claiming the app is secured.
- Never place credentials, tokens, or secrets in component properties, RunJS, query parameters, alerts, or seeded placeholder data.
