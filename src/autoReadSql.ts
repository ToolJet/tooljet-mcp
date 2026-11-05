/**
 * When an automatic read check may run a raw SQL query (CM-36).
 *
 * apply_app_phase, and code_app_data through it, runs the reads a phase wrote without anyone asking for that run.
 * The read classifier (queryExecutionSafety.ts) takes the first `LIMIT N` anywhere in the text as the bound, so
 * `SELECT t.id FROM tickets t WHERE t.assignee_id IN (SELECT a.id FROM agents a LIMIT 1)` passed as a one-row read while
 * its outer result is unbounded, and a SELECT that calls an arbitrary function passed as a proven read. An explicit
 * run_query or run_queries call keeps its own rules; this gate is only for runs nobody asked for, and it fails closed:
 *
 * - one SELECT, with no UNION, INTERSECT or EXCEPT at top level and no CTE (a WITH list is never run automatically);
 * - a bound that belongs to the outer statement: a final top-level `LIMIT n` (optionally with OFFSET), `FETCH FIRST n
 *   ROWS ONLY` or `SELECT TOP n`; or a projection of aggregates only with no top-level GROUP BY, or no FROM at all,
 *   which return one row;
 * - every function it calls is a well-known pure aggregate or scalar function, called by its bare name.
 *
 * Structured queries (ToolJet Database list_rows, GUI mode) are not raw SQL and are not judged here.
 */

import { SQL_KINDS } from './queryExecutionSafety.js';
import type { QuerySummary } from './tooljetClient.js';

const MAX_AUTO_ROWS = 1000;

/** Well-known aggregate and scalar functions with no side effects, by bare name (any schema-qualified call fails). */
const PURE_FUNCTIONS = new Set([
  // aggregates
  'count', 'sum', 'avg', 'min', 'max', 'bool_and', 'bool_or', 'every', 'string_agg', 'array_agg', 'group_concat',
  'json_agg', 'jsonb_agg', 'json_object_agg', 'jsonb_object_agg', 'stddev', 'stddev_pop', 'stddev_samp', 'variance',
  'var_pop', 'var_samp', 'percentile_cont', 'percentile_disc', 'mode',
  // window ranking
  'row_number', 'rank', 'dense_rank', 'percent_rank', 'cume_dist', 'ntile', 'lag', 'lead', 'first_value',
  'last_value', 'nth_value',
  // conditional and casts
  'coalesce', 'nullif', 'greatest', 'least', 'cast', 'ifnull', 'isnull', 'nvl', 'iif',
  // strings
  'lower', 'upper', 'trim', 'ltrim', 'rtrim', 'btrim', 'length', 'char_length', 'character_length', 'octet_length',
  'substring', 'substr', 'left', 'right', 'concat', 'concat_ws', 'replace', 'position', 'strpos', 'split_part',
  'lpad', 'rpad', 'initcap', 'reverse', 'format', 'to_char',
  // numbers
  'abs', 'round', 'floor', 'ceil', 'ceiling', 'trunc', 'mod', 'power', 'sqrt', 'sign', 'to_number',
  // dates and times
  'now', 'current_timestamp', 'current_date', 'date_trunc', 'date_part', 'extract', 'age', 'to_date', 'to_timestamp',
  'date', 'year', 'month', 'day', 'datediff', 'dateadd', 'date_add', 'date_sub', 'date_format', 'make_date',
  'make_interval', 'justify_interval',
  // json reads
  'json_extract_path_text', 'jsonb_extract_path_text', 'json_array_length', 'jsonb_array_length',
]);

/** SQL words that are followed by a parenthesis without being a function call. */
const PAREN_KEYWORDS = new Set([
  'select', 'from', 'where', 'in', 'exists', 'join', 'on', 'using', 'as', 'and', 'or', 'not', 'any', 'all', 'some',
  'values', 'over', 'filter', 'by', 'case', 'when', 'then', 'else', 'between', 'like', 'ilike', 'is', 'distinct',
  'having', 'limit', 'offset', 'top', 'lateral', 'within', 'partition', 'order', 'group', 'with', 'array', 'row',
]);

const AGGREGATES = new Set(['count', 'sum', 'avg', 'min', 'max', 'bool_and', 'bool_or', 'every', 'string_agg',
  'array_agg', 'group_concat', 'json_agg', 'jsonb_agg']);

/** Comments removed and literals masked: a string becomes '', a quoted identifier becomes _q. Undefined when unclear. */
function maskSql(sql: string): string | undefined {
  let out = '';
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]!;
    if (ch === '{' && sql[i + 1] === '{') {
      // A binding is a value spliced in at run time: treated as a literal here (its resolved text is judged too).
      const end = sql.indexOf('}}', i + 2);
      if (end < 0) return undefined;
      out += "''";
      i = end + 1;
    } else if (ch === "'") {
      let closed = false;
      while (++i < sql.length) {
        if (sql[i] === '\\') { i++; continue; }
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") { i++; continue; }
          closed = true;
          break;
        }
      }
      if (!closed) return undefined;
      out += "''";
    } else if (ch === '"' || ch === '`' || ch === '[') {
      const close = ch === '[' ? ']' : ch;
      const end = sql.indexOf(close, i + 1);
      if (end < 0) return undefined;
      out += ' _q ';
      i = end;
    } else if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      out += ' ';
    } else if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      if (end < 0 || sql[i + 2] === '!') return undefined;
      out += ' ';
      i = end + 1;
    } else if (ch === '$' && /^\$[A-Za-z_]*\$/.test(sql.slice(i))) {
      // Dollar quoting: not used by a plain read.
      return undefined;
    } else out += ch;
  }
  return out.replace(/\s+/g, ' ').trim().replace(/;\s*$/, '').trim().toLowerCase();
}

