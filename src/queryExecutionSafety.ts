import type { QuerySummary, RunQueryResult } from './tooljetClient.js';

export const LARGE_READ_ROW_THRESHOLD = 1000;

const SQL_KINDS = new Set([
  'postgresql', 'mysql', 'mariadb', 'mssql', 'sqlserver', 'cockroachdb', 'redshift',
  'snowflake', 'bigquery', 'clickhouse', 'oracle', 'sqlite',
]);

interface ReadSource {
  kind: 'sql_table' | 'table_id' | 'gui_table';
  value: string;
}

export interface QueryReadAssessment {
  provenRead: boolean;
  directSafe: boolean;
  countOnly: boolean;
  selectStar: boolean;
  requiresCountPreflight: boolean;
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

function assessSql(sql: string): QueryReadAssessment {
  const compact = stripSql(sql);
  if (!compact || /;\s*\S/.test(compact)) {
    return {
      provenRead: false, directSafe: false, countOnly: false, selectStar: false,
      requiresCountPreflight: false, reason: 'SQL is empty or contains more than one statement',
    };
  }
  if (/^(show\b|describe\b|desc\b|explain\s+(?:select\b|show\b))/i.test(compact)) {
    return {
      provenRead: true, directSafe: true, countOnly: false, selectStar: false,
      requiresCountPreflight: false,
    };
  }
  if (!/^select\b/i.test(compact)) {
    return {
      provenRead: false, directSafe: false, countOnly: false, selectStar: false,
      requiresCountPreflight: false, reason: 'SQL is not a single proven read statement',
    };
  }

  const fromIndex = compact.search(/\bfrom\b/i);
  const selectClause = compact.slice('select'.length, fromIndex >= 0 ? fromIndex : compact.length).trim();
  const countOnly = /^count\s*\([\s\S]+\)(?:\s+(?:as\s+)?[`"A-Za-z_$][\w$`"]*)?$/i.test(selectClause);
  const selectStar = !countOnly && /(?:^|,)\s*(?:[`"A-Za-z_$][\w$`"]*\.)?\*\s*(?:,|$)/.test(selectClause);
  const source = sqlSource(compact);
  const limit = compact.match(/\blimit\s+(\d+)\b/i);
  const maxRows = limit ? Number(limit[1]) : undefined;

  if (selectStar) {
    return {
      provenRead: true, directSafe: false, countOnly: false, selectStar: true,
      requiresCountPreflight: false, source, maxRows,
      reason: 'SELECT * is refused. Inspect the schema and select only the required columns.',
    };
  }
  if (countOnly || fromIndex < 0) {
    return {
      provenRead: true, directSafe: true, countOnly, selectStar: false,
      requiresCountPreflight: false, source, maxRows: countOnly ? 1 : maxRows,
    };
  }
  if (maxRows !== undefined && maxRows <= LARGE_READ_ROW_THRESHOLD) {
    return {
      provenRead: true, directSafe: true, countOnly: false, selectStar: false,
      requiresCountPreflight: false, source, maxRows,
    };
  }
  return {
    provenRead: true, directSafe: false, countOnly: false, selectStar: false,
    requiresCountPreflight: true, source, maxRows,
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

function guiSource(kind: string, options: Record<string, unknown>): ReadSource | undefined {
  if (kind === 'tooljetdb' && typeof options.table_id === 'string') {
    return { kind: 'table_id', value: options.table_id };
  }
  const table = typeof options.table === 'string' ? options.table : undefined;
  if (!table) return undefined;
  const schema = typeof options.schema === 'string' ? `${options.schema}.` : '';
  return { kind: 'gui_table', value: `${schema}${table}`.toLowerCase() };
}

function assessListRows(kind: string, options: Record<string, unknown>): QueryReadAssessment {
  const source = guiSource(kind, options);
  if (kind === 'tooljetdb' && countAggregate(options)) {
    return {
      provenRead: true, directSafe: true, countOnly: true, selectStar: false,
      requiresCountPreflight: false, source, maxRows: 1,
    };
  }
  const listRows = record(options.list_rows);
  const maxRows = staticPositiveInteger(listRows?.limit ?? options.limit);
  if (maxRows !== undefined && maxRows <= LARGE_READ_ROW_THRESHOLD) {
    return {
      provenRead: true, directSafe: true, countOnly: false, selectStar: false,
      requiresCountPreflight: false, source, maxRows,
    };
  }
  return {
    provenRead: true, directSafe: false, countOnly: false, selectStar: false,
    requiresCountPreflight: true, source, maxRows,
    reason: maxRows === undefined
      ? 'list_rows has no statically provable row limit.'
      : `list_rows can return up to ${maxRows} rows, above the ${LARGE_READ_ROW_THRESHOLD}-row safety threshold.`,
  };
}

/** Fail-closed execution assessment. Unknown datasource kinds are not assumed safe. */
export function assessQueryRead(query: QuerySummary): QueryReadAssessment {
  const kind = query.kind?.toLowerCase();
  const options = record(query.options);
  if (!kind || !options) {
    return {
      provenRead: false, directSafe: false, countOnly: false, selectStar: false,
      requiresCountPreflight: false, reason: 'Datasource kind/options are unavailable.',
    };
  }
  const operation = typeof options.operation === 'string' ? options.operation.toLowerCase() : undefined;

  if (kind === 'tooljetdb') {
    if (operation === 'list_rows') return assessListRows(kind, options);
    if (operation === 'sql_execution') {
      const sql = record(options.sql_execution)?.sqlQuery;
      return typeof sql === 'string'
        ? assessSql(sql)
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
    if (operation === 'list_rows' || options.mode === 'gui') return assessListRows(kind, options);
    const sql = typeof options.query === 'string'
      ? options.query
      : typeof options.sql === 'string'
        ? options.sql
        : undefined;
    return sql
      ? assessSql(sql)
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
