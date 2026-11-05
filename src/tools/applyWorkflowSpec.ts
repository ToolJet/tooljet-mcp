import type { ToolJetClient } from '../tooljetClient.js';
import { z } from 'zod';
import { apply, lint } from '../workflows/planner.js';
import { nodeSchema, specSchema } from '../workflows/graph.js';
import { applyWorkflowSpecInputSchema, workflowTargetShape } from '../workflows/toolSchemas.js';
import { fail, ok, type ToolDef } from './types.js';

export function applyWorkflowSpecTool(client: ToolJetClient): ToolDef {
  return {
    name: 'apply_workflow_spec',
    title: 'Apply Workflow Spec',
    description: 'Apply a validated authoring plan to an editable draft and verify readback. Saves node/edge configuration, creates or updates the associated query definitions, removes explicitly deleted graph objects and their obsolete queries, and optionally saves test parameters. Does not execute node code, send datasource requests, run the workflow, or publish. The same authoring actions are individually exposed as upsert_workflow_<type>_node, upsert_workflow_edge, delete_workflow_edge, delete_workflow_node, and set_workflow_test_parameters. Partial writes return IDs for recovery; never blindly retry creation.',
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    inputSchema: applyWorkflowSpecInputSchema.shape,
    async handler(args: unknown) {
      try {
        const input = applyWorkflowSpecInputSchema.parse(args);
        const result = await apply(client.workflows, input.plan_token);
        return result && typeof result === 'object' && 'failed' in result && result.failed
          ? { ...ok(result), isError: true }
          : ok(result);
      } catch (error) {
        return fail(error);
      }
    },
  };
}

// Shared schemas do not capture a user/client. Fixed node types cannot be overridden by callers.
const mutationInputs = [
  ...nodeSchema.options.map(node => {
    const type = node.shape.type.value;
    return {
      name: `upsert_workflow_${type}_node`,
      title: `Upsert Workflow ${type[0]!.toUpperCase() + type.slice(1)} Node`,
      description: `Create or edit one ${type} node in an editable workflow draft. Existing_id edits the same node; omission creates a node. Stores configuration and any associated query definition without executing its code or datasource operation.`,
      schema: z.object({ ...workflowTargetShape, node: z.object(Object.fromEntries(Object.entries(node.shape).filter(([key]) => key !== 'type'))).strict(), allow_draft: z.boolean().default(true) }).strict(),
      spec: (args: any) => ({ nodes: [{ ...args.node, type }] }),
    };
  }),
  {
    name: 'upsert_workflow_edge', title: 'Upsert Workflow Edge',
    description: 'Create or edit one control-flow edge in an editable workflow draft. Use existing node IDs for from/to; existing_id edits an edge. Never executes the graph.',
    schema: z.object({ ...workflowTargetShape, edge: specSchema.shape.edges.unwrap().element, allow_draft: z.boolean().default(true) }).strict(),
    spec: (args: any) => ({ edges: [args.edge] }),
  },
  {
    name: 'delete_workflow_edge', title: 'Delete Workflow Edge',
    description: 'Remove one explicitly selected control-flow edge from an editable workflow draft, preserving nodes and other edges. Never executes the graph.',
    schema: z.object({ ...workflowTargetShape, edge_id: z.string().min(1), allow_draft: z.boolean().default(true) }).strict(),
    spec: (args: any) => ({ remove_edge_ids: [args.edge_id] }),
  },
  {
    name: 'set_workflow_test_parameters', title: 'Set Workflow Test Parameters',
    description: 'Replace the saved default test parameters of an editable workflow draft. Saves data only; does not start a test or execute the workflow.',
    schema: z.object({ ...workflowTargetShape, parameters: z.record(z.string(), z.unknown()), allow_draft: z.boolean().default(true) }).strict(),
    spec: (args: any) => ({ test_parameters: args.parameters }),
  },
];

export function workflowMutationTools(client: ToolJetClient): ToolDef[] {
  return mutationInputs.map(({ name, title, description, schema, spec }) => ({
    name, title, description: description + ' Uses the same scoped planning, validation, one-use token, partial-write reporting, and readback as apply_workflow_spec. allow_draft defaults true so an incomplete draft can be edited.',
    strictInput: true,
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    inputSchema: schema.shape,
    async handler(input: unknown) {
      try {
        const args = schema.parse(input);
        const planned = await lint(client.workflows, args.workflow_id, args.version_id, specSchema.parse(spec(args)), args.allow_draft);
        if (!('plan_token' in planned)) return { ...ok(planned), isError: true };
        const result = await apply(client.workflows, planned.plan_token);
        return 'failed' in result && result.failed ? { ...ok(result), isError: true } : ok(result);
      } catch (error) { return fail(error); }
    },
  }));
}
