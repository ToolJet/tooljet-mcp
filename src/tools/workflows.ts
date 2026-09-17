import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { nodeCatalog, specSchema, validateGraph } from '../workflows/graph.js';
import { lint, apply, deleteNode } from '../workflows/planner.js';
import { ok, fail, type ToolDef } from './types.js';

const id = z.string().uuid();
const target = { workflow_id: id, version_id: id };
// Keep structured data intact when output is large. Never truncate serialized JSON midway.
function bounded(value: unknown): unknown {
  const serialized = JSON.stringify(value);
  if (serialized.length <= 60_000) return value;
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const execution = data.workflowExecution as Record<string, unknown> | undefined;
  return { truncated: true, execution_id: data.execution_id ?? execution?.id, message: 'Result exceeds 60 KB. Inspect a smaller node-result page or open the workflow in ToolJet.' };
}
export function workflowTools(client: ToolJetClient): ToolDef[] {
  const make = (name: string, title: string, description: string, inputSchema: z.ZodRawShape, effect: 'read' | 'create' | 'write', handler: (args: any) => Promise<unknown>): ToolDef => ({
    name, title, description, inputSchema,
    annotations: { readOnlyHint: effect === 'read', destructiveHint: effect === 'write', openWorldHint: true },
    async handler(args: unknown) {
      try {
        const result = await handler(z.object(inputSchema).strict().parse(args));
        if (result && typeof result === 'object' && 'failed' in result && result.failed) return { ...ok(result), isError: true };
        return ok(result);
      } catch (error) { return fail(error); }
    },
  });
  return [
    make('get_workflow_node_catalog', 'Get Workflow Node Catalog', 'Supported workflow node types, ports and exact authoring schema. Unsupported native nodes are preserved, not authored.', {}, 'read', async () => ({ ...nodeCatalog, spec_schema: z.toJSONSchema(specSchema) })),
    make('list_workflows', 'List Workflows', 'List workflows in the active workspace.', { page: z.number().int().min(1).default(1), search: z.string().default('') }, 'read', args => client.workflows.list(args.page, args.search)),
    make('create_workflow', 'Create Workflow', 'Create an editable ToolJet workflow draft. Does not execute, publish, or configure triggers. Inspect get_workflow before adding its start node.', { name: z.string().trim().min(1).max(100).regex(/^[^/]+$/) }, 'create', args => client.workflows.create(args.name)),
    make('get_workflow', 'Get Workflow', 'Read a workflow graph and query options. Use returned node IDs as existing_id when editing. Omitted version selects the current editing version, which may be read-only.', { workflow_id: id, version_id: id.optional() }, 'read', async args => {
      const snapshot = await client.workflows.get(args.workflow_id, args.version_id);
      return { ...snapshot, queries: await client.workflows.getQueries(snapshot.version_id) };
    }),
    make('lint_workflow_spec', 'Lint Workflow Spec', 'Validate graph edits and query options without executing or saving. Returns a scoped one-use plan token. Omitted nodes/edges are preserved; removals require explicit IDs. Existing query rename/datasource changes are unsupported.', { ...target, spec: specSchema }, 'read', args => lint(client.workflows, args.workflow_id, args.version_id, args.spec)),
    make('apply_workflow_spec', 'Apply Workflow Spec', 'Apply a validated plan to an editable draft and verify readback. May edit/remove graph objects. Partial writes return IDs for recovery; never blindly retry creation. Does not execute or publish.', { plan_token: id }, 'write', args => apply(client.workflows, args.plan_token)),
    make('delete_workflow_node', 'Delete Workflow Node', 'Delete one workflow node and all incident edges. If it owns a query, saves the graph before deleting that query. Does not execute or publish. A failed query deletion leaves only an orphaned query; inspect the returned recovery details before retrying.', { ...target, node_id: id }, 'write', args => deleteNode(client.workflows, args.workflow_id, args.version_id, args.node_id)),
    make('validate_workflow', 'Validate Workflow', 'Check persisted graph structure and query ownership without execution. Does not prove runtime correctness.', target, 'read', async args => {
      const snapshot = await client.workflows.get(args.workflow_id, args.version_id);
      const queries = await client.workflows.getQueries(args.version_id);
      return { workflow_id: args.workflow_id, version_id: args.version_id, ...validateGraph(snapshot.definition, new Set(queries.map(q => q.id))) };
    }),
    make('run_workflow', 'Run Workflow', 'Execute the explicitly selected workflow version/environment with real effects, including datasource writes and arbitrary code. Use only when execution is authorized. Never automatically retry a timeout: execution may have completed. Does not enable disabled workflows.', { ...target, environment_id: id, params: z.record(z.string(), z.unknown()).default({}) }, 'write', async args => bounded(await client.workflows.run(args.workflow_id, args.version_id, args.environment_id, args.params))),
    make('get_workflow_execution', 'Get Workflow Execution', 'Inspect execution status and a bounded page of node results. Does not start or retry executions.', { execution_id: id, page: z.number().int().min(1).default(1), per_page: z.number().int().min(1).max(50).default(20) }, 'read', async args => bounded(await client.workflows.execution(args.execution_id, args.page, args.per_page))),
  ];
}
