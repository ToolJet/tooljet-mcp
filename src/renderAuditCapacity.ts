let running = 0;
const grants = new Set<string>();

/** One browser per approval and a bounded process-wide pool; rejected work never queues credentials. */
export function reserveRenderAudit(grant?: string): (() => void) | undefined {
  const configured = Number(process.env.MCP_RENDER_AUDIT_MAX_BROWSERS ?? 2);
  const limit = Number.isInteger(configured) && configured >= 1 && configured <= 32 ? configured : 2;
  if (running >= limit || (grant && grants.has(grant))) return undefined;
  running++;
  if (grant) grants.add(grant);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    running--;
    if (grant) grants.delete(grant);
  };
}
