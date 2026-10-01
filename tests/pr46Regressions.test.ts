import { describe, expect, it, vi } from 'vitest';
import { detectOverlaps, lintComponentSpec, lintComponents, lintEmptyTabs, lintUnboundEmptyState } from '../src/lint.js';
import { lintQueryFedCharts } from '../src/appSpecLint.js';
import { addComponentsTool } from '../src/tools/addComponents.js';

describe('PR46 regression cases', () => {
  it.each(['a(b', 'tabs[main]', 'a.*', 'a\\b'])('matches literal Tabs client refs: %s', (key) => {
    expect(lintEmptyTabs([
      { type: 'Tabs', clientRef: key, layout: { top: 0, left: 0, width: 40, height: 400 } },
      { type: 'Text', parent: key + '-0' },
    ])).toEqual([]);
  });

  it.each(['restapi', 'postgresql', 'tooljetdb'])('does not treat %s result data as JavaScript source', (kind) => {
    expect(lintQueryFedCharts([
      { type: 'Chart', properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: '{{queries.figure.data}}' } } },
    ], [{ name: 'figure', kind, options: {} }])).toEqual([]);
  });

  it.each(['No credit card required. All results available instantly.', 'Request feedback from customers', 'There are no records available in offline mode.'])('does not confuse ordinary prose with an empty state: %s', (text) => {
    expect(lintUnboundEmptyState({ type: 'Text', name: 'intro', properties: { text: { value: text } } })).toEqual([]);
  });

  it.each(['Coffee', 'Feedback', 'Costa branch', 'Total items'])('does not infer money from %s', (name) => {
    const result = lintComponentSpec({ type: 'Table', properties: { columns: { value: [{ name, key: name, columnSize: 120 }] } } });
    expect([...result.errors, ...result.warnings].filter((s) => s.includes('readable minimum'))).toEqual([]);
  });

  it('ignores the non-rendering modal trigger box, but checks a visible trigger', () => {
    const layout = { top: 0, left: 0, width: 20, height: 100 };
    const title = { type: 'Text', name: 'title', layout };
    const modal = { type: 'ModalV2', name: 'editModal', layout, properties: { useDefaultButton: { value: false } } };
    expect(detectOverlaps([title, modal])).toEqual([]);
    expect(detectOverlaps([title, { ...modal, properties: { useDefaultButton: { value: true } } }])).not.toEqual([]);
  });

  it('allows a small unpaginated table containing one record', () => {
    const result = lintComponents([{ type: 'Table', name: 'summary', layout: { top: 0, left: 0, width: 40, height: 240 }, properties: {
      enablePagination: { value: false }, data: { value: [{ count: 1 }] },
      columns: { value: [{ name: 'Count', key: 'count', columnSize: 120 }] },
    } }]);
    expect(result.errors).toEqual([]);
  });

  it('does not gate a write using geometry from a different version', async () => {
    const createComponents = vi.fn();
    const client = { getAppSummary: vi.fn().mockResolvedValue({ version_id: 'old', pages: [] }), createComponents };
    const result = await addComponentsTool(client as any).handler({ app_id: 'app', version_id: 'new', page_id: 'page', components: [
      { type: 'Text', name: 'title', properties: { text: { value: 'Welcome' } }, layout: { top: 0, left: 0, width: 40, height: 50 } },
    ] });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain('different editing version');
    expect(createComponents).not.toHaveBeenCalled();
  });
});
