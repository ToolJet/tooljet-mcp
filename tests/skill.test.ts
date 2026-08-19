import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skill = readFileSync(resolve(root, 'skill/SKILL.md'), 'utf8');
const reference = readFileSync(resolve(root, 'skill/references/tooljet-reference.md'), 'utf8');
const toolWorkflows = readFileSync(resolve(root, 'skill/references/tool-workflows.md'), 'utf8');
const uiAuthoring = readFileSync(resolve(root, 'skill/references/ui-authoring.md'), 'utf8');
const formsAndInteractions = readFileSync(resolve(root, 'skill/references/forms-and-interactions.md'), 'utf8');
const guidance = [skill, reference, toolWorkflows, uiAuthoring, formsAndInteractions].join('\n');
const both = guidance;
// The generator holds the skill body in a template literal, so backticks are escaped (\`) in source.
// Unescape them so anchor comparisons match the rendered skill text.
const generator = readFileSync(resolve(root, 'scripts/generate-skill.mjs'), 'utf8').replace(/\\`/g, '`');

// The generated skill's design section, from its heading to the next top-level heading.
function section(document: string, from: string): string {
  const start = document.indexOf(from);
  if (start < 0) return '';
  const rest = document.slice(start + from.length);
  const end = rest.indexOf('\n## ');
  return end < 0 ? rest : rest.slice(0, end);
}
const designSection = section(uiAuthoring, '## Design — decide before you build');

describe('generated skill — progressive disclosure', () => {
  it('keeps the always-loaded skill compact and routes optional detail by task', () => {
    expect(skill.trim().split(/\s+/).length).toBeLessThan(4_000);
    expect(guidance).toContain('## Keep context small — load only the relevant reference');
    expect(guidance).toContain('`references/ui-authoring.md`');
    expect(guidance).toContain('`references/forms-and-interactions.md`');
    expect(guidance).toContain('`references/tool-workflows.md`');
  });
});

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
    expect(guidance).toContain('`CircularProgressBar`');
    expect(guidance).not.toContain('`CircularProgressbar`');
    expect(guidance).toMatch(/both resolutions.*flat `layout:\{top,left,width,height\}`/i);
    expect(guidance).toMatch(/`layouts:\{desktop:\{top,left,width,height\},mobile:\{top,left,width,height\}\}`/i);
    expect(guidance).toMatch(/Do not put `desktop`\/`mobile` inside `layout`.*rejects the entire atomic `add_components` batch/i);
  });

  it('has the chart-title clipping guardrail (empty title + separate Text heading)', () => {
    expect(guidance).toMatch(/Chart\.title` empty/);
    expect(guidance).toMatch(/separate `Text` heading above the chart/);
    expect(guidance).toMatch(/only after you've visually verified/i);
  });

  it('documents the exact modern Table row-action target and compound ref', () => {
    expect(guidance).toContain('`columnType: "button"`');
    expect(guidance).toContain('`source_type:"table_column"`');
    expect(guidance).toContain('`ref:"<column key or name>::<button id>"`');
    expect(guidance).toMatch(/deprecated `properties\.actions`/);
    expect(reference).toMatch(/## Table row-action Button columns/);
    expect(reference).toContain('"ref": "actions::view-action"');
    expect(reference).toMatch(/selectedRow.*selectedRowId.*before running this handler/s);
  });

  it('documents KeyValuePair projection and an empty DatePickerV2 create value', () => {
    expect(guidance).toMatch(/KeyValuePair.*explicit.*fields.*does not suppress undeclared keys.*project/is);
    expect(guidance).toMatch(/KeyValuePair.*fieldDeletionHistory.*not appended.*positionally merged/is);
    expect(reference).toMatch(/DatePickerV2[\s\S]*defaultValue="\{\{null\}\}".*01\/01\/2022/i);
  });

  it('documents the Kanban selection dependency and blank custom-card modal caveat', () => {
    expect(guidance).toMatch(/onCardSelected.*only when.*openModalOnCardClick.*true/is);
    expect(guidance).toMatch(/custom Html child.*native modal.*blank/is);
  });

  it('limits the nested-map warning to Html and preserves supported Table lookup joins', () => {
    expect(guidance).toMatch(/Html rawHtml expressions.*map\(\).*inside another.*completely blank/is);
    expect(guidance).toMatch(/Do not generalize this to Table data.*filter\(\.\.\.\)\[0\].*inside.*map\(\).*work/is);
    expect(guidance).not.toMatch(/\*\*Html\/Chart expressions:/);
  });

  it('documents the empty-array first-row fallback trap', () => {
    expect(guidance).toContain('`(queries.<q>.data || [{}])[0].field`');
    expect(guidance).toMatch(/`\[\]` is truthy.*`\(queries\.<q>\.data \|\| \[\]\)\[0\]\?\.field`/is);
  });

  it('documents ToolJet DB sort ids and aggregate response aliases', () => {
    expect(reference).toMatch(/order_filters.*outer map key.*inner `id`.*silently disable sorting/is);
    expect(reference).toMatch(/aggregate configuration key is not the result key.*<table_name>_<column>_<aggFx>/is);
    expect(reference).toContain('`starlink_terminals_id_count`');
  });

  it('uses dependency-driven server-side reads with exact Table state shapes', () => {
    expect(guidance).toMatch(/server-side Tables[\s\S]*runOnDependencyChange:true.*after.*exposed value is published/i);
    expect(guidance).toMatch(/do \*\*not\*\* also run the same reactive queries from those events/i);
    expect(guidance).toMatch(/sortApplied: \[\{column,columnKey,direction\}\].*filters: \[\{column,condition,value\}\]/i);
    expect(guidance).toMatch(/ButtonGroupV2.*previous `selected` value/i);
    expect(guidance).toMatch(/DaterangePicker.*literal strings `"undefined"` or `"Invalid date"`/i);
    expect(guidance).toMatch(/pageIndex.*undefined.*\(\(components\.<table>\.pageIndex \|\| 1\) - 1\).*NaN.*empty Table/i);
  });

  it('batches multiple proven safe query reads without broadening execution scope', () => {
    expect(guidance).toMatch(/run_queries.*up to ten.*proven bounded read-only.*concurrently/is);
    expect(guidance).toMatch(/refuses `SELECT \*`, unbounded reads, mutations, RunJS, paid\/remote APIs, and unknown kinds/i);
    expect(guidance).toMatch(/two or more independent bounded ToolJet DB\/SQL reads.*one preflighted `run_queries/is);
  });

  it('requires count-first approval for potentially large reads', () => {
    expect(guidance).toMatch(/Never author or execute `SELECT \*` against an unfamiliar table.*run_query.*refuses/is);
    expect(guidance).toMatch(/same-source `COUNT\(\*\)`.*count_query_id.*runs the count first.*does not execute the target/is);
    expect(guidance).toMatch(/more than 1,000 rows.*server-side-pagination territory/is);
    expect(guidance).toMatch(/tell the user the observed row count.*ask explicitly.*user_confirmed_large_read:true/is);
    expect(guidance).toMatch(/general permission to build or inspect an app is not consent for a large read/i);
  });

  it('documents insert-only seeding and generated-key safety', () => {
    expect(guidance).toMatch(/Seed writes are insert-only.*omit generated serial primary keys.*real sequence/is);
    expect(guidance).toMatch(/duplicate-key failure.*never.*permission to update/is);
  });

  it('has explicit table-column ordering guidance and the headerCasing fact', () => {
    expect(guidance).toMatch(/explicit, complete `columns` array/i);
    expect(guidance).toMatch(/property order of a transformed query object to reorder/i);
    expect(guidance).toContain('`headerCasing: "none"` is a valid value');
  });

  it('documents chart-width and statistics-height defaults', () => {
    expect(guidance).toMatch(/13[–-]15 columns/);
    expect(guidance).toMatch(/20[–-]24 columns/);
    expect(guidance).toMatch(/110[–-]120px/);
  });

  it('keeps the DropdownV2 dynamic-mode prerequisite in the compact skill', () => {
    expect(guidance).toMatch(/Dynamic `schema` requires `advanced="\{\{true\}\}"`/);
    expect(guidance).toMatch(/silently uses static `options`/);
    expect(guidance).toMatch(/`options` accepts a literal static array only.*dynamic `\{\{ \}\}` string.*character objects/is);
  });

  it('defaults to simple Charts and requires trace verification for dynamic Plotly JSON', () => {
    expect(guidance).toMatch(/default to simple `type` \+ explicit `data:\[\{x,y\}\]`/i);
    expect(guidance).toMatch(/Static descriptions must be valid JSON with a non-empty `data` array/i);
    expect(guidance).toMatch(/visible Chart with zero evaluated traces/i);
  });
});

