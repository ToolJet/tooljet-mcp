/** The shared sample connection is never an AI datasource, including for reads. */
export const SAMPLE_DATASOURCE_REFUSAL =
  'Sample data source is unavailable to AI. Do not inspect, test, read, write, or create queries on it. ' +
  'Use ToolJet Database for new app data, or another connected user-owned datasource.';

export function isSampleDatasource(source: { type?: unknown; name?: unknown }): boolean {
  return String(source.type ?? '').trim().toLowerCase() === 'sample' ||
    String(source.name ?? '').toLowerCase().replace(/[\s_-]+/g, '') === 'sampledatasource';
}

export function assertAiDatasource(source: { type?: unknown; name?: unknown }): void {
  if (isSampleDatasource(source)) throw new Error(SAMPLE_DATASOURCE_REFUSAL);
}
