/**
 * The one preflight for a query run that nobody asked for (CM-36, CM-37).
 *
 * apply_app_phase and code_app_data run the reads a phase wrote, the agent's finish step and binding probes call
 * run_queries, and a render audit lets the page's own reads through. Each of those used the general read classifier,
 * and two of its gaps reached real data: a PostgreSQL GUI delete_rows with `limit: 1` passed as a one-row list_rows and
 * deleted a row, and SQL the apply check had refused (an unknown function, a LIMIT only in a subquery) ran when
 * run_queries was asked for it next. Every automatic run now asks this one function, and a refusal here is a refusal
 * everywhere: the query was not run, and is reported as not checked.
 *
 * A query may run automatically only when all of these hold:
 *
 * 1. The general classifier proves it a bounded, direct read (batchSafeRead): no write, no RunJS, no remote or
 *    billable call, no SELECT *, the same read after its static bindings resolve.
 * 2. Its connector is one whose read and write branches this module knows (ToolJet Database, PostgreSQL, MySQL,
 *    MariaDB, SQL Server, Oracle), and its options select a read branch without contradiction:
 *    - ToolJet Database: operation list_rows, bounded at list_rows.limit (or a count), or sql_execution;
 *    - the SQL connectors: mode 'gui' with operation list_rows and its bound at the top-level limit (the connector
 *      ignores list_rows.limit), and no SQL text beside it; or mode 'sql' (MariaDB and Oracle also run their SQL text
 *      with no mode) with no GUI operation beside it. PostgreSQL, MySQL and SQL Server refuse a query with no mode.
 * 3. Raw SQL passes autoReadSql.ts in the connector's dialect, as saved and as its static bindings resolve.
 *
 * Every other query is not checked automatically, with the reason: an explicit run_query (with the user's
 * confirmation where it asks for one) is how to run it.
 */

import type { QuerySummary } from './tooljetClient.js';
import { assessQueryRead, resolvedReadRefusal } from './queryExecutionSafety.js';
import { applyResolvedBindings, resolveStaticBindings } from './staticBindings.js';
import { autoReadSqlRefusal, sqlDialectOf } from './autoReadSql.js';
import { GUI_LIST_ROWS_KEYS, connectorLabel, sqlConnectorPath } from './sqlConnectorDispatch.js';

/** Conservative proof, not a guess: unknown/plugin/API operations stay on singular run_query.
 *
 *  A refusal here has to say what to do next, not just what went wrong. A query that IS a proven
 *  read but needs the user's approval (every remote API — restapi, servicenow, influxdb, openapi)
 *  is refused by this tool for a reason that reads like a verdict, so the caller concludes the
 *  query is unrunnable and retries the same tool instead of moving to singular run_query. Measured
 *  on real builds: two consecutive OpenAPI builds spent 15 attempts here and shipped apps whose
 *  components were bound to queries that had never once executed. */
export function batchSafeRead(query: QuerySummary): { safe: boolean; reason?: string } {
  const assessment = assessQueryRead(query);
  if (assessment.provenRead && assessment.directSafe && !assessment.selectStar) {
    const refusal = resolvedReadRefusal(query, assessment, resolveStaticBindings(query.options).resolved);
    return refusal ? { safe: false, reason: refusal } : { safe: true };
  }

  // Proven read, held back only for confirmation: name the tool that can run it.
  if (assessment.provenRead && assessment.requiresRemoteReadConfirmation) {
    return {
      safe: false,
      reason:
        `${assessment.reason ?? 'remote read'} run_queries cannot run remote reads at all. Use singular ` +
        'run_query for this one: tell the user which saved query will run, and once they approve, call ' +
        'run_query with user_confirmed_remote_read:true. Do not retry run_queries with it.',
    };
  }

  return {
    safe: false,
    reason: assessment.reason ??
      (assessment.requiresCountPreflight
        ? 'read requires a count-first preflight through singular run_query'
        : 'query is not a proven bounded read'),
  };
}

/** The prefix of a refusal by this preflight's own rules (2 and 3), which the general classifier would have run. */
export const NOT_CHECKED_AUTOMATICALLY = 'not checked automatically, run it explicitly with run_query: ';

export type AutoReadVerdict = { run: true } | { run: false; reason: string };

/** Connectors whose read and write branches, and where each reads its row bound, are known here. */
const AUTO_SQL_KINDS = new Set(['postgresql', 'mysql', 'mariadb', 'mssql', 'oracledb']);
/** Of those, the ones that throw unless mode is 'sql' or 'gui'. */
const MODE_REQUIRED = new Set(['postgresql', 'mysql', 'mssql']);
/** The list_rows keys ToolJet Database reads. */
const TOOLJETDB_LIST_ROWS_KEYS = new Set(['limit', 'offset', 'where_filters', 'order_filters', 'aggregates', 'group_by']);

