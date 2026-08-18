import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skill = readFileSync(resolve(root, 'skill/SKILL.md'), 'utf8');
const reference = readFileSync(resolve(root, 'skill/references/tooljet-reference.md'), 'utf8');
const both = skill + '\n' + reference;
// The generator holds the skill body in a template literal, so backticks are escaped (\`) in source.
// Unescape them so anchor comparisons match the rendered skill text.
const generator = readFileSync(resolve(root, 'scripts/generate-skill.mjs'), 'utf8').replace(/\\`/g, '`');

// The generated skill's design section, from its heading to the next top-level heading.
function section(from: string): string {
  const start = skill.indexOf(from);
  if (start < 0) return '';
  const rest = skill.slice(start + from.length);
  const end = rest.indexOf('\n## ');
  return end < 0 ? rest : rest.slice(0, end);
}
const designSection = section('## Design — decide before you build');

describe('generated skill — design decision framework', () => {
  it('classifies the page job (primary user/object/job) and the page mode enum', () => {
    expect(designSection).toMatch(/primary user/i);
    expect(designSection).toMatch(/primary object/i);
    expect(designSection).toMatch(/single main job/i);
    // page-mode enumeration
    for (const mode of ['Monitor', 'Explore', 'Operate', 'Inspect', 'Edit', 'Configure']) {
      expect(designSection).toContain(mode);
    }
  });

  it('requires a dominant region/action, distinct-question components, and an internal critique', () => {
    expect(designSection).toMatch(/one dominant region and at most one dominant action/i);
    expect(designSection).toMatch(/distinct user question/i);
    expect(designSection).toMatch(/internal design critique/i);
    // the critique enumerates its lenses
    for (const lens of ['hierarchy', 'redundancy', 'density']) {
      expect(designSection.toLowerCase()).toContain(lens);
    }
  });

  it('keeps generic defaults free of ticket-specific / overfit terminology', () => {
    // No domain overfitting in the design guidance
    expect(designSection.toLowerCase()).not.toMatch(/ticket/);
    expect(designSection.toLowerCase()).not.toMatch(/active queue/);
    expect(designSection.toLowerCase()).not.toMatch(/purple/);
    // No hardcoded exact KPI / chart COUNT mandates (digit immediately qualifying KPI/charts)
    expect(designSection).not.toMatch(/\b\d+\s+KPI/i);
    expect(designSection).not.toMatch(/\b\d+\s+charts?\b/i);
  });

  it('never hardcodes Active Queue / purple anywhere in the skill', () => {
    expect(skill.toLowerCase()).not.toContain('active queue');
    expect(skill.toLowerCase()).not.toContain('purple');
  });
});

describe('generated skill — ToolJet rendering guardrails', () => {
  it('has the chart-title clipping guardrail (empty title + separate Text heading)', () => {
    expect(skill).toMatch(/Chart\.title` empty/);
    expect(skill).toMatch(/separate `Text` heading above the chart/);
    expect(skill).toMatch(/only after you've visually verified/i);
  });

  it('has explicit table-column ordering guidance and the headerCasing fact', () => {
    expect(skill).toMatch(/explicit, complete `columns` array/i);
    expect(skill).toMatch(/property order of a transformed query object to reorder/i);
    expect(skill).toContain('`headerCasing: "none"` is a valid value');
  });

  it('documents chart-width and statistics-height defaults', () => {
    expect(skill).toMatch(/13[–-]15 columns/);
    expect(skill).toMatch(/20[–-]24 columns/);
    expect(skill).toMatch(/110[–-]120px/);
  });
});

describe('generated skill — mobile & verification caveats', () => {
  it('skips mobile by default and distinguishes structural vs real mobile validation', () => {
    expect(skill).toMatch(/skip it by default/i);
    expect(skill).toMatch(/unless the user explicitly asks/i);
    expect(skill).toMatch(/recomposition/i);
    // the caveat: resizing a browser window does not prove ToolJet mobile rendered
    expect(skill).toMatch(/resizing a browser window does NOT prove ToolJet's mobile layout rendered/);
  });

  it('tells the agent not to cycle through many viewports', () => {
    expect(skill).toMatch(/Verify the default desktop render only/i);
    expect(skill).toMatch(/Test other viewports only if the user asks/i);
  });

  it('proactively suggests phases when scope is large', () => {
    expect(skill).toMatch(/If the scope is large, say so/i);
  });
});

describe('generated skill — HTML usage, page icons, validation, efficiency', () => {
  it('nuances HTML usage (built-in for interactive; HTML for display/custom markup)', () => {
    expect(skill).toMatch(/HTML where it makes the UI better/i);
    expect(skill).toMatch(/Presentational \/ display-only/i);
    expect(skill).toMatch(/Custom markup inside a component'?s own properties/i);
  });

  it('requires a relevant icon on every page of a multi-page app', () => {
    expect(skill).toMatch(/give EVERY page a relevant icon/);
    expect(skill).toContain('IconLayoutDashboard');
  });

  it('documents validate_app and the non-blocking warnings contract', () => {
    expect(skill).toMatch(/validate_app\(app_id\)/);
    expect(skill).toMatch(/array of non-blocking lint hints/);
  });

  it('tells the agent to report tool-call count and only real token usage', () => {
    expect(skill).toMatch(/how many MCP tool calls it took/);
    expect(skill).toMatch(/token usage only if your runtime actually surfaces it/i);
  });

  it('suggests what to build next when phases are exhausted', () => {
    expect(skill).toMatch(/grow into next/i);
  });

  it('tells the agent to flag unbuildable requests instead of faking them', () => {
    expect(skill).toMatch(/don't say yes to everything/i);
    expect(skill).toMatch(/Never fake it/i);
    expect(skill).toMatch(/tell the user plainly/i);
  });

  it('explains it cannot connect a new datasource / third-party integration and gives fallbacks', () => {
    // brief version stays prominent in the core skill's honesty rule
    expect(skill).toMatch(/you cannot connect a new one from here/i);
    expect(skill).toMatch(/never handle credentials yourself/i);
    // full detail lives in the reference
    expect(reference).toMatch(/cannot create or connect a new datasource or third-party integration/i);
    expect(reference).toMatch(/already-connected/i);
    expect(reference).toMatch(/REST API datasource/);
    expect(reference).toMatch(/seeded with representative sample data/i);
  });
});

describe('generated skill — information architecture & phasing (the crowded-page fix)', () => {
  it('requires planning information architecture (pages) before components', () => {
    expect(skill).toMatch(/information architecture BEFORE any component/i);
    expect(skill).toMatch(/name a PRODUCT, not a single page/i);
    expect(skill).toMatch(/one overview page \+ one focused page per major job/i);
    expect(skill).toMatch(/Map every capability to exactly ONE page/i);
  });

  it('separates page architecture from phasing (no appending to the overview)', () => {
    expect(skill).toMatch(/page architecture and phasing are SEPARATE decisions/i);
    expect(skill).toMatch(/NOT more stuff appended to the Home\/overview page/i);
    expect(skill).toMatch(/useful working loop within a few minutes/i);
    expect(skill).toMatch(/Complete journeys over skeletons/i);
  });
});

describe('generated skill — async states & density guardrails', () => {
  it('requires the full set of async/query states incl. no-double-fire', () => {
    expect(skill).toMatch(/## Async & UI states — required, not polish/);
    for (const s of ['Loading:', 'Empty:', 'Error:', 'Refresh:', 'Success:', 'Disabled']) {
      expect(skill).toContain(s);
    }
    expect(skill).toMatch(/must never fire the mutation twice/i);
    expect(skill).toMatch(/isLoading/);
  });

  it('has a density guardrail that still allows legitimately dense operational UIs', () => {
    expect(skill).toMatch(/don't overcrowd; split instead/i);
    expect(skill).toMatch(/dense is fine when the job genuinely needs it/i);
    expect(skill).toMatch(/progressive disclosure/i);
  });

  it('has a forms & modals field-layout recipe (top-aligned labels, spacing, modal-local coords)', () => {
    expect(skill).toMatch(/## Forms & modals — field layout/);
    expect(skill).toContain('styles.alignment.value = "top"');
    expect(skill).toMatch(/60[–-]70px/);
    expect(skill).toMatch(/14[–-]16px/);
    expect(skill).toMatch(/relative to the modal body/i);
  });

  it('lists the new overcrowding / skeleton / missing-state anti-patterns', () => {
    expect(skill).toMatch(/Dumping every requested capability onto one page/i);
    expect(skill).toMatch(/Skeleton or placeholder pages/i);
    expect(skill).toMatch(/no loading \/ empty \/ error state/i);
    expect(skill).toMatch(/double-fired/i);
  });
});

describe('generated skill is synchronized with the generator', () => {
  // Guards against the skill being hand-edited out of sync with scripts/generate-skill.mjs:
  // every load-bearing phrase asserted above must also be emitted by the generator source.
  const anchors = [
    'page mode',
    'Monitor',
    'internal design critique',
    'Chart.title` empty',
    'headerCasing: "none"',
    "resizing a browser window does NOT prove ToolJet's mobile layout rendered",
    'Verify the default desktop render only',
    'If the scope is large, say so',
    'information architecture BEFORE any component',
    'page architecture and phasing are SEPARATE decisions',
    'Async & UI states — required, not polish',
    "don't overcrowd; split instead",
    '## Forms & modals — field layout',
    'relative to the modal body',
    '13–15 columns',
    '110–120px',
    'HTML where it makes the UI better',
    'give EVERY page a relevant icon',
    'validate_app(app_id)',
    'how many MCP tool calls it took',
    "don't say yes to everything",
    // now in the reference file, not SKILL.md:
    'cannot create or connect a new datasource or third-party integration',
    'Component binding reference',
  ];
  for (const a of anchors) {
    it(`generator emits + a skill file contains: "${a}"`, () => {
      expect(generator).toContain(a);
      expect(both).toContain(a);
    });
  }
});
