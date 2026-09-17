import type { ToolJetClient } from '../tooljetClient.js';
import { nodeCatalog } from './graph.js';
import {
  capabilityRequestSchema,
  workflowCapabilityReportSchema,
  type DatasourceCapability,
  type WorkflowCapabilityReport,
  type WorkflowCapabilityRequest,
} from './capabilitySchema.js';

export const AI_DATASOURCE_KINDS = new Set(['openai', 'anthropic', 'gemini', 'mistral_ai']);
export const EMAIL_DATASOURCE_KINDS = new Set(['smtp', 'sendgrid', 'mailgun']);

export function datasourceCapabilities(kind: string): DatasourceCapability[] {
  const capabilities: DatasourceCapability[] = ['query'];
  if (AI_DATASOURCE_KINDS.has(kind)) capabilities.push('ai-model');
  if (EMAIL_DATASOURCE_KINDS.has(kind)) capabilities.push('email');
  return capabilities;
}

export async function getWorkflowCapabilities(
  client: ToolJetClient,
  input: WorkflowCapabilityRequest
): Promise<WorkflowCapabilityReport> {
  const { version_id } = capabilityRequestSchema.parse(input);
  const datasources = await client.workflows.listDatasources(version_id);
  return workflowCapabilityReportSchema.parse({
    version_id,
    authorable_node_types: nodeCatalog.nodes.map((node) => node.type),
    datasources: datasources.map((datasource) => ({
      id: datasource.id,
      name: datasource.name,
      kind: datasource.kind,
      capabilities: datasourceCapabilities(datasource.kind),
    })),
  });
}
