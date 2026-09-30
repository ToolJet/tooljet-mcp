/**
 * Plugins whose query editor is ToolJet's API-endpoint picker over ONE OpenAPI spec (Stripe, Gmail, Google Calendar,
 * QuickBooks, Intercom, ClickUp, Confluence, EasyPost). A query is `{ operation, path, params: { path, query, request } }`
 * with `operation` the HTTP method; the plugin fixes the host and authentication.
 *
 * Stripe build (Luna, 2026-09-27): the query schema said these operations live in the remote spec and to inspect it by
 * hand, and inspect_datasource_schema offered no methods for the kind, so both arms stopped without building. They get
 * HubSpot's discovery now (listTables, getEndpointSchema), from the spec the plugin itself uses. Multi-spec kinds
 * (FedEx, UPS, Xero, Microsoft Graph, AfterShip) each select a spec their own way and are not covered here.
 */
import { getDatasourceQuerySchema, type DatasourceSpecRef } from './datasourceCatalog.js';
import { extractSpec } from './openapiSpec.js';
import type { ToolJetClient } from './tooljetClient.js';

export const SPEC_DISCOVERY_METHODS = ['listTables', 'getEndpointSchema'];
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

/** The kind's one spec, when its operations come from a single OpenAPI document (HubSpot has its own handling). */
export function singleSpecRef(kind: string): DatasourceSpecRef | undefined {
  if (kind === 'hubspot') return undefined;
  const selection = getDatasourceQuerySchema(kind)?.operationSelection;
  if (selection?.mode !== 'remote-spec' || selection.specs?.length !== 1) return undefined;
  const ref = selection.specs[0]!;
  return ref.location === 'remote' || (ref.location === 'bundled' && ref.plugin && ref.name) ? ref : undefined;
}

export const SPEC_DISCOVERY_NOTE =
  'Operations come from the plugin\'s API spec. Discover them with inspect_datasource_schema: listTables (pass `search`, ' +
  'such as "charges") finds endpoints, and getEndpointSchema (table = the path, args.operation = the HTTP method) returns ' +
  'query_options to copy as they are: operation (the lowercase HTTP method), path, and params with path, query and request ' +
  'objects (each present, {} when empty). Query values are flat: created[gte], expand[0], never a list or an object. The ' +
  'plugin fixes the host and authentication.';

// A spec is large (Stripe's is several MB) and every getEndpointSchema reads it, so it is kept an hour. Two caches:
//  - a public remote spec (ref.location "remote") is the same document for everyone and is shared process-wide;
//  - a bundled spec is read through the calling ToolJet server, whose installed plugin may differ from another
//    server's, and one shared MCP process serves many servers. It is cached per server (the client's
//    specCacheScope: API URL + workspace), and not at all for a client that cannot name its server.
// The spec route carries no plugin revision; the hour bounds how long an upgraded plugin's old spec is served.
// A failed or invalid load is dropped at once, so the next call retries; concurrent callers share one read.
type SpecClient = Pick<ToolJetClient, 'getPluginSpec'> & Partial<Pick<ToolJetClient, 'specCacheScope'>>;
type Entry = { at: number; spec: Promise<Record<string, any>> };
const publicCache = new Map<string, Entry>();
const serverCache = new Map<string, Entry>();
const TTL_MS = 60 * 60 * 1000;
export function clearKindSpecCache(): void { publicCache.clear(); serverCache.clear(); }

function readSpec(client: SpecClient, kind: string, ref: DatasourceSpecRef): Promise<Record<string, any>> {
  return (async () => {
    const text = ref.location === 'remote'
      ? await fetch(ref.ref, { signal: AbortSignal.timeout(60_000) }).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
      : await client.getPluginSpec(ref.plugin!, ref.name!);
    const parsed = extractSpec({ spec: text });
    if (!parsed) throw new Error('not an OpenAPI document');
    return parsed;
  })().catch((error: unknown) => {
    throw new Error(`The ${kind} API spec could not be read (${error instanceof Error ? error.message : String(error)}); do not invent its endpoints.`);
  });
}

