import { parse as parseYaml } from 'yaml';

/* OpenAPI endpoint discovery, served from the datasource's stored spec.
 *
 * The OpenAPI plugin implements listTables but no `invokeMethod`, so ToolJet's /api/data-sources/:id/
 * invoke route answers every call with 400 "Plugin openapi does not support method invocation" — the
 * path every other kind's introspection uses. Without a way in, the agent cannot learn a single path,
 * method or parameter name, and openapi is unbuildable.
 *
 * The spec itself is reachable: it is a plain, unencrypted datasource option (`options.spec`; only
 * password/bearer_token/client_secret are encrypted), and the environment route returns stored
 * options unfiltered. Reading it here gives both the endpoint list and each endpoint's parameters,
 * which the plugin's own listTables does not — it returns path/method/summary/operationId only.
 */

export interface OpenapiEndpoint {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  deprecated?: boolean;
}

export interface OpenapiParameter {
  name: string;
  in: string;
  required: boolean;
  type?: string;
  description?: string;
  enum?: unknown[];
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

function record(value: unknown): Record<string, any> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : undefined;
}

/** The spec as stored. ToolJet keeps datasource options as `{ <key>: { value } }`, but the raw
 *  object has been observed directly under the key too, and a spec pasted as text stays a string.
 *
 *  A pasted string may be JSON or YAML: the OpenAPI ecosystem publishes at least as much YAML as
 *  JSON (Open-Meteo and many vendor specs ship YAML only), and the datasource form takes whatever
 *  the user pastes. JSON is tried first because every JSON document is also valid YAML 1.2 — but
 *  the dedicated parser is faster and its errors are the ones worth surfacing for JSON input. */
export function extractSpec(options: Record<string, unknown>): Record<string, any> | undefined {
  // Two option keys carry the same document. `spec` is the parsed copy the current form writes;
  // `definition` is the raw text the user pasted, and is the one the previous agent generation read.
  // A datasource can carry `definition` without `spec`, so falling back keeps those introspectable.
  for (const key of ['spec', 'definition'] as const) {
    const parsed = parseSpecEntry(options[key]);
    if (parsed?.paths) return parsed;
  }
  return undefined;
}

function parseSpecEntry(entry: unknown): Record<string, any> | undefined {
  const unwrapped = record(entry)?.value !== undefined ? record(entry)!.value : entry;
  if (typeof unwrapped === 'string') {
    try {
      return record(JSON.parse(unwrapped));
    } catch {
      // Not JSON. Fall through to YAML rather than giving up: `prettyErrors: false` keeps the
      // throw cheap, and a genuinely malformed document still ends up as `undefined`.
      try {
        return record(parseYaml(unwrapped, { prettyErrors: false }));
      } catch {
        return undefined;
      }
    }
  }
  return record(unwrapped);
}

function schemaType(schema: Record<string, any> | undefined): string | undefined {
  if (!schema) return undefined;
  if (typeof schema.type === 'string') {
    return schema.type === 'array' && record(schema.items)?.type
      ? `array<${record(schema.items)!.type}>`
      : schema.type;
  }
  return schema.$ref ? String(schema.$ref) : undefined;
}

export function listEndpoints(spec: Record<string, any>): OpenapiEndpoint[] {
  const paths = record(spec.paths) ?? {};
  return Object.entries(paths).flatMap(([path, methods]) => {
    const byMethod = record(methods) ?? {};
    return Object.keys(byMethod)
      .filter((method) => HTTP_METHODS.includes(method.toLowerCase()))
      .map((method) => {
        const operation = record(byMethod[method]) ?? {};
        return {
          path,
          method: method.toLowerCase(),
          ...(operation.operationId ? { operationId: String(operation.operationId) } : {}),
          ...(operation.summary ? { summary: String(operation.summary) } : {}),
          ...(operation.deprecated === true ? { deprecated: true } : {}),
        };
      });
  });
}

/** Resolve a local `#/components/...` or `#/definitions/...` reference; anything else is left alone,
 *  since an external document is not available here. */
function deref(spec: Record<string, any>, node: unknown, seen = new Set<string>()): Record<string, any> | undefined {
  const value = record(node);
  if (!value) return undefined;
  const ref = typeof value.$ref === 'string' ? value.$ref : undefined;
  if (!ref || !ref.startsWith('#/') || seen.has(ref)) return value;
  seen.add(ref);
  const resolved = ref
    .slice(2)
    .split('/')
    .reduce<unknown>((node, segment) => record(node)?.[segment.replace(/~1/g, '/').replace(/~0/g, '~')], spec);
  return deref(spec, resolved, seen) ?? value;
}

/** Parameters for one endpoint, path-level and operation-level merged (operation wins on a clash,
 *  per the spec), plus the request body flattened into the same shape so one list covers every
 *  bucket the plugin's `params` takes. */
