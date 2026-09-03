import { describe, expect, it, vi } from 'vitest';
import { updateLayoutTool } from '../src/tools/updateLayout.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

const client = (components: any[]) => ({
  getAppSummary: vi.fn().mockResolvedValue({ app_id: 'app1', pages: [{ id: 'p1', components }], queries: [], events: [] }),
  updateLayouts: vi.fn().mockResolvedValue({ updated: 1 }),
}) as unknown as ToolJetClient;

describe('update_layout ref resolution', () => {
  // Regression: this was an exact twin of the update_components loop bug — id-only lookup plus a
  // false "Components not found on page" that sent the model re-reading forever.
  it('resolves a component NAME to its id instead of falsely reporting it missing', async () => {
    const c = client([{ id: 'uuid-1', name: 'hiresTable', type: 'Table', properties: {}, styles: {}, layouts: {} }]);
    const result: any = await updateLayoutTool(c).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      layouts: [{ component_id: 'hiresTable', desktop: { top: 0, left: 0, width: 10, height: 620 } }],
    });
    expect(result.isError).not.toBe(true);
    expect((c as any).updateLayouts).toHaveBeenCalledWith(
      expect.objectContaining({ layouts: [expect.objectContaining({ componentId: 'uuid-1' })] })
    );
  });

  it('lists what the page holds when nothing matches', async () => {
    const c = client([{ id: 'uuid-1', name: 'realOne', type: 'Text', properties: {}, styles: {}, layouts: {} }]);
    const result: any = await updateLayoutTool(c).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      layouts: [{ component_id: 'ghost', desktop: { top: 0, left: 0, width: 10, height: 4 } }],
    });
    expect(result.content[0].text).toContain('realOne=uuid-1');
    expect((c as any).updateLayouts).not.toHaveBeenCalled();
  });

  it('refuses a resize that makes text unable to render one line', async () => {
    const c = client([{
      id: 'title', name: 'title', type: 'Text', properties: {},
      styles: { textSize: { value: 24 }, lineHeight: { value: 1.5 } },
      layouts: { desktop: { top: 0, left: 0, width: 20, height: 50 } },
    }]);
    const result: any = await updateLayoutTool(c).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      layouts: [{ component_id: 'title', desktop: { top: 0, left: 0, width: 20, height: 30 } }],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/too short to render one line/i);
    expect((c as any).updateLayouts).not.toHaveBeenCalled();
  });

  it('allows a pure move when the component already has an unrelated lint error', async () => {
    const c = client([{
      id: 'legacy', name: 'legacy', type: '', properties: {},
      layouts: { desktop: { top: 0, left: 0, width: 20, height: 40 } },
    }]);
    const result: any = await updateLayoutTool(c).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      layouts: [{ component_id: 'legacy', desktop: { top: 50, left: 0, width: 20, height: 40 } }],
    });
    expect(result.isError).not.toBe(true);
    expect((c as any).updateLayouts).toHaveBeenCalledOnce();
  });

  it('does not apply an untouched mobile Text error to a desktop-only move', async () => {
    const c = client([{
      id: 'title', name: 'title', type: 'Text', properties: {},
      styles: { textSize: { value: 24 }, lineHeight: { value: 1.5 } },
      layouts: {
        desktop: { top: 0, left: 0, width: 20, height: 50 },
        mobile: { top: 0, left: 0, width: 20, height: 20 },
      },
    }]);
    const result: any = await updateLayoutTool(c).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      layouts: [{ component_id: 'title', desktop: { top: 50, left: 0, width: 20, height: 50 } }],
    });
    expect(result.isError).not.toBe(true);
    expect((c as any).updateLayouts).toHaveBeenCalledOnce();
  });
});
