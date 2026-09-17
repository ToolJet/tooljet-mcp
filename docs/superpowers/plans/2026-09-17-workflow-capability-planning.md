# Workflow Capability Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make workflow authoring capability-aware so the MCP can discover configured datasource capabilities, author a complete ToolJet Agent with its AI-model attachment, and distinguish an editable draft from a runnable workflow before any write.

**Architecture:** Follow the app-builder governance pattern: structured dry-run, one-use 30-minute plan token, separate apply, dependency-ordered writes, readback verification, and explicit partial-write recovery. The workflow planner strengthens that pattern by retaining its existing API-origin/credential/workspace scope. Enhance `lint_workflow_spec` as the deterministic planning barrier; do not add a natural-language `plan_workflow` endpoint.

**Tech Stack:** TypeScript, Zod, Vitest, existing ToolJet REST clients, ToolJet workflow definition format.

**Spec:** `docs/workflow-builder-plan.md`

## Global Constraints

- `lint_workflow_spec` and capability discovery are read-only.
- `apply_workflow_spec` never executes, publishes, enables, schedules, or triggers a workflow.
- Preserve opaque existing definition fields and unsupported nodes.
- Use datasource instances available to the selected workspace/environment and workflow version.
- Never return or persist datasource credentials or PAT values.
- Attachment edges are internal dependency edges, not control-flow edges.
- Email remains an ordinary datasource query; creating it must not send an email.
- Use TDD for every production behavior.

---

## App-builder pattern and workflow equivalent

The app builder does not have a natural-language planning endpoint. `lint_app_spec` accepts a structured `AppPlanInput`, reads only required live metadata, resolves logical references, validates the complete phase, and stores a cloned plan for 30 minutes. `apply_app_phase` consumes the token before writes, receives app/version IDs again, rechecks current state, writes dependencies in order, and reports partial persistence.

The app plan store is one-use and TTL-bound, but not credential/workspace scoped. The workflow planner already strengthens it: `src/workflows/planner.ts` stores workflow/version plus deterministic allocated IDs, and `planScope()` hashes API origin, credential, and workspace. Preserve this behavior.

The intended workflow sequence is:

1. Calling agent translates natural language into required capabilities and an explicit `WorkflowSpec`.
2. `get_workflow_capabilities` reports authorable node types and configured datasource instances grouped by capability.
3. Existing metadata tools inspect only relevant tables and datasource query contracts.
4. `lint_workflow_spec` compiles the final graph, validates live datasource availability and runtime prerequisites, and returns a scoped one-use token.
5. `apply_workflow_spec` consumes the exact token, re-runs preflight against current state, writes query dependencies, saves once, and verifies readback.

## Scope

Included:

- Configured datasource capability discovery.
- Exact Agent AI-model child query and attachment edge.
- Agent model preserve/create/update/remove lifecycle.
- Separation of attachment edges from control-flow validation and layout.
- Runtime-readiness output for the final compiled graph, including preserved existing nodes.
- Capability drift handling between lint and apply.
- Capability-first guidance for inventory → low-stock processing → Agent draft → email query.

Deferred:

- Agent tool attachments.
- Nested-workflow authoring.
- Natural-language intent parsing inside the MCP.
- Automatic datasource creation or credential setup.
- Email execution during plan/apply.
- Publishing and trigger configuration.

## Public contracts

~~~ts
type DatasourceCapability = 'query' | 'ai-model' | 'email';

interface WorkflowCapabilityReport {
  version_id: string;
  authorable_node_types: string[];
  datasources: Array<{
    id: string;
    name: string;
    kind: string;
    capabilities: DatasourceCapability[];
  }>;
}

type AgentModelSpec = {
  datasource_id: string;
  name: string;
  options: Record<string, unknown>;
};

type AgentNodeSpec = {
  ref: string;
  type: 'agent';
  existing_id?: string;
  label?: string;
  system_prompt?: string;
  user_prompt?: string;
  output_format?: Record<string, unknown> | null;
  model?: AgentModelSpec | null;
};

