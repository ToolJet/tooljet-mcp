import { describe, expect, it } from 'vitest';
import { lintListDrawnAsText } from '../src/lint.js';

const text = (value: string, type = 'ShadText') => ({ type, name: 'jobsText', properties: { text: { value } } });

describe('a list of records drawn as one text', () => {
  it('advises a list view when a text maps records into a joined string', () => {
    const w = lintListDrawnAsText(
      text("{{(queries.jobs.data || []).filter(j => j.tech_id === 3).map(j => j.window + ' · ' + j.customer + ' · ' + j.area + ' · ' + j.status).join(' • ')}}") as never
    );
    expect(w).toHaveLength(1);
    expect(w[0]).toMatch(/ShadListView/);
  });
  it('stays quiet for a short joined list of names, and for other types', () => {
    expect(lintListDrawnAsText(text("{{queries.t.data.map(t => t.name).join(', ')}}") as never)).toEqual([]);
    expect(lintListDrawnAsText(text('Plain words') as never)).toEqual([]);
    expect(lintListDrawnAsText(text("{{a.map(j => j.x + j.y + j.z).join(' ')}}", 'Html') as never)).toEqual([]);
  });
});
