/**
 * Which branch a SQL connector runs for a saved query's options (CM-37).
 *
 * The read classifier treated every GUI query of a SQL connector as list_rows, so a PostgreSQL GUI `delete_rows`
 * with `limit: 1` passed as a one-row read and the automatic read check after code_app_data deleted a real row.
 * Each ToolJet SQL connector picks its branch by its own field, and reads its row bound from its own place:
 *
 * - postgresql, mysql, mssql switch on `mode`: 'sql' runs `query`, 'gui' runs `operation`, anything else throws
 *   before running anything (plugins/packages/<kind>/lib/index.ts, the `switch (queryOptions.mode)` in run).
 * - mariadb, oracledb, snowflake, databricks run `operation` when `mode` is 'gui' and their SQL text otherwise.
 * - In GUI mode only `list_rows` reads. It is bounded by the top-level `limit` (and `offset`): the connector passes
 *   only those to the query builder, so a `list_rows.limit` is ignored and the read is unbounded
 *   (plugins/packages/common/lib/queryBuilder.ts listRows; postgresql handleGuiQuery).
 * - bigquery, clickhouse, cosmosdb, couchbase, salesforce and harperdb run their SQL text only for one operation or
 *   mode, and something else (a delete, an insert) for the others, whatever text the options also carry.
 *
 * ToolJet Database is not here: its operations are its own (queryExecutionSafety.ts).
 */

export type SqlDialect = 'postgresql' | 'mysql' | 'mssql' | 'oracle';

export type SqlConnectorPath =
  /** The connector runs the SQL text in `field`. */
  | { path: 'sql'; field: string; sql?: string }
  /** The connector runs GUI list_rows, bounded by the top-level limit. */
  | { path: 'gui_list_rows' }
  /** The connector runs something that is not a read this module can name, or throws. */
  | { path: 'not_read'; reason: string };

const LABELS: Record<string, string> = {
  postgresql: 'PostgreSQL', mysql: 'MySQL', mssql: 'SQL Server', mariadb: 'MariaDB', oracledb: 'Oracle',
  snowflake: 'Snowflake', databricks: 'Databricks', bigquery: 'BigQuery', clickhouse: 'ClickHouse',
  cosmosdb: 'Cosmos DB', couchbase: 'Couchbase', salesforce: 'Salesforce', harperdb: 'HarperDB',
};

/** Connectors that throw unless `mode` is exactly 'sql' or 'gui'. */
const MODE_SWITCH = new Set(['postgresql', 'mysql', 'mssql']);
/** Connectors that run GUI operations when `mode` is 'gui' and their SQL text otherwise. */
const GUI_ELSE_SQL = new Set(['mariadb', 'oracledb', 'snowflake', 'databricks']);
/** Kinds with a GUI mode at all. */
export const GUI_SQL_KINDS = new Set([...MODE_SWITCH, ...GUI_ELSE_SQL]);

/** The SQL dialect a connector's text is parsed in, where the automatic check knows it. */
export const SQL_DIALECT: Record<string, SqlDialect> = {
  postgresql: 'postgresql', tooljetdb: 'postgresql', mysql: 'mysql', mariadb: 'mysql', mssql: 'mssql', oracledb: 'oracle',
};

/** For connectors that dispatch on `operation`, the one operation that runs the SQL text, and its field. */
const SQL_OPERATION: Record<string, { operation: string; field: string }> = {
  clickhouse: { operation: 'sql', field: 'query' },
  cosmosdb: { operation: 'query_database', field: 'query' },
  couchbase: { operation: 'query', field: 'query' },
  salesforce: { operation: 'soql', field: 'soql_query' },
};

/** The nested list_rows keys a GUI SQL connector reads; anything else there is ignored by it. */
export const GUI_LIST_ROWS_KEYS = new Set(['where_filters', 'order_filters', 'aggregates', 'group_by']);

const text = (options: Record<string, unknown>, field: string): string | undefined => {
  const value = options[field];
  return typeof value === 'string' && value.trim() ? value : undefined;
};

export const connectorLabel = (kind: string): string => LABELS[kind] ?? kind;

/**
 * The branch `kind` runs for `options`, or undefined for a kind this module does not model (its SQL text is then
 * found by the generic field search). `kind` is lowercased.
 */
export function sqlConnectorPath(kind: string, options: Record<string, unknown>): SqlConnectorPath | undefined {
  const label = connectorLabel(kind);
  const mode = options.mode;
  const operation = options.operation;
  if (GUI_SQL_KINDS.has(kind)) {
    if (mode === 'gui') {
      if (operation === 'list_rows') return { path: 'gui_list_rows' };
      return {
        path: 'not_read',
        reason: typeof operation === 'string' && operation
          ? `${label} GUI operation "${operation}" is not a read (only list_rows reads).`
          : `${label} GUI query names no operation; only list_rows reads.`,
      };
    }
    const field = kind === 'databricks' && !text(options, 'query') ? 'sql_query' : 'query';
    return { path: 'sql', field, sql: text(options, field) };
  }
  if (kind === 'bigquery') {
    if (mode === 'sql' || operation === 'query') return { path: 'sql', field: 'query', sql: text(options, 'query') };
    return {
      path: 'not_read',
      reason: `BigQuery runs SQL text only in mode "sql" or operation "query"; this query runs operation "${String(operation ?? '<missing>')}".`,
    };
  }
  if (kind === 'harperdb') {
    if (mode !== undefined && mode !== 'sql') {
      return { path: 'not_read', reason: `HarperDB runs SQL text only in mode "sql"; this query is in mode "${String(mode)}".` };
    }
    return { path: 'sql', field: 'sql_query', sql: text(options, 'sql_query') };
  }
  const sqlOperation = SQL_OPERATION[kind];
  if (sqlOperation) {
    if (typeof operation === 'string' && operation && operation !== sqlOperation.operation) {
      return {
        path: 'not_read',
        reason: `${label} runs SQL text only for operation "${sqlOperation.operation}"; this query runs operation "${operation}".`,
      };
    }
    return { path: 'sql', field: sqlOperation.field, sql: text(options, sqlOperation.field) };
  }
  return undefined;
}
