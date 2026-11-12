import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Auth } from '../src/auth.js';
import type { Config } from '../src/config.js';
import { loadInstalledPacks } from '../src/packCatalog.js';
import { createClient } from '../src/tooljetClient.js';
import { addComponentsTool } from '../src/tools/addComponents.js';
import { updateLayoutTool } from '../src/tools/updateLayout.js';

// QA DVRL-110 (feat/cc-packs, 2026-11-12): the MCP refused the slot names a List's row and a Kanban's card are drawn in,
// though the packs' manifests declare them (slot_name took only native names and tab_<key>), so nothing could be put in
// a pack List row or Kanban card. ToolJet draws such a slot once per item on the widget's own canvas, as its List view
// rows (usePackHost PackRow: ListviewSubcontainer id={id}), so the child's parent is the widget's id, not "<id>-row".

const list = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const board = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const listView = 'cccccccc-3333-4333-8333-cccccccccccc';
const child = 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee';

// As the shipped manifests declare them (packs/*/dist/manifest.json): antd List row, antd Kanban card, Rocket ListView row.
beforeAll(async () => {
  await loadInstalledPacks(
    async () => [],
    async () => [
      {
        info: { pack: 'antd', displayName: 'Ant Design', version: '1.0.0', hash: 'h1' },
        manifest: {
          components: {
            List: { slots: [{ name: 'row', kind: 'rows' }], props: [{ name: 'data', type: 'array', default: [] }] },
            Kanban: { slots: [{ name: 'card', kind: 'rows' }], props: [{ name: 'columns', type: 'array', default: [] }] },
          },
        },
      },
      {
        info: { pack: 'shadcn', displayName: 'Rocket 2.0', version: '1.0.0', hash: 'h2' },
        manifest: { components: { ListView: { slots: [{ name: 'row', kind: 'rows' }], props: [] } } },
      },
    ]
  );
});

type Write = { method: string; diff: unknown };

const harness = (components: Array<Record<string, unknown>>) => {
  const writes: Write[] = [];
  const authedFetch = vi.fn(async (_url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method !== 'GET') writes.push({ method, diff: JSON.parse(String(init?.body ?? '{}')).diff });
    return new Response('{}', { status: 200 });
  });
  const real = createClient({ authedFetch } as unknown as Auth, {} as Config);
  const summary = { app_id: 'app1', pages: [{ id: 'p1', name: 'Home', components }], queries: [], events: [] };
  const client = { ...real, getAppSummary: vi.fn().mockResolvedValue(summary), getAppSettings: vi.fn().mockResolvedValue({}) };
  /** The parent the first write of `method` stored for the component with id `id` (or for the only one written). */
  const parentWritten = (method: string, id?: string) => {
    const diff = writes.find((w) => w.method === method)?.diff as Record<string, { component?: { parent?: string }; parent?: string }> | undefined;
    const entry = diff ? (id ? diff[id] : Object.values(diff)[0]) : undefined;
    return entry?.component?.parent ?? entry?.parent;
  };
  return { client: client as never, writes, parentWritten };
};

const text = (result: { content: Array<{ text?: string }> }) => String(result.content[0]?.text ?? '');
const ids = { app_id: 'app1', version_id: 'v1', page_id: 'p1' };
const pack = (id: string, name: string, type: string) => ({
  id, name, type, properties: {}, styles: {}, layouts: { desktop: { top: 0, left: 2, width: 30, height: 400 } },
});
const rowText = (extra: Record<string, unknown>) => ({
  name: 'rowTitle', type: 'Text', properties: { text: 'Row' }, layout: { top: 4, left: 1, width: 20, height: 30 }, ...extra,
});

describe('a child in a pack List row or Kanban card', () => {
  it.each([
    ['an Ant Design List', list, 'aList', 'Lib_antd_List', 'row'],
    ['an Ant Design Kanban', board, 'aBoard', 'Lib_antd_Kanban', 'card'],
    ['a Rocket 2.0 ListView', listView, 'aListView', 'Lib_shadcn_ListView', 'row'],
  ])('add_components puts it in %s with slot_name as declared', async (_label, id, name, type, slot) => {
    const h = harness([pack(id, name, type)]);
    const result = await addComponentsTool(h.client).handler({ ...ids, components: [rowText({ parent: name, slot_name: slot })] } as never);
    expect(result.isError, text(result)).not.toBe(true);
    expect(h.parentWritten('POST')).toBe(id);
  });

  it('add_components with no slot_name uses the only slot the widget draws', async () => {
    const h = harness([pack(list, 'aList', 'Lib_antd_List')]);
    const result = await addComponentsTool(h.client).handler({ ...ids, components: [rowText({ parent: 'aList' })] } as never);
    expect(result.isError, text(result)).not.toBe(true);
    expect(h.parentWritten('POST')).toBe(list);
  });

  it('update_layout moves a component into a Kanban card', async () => {
    const h = harness([
      pack(board, 'aBoard', 'Lib_antd_Kanban'),
      { id: child, name: 'note', type: 'Text', properties: { text: { value: 'Hi' } }, styles: {}, layouts: { desktop: { top: 0, left: 2, width: 10, height: 40 } } },
    ]);
    const result = await updateLayoutTool(h.client).handler({ ...ids, layouts: [{ component_id: 'note', parent: 'aBoard', slot_name: 'card' }] } as never);
    expect(result.isError, text(result)).not.toBe(true);
    expect(h.parentWritten('PUT', child)).toBe(board);
  });
});