const record = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
const hasText = (value: unknown): boolean => typeof value === 'string' && !!value.trim();

/** Rule 3: the saved SQL, and the SQL its static bindings resolve to (the server splices them in as text). */
function sqlRefusal(kind: string, options: Record<string, unknown>, sql: string | undefined): string | undefined {
  if (!sql) return 'its SQL text is empty';
  const dialect = sqlDialectOf(kind);
  const saved = autoReadSqlRefusal(sql, dialect);
  if (saved) return saved;
  let resolvedOptions: Record<string, unknown>;
  try {
    resolvedOptions = applyResolvedBindings(options, resolveStaticBindings(options).resolved) as Record<string, unknown>;
  } catch {
    return 'its bindings cannot be resolved without a browser';
  }
  const resolved = kind === 'tooljetdb'
    ? record(resolvedOptions.sql_execution)?.sqlQuery
    : (() => { const path = sqlConnectorPath(kind, resolvedOptions); return path?.path === 'sql' ? path.sql : undefined; })();
  if (typeof resolved !== 'string') return 'its SQL text is not text once its bindings resolve';
  if (resolved === sql) return undefined;
  const after = autoReadSqlRefusal(resolved, dialect);
  return after ? `once its {{ }} bindings resolve, ${after}` : undefined;
}

/** Rule 2 and 3 for one query, after rule 1 passed. */
function connectorRefusal(query: QuerySummary): string | undefined {
  const kind = query.kind?.toLowerCase();
  const options = record(query.options);
  if (!kind || !options) return 'its datasource kind or options are unavailable';

  if (kind === 'tooljetdb') {
    if (options.operation === 'list_rows') {
      if (options.limit !== undefined || options.offset !== undefined) {
        return 'it has a top-level limit or offset, which ToolJet Database ignores (it reads list_rows.limit and list_rows.offset)';
      }
      const stray = Object.keys(record(options.list_rows) ?? {}).filter((key) => !TOOLJETDB_LIST_ROWS_KEYS.has(key));
      return stray.length ? `its list_rows carries ${stray.join(', ')}, which ToolJet Database does not read` : undefined;
    }
    if (options.operation === 'sql_execution') return sqlRefusal(kind, options, record(options.sql_execution)?.sqlQuery as string | undefined);
    return `ToolJet Database operation "${String(options.operation ?? '<missing>')}" is not one the automatic check runs`;
  }

  if (!AUTO_SQL_KINDS.has(kind)) {
    return `automatic checks run only ToolJet Database, PostgreSQL, MySQL, MariaDB, SQL Server and Oracle queries, whose read and write branches are known; this is a ${kind} query`;
  }
  const label = connectorLabel(kind);
  const mode = options.mode;
  if (MODE_REQUIRED.has(kind) && mode !== 'sql' && mode !== 'gui') {
    return `its mode is ${mode === undefined ? 'missing' : `"${String(mode)}"`}: ${label} runs a query only in mode "sql" or "gui"`;
  }
  if (mode !== undefined && mode !== 'sql' && mode !== 'gui') return `its mode "${String(mode)}" is neither "sql" nor "gui"`;
  const path = sqlConnectorPath(kind, options)!;
  if (path.path === 'not_read') return path.reason;
  if (path.path === 'gui_list_rows') {
    if (hasText(options.query)) return 'it is a GUI query that also carries SQL text in query; remove the one that is not meant to run';
    const stray = Object.keys(record(options.list_rows) ?? {}).filter((key) => !GUI_LIST_ROWS_KEYS.has(key));
    if (stray.includes('limit') || stray.includes('offset')) {
      return `its row bound is in list_rows, which ${label} ignores (it applies only the top-level limit and offset), so it is unbounded`;
    }
    if (stray.length) return `its list_rows carries ${stray.join(', ')}, which ${label} does not read`;
    if (options.limit === undefined) return `it has no top-level limit, which is where ${label} applies the row limit`;
    return undefined;
  }
  if (hasText(options.operation)) {
    return `it is a SQL query that also names the GUI operation "${String(options.operation)}"; remove the one that is not meant to run`;
  }
  return sqlRefusal(kind, options, path.sql);
}

/** Whether a run nobody asked for may run this query, or why not. */
export function autoReadPreflight(query: QuerySummary): AutoReadVerdict {
  const general = batchSafeRead(query);
  if (!general.safe) return { run: false, reason: String(general.reason ?? 'not a proven bounded read') };
  const refusal = connectorRefusal(query);
  return refusal ? { run: false, reason: `${NOT_CHECKED_AUTOMATICALLY}${refusal}` } : { run: true };
}
