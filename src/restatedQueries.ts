import type { AppSummary } from './tooljetClient.js';
import { prepareQueryOptionsForWrite } from './queryPersistence.js';

/**
 * Plan queries that say again, word for word, what the app already holds.
 *
 * A query is app-wide, and a page that reads one another page defined often restates it. That was a collision
 * ("App already has a query named ...", the most frequent plan error over a hundred builds), although nothing would
 * change. A plan query is a restatement when the app has a query of that name on the same datasource whose stored
 * options equal the plan's after the preparation every write goes through. It leaves the plan: refs to its name
 * resolve to the query in the app, and nothing is written for it.
 */
interface PlanQuery {
  name: string;
  datasource_id?: string;
  datasource_name?: string;
  kind?: string;
  table_ref?: string;
  options: Record<string, unknown>;
}

const stable = (value: unknown): string =>
  JSON.stringify(value, (_key, inner) =>
    inner && typeof inner === 'object' && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : inner);

export function restatedQueryNames(
  summary: AppSummary,
  queries: PlanQuery[],
  tables: Array<{ id: string; table_name: string }>,
  datasources: Array<{ id: string; name: string; kind: string }>,
): string[] {
  const restated: string[] = [];
  for (const query of queries) {
    const held = summary.queries.filter((existing) => existing.name === query.name);
    if (held.length !== 1) continue;
    const existing = held[0]!;
    const named = query.datasource_name !== undefined ? datasources.filter((source) => source.name === query.datasource_name) : [];
    const datasource = query.datasource_id !== undefined
      ? datasources.find((source) => source.id === query.datasource_id)
      : named.length === 1 ? named[0] : undefined;
    if (!datasource || datasource.id !== existing.data_source_id) continue;
    const options = structuredClone(query.options ?? {});
    if (query.table_ref) {
      const table = tables.find((candidate) => candidate.table_name.toLowerCase() === query.table_ref!.toLowerCase());
      if (!table) continue;
      options.table_id = table.id;
    }
    const prepared = prepareQueryOptionsForWrite(datasource.kind, options, `Query "${query.name}"`);
    if (prepared.errors.length) continue;
    if (stable(prepared.options) === stable(existing.options ?? {})) restated.push(query.name);
  }
  return restated;
}
