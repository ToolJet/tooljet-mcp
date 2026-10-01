import type { ToolJetClient } from './tooljetClient.js';
import { missingCreateRowColumns } from './createRowRequiredColumns.js';
import { arithmeticWriteWarning } from './arithmeticWriteContract.js';

/** This operation targets actual primary-key columns, not arbitrary UNIQUE keys.
 * Only inspect literal key arrays against known metadata; never rewrite targeting. */
export function bulkPrimaryKeyWarning(kind: string | undefined, options: Record<string, unknown>,
  tableName: string, columns: readonly { name: string; primaryKey?: boolean }[] | undefined): string | undefined {
  if (kind !== 'tooljetdb' || options.operation !== 'bulk_upsert_with_primary_key' || !columns?.length) return;
  const config = options.bulk_upsert_with_primary_key as Record<string, unknown> | undefined;
  const keys = config?.primary_key;
  if (!Array.isArray(keys) || !keys.length || keys.some(key => typeof key !== 'string' || key.includes('{{'))) return;
  const invalid = keys.filter(key => !columns.some(column => column.name === key && column.primaryKey));
  if (!invalid.length) return;
  return `bulk_upsert_with_primary_key for "${tableName}" targets non-primary-key column(s) ${invalid.map(key => JSON.stringify(key)).join(', ')}. ` +
    'This operation requires actual PRIMARY KEY columns; a UNIQUE business reference is not sufficient. ' +
    'Use the real primary key, or a supported conditional SQL upsert that preserves the intended matching and concurrency rules. ' +
    'Do not recreate an existing table or change its primary key merely to repair this query.';
}

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

/** Read only the schemas needed by the current write-authoring call (including
 * create_row required fields; export name retained for existing callers). No data-query
 * execution; a failed metadata lookup is explicitly unverified, never a no-id claim.
 */
export async function inspectUpdateCompatibility(
  client: ToolJetClient,
  queries: Array<{ name: string; kind?: string; options: Record<string, unknown> }>
): Promise<string[]> {
  const targets = queries.filter(query => query.kind === 'tooljetdb' &&
    ['update_rows', 'create_row', 'bulk_upsert_with_primary_key'].includes(String(query.options.operation)));
  if (!targets.length) return [];
  let tables: Awaited<ReturnType<ToolJetClient['listTables']>>;
  try {
    tables = await client.listTables();
  } catch {
    return ['Structured-write schema compatibility was not checked: table metadata could not be read.'];
  }
  const schemas = new Map<string, Promise<Awaited<ReturnType<ToolJetClient['getTableSchema']>> | undefined>>();
  return (await Promise.all(targets.map(async query => {
    const tableId = query.options.table_id;
    if (typeof tableId !== 'string' || tableId.includes('{{')) {
      return `Query "${query.name}": structured-write schema compatibility was not checked for a dynamic or missing table_id.`;
    }
    const table = tables.find(item => item.id === tableId);
    if (!table) return `Query "${query.name}": structured-write schema compatibility was not checked: table_id was not found in workspace metadata.`;
    if (!schemas.has(tableId)) schemas.set(tableId, Promise.resolve().then(() => client.getTableSchema(table.table_name)).catch(() => undefined));
    const schema = await schemas.get(tableId);
    if (!schema?.length) return `Query "${query.name}": structured-write schema compatibility was not checked because the schema for "${table.table_name}" was unavailable or empty.`;
    const missing = missingCreateRowColumns(query.options, schema.map(column => ({
      name:column.name,type:column.type,primaryKey:column.isPrimaryKey,notNull:column.isNotNull,defaultValue:column.defaultValue,
    })));
    const warning = missing?.length
      ? `create_row for "${table.table_name}" omits required non-generated column(s) ${missing.map(name => JSON.stringify(name)).join(', ')}. Seed records do not supply values for future inserts. Supply required values or verify an existing database trigger; metadata does not verify triggers. Do not recreate tables to repair this query.`
      : bulkPrimaryKeyWarning('tooljetdb', query.options, table.table_name, schema.map(column => ({name:column.name,primaryKey:column.isPrimaryKey}))) ??
        updateRowsCompatibilityWarning('tooljetdb', query.options, table.table_name, schema.map(column => column.name));
    const arithmetic = arithmeticWriteWarning(query.kind, query.options);
    const combined=[warning,arithmetic].filter(Boolean).join(' ');
    return combined ? `Query "${query.name}": ${combined}` : undefined;
  }))).filter((warning): warning is string => !!warning);
}