interface WorkflowLintResult {
  runtime_readiness: 'runnable' | 'draft_only' | 'blocked';
  blockers: Array<{ code: string; path: string; message: string }>;
  errors: Issue[];
  warnings: Issue[];
  plan_token?: string;
  expires_in_seconds?: number;
}
~~~

Agent model patch semantics:

- Omitted `model` preserves an existing attachment.
- A model object creates an attachment when absent.
- A model object updates options only when datasource and query name match the existing attachment.
- Changing datasource or model query name is rejected; use one explicit phase with `model: null`, then a second phase to add the replacement.
- `model: null` removes the attachment node/edge in the graph save, then deletes its owned query after successful readback.
- Deleting an Agent also removes its owned model child and mapping, saving the graph before deleting the query.
- A reachable Agent without a valid model makes readiness `draft_only`. It receives a plan token only when `allow_draft: true`.
- Structural graph errors make readiness `blocked` and never produce a token.
- A fully satisfied final graph is `runnable`.

ToolJet’s exact Agent model shape:

~~~ts
const modelNode = {
  type: 'query',
  data: {
    idOnDefinition,
    nodeType: 'query',
    kind,
    isChildOfAgent: true,
    agentConnectionType: 'ai-model',
  },
};

const attachmentEdge = {
  source: modelNode.id,
  target: agentNode.id,
  sourceHandle: 'output',
  targetHandle: 'ai-model',
  type: 'custom',
  data: { direction: 'vertical' },
};
~~~

Supported AI provider kinds in the current ToolJet runtime are exactly `openai`, `anthropic`, `gemini`, and `mistral_ai`. Email-capable kinds for this phase are `smtp`, `sendgrid`, and `mailgun`.

## File map

| File | Responsibility |
|---|---|
| `src/workflows/capabilities.ts` | Datasource capability classification and report construction. |
| `src/workflows/capabilitySchema.ts` | Strict request/report schemas. |
| `src/workflows/graph.ts` | Agent model patch contract, internal attachment graph, and edge classification. |
| `src/workflows/planner.ts` | Final-graph preflight, internal query work items, plan/apply lifecycle, cleanup, and readback. |
| `src/tools/workflows.ts` | Public discovery and lint readiness contracts. |
| `tests/workflows/capabilities.test.ts` | Capability classification tests. |
| `tests/workflows/graph.test.ts` | Composite graph and control-flow separation tests. |
| `tests/workflows/planner.test.ts` | Model lifecycle, drift, partial-write, and readback tests. |
| `tests/workflows/tools.test.ts` | Public tool contract tests; create this file. |
| `docs/workflow-builder-plan.md` | Updated authoring architecture and limitations. |
| `skill/references/workflows.md` | Canonical capability-first calling guidance. |
| `skills/tooljet-app-builder/references/workflows.md` | Generated packaged guidance. |
| `scripts/test-workflow-integration.mjs` | PAT-only live acceptance mode. |

---

### Task 1: Add configured datasource capability discovery

**Files:**
- Create: `src/workflows/capabilitySchema.ts`
- Create: `src/workflows/capabilities.ts`
- Create: `tests/workflows/capabilities.test.ts`

**Produces:** `getWorkflowCapabilities(client: ToolJetClient, input): Promise<WorkflowCapabilityReport>`.

- [ ] **Step 1: Write failing classification tests.**

~~~ts
it('classifies only verified provider kinds', async () => {
  const client = fixtureClient({
    datasources: [
      { id: 'ai', name: 'AI', kind: 'openai' },
      { id: 'mail', name: 'Mail', kind: 'smtp' },
      { id: 'named-ai', name: 'OpenAI-like', kind: 'restapi' },
    ],
  });
  const result = await getWorkflowCapabilities(client, { version_id: VERSION_ID });
  expect(result.datasources).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'ai', capabilities: ['query', 'ai-model'] }),
    expect.objectContaining({ id: 'mail', capabilities: ['query', 'email'] }),
    expect.objectContaining({ id: 'named-ai', capabilities: ['query'] }),
  ]));
});

it('reads no table metadata', async () => {
  const client = fixtureClient({ datasources: [] });
  await getWorkflowCapabilities(client, { version_id: VERSION_ID });
  expect(client.listTables).not.toHaveBeenCalled();
});
~~~

