import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { estimateHtmlHeight } from '../src/htmlHeight.js';
import { HTML_HEIGHT_TOLERANCE, HTML_PX_PER_COLUMN, HTML_WIDGET_HEIGHT_LOSS } from '../src/renderReadiness.js';

interface Row {
  app: string; name: string; width: number; height: number; rawHtml: string;
  box: number; scrollOver: number; leafOverTop: number; leafOverBottom: number;
}

/** 55 Html blocks from five real builds (Sol, Luna at four efforts) on 2026-09-05, each measured in the
 *  viewer: `scrollOver` is content height minus box height, `leafOver*` is text spilling past the box
 *  edges. A block is truly clipped when text spills or the content runs more than 4px past the box
 *  (a card bottom border cut off is what the user sees first).
 *  The estimator must catch the clear misses without flagging blocks that render whole. */
describe('Html height estimate against measured builds', () => {
  const rows: Row[] = JSON.parse(readFileSync(new URL('./fixtures/html-heights-2026-09-05.json', import.meta.url), 'utf8'));

  it('flags the clipped blocks and spares the whole ones', () => {
    const missed: string[] = [];
    const spurious: string[] = [];
    let caught = 0;
    for (const r of rows) {
      const est = estimateHtmlHeight(r.rawHtml, r.width * HTML_PX_PER_COLUMN);
      const flagged = (est?.height ?? 0) - (r.height - HTML_WIDGET_HEIGHT_LOSS) > HTML_HEIGHT_TOLERANCE;
      const clipped = r.leafOverTop + r.leafOverBottom > 0 || r.scrollOver > 4;
      const tag = `${r.app}/${r.name} box=${r.box} est=${est?.height} scrollOver=${r.scrollOver}`;
      if (flagged && clipped) caught += 1;
      else if (flagged) spurious.push(tag);
      else if (clipped && !est?.lowerBound && r.scrollOver > 8) missed.push(tag);
    }
    expect(spurious, 'blocks that render whole must not be flagged').toEqual([]);
    expect(missed, 'clearly clipped blocks must be flagged').toEqual([]);
    expect(caught).toBeGreaterThanOrEqual(13);
  });

  it('is within 10px of the measured content height on the clipped blocks', () => {
    for (const r of rows) {
      if (r.scrollOver <= 8 || r.leafOverTop > 0) continue; // fits (content unknown) or centred (scroll understates)
      const est = estimateHtmlHeight(r.rawHtml, r.width * HTML_PX_PER_COLUMN)!;
      if (est.lowerBound) continue;
      expect(Math.abs(est.height - r.measured), `${r.app}/${r.name}`).toBeLessThanOrEqual(10);
    }
  });
});
