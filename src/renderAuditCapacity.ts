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

/**
 * The same reservation, waiting for a browser when the pool is full. The model sends a route check per
 * route in one message and the agent runs up to three at once; a refusal for the third sent models back to one check a
 * turn (7 refusals in 10 builds, 2026-11-03). Nothing but this call waits: no browser or credential is held meanwhile.
 */
export async function waitForRenderAudit(grant?: string, timeoutMs = 60_000): Promise<(() => void) | undefined> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const release = reserveRenderAudit(grant);
    // One audit per approval stays a refusal: only the shared pool is worth waiting for.
    if (release || (grant && grants.has(grant)) || Date.now() >= deadline) return release;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
