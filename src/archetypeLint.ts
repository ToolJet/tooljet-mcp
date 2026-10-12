/* A page's archetype, stated in the plan (pages[].archetype), and the blueprint choices a page of that kind keeps.
   Two hand-built apps scored 8 in a blind review (2026-10-12: an expense overview, a recipe catalog) where the agent's
   builds of the same prompts scored 6 to 6.7; the gap was composition, not components: "a large bar chart dominates the
   first screen of a recipe app", "text-only cards feel flat", "two actions in the header", "green and purple clash".
   Each archetype names the page's main surface and the few sections around it; this lint warns when a page breaks the
   archetype it declared. Advisory: the agent's blueprint (read_build_pattern) carries the full layout. */

interface Spec {
  name?: string;
  clientRef?: string;
  type?: string;
  parentRef?: string;
  parent?: string;
  properties?: Record<string, unknown>;
  styles?: Record<string, unknown>;
}

export const PAGE_ARCHETYPES = ['catalog', 'personal-overview', 'register', 'queue-board', 'other'] as const;

// The component a page of each archetype is built around, shown before any chart.
const MAIN_SURFACE: Record<string, { types: Set<string>; label: string }> = {
  catalog: { types: new Set(['ShadCardGrid']), label: 'a photo card grid (ShadCardGrid)' },
  'personal-overview': {
    types: new Set(['ShadSummaryStrip', 'ShadStat', 'ShadProgress', 'ShadCircularProgress']),
    label: 'the period figures (ShadSummaryStrip, then progress tiles)',
  },
  register: { types: new Set(['Table', 'ShadTable']), label: 'the records table (Table with tableLook "shadcn")' },
  'queue-board': {
    types: new Set(['ShadRecordList', 'Table', 'ShadTable', 'ShadKanban', 'ShadCardGrid']),
    label: 'the work itself (a needs-attention ShadRecordList, the queue table or a ShadKanban)',
  },
};
const FILTER_TYPES = new Set(['ShadInput', 'ShadToggleGroup', 'ShadSelect', 'ShadTabs', 'ShadCombobox', 'ShadMultiselect']);
const DIALOG_TYPES = new Set(['ShadDialog', 'Modal', 'ModalV2']);
// Components outside dialogs: the direct builds held 7 to 20; past this the page is a list of everything, not a design.
const SHORT_LIST_MAX = 36;

const isChart = (type: string | undefined): boolean => /^Shad\w*Chart$/.test(type ?? '');
const valueOf = (bag: Record<string, unknown> | undefined, key: string): unknown => {
  const entry = bag?.[key] as { value?: unknown } | undefined;
  return entry && typeof entry === 'object' && !Array.isArray(entry) && 'value' in entry ? entry.value : entry;
};
const textOf = (bag: Record<string, unknown> | undefined, key: string): string => {
  const v = valueOf(bag, key);
  return typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
};
const refOf = (c: Spec): string => c.clientRef ?? c.name ?? '';
const label = (c: Spec): string => `"${c.name ?? c.clientRef ?? c.type}"`;

/** Components outside dialogs in reading order: roots in plan order, each followed by its children (depth first). */
function readingOrder(components: Spec[]): Spec[] {
  const refs = new Set(components.map(refOf).filter(Boolean));
  const parentOf = (c: Spec): string | undefined => {
    const p = c.parentRef ?? c.parent;
    return p && refs.has(p) ? p : undefined;
  };
  const children = new Map<string, Spec[]>();
  for (const c of components) {
    const p = parentOf(c);
    if (p) children.set(p, [...(children.get(p) ?? []), c]);
  }
  const out: Spec[] = [];
  const seen = new Set<Spec>();
  const visit = (c: Spec): void => {
    if (seen.has(c) || DIALOG_TYPES.has(c.type ?? '')) return;
    seen.add(c);
    out.push(c);
    for (const child of children.get(refOf(c)) ?? []) visit(child);
  };
  for (const c of components) if (!parentOf(c)) visit(c);
  return out;
}

/** Colours a chart needs to tell its parts apart: one per slice of a donut, one per series of a multi-series chart. */
function chartColourWarnings(chart: Spec): string[] {
  const series = valueOf(chart.properties, 'yFields');
  const parts =
    chart.type === 'ShadPieChart' || chart.type === 'ShadFunnelChart'
      ? 'slice'
      : Array.isArray(series) && series.length > 1
        ? 'series'
        : null;
  if (!parts) return [];
  const colors = valueOf(chart.properties, 'colors');
  const literal = Array.isArray(colors) ? colors : null;
  const bound = typeof colors === 'string' && colors.includes('{{') && !/^\{\{\s*\[\s*\]\s*\}\}$/.test(colors.trim());
  if (bound) return [];
  if (!literal || literal.length === 0) {
    return [
      `Chart ${label(chart)} draws each ${parts} in the default palette: set colors to explicit, distinct hues that sit ` +
        'with the theme (one family, clearly different lightness or hue per ' + parts + '), so no pair clashes and no slice ' +
        'disappears.',
    ];
  }
  const norm = literal.map((c) => String(c).trim().toLowerCase());
  if (new Set(norm).size < norm.length) {
    return [`Chart ${label(chart)} repeats a colour in colors (${literal.join(', ')}): give each ${parts} its own hue.`];
  }
  return [];
}

