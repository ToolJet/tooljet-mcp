import { z } from 'zod';

export const capabilityRequestSchema = z.object({
  version_id: z.string().uuid(),
}).strict();

export const datasourceCapabilitySchema = z.enum(['query', 'ai-model', 'email']);

export const workflowCapabilityReportSchema = z.object({
  version_id: z.string().uuid(),
  authorable_node_types: z.array(z.string()),
  datasources: z.array(z.object({
    id: z.string(),
    name: z.string(),
    kind: z.string(),
    capabilities: z.array(datasourceCapabilitySchema),
  }).strict()),
}).strict();

export type WorkflowCapabilityRequest = z.infer<typeof capabilityRequestSchema>;
export type WorkflowCapabilityReport = z.infer<typeof workflowCapabilityReportSchema>;
export type DatasourceCapability = z.infer<typeof datasourceCapabilitySchema>;
