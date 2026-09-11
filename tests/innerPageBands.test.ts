import { describe, expect, it } from 'vitest';
import { htmlRootHasDarkBackground, lintInnerPageBands } from '../src/lint.js';
import type { AppSummary } from '../src/tooljetClient.js';

const html = (name: string, rawHtml: string, top = 16) => ({
  id: name,
  name,
  type: 'Html',
  properties: { rawHtml: { value: rawHtml } },
  layouts: { desktop: { top, left: 2, width: 39, height: 110 } },
});
const darkBand = '<div style="background:#0F172A;color:white;border-radius:12px;padding:18px"><div>Dock door board</div></div>';
const gradientBand = '<div style="height:100%;background:linear-gradient(105deg,#1F2937 0%,#5B4634 100%);color:#FAF9F7">Title</div>';
const brandBand = '<div style="background:var(--cc-primary-brand);color:#fff">Title</div>';
const masthead = '<div style="background:var(--cc-surface2-surface);border:1px solid var(--cc-default-border)">Title</div>';
const lightCardWithBadge = '<div style="background:#FBF8F2;padding:16px"><span style="background:#27231F;color:#fff">4</span></div>';

const summary = (pages: AppSummary['pages'], app_id = 'app-1'): AppSummary => ({ app_id, pages, queries: [], events: [] });

describe('htmlRootHasDarkBackground', () => {
  it('recognises flat dark, gradient and brand-filled roots', () => {
    expect(htmlRootHasDarkBackground(darkBand)).toBe(true);
    expect(htmlRootHasDarkBackground(gradientBand)).toBe(true);
    expect(htmlRootHasDarkBackground(brandBand)).toBe(true);
  });
  it('ignores light roots, token surfaces and dark children', () => {
    expect(htmlRootHasDarkBackground(masthead)).toBe(false);
    expect(htmlRootHasDarkBackground(lightCardWithBadge)).toBe(false);
    expect(htmlRootHasDarkBackground('<div>no style</div>')).toBe(false);
  });
});

describe('lintInnerPageBands', () => {
  it('warns for a dark band at the top of a non-home page and not for the home page', () => {
    const warnings = lintInnerPageBands(
      summary([
        { id: 'p1', name: 'Today', handle: 'home', components: [html('homeBand', darkBand)] },
        { id: 'p2', name: 'Dock Board', handle: 'dock-board', components: [html('dockHeader', darkBand)] },
        { id: 'p3', name: 'Exceptions', handle: 'exceptions', components: [html('exHeader', masthead)] },
      ] as AppSummary['pages'])
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('Page "Dock Board": Html "dockHeader" is a dark or brand-filled header band');
  });
  it('treats the first planned page as home when no page is marked', () => {
    const warnings = lintInnerPageBands(
      summary(
        [
          { id: 'p1', name: 'Today Inbound', components: [html('band', darkBand)] },
          { id: 'p2', name: 'Dock Board', components: [html('band2', gradientBand)] },
        ] as AppSummary['pages'],
        'planned-app'
      )
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('Dock Board');
  });
  it('ignores dark blocks lower on the page, nested blocks and narrow blocks', () => {
    const lower = html('panel', darkBand, 400);
    const nested = { ...html('child', darkBand), parent: 'container-1' };
    const narrow = { ...html('tile', darkBand), layouts: { desktop: { top: 16, left: 2, width: 12, height: 110 } } };
    const warnings = lintInnerPageBands(
      summary([
        { id: 'p1', name: 'Home', components: [] },
        { id: 'p2', name: 'Inner', components: [lower, nested, narrow] },
      ] as AppSummary['pages'])
    );
    expect(warnings).toEqual([]);
  });
});
