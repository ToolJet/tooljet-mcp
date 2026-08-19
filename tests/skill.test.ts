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
  it('uses the exact progress component type and correct layout input shapes', () => {
    expect(skill).toContain('`CircularProgressBar`');
    expect(skill).not.toContain('`CircularProgressbar`');
    expect(skill).toMatch(/both resolutions.*flat `layout:\{top,left,width,height\}`/i);
    expect(skill).toMatch(/`layouts:\{desktop:\{top,left,width,height\},mobile:\{top,left,width,height\}\}`/i);
    expect(skill).toMatch(/Do not put `desktop`\/`mobile` inside `layout`.*rejects the entire atomic `add_components` batch/i);
  });

  it('has the chart-title clipping guardrail (empty title + separate Text heading)', () => {
    expect(skill).toMatch(/Chart\.title` empty/);
    expect(skill).toMatch(/separate `Text` heading above the chart/);
    expect(skill).toMatch(/only after you've visually verified/i);
  });

  it('documents the exact modern Table row-action target and compound ref', () => {
    expect(skill).toContain('`columnType: "button"`');
    expect(skill).toContain('`source_type:"table_column"`');
    expect(skill).toContain('`ref:"<column key or name>::<button id>"`');
    expect(skill).toMatch(/deprecated `properties\.actions`/);
    expect(reference).toMatch(/## Table row-action Button columns/);
    expect(reference).toContain('"ref": "actions::view-action"');
    expect(reference).toMatch(/selectedRow.*selectedRowId.*before running this handler/s);
  });

  it('documents KeyValuePair projection and an empty DatePickerV2 create value', () => {
    expect(skill).toMatch(/KeyValuePair.*explicit.*fields.*does not suppress undeclared keys.*project/is);
    expect(skill).toMatch(/KeyValuePair.*fieldDeletionHistory.*not appended.*positionally merged/is);
    expect(reference).toMatch(/DatePickerV2[\s\S]*defaultValue="\{\{null\}\}".*01\/01\/2022/i);
  });

  it('documents the Kanban selection dependency and blank custom-card modal caveat', () => {
    expect(skill).toMatch(/onCardSelected.*only when.*openModalOnCardClick.*true/is);
    expect(skill).toMatch(/custom Html child.*native modal.*blank/is);
  });

  it('limits the nested-map warning to Html and preserves supported Table lookup joins', () => {
    expect(skill).toMatch(/Html rawHtml expressions.*map\(\).*inside another.*completely blank/is);
    expect(skill).toMatch(/Do not generalize this to Table data.*filter\(\.\.\.\)\[0\].*inside.*map\(\).*work/is);
    expect(skill).not.toMatch(/\*\*Html\/Chart expressions:/);
  });

  it('documents the empty-array first-row fallback trap', () => {
    expect(skill).toContain('`(queries.<q>.data || [{}])[0].field`');
    expect(skill).toMatch(/`\[\]` is truthy.*`\(queries\.<q>\.data \|\| \[\]\)\[0\]\?\.field`/is);
  });

  it('documents ToolJet DB sort ids and aggregate response aliases', () => {
    expect(reference).toMatch(/order_filters.*outer map key.*inner `id`.*silently disable sorting/is);
    expect(reference).toMatch(/aggregate configuration key is not the result key.*<table_name>_<column>_<aggFx>/is);
    expect(reference).toContain('`starlink_terminals_id_count`');
  });

  it('uses dependency-driven server-side reads with exact Table state shapes', () => {
    expect(skill).toMatch(/server-side Tables[\s\S]*runOnDependencyChange:true.*after.*exposed value is published/i);
    expect(skill).toMatch(/do \*\*not\*\* also run the same reactive queries from those events/i);
    expect(skill).toMatch(/sortApplied: \[\{column,columnKey,direction\}\].*filters: \[\{column,condition,value\}\]/i);
    expect(skill).toMatch(/ButtonGroupV2.*previous `selected` value/i);
    expect(skill).toMatch(/DaterangePicker.*literal strings `"undefined"` or `"Invalid date"`/i);
    expect(skill).toMatch(/pageIndex.*undefined.*\(\(components\.<table>\.pageIndex \|\| 1\) - 1\).*NaN.*empty Table/i);
  });

  it('batches multiple proven safe query reads without broadening execution scope', () => {
    expect(skill).toMatch(/run_queries.*up to ten.*proven read-only.*concurrently/is);
    expect(skill).toMatch(/refuses mutations, RunJS, paid\/remote APIs, and unknown kinds before executing anything/i);
    expect(skill).toMatch(/two or more independent ToolJet DB\/SQL reads.*one preflighted `run_queries/is);
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

  it('keeps the DropdownV2 dynamic-mode prerequisite in the compact skill', () => {
    expect(skill).toMatch(/Dynamic `schema` requires `advanced="\{\{true\}\}"`/);
    expect(skill).toMatch(/silently uses static `options`/);
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

  it('requires explicit execution-mode confirmation when scope is large', () => {
    expect(skill).toMatch(/Treat scope as \*\*large\*\* when.*3\+ substantive pages.*2\+ independent complex workflows.*multi-table.*multiple datasource/is);
    expect(skill).toMatch(/get the user's execution choice before any mutating build call/i);
    expect(skill).toMatch(/phased checkpoints \(recommended\).*whole app in one run.*slower.*without feedback/is);
    expect(skill).toMatch(/Do not silently choose for them/i);
  });

  it('presents customer-facing completion estimates without false precision', () => {
    expect(skill).toMatch(/customer-facing and time-informed/i);
    expect(skill).toMatch(/first usable result.*estimated total active build time.*excluding time waiting for customer feedback.*confidence level/is);
    expect(skill).toMatch(/Estimate from substantive pages\/workflows and datasource\/schema certainty.*widen the range/is);
    expect(skill).toMatch(/ranges rounded to about 5[–-]10 minutes.*never fake precision or present the estimate as a promise/is);
    expect(skill).toContain('`likely 30+ minutes · low confidence`');
    expect(skill).toMatch(/Phased \(recommended\): first usable part.*Whole app: estimated.*rough estimates/is);
    expect(skill).toMatch(/Do not mention MCP calls, tokens, or internal implementation details/i);
  });
});

describe('generated skill — modal form layout', () => {
  it('documents atomic modal parenting, rendered input height, and modal sizing', () => {
    expect(skill).toMatch(/client_ref/);
    expect(skill).toMatch(/parent_ref/);
    expect(skill).toMatch(/styles\.alignment\.value = "top"/);
    expect(skill).toMatch(/renderedHeight.*height \+ 20px/is);
    expect(skill).toMatch(/40px.*60px.*70px/is);
    expect(skill).toMatch(/modalHeight >= lowest child top \+ renderedHeight/i);
    expect(skill).toMatch(/modal title Text.*slot_name:"header"/i);
    expect(skill).toMatch(/showHeader:true.*empty header.*second title row.*body/is);
    expect(skill).toMatch(/Header, body, and footer are separate child canvases/i);
  });

  it('documents the generated-vs-standalone Form decision and FilePicker crash workaround', () => {
    expect(skill).toMatch(/only when \*\*every selected field\*\* maps to.*textinput.*number.*emailinput.*password.*datepicker.*checkbox/is);
    expect(skill).toMatch(/any field.*dropdown.*multiselect.*textarea.*build the \*\*entire form\*\* from standalone components/is);
    expect(skill).toMatch(/styles\.alignment\.value="top".*two-column grid.*TextArea fields full-width/is);
    expect(skill).toMatch(/validation\.mandatory.*required state\/asterisks/is);
    expect(skill).toMatch(/filepicker.*crashes.*standalone `FilePicker`/is);
    expect(reference).toMatch(/textinput.*textarea.*emailinput.*starrating.*filepicker/is);
    expect(reference).toMatch(/values.*displayValues.*not `options`/is);
    expect(reference).toMatch(/no working `required` flag.*minLength.*customRule/is);
    expect(reference).toMatch(/passes no schema alignment through.*literal "Label".*whole form from standalone/is);
  });

  it('documents the real generate-file PDF limitation', () => {
    expect(skill).toMatch(/PDF branch is pass-through only.*pre-formed PDF bytes/is);
    expect(reference).toMatch(/does not render text, HTML, or tabular data into a PDF/is);
  });

  it('uses a two-axis DOM overlap check for form and modal verification', () => {
    expect(skill).toMatch(/id=<component_id>/);
    expect(skill).toMatch(/getBoundingClientRect/);
    expect(skill).toMatch(/both axes.*xOverlap && yOverlap/is);
  });
});

describe('generated skill — workspaces', () => {
  it('tells the agent to confirm the workspace before building (multi-workspace users)', () => {
    expect(skill).toMatch(/## Workspace — confirm which one first/);
    expect(skill).toMatch(/list_workspaces/);
    expect(skill).toMatch(/use_workspace\(id\)/);
    expect(skill).toMatch(/before creating anything/i);
    expect(skill).toContain('TOOLJET_WORKSPACE_ID');
  });

  it('uses workspace datasources directly without inventing per-app linking', () => {
    expect(skill).toMatch(/Workspace-connected sources.*brand-new apps/i);
    expect(skill).toMatch(/no per-app datasource attach\/link step/i);
    expect(reference).toMatch(/after `create_app`, call `list_datasources\(version_id\)`/i);
    expect(reference).toMatch(/wrong workspace, insufficient permission.*environment configuration/i);
  });
});

describe('generated skill — HTML usage, page icons, validation, efficiency', () => {
  it('nuances HTML usage (built-in for interactive; HTML for display/custom markup)', () => {
    expect(skill).toMatch(/HTML where it makes the UI better/i);
    expect(skill).toMatch(/Presentational \/ display-only/i);
    expect(skill).toMatch(/Custom markup inside a component'?s own properties/i);
  });

  it('requires a relevant icon on every page of a multi-page app', () => {
    expect(skill).toMatch(/give EVERY page a relevant sidebar icon/);
    expect(skill).toContain('IconLayoutDashboard');
    expect(skill).toContain('IconHome2');
    expect(skill).toMatch(/left sidebar look unfinished/);
  });

  it('documents validate_app and the non-blocking warnings contract', () => {
    expect(skill).toMatch(/validate_app\(app_id\)/);
    expect(skill).toMatch(/array of non-blocking lint hints/);
  });

  it('treats lint_app_spec as an awaited barrier before every write', () => {
    expect(skill).toMatch(/awaited preflight barrier/i);
    expect(skill).toMatch(/call it alone.*only then issue writes/is);
    expect(skill).toMatch(/Never run it concurrently with `add_pages`, `create_tables`, or any other mutating tool/i);
    expect(skill).toMatch(/Never dispatch the linter and a write as siblings in parallel/i);
  });

  it('uses update_pages to restyle and reorder existing pages including Home', () => {
    expect(skill).toMatch(/update_pages\(\{ app_id, version_id, updates\?, order\? \}\)/);
    expect(skill).toMatch(/including the auto-created Home page/i);
    expect(skill).toMatch(/complete ordered list of current page ids/i);
  });

  it('does not overstate datasource response coverage', () => {
    expect(skill).toMatch(/response shape and `status` when known/i);
    expect(skill).toMatch(/`runtime-dependent` or `unknown`.*safe successful run/is);
    expect(reference).toMatch(/response shape\/status when known/i);
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

  it('does not re-ask after an explicit mode choice and honors the chosen checkpoint behavior', () => {
    expect(skill).toMatch(/already explicitly chooses phased delivery.*whole app.*one go.*build everything.*do not stop.*do not ask again/is);
    expect(skill).toMatch(/detailed feature spec alone is not an execution choice/i);
    expect(skill).toMatch(/phased-checkpoint mode.*wait for the user to continue.*whole-app mode.*continue without waiting/is);
  });
});

describe('generated skill — selective reads, reuse, and page-level QA', () => {
  it('shares the app URL early and reuses one built-in browser tab after meaningful progress', () => {
    expect(skill).toMatch(/Immediately share the clickable `app_url` in chat/i);
    expect(skill).toMatch(/built-in browser.*first meaningful page works.*reuse the same tab/is);
    expect(skill).toMatch(/reload it at page-level checkpoints.*instead of opening new tabs/is);
    expect(skill).toMatch(/Repeat the clickable `app_url` in the final handoff/i);
  });

  it('batches only relevant catalog contracts and avoids redundant simple lookups', () => {
    expect(skill).toMatch(/types.*batch/i);
    expect(skill).toMatch(/request only the relevant sections\/keys/i);
    expect(skill).toMatch(/skip redundant lookups for familiar simple components/i);
  });

  it('uses bounded/scoped app summaries with dotted field selection', () => {
    expect(skill).toContain('detail:"structure"');
    expect(skill).toMatch(/exact dotted fields/i);
    expect(skill).toMatch(/Do not pull every value from a multi-page app/i);
    expect(skill).toMatch(/current page\/component.*not the whole app/i);
  });

  it('reuses components as guarded templates instead of copying hidden coupling', () => {
    expect(skill).toMatch(/Reuse existing components deliberately/i);
    expect(skill).toMatch(/treat it as a \*\*template\*\*/i);
    expect(skill).toMatch(/Never copy a component id, event row/i);
    expect(skill).toMatch(/stale query\/component binding blindly/i);
  });

  it('collects page issues, batches fixes, confirms once, and triages cosmetics', () => {
    expect(skill).toMatch(/collect every issue before editing/i);
    expect(skill).toMatch(/smallest number of batched/i);
    expect(skill).toMatch(/one confirmation pass/i);
    expect(skill).toMatch(/Report unless requested/i);
    expect(skill).toMatch(/one collected cosmetic repair batch/i);
    expect(skill).toMatch(/verify every requested primary flow/i);
  });
});

describe('generated skill — async states & density guardrails', () => {
  it('keeps narrow Statistics labels short enough to preserve the value', () => {
    expect(skill).toMatch(/Statistics sizing.*12.?17 columns.*one- or two-word label.*hide the value/is);
  });

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
    expect(skill).toMatch(/40px authored height/);
    expect(skill).toMatch(/Row step is always.*authored height \+ 20px.*\+ 10px gap.*70px only.*40px-authored/is);
    expect(skill).toMatch(/90[–-]100px authored height.*TextArea/is);
    expect(skill).toMatch(/no value-font-size style/i);
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
    '## Workspace — confirm which one first',
    'page mode',
    'Monitor',
    'internal design critique',
    'Chart.title` empty',
    'headerCasing: "none"',
    'Table row-action Button columns',
    'source_type:"table_column"',
    '<column key or name>::<button id>',
    'deprecated `properties.actions`',
    "resizing a browser window does NOT prove ToolJet's mobile layout rendered",
    'Verify the default desktop render only',
    "get the user's execution choice before any mutating build call",
    'phased checkpoints (recommended)',
    'customer-facing and time-informed',
    'information architecture BEFORE any component',
    'page architecture and phasing are SEPARATE decisions',
    'Async & UI states — required, not polish',
    "don't overcrowd; split instead",
    '## Forms & modals — field layout',
    'relative to the modal body',
    'Stack using rendered height',
    'modalHeight >= lowest child top + renderedHeight',
    'modal title Text in `slot_name:"header"`',
    'Header, body, and footer are separate child canvases',
    'getBoundingClientRect()',
    '13–15 columns',
    '110–120px',
    'HTML where it makes the UI better',
    'give EVERY page a relevant sidebar icon',
    'no per-app datasource attach/link step',
    'validate_app(app_id)',
    'awaited preflight barrier',
    'update_pages({ app_id, version_id, updates?, order? })',
    'Immediately share the clickable `app_url` in chat',
    'Repeat the clickable `app_url` in the final handoff',
    'how many MCP tool calls it took',
    'Reuse existing components deliberately',
    'collect every issue before editing',
    'detail:"structure"',
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
