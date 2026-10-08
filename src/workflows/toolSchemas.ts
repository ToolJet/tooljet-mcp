import { z } from 'zod';
import { specSchema } from './graph.js';

export const workflowIdSchema = z.string().uuid();
export const workflowTargetShape = {
  workflow_id: workflowIdSchema,
  version_id: workflowIdSchema,
};

export const listWorkflowsInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  search: z.string().default(''),
}).strict();

export const createWorkflowInputSchema = z.object({
  name: z.string().trim().min(1).max(100).regex(/^[^/]+$/),
}).strict();

export const getWorkflowInputSchema = z.object({
  workflow_id: workflowIdSchema,
  version_id: workflowIdSchema.optional(),
}).strict();

export const lintWorkflowSpecInputSchema = z.object({
  ...workflowTargetShape,
  spec: specSchema,
  allow_draft: z.boolean().default(false),
}).strict();

export const applyWorkflowSpecInputSchema = z.object({
  plan_token: workflowIdSchema,
}).strict();

export const deleteWorkflowNodeInputSchema = z.object({
  ...workflowTargetShape,
  node_id: workflowIdSchema,
}).strict();

export const validateWorkflowInputSchema = z.object(workflowTargetShape).strict();

export const runWorkflowInputSchema = z.object({
  ...workflowTargetShape,
  environment_id: workflowIdSchema,
  params: z.record(z.string(), z.unknown()).default({}),
}).strict();

export const getWorkflowExecutionInputSchema = z.object({
  execution_id: workflowIdSchema,
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(50).default(20),
}).strict();
