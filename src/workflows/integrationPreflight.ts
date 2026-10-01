export function assertAgentModelCapability(
  report: { datasources: ReadonlyArray<{ id: string; capabilities: readonly string[] }> },
  datasourceId: string
) {
  const datasource = report.datasources.find(candidate => candidate.id === datasourceId);
  if (!datasource) throw new Error(`Datasource ${datasourceId} is not available to this workflow version.`);
  if (!datasource.capabilities.includes('ai-model')) throw new Error(`Datasource ${datasourceId} is not an AI model datasource.`);
  return datasource;
}
