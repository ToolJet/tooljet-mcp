/* Seed rows whose figures do not vary (Employee onboarding, 2026-10-11: progress was one number per stage, so every
   starter in their first week showed 61%). Real metrics differ from record to record; a column that repeats one value,
   or one value per stage, makes every card, bar and tile show the same figure. Advisory: a flat fee can be uniform. */

type Row = Record<string, unknown>;

const MIN_ROWS = 6;
// Figures a screen shows per record.
const METRIC = /(progress|complet|percent|pct|score|rating|health|satisfaction|nps|readiness|utili[sz]ation|occupancy|amount|price|cost|total|revenue|balance|spend|budget|salary|value|hours|minutes|duration|days|stock|quantity|qty|count|tickets|visits|sales|margin|rate)/i;
// Not figures: keys, order, flags and dates.
const NOT_METRIC = /(^id$|_id$|^id_|uuid|key$|^sort|order$|position|rank|index|^year$|^is_|^has_|date|_at$|zip|phone|code$)/i;
// Measured metrics: these come from the record's own state, so one value per stage is a lookup table, not data.
const MEASURED = /(progress|complet|percent|pct|score|health|satisfaction|nps|readiness|utili[sz]ation|occupancy)/i;

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value);
  return undefined;
};

export function lintUniformSeedMetrics(tableName: string, rows: Row[]): string[] {
  if (rows.length < MIN_ROWS) return [];
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const warnings: string[] = [];
  for (const column of columns) {
    if (!METRIC.test(column) || NOT_METRIC.test(column)) continue;
    const values = rows.map((row) => asNumber(row[column]));
    const present = values.filter((v): v is number => v !== undefined);
    if (present.length < MIN_ROWS || present.length < rows.length * 0.8) continue;
    const distinct = new Set(present);
    if (distinct.size === 1) {
      warnings.push(
        `Seed data for table "${tableName}": column "${column}" is ${present[0]} in all ${present.length} rows, so every record ` +
          'shows the same figure. Vary it across rows the way real records differ.'
      );
      continue;
    }
    if (!MEASURED.test(column)) continue;
    // One value per stage: a text column with 3 or more groups, each of two or more rows, and the metric constant in each.
    for (const by of columns) {
      if (by === column || NOT_METRIC.test(by)) continue;
      const groups = new Map<string, Set<number>>();
      const sizes = new Map<string, number>();
      let usable = true;
      rows.forEach((row, index) => {
        const group = row[by];
        const value = values[index];
        if (typeof group !== 'string' || value === undefined) { usable = false; return; }
        groups.set(group, (groups.get(group) ?? new Set()).add(value));
        sizes.set(group, (sizes.get(group) ?? 0) + 1);
      });
      if (!usable || groups.size < 3 || groups.size > 8 || [...sizes.values()].some((n) => n < 2)) continue;
      if ([...groups.values()].some((set) => set.size > 1)) continue;
      const examples = [...groups.entries()].slice(0, 3).map(([group, set]) => `${group} ${[...set][0]}`).join(', ');
      warnings.push(
        `Seed data for table "${tableName}": column "${column}" is one value per ${by} (${examples}), so every record in a ` +
          `${by} shows the same ${column}. Vary it within each ${by} the way real records differ, and compute it from the ` +
          'record\'s own data (tasks done of tasks due, for example) rather than a fixed number per stage.'
      );
      break;
    }
  }
  return warnings;
}
