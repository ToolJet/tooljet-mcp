import type { ToolJetClient } from './tooljetClient.js';

/** A schema-aware compatibility warning, not a universal SQL validity rule: some
 * ToolJet deployments append order=id to update_rows even for tables without id.
 * Never rewrite the operation: primary-key bulk updates cannot preserve arbitrary
 * where_filters (for example an expected-state/concurrency predicate).
 */
export function updateRowsCompatibilityWarning(
  kind: string | undefined,
  options: Record<string, unknown>,
  tableName: string,
  columns: readonly string[] | undefined
): string | undefined {
  if (kind !== 'tooljetdb' || options.operation !== 'update_rows' || !columns?.length) return;
  if (columns.includes('id')) return;
  return `Table "${tableName}" has no id column, but this query uses update_rows. ` +
    'ToolJet deployments that append order=id to the PATCH will fail even when the filter uses the correct custom primary key. ' +
    'For a new schema, prefer the automatically generated serial id and keep the business reference as a separate unique column. ' +
    'For an existing schema, inspect the primary key and the bulk_update_with_primary_key contract. ' +
    'Use that operation only if it preserves the requested targeting: never drop expected-state, ownership, tenant, or other where_filters to convert the query. ' +
    'If extra predicates are required, use a supported conditional-write operation or report the capability gap. ' +
    'Do not recreate existing tables or execute a mutation just to test compatibility.';
}

/** Read only the schemas needed by the current write-authoring call. No data-query
 * execution; a failed metadata lookup is explicitly unverified, never a no-id claim.
 */
export async function inspectUpdateCompatibility(
  client: ToolJetClient,
  queries: Array<{ name: string; kind?: string; options: Record<string, unknown> }>
): Promise<string[]> {
  const targets = queries.filter(query => query.kind === 'tooljetdb' && query.options.operation === 'update_rows');
  if (!targets.length) return [];
  let tables: Awaited<ReturnType<ToolJetClient['listTables']>>;
  try {
    tables = await client.listTables();
  } catch {
    return ['update_rows primary-key compatibility was not checked: table metadata could not be read.'];
  }
  const checks = new Map<string, Promise<string | undefined>>();
  return (await Promise.all(targets.map(async query => {
    const tableId = query.options.table_id;
    if (typeof tableId !== 'string' || tableId.includes('{{')) {
      return `Query "${query.name}": update_rows primary-key compatibility was not checked for a dynamic or missing table_id.`;
    }
    if (!checks.has(tableId)) checks.set(tableId, (async () => {
      const table = tables.find(item => item.id === tableId);
      if (!table) return 'update_rows primary-key compatibility was not checked: table_id was not found in workspace metadata.';
      try {
        const schema = await client.getTableSchema(table.table_name);
        if (!schema.length) return `Table "${table.table_name}": update_rows primary-key compatibility was not checked because its schema was empty.`;
        return updateRowsCompatibilityWarning('tooljetdb', query.options, table.table_name, schema.map(column => column.name));
      } catch {
        return `Table "${table.table_name}": update_rows primary-key compatibility was not checked because its schema could not be read.`;
      }
    })());
    const warning = await checks.get(tableId);
    return warning ? `Query "${query.name}": ${warning}` : undefined;
  }))).filter((warning): warning is string => !!warning);
}
