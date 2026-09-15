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
