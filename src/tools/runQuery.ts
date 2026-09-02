import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { getDatasourceQuerySchema } from '../datasourceCatalog.js';
import {
  LARGE_READ_ROW_THRESHOLD,
  assessQueryRead,
  extractRowCount,
  sameReadSource,
} from '../queryExecutionSafety.js';
import { ok, fail, type ToolDef } from './types.js';

const REMOTE_RESULT_MAX_JSON_CHARS = 30_000;

function truncateRemoteResult(result: Record<string, unknown>): {
  result: Record<string, unknown>;
  warning?: string;
} {
  if (!Object.prototype.hasOwnProperty.call(result, 'data')) return { result };
  let serialized: string;
  try {
    serialized = JSON.stringify(result.data);
  } catch {
    return {
      result: { ...result, data: { mcp_truncated: true, preview_json: '<unserializable response>' } },
      warning: 'The REST response data could not be serialized for MCP output; inspect it in ToolJet.',
    };
  }
  if (typeof serialized !== 'string') return { result };
  if (serialized.length <= REMOTE_RESULT_MAX_JSON_CHARS) return { result };
  return {
    result: {
      ...result,
      data: {
        mcp_truncated: true,
        original_json_characters: serialized.length,
        preview_json: serialized.slice(0, REMOTE_RESULT_MAX_JSON_CHARS),
      },
    },
    warning:
      `REST response data exceeded ${REMOTE_RESULT_MAX_JSON_CHARS} JSON characters and was truncated in MCP output. ` +
      'The remote request already completed; add API-specific pagination or a smaller limit before another run.',
  };
}

export function containsComponentBinding(value: unknown): boolean {
  if (typeof value === 'string') return /\bcomponents\s*\./.test(value);
  if (Array.isArray(value)) return value.some(containsComponentBinding);
  if (value && typeof value === 'object') return Object.values(value).some(containsComponentBinding);
  return false;
}

export function datasourceRecovery(query: {
  datasource_settings_url?: string;
}): Record<string, unknown> | undefined {
  if (!query.datasource_settings_url) return undefined;
  return {
    action: 'open_datasource_settings',
    url: query.datasource_settings_url,
    instruction:
      'Ask the user to repair or test the connection in ToolJet. If an in-app browser is available, open this URL; ' +
      'do not enter credentials, authorize OAuth, test, or save settings for the user. Retry only after they confirm the repair.',
  };
}

export type QueryFailureClass = 'connection' | 'schema_name' | 'query';

const CONNECTION_SQLSTATE_PREFIXES = ['08', '28', '53', '57P0', '3D000'];
const SCHEMA_NAME_SQLSTATES = new Set(['42P01', '42703', '3F000', '42P02', '42704']);

/** Classify a failed query result so the caller offers the RIGHT recovery: a connection-repair
 *  handoff only for genuine connection failures, and a re-introspect hint for wrong table/column
 *  names — never the misleading "go fix your datasource" prompt for a plain SQL name error. */
export function classifyQueryFailure(result: Record<string, unknown> | undefined): QueryFailureClass {
  if (!result) return 'query';
  const data = result.data as { code?: unknown } | undefined;
  const code = data && typeof data === 'object' ? String(data.code ?? '') : '';
  if (CONNECTION_SQLSTATE_PREFIXES.some((prefix) => code.startsWith(prefix))) return 'connection';
  if (SCHEMA_NAME_SQLSTATES.has(code)) return 'schema_name';
  return 'query';
}

/** Connection-repair handoff ONLY when the failure is actually a connection problem. */
export function failureRecovery(
  query: { datasource_settings_url?: string },
  result: Record<string, unknown>
): Record<string, unknown> | undefined {
  return classifyQueryFailure(result) === 'connection' ? datasourceRecovery(query) : undefined;
}

