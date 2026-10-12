/* Charts on one page in different hand-set accents (blind reviews, 2026-10-11: an AC repair dashboard drew two charts
   in #0F766E and a third in #2563EB, "the bright blue bar chart clashes with the teal palette", and four other builds
   did the same). A pack chart without chartColor follows the app theme's primary (--cc-primary-brand), so leaving it
   unset, or setting one accent for every chart, keeps a page in one colour. categoryColors and series colors carry
   meaning (Won green, Lost red) and are not compared. Advisory. */

interface Spec {
  name?: string;
  type?: string;
  properties?: Record<string, unknown>;
  styles?: Record<string, unknown>;
}

const THEME = 'theme primary';
const isChart = (type: string | undefined): boolean => /^Shad\w*Chart$/.test(type ?? '') || type === 'ShadSparkline';
const valueOf = (props: Record<string, unknown> | undefined, key: string): unknown => {
  const entry = props?.[key] as { value?: unknown } | undefined;
  return entry && typeof entry === 'object' && 'value' in entry ? entry.value : entry;
};

// A chart's single series colour: colors with one entry on a chart of one series is its accent, the same as chartColor
// (an AC repair dashboard set colors ['#2563EB'] on one bar chart among teal ones; the lint only read chartColor).
const singleSeriesColor = (chart: Spec): string | undefined => {
  const colors = valueOf(chart.properties, 'colors');
  const series = valueOf(chart.properties, 'yFields');
  if (!Array.isArray(colors) || colors.length !== 1 || typeof colors[0] !== 'string') return undefined;
  if (Array.isArray(series) && series.length > 1) return undefined;
  return colors[0];
};

function accent(chart: Spec): string {
  const raw = valueOf(chart.styles, 'chartColor') ?? valueOf(chart.properties, 'chartColor') ?? singleSeriesColor(chart);
  const text = typeof raw === 'string' ? raw.replace(/^\{\{\s*['"]?|['"]?\s*\}\}$/g, '').trim().toLowerCase() : '';
  if (!text || /--cc-primary-brand/.test(text)) return THEME;
  // #0f766e and #0f766eff are one colour.
  return /^#[0-9a-f]{8}$/.test(text) && text.endsWith('ff') ? text.slice(0, 7) : text;
}

export function lintChartAccents(components: Spec[]): string[] {
  const charts = components.filter((c) => isChart(c.type));
  if (charts.length < 2) return [];
  const byAccent = new Map<string, string[]>();
  for (const chart of charts) {
    const key = accent(chart);
    byAccent.set(key, [...(byAccent.get(key) ?? []), `"${chart.name ?? chart.type}"`]);
  }
  if (byAccent.size < 2) return [];
  const groups = [...byAccent.entries()].map(([key, names]) => `${names.join(', ')} ${key === THEME ? 'follow the theme primary' : `use ${key}`}`);
  return [
    `Charts on this page use ${byAccent.size} different accents (${groups.join('; ')}), so one chart reads as from another ` +
      'palette. Leave chartColor unset on every chart (they follow the theme primary), or give them all the same accent; ' +
      'keep categoryColors for colours that mean something.',
  ];
}

/** Page polish: one-colour charts on a page that set different hand-picked accents take the most common one (ties go to
 *  the first chart's), so one chart no longer reads as from another palette. Charts following the theme primary and
 *  multi-series colours are left alone. */
export function unifyChartAccents<T extends Spec>(components: T[]): { components: T[]; warnings: string[] } {
  const handSet = components.filter((c) => isChart(c.type) && accent(c) !== THEME);
  const counts = new Map<string, number>();
  for (const c of handSet) counts.set(accent(c), (counts.get(accent(c)) ?? 0) + 1);
  if (counts.size < 2) return { components, warnings: [] };
  let majority = accent(handSet[0]);
  for (const [key, n] of counts) if (n > (counts.get(majority) ?? 0)) majority = key;
  const pick = handSet.find((c) => accent(c) === majority)!;
  const original =
    (valueOf(pick.styles, 'chartColor') ?? valueOf(pick.properties, 'chartColor') ?? singleSeriesColor(pick)) as string;
  const warnings: string[] = [];
  const out = components.map((c) => {
    if (!handSet.includes(c) || accent(c) === majority) return c;
    const next = { ...c, properties: { ...(c.properties ?? {}) }, styles: { ...(c.styles ?? {}) } } as T;
    if (valueOf(c.styles, 'chartColor') !== undefined) next.styles!.chartColor = { value: original };
    else if (valueOf(c.properties, 'chartColor') !== undefined) next.properties!.chartColor = { value: original };
    else next.properties!.colors = { value: [original] };
    warnings.push(`Chart "${c.name ?? c.type}" used ${accent(c)} beside charts in ${majority}; it now uses ${majority} too.`);
    return next;
  });
  return { components: out, warnings };
}
