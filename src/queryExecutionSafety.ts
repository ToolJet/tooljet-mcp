import type { QuerySummary, RunQueryResult } from './tooljetClient.js';

export const LARGE_READ_ROW_THRESHOLD = 1000;

const SQL_KINDS = new Set([
  'postgresql', 'mysql', 'mariadb', 'mssql', 'sqlserver', 'cockroachdb', 'redshift',
  'snowflake', 'bigquery', 'clickhouse', 'oracle', 'oracledb', 'sqlite',
]);

const BILLABLE_SCAN_SQL_KINDS = new Set(['bigquery', 'snowflake', 'redshift']);

interface ReadSource {
  kind: 'sql_table' | 'table_id' | 'gui_table' | 'remote_endpoint';
  value: string;
}

export interface QueryReadAssessment {
  provenRead: boolean;
  directSafe: boolean;
  countOnly: boolean;
  selectStar: boolean;
  requiresCountPreflight: boolean;
  requiresBillableReadConfirmation?: boolean;
  /** Remote API reads may expose sensitive data, consume quota, or return an unbounded payload. */
  requiresRemoteReadConfirmation?: boolean;
  /** True only when a count covers the entire simple source and can upper-bound a target read. */
  fullSourceCount?: boolean;
  /** True only for a single-table read whose cardinality is upper-bounded by a full-source count. */
  simpleSourceRead?: boolean;
  datasourceKind?: string;
  datasourceId?: string;
  source?: ReadSource;
  maxRows?: number;
  reason?: string;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function staticPositiveInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  if (typeof value !== 'string') return undefined;
  const match = value.trim().match(/^(?:\{\{\s*)?(\d+)(?:\s*\}\})?$/);
  return match ? Number(match[1]) : undefined;
}

function containsBinding(value: unknown): boolean {
  if (typeof value === 'string') return value.includes('{{');
  if (Array.isArray(value)) return value.some(containsBinding);
  return !!record(value) && Object.values(record(value)!).some(containsBinding);
}

/* ServiceNow's Table API, split by effect.

   Without this, every ServiceNow query fell through to "no proven read classifier" and was refused
   before execution, so a connected ServiceNow instance could not be used to build anything: the
   agent could not run a single query to check its own work, and gave up with an empty app. Measured
   on a real build against a live ServiceNow datasource.

   Reads are proven but never directSafe, for the same reason REST GET is not: they cross into a
   remote system, where they consume quota and can return data the user did not expect to expose. */
const SERVICENOW_ROW_READS = new Set(['list_records']);
const SERVICENOW_SINGLE_READS = new Set(['get_record', 'aggregate']);
const SERVICENOW_METADATA_READS = new Set([
  'list_tables',
  'get_table_schema',
  'get_field_choices',
  'list_workflows',
  'list_flows',
]);

