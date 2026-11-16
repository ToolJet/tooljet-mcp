/**
 * When an automatic read check may run a raw SQL query (CM-36).
 *
 * apply_app_phase, and code_app_data through it, runs the reads a phase wrote without anyone asking for that run.
 * The read classifier (queryExecutionSafety.ts) takes the first `LIMIT N` anywhere in the text as the bound, so
 * `SELECT t.id FROM tickets t WHERE t.assignee_id IN (SELECT a.id FROM agents a LIMIT 1)` passed as a one-row read while
 * its outer result is unbounded, and a SELECT that calls an arbitrary function passed as a proven read. This gate is
 * for runs nobody asked for (autoReadPreflight.ts: apply_app_phase, code_app_data, run_queries, render audits; an
 * explicit run_query keeps its own rules), and it fails closed, in the SQL dialect of the connector when it is known:
 *
 * - one SELECT, with no UNION, INTERSECT or EXCEPT at top level and no CTE (a WITH list is never run automatically);
 * - a bound that belongs to the outer statement: a final top-level `LIMIT n` (optionally with OFFSET), `FETCH FIRST n
 *   ROWS ONLY` or `SELECT TOP n` / `TOP (n)` (not PERCENT, not WITH TIES); or a projection of aggregates only with no
 *   top-level GROUP BY, or no FROM at all, which return one row;
 * - no product of tables: no CROSS JOIN, NATURAL JOIN, join ON TRUE, or comma between tables in any FROM list (a LIMIT
 *   bounds the rows returned, not the product the database builds and sorts first);
 * - every function it calls is a well-known pure aggregate or scalar function, called by its bare name, with no
 *   argument cast to a type its built-in version does not take; no sequence (NEXT VALUE FOR), no locking table hint,
 *   no assignment, no comment the dialect could read differently (CM-36 retest 4).
 *
 * Known limits: a lexical check does not see the database catalog. A routine the database resolves in place of a
 * built-in (an overload that wins by an implicit conversion, such as a user's lower(varchar) beside
 * pg_catalog.lower(text)), a user-defined operator, a type whose input function has effects, a function called in
 * PostgreSQL attribute notation (`t.archive` for archive(t)), and a view or row-level policy that calls a function
 * all look like a plain read here. Only the datasource can rule those out: a read-only role, or a read-only
 * transaction with a statement timeout, on the executor side.
 *
 * Structured queries (ToolJet Database list_rows, GUI mode) are not raw SQL and are not judged here.
 */

import { SQL_KINDS } from './queryExecutionSafety.js';
import { SQL_DIALECT, sqlConnectorPath, type SqlDialect } from './sqlConnectorDispatch.js';
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

/**
 * Reserved SQL words that are followed by a parenthesis without being a function call, and that no dialect lets a
 * routine be named (an unreserved word such as PostgreSQL's FILTER, OVER, BY or WITHIN can name a routine, and is
 * accepted only where its keyword use belongs: see keywordCallAllowed).
 */
const PAREN_KEYWORDS = new Set([
  'select', 'from', 'where', 'in', 'exists', 'on', 'using', 'as', 'and', 'or', 'not', 'any', 'all', 'some',
  'values', 'case', 'when', 'then', 'else', 'between', 'distinct', 'having', 'limit', 'offset', 'lateral', 'order',
  'group', 'with', 'array', 'row',
]);

const AGGREGATES = new Set(['count', 'sum', 'avg', 'min', 'max', 'bool_and', 'bool_or', 'every', 'string_agg',
  'array_agg', 'group_concat', 'json_agg', 'jsonb_agg']);

/**
 * Allowlisted functions whose built-in versions take text, and those that take numbers. A cast of an argument to
 * another type names an overload that is not the built-in one (`lower(id::integer)` runs a user's lower(integer)),
 * so such a call is not run automatically. An implicit conversion cannot be seen here: see the module notes.
 */
const TEXT_FUNCTIONS = new Set(['lower', 'upper', 'trim', 'ltrim', 'rtrim', 'btrim', 'length', 'char_length',
  'character_length', 'octet_length', 'substring', 'substr', 'left', 'right', 'replace', 'position', 'strpos',
  'split_part', 'lpad', 'rpad', 'initcap', 'reverse']);
const NUMERIC_FUNCTIONS = new Set(['abs', 'round', 'floor', 'ceil', 'ceiling', 'trunc', 'mod', 'power', 'sqrt', 'sign']);
const TEXT_TYPES = new Set(['text', 'varchar', 'character', 'char', 'bpchar', 'name', 'citext', 'nvarchar', 'nchar']);
const NUMERIC_TYPES = new Set(['numeric', 'decimal', 'int', 'integer', 'int2', 'int4', 'int8', 'smallint', 'bigint',
  'real', 'float', 'float4', 'float8', 'double']);

