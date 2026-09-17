# Workflow builder MCP implementation plan

Status: proposed; implementation has not started.
Date: 2026-09-17.
Source baseline: tooljet-mcp `4519d7a`; supplied ToolJet checkout `280f047ce4`.

Confirmed decisions: basic node set; creation and editing existing drafts; runtime execution and inspection included; publishing and trigger setup excluded; concurrent-edit protection deferred. Integration test API: `http://localhost:3000`; editor URL: `http://localhost:8082`.

## 1. Outcome and scope

An agent can discover supported workflow capabilities, create a draft, build a graph from a typed specification, inspect and repair it, and explicitly execute it with test inputs. The result opens as a normal editable workflow in ToolJet.

Use existing ToolJet HTTP APIs. Do not add backend node CRUD APIs for the first release. Keep the app builder working unchanged. Authoring does not release a workflow, activate a schedule/webhook, or execute its nodes.

Initial supported nodes: start, JavaScript query, datasource query, condition, and response. Support normal, true/false, and query success/error connections only where verified against the target runtime. Treat unverified handles as unsupported rather than guessing them.

Deferred: loops, Python, dependency installation and bundle management, nested workflows, AI agents, human approvals, schedules, webhooks, publishing, promotion, and individual node preview. Existing unsupported nodes must remain intact during supported edits.

## 2. Confirmed architecture and unresolved compatibility

Confirmed from the supplied code:

- Workflows are Apps with `type: workflow` and app versions.
- `POST /api/workflows` creates them using `AppCreateDto`; name is required, at most 100 characters, and cannot contain `/`.
- `GET/PUT /api/v2/apps/:appId/versions/:versionId` provides version reads and updates. Workflow content is stored in `definition`.
- The editor saves nodes, edges, query mappings, webhook parameters, default parameters, dependencies, and setup script in that definition.
- Query nodes reference `data.idOnDefinition`; `definition.queries` maps that logical ID to the persisted query ID. Node IDs, definition query IDs, and database query IDs are distinct identities.
- Saving a definition replaces it. Fields outside the intended edit must be preserved.
- Released versions and versions promoted beyond development have editing restrictions. Never send the editor's version-switch override to bypass those restrictions.
- Workflow functionality is edition/license dependent; public base methods include unimplemented stubs.
- Workflow execution, status, details, and node-result APIs exist. Execution must not be assumed to always return an asynchronous job: the inspected execution controller can run synchronously.

Authentication decision (user confirmed): use ToolJet's existing username/password login to obtain a session for development-instance testing, then use the MCP's existing session-token authentication path for workflow requests. The local test runner verified this against the supplied development instance without persisting credentials or session tokens. No PAT endpoint or scope changes are required for this release; PAT support for workflow URLs is deferred. Existing MCP PAT behavior for other features remains unchanged.

Open questions to settle in phase 0:

1. Confirm the current username/password login response and session handoff to the MCP on the test instance. The PAT session exchange route was not found in this checkout, but it is not a blocker for the chosen session-based approach.
2. Verify workspace selection, workflow create/edit/execute authorization, and session-token access on the supported deployment. Keep existing role and license checks intact; defer PAT scope verification to the later PAT integration.
3. Confirm create response fields, initial version status, workflow enabled state, datasource availability, and the editor URL against an actual instance.
4. Confirm readback key casing and retention of arbitrary user keys. Avoid recursive casing conversions of user code, params, or query options.
5. Confirm condition node metadata, branch/error handles, runtime binding syntax, supported joins, and response semantics using representative fixtures and execution.
6. Concurrent-edit protection is deferred by user decision; conditional writes and revision-conflict detection are not release prerequisites.
7. Determine the exact execute endpoint behavior, timeout, execution-ID availability, and version/environment selection. Never enable a disabled workflow automatically just to test it.

## 3. Proposed MCP surface

All names below are proposed contracts. Tool handlers use existing `ToolDef`, Zod, structured success/error helpers, telemetry, and runtime freshness handling.