function cached(cache: Map<string, Entry>, key: string, load: () => Promise<Record<string, any>>): Promise<Record<string, any>> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.spec;
  const entry: Entry = { at: Date.now(), spec: load() };
  // Drop only this entry: a later successful load under the same key must survive an earlier failure.
  entry.spec.catch(() => { if (cache.get(key) === entry) cache.delete(key); });
  cache.set(key, entry);
  return entry.spec;
}

export async function loadKindSpec(client: SpecClient, kind: string, ref: DatasourceSpecRef): Promise<Record<string, any>> {
  if (ref.location === 'remote') return cached(publicCache, ref.ref, () => readSpec(client, kind, ref));
  let scope: string | undefined;
  try {
    scope = await client.specCacheScope?.();
  } catch {
    scope = undefined;
  }
  if (!scope) return readSpec(client, kind, ref);
  return cached(serverCache, JSON.stringify([scope, ref.plugin, ref.name]), () => readSpec(client, kind, ref));
}

/** Shape problems the plugin would hit at run time (it reads every params bucket) or that mean a guessed query. */
export function apiEndpointQueryIssues(kind: string, options: Record<string, unknown>): Array<{ path: string; message: string }> {
  if (!singleSpecRef(kind)) return [];
  const issues: Array<{ path: string; message: string }> = [];
  const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
  if (!HTTP_METHODS.includes(String(options.operation))) {
    issues.push({ path: 'operation', message: `${kind} operation is the endpoint's lowercase HTTP method (get, post, ...) from getEndpointSchema.` });
  }
  if (typeof options.path !== 'string' || !/^\/(?!\/)[^\s?#]*$/.test(options.path) || options.path.includes('{{')) {
    issues.push({ path: 'path', message: `${kind} needs the static endpoint path from getEndpointSchema (such as /v1/charges), not a URL; put IDs in params.path.` });
  }
  for (const bucket of ['path', 'query', 'request']) {
    if (!record(options.params) || !record(options.params[bucket])) {
      issues.push({ path: `params.${bucket}`, message: `${kind} reads params.${bucket} on every run; give it as an object, {} when empty.` });
    }
  }
  // The plugins hand params.query to got's searchParams, which takes flat values only: a list or an object threw before
  // any request ("Cannot read properties of undefined (reading 'body')", four of five Stripe queries, 2026-09-27).
  if (record(options.params) && record(options.params.query)) {
    for (const [key, value] of Object.entries(options.params.query)) {
      // The plugin sends every key it is given, so an empty fallback still sends the key, empty: Stripe refused
      // starting_after="" on every paged query (parameter_invalid_empty). Undefined leaves the key out of the request.
      if (typeof value === 'string' && /(\|\||\?\?|:)\s*(''|"")\s*\}\}\s*$/.test(value)) {
        issues.push({ path: `params.query.${key}`, message: `${kind} sends every query key it is given, so an empty fallback still sends ${key}="", which the API refuses. Fall back to undefined instead (such as {{variables.cursor || undefined}}) so the key is left out while it has no value.` });
        continue;
      }
      if (value === null || typeof value !== 'object') continue;
      const flat = flattenQueryValue(key, value).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ');
      issues.push({ path: `params.query.${key}`, message: `${kind} sends query parameters flat, so a list or an object is not sent at all and the query fails. Write ${flat} instead.` });
    }
  }
  if (typeof options.path === 'string' && record(options.params) && record(options.params.path)) {
    for (const match of options.path.matchAll(/\{([^{}]+)\}/g)) {
      const value = options.params.path[match[1]!];
      if (value === undefined || value === null || value === '') issues.push({ path: `params.path.${match[1]}`, message: 'Provide a value for every endpoint path placeholder.' });
    }
  }
  return issues;
}

/** A nested query value as the flat bracket keys these APIs take: created: { gte: x } is created[gte], expand: [a] is expand[0]. */
export function flattenQueryValue(key: string, value: unknown): Array<[string, unknown]> {
  if (value === null || typeof value !== 'object') return [[key, value]];
  const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v] as const) : Object.entries(value as Record<string, unknown>);
  return entries.flatMap(([k, v]) => flattenQueryValue(`${key}[${k}]`, v));
}