export function endpointParameters(
  spec: Record<string, any>,
  path: string,
  method: string
): { parameters: OpenapiParameter[]; requestBody?: Record<string, any>; found: boolean } {
  const pathItem = record(record(spec.paths)?.[path]);
  const operation = record(pathItem?.[method.toLowerCase()]);
  if (!pathItem || !operation) return { parameters: [], found: false };

  const raw = [...(Array.isArray(pathItem.parameters) ? pathItem.parameters : []),
               ...(Array.isArray(operation.parameters) ? operation.parameters : [])];
  const byKey = new Map<string, OpenapiParameter>();
  for (const entry of raw) {
    const parameter = deref(spec, entry);
    if (!parameter || typeof parameter.name !== 'string') continue;
    // OpenAPI 3 nests the type under `schema`; Swagger 2 puts it on the parameter itself.
    const schema = deref(spec, parameter.schema) ?? parameter;
    byKey.set(`${parameter.in}:${parameter.name}`, {
      name: parameter.name,
      in: typeof parameter.in === 'string' ? parameter.in : 'query',
      required: parameter.required === true || parameter.in === 'path',
      ...(schemaType(schema) ? { type: schemaType(schema) } : {}),
      ...(parameter.description ? { description: String(parameter.description) } : {}),
      ...(Array.isArray(schema.enum) ? { enum: schema.enum } : {}),
    });
  }

  const body = deref(spec, operation.requestBody);
  const json = body && record(body.content)
    ? record(record(body.content)!['application/json'])
    : undefined;
  const bodySchema = json ? deref(spec, json.schema) : undefined;

  return {
    parameters: [...byKey.values()],
    ...(bodySchema
      ? { requestBody: { required: body?.required === true, schema: bodySchema } }
      : {}),
    found: true,
  };
}

/** Base URL for requests, from the spec itself.
 *
 * The plugin resolves `sourceOptions.host || queryOptions.host`, and the OpenAPI datasource form has
 * no host field at all — the base URL only ever lives in the spec. So unless a deployment has set a
 * host on the datasource, a query that omits `host` builds `new URL(undefined + path)` and dies with
 * "Invalid URL". Reading it here is what makes a generated query runnable.
 *
 * The trailing slash matters: `servers[0].url` conventionally ends in one and every `path` begins
 * with one, so a naive concat yields `https://host//quote`, which some gateways 404 on.
 */
export function specHost(spec: Record<string, any>): string | undefined {
  const server = Array.isArray(spec.servers) ? record(spec.servers[0]) : undefined;
  const url = typeof server?.url === 'string' ? server.url : undefined;
  // A relative server URL (Swagger Petstore ships "/api/v3") is meaningless without the origin the
  // document was served from, which is not recorded on the datasource. Returning it would hand back
  // a `host` that fails in `new URL()` exactly like no host at all, so report none and let the
  // caller supply the real origin.
  if (url && /^https?:\/\//i.test(url)) return url.replace(/\/+$/, '');
  // Swagger 2 splits the same value across three fields.
  if (typeof spec.host === 'string' && spec.host) {
    const scheme = Array.isArray(spec.schemes) && typeof spec.schemes[0] === 'string' ? spec.schemes[0] : 'https';
    const basePath = typeof spec.basePath === 'string' ? spec.basePath : '';
    return `${scheme}://${spec.host}${basePath}`.replace(/\/+$/, '');
  }
  return undefined;
}

/* Endpoint search, scored locally against the spec.
 *
 * A large spec is unusable by substring match: GitHub's 1225 endpoints return 0 hits for "list open
 * issues for a repo" (no endpoint contains that literal phrase) and, unfiltered, hand back the 200
 * alphabetically-first paths — none of them relevant. The caller then learns nothing and guesses.
 *
 * Everything needed to rank is already in the parsed document, so this stays pure local
 * computation: no extra fetch, no index to maintain, no dependency. */

/* Words that appear in most endpoint descriptions carry no signal, and IDF alone does not fully
   discount them on a small corpus. */
const SEARCH_STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'of', 'for', 'to', 'in', 'on', 'by', 'with', 'from', 'at', 'as', 'or',
  'is', 'are', 'be', 'this', 'that', 'it', 'its', 'all', 'any', 'you', 'your', 'api', 'endpoint',
]);

/** Split into lowercase word tokens: `getUserRepos` and `user_repos/{id}` both yield user + repo. */
function tokenize(text: string): string[] {
  return text
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')     // camelCase boundary
    .toLowerCase()
    .split(/[^a-z\d]+/)
    .filter((token) => token.length > 1 && !SEARCH_STOPWORDS.has(token))
    // Crude singularisation, so "issues" matches "issue". Deliberately not a real stemmer: the
    // corpus is short identifier-like text where aggressive stemming collides more than it helps.
    .map((token) => (token.length > 3 && token.endsWith('s') && !token.endsWith('ss') ? token.slice(0, -1) : token));
}

