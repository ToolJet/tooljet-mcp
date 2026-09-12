import { describe, expect, it } from 'vitest';
import { auditPages, verifyPageRenderTool } from '../src/tools/verifyPageRender.js';

const client = {
  getAppSummary: async () => ({ pages: [{ handle: 'home', name: 'Home' }, { handle: 'orders', name: 'Orders' }] }),
} as any;

describe('verify_page_render', () => {
  it('fails clearly when the page handle does not exist', async () => {
    const tool = verifyPageRenderTool(client, () => 'http://viewer.test');
    const res: any = await tool.handler({ app_id: 'app1', page_handle: 'nope' });
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res)).toContain('no page nope');
  });

  it('reports the audit as unreachable instead of guessing when no browser driver is installed', async () => {
    process.env.MCP_RENDER_AUDIT_PLAYWRIGHT = '/definitely/not/here';
    const reports = await auditPages([{ page: 'home', url: 'http://viewer.test/applications/app1/home' }]);
    delete process.env.MCP_RENDER_AUDIT_PLAYWRIGHT;
    expect(reports).toHaveLength(1);
    expect(reports[0].findings[0].kind).toBe('unreachable');
  });
});