describe('generated skill — mobile & verification caveats', () => {
  it('skips mobile by default and distinguishes structural vs real mobile validation', () => {
    expect(guidance).toMatch(/skip it by default/i);
    expect(guidance).toMatch(/unless the user explicitly asks/i);
    expect(guidance).toMatch(/recomposition/i);
    // the caveat: resizing a browser window does not prove ToolJet mobile rendered
    expect(guidance).toMatch(/resizing a browser window does NOT prove ToolJet's mobile layout rendered/);
  });

  it('tells the agent not to cycle through many viewports', () => {
    expect(guidance).toMatch(/Verify the default desktop render only/i);
    expect(guidance).toMatch(/Test other viewports only if the user asks/i);
  });

  it('requires explicit execution-mode confirmation when scope is large', () => {
    expect(guidance).toMatch(/Treat scope as \*\*large\*\* when.*3\+ substantive pages.*2\+ independent complex workflows.*multi-table.*multiple datasource/is);
    expect(guidance).toMatch(/get the user's execution choice before any mutating build call/i);
    expect(guidance).toMatch(/phased checkpoints \(recommended\).*whole app in one run.*slower.*without feedback/is);
    expect(guidance).toMatch(/Do not silently choose for them/i);
  });

  it('presents customer-facing completion estimates without false precision', () => {
    expect(guidance).toMatch(/customer-facing and time-informed/i);
    expect(guidance).toMatch(/first usable result.*estimated total active build time.*excluding time waiting for customer feedback.*confidence level/is);
    expect(guidance).toMatch(/Estimate from substantive pages\/workflows and datasource\/schema certainty.*widen the range/is);
    expect(guidance).toMatch(/ranges rounded to about 5[–-]10 minutes.*never fake precision or present the estimate as a promise/is);
    expect(guidance).toContain('`likely 30+ minutes · low confidence`');
    expect(guidance).toMatch(/Phased \(recommended\): first usable part.*Whole app: estimated.*rough estimates/is);
    expect(guidance).toMatch(/Do not mention MCP calls, tokens, or internal implementation details/i);
  });
});

describe('generated skill — modal form layout', () => {
  it('documents atomic modal parenting, rendered input height, and modal sizing', () => {
    expect(guidance).toMatch(/client_ref/);
    expect(guidance).toMatch(/parent_ref/);
    expect(guidance).toMatch(/styles\.alignment\.value = "top"/);
    expect(guidance).toMatch(/renderedHeight.*height \+ 20px/is);
    expect(guidance).toMatch(/40px.*60px.*70px/is);
    expect(guidance).toMatch(/modalHeight >= lowest child top \+ renderedHeight/i);
    expect(guidance).toMatch(/modal title Text.*slot_name:"header"/i);
    expect(guidance).toMatch(/showHeader:true.*empty header.*second title row.*body/is);
    expect(guidance).toMatch(/Header, body, and footer are separate child canvases/i);
  });

  it('documents the generated-vs-standalone Form decision and FilePicker crash workaround', () => {
    expect(guidance).toMatch(/only when \*\*every selected field\*\* maps to.*textinput.*number.*emailinput.*password.*datepicker.*checkbox/is);
    expect(guidance).toMatch(/any field.*dropdown.*multiselect.*textarea.*build the \*\*entire form\*\* from standalone components/is);
    expect(guidance).toMatch(/styles\.alignment\.value="top".*two-column grid.*TextArea fields full-width/is);
    expect(guidance).toMatch(/validation\.mandatory.*required state\/asterisks/is);
    expect(guidance).toMatch(/filepicker.*crashes.*standalone `FilePicker`/is);
    expect(reference).toMatch(/textinput.*textarea.*emailinput.*starrating.*filepicker/is);
    expect(reference).toMatch(/values.*displayValues.*not `options`/is);
    expect(reference).toMatch(/no working `required` flag.*minLength.*customRule/is);
    expect(reference).toMatch(/passes no schema alignment through.*literal "Label".*whole form from standalone/is);
  });

  it('documents the real generate-file PDF limitation', () => {
    expect(guidance).toMatch(/PDF branch is pass-through only.*pre-formed PDF bytes/is);
    expect(reference).toMatch(/does not render text, HTML, or tabular data into a PDF/is);
  });

  it('uses a two-axis DOM overlap check for form and modal verification', () => {
    expect(guidance).toMatch(/id=<component_id>/);
    expect(guidance).toMatch(/getBoundingClientRect/);
    expect(guidance).toMatch(/both axes.*xOverlap && yOverlap/is);
  });
});

describe('generated skill — workspaces', () => {
  it('tells the agent to confirm the workspace before building (multi-workspace users)', () => {
    expect(guidance).toMatch(/## Workspace — confirm which one first/);
    expect(guidance).toMatch(/list_workspaces/);
    expect(guidance).toMatch(/use_workspace\(id\)/);
    expect(guidance).toMatch(/before creating anything/i);
    expect(guidance).toContain('TOOLJET_WORKSPACE_ID');
  });

  it('uses workspace datasources directly without inventing per-app linking', () => {
    expect(guidance).toMatch(/Workspace-connected sources.*brand-new apps/i);
    expect(guidance).toMatch(/no per-app datasource attach\/link step/i);
    expect(reference).toMatch(/after `create_app`, call `list_datasources\(version_id\)`/i);
    expect(reference).toMatch(/wrong workspace, insufficient permission.*environment configuration/i);
  });
});

describe('generated skill — HTML usage, page icons, validation, efficiency', () => {
  it('nuances HTML usage (built-in for interactive; HTML for display/custom markup)', () => {
    expect(guidance).toMatch(/HTML where it makes the UI better/i);
    expect(guidance).toMatch(/Presentational \/ display-only/i);
    expect(guidance).toMatch(/Custom markup inside a component'?s own properties/i);
  });

  it('requires a relevant icon on every page of a multi-page app', () => {
    expect(guidance).toMatch(/give EVERY page a relevant sidebar icon/);
    expect(guidance).toContain('IconLayoutDashboard');
    expect(guidance).toContain('IconHome2');
    expect(guidance).toMatch(/left sidebar look unfinished/);
  });

  it('documents validate_app and the non-blocking warnings contract', () => {
    expect(guidance).toMatch(/validate_app\(app_id\)/);
    expect(guidance).toMatch(/array of non-blocking lint hints/);
  });

  it('treats lint_app_spec as an awaited barrier before every write', () => {
    expect(guidance).toMatch(/awaited preflight barrier/i);
    expect(guidance).toMatch(/one-time 30-minute `plan_token`/i);
    expect(guidance).toMatch(/apply_app_phase\(\{ app_id, version_id, plan_token \}\)/i);
    expect(guidance).toMatch(/Never run the linter concurrently with that or any other mutating tool/i);
    expect(guidance).toMatch(/never dispatch the linter and the apply call as siblings in parallel/i);
  });

  it('routes final visual QA through the bounded one-shot browser audit helper', () => {
    expect(guidance).toMatch(/scripts\/browser-audit\.js/);
    expect(guidance).toMatch(/complete IIFE once/i);
    expect(guidance).toMatch(/one confirmation audit \+ screenshot/i);
    expect(guidance).toMatch(/does not check console\/network failures.*mutation correctness/i);
  });

  it('uses update_pages to restyle and reorder existing pages including Home', () => {
    expect(guidance).toMatch(/update_pages\(\{ app_id, version_id, updates\?, order\? \}\)/);
    expect(guidance).toMatch(/including the auto-created Home page/i);
    expect(guidance).toMatch(/complete ordered list of current page ids/i);
  });

  it('requires explicit confirmation for guarded page deletion', () => {
    expect(guidance).toMatch(/delete_page\(\{ app_id, version_id, page_id, confirm:true \}\)/);
    expect(guidance).toMatch(/refuses external events that still target the page/i);
  });

  it('does not overstate datasource response coverage', () => {
    expect(guidance).toMatch(/response shape and `status` when known/i);
    expect(guidance).toMatch(/`runtime-dependent` or `unknown`.*safe successful run/is);
    expect(reference).toMatch(/response shape\/status when known/i);
  });

  it('tells the agent to report tool-call count and only real token usage', () => {
    expect(guidance).toMatch(/how many MCP tool calls it took/);
    expect(guidance).toMatch(/token usage only if your runtime actually surfaces it/i);
  });

  it('suggests what to build next when phases are exhausted', () => {
    expect(guidance).toMatch(/grow into next/i);
  });

  it('tells the agent to flag unbuildable requests instead of faking them', () => {
    expect(guidance).toMatch(/don't say yes to everything/i);
    expect(guidance).toMatch(/Never fake it/i);
    expect(guidance).toMatch(/tell the user plainly/i);
  });

  it('explains it cannot connect a new datasource / third-party integration and gives fallbacks', () => {
    // brief version stays prominent in the core skill's honesty rule
    expect(guidance).toMatch(/you cannot connect a new one from here/i);
    expect(guidance).toMatch(/never handle credentials yourself/i);
    // full detail lives in the reference
    expect(reference).toMatch(/cannot create or connect a new datasource or third-party integration/i);
    expect(reference).toMatch(/already-connected/i);
    expect(reference).toMatch(/REST API datasource/);
    expect(reference).toMatch(/seeded with representative sample data/i);
  });
});

describe('generated skill — information architecture & phasing (the crowded-page fix)', () => {
  it('requires planning information architecture (pages) before components', () => {
    expect(guidance).toMatch(/information architecture BEFORE any component/i);
    expect(guidance).toMatch(/name a PRODUCT, not a single page/i);
    expect(guidance).toMatch(/one overview page \+ one focused page per major job/i);
    expect(guidance).toMatch(/Map every capability to exactly ONE page/i);
  });

  it('separates page architecture from phasing (no appending to the overview)', () => {
    expect(guidance).toMatch(/page architecture and phasing are SEPARATE decisions/i);
    expect(guidance).toMatch(/NOT more stuff appended to the Home\/overview page/i);
    expect(guidance).toMatch(/useful working loop within a few minutes/i);
    expect(guidance).toMatch(/Complete journeys over skeletons/i);
  });

  it('does not re-ask after an explicit mode choice and honors the chosen checkpoint behavior', () => {
    expect(guidance).toMatch(/already explicitly chooses phased delivery.*whole app.*one go.*build everything.*do not stop.*do not ask again/is);
    expect(guidance).toMatch(/detailed feature spec alone is not an execution choice/i);
    expect(guidance).toMatch(/phased-checkpoint mode.*wait for the user to continue.*whole-app mode.*continue without waiting/is);
  });
});

describe('generated skill — selective reads, reuse, and page-level QA', () => {
  it('shares the app URL early and reuses one built-in browser tab after meaningful progress', () => {
    expect(guidance).toMatch(/Immediately share the clickable `app_url` in chat/i);
    expect(guidance).toMatch(/built-in browser.*first meaningful page works.*reuse the same tab/is);
    expect(guidance).toMatch(/reload it at page-level checkpoints.*instead of opening new tabs/is);
    expect(guidance).toMatch(/Repeat the clickable `app_url` in the final handoff/i);
  });

  it('batches only relevant catalog contracts and avoids redundant simple lookups', () => {
    expect(guidance).toMatch(/types.*batch/i);
    expect(guidance).toMatch(/request only the relevant sections\/keys/i);
    expect(guidance).toMatch(/skip redundant lookups for familiar simple components/i);
  });

  it('uses bounded/scoped app summaries with dotted field selection', () => {
    expect(guidance).toContain('detail:"structure"');
    expect(guidance).toMatch(/exact dotted fields/i);
    expect(guidance).toMatch(/Do not pull every value from a multi-page app/i);
    expect(guidance).toMatch(/current page\/component.*not the whole app/i);
  });

  it('reuses components as guarded templates instead of copying hidden coupling', () => {
    expect(guidance).toMatch(/Reuse existing components deliberately/i);
    expect(guidance).toMatch(/treat it as a \*\*template\*\*/i);
    expect(guidance).toMatch(/Never copy a component id, event row/i);
    expect(guidance).toMatch(/stale query\/component binding blindly/i);
  });

  it('collects page issues, batches fixes, confirms once, and triages cosmetics', () => {
    expect(guidance).toMatch(/collect every issue before editing/i);
    expect(guidance).toMatch(/smallest number of batched/i);
    expect(guidance).toMatch(/one confirmation pass/i);
    expect(guidance).toMatch(/Report unless requested/i);
    expect(guidance).toMatch(/one collected cosmetic repair batch/i);
    expect(guidance).toMatch(/verify every requested primary flow/i);
  });
});

describe('generated skill — async states & density guardrails', () => {
  it('keeps narrow Statistics labels short enough to preserve the value', () => {
    expect(guidance).toMatch(/Statistics sizing.*12.?17 columns.*one- or two-word label.*hide the value/is);
  });

  it('requires the full set of async/query states incl. no-double-fire', () => {
    expect(guidance).toMatch(/## Async & UI states — required, not polish/);
    for (const s of ['Loading:', 'Empty:', 'Error:', 'Refresh:', 'Success:', 'Disabled']) {
      expect(guidance).toContain(s);
    }
    expect(guidance).toMatch(/must never fire the mutation twice/i);
    expect(guidance).toMatch(/isLoading/);
  });

  it('has a density guardrail that still allows legitimately dense operational UIs', () => {
    expect(guidance).toMatch(/don't overcrowd; split instead/i);
    expect(guidance).toMatch(/dense is fine when the job genuinely needs it/i);
    expect(guidance).toMatch(/progressive disclosure/i);
  });

  it('has a forms & modals field-layout recipe (top-aligned labels, spacing, modal-local coords)', () => {
    expect(guidance).toMatch(/## Forms & modals — field layout/);
    expect(guidance).toContain('styles.alignment.value = "top"');
    expect(guidance).toMatch(/40px authored height/);
    expect(guidance).toMatch(/Row step is always.*authored height \+ 20px.*\+ 10px gap.*70px only.*40px-authored/is);
    expect(guidance).toMatch(/90[–-]100px authored height.*TextArea/is);
    expect(guidance).toMatch(/no value-font-size style/i);
    expect(guidance).toMatch(/relative to the modal body/i);
  });

  it('lists the new overcrowding / skeleton / missing-state anti-patterns', () => {
    expect(guidance).toMatch(/Dumping every requested capability onto one page/i);
    expect(guidance).toMatch(/Skeleton or placeholder pages/i);
    expect(guidance).toMatch(/no loading \/ empty \/ error state/i);
    expect(guidance).toMatch(/double-fired/i);
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
    'Seed writes are insert-only',
    'delete_page({ app_id, version_id, page_id, confirm:true })',
    'visible Plotly Charts with zero evaluated traces',
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