- [ ] **Step 2: Verify RED.**

Run: `npx vitest run tests/workflows/capabilities.test.ts --reporter=verbose`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement strict schemas and classification.**

Accept the full `ToolJetClient`. Read datasources through `client.workflows.listDatasources(version_id)`. Return the current `nodeCatalog` types and sanitized datasource identity fields only. Use exact sets:

~~~ts
const AI_KINDS = new Set(['openai', 'anthropic', 'gemini', 'mistral_ai']);
const EMAIL_KINDS = new Set(['smtp', 'sendgrid', 'mailgun']);
~~~

Do not report global blockers or context-free `configured/runnable` flags; readiness belongs to the exact submitted spec.

- [ ] **Step 4: Verify GREEN.**

Run: `npx vitest run tests/workflows/capabilities.test.ts --reporter=verbose`

Expected: PASS; names do not affect classification and no table scan occurs.

- [ ] **Step 5: Commit.**

~~~bash
git add src/workflows/capabilitySchema.ts src/workflows/capabilities.ts tests/workflows/capabilities.test.ts
git commit -m "feat: add workflow capability discovery"
~~~

### Task 2: Expose `get_workflow_capabilities`

**Files:**
- Modify: `src/tools/workflows.ts`
- Create: `tests/workflows/tools.test.ts`

**Consumes:** Task 1.

**Produces:** Read-only `get_workflow_capabilities({ version_id })`.

- [ ] **Step 1: Write a failing public-tool test using valid UUID fixtures.**

~~~ts
it('returns configured workflow capabilities without secrets', async () => {
  const tool = toolNamed(workflowTools(client), 'get_workflow_capabilities');
  const result = await tool.handler({ version_id: VERSION_ID });
  const body = textOf(result);
  expect(body.datasources[0]).toMatchObject({ id: AI_DATASOURCE_ID, capabilities: ['query', 'ai-model'] });
  expect(JSON.stringify(body)).not.toMatch(/apiKey|password|pat|token/i);
});
~~~

- [ ] **Step 2: Verify RED.**

Run: `npx vitest run tests/workflows/tools.test.ts -t "configured workflow capabilities" --reporter=verbose`

Expected: FAIL because the tool does not exist.

- [ ] **Step 3: Register the read-only tool.**

~~~ts
make(
  'get_workflow_capabilities',
  'Get Workflow Capabilities',
  'List authorable workflow node types and configured datasource capabilities for one workflow version. Does not inspect credentials, create resources, or execute queries.',
  capabilityRequestSchema.shape,
  'read',
  args => getWorkflowCapabilities(client, args)
)
~~~

- [ ] **Step 4: Verify GREEN and manifest exposure.**

Run: `npx vitest run tests/workflows/tools.test.ts tests/server.test.ts --reporter=verbose`

Expected: PASS and the new tool appears in the server tool list.

- [ ] **Step 5: Commit.**

~~~bash
git add src/tools/workflows.ts tests/workflows/tools.test.ts tests/server.test.ts
git commit -m "feat: expose workflow capability discovery"
~~~

### Task 3: Compile Agent model attachments without corrupting control flow

**Files:**
- Modify: `src/workflows/graph.ts`
- Test: `tests/workflows/graph.test.ts`

**Produces:** Internal attachment nodes/edges and separate control-flow traversal.

- [ ] **Step 1: Write failing exact-shape tests.**

~~~ts
it('compiles the exact ToolJet Agent model child shape', () => {
  const compiled = compileGraph(empty(), agentModelSpec());
  const child = compiled.graph.nodes.find(node => node.data.agentConnectionType === 'ai-model');
  expect(child).toMatchObject({
    type: 'query',
    data: { kind: 'openai', isChildOfAgent: true, agentConnectionType: 'ai-model' },
  });
  expect(compiled.graph.edges).toContainEqual(expect.objectContaining({
    source: child?.id,
    sourceHandle: 'output',
    targetHandle: 'ai-model',
    data: { direction: 'vertical' },
  }));
});
~~~

- [ ] **Step 2: Write failing control-flow separation tests.**