/** Table hints that only relax locking; any other hint (UPDLOCK, HOLDLOCK, ...) takes locks. */
const READ_HINTS = new Set(['nolock', 'readuncommitted']);

type Masked = { text: string } | { refusal: string };

/**
 * Comments removed and literals masked: a string becomes '', a quoted identifier becomes _q. A refusal when the text
 * cannot be read with certainty in `dialect` (undefined: unknown, read by the strictest rule of each).
 *
 * - Brackets quote an identifier only in SQL Server. In PostgreSQL they are arrays and subscripts, so their contents
 *   are SQL that runs: `SELECT ARRAY[nextval('s')] FROM t LIMIT 1` advances a sequence.
 * - MySQL starts a comment at `--` only when whitespace or a control character follows, and at `#`: `id--(SELECT
 *   SLEEP(2))` runs the subquery. Either is refused unless the dialect is known not to be MySQL.
 * - Backslash escapes in strings depend on the dialect and the session; the caller masks both ways and refuses a
 *   difference.
 */
function maskSql(sql: string, dialect: SqlDialect | undefined, backslashEscapes: boolean): Masked {
  const mysqlRules = dialect === undefined || dialect === 'mysql';
  let out = '';
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]!;
    if (ch === '{' && sql[i + 1] === '{') {
      // A binding is a value spliced in at run time: treated as a literal here (its resolved text is judged too).
      const end = sql.indexOf('}}', i + 2);
      if (end < 0) return { refusal: 'its {{ }} bindings do not close' };
      out += "''";
      i = end + 1;
    } else if (ch === "'") {
      let closed = false;
      while (++i < sql.length) {
        if (sql[i] === '\\' && backslashEscapes) { i++; continue; }
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") { i++; continue; }
          closed = true;
          break;
        }
      }
      if (!closed) return { refusal: 'a string literal does not close' };
      out += "''";
    } else if (ch === '"' || ch === '`' || (ch === '[' && dialect === 'mssql')) {
      const close = ch === '[' ? ']' : ch;
      const end = sql.indexOf(close, i + 1);
      if (end < 0) return { refusal: 'a quoted identifier does not close' };
      out += ' _q ';
      i = end;
    } else if (ch === '-' && sql[i + 1] === '-') {
      if (mysqlRules && !/^[\s\x00-\x1f]$/.test(sql[i + 2] ?? '')) {
        return { refusal: 'it has -- without a space after it, which MySQL does not read as a comment' };
      }
      while (i < sql.length && sql[i] !== '\n') i++;
      out += ' ';
    } else if (ch === '#' && mysqlRules) {
      return { refusal: 'it has a #, which starts a comment in MySQL' };
    } else if (ch === '/' && sql[i + 1] === '*') {
      if (/^\/\*\s*(?:!|M!|\+)/.test(sql.slice(i))) return { refusal: 'it has an executable comment or optimizer hint (/*! */, /*M! */, /*+ */)' };
      const end = sql.indexOf('*/', i + 2);
      if (end < 0) return { refusal: 'a comment does not close' };
      out += ' ';
      i = end + 1;
    } else if (ch === '$' && /^\$[A-Za-z_]*\$/.test(sql.slice(i))) {
      // Dollar quoting: not used by a plain read.
      return { refusal: 'it uses dollar quoting' };
    } else out += ch;
  }
  return { text: out.replace(/\s+/g, ' ').trim().replace(/;\s*$/, '').trim().toLowerCase() };
}

