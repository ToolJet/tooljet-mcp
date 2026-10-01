import { describe, expect, it } from 'vitest';
import { validatePersistedAppSummary } from '../src/appValidation.js';

/* Live build (Luna 6 medium): the Attention column was text; after the apply the model edited
   its RunJS query to return a <span> chip and never changed the column, so the viewer showed raw
   markup. The model runs validate_app after such edits. */
const app = (code: string, columnType = 'string') =>
  ({
    id: 'app', name: 'App', events: [],
    queries: [
      { id: 'q1', name: 'rows', kind: 'tooljetdb', options: {} },
      { id: 'q2', name: 'model', kind: 'runjs', options: { code } },
    ],
    pages: [{ id: 'p', name: 'Tonight', components: [{
      id: 'c', name: 'tonightTable', type: 'Table',
      properties: {
        data: { value: '{{ (queries.model.data || []).map(r => ({ site: r.site, attention: r.attention })) }}' },
        columns: { value: [{ id: 'c1', name: 'Site', key: 'site', columnType: 'string' }, { id: 'c2', name: 'Attention', key: 'attention', columnType }] },
      },
    }] }],
  }) as never;

const htmlWarnings = (summary: never) => validatePersistedAppSummary(summary).warnings.filter((w) => /renders as raw text/.test(w));

describe('text columns fed HTML by their query', () => {
  it('warns when a RunJS query writes an HTML string into a text column', () => {
    const w = htmlWarnings(app(`return rows.map(r => ({ site: r.site, attention: r.pct < 30 ? '<span style="color:#8A4B08">Needs attention</span>' : '' }));`));
    expect(w).toHaveLength(1);
    expect(w[0]).toContain('tonightTable');
    expect(w[0]).toContain('"attention"');
    expect(w[0]).toContain('columnType "html"');
  });

  it('follows a variable that holds the HTML, as the live query did', () => {
    const w = htmlWarnings(app(`const note = o < 30 ? '<span style="color:#8A4B08">Needs attention</span>' : '';\n return [{ site: r.site, attention: note }];`));
    expect(w).toHaveLength(1);
  });

  it('stays quiet when the column is already html, or the value is plain text', () => {
    expect(htmlWarnings(app(`return [{ attention: '<b>Late</b>' }];`, 'html'))).toEqual([]);
    expect(htmlWarnings(app(`return [{ attention: r.pct < 30 ? "Needs attention" : "" }];`))).toEqual([]);
  });
});
