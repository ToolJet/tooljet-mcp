/*
  How a run nobody asked for executes: the read check after apply_app_phase and code_app_data, and run_queries (the
  agent's finish step and binding probes). autoReadPreflight.ts decides whether such a run may happen at all (a proven
  read, a row LIMIT of at most 1000 on the outer SELECT, no cross product). This bounds what it costs this side:

  - the run is given up after MCP_UNATTENDED_READ_TIMEOUT_MS (default 30 s) and reported as failed, not checked;
  - what reaches the model is capped at MCP_UNATTENDED_READ_MAX_ROWS rows (default 200) and about
    MCP_UNATTENDED_READ_MAX_BYTES of JSON (default 256 KiB), with the full row count beside it.

  The database query itself is not stopped by giving up here: ToolJet's connectors decide that. A read-only
  transaction, a statement timeout on every edition and a row or byte cap at the executor are the datasource side's
  (Platform: data-queries and the plugins), and only they can rule out a view or routine that writes.
*/
import type { ToolJetClient } from './tooljetClient.js';

const positive = (name: string, fallback: number): number => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};
export const unattendedTimeoutMs = (): number => positive('MCP_UNATTENDED_READ_TIMEOUT_MS', 30_000);
const maxRows = (): number => positive('MCP_UNATTENDED_READ_MAX_ROWS', 200);
const maxBytes = (): number => positive('MCP_UNATTENDED_READ_MAX_BYTES', 256 * 1024);

type RunParams = Parameters<ToolJetClient['runQuery']>[0];

/** client.runQuery with a deadline: past it, a failed result that says the check stopped waiting. */
export async function runUnattended(client: Pick<ToolJetClient, 'runQuery'>, params: RunParams): Promise<Record<string, unknown>> {
  const timeout = unattendedTimeoutMs();
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<Record<string, unknown>>((resolve) => {
    timer = setTimeout(() => resolve({
      status: 'failed',
      timed_out: true,
      message: `The automatic check stopped waiting after ${Math.round(timeout / 1000)} s, so this query was not checked. ` +
        'Make it cheaper (an index, a narrower filter, a smaller LIMIT) or run it once with run_query.',
    }), timeout);
  });
  try {
    return await Promise.race([client.runQuery(params) as Promise<Record<string, unknown>>, late]);
  } finally {
    clearTimeout(timer);
  }
}

/** The rows of a result, wherever the connector puts them (data, or data.results for ToolJet Database SQL). */
const rowsOf = (result: Record<string, unknown>): { rows: unknown[]; nested: boolean } | undefined => {
  const data = result.data as unknown;
  if (Array.isArray(data)) return { rows: data, nested: false };
  const results = (data as { results?: unknown } | null | undefined)?.results;
  return Array.isArray(results) ? { rows: results, nested: true } : undefined;
};

/** The result with at most maxRows() rows and about maxBytes() of JSON, and `truncated` saying what was left out. */
export function capUnattendedOutput<T extends Record<string, unknown>>(result: T): T {
  const found = rowsOf(result);
  const size = (value: unknown): number => {
    try {
      return JSON.stringify(value)?.length ?? 0;
    } catch {
      return Infinity;
    }
  };
  if (!found) {
    if (size(result.data) <= maxBytes()) return result;
    return { ...result, data: undefined, truncated: { note: `The result was larger than ${maxBytes()} characters and is not shown.` } };
  }
  let shown = found.rows.slice(0, maxRows());
  while (shown.length > 1 && size(shown) > maxBytes()) shown = shown.slice(0, Math.floor(shown.length / 2));
  if (shown.length === 1 && size(shown) > maxBytes()) shown = [];
  if (shown.length === found.rows.length) return result;
  const data = found.nested ? { ...(result.data as Record<string, unknown>), results: shown } : shown;
  return { ...result, data, truncated: { row_count: found.rows.length, rows_shown: shown.length } };
}