/* Searchable text, split by how much the field says about what the operation IS.
 *
 * `identity` — path, operationId, summary, tags — names the operation. `description` is prose that
 * mentions neighbouring concepts: GitHub's "workflow permissions" endpoints describe who "can
 * approve pull request reviews", and its issue-types endpoint says you can "create a new issue
 * type". Scoring those equally makes a passing mention outrank the endpoint actually named by the
 * query, so description matches count for a fraction and never trigger the phrase bonus. */
const DESCRIPTION_WEIGHT = 0.2;

/* How much to reward an operation whose own name the query fully accounts for.
 *
 * "create a new issue" matches `POST /repos/{owner}/{repo}/issues` ("Create an issue") and
 * `POST /orgs/{org}/issue-fields` ("Create issue field for an organization") on the same two
 * tokens, and the latter edges ahead because its description happens to say "Creates a new issue
 * field". But the query names every concept in the first summary and only half of the second: an
 * operation that introduces concepts the user never mentioned is less likely to be the one meant.
 * Scaling by that coverage separates them without hard-coding either. */
const NAME_COVERAGE_BONUS = 4;

function endpointFields(
  spec: Record<string, any>,
  endpoint: OpenapiEndpoint
): { name: string; identity: string; description: string; tags?: string[] } {
  const operation = record(record(record(spec.paths)?.[endpoint.path])?.[endpoint.method]) ?? {};
  const tags = Array.isArray(operation.tags) ? operation.tags.map(String) : undefined;
  return {
    // The operation's own name, for coverage: its summary, else its operationId.
    name: endpoint.summary || endpoint.operationId || '',
    identity: `${endpoint.path} ${endpoint.method} ${endpoint.operationId ?? ''} ${endpoint.summary ?? ''} ${tags?.join(' ') ?? ''}`,
    // Only the opening carries the topic; the rest is auth notes and changelog.
    description: typeof operation.description === 'string' ? operation.description.slice(0, 300) : '',
    ...(tags?.length ? { tags } : {}),
  };
}

export interface RankedEndpoint extends OpenapiEndpoint {
  score: number;
  tags?: string[];
}

/** Endpoints ordered by relevance to `query`, best first, scores > 0 only.
 *
 *  Scoring is BM25's idea without its tuning knobs: a query token is worth log(N / documents
 *  containing it), so a token naming the domain ("issue") outweighs a generic one ("list"), and
 *  matching more distinct query tokens always beats repeating one. A whole-phrase substring hit is
 *  boosted so an exact query still wins outright — that keeps precise lookups behaving as before. */
export function rankEndpoints(
  spec: Record<string, any>,
  endpoints: OpenapiEndpoint[],
  query: string
): RankedEndpoint[] {
  const queryTokens = [...new Set(tokenize(query))];
  if (!queryTokens.length) return [];
  const phrase = query.trim().toLowerCase();

  const documents = endpoints.map((endpoint) => {
    const fields = endpointFields(spec, endpoint);
    return {
      endpoint,
      identityText: fields.identity.toLowerCase(),
      identity: new Set(tokenize(fields.identity)),
      description: new Set(tokenize(fields.description)),
      name: new Set(tokenize(fields.name)),
      tags: fields.tags,
    };
  });

  // IDF over the identity field only, so a token's weight reflects how well it distinguishes one
  // operation from another rather than how often it appears in prose.
  const documentFrequency = new Map<string, number>();
  for (const token of queryTokens) {
    documentFrequency.set(token, documents.filter((document) => document.identity.has(token)).length);
  }

  const queryTokenSet = new Set(queryTokens);
  const scored = documents.map(({ endpoint, identityText, identity, description, name, tags }) => {
    let score = 0;
    for (const token of queryTokens) {
      const inIdentity = identity.has(token);
      if (!inIdentity && !description.has(token)) continue;
      const idf = Math.log(1 + documents.length / (1 + (documentFrequency.get(token) ?? 0)));
      score += inIdentity ? idf : idf * DESCRIPTION_WEIGHT;
    }
    // A literal match of the whole query against the operation's own name is the strongest signal
    // of intent there is; the same phrase inside a description is not.
    if (score > 0 && identityText.includes(phrase)) score += 10;
    if (score > 0 && name.size) {
      const covered = [...name].filter((token) => queryTokenSet.has(token)).length;
      score += NAME_COVERAGE_BONUS * (covered / name.size);
    }
    if (score > 0 && endpoint.deprecated) score -= 0.5;
    return { ...endpoint, score, ...(tags?.length ? { tags } : {}) };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));
}

/** How many operations sit under each spec tag, most populous first.
 *
 *  With no query there is nothing to rank, and a truncated alphabetical slice of a large spec tells
 *  the caller nothing about what the API covers. The tag histogram is the spec's own table of
 *  contents, and it fits in a few lines however large the document is. */
export function endpointTagCounts(spec: Record<string, any>, endpoints: OpenapiEndpoint[]): Record<string, number> {
  const counts = new Map<string, number>();
  for (const endpoint of endpoints) {
    const tags = endpointFields(spec, endpoint).tags ?? ['untagged'];
    for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1]));
}