function assessServiceNow(options: Record<string, unknown>, datasourceId?: string): QueryReadAssessment {
  const identity = { datasourceKind: 'servicenow', ...(datasourceId ? { datasourceId } : {}) };
  const operation = typeof options.operation === 'string' ? options.operation.toLowerCase() : undefined;
  const table = typeof options.table === 'string' ? options.table.trim() : '';
  const source = table
    ? ({ kind: 'remote_endpoint', value: `servicenow:${table}` } as QueryReadAssessment['source'])
    : undefined;
  const refuse = (reason: string): QueryReadAssessment => ({
    provenRead: false, directSafe: false, countOnly: false, selectStar: false,
    requiresCountPreflight: false, reason, ...identity,
  });

  if (!operation) return refuse('ServiceNow query has no operation.');

  // create/update/delete change records; invoke_workflow and trigger_flow start work inside
  // ServiceNow. None of them may be run to "see what happens".
  if (!SERVICENOW_ROW_READS.has(operation) && !SERVICENOW_SINGLE_READS.has(operation)
      && !SERVICENOW_METADATA_READS.has(operation)) {
    return refuse(`ServiceNow operation ${operation} is not a read; it can change ServiceNow state.`);
  }

  const remote = {
    provenRead: true as const, directSafe: false as const, selectStar: false as const,
    requiresCountPreflight: false as const, requiresRemoteReadConfirmation: true as const,
    ...(source ? { source } : {}), ...identity,
  };

  if (SERVICENOW_SINGLE_READS.has(operation)) {
    // get_record returns one record; aggregate returns one computed row.
    return { ...remote, countOnly: operation === 'aggregate', maxRows: 1,
      reason: `ServiceNow ${operation} reads remote data and consumes API quota.` };
  }

  if (SERVICENOW_METADATA_READS.has(operation)) {
    return { ...remote, countOnly: false,
      reason: `ServiceNow ${operation} reads remote metadata and consumes API quota.` };
  }

  // list_records: bounded only by sysparm_limit, which the plugin passes through as a string.
  const maxRows = staticPositiveInteger(options.sysparm_limit);
  if (maxRows === undefined) {
    return {
      ...remote, countOnly: false, requiresCountPreflight: true,
      reason: 'ServiceNow list_records has no static sysparm_limit, so its result size cannot be bounded.',
    };
  }
  if (maxRows > LARGE_READ_ROW_THRESHOLD) {
    return {
      ...remote, countOnly: false, requiresCountPreflight: true, maxRows,
      reason: `ServiceNow list_records can return up to ${maxRows} rows, above the ${LARGE_READ_ROW_THRESHOLD}-row safety threshold.`,
    };
  }
  return { ...remote, countOnly: false, maxRows, simpleSourceRead: true,
    reason: 'ServiceNow list_records reads remote data and consumes API quota.' };
}

function assessRestGet(options: Record<string, unknown>, datasourceId?: string): QueryReadAssessment {
  const identity = { datasourceKind: 'restapi', ...(datasourceId ? { datasourceId } : {}) };
  const method = typeof options.method === 'string' ? options.method.toLowerCase() : undefined;
  if (method !== 'get') {
    return {
      provenRead: false, directSafe: false, countOnly: false, selectStar: false,
      requiresCountPreflight: false,
      reason: `REST method ${method ?? '<missing>'} is not a proven read; only static GET queries can be previewed.`,
      ...identity,
    };
  }
  const url = typeof options.url === 'string' ? options.url.trim() : '';
  if (!url || containsBinding(url)) {
    return {
      provenRead: false, directSafe: false, countOnly: false, selectStar: false,
      requiresCountPreflight: false,
      reason: 'REST GET preview requires a non-empty static url; dynamic endpoints must be verified in the viewer.',
      ...identity,
    };
  }
  const requestFields = ['url_params', 'headers', 'cookies'].map((key) => options[key]);
  if (requestFields.some(containsBinding)) {
    return {
      provenRead: false, directSafe: false, countOnly: false, selectStar: false,
      requiresCountPreflight: false,
      reason: 'REST GET preview requires static request parameters/headers/cookies; binding-dependent requests must be verified in the viewer.',
      ...identity,
    };
  }
  return {
    provenRead: true, directSafe: false, countOnly: false, selectStar: false,
    requiresCountPreflight: false, requiresRemoteReadConfirmation: true,
    source: { kind: 'remote_endpoint', value: url },
    reason: 'REST GET may expose remote data, consume quota, or return an unbounded payload.',
    ...identity,
  };
}

/** Supabase's API plugin uses operation-specific table/limit fields rather than SQL. Treat its
 *  row reads like other remote APIs: statically classify them as reads, but require explicit user
 *  approval before crossing into the remote system. Writes remain fail-closed. */
