/* Figures drawn in a card grid (blind review, 2026-10-12: an AC repair dashboard's KPI row was a ShadCardGrid with the
   value in subtitleField and "-$19,305.50 vs last week" in badgeField; the reviewer scored it 3: "delta chips are
   clipped in every KPI card, the headline values are tiny"). A card grid is for records with a face; its badge sits
   beside the title, where a long delta is cut off, and its subtitle is small body text, not a headline figure.
   ShadStat (value, valueFormat, change, changeLabel) or one ShadSummaryStrip (items) draw figures. Advisory. */

interface Spec {
  name?: string;
  type?: string;
  properties?: Record<string, unknown>;
}

const FIGURE_FIELD = /^(value|values|metric|amount|total|count|kpi|figure|stat|number|current)$/i;
const DELTA_FIELD = /(delta|change|comparison|compare|trend|vs|diff)/i;
const KPI_NAME = /(kpi|metric|stat|figure|summary|scorecard|headline)/i;

const valueOf = (props: Record<string, unknown> | undefined, key: string): string => {
  const entry = props?.[key] as { value?: unknown } | undefined;
  const v = entry && typeof entry === 'object' && 'value' in entry ? entry.value : entry;
  return typeof v === 'string' ? v.trim() : '';
};

export function lintKpiCardGrids(components: Spec[]): string[] {
  return components
    .filter((c) => c.type === 'ShadCardGrid')
    .filter((c) => {
      const p = c.properties;
      const figure = ['titleField', 'subtitleField', 'descriptionField'].some((k) => FIGURE_FIELD.test(valueOf(p, k)));
      const delta = DELTA_FIELD.test(valueOf(p, 'badgeField'));
      return (figure && (delta || !valueOf(p, 'imageField'))) || (KPI_NAME.test(c.name ?? '') && !valueOf(p, 'imageField'));
    })
    .map(
      (c) =>
        `Card grid "${c.name ?? 'ShadCardGrid'}" draws figures: a card grid is for records with a face, its badge sits beside ` +
        'the title (a long delta is cut off) and its subtitle is small body text, not a headline number. Draw KPIs as a row ' +
        'of ShadStat (value, valueFormat, change, changeLabel) or one ShadSummaryStrip (items).'
    );
}