/** The masked text, the same whether or not a backslash escapes a quote; otherwise a refusal. */
function maskBothWays(sql: string, dialect: SqlDialect | undefined): Masked {
  const plain = maskSql(sql, dialect, false);
  const escaped = maskSql(sql, dialect, true);
  if ('refusal' in plain) return plain;
  if ('refusal' in escaped) return escaped;
  if (plain.text !== escaped.text) return { refusal: 'its string literals read differently with and without backslash escapes' };
  return plain;
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

/* The clauses that end a FROM list at its own depth. */
const FROM_END = /^(where|group|order|limit|having|window|union|intersect|except|fetch|offset|for|qualify|returning|on|using)\b/;

/**
 * An unbounded product of tables in an automatic read: CROSS JOIN, NATURAL JOIN (a cross
 * join when no column is shared), a join ON TRUE, or a comma between tables in any FROM list, at any depth. A row
 * LIMIT bounds what returns, not what the database sorts or aggregates first: `FROM t a, t b, t c, t d ORDER BY a.id
 * LIMIT 1` ran as a proven read. Undefined when there is none.
 */
export function crossProduct(masked: string): string | undefined {
  const sql = masked.toLowerCase();
  if (/\bcross\s+(join|apply)\b/.test(sql)) return 'it has a CROSS JOIN';
  if (/\bnatural\s+((left|right|full|inner)\s+)?(outer\s+)?join\b/.test(sql)) return 'it has a NATURAL JOIN';
  if (/\bon\s*\(?\s*(true|1\s*=\s*1|0\s*=\s*0)\s*\)?(?=\s|$|\))/.test(sql)) return 'it joins ON a condition that is always true';
  for (const match of sql.matchAll(/\bfrom\b/g)) {
    let depth = 0;
    for (let i = match.index! + 4; i < sql.length; i++) {
      const ch = sql[i]!;
      if (ch === '(') depth++;
      else if (ch === ')') {
        if (--depth < 0) break; // the end of the subquery or call this FROM is in
      } else if (depth === 0) {
        if (ch === ',') return 'it lists tables separated by commas in FROM (an implicit cross join)';
        if (ch === ';') break;
        if (/[a-z_]/.test(ch) && !/[a-z0-9_$]/.test(sql[i - 1] ?? ' ') && FROM_END.test(sql.slice(i))) break;
      }
    }
  }
  return undefined;
}

/** Top-level comma-separated items of a collapsed clause. */
const items = (clause: string): string[] => clause.split(',').map((item) => item.trim()).filter(Boolean);

/** The index of the parenthesis that closes the one at `open`, or -1. */
function closingParen(sql: string, open: number): number {
  let depth = 0;
  for (let i = open; i < sql.length; i++) {
    if (sql[i] === '(') depth++;
    else if (sql[i] === ')' && --depth === 0) return i;
  }
  return -1;
}

/**
 * An unreserved keyword followed by a parenthesis, where only its keyword use is accepted: FILTER and OVER right after
 * a call's closing parenthesis, BY after ORDER, GROUP or PARTITION, JOIN before a derived table, TOP right after
 * SELECT [DISTINCT|ALL] in SQL Server. Anywhere else the word may name a routine, and the call is refused.
 */
