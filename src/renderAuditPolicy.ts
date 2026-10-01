import type { AppSummary } from './tooljetClient.js';
import { assessQueryRead } from './queryExecutionSafety.js';

/** Host-controlled allowlist. Private/self-hosted destinations are valid only when explicitly
 * configured; model-supplied viewer_url is never authority to expand browser network access. */
export function httpUrl(value: string): URL {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Render audit URLs must use HTTP(S) without embedded credentials');
  }
  return url;
}

export function renderAuditOrigins(configuredBase: string, additional = ''): Set<string> {
  return new Set([httpUrl(configuredBase).origin, ...additional.split(',').map((s) => s.trim())
    .filter(Boolean).map((s) => httpUrl(s).origin)]);
}

export function renderAuditUrlAllowed(value: string, origins: Set<string>): boolean {
  try { return origins.has(httpUrl(value).origin); } catch { return false; }
}

export function renderAuditBase(configuredBase: string, override?: string): { base: string; origins: Set<string> } {
  const origins = renderAuditOrigins(configuredBase, process.env.MCP_RENDER_AUDIT_ALLOWED_ORIGINS);
  const url = httpUrl(override ?? configuredBase);
  if (!origins.has(url.origin)) throw new Error('viewer_url origin is not configured for render audits');
  if (url.search || url.hash) throw new Error('viewer_url must be a base URL without query or fragment');
  return { base: url.href.replace(/\/$/, ''), origins };
}

export type RenderAuditQueries = Pick<AppSummary, 'version_id' | 'queries'>;

function hasBinding(value: unknown): boolean {
  if (typeof value === 'string') return value.includes('{{');
  if (Array.isArray(value)) return value.some(hasBinding);
  return !!value && typeof value === 'object' && Object.values(value).some(hasBinding);
}

/** Browser events can trigger queries at any time, not just during page load. */
export function renderAuditRequest(
  url: string, method: string, saved?: RenderAuditQueries,
): { allowed: boolean; postData?: string; detail?: string } {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return { allowed: true };
  const blocked = (detail: string) => ({ allowed: false, detail: `${detail}; this behavior was not verified` });
  if (method !== 'POST' || !saved?.version_id) return blocked('A potentially mutating request was blocked');
  const parsed = httpUrl(url);
  const match = parsed.pathname.match(/\/api\/data-queries\/([A-Za-z0-9_-]+)(?:\/versions\/([A-Za-z0-9_-]+))?\/run(?:\/([A-Za-z0-9_-]+))?$/);
  if (!match || (match[2] && (match[2] !== saved.version_id || !match[3] || parsed.searchParams.get('mode') !== 'view')) ||
      (!match[2] && match[3])) return blocked('An unverified query or mutating request was blocked');
  const query = saved.queries.find((item) => item.id === match[1]);
  if (!query) return blocked('A query outside the audited app/version was blocked');
  const options = query.options as Record<string, unknown> | undefined;
  if (hasBinding(options)) return blocked('A query with dynamic bindings was blocked');
  if (options?.requestConfirmation || options?.request_confirmation) return blocked('A query requiring confirmation was blocked');
  const read = assessQueryRead(query);
  if (!read.provenRead || !read.directSafe || read.requiresCountPreflight ||
      read.requiresRemoteReadConfirmation || read.requiresBillableReadConfirmation) {
    return blocked('A query that is not a proven bounded read was blocked');
  }
  // Never forward browser-supplied options: the run endpoint can persist them. Static saved
  // options need no binding values, so neither overrides nor resolved SQL can cross this boundary.
  return { allowed: true, postData: JSON.stringify({ resolvedOptions: {} }) };
}
