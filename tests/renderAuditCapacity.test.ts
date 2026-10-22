import { afterEach, expect, it, vi } from 'vitest';
import { reserveRenderAudit } from '../src/renderAuditCapacity.js';
afterEach(() => vi.unstubAllEnvs());
it('shares a process cap across grants and permits only one audit per grant', () => {
  vi.stubEnv('MCP_RENDER_AUDIT_MAX_BROWSERS', '2');
  const first = reserveRenderAudit('orchard');
  const second = reserveRenderAudit('meadow');
  try {
    expect(first).toBeTypeOf('function'); expect(second).toBeTypeOf('function');
    expect(reserveRenderAudit('orchard')).toBeUndefined();
    expect(reserveRenderAudit('valley')).toBeUndefined();
    first!(); first!();
    const third = reserveRenderAudit('valley');
    try { expect(third).toBeTypeOf('function'); expect(reserveRenderAudit('extra')).toBeUndefined(); }
    finally { third?.(); }
  } finally { first?.(); second?.(); }
});