function keywordCallAllowed(name: string, sql: string, at: number, dialect: SqlDialect | undefined): boolean {
  const before = sql.slice(0, at).trimEnd();
  if (name === 'filter' || name === 'over') return before.endsWith(')');
  if (name === 'by') return /\b(?:order|group|partition)$/.test(before);
  if (name === 'join') return /^join\s*\(\s*select\b/.test(sql.slice(at));
  if (name === 'top') return (dialect === 'mssql' || dialect === undefined) && /^select(?:\s+(?:distinct|all))?$/.test(before);
  return false;
}

/** The first function called that is not a well-known pure one, or undefined. */
function impureCall(sql: string, dialect: SqlDialect | undefined): string | undefined {
  const calls = sql.matchAll(/([a-z_][\w$]*(?:\s*\.\s*[a-z_][\w$]*)*|_q)\s*\(/g);
  for (const call of calls) {
    const name = call[1]!.replace(/\s+/g, '');
    if (name.includes('.') || name === '_q') return name;
    if (PAREN_KEYWORDS.has(name)) continue;
    if (['filter', 'over', 'by', 'join', 'top'].includes(name)) {
      if (keywordCallAllowed(name, sql, call.index!, dialect)) continue;
      return name;
    }
    if (!PURE_FUNCTIONS.has(name)) return name;
  }
  return undefined;
}

/** A call to an allowlisted text or numeric function whose argument is cast to a type of another family. */
function overloadedCall(sql: string): string | undefined {
  for (const call of sql.matchAll(/\b([a-z_][\w$]*)\s*\(/g)) {
    const name = call[1]!;
    const family = TEXT_FUNCTIONS.has(name) ? TEXT_TYPES : NUMERIC_FUNCTIONS.has(name) ? NUMERIC_TYPES : undefined;
    if (!family) continue;
    const open = call.index! + call[0].length - 1;
    const close = closingParen(sql, open);
    const args = sql.slice(open + 1, close < 0 ? undefined : close);
    const casts = [...args.matchAll(/::\s*([a-z_][\w$]*)/g), ...args.matchAll(/\bcast\s*\([^]*?\bas\s+([a-z_][\w$]*)/g)];
    const foreign = casts.map((cast) => cast[1]!).find((type) => !family.has(type));
    if (foreign) return `${name}() with an argument cast to ${foreign === '_q' ? 'a quoted type' : foreign}`;
  }
  return undefined;
}

/** Why a SQL Server TOP at the head of the statement is not a fixed row count, or its count. */
function topBound(masked: string): { rows: number } | { refusal: string } | undefined {
  const head = masked.match(/^select\s+(?:(?:distinct|all)\s+)?top\b\s*(.*)$/);
  if (!head) return undefined;
  const count = head[1]!.match(/^(?:\(\s*(\d+)\s*\)|(\d+)\b)\s*(.*)$/);
  if (!count) return { refusal: 'its TOP is not a fixed row count' };
  if (/^percent\b/.test(count[3]!)) return { refusal: 'its TOP is a PERCENT of the rows, not a fixed row count' };
  if (/^with\s+ties\b/.test(count[3]!)) return { refusal: 'its TOP ... WITH TIES can return more rows than its count' };
  return { rows: Number(count[1] ?? count[2]) };
}

/**
 * Why an automatic check may not run this SQL, or undefined when it may. The caller reports a refusal as not
 * checked: neither passed nor failed.
 */
export function autoReadSqlRefusal(sql: string, dialect?: SqlDialect): string | undefined {
  const read = maskBothWays(sql, dialect);
  if ('refusal' in read) return `its SQL cannot be read with certainty: ${read.refusal}`;
  const masked = read.text;
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
  if (/\bnext\s+value\s+for\b/.test(masked)) return 'it takes NEXT VALUE FOR a sequence, which advances it';
  if (/:=/.test(masked)) return 'it assigns a variable (:=)';
  if (/\b(updlock|xlock|holdlock|tablock|tablockx|paglock|rowlock|serializable|repeatableread|readcommittedlock)\b/.test(masked)) {
    return 'it has a table hint that takes or holds locks';
  }
  for (const hint of masked.matchAll(/\bwith\s*\(([^()]*)\)/g)) {
    const names = hint[1]!.split(',').map((name) => name.trim()).filter(Boolean);
    if (!names.length || names.some((name) => !READ_HINTS.has(name))) return `it has the table hint WITH (${hint[1]!.trim()}), which is not a plain read`;
  }
  if (/\boption\s*\(/.test(masked)) return 'it has a query hint (OPTION (...))';
  if (/\bwith\s+ties\b/.test(masked)) return 'WITH TIES can return more rows than its limit';
  const product = crossProduct(masked);
  if (product) return `${product}, which can read the product of its tables however small its LIMIT; join on a condition`;
  const fn = impureCall(masked, dialect);
  if (fn) return `it calls ${fn}(), which is not a well-known pure function`;
  const overload = overloadedCall(masked);
  if (overload) return `it calls ${overload}, which is not the built-in function's signature (another overload would run)`;

  // The bound has to be the outer statement's own: a top-level clause at the very end, or SELECT TOP n.
  const limit = top.match(/\blimit\s+(\d+)(?:\s*,\s*(\d+))?(?:\s+offset\s+\d+)?$/) ?? top.match(/\boffset\s+\d+(?:\s+rows?)?\s+limit\s+(\d+)$/);
  const fetch = top.match(/\bfetch\s+(?:first|next)\s+(\d+)\s+rows?\s+only$/);
  const topN = topBound(masked);
  if (topN && 'refusal' in topN) return topN.refusal;
  const bounds = [limit ? Number(limit[2] ?? limit[1]) : undefined, fetch ? Number(fetch[1]) : undefined, topN?.rows]
    .filter((n): n is number => n !== undefined);
  const bound = bounds.length ? Math.min(...bounds) : undefined;
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
  if (!SQL_KINDS.has(kind)) return undefined;
  const path = sqlConnectorPath(kind, options);
  if (path) return path.path === 'sql' ? path.sql : undefined;
  if (operation === 'list_rows' || options.mode === 'gui') return undefined;
  return ['query', 'sql_query', 'sql', 'presto_sql_query', 'soql_query']
    .map((field) => options[field])
    .find((value): value is string => typeof value === 'string' && !!value.trim());
}

/** The SQL dialect `kind` is parsed in by the automatic check; undefined when unknown (the strictest rules apply). */
export const sqlDialectOf = (kind: string | undefined): SqlDialect | undefined => kind ? SQL_DIALECT[kind.toLowerCase()] : undefined;