/** The text at parenthesis depth 0, each parenthesized group collapsed to (). Undefined when unbalanced. */
function topLevel(sql: string): string | undefined {
  let depth = 0;
  let out = '';
  for (const ch of sql) {
    if (ch === '(') {
      if (depth === 0) out += '(';
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth < 0) return undefined;
      if (depth === 0) out += ')';
    } else if (depth === 0) out += ch;
  }
  return depth === 0 ? out : undefined;
}

/** Top-level comma-separated items of a collapsed clause. */
const items = (clause: string): string[] => clause.split(',').map((item) => item.trim()).filter(Boolean);

/** The first function called that is not a well-known pure one, or undefined. */
function impureCall(sql: string): string | undefined {
  const calls = sql.matchAll(/([a-z_][\w$]*(?:\s*\.\s*[a-z_][\w$]*)*|_q)\s*\(/g);
  for (const call of calls) {
    const name = call[1]!.replace(/\s+/g, '');
    if (name.includes('.') || name === '_q') return name;
    if (PAREN_KEYWORDS.has(name)) continue;
    if (!PURE_FUNCTIONS.has(name)) return name;
  }
  return undefined;
}

/**
 * Why an automatic check may not run this SQL, or undefined when it may. The caller reports a refusal as not
 * checked: neither passed nor failed.
 */
export function autoReadSqlRefusal(sql: string): string | undefined {
  const masked = maskSql(sql);
  if (masked === undefined) return 'its SQL quoting, comments or bindings cannot be read with certainty';
  if (!masked || masked.includes(';')) return 'it is empty or has more than one statement';
  const top = topLevel(masked);
  if (top === undefined) return 'its parentheses do not balance';
  if (/^with\b/.test(top)) return 'a statement with a WITH list (CTE) is not run automatically';
  if (!/^select\b/.test(top)) return 'only a single SELECT is run automatically';
  if (/\b(union|intersect|except)\b/.test(top)) return 'UNION, INTERSECT and EXCEPT are not run automatically';
  if (/\b(insert|update|delete|merge|upsert|truncate|drop|alter|create|grant|revoke|copy|call|exec|execute|into|lock)\b/.test(masked)) {
    return 'it contains a statement that writes or runs code';
  }
  if (/\bfor\s+(update|share|no\s+key\s+update|key\s+share)\b/.test(top)) return 'a locking SELECT is not run automatically';
  const fn = impureCall(masked);
  if (fn) return `it calls ${fn}(), which is not a well-known pure function`;

  // The bound has to be the outer statement's own: a top-level clause at the very end, or SELECT TOP n.
  const limit = top.match(/\blimit\s+(\d+)(?:\s*,\s*(\d+))?(?:\s+offset\s+\d+)?$/) ?? top.match(/\boffset\s+\d+(?:\s+rows?)?\s+limit\s+(\d+)$/);
  const fetch = top.match(/\bfetch\s+(?:first|next)\s+(\d+)\s+rows?\s+only$/);
  const topN = top.match(/^select\s+(?:distinct\s+)?top\s*(?:\(\s*\)|(\d+))/);
  const bound = limit ? Number(limit[2] ?? limit[1]) : fetch ? Number(fetch[1]) : topN?.[1] ? Number(topN[1]) : undefined;
  if (bound !== undefined) {
    return bound <= MAX_AUTO_ROWS ? undefined : `its LIMIT ${bound} is above the ${MAX_AUTO_ROWS}-row automatic bound`;
  }
  if (/\b(limit|fetch|top)\b/.test(masked)) {
    return 'its row limit is not the final clause of the outer SELECT (a LIMIT in a subquery bounds nothing it returns)';
  }
  const from = top.search(/\bfrom\b/);
  if (from < 0) return undefined; // No source: one row.
  const projection = items(top.slice('select'.length, from).replace(/^\s*distinct\b/, ''));
  const aggregateOnly = projection.length > 0 && projection.every((item) => {
    const m = item.match(/^([a-z_][\w$]*)\s*\(\)(?:\s+(?:as\s+)?[a-z_][\w$]*)?$/);
    return !!m && AGGREGATES.has(m[1]!);
  });
  if (aggregateOnly && !/\b(group\s+by|over)\b/.test(top.slice(from))) return undefined; // One row.
  return 'it has no row limit on the outer SELECT';
}

const record = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

/** The raw SQL a query runs, as the read classifier finds it; undefined for a structured (GUI, list_rows) query. */
export function rawSqlOf(query: Pick<QuerySummary, 'kind' | 'options'>): string | undefined {
  const kind = query.kind?.toLowerCase();
  const options = record(query.options);
  if (!kind || !options) return undefined;
  const operation = typeof options.operation === 'string' ? options.operation.toLowerCase() : undefined;
  if (kind === 'tooljetdb') {
    const sql = operation === 'sql_execution' ? record(options.sql_execution)?.sqlQuery : undefined;
    return typeof sql === 'string' ? sql : undefined;
  }
  if (!SQL_KINDS.has(kind) || operation === 'list_rows' || options.mode === 'gui') return undefined;
  return ['query', 'sql_query', 'sql', 'presto_sql_query', 'soql_query']
    .map((field) => options[field])
    .find((value): value is string => typeof value === 'string' && !!value.trim());
}