~~~ts
it('excludes Agent attachment edges and children from flow validation', () => {
  const graph = compileGraph(empty(), agentModelSpec()).graph;
  const validation = validateGraph(graph);
  expect(validation.errors).not.toEqual(expect.arrayContaining([
    expect.objectContaining({ code: 'invalid_port' }),
    expect.objectContaining({ code: 'cycle' }),
  ]));
  expect(validation.warnings).not.toEqual(expect.arrayContaining([
    expect.objectContaining({ path: expect.stringContaining('ai-model') }),
  ]));
});
~~~

- [ ] **Step 3: Verify RED.**

Run: `npx vitest run tests/workflows/graph.test.ts -t "Agent model child|attachment edges" --reporter=verbose`

Expected: FAIL because the Agent model contract and edge categories do not exist.

- [ ] **Step 4: Implement attachment compilation and traversal filters.**

Add `model?: AgentModelSpec | null` to the Agent Zod variant. Introduce internal helpers:

~~~ts
function isAttachmentEdge(edge: GraphEdge): boolean {
  return edge.targetHandle === 'ai-model' || edge.targetHandle === 'tool';
}

function controlFlowEdges(graph: Definition): GraphEdge[] {
  return graph.edges.filter(edge => !isAttachmentEdge(edge));
}
~~~

Use only control-flow edges for source-port validation, cycle detection, reachability, and automatic depth/layout. Validate attachment edges separately. Generated child queries must enter a new internal planner work-item list rather than pretending to be standalone `NodeSpec` values.

- [ ] **Step 5: Implement patch semantics tests and behavior.**

Test and implement:

- Omitted `model` preserves the existing model child/edge.
- Object creates a missing model child.
- Object updates options only when datasource/name match.
- `model: null` removes child/edge/mapping from the compiled graph and schedules query deletion.
- Datasource/name changes return an actionable two-phase replacement error.
- Duplicate `ai-model` attachments are rejected.

- [ ] **Step 6: Verify GREEN.**

Run: `npx vitest run tests/workflows/graph.test.ts --reporter=verbose`

Expected: all graph tests pass, including existing Loop/Agent cases.

- [ ] **Step 7: Commit.**

~~~bash
git add src/workflows/graph.ts tests/workflows/graph.test.ts
git commit -m "feat: model Agent AI attachments in workflow graphs"
~~~

### Task 4: Add internal query work items and safe attachment lifecycle

**Files:**
- Modify: `src/workflows/planner.ts`
- Test: `tests/workflows/planner.test.ts`

**Produces:** A discriminated internal query write independent of public `NodeSpec`.

- [ ] **Step 1: Write failing lifecycle tests.**

Cover:

~~~ts
it('creates and maps an Agent model query before graph save', async () => { /* exact create + readback assertions */ });
it('preserves an existing model when Agent model is omitted', async () => { /* no duplicate query */ });
it('removes the graph attachment before deleting its owned query', async () => { /* call order */ });
it('removes an owned model query when deleting its Agent', async () => { /* no orphan */ });
~~~

- [ ] **Step 2: Write failing drift and failure tests.**

Cover:

~~~ts
it('refuses apply when the model datasource disappeared after lint', async () => { /* no writes */ });
it('reports a created model query when graph save outcome is unknown', async () => { /* recovery IDs */ });
it('rejects readback when child node, attachment edge, mapping, datasource kind, or options differ', async () => { /* exact mismatch */ });
~~~

- [ ] **Step 3: Verify RED.**

Run: `npx vitest run tests/workflows/planner.test.ts -t "Agent model|model datasource|owned model" --reporter=verbose`

Expected: FAIL because generated model children are not planner query writes.

- [ ] **Step 4: Introduce the internal work-item contract.**

~~~ts
type PlannedQueryWrite =
  | {
      role: 'workflow-node';
      node_id: string;
      definition_id: string;
      spec: Extract<NodeSpec, { type: 'javascript' | 'query' | 'loop' }>;
    }
  | {
      role: 'agent-model';
      parent_agent_id: string;
      node_id: string;
      definition_id: string;
      datasource_id: string;
      name: string;
      options: Record<string, unknown>;
    };
~~~

