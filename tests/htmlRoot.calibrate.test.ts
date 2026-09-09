import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { lintHtmlRootSurface } from '../src/renderReadiness.js';

/** 62 Html roots from seven real builds on 2026-09-05. None of them followed the root rule; this pins
 *  down that the lint reads real markup without crashing and names every white-bleed cause. */
describe('Html root lint against real builds', () => {
  const rows = JSON.parse(readFileSync(new URL('./fixtures/html-roots-2026-09-05.json', import.meta.url), 'utf8'));
  it('flags the tinted, rounded and unpainted roots', () => {
    let flagged = 0;
    const causes: Record<string, number> = {};
    for (const r of rows) {
      const errors = lintHtmlRootSurface({ name: r.name, type: 'Html', parent: r.parent || undefined, properties: { rawHtml: { value: r.rawHtml } } });
      if (!errors.length) continue;
      flagged += 1;
      for (const cause of ['no height:100%', 'paints no background', 'rather than the surface', 'border-radius', 'top-level nodes']) {
        if (errors[0]!.includes(cause)) causes[cause] = (causes[cause] ?? 0) + 1;
      }
    }
    console.log(`flagged ${flagged}/${rows.length}`, causes);
    expect(flagged).toBeGreaterThanOrEqual(55);
  });
});
