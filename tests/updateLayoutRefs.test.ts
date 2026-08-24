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
      layouts: [{ component_id: 'hiresTable', desktop: { top: 0, left: 0, width: 10, height: 4 } }],
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
});
