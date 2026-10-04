import { describe, expect, it, vi } from 'vitest';
import { lintNestedContainerWidths, lintRenderedGeometryAdvisory, type LintComponent } from '../src/lint.js';
import { prepareComponentBatch } from '../src/componentBatch.js';
import { addComponentsTool } from '../src/tools/addComponents.js';
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
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toMatch(/desktop width 9.*21%.*own 43-column grid/);
    expect(warnings[1]).toContain('mobile');
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
    expect(lintNestedContainerWidths([p, c, other])).toHaveLength(4);
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
});
