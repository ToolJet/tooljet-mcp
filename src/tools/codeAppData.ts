import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { plannedTableSchema } from '../appPlanSchema.js';
import type { AppPlanInput } from '../appPlanSchema.js';
import { lintAppSpecTool } from './lintAppSpec.js';
import { applyAppPhaseTool } from './applyAppPhase.js';
import { refuseBrowserUser } from './addQueries.js';
import { fail, ok, type ToolDef } from './types.js';

/*
  The data stage of a Code mode build in one call (2026-11-04). A Code build made about 16 calls for its tables, seed
  rows and queries (create_tables, 5 insert_rows_batch, add_queries, 4 update_query, 2.6 delete_query, 3 run_queries),
  about 145 s and $0.08 a build, where a Visual build sends them inside one spec. This is that spec path without pages:
  the same lint (write shapes, required columns, seed keys and timestamps, datasource contracts) before anything is
  written, then the same apply, which creates the tables, seeds them, creates the queries and runs the proven reads once.
*/

/** Rows per seed entry the apply takes; a longer entry is split into entries of this size. */
const SEED_CHUNK = 40;

const seedSchema = z.object({
  table_name: z.string(),
  rows: z.array(z.record(z.string(), z.any())).min(1).max(200),
});
const querySchema = z.object({
  name: z.string(),
  table_ref: z.string().optional().describe('A ToolJet DB table by its table_name (planned here or existing): the query reads or writes it'),
  datasource_name: z.string().optional().describe('Another datasource, by its exact name; leave out for ToolJet DB'),
  options: z.record(z.string(), z.any()),
  update: z.boolean().optional().describe('Redefine the app\'s query of this name in place, keeping its id'),
});

type Input = {
  app_id: string;
  version_id?: string;
  tables?: AppPlanInput['tables'];
  seed_data?: { table_name: string; rows: Record<string, unknown>[] }[];
  queries?: { name: string; table_ref?: string; datasource_name?: string; datasource_id?: string; options: Record<string, unknown>; update?: boolean }[];
};

const body = (result: { content: { text: string }[] }): any => {
  try {
    return JSON.parse(result.content[0]?.text ?? '');
  } catch {
    return undefined;
  }
};

/** Seed entries of at most SEED_CHUNK rows, in order. */
export function chunkSeeds(seeds: Input['seed_data'] = []): { table_name: string; rows: Record<string, unknown>[] }[] {
  return seeds.flatMap((seed) => Array.from({ length: Math.ceil(seed.rows.length / SEED_CHUNK) }, (_, i) => ({
    table_name: seed.table_name,
    rows: seed.rows.slice(i * SEED_CHUNK, (i + 1) * SEED_CHUNK),
  })));
}

/**
 * Parameters a query reads ({{parameters.x}}) without declaring them in options.parameters: the code's run({ x }) then
 * has nothing to fill, and the write sends an empty value. One line per query.
 */
/** The parameter names a query reads but does not declare. */
export function undeclaredNames(query: NonNullable<Input['queries']>[number]): string[] {
  const declared = new Set((Array.isArray(query.options?.parameters) ? query.options.parameters : [])
    .map((p: unknown) => (p && typeof p === 'object' ? String((p as { name?: unknown }).name) : '')));
  const { parameters: _declared, ...rest } = query.options ?? {};
  const used = [...new Set([...JSON.stringify(rest).matchAll(/\bparameters\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]!))];
  return used.filter((name) => !declared.has(name));
}

export function undeclaredParameters(queries: Input['queries'] = []): string[] {
  return queries.flatMap((query) => {
    const missing = undeclaredNames(query);
    return missing.length
      ? [`Query "${query.name}" reads ${missing.map((n) => `parameters.${n}`).join(', ')} but does not declare ${missing.length > 1 ? 'them' : 'it'}: ` +
        `add ${missing.map((n) => `{ "name": "${n}", "defaultValue": "" }`).join(', ')} to its options.parameters.`]
      : [];
  });
}

