import { afterEach, expect, it, vi } from 'vitest';
vi.mock('node:module', () => ({ createRequire: () => ({ resolve: (name: string) => {
  if (name === 'playwright-core') return '/synthetic/driver/index.js';
  throw new Error('Missing driver');
} }) }));
vi.mock('node:fs', async importOriginal => ({ ...await importOriginal<typeof import('node:fs')>(),
  accessSync: (path: string) => { if (path !== '/synthetic/browser') throw new Error('Missing browser'); },
}));
import { renderAuditAvailable } from '../src/renderAuditAvailability.js';
import { registerTools } from '../src/tools/index.js';
afterEach(() => vi.unstubAllEnvs());
it('omits the render tool on a host explicitly configured without a browser', () => {
  vi.stubEnv('MCP_RENDER_AUDIT_ENABLED', 'false');
  const names: string[] = [];
  registerTools({ registerTool: (name: string) => names.push(name) } as any, {} as any);
  expect(names).not.toContain('verify_page_render');
  expect(names).toContain('validate_app');
});
it('does not advertise a missing driver or nonexistent configured executable', () => {
  vi.stubEnv('MCP_RENDER_AUDIT_ENABLED', 'true');
  vi.stubEnv('MCP_RENDER_AUDIT_PLAYWRIGHT', '/nonexistent/synthetic-driver');
  vi.stubEnv('MCP_RENDER_AUDIT_CHROME', '/nonexistent/synthetic-browser');
  expect(renderAuditAvailable()).toBe(false);
});

it('keeps configured non-Chrome channels and falls back from a missing explicit driver', () => {
  vi.stubEnv('MCP_RENDER_AUDIT_ENABLED', 'true');
  vi.stubEnv('MCP_RENDER_AUDIT_PLAYWRIGHT', '/nonexistent/synthetic-driver');
  vi.stubEnv('MCP_RENDER_AUDIT_CHROME', '');
  for (const channel of ['msedge', 'chromium']) {
    vi.stubEnv('MCP_RENDER_AUDIT_CHANNEL', channel);
    expect(renderAuditAvailable()).toBe(true);
  }
  vi.stubEnv('MCP_RENDER_AUDIT_CHANNEL', 'chrome');
  vi.stubEnv('MCP_RENDER_AUDIT_CHROME', '/synthetic/browser');
  expect(renderAuditAvailable()).toBe(true);
});