Change `Compiled.query_nodes` to this type. Keep ordinary query behavior unchanged.

- [ ] **Step 5: Implement lint/apply revalidation and cleanup order.**

Both lint and apply call `prepare` against current datasource inventory. Store the cloned user spec and deterministic compiled IDs, not trusted lint-time datasource state. At apply, reject capability drift before writes. Create/update child queries, replace pending mappings, save graph once, verify child node/edge/mapping/query readback, then delete removed owned queries. Preserve current partial-write recovery fields and never clean up after an uncertain graph save.

- [ ] **Step 6: Verify GREEN.**

Run: `npx vitest run tests/workflows/planner.test.ts --reporter=verbose`

Expected: all planner tests pass, including drift and partial-write cases.

- [ ] **Step 7: Commit.**

~~~bash
git add src/workflows/planner.ts tests/workflows/planner.test.ts
git commit -m "feat: persist Agent model query attachments"
~~~

### Task 5: Compute runtime readiness from the final compiled graph

**Files:**
- Create: `src/workflows/readiness.ts`
- Modify: `src/workflows/planner.ts`
- Modify: `src/tools/workflows.ts`
- Test: `tests/workflows/readiness.test.ts`
- Test: `tests/workflows/tools.test.ts`

**Produces:** `runtime_readiness` and stable `blockers` for new and preserved graph content.

- [ ] **Step 1: Write failing readiness tests.**

~~~ts
it('marks a reachable Agent without a model draft_only', () => {
  expect(workflowReadiness(reachableAgentWithoutModel())).toMatchObject({
    runtime_readiness: 'draft_only',
    blockers: [expect.objectContaining({ code: 'agent_missing_model' })],
  });
});

it('checks preserved Agents omitted from the patch spec', async () => {
  const result = await lint(clientWithExistingIncompleteAgent(), WORKFLOW_ID, VERSION_ID, emptyPatch());
  expect(result.runtime_readiness).toBe('draft_only');
  expect(result).not.toHaveProperty('plan_token');
});
~~~

- [ ] **Step 2: Verify RED.**

Run: `npx vitest run tests/workflows/readiness.test.ts tests/workflows/tools.test.ts --reporter=verbose`

Expected: FAIL because readiness is not calculated.

- [ ] **Step 3: Implement readiness semantics.**

Evaluate the final compiled graph and persisted query mappings:

- Structural errors → `blocked`, no token.
- Missing external/runtime prerequisites → `draft_only`.
- `draft_only` gets a token only when lint input has `allow_draft: true`.
- No blockers → `runnable` and normal token.
- Recompute readiness during apply; do not trust lint-time state.
- A disconnected child attachment node is ignored for ordinary reachability, but a reachable parent Agent still requires its model.

- [ ] **Step 4: Verify GREEN.**

Run: `npx vitest run tests/workflows/readiness.test.ts tests/workflows/tools.test.ts --reporter=verbose`

Expected: PASS with valid UUID fixtures and stable blocker paths.

- [ ] **Step 5: Commit.**

~~~bash
git add src/workflows/readiness.ts src/workflows/planner.ts src/tools/workflows.ts tests/workflows/readiness.test.ts tests/workflows/tools.test.ts
git commit -m "feat: report workflow runtime readiness"
~~~

### Task 6: Document capability-first authoring

**Files:**
- Modify: `docs/workflow-builder-plan.md`
- Modify: `skill/references/workflows.md`
- Modify: `skills/tooljet-app-builder/references/workflows.md` through `npm run generate:skill`
- Test: `tests/skill.test.ts`

- [ ] **Step 1: Write a failing guidance test.**

~~~ts
it('requires capability discovery and lint before workflow writes', () => {
  const guidance = readWorkflowGuidance();
  expect(guidance).toMatch(/get_workflow_capabilities/);
  expect(guidance).toMatch(/lint_workflow_spec.*plan_token.*apply_workflow_spec/is);
  expect(guidance).toMatch(/missing.*AI.*email.*datasource.*blocker/is);
});
~~~

- [ ] **Step 2: Verify RED.**

Run: `npx vitest run tests/skill.test.ts -t "capability discovery" --reporter=verbose`

