import { describe, expect, it, vi } from 'vitest';
import type { AppSummary, ToolJetClient } from '../src/tooljetClient.js';
import { deletePageTool } from '../src/tools/deletePage.js';

function textOf(result: { content: Array<{ type: string; text: string }> }): any {
  return JSON.parse(result.content[0]!.text);
}

const summary = (events: AppSummary['events'] = []): AppSummary => ({
  app_id: 'app1',
  pages: [
    { id: 'home', name: 'Home', handle: 'home', components: [] },
    {
      id: 'analytics',
      name: 'Analytics',
      handle: 'analytics',
      components: [{ id: 'chart', name: 'revenueChart', type: 'Chart' }],
    },
  ],
  queries: [],
  events,
});

describe('delete_page tool', () => {
  it('deletes a non-Home page, verifies removal, and reports cascaded sources', async () => {
    const client = {
      getAppSummary: vi.fn()
        .mockResolvedValueOnce(summary([{ id: 'chart-event', name: 'point click', sourceId: 'chart', target: 'component', event: {} }]))
        .mockResolvedValueOnce({ ...summary(), pages: [summary().pages[0]] }),
      deletePage: vi.fn().mockResolvedValue({ deleted: true }),
    } as unknown as ToolJetClient;

    const result = await deletePageTool(client).handler({
      app_id: 'app1',
      version_id: 'v1',
      page_id: 'analytics',
      confirm: true,
    });

    expect((client.deletePage as any)).toHaveBeenCalledWith({
      appId: 'app1',
      versionId: 'v1',
      pageId: 'analytics',
      deleteAssociatedPages: undefined,
    });
    expect(textOf(result)).toMatchObject({
      deleted: true,
      page_name: 'Analytics',
      components_deleted: 1,
      source_events_deleted: 1,
    });
  });

  it('refuses to delete the native Home page', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue(summary()),
      deletePage: vi.fn(),
    } as unknown as ToolJetClient;
    const result = await deletePageTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'home', confirm: true,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/Home page cannot be deleted/i);
    expect((client.deletePage as any)).not.toHaveBeenCalled();
  });

  it('refuses deletion while an external event still targets the page', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue(summary([
        {
          id: 'external-nav',
          name: 'open analytics',
          sourceId: 'home-button',
          target: 'component',
          event: { actionId: 'switch-page', pageId: 'analytics' },
        },
      ])),
      deletePage: vi.fn(),
    } as unknown as ToolJetClient;
    const result = await deletePageTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'analytics', confirm: true,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/still targeted by external event.*open analytics/i);
    expect((client.deletePage as any)).not.toHaveBeenCalled();
  });
});