/** The header's actions: a ShadHero's two labels, or the buttons in the row that holds the page's first heading. */
function headerActionWarnings(order: Spec[], components: Spec[]): string[] {
  const first = order.find((c) => c.type === 'ShadHero' || c.type === 'ShadHeading');
  if (!first) return [];
  if (first.type === 'ShadHero') {
    const primary = textOf(first.properties, 'actionLabel');
    const secondary = textOf(first.properties, 'secondaryActionLabel');
    return primary && secondary
      ? [`Header ${label(first)} offers two actions ("${primary}", "${secondary}"): keep the one the page is for; move the other into the page (a card's action, a filter or the nav).`]
      : [];
  }
  const byRef = new Map(components.map((c) => [refOf(c), c]));
  // The heading's header row: the nearest row container within two levels up.
  let row: Spec | undefined;
  let at: Spec | undefined = first;
  for (let i = 0; i < 2 && at; i++) {
    at = byRef.get(at.parentRef ?? at.parent ?? '');
    if (at?.type === 'FlexContainer' && textOf(at.properties, 'direction') === 'row') {
      row = at;
      break;
    }
  }
  if (!row) return [];
  const inRow = new Set<string>([refOf(row)]);
  const buttons: Spec[] = [];
  for (const c of order) {
    const p = c.parentRef ?? c.parent ?? '';
    if (!inRow.has(p)) continue;
    inRow.add(refOf(c));
    if (c.type === 'ShadButton') buttons.push(c);
  }
  return buttons.length > 1
    ? [`Header row ${label(row)} holds ${buttons.length} buttons (${buttons.map(label).join(', ')}): keep one primary action in the header; the rest belong in the page or the nav.`]
    : [];
}

export function lintPageArchetype(archetype: string | undefined, components: Spec[]): string[] {
  const kind = (archetype ?? '').trim();
  if (!kind) return [];
  if (!(PAGE_ARCHETYPES as readonly string[]).includes(kind)) {
    return [`Archetype "${kind}" is not one of ${PAGE_ARCHETYPES.join(', ')}; use "other" for a page that is none of them.`];
  }
  if (kind === 'other') return [];
  const prefix = `Archetype "${kind}": `;
  const order = readingOrder(components);
  const warnings: string[] = [];
  const main = MAIN_SURFACE[kind];
  const mainAt = order.findIndex((c) => main.types.has(c.type ?? ''));
  const chartAt = order.findIndex((c) => isChart(c.type));
  if (mainAt < 0) {
    warnings.push(`the page is built around ${main.label}, and this plan has none.`);
  } else if (chartAt >= 0 && chartAt < mainAt) {
    warnings.push(
      `chart ${label(order[chartAt])} comes before ${label(order[mainAt])}: the main surface opens the page; a chart, if it ` +
        'earns a place, sits beside or below it, never as the first thing under the header.'
    );
  }
  const has = (type: string): boolean => order.some((c) => c.type === type);
  const filterBefore = (index: number): boolean => order.slice(0, Math.max(index, 0)).some((c) => FILTER_TYPES.has(c.type ?? ''));
  const hasDialog = components.some((c) => DIALOG_TYPES.has(c.type ?? ''));
  if (kind === 'catalog' && mainAt >= 0) {
    const grid = order[mainAt];
    if (!textOf(grid.properties, 'imageField')) {
      warnings.push(
        `card grid ${label(grid)} has no imageField: a catalog shows each record's photo. Seed an image column (a different ` +
          "URL per row from get_component_catalog's authoringHints.photos) and set imageField."
      );
    }
    if (!filterBefore(mainAt)) warnings.push(`no search or filter bar above ${label(grid)}: put a search input and a course/kind toggle in a row between the hero and the grid.`);
    if (!hasDialog) warnings.push('no detail sheet: a card click opens a ShadDialog (variant "sheet") with the photo and the full record.');
  }
  if (kind === 'register' && mainAt >= 0) {
    if (!filterBefore(mainAt)) warnings.push(`no filter row above ${label(order[mainAt])}: a register is read through a period or status toggle and a select.`);
    if (!hasDialog) warnings.push('no detail sheet: a row click opens a ShadDialog (variant "sheet") with the record and its actions.');
  }
  if (kind === 'personal-overview') {
    if (!has('ShadSummaryStrip')) warnings.push('no ShadSummaryStrip under the hero: the period\'s four key figures go in one strip.');
    const progress = order.some(
      (c) => c.type === 'ShadProgress' || c.type === 'ShadCircularProgress' || (c.type === 'ShadStat' && valueOf(c.properties, 'progress') !== undefined)
    );
    if (!progress) warnings.push('no progress grid: show each goal or budget as a ShadStat with progress (or ShadProgress) against its limit.');
  }
  if (kind === 'queue-board' && !has('ShadSummaryStrip')) {
    warnings.push('no ShadSummaryStrip: a queue opens with its counts (open, overdue, unassigned, done this week) in one strip.');
  }
  for (const chart of order.filter((c) => isChart(c.type))) warnings.push(...chartColourWarnings(chart));
  warnings.push(...headerActionWarnings(order, components));
  if (order.length > SHORT_LIST_MAX) {
    warnings.push(
      `${order.length} components outside dialogs: a ${kind} page reads best with a short list (the blueprint has about 10 to 20); ` +
        'merge repeated tiles into one bound component and drop sections the page does not need.'
    );
  }
  return warnings.map((w) => prefix + w);
}
