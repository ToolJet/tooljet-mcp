# ToolJet workflow builder

Read this only when creating, editing, validating, or running a ToolJet automation workflow. App Builder page and interaction guidance remains in workflows.md.

## ToolJet workflow authoring

Use the workflow tools for a ToolJet automation graph, not for an app's page-level interaction flow. The supported authoring subset is Start, JavaScript, datasource query, Loop, condition, Agent, and response nodes.

Use this capability-first sequence:

1. Call `get_workflow_node_catalog` for the exact node and patch schema.
2. Call `create_workflow` or `get_workflow` and keep its workflow/version IDs.
3. Call `get_workflow_capabilities(version_id)` to discover configured datasource instances tagged for ordinary queries, AI models, and email.
4. For table intent, call `list_tables`, then inspect only the selected table schema. Fetch `get_datasource_query_schema` for each selected database and email datasource. Agent model options are provider/model parameters rather than an ordinary chat-query prompt contract.
5. Construct one explicit `WorkflowSpec` and call `lint_workflow_spec` by itself. Inspect `runtime_readiness`, `blockers`, errors, and warnings. A clean runnable result includes a scoped, one-use 30-minute `plan_token`; pass that token once to `apply_workflow_spec`.

Missing AI or email datasource capability is a real blocker for a request that requires it. Ask the user to configure the missing datasource in ToolJet; never invent an ID or silently omit that part. Capability discovery deliberately does not scan tables or expose credentials.

For inventory alerting, a typical graph is ToolJet DB read → RunJS low-stock filter → condition → Agent with a configured AI-model attachment → SMTP/SendGrid/Mailgun datasource query → response. Email is an ordinary datasource query. Lint/apply only save its configuration and never send it.

An Agent's `model` object creates its ToolJet child query and `ai-model` attachment. Omitting `model` while patching preserves the current model; `model:null` removes it. Changing the model datasource or query name requires two phases: remove it first, then add the replacement. A reachable Agent without a valid model is `draft_only`; pass `allow_draft:true` only when the user wants that incomplete but editable draft.

The lint call is a no-write barrier. Omitted nodes and edges remain intact; inspect `get_workflow` and specify exact IDs for removals.

`apply_workflow_spec` creates or updates node queries before saving the graph. It never executes, publishes, enables, or configures triggers. A partial-write result identifies resources that persisted before a failure; inspect the workflow and replan instead of blindly recreating anything. Existing drafts are editable, but concurrent visual-editor changes are not protected in this release.

`run_workflow` is separate from authoring and can execute arbitrary JavaScript and datasource writes. Run it only for an explicitly selected version/environment when execution is authorized. Use `get_workflow_execution` to inspect the run and never automatically retry an uncertain execution. JavaScript and response code reference the persisted query `name`, not the logical graph `ref`.