Expected: FAIL because current guidance lacks the capability-first sequence.

- [ ] **Step 3: Document the sequence.**

~~~text
1. get_workflow_node_catalog
2. create_workflow or get_workflow
3. get_workflow_capabilities(version_id)
4. for table intent: list_tables, then inspect only the selected table schema
5. get_datasource_query_schema for each selected database, AI, and email datasource
6. construct explicit WorkflowSpec
7. lint_workflow_spec; inspect runtime_readiness and blockers
8. apply_workflow_spec only with a returned plan token
9. run_workflow only with explicit authorization for external effects
~~~

Use the inventory example:

`ToolJet DB read → RunJS low-stock filter → condition → Agent with configured AI model → SMTP/SendGrid/Mailgun query → response`.

Clarify that email is a generic query, its options use the existing datasource schema validator, and plan/apply create configuration without sending anything.

- [ ] **Step 4: Verify and regenerate.**

Run: `npx vitest run tests/skill.test.ts -t "capability discovery" --reporter=verbose && npm run generate:skill`

Expected: guidance test passes and generated output matches canonical source.

- [ ] **Step 5: Commit.**

~~~bash
git add docs/workflow-builder-plan.md skill skills tests/skill.test.ts
git commit -m "docs: add capability-first workflow planning guidance"
~~~

### Task 7: Package and live acceptance

**Files:**
- Create: `src/workflows/integrationPreflight.ts`
- Modify: `scripts/test-workflow-integration.mjs`
- Create: `tests/workflows/integrationPreflight.test.ts`
- Modify: generated `bundle/index.js`

- [ ] **Step 1: Write a failing helper test.**

~~~ts
it('rejects a live Agent test when the selected datasource is not AI-capable', () => {
  expect(() => assertAgentModelCapability(report, REST_DATASOURCE_ID))
    .toThrow(/not an AI model/i);
});
~~~

- [ ] **Step 2: Verify RED.**

Run: `npx vitest run tests/workflows/integrationPreflight.test.ts --reporter=verbose`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement PAT-only live modes.**

The script uses `TOOLJET_PAT` only. `TOOLJET_TEST_AGENT_MODEL_DATASOURCE_ID` creates and verifies an attachment without executing it. `TOOLJET_TEST_RUN_AGENT=1` separately opts into real execution. No username/password fallback.

- [ ] **Step 4: Run complete verification.**

~~~bash
npm test -- tests/workflows
npx vitest run tests/pluginManifest.test.ts tests/server.test.ts --reporter=verbose
npm run build:plugin
git diff --check
~~~

Expected: all tests pass, TypeScript compiles, tool manifests expose discovery, bundle is rebuilt, and PAT-only auth remains intact.

- [ ] **Step 5: Run live acceptance only when a real AI datasource is configured.**

~~~bash
TOOLJET_PAT=... \
TOOLJET_TEST_AGENT_MODEL_DATASOURCE_ID=... \
node scripts/test-workflow-integration.mjs
~~~

Expected: one model child, one `ai-model` attachment edge, correct query mapping/options, and no Agent execution unless explicitly enabled.

- [ ] **Step 6: Commit.**

~~~bash
git add src/workflows/integrationPreflight.ts scripts/test-workflow-integration.mjs tests/workflows/integrationPreflight.test.ts bundle/index.js
git commit -m "test: verify workflow capability planning"
~~~

## Review checklist

- [ ] Capability discovery reports configured instances without credentials or broad table scans.
- [ ] `lint_workflow_spec` remains the single deterministic workflow planning barrier.
- [ ] App-builder one-use/TTL behavior is preserved and workflow credential/workspace scoping remains stronger.
- [ ] Attachment edges cannot affect ordinary ports, cycles, reachability, or layout.
- [ ] Agent model create/update/preserve/remove and Agent deletion have explicit query ownership behavior.
- [ ] Apply rechecks datasource capability drift before writes.
- [ ] Readiness inspects the final graph, including preserved existing Agents.
- [ ] Email is treated as a generic datasource query and is never executed during plan/apply.
- [ ] All public tool tests use valid UUID inputs.
- [ ] Every production behavior begins with a failing test and ends green.