export function codeAppDataTool(client: ToolJetClient): ToolDef {
  const lint = lintAppSpecTool(client);
  const apply = applyAppPhaseTool(client);
  return {
    name: 'code_app_data',
    title: 'Create Code Mode App Data',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description:
      "A Code mode app's data in one call: ToolJet DB tables, their sample rows and the app's queries. Everything is checked " +
      'before anything is written (write shapes, required columns, seed keys, datasource contracts); on any error nothing is ' +
      'written and every error is listed, so fix them all and send the whole call again. Then the tables are created, seeded, ' +
      'the queries created, and each bounded read run once (read_check: rows per query, failed). A query with table_ref and ' +
      'no datasource_name is a ToolJet DB query on that table. Tables already in the workspace are not listed again: queries ' +
      'reach them by table_ref. Returns the table and query ids.',
    inputSchema: {
      app_id: z.string().uuid(),
      version_id: z.string().uuid().optional().describe("Defaults to the app's editing version"),
      tables: z.array(plannedTableSchema).max(50).optional(),
      seed_data: z.array(seedSchema).max(50).optional(),
      queries: z.array(querySchema).max(200).optional(),
    },
    async handler(args: Input) {
      try {
        if (![args.tables, args.seed_data, args.queries].some((items) => items?.length)) {
          return fail(new Error('code_app_data needs at least one table, seed_data entry or query.'));
        }
        const summary = await client.getAppSummary(args.app_id);
        const versionId = args.version_id ?? summary.version_id;
        if (!versionId) return fail(new Error(`App ${args.app_id} has no editing version to add queries to.`));
        let queries = args.queries;
        if (queries?.length) {
          await refuseBrowserUser(client, args.app_id, queries);
          const datasources = await client.listDatasources(versionId);
          const tooljetDb = datasources.find((source) => source.kind === 'tooljetdb');
          queries = queries.map(({ datasource_name, datasource_id, ...query }) => {
            if (datasource_id || datasource_name) return { ...query, ...(datasource_id ? { datasource_id } : { datasource_name }) };
            if (!tooljetDb) throw new Error(`Query "${query.name}": this workspace has no ToolJet DB datasource; name one with datasource_name.`);
            return { ...query, datasource_id: tooljetDb.id };
          });
        }
        const spec: AppPlanInput = {
          app_id: args.app_id,
          version_id: versionId,
          ...(args.tables?.length ? { tables: args.tables } : {}),
          ...(args.seed_data?.length ? { seed_data: chunkSeeds(args.seed_data) } : {}),
          ...(queries?.length ? { queries } : {}),
        };
        // On unless MCP_CODE_DATA_AUTODECLARE=0: a query that reads parameters it does not declare gets them
        // declared (default ""), the fix the refusal names, instead of refusing the whole call. Each resend was 10-30 s and
        // the resend often dropped table_ref, which refused the call again. The warning keeps the code's side visible.
        const declaredHere: string[] = [];
        if (process.env.MCP_CODE_DATA_AUTODECLARE !== '0' && spec.queries?.length) {
          spec.queries = spec.queries.map((query) => {
            const missing = undeclaredNames(query);
            if (!missing.length) return query;
            declaredHere.push(`Query "${query.name}": declared ${missing.map((n) => `parameters.${n}`).join(', ')} (default ""); pass ${missing.length > 1 ? 'them' : 'it'} in run({ ... }).`);
            const params = Array.isArray(query.options?.parameters) ? query.options.parameters : [];
            return { ...query, options: { ...query.options, parameters: [...params, ...missing.map((name) => ({ name, defaultValue: '' }))] } };
          });
          queries = spec.queries;
        }
        const linted = await lint.handler(spec);
        const checked = body(linted);
        if (linted.isError || !checked) return linted;
        if (declaredHere.length) checked.warnings = [...declaredHere, ...(checked.warnings ?? [])];
        const undeclared = undeclaredParameters(queries);
        if (!checked.ok || !checked.plan_token || undeclared.length) {
          return ok({
            ok: false,
            written: 'nothing',
            errors: [...undeclared, ...(checked.errors ?? [])],
            ...(checked.warnings?.length ? { warnings: checked.warnings } : {}),
            next: 'Fix every error, then send the whole call again (tables, seed_data and queries together).',
          });
        }
        const applied = await apply.handler({ app_id: args.app_id, version_id: versionId, plan_token: checked.plan_token });
        const result = body(applied);
        if (applied.isError || !result) return applied;
        const warnings = [...new Set([...(checked.warnings ?? []), ...(result.warnings ?? [])])];
        return ok({
          applied: Object.fromEntries(Object.entries(result.applied ?? {}).filter(([key, n]) =>
            ['tables', 'seed_rows', 'queries', 'queries_updated'].includes(key) && n)),
          tables: result.refs?.tables ?? {},
          queries: result.refs?.queries ?? {},
          ...(result.read_check ? { read_check: result.read_check } : {}),
          ...(result.validation && !result.validation.ok ? { validation_errors: result.validation.errors } : {}),
          ...(warnings.length ? { warnings } : {}),
        });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
