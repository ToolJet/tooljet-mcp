# ToolJet app-builder platform API tools

This expansion keeps ToolJet's API governance intact: every MCP action maps to a fixed ToolJet route and uses the
authenticated user's active workspace, RBAC, validation, and license gates. There is deliberately no arbitrary HTTP
tool. Native ToolJet DTO fields that vary by edition/plugin are accepted under `payload`.

This surface is deliberately limited to authoring and operating ToolJet apps. Workspace/instance administration,
identity/profile management, billing, branding/domains/SSO, SMTP, plugin administration, Git sync, audit logs, and
ToolJet AI administration remain out of scope.

## Safety contract

- Destructive operations, public exposure, releases/promotions, app/datasource permission changes, workflow
  execution, connection tests, and OAuth writes require `confirm:true`.
- The caller may set `confirm:true` only after the user approves the exact target/action.
- ToolJet DB reads are capped at 1,000 rows per call. Existing `run_query` billable/large/remote-read safeguards still
  apply to datasource queries.
- Workspace constant reads are forced to `Global`; secret APIs return metadata only. Secret creation, rotation,
  update, and deletion stay in ToolJet's protected settings UI and are refused by MCP.
- OAuth remains user-assisted. `oauth_url` can prepare the flow; `authorize_oauth` requires explicit confirmation and
  a user-provided callback payload.
- API errors include the ToolJet operation, HTTP status, and upstream response. No platform tool retries mutations.

## App lifecycle, styling, and permission tools

| MCP tool | Actions |
|---|---|
| `manage_permission_group` | Read-only `list`, `get`, `list_users` for resolving existing groups during app/datasource permission work |
| `manage_granular_permission` | `list`, `list_addable_apps`, `list_addable_datasources`, `create`, `update`, `delete` for the app and datasource resources implemented by ToolJet's controller |
| `manage_app_permission` | `list_users`, `list_groups`, `get`, `create`, `update`, `delete` for page/query/component permissions |
| `manage_theme` | `list`, `create`, `set_default`, `update_definition`, `rename`, `delete` |
| `manage_app_resource` | App/addable-app lists; ID/slug/auth-config reads; table/workflow relations; create/update/visibility/maintenance/slug/icon/release/clone/export/import/delete |
| `manage_folder` | `list`, `create`, `rename`, `delete`, `add_app`, `remove_app` |
| `manage_app_version` | `list`, `get`, `create`, `create_draft`, `update`, `promote`, `delete` |
| `manage_app_environment` | `list`, `get`, `get_default`, `list_versions`, `create`, `update`, `delete` |
| `manage_app_history` | `list`, `update_description`, `restore` |
| `manage_raw_app_settings` | `get`, `update` for libraries, preloaded scripts, page styles, device settings, and native version settings |
| `manage_navigation_item` | `create`, `update`, `clone`, `clone_group`, `reorder`, `delete` for pages, URL/app/custom links, and nav groups |

Selecting a theme for an app remains the curated `update_app_settings(theme_id)` operation. `manage_theme` manages the
workspace theme objects themselves.

### Theme contract and component styling

Themes are optional. Do not create one or change the workspace default merely to style an app. When an app already
has a selected theme, component styles should preserve their token-backed defaults and use ToolJet's existing
semantic variables for repeated roles—for example `var(--cc-primary-brand)`, `var(--cc-primary-text)`,
`var(--cc-placeholder-text)`, `var(--cc-default-border)`, `var(--cc-weak-border)`,
`var(--cc-error-systemStatus)`, `var(--cc-appBackground-surface)`, and `var(--cc-surface1-surface)`.

The `manage_theme` definition itself is a complete literal-value object, not a collection of CSS variable references:

```text
brand.colors: primary, secondary, tertiary -> { light, dark }
text: font; colors.primary, colors.placeholder -> { light, dark }
border: radius.default/small/large; colors.default, colors.weak -> { light, dark }
systemStatus.colors: success, error, warning -> { light, dark }
surface.colors: appBackground, surface1, surface2, surface3 -> { light, dark }
```

Theme definition colors are normally hex values. The selected definition generates the corresponding `--cc-*`
variables at runtime; static component style tokens are passed as raw values such as
`styles.backgroundColor.value = "var(--cc-surface1-surface)"`, without `{{...}}`. Do not invent token names. A
literal hex/RGB value is still appropriate for a deliberate one-off accent, data-series color, or contrast correction
when no semantic token fits. Repeated foundational colors should stay token-backed so theme and light/dark changes
continue to take effect.

## Data tools

| MCP tool | Actions |
|---|---|
| `manage_datasource_connection` | `list_global`, `list_for_app`, `create`, `update`, `delete`, `change_scope`, `get_environment`, `validate_options`, `test`, `test_sample`, `oauth_url`, `authorize_oauth`, `dependencies`, `plugin_dependencies`, `invoke` |
| `manage_query_folder` | `list`, `create`, `rename`, `reorder`, `batch_reorder`, `delete` |
| `manage_query_advanced` | `list`, `preview`, `bulk_update`, `create_workflow_node`, `list_datasource_tables`, `repoint` |
| `manage_tooljet_database` | Table, column, foreign-key, CSV upload, and bounded row CRUD actions |
| `manage_workspace_constant` | Global-constant `list`, `create`, `update`, `delete`, `get_environment`, `get_app`, `get_public_app`; plus secret-metadata `list_secrets` |

The existing focused query/table tools remain preferred for ordinary app building because they have richer static
validation. The platform tools cover UI operations that were previously unavailable.

## Workflow, module, template, and CSS tools

| MCP tool | Actions |
|---|---|
| `manage_workflow_execution` | `create`, `list`, `list_all`, `get`, `status`, `nodes`, `states`, `preview_query_node`, `trigger`, `terminate` |
| `manage_workflow_webhook` | `enable`, `trigger`, `trigger_async`, `status`, `terminate` |
| `manage_workflow_schedule` | `list`, `get`, `create`, `update`, `activate`, `delete` |
| `manage_workflow_package` | `search`, `details`, `versions`, `list_installed`, `update`, `build_status`, `rebuild` |
| `manage_module_resource` | `create`, `update`, `delete`, `export`, `import`, `clone` |
| `manage_template` | `list`, `deploy`, `dependent_plugins` |
| `manage_custom_styles` | `get`, `get_app`, `get_public_app`, `save` |

Workspace/user/profile administration, SCIM, `/api/ext`, onboarding, password/MFA, session/logout, Git sync,
branding/domains/SSO, instance settings/SMTP, plugin administration, audit, licensing/billing, ToolJet AI
administration, telemetry, and payment-webhook endpoints are intentionally not part of this app-builder surface.
