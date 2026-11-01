import { describe, expect, it } from 'vitest';
import { lintCanvasSideGutter } from '../src/lint.js';

const c = (name: string, left: number, width: number, type = 'Table') => ({
  id: name, name, type, layouts: { desktop: { top: 0, left, width, height: 10 } },
} as any);

describe('canvas side gutter', () => {
  it('flags a full-bleed table (the Telemetry deploymentsTable: left 0, width 43)', () => {
    // A page, not a lone widget — the check is deliberately page-level (see the roots >= 3 guard).
    const out = lintCanvasSideGutter([c('depHeading', 2, 39, 'Text'), c('ovStat', 2, 18, 'Statistics'), c('deploymentsTable', 0, 43)]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatch(/no side gutter/);
    expect(out[0]).toMatch(/columns 2-41/);
  });

  it('flags the common left:1 width:41 layout — ~2% gutter reads as flush', () => {
    const page = [c('header_text', 1, 35, 'Text'), c('statusFilter', 1, 14, 'DropdownV2'), c('equipmentTable', 1, 41)];
    expect(lintCanvasSideGutter(page)).toHaveLength(1);
  });

  // SkyLine in Ant Design (2026-11-01): the agent blocks a build on this warning, so a white header band written edge to
  // edge was moved back into the gutter. A band painted its own colour is a deliberate full bleed; a table is not.
  it('accepts a full-bleed band painted its own colour, and still flags content at the edge', () => {
    const band = { ...c('header', 0, 43, 'FlexContainer'), styles: { backgroundColor: { value: '#ffffff' } } };
    expect(lintCanvasSideGutter([band, c('b', 2, 18, 'Statistics'), c('ok', 2, 39)])).toEqual([]);
    const plain = { ...c('header', 0, 43, 'FlexContainer'), styles: { backgroundColor: { value: 'transparent' } } };
    expect(lintCanvasSideGutter([plain, c('b', 2, 18, 'Statistics'), c('ok', 2, 39)])).toHaveLength(1);
    expect(lintCanvasSideGutter([band, c('b', 2, 18, 'Statistics'), c('t', 0, 43)])).toHaveLength(1);
  });

  it('accepts the documented full-width row (left 2, width 39)', () => {
    expect(lintCanvasSideGutter([c('a', 2, 39, 'Text'), c('b', 2, 18, 'Statistics'), c('ok', 2, 39)])).toEqual([]);
  });

  it('reports once per page, not once per component', () => {
    const out = lintCanvasSideGutter([c('a', 0, 43), c('b', 1, 41), c('d', 1, 20)]);
    expect(out).toHaveLength(1);
  });

  it('exempts modals, whose desktop rect is not page content', () => {
    const page = [c('a', 2, 39, 'Text'), c('b', 2, 18, 'Statistics'), c('t', 2, 39), c('addModal', 36, 7, 'ModalV2')];
    expect(lintCanvasSideGutter(page)).toEqual([]);
  });

  it('ignores nested children (only top-level content owns the gutter)', () => {
    const page = [c('a', 2, 39, 'Text'), c('b', 2, 18, 'Statistics'), c('t', 2, 39)];
    const child = { ...c('inner', 0, 43), parent: 'someContainer' } as any;
    expect(lintCanvasSideGutter([...page, child])).toEqual([]);
  });

  it('does not judge a single insertion — add_component lints one component with no page context', () => {
    expect(lintCanvasSideGutter([c('lonely', 0, 43)])).toEqual([]);
  });
});
