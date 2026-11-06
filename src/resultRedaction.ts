/*
  What a query run may hand back to the model.

  A REST query's result carries metadata.request (the URL with its query string, and the request headers the plugin
  did not recognise as secret), metadata.queryDefinition (the full URL again) and, on a failure, requestObject,
  responseObject and the raw responseHeaders (Set-Cookie included). The plugins redact a few header names, exactly and
  case-sensitively, so a custom auth header or an ?api_key= reached the model, the model provider and traces, and a
  response could ask the model to repeat them. The rows (data) are what the run is for and stay as they are; this
  removes credentials from everything around them:

  - request headers are dropped; response headers keep a short allowlist (content type, paging, rate limits);
  - URLs lose their user info and the values of query parameters whose names look secret;
  - any field named like a credential (authorization, cookie, api key, password, token, secret, connection string)
    inside the request, response and metadata parts is replaced by "[redacted]";
  - error messages lose secret query values in any URL they quote.
*/

const REDACTED = '[redacted]';

/** Names of headers, parameters and fields that carry credentials. */
const SECRET_NAME =
  /(^|[-_.\s])(auth|authorization|bearer|token|access[-_]?token|refresh[-_]?token|id[-_]?token|secret|client[-_]?secret|password|passwd|pwd|api[-_]?key|apikey|key|private[-_]?key|access[-_]?key|signature|sig|session|cookie|set[-_]?cookie|credential|credentials|connection[-_]?string|dsn)([-_.\s]|$)|^x-api-|token$|secret$|password$|apikey$|api_key$/i;

/** Response headers worth showing: what the body is, paging, limits. */
const RESPONSE_HEADERS = new Set([
  'content-type', 'content-length', 'content-range', 'content-encoding', 'link', 'etag', 'last-modified', 'date',
  'cache-control', 'retry-after', 'x-total-count', 'x-total', 'x-total-pages', 'x-page', 'x-per-page', 'x-next-page',
  'x-request-id', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'ratelimit-limit',
  'ratelimit-remaining', 'ratelimit-reset',
]);

export const isSecretName = (name: string): boolean => SECRET_NAME.test(name);

/** A URL without user info, with the values of secret-looking query parameters replaced. Non-URLs pass unchanged. */
export function redactUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return redactQueryText(value);
  }
  if (url.username || url.password) {
    url.username = '';
    url.password = '';
  }
  for (const name of [...url.searchParams.keys()]) if (isSecretName(name)) url.searchParams.set(name, REDACTED);
  return url.toString();
}

/** Secret query values inside free text (an error message quoting a URL). */
export function redactQueryText(text: string): string {
  return text
    .replace(/([?&;]([A-Za-z0-9_.\-[\]]+)=)([^&\s"'<>#]+)/g, (match, prefix: string, name: string) => (isSecretName(name) ? `${prefix}${REDACTED}` : match))
    .replace(/(\b[a-z][a-z0-9+.-]*:\/\/)([^/\s:@"']+):([^/\s@"']+)@/gi, `$1${REDACTED}@`)
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/g, `$1 ${REDACTED}`);
}

type Json = unknown;
const isRecord = (value: Json): value is Record<string, Json> => !!value && typeof value === 'object' && !Array.isArray(value);

/** A request, response or metadata part: credential fields replaced, URLs and text redacted, everywhere inside. */
function scrub(value: Json, depth = 0): Json {
  if (depth > 8) return REDACTED;
  if (typeof value === 'string') return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? redactUrl(value) : redactQueryText(value);
  if (Array.isArray(value)) {
    // A header list as name/value pairs: ["Authorization", "Bearer x"].
    if (value.length === 2 && typeof value[0] === 'string' && isSecretName(value[0])) return [value[0], REDACTED];
    return value.map((item) => scrub(item, depth + 1));
  }
  if (!isRecord(value)) return value;
  const out: Record<string, Json> = {};
  for (const [key, child] of Object.entries(value)) {
    if (isSecretName(key) && child !== null && child !== undefined && child !== '') out[key] = REDACTED;
    else out[key] = scrub(child, depth + 1);
  }
  return out;
}

/** Response headers through the allowlist (any case). */
function responseHeaders(headers: Json): Json {
  if (!isRecord(headers)) return undefined;
  return Object.fromEntries(Object.entries(headers).filter(([name]) => RESPONSE_HEADERS.has(name.toLowerCase())));
}

const REQUEST_KEYS = ['method', 'url', 'requestUrl', 'params', 'requestParams', 'statusCode'];

/** A request description: method, URL and parameters (redacted); never headers or body. */
function request(value: Json): Json {
  if (!isRecord(value)) return typeof value === 'string' ? redactUrl(value) : undefined;
  const out: Record<string, Json> = {};
  for (const key of REQUEST_KEYS) if (value[key] !== undefined) out[key] = scrub(value[key]);
  return out;
}

/** A response description: status and the allowlisted headers; a body only where it is the error's own text. */
function response(value: Json): Json {
  if (!isRecord(value)) return undefined;
  const out: Record<string, Json> = {};
  for (const [key, child] of Object.entries(value)) {
    if (/^(headers|responseHeaders)$/i.test(key)) out[key] = responseHeaders(child);
    else out[key] = scrub(child);
  }
  return out;
}

function metadata(value: Json): Json {
  if (!isRecord(value)) return value;
  const out: Record<string, Json> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === 'request') out[key] = request(child);
    else if (key === 'response') out[key] = response(child);
    // The full URL (REST) or the raw request message (gRPC): the URL redacted, a message dropped.
    else if (key === 'queryDefinition') out[key] = typeof child === 'string' && /^[a-z][a-z0-9+.-]*:\/\//i.test(child) ? redactUrl(child) : undefined;
    else out[key] = scrub(child);
  }
  return out;
}

/** The parts of a failed run's data that describe the request, not rows. */
function failureParts(value: Record<string, Json>): Record<string, Json> {
  const out: Record<string, Json> = { ...value };
  if ('requestObject' in out) out.requestObject = request(out.requestObject);
  if ('responseObject' in out) out.responseObject = response(out.responseObject);
  if ('responseHeaders' in out) out.responseHeaders = responseHeaders(out.responseHeaders);
  for (const key of ['options', 'connection', 'connectionOptions', 'sourceOptions']) if (key in out) delete out[key];
  return out;
}

/**
 * A run_query / run_queries result as the model may see it: rows untouched, credentials around them removed. Returns a
 * new object; the input is not changed.
 */
export function redactRunResult<T extends Record<string, unknown>>(result: T): T {
  if (!isRecord(result)) return result;
  const out: Record<string, Json> = failureParts(result);
  if ('metadata' in out) out.metadata = metadata(out.metadata);
  for (const key of ['message', 'description', 'errorMessage']) if (typeof out[key] === 'string') out[key] = redactQueryText(out[key] as string);
  if (isRecord(out.data)) out.data = failureParts(out.data);
  return out as T;
}