function introspectedNames(result: unknown): string[] {
  const data = (result as { data?: unknown } | undefined)?.data;
  if (!Array.isArray(data)) return [];
  return data
    .map((row) =>
      typeof row === 'string'
        ? row
        : (row as { value?: unknown; label?: unknown; name?: unknown })?.value ??
          (row as { label?: unknown })?.label ??
          (row as { name?: unknown })?.name
    )
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

/** Best-effort real table names for the failing datasource, so the agent stops guessing. Every call
 *  is guarded by the caller's try/catch — a discovery failure must never mask the query failure. */
async function availableTableNames(
  client: ToolJetClient,
  query: { data_source_id?: string; kind?: string }
): Promise<string[] | undefined> {
  if (!query.data_source_id || !query.kind) return undefined;
  const methods = getDatasourceQuerySchema(query.kind)?.introspectionMethods ?? [];
  const tableMethod = ['listTables', 'list_tables', 'getTables', 'tables'].find((m) => methods.includes(m));
  if (!tableMethod) return undefined;
  let methodArgs: Record<string, unknown> | undefined;
  if (methods.includes('listSchemas')) {
    const schemas = introspectedNames(
      await client.invokeDatasourceMethod({ dataSourceId: query.data_source_id, method: 'listSchemas' })
    );
    const schema = schemas.includes('public') ? 'public' : schemas[0];
    if (schema) methodArgs = { schema };
  }
  const tableResult = await client.invokeDatasourceMethod({
    dataSourceId: query.data_source_id,
    method: tableMethod,
    ...(methodArgs ? { args: methodArgs } : {}),
  });
  const names = introspectedNames(tableResult);
  return names.length ? names : undefined;
}

/** An actionable hint for a wrong-name failure: state plainly it is NOT a connection problem, list the
 *  real tables when discoverable, and direct the agent to re-introspect instead of guessing again. This
 *  converts a multi-turn "repair the connection / guess another name" grind into a one-turn correction. */
export async function schemaNameHint(
  client: ToolJetClient,
  query: { data_source_id?: string; kind?: string },
  result: Record<string, unknown>
): Promise<Record<string, unknown> | undefined> {
  if (classifyQueryFailure(result) !== 'schema_name') return undefined;
  const data = result.data as { code?: unknown } | undefined;
  const code = data && typeof data === 'object' ? String(data.code ?? '') : '';
  const hint: Record<string, unknown> = {
    kind: 'schema_name_error',
    detail: String(result.description ?? result.message ?? 'a table or column named in the query does not exist'),
    ...(code ? { sqlstate: code } : {}),
    guidance:
      'This is a schema/name error, NOT a connection problem — the datasource is reachable, so do NOT ask the ' +
      'user to repair or test the connection. A table or column named in the SQL does not exist. Call ' +
      'inspect_datasource_schema (listTables, then listColumns for the target table) to get the EXACT names, ' +
      'correct the query, and retry. Never guess table or column names.',
  };
  try {
    const tables = await availableTableNames(client, query);
    if (tables?.length) hint.available_tables = tables.slice(0, 50);
  } catch {
    // Discovery is a bonus; its failure must not mask or replace the underlying query failure.
  }
  return hint;
}

export function runQueryTool(client: ToolJetClient): ToolDef {
  return {
    name: 'run_query',
    title: 'Run Query',
    // Executes whatever the query holds against the customer datasource — which may write or delete.
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
    description:
      'Run an already-created query and return its REAL result — the browser-free way to see actual data. ' +
      'Use it to (a) verify a query works before binding UI to it, and (b) inspect real column values / ' +
      'distinct values (statuses, categories) before writing chart series, dropdown options, or filters. ' +
      'The query must already exist (create it with add_query first). Returns { status: "ok"|"failed", ' +
      'data: [...rows], ... } — HTTP is 200 even on failure, so CHECK `status` and read `message` on failure. ' +
      `Runs the SAVED query as-is; it does not mutate it. SELECT * is always refused. Reads with no static ` +
      `limit at or below ${LARGE_READ_ROW_THRESHOLD} rows require an unfiltered, same-datasource count_query_id first; if the ` +
      `observed count is larger, retry only after explicit user approval with user_confirmed_large_read:true. ` +
      'BigQuery, Snowflake, and Redshift reads also require explicit cost approval with ' +
      'user_confirmed_billable_read:true, even when row-limited. Never set confirmation flags from inferred consent. ' +
      'A static remote read (including REST GET and Supabase rows) requires separate approval with ' +
      'user_confirmed_remote_read:true because it may expose sensitive data or consume quota; remote writes are refused. ' +
      'If saved options reference `components.*`, the result ' +
      'includes a warning because browser-free execution cannot prove the component-resolved pagination/filter behavior.',
    inputSchema: {
      query_id: z.string(),
      version_id: z.string(),
      environment_id: z.string().optional(),
      count_query_id: z.string().optional(),
      user_confirmed_large_read: z.boolean().optional(),
      user_confirmed_billable_read: z.boolean().optional(),
      user_confirmed_remote_read: z.boolean().optional(),
    },
    async handler(args: {
      query_id: string;
      version_id: string;
      environment_id?: string;
      count_query_id?: string;
      user_confirmed_large_read?: boolean;
      user_confirmed_billable_read?: boolean;
      user_confirmed_remote_read?: boolean;
    }) {
      try {
        const warnings: string[] = [];
        const query = await client.getQuery(args.query_id, args.version_id);
        const assessment = assessQueryRead(query);
        if (!assessment.provenRead || assessment.selectStar) {
          return fail(new Error(
            `run_query refused query "${query.name ?? query.id}" before execution: ${assessment.reason ?? 'not a proven read'}`
          ));
        }
        if (containsComponentBinding(query.options)) {
          warnings.push(
            'Saved query options reference components.*. Browser-free run_query does not resolve live component state, so status:"ok" validates only the static datasource path; verify pagination/filter values in the viewer.'
          );
        }

        if (assessment.requiresRemoteReadConfirmation && !args.user_confirmed_remote_read) {
          return fail(new Error(
            `run_query refused remote read "${query.name ?? query.id}" before execution: remote reads can expose sensitive ` +
              'data, consume API quota, and return an unbounded payload. Tell the user which saved query will run and ask ' +
              'explicitly; retry with user_confirmed_remote_read:true only after they approve that request.'
          ));
        }
        if (assessment.requiresRemoteReadConfirmation) {
          warnings.push(assessment.datasourceKind === 'restapi'
            ? 'User-confirmed REST GET: the remote API controls response size and quota. Inspect metadata.request and metadata.response, and add API-specific pagination before another run when needed.'
            : 'User-confirmed remote read: the datasource controls response size and quota.');
        }

        if (assessment.requiresBillableReadConfirmation && !args.user_confirmed_billable_read) {
          return fail(new Error(
            `run_query refused query "${query.name ?? query.id}" before execution: ${query.kind} reads can incur ` +
              'warehouse/scan charges even with a row LIMIT. Explain that cost to the user and retry with ' +
              'user_confirmed_billable_read:true only after explicit approval.'
          ));
        }

        let preflight: Record<string, unknown> | undefined;
        if (assessment.requiresCountPreflight) {
          if (!args.count_query_id) {
            return fail(new Error(
              `run_query refused query "${query.name ?? query.id}" before execution: ${assessment.reason ?? 'result size is not bounded'}` +
                ` Create a same-source COUNT(*)/ToolJet DB count-aggregate query and retry with count_query_id. ` +
                `Use server-side pagination when the count exceeds ${LARGE_READ_ROW_THRESHOLD}.`
            ));
          }
          if (args.count_query_id === args.query_id) {
            return fail(new Error('count_query_id must be a separate count-only query.'));
          }
          const countQuery = await client.getQuery(args.count_query_id, args.version_id);
          const countAssessment = assessQueryRead(countQuery);
          const countCanRun = countAssessment.directSafe ||
            (countAssessment.requiresBillableReadConfirmation === true && args.user_confirmed_billable_read === true) ||
            (countAssessment.requiresRemoteReadConfirmation === true && args.user_confirmed_remote_read === true);
          if (!countAssessment.countOnly || !countCanRun || countAssessment.requiresCountPreflight ||
              !sameReadSource(assessment, countAssessment)) {
            return fail(new Error(
              `run_query refused the count preflight: "${countQuery.name ?? countQuery.id}" must be an unfiltered ` +
                'COUNT(*) (or ToolJet DB count of the generated id) against the same datasource and simple table as the target query.'
            ));
          }
          const countResult = await client.runQuery({
            queryId: countQuery.id,
            versionId: args.version_id,
            environmentId: args.environment_id,
          });
          const rowCount = extractRowCount(countResult);
          if (rowCount === undefined) {
            return fail(new Error(
              `Count preflight "${countQuery.name ?? countQuery.id}" did not return one row with exactly one numeric count; target query was not run.`
            ));
          }
          preflight = { count_query_id: countQuery.id, row_count: rowCount, threshold: LARGE_READ_ROW_THRESHOLD };
          if (rowCount > LARGE_READ_ROW_THRESHOLD && !args.user_confirmed_large_read) {
            return fail(new Error(
              `Target query was not run: count preflight found ${rowCount} rows, above the ` +
                `${LARGE_READ_ROW_THRESHOLD}-row threshold. Recommend server-side pagination. If a full read is still ` +
                'necessary, tell the user the observed count and ask explicitly; retry with ' +
                'user_confirmed_large_read:true only after they approve.'
            ));
          }
          if (rowCount > LARGE_READ_ROW_THRESHOLD) {
            warnings.push(
              `User-confirmed large read: count preflight found ${rowCount} rows. Server-side pagination remains recommended.`
            );
          }
        }
        let result;
        try {
          result = await client.runQuery({
            queryId: args.query_id,
            versionId: args.version_id,
            environmentId: args.environment_id,
          });
        } catch (error) {
          return ok({
            status: 'failed',
            message: error instanceof Error ? error.message : String(error),
            ...(preflight ? { preflight } : {}),
            ...(warnings.length ? { warnings } : {}),
          });
        }
        const failed = result.status === 'failed';
        const recovery = failed ? failureRecovery(query, result as Record<string, unknown>) : undefined;
        const schemaHint = failed ? await schemaNameHint(client, query, result as Record<string, unknown>) : undefined;
        const output = assessment.requiresRemoteReadConfirmation
          ? truncateRemoteResult(result as Record<string, unknown>)
          : { result: result as Record<string, unknown> };
        if (output.warning) warnings.push(output.warning);
        return ok({
          ...output.result,
          ...(preflight ? { preflight } : {}),
          ...(warnings.length ? { warnings } : {}),
          ...(recovery ? { recovery } : {}),
          ...(schemaHint ? { schema_hint: schemaHint } : {}),
        });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
