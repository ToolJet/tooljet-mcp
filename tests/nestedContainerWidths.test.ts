import { describe, expect, it, vi } from 'vitest';
import { lintNestedContainerWidths, lintRenderedGeometryAdvisory, lintListviewChildren, type LintComponent } from '../src/lint.js';
import { prepareComponentBatch } from '../src/componentBatch.js';
import { addComponentsTool } from '../src/tools/addComponents.js';
import { updateLayoutTool } from '../src/tools/updateLayout.js';
import { lintPlannedApp } from '../src/appSpecLint.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

const panel = (): LintComponent => ({
  clientRef: 'parcel-panel', name: 'parcelPanel', type: 'Container',
  layout: { top: 80, left: 28, width: 13, height: 460 },
});
const child = (): LintComponent => ({
  name: 'parcelNotes', type: 'Text', parentRef: 'parcel-panel',
  properties: { text: { value: 'Packed at dock 7' } },
  layout: { top: 20, left: 2, width: 9, height: 50 },
});

describe('nested container grid widths', () => {
  it('warns when standalone child content is sized in the outer grid without rewriting an intentional width', () => {
    const components = [panel(), child()];
    const before = structuredClone(components);
    const warnings = lintNestedContainerWidths(components);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/desktop\/mobile width 9.*21%.*own 43-column grid/);
    expect(warnings[0]).toContain('mobile');
    expect(lintRenderedGeometryAdvisory(components)).toEqual(expect.arrayContaining(warnings));
    expect(components).toEqual(before);
  });

  it('accepts inset/full-width children and intentional side-by-side children', () => {
    for (const [left, width] of [[2, 39], [0, 43]]) {
      const full = child(); full.layout = { ...full.layout, left, width };
      expect(lintNestedContainerWidths([panel(), full])).toEqual([]);
    }
    const sibling = child(); sibling.name = 'parcelStatus'; sibling.layout = { ...sibling.layout, left: 15 };
    expect(lintNestedContainerWidths([panel(), child(), sibling])).toEqual([]);
  });

  it('resolves persisted slot ids and keeps sibling rows in different slots separate', () => {
    const p = { ...panel(), id: 'persisted-panel', clientRef: undefined };
    const c = { ...child(), parentRef: undefined, parent: 'persisted-panel-header' };
    const other = { ...child(), parentRef: undefined, parent: 'persisted-panel', name: 'bodyNotes' };
    expect(lintNestedContainerWidths([p, c, other])).toHaveLength(2);
  });

  it('warns when the entire row of two children is squeezed into the outer span', () => {
    const first = { ...child(), layout: { ...child().layout, left: 1, width: 5 } };
    const second = { ...child(), name: 'parcelStatus', layout: { ...child().layout, left: 7, width: 5 } };
    expect(lintNestedContainerWidths([panel(), first, second])).toHaveLength(2);
  });

  it.each(['Container', 'Form'])('checks narrow %s parents through the 21-column boundary', (type) => {
    for (const width of [13, 21, 22]) {
      const p = { ...panel(), type, layout: { ...panel().layout, width } };
      expect(lintNestedContainerWidths([p, child()])).toHaveLength(width <= 21 ? 1 : 0);
      expect(lintNestedContainerWidths([p, { ...child(), layout: { ...child().layout, left: 2, width: 39 } }])).toEqual([]);
    }
  });

  it('keeps grid-mode Listview full rows at 0/43, as required by its existing validator', () => {
    const p = { ...panel(), type: 'Listview', properties: { mode: { value: 'grid' } } };
    const c = { ...child(), layout: { top: 0, left: 0, width: 43, height: 40 } };
    expect(lintListviewChildren([p, c])).toEqual([]);
    expect(lintNestedContainerWidths([p, c])).toEqual([]);
  });

  it('checks independent desktop/mobile grids and does not use desktop geometry for an absent mobile layout', () => {
    const p = panel(); p.layouts = { desktop: p.layout, mobile: { ...p.layout, width: 43 } }; delete p.layout;
    const c = child(); c.layouts = { desktop: c.layout }; delete c.layout;
    expect(lintNestedContainerWidths([p, c])).toHaveLength(1);
  });

  it('skips absent parents, flex layouts, compact icons, and wide parents', () => {
    expect(lintNestedContainerWidths([child()])).toEqual([]);
    expect(lintNestedContainerWidths([{ ...panel(), type: 'FlexContainer' }, child()])).toEqual([]);
    expect(lintNestedContainerWidths([panel(), { ...child(), type: 'Icon' }])).toEqual([]);
    expect(lintNestedContainerWidths([{ ...panel(), layout: { ...panel().layout, width: 39 } }, child()])).toEqual([]);
  });

  it('surfaces the warning on a prepared AI batch', () => {
    const p = panel(); const c = child();
    const prepared = prepareComponentBatch([
      { ...p, properties: {}, client_ref: p.clientRef },
      { ...c, properties: c.properties!, parent_ref: c.parentRef },
    ] as never);
    expect(prepared.warnings.join(' ')).toContain('own 43-column grid');
    expect(prepared.components[1]?.layout?.width).toBe(9);
  });

  it('checks children added to an existing narrow parent', async () => {
    const p = { ...panel(), id: 'persisted-panel', clientRef: undefined };
    const createComponents = vi.fn().mockResolvedValue([{ component_id: 'new-note', name: 'parcelNotes' }]);
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({ version_id: 'v1', pages: [{ id: 'page', components: [p] }] }),
      createComponents,
    } as unknown as ToolJetClient;
    const result = await addComponentsTool(client).handler({ app_id: 'app', version_id: 'v1', page_id: 'page', components: [
      { ...child(), properties: child().properties!, parentRef: undefined, parent: p.id },
    ] });
    expect(result.isError).toBeFalsy();
    expect(createComponents).toHaveBeenCalledOnce();
    expect(result.content[0]?.text).toContain('own 43-column grid');
  });

  it('resolves an existing parent by name in a planned app phase', () => {
    const p = { ...panel(), id: 'persisted-panel', clientRef: undefined };
    const result = lintPlannedApp({ pages: [{ name: 'Dispatch', icon: 'IconTruck', components: [
      { ...child(), properties: child().properties!, parentRef: 'parcelPanel' },
    ] }] }, { app_id: 'app', pages: [{ id: 'page', name: 'Dispatch', components: [p] }], queries: [], events: [] } as never);
    expect(result.warnings.join(' ')).toContain('own 43-column grid');
  });

  it('warns on a newly narrowed layout, without repeating it for unrelated moves or repairs', async () => {
    const p = { ...panel(), id: 'persisted-panel', clientRef: undefined, layouts: { desktop: panel().layout }, layout: undefined };
    const c = { ...child(), id: 'persisted-note', parentRef: undefined, parent: p.id,
      layouts: { desktop: { ...child().layout, width: 39 } }, layout: undefined };
    const unrelated = { id: 'root-label', name: 'rootLabel', type: 'Text', properties: {}, layouts: { desktop: { top: 0, left: 2, width: 20, height: 40 } } };
    const client = {
      getAppSummary: vi.fn().mockImplementation(async () => ({ pages: [{ id: 'page', components: [p, c, unrelated] }] })),
      updateLayouts: vi.fn().mockResolvedValue({ updated: 1 }),
    } as unknown as ToolJetClient;
    const update = async (component_id: string, desktop: object) => {
      const result = await updateLayoutTool(client).handler({ app_id: 'app', version_id: 'v1', page_id: 'page', layouts: [{ component_id, desktop }] });
      expect(result.isError).toBeFalsy();
      return result.content[0]?.text ?? '';
    };
    expect(await update(c.id, { ...c.layouts.desktop, width: 9 })).toContain('own 43-column grid');
    c.layouts.desktop.width = 9;
    expect(await update(unrelated.id, { ...unrelated.layouts.desktop, top: 50 })).not.toContain('own 43-column grid');
    expect(await update(c.id, { ...c.layouts.desktop, top: 30 })).not.toContain('own 43-column grid');
    expect(await update(c.id, { ...c.layouts.desktop, width: 39 })).not.toContain('own 43-column grid');
    expect(client.updateLayouts).toHaveBeenCalledTimes(4);
  });
});