function assessSupabase(options: Record<string, unknown>, datasourceId?: string): QueryReadAssessment {
  const identity = { datasourceKind: 'supabase', ...(datasourceId ? { datasourceId } : {}) };
  const operation = typeof options.operation === 'string' ? options.operation.toLowerCase() : undefined;
  const refuse = (reason: string): QueryReadAssessment => ({
    provenRead: false, directSafe: false, countOnly: false, selectStar: false,
    requiresCountPreflight: false, reason, ...identity,
  });
  if (!operation) return refuse('Supabase query has no operation.');

  if (operation === 'count_rows') {
    const table = typeof options.count_table_name === 'string' ? options.count_table_name.trim() : '';
    if (!table || containsBinding(table)) {
      return refuse('Supabase count_rows requires a non-empty static count_table_name.');
    }
    const filters = options.count_filters;
    const fullSourceCount = filters === undefined || filters === null || filters === '' ||
      (Array.isArray(filters) && filters.length === 0) ||
      (!!record(filters) && Object.keys(record(filters)!).length === 0);
    return {
      provenRead: true, directSafe: false, countOnly: true, selectStar: false,
      requiresCountPreflight: false, requiresRemoteReadConfirmation: true,
      fullSourceCount, simpleSourceRead: true,
      source: { kind: 'remote_endpoint', value: `supabase:${table.toLowerCase()}` },
      maxRows: 1,
      reason: 'Supabase count_rows reads a remote project and may consume API quota.',
      ...identity,
    };
  }

  if (operation !== 'get_rows') {
    return refuse(`Supabase operation ${operation} is not a read; it can change Supabase data.`);
  }
  const table = typeof options.get_table_name === 'string' ? options.get_table_name.trim() : '';
  if (!table || containsBinding(table)) {
    return refuse('Supabase get_rows requires a non-empty static get_table_name.');
  }
  const maxRows = staticPositiveInteger(options.get_limit);
  const remote = {
    provenRead: true as const, directSafe: false as const, countOnly: false as const,
    selectStar: false as const, requiresRemoteReadConfirmation: true as const,
    simpleSourceRead: true as const,
    source: { kind: 'remote_endpoint' as const, value: `supabase:${table.toLowerCase()}` },
    ...identity,
  };
  if (maxRows !== undefined && maxRows <= LARGE_READ_ROW_THRESHOLD) {
    return {
      ...remote, requiresCountPreflight: false, maxRows,
      reason: 'Supabase get_rows reads a remote project and may consume API quota.',
    };
  }
  return {
    ...remote, requiresCountPreflight: true, maxRows,
    reason: maxRows === undefined
      ? 'Supabase get_rows has no static get_limit.'
      : `Supabase get_rows can return up to ${maxRows} rows, above the ${LARGE_READ_ROW_THRESHOLD}-row safety threshold.`,
  };
}

function stripSql(sql: string): string {
  return sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/;\s*$/, '').trim();
}

