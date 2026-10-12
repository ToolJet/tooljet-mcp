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

function accent(chart: Spec): string {
  const raw = valueOf(chart.styles, 'chartColor') ?? valueOf(chart.properties, 'chartColor');
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