| Tool | Input | Output / behavior |
|---|---|---|
| `get_workflow_node_catalog` | Optional node types | Catalog revision, supported types, typed config, ports, bindings, examples, compatibility limitations. Static catalog support is distinct from verified server support. |
| `list_workflows` | Search and pagination | Workspace-scoped IDs, names, version metadata, editor URLs. Reuse app listing transport with workflow filtering, not front-end-only assumptions. |
| `create_workflow` | Name | Workflow ID, draft version ID, environment ID, editor URL, creation/readback status. No graph execution. |
| `get_workflow` | Workflow ID, optional version ID, detail level | Compact graph, query references, parameters, editability and validation issues. An omitted version resolves explicitly to an editable draft or returns available versions; never silently edits a release. |
| `lint_workflow_spec` | Target workflow/version, desired spec | Errors, warnings, proposed diff, effect summary, and expiring plan token when valid. Reads allowed; no remote mutations or node execution. |
| `apply_workflow_spec` | Plan token | Persisted ID mappings, applied changes, validation/readback result and partial-write/recovery details. |
| `validate_workflow` | Workflow/version IDs | Structural and reference checks on persisted content; explicit `runtime_verified: false` unless reporting a separately identified execution. |
| `run_workflow` | Workflow/version/environment IDs, params | Explicit execution submission; result and/or execution ID, observed status, and bounded error details. Potentially destructive, non-idempotent, external effects possible. |
| `get_workflow_execution` | Execution ID, optional node/log pagination | Status, outputs, node failures, and bounded logs. Handles running/waiting/terminal states without polling forever. |

Read tools are marked read-only. Create/apply are mutations; apply may remove graph objects and must have conservative destructive annotations. Run is never advertised as a read or dry run. Annotations describe effects; they do not themselves implement authorization.

## 4. Specification and compilation

Use a versioned `WorkflowSpec` with discriminated node schemas. Callers supply logical refs; the compiler handles ToolJet storage details.

Conceptual example, not a verified ToolJet wire payload:

```json
{
  "schema_version": 1,
  "nodes": [
    { "ref": "start", "type": "start" },
    { "ref": "calculate", "type": "javascript", "code": "return { total: 42 };" },
    { "ref": "respond", "type": "response", "code": "return { ok: true };", "status_code": 200 }
  ],
  "edges": [
    { "ref": "begin", "from": "start", "to": "calculate", "port": "default" },
    { "ref": "finish", "from": "calculate", "to": "respond", "port": "success" }
  ],
  "test_parameters": {}
}
```

Detailed schema decisions:

- Separate logical node types from renderer types (e.g. start versus ToolJet's input renderer).
- Each node/edge has a unique stable ref; existing nodes may specify an existing ID. Carry explicit ref-to-ID mappings in tool results rather than relying on undocumented server fields.
- Datasource queries specify datasource ID, query kind/name, and options validated with existing datasource contracts. JavaScript nodes create the correct built-in query kind through the same query layer.
- Use explicit node configuration variants for conditions and response status/code. Do not expose arbitrary unvalidated raw node objects as the normal authoring interface.
- Use structured JSON for test parameters and serialize to the editor's required representation at the adapter boundary.
- Parameters omitted from an update are retained. The initial release cannot change dependency bundles, setup scripts, webhook activation, or schedules.
- Existing query IDs must belong to the target version and authorized workspace. Reject attaching foreign resources.
- Do not rewrite identifiers inside arbitrary JavaScript with text substitution. Validate known references, preserve code, and report unresolved dynamic references as warnings.
- Apply deterministic left-to-right layout for new nodes. Retain existing positions; explicit positions take precedence. Keep branch lanes readable and avoid overlapping nodes.

## 5. Update and deletion semantics

Use patch semantics in v1: the spec contains node/edge upserts and explicit `remove_node_refs` / `remove_edge_refs`. Omission never means deletion. This avoids losing unsupported nodes or editor-authored content.

`lint_workflow_spec` reads the complete current graph, merges the patch, compiles the proposed result, and validates the entire result. Removing a node requires explicit incident-edge removals or an explicitly requested cascade represented in the previewed diff. Removing a query-backed node removes its graph mapping when unused; deleting the underlying query is deferred and never implicit.

Changes to shared existing query objects can affect other nodes. Detect that sharing and either show every affected node in the plan or require a dedicated replacement query. Do not silently mutate a query used outside the planned edit.

Preserve unknown definition and node fields. Unsupported nodes can be retained and inspected, but cannot be created or have their opaque configuration rewritten by v1 tools. Report validation coverage rather than claiming those nodes are fully validated.

## 6. Validation rules

Blocking errors:

- Wrong app type, workspace/version mismatch, inaccessible resources, or noneditable target.
- Missing/duplicate refs or IDs, nonexistent edge endpoints, dangling query mappings.
- Missing or multiple start nodes, inbound edges to start, invalid handles, outgoing response edges, or unsupported node configuration.
- Unsupported directed cycles in the initial subset. Loop constructs remain deferred.
- Invalid query schema, incompatible datasource kind, malformed test JSON, or invalid response status configuration.
- Duplicate query names or names incompatible with the runtime binding contract.
- Expired/reused plan token, or plan scoped to another session/workspace/version.

Warnings or explicitly limited checks:

- Unreachable nodes, incomplete branches, paths without responses, and potentially ambiguous joins; promote to errors only when required by verified engine semantics.
- JavaScript syntax can be checked, but dynamic correctness and external data shape cannot be proven statically.
- Parse known runtime references where reliable; avoid claiming complete JavaScript dependency analysis.
- Disabled workflows, unavailable runtime capabilities, unsupported retained nodes, and missing runtime verification.

Return issues with stable codes and precise node/edge/property paths so an agent can repair them without resending the entire graph.

## 7. Apply algorithm and recovery

1. Retrieve the plan; verify session/workspace scope, expiry, target IDs, spec hash, and supported catalog revision.
2. Re-read version and referenced queries; verify ownership and editability and merge the planned changes into the current definition. Concurrent-edit conflict detection is deferred.
3. Reserve/consume the token once mutation begins to prevent duplicate concurrent applications. A validation failure before mutation may be safely replanned.
4. Create/update required queries in dependency order. Record every completed operation and returned ID. Never run queries to validate creation.
5. Resolve query IDs and compile the merged definition while preserving unrelated fields.
6. Save the definition once through the existing version API.
7. Read back graph and queries, compare intended semantic changes, and run persisted validation. Return verified state and editor URL.

If any request fails, return phase, completed writes, known IDs, failed operation, and whether graph persistence is confirmed, absent, or uncertain. Retain created resources; do not auto-delete them. A query edit that succeeds before a graph-save failure is also a partial write and must be reported.

For ambiguous network outcomes, read/reconcile before retrying. Do not blindly repeat create or execution requests. A one-time plan token is a duplicate-prevention mechanism, not durable server idempotency. After a process restart, recover from server state and known IDs; do not pretend an in-memory journal survived.

Concurrent-edit protection is outside this release. Full-definition saves may overwrite simultaneous editor changes; document this limitation. Revision checks or server-side compare-and-swap can be added later.

## 8. Execution behavior

- Resolve an explicit version and environment; do not silently select production or a released version.
- Reuse existing execution-policy conventions, while treating arbitrary JavaScript and datasource writes as potentially effectful. A test run has real effects; validation remains separate.
- Do not add blanket repeated confirmation prompts when the user already authorized the concrete execution. Surface effects so the calling agent can respect the requested scope.
- Handle inline completion and execution-ID responses. Use bounded status polling only when the API provides an ID; log waiting/suspended states without treating them as success.
- An HTTP timeout is not evidence that execution stopped. Return an unknown outcome and available IDs; never auto-resubmit.
- Bound output/log size, paginate node results, redact credentials, and keep sensitive params out of telemetry. Do not claim arbitrary returned business data is secret-free.

## 9. Code organization

Proposed new modules:

| Area | Files |
|---|---|
| Contracts | `src/workflows/types.ts`, `schema.ts`, `catalog.ts` |
| Pure graph logic | `compiler.ts`, `validation.ts`, `layout.ts` |
| Orchestration | `planStore.ts`, `apply.ts`, `execution.ts` |
| HTTP adapter | `src/workflowClient.ts`, composed with existing auth and query client |
| MCP tools | `src/tools/workflows/*.ts`, registered in `src/tools/index.ts` |
| Shipped catalog | `data/workflow-node-schemas.json` with schema/provenance version |
| Tests | `tests/workflows/*.test.ts` and minimal sanitized wire fixtures |
| Guidance | Workflow-builder skill source plus generated/packaged outputs |

Reuse existing auth, workspace selection, query schemas, error conventions, telemetry, and runtime freshness. Extract narrowly needed shared transport helpers; avoid a broad client rewrite. Plan storage must be scoped to the authenticated client/session, especially in HTTP mode; do not copy the app plan store's global map unchanged.

Verify plugin manifests, npm package inclusion, skill generation/sync, bundle asset paths, and HTTP/stdio exposure. Generated skill output must have one canonical source. Add workflow routing to the existing app-builder guidance and keep the workflow-specific reference focused on actual workflow automation.

## 10. Delivery phases and gates

| Phase | Deliverable | Acceptance gate |
|---|---|---|
| 0 — Compatibility | Session-auth/API matrix, wire fixtures, supported version baseline | Username/password login yields a session usable through the MCP's session-token path to create/read/save a disposable draft and access its queries. Role/license/session errors are differentiated. PAT support is deferred and does not block this phase. |
| 1 — Read/create foundation | Workflow client, catalog, list/create/get tools | Create response resolves to a real editable version and working editor URL; reads preserve user keys and graph data. |
| 2 — Pure planning | Typed spec, compiler, layout, validator, scoped plan store, lint tool | Representative graphs compile deterministically; invalid graphs fail before writes; opaque content survives merges. |
| 3 — Apply and repair | Apply/validate tools and partial-write reconciliation | Start → JS → response opens correctly; reapplying a consumed token is refused; invalid plans and injected failures produce actionable results. |
| 4 — Runtime | Explicit run and execution-inspection tools | Test outputs, branches, query failures, timeouts, and inline/async result shapes are correctly represented. |
| 5 — Packaging and release readiness | Skill, examples, docs, bundle, regression suite | Packaged MCP exposes tools and catalog; app builder regression tests pass; development-instance editor and runtime checks pass. |

Suggested implementation PR boundaries: foundation/contracts; planner/apply; execution and packaging. Each PR includes relevant tests. Phases proceed in order; no backend node APIs are a prerequisite.

## 11. Test matrix and definition of done

Unit tests: schema discrimination, ID mapping, handles, reachability/cycles, query ownership, opaque-field preservation, deterministic layout, patch/removal behavior, token expiry/scope/concurrent consumption.

HTTP contract tests: create/get/save/query payloads, response casing, 401/403/404/license errors, immutable versions, synchronous completion, execution-ID responses, bounded logs, and uncertain network outcomes. Fixtures must be minimal and sanitized; do not copy private implementation source into the MCP package.

Failure tests: second query create fails; existing query update succeeds then graph save fails; graph save times out but persisted; session/workspace changes; restart loses plan; execution timeout does not trigger resubmission.

Development-instance scenarios:

1. Start → JavaScript → response; assert exact output and open/reload in editor.
2. Datasource read → condition → two responses; exercise both branches using controlled fixture data.
3. Query failure → supported error branch; verify node-level diagnosis.
4. Read/modify an existing draft with parameters and unknown definition fields; assert preservation and stable IDs.
5. Add a node to an existing graph without moving unrelated nodes; verify editor layout.
6. Denied license/role, wrong workspace, expired session, disabled workflow, released/promoted version, and foreign query ID fail clearly. PAT-scope tests belong to the deferred PAT integration.
7. Confirm lint/apply/validate produce no workflow execution and no external datasource writes.

Commands after implementation: focused Vitest tests, `npm run build`, `npm test`, and `npm run build:plugin`; run skill/catalog generation checks appropriate to the final packaging design. Do not use live credentials in fixtures or test logs.

Done means a packaged MCP can create, inspect, modify, validate, and explicitly test a supported draft workflow; saved graphs survive editor reload; known failures are recoverable; limitations are documented; existing app building remains functional. Advanced node types and release automation are separate follow-up scope.

## 12. Source references

ToolJet public source paths relative to the supplied ToolJet checkout:

- `frontend/src/_services/app.service.js`: workflow creation routing.
- `server/src/modules/apps/dto/index.ts`: creation DTO.
- `server/src/modules/versions/controller.v2.ts`: version read/write routes.
- `server/src/dto/app-version-update.dto.ts`: workflow definition update field.
- `server/src/modules/apps/util.service.ts`, `updateWorflowVersion`: definition replacement and edit restrictions.
- `server/src/modules/workflows/controllers/workflow-executions.controller.ts`: execution/status/node inspection contracts.
- `server/src/dto/create-workflow-execution.dto.ts`: execution inputs.
- `server/src/modules/workflows/AGENTS.md`: edition/runtime overview.

MCP references: `src/auth.ts`, `src/tooljetClient.ts`, `src/tools/index.ts`, `src/tools/applyAppPhase.ts`, `src/appPlanStore.ts`, `src/queryExecutionSafety.ts`, `scripts/build-plugin.mjs`, and `scripts/generate-skill.mjs`.

Runtime/editor details were also checked in the user's local edition-specific implementation. Those details need deployment contract tests before being declared supported. This plan contains no copied private implementation code.