function normalizeSqlTable(raw: string): string {
  return raw.split('.').map((part) => part.replace(/^[`"\[]|[`"\]]$/g, '')).join('.').toLowerCase();
}

function sqlSource(sql: string): ReadSource | undefined {
  const match = sql.match(/\bfrom\s+((?:[`"\[]?[A-Za-z_$][\w$]*[`"\]]?\.)*[`"\[]?[A-Za-z_$][\w$]*[`"\]]?)/i);
  return match ? { kind: 'sql_table', value: normalizeSqlTable(match[1]!) } : undefined;
}

function assessSql(sql: string, datasourceKind: string, datasourceId?: string): QueryReadAssessment {
  const compact = stripSql(sql);
  const identity = { datasourceKind, ...(datasourceId ? { datasourceId } : {}) };
  if (!compact || /;\s*\S/.test(compact)) {
    return {
      provenRead: false, directSafe: false, countOnly: false, selectStar: false,
      requiresCountPreflight: false, reason: 'SQL is empty or contains more than one statement', ...identity,
    };
  }
  if (/^(show\b|describe\b|desc\b|explain\s+(?:select\b|show\b))/i.test(compact)) {
    return {
      provenRead: true, directSafe: true, countOnly: false, selectStar: false,
      requiresCountPreflight: false, ...identity,
    };
  }
  if (!/^select\b/i.test(compact)) {
    return {
      provenRead: false, directSafe: false, countOnly: false, selectStar: false,
      requiresCountPreflight: false, reason: 'SQL is not a single proven read statement', ...identity,
    };
  }

  if (/\binto\s+(?:temp(?:orary)?\s+|unlogged\s+)?[`"\[]?[A-Za-z_$]/i.test(compact)) {
    return {
      provenRead: false, directSafe: false, countOnly: false, selectStar: false,
      requiresCountPreflight: false, reason: 'SELECT INTO creates or replaces data and is not a read-only query', ...identity,
    };
  }
  if (/\bfor\s+(?:no\s+key\s+update|key\s+share|update|share)\b|\block\s+in\s+share\s+mode\b/i.test(compact)) {
    return {
      provenRead: false, directSafe: false, countOnly: false, selectStar: false,
      requiresCountPreflight: false, reason: 'Locking SELECT statements are not side-effect-free reads', ...identity,
    };
  }

  const fromIndex = compact.search(/\bfrom\b/i);
  const selectClause = compact.slice('select'.length, fromIndex >= 0 ? fromIndex : compact.length).trim();
  const countOnly = /^count\s*\([\s\S]+\)(?:\s+(?:as\s+)?[`"A-Za-z_$][\w$`"]*)?$/i.test(selectClause);
  const projectionClause = selectClause.replace(/^top\s*(?:\(\s*\d+\s*\)|\d+)\s+/i, '').trim();
  const selectStar = !countOnly && /(?:^|,)\s*(?:[`"A-Za-z_$][\w$`"]*\.)?\*\s*(?:,|$)/.test(projectionClause);
  const source = sqlSource(compact);
  const fromCount = compact.match(/\bfrom\b/gi)?.length ?? 0;
  const simpleSourceRead = !!source && fromCount === 1 &&
    !/\b(join|union|intersect|except)\b|\bfrom\s*\(|\bfrom\s+(?:[`"\[]?[A-Za-z_$][\w$]*[`"\]]?\.)*[`"\[]?[A-Za-z_$][\w$]*[`"\]]?\s*\(/i.test(compact);
  const limit = compact.match(/\blimit\s+(\d+)\b/i);
  const top = selectClause.match(/^top\s*(?:\(\s*(\d+)\s*\)|(\d+))\s+/i);
  const fetch = compact.match(/\bfetch\s+(?:first|next)\s+(\d+)\s+rows?\s+only\b/i);
  const maxRows = limit
    ? Number(limit[1])
    : top
      ? Number(top[1] ?? top[2])
      : fetch
        ? Number(fetch[1])
        : undefined;
  const billableRead = BILLABLE_SCAN_SQL_KINDS.has(datasourceKind) && fromIndex >= 0;
  const fullSourceCount = countOnly && /^count\s*\(\s*\*\s*\)(?:\s+(?:as\s+)?[`"A-Za-z_$][\w$`"]*)?$/i.test(selectClause) &&
    simpleSourceRead && !/\b(where|group\s+by|having|limit|offset)\b/i.test(compact);

  if (selectStar) {
    return {
      provenRead: true, directSafe: false, countOnly: false, selectStar: true,
      requiresCountPreflight: false, source, maxRows, simpleSourceRead, ...identity,
      reason: 'SELECT * is refused. Inspect the schema and select only the required columns.',
    };
  }
  if (fromIndex < 0) {
    if (/\b[A-Za-z_$][\w$.]*\s*\(/.test(selectClause)) {
      return {
        provenRead: false, directSafe: false, countOnly: false, selectStar: false,
        requiresCountPreflight: false,
        reason: 'Function-only SELECT statements cannot be proven side-effect-free',
        ...identity,
      };
    }
    return {
      provenRead: true, directSafe: true, countOnly: false, selectStar: false,
      requiresCountPreflight: false, source, maxRows, ...identity,
    };
  }
  if (countOnly) {
    return {
      provenRead: true, directSafe: !billableRead, countOnly: true, selectStar: false,
      requiresCountPreflight: false, requiresBillableReadConfirmation: billableRead,
      fullSourceCount, simpleSourceRead, source, maxRows: 1, ...identity,
    };
  }
  if (maxRows !== undefined && maxRows <= LARGE_READ_ROW_THRESHOLD) {
    return {
      provenRead: true, directSafe: !billableRead, countOnly: false, selectStar: false,
      requiresCountPreflight: false, requiresBillableReadConfirmation: billableRead,
      simpleSourceRead, source, maxRows, ...identity,
    };
  }
  return {
    provenRead: true, directSafe: false, countOnly: false, selectStar: false,
    requiresCountPreflight: true, requiresBillableReadConfirmation: billableRead,
    simpleSourceRead, source, maxRows, ...identity,
    reason: maxRows === undefined
      ? 'Row-returning SQL has no static LIMIT.'
      : `SQL can return up to ${maxRows} rows, above the ${LARGE_READ_ROW_THRESHOLD}-row safety threshold.`,
  };
}

function countAggregate(options: Record<string, unknown>): boolean {
  const listRows = record(options.list_rows);
  const aggregates = record(listRows?.aggregates);
  const groupBy = record(listRows?.group_by);
  if (!aggregates || Object.keys(aggregates).length === 0 || (groupBy && Object.keys(groupBy).length > 0)) return false;
  return Object.values(aggregates).every((aggregate) => record(aggregate)?.aggFx === 'count');
}

function fullToolJetDbCount(options: Record<string, unknown>): boolean {
  if (!countAggregate(options)) return false;
  const listRows = record(options.list_rows)!;
  const aggregates = record(listRows.aggregates)!;
  if (Object.keys(aggregates).length !== 1) return false;
  const aggregate = record(Object.values(aggregates)[0]);
  if (aggregate?.column !== 'id') return false;
  const ignoredForScope = new Set(['aggregates', 'group_by', 'order_filters', 'limit', 'offset']);
  return Object.entries(listRows).every(([key, value]) => {
    if (ignoredForScope.has(key)) return true;
    if (value === undefined || value === null || value === '') return true;
    if (Array.isArray(value)) return value.length === 0;
    if (record(value)) return Object.keys(record(value)!).length === 0;
    return false;
  });
}

function guiSource(kind: string, options: Record<string, unknown>): ReadSource | undefined {
  if (kind === 'tooljetdb' && typeof options.table_id === 'string') {
    return { kind: 'table_id', value: options.table_id };
  }
  const table = typeof options.table === 'string' ? options.table : undefined;
  if (!table) return undefined;
  const schema = typeof options.schema === 'string' ? `${options.schema}.` : '';
  return { kind: 'gui_table', value: `${schema}${table}`.toLowerCase() };
}

function assessListRows(kind: string, options: Record<string, unknown>, datasourceId?: string): QueryReadAssessment {
  const source = guiSource(kind, options);
  const billableRead = BILLABLE_SCAN_SQL_KINDS.has(kind);
  const identity = { datasourceKind: kind, ...(datasourceId ? { datasourceId } : {}) };
  if (kind === 'tooljetdb' && countAggregate(options)) {
    return {
      provenRead: true, directSafe: true, countOnly: true, selectStar: false,
      requiresCountPreflight: false, fullSourceCount: fullToolJetDbCount(options),
      simpleSourceRead: true, source, maxRows: 1, ...identity,
    };
  }
  const listRows = record(options.list_rows);
  const maxRows = staticPositiveInteger(listRows?.limit ?? options.limit);
  if (maxRows !== undefined && maxRows <= LARGE_READ_ROW_THRESHOLD) {
    return {
      provenRead: true, directSafe: !billableRead, countOnly: false, selectStar: false,
      requiresCountPreflight: false, requiresBillableReadConfirmation: billableRead,
      simpleSourceRead: true, source, maxRows, ...identity,
    };
  }
  return {
    provenRead: true, directSafe: false, countOnly: false, selectStar: false,
    requiresCountPreflight: true, requiresBillableReadConfirmation: billableRead,
    simpleSourceRead: true, source, maxRows, ...identity,
    reason: maxRows === undefined
      ? 'list_rows has no statically provable row limit.'
      : `list_rows can return up to ${maxRows} rows, above the ${LARGE_READ_ROW_THRESHOLD}-row safety threshold.`,
  };
}

/** Fail-closed execution assessment. Unknown datasource kinds are not assumed safe. */
export function assessQueryRead(query: QuerySummary): QueryReadAssessment {
  const kind = query.kind?.toLowerCase();
  const datasourceId = query.data_source_id;
  const options = record(query.options);
  if (!kind || !options) {
    return {
      provenRead: false, directSafe: false, countOnly: false, selectStar: false,
      requiresCountPreflight: false, reason: 'Datasource kind/options are unavailable.',
    };
  }
  const operation = typeof options.operation === 'string' ? options.operation.toLowerCase() : undefined;

  if (kind === 'restapi') return assessRestGet(options, datasourceId);

  if (kind === 'servicenow') return assessServiceNow(options, datasourceId);

  if (kind === 'supabase') return assessSupabase(options, datasourceId);

  if (kind === 'tooljetdb') {
    if (operation === 'list_rows') return assessListRows(kind, options, datasourceId);
    if (operation === 'sql_execution') {
      const sql = record(options.sql_execution)?.sqlQuery;
      return typeof sql === 'string'
        ? assessSql(sql, kind, datasourceId)
        : {
            provenRead: false, directSafe: false, countOnly: false, selectStar: false,
            requiresCountPreflight: false, reason: 'ToolJet DB SQL text is unavailable.',
          };
    }
    return {
      provenRead: false, directSafe: false, countOnly: false, selectStar: false,
      requiresCountPreflight: false,
      reason: `ToolJet DB operation ${operation ?? '<missing>'} is not a proven bounded read.`,
    };
  }

  if (SQL_KINDS.has(kind)) {
    if (operation === 'list_rows' || options.mode === 'gui') return assessListRows(kind, options, datasourceId);
    const sql = typeof options.query === 'string'
      ? options.query
      : typeof options.sql === 'string'
        ? options.sql
        : undefined;
    return sql
      ? assessSql(sql, kind, datasourceId)
      : {
          provenRead: false, directSafe: false, countOnly: false, selectStar: false,
          requiresCountPreflight: false, reason: 'SQL text is unavailable.',
        };
  }

  return {
    provenRead: false, directSafe: false, countOnly: false, selectStar: false,
    requiresCountPreflight: false, reason: `Datasource kind ${kind} has no proven read classifier.`,
  };
}

export function sameReadSource(target: QueryReadAssessment, count: QueryReadAssessment): boolean {
  return !!target.source && !!count.source &&
    target.simpleSourceRead === true && count.fullSourceCount === true &&
    !!target.datasourceId && target.datasourceId === count.datasourceId &&
    target.datasourceKind === count.datasourceKind &&
    target.source.kind === count.source.kind && target.source.value === count.source.value;
}

/** Accept one-row count results with exactly one numeric value; reject ambiguous response shapes. */
export function extractRowCount(result: RunQueryResult): number | undefined {
  if (result.status !== 'ok') return undefined;
  let value: unknown = result.data;
  if (record(value)?.result !== undefined) value = record(value)!.result;
  if (Array.isArray(value)) {
    if (value.length !== 1) return undefined;
    value = value[0];
  }
  const row = record(value);
  if (!row) return undefined;
  const numeric = Object.values(row).flatMap((candidate) => {
    const parsed = typeof candidate === 'number'
      ? candidate
      : typeof candidate === 'string' && /^\d+$/.test(candidate.trim())
        ? Number(candidate)
        : Number.NaN;
    return Number.isSafeInteger(parsed) && parsed >= 0 ? [parsed] : [];
  });
  return numeric.length === 1 ? numeric[0] : undefined;
}
