/* A guard on the selected record object itself (expense build, 2026-10-12): a details sheet wrote every value as
   `components.tableExpenses.selectedRow ? components.tableExpenses.selectedRow.department : '-'`. A Table's selectedRow
   (and a card grid's or list's selectedItem) is {} when nothing is selected, which is truthy, so the guard always passed
   and the sheet drew blank values and "$0.00". The test must be on a stable key: selectedRow?.id. */

interface Spec {
  name?: string;
  type?: string;
  properties?: Record<string, unknown>;
}

// `components.x.selectedRow ?` or `components.x.selectedRow &&` with nothing chained on the object.
const OBJECT_GUARD = /components\??\.(\w+)\??\.(selectedRow|selectedItem|selectedBooking)\s*(\?(?![.?])|&&)/g;

const strings = (value: unknown, out: string[] = []): string[] => {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value as Record<string, unknown>).forEach((v) => strings(v, out));
  return out;
};

export function lintTruthySelectionGuards(components: Spec[]): string[] {
  const errors: string[] = [];
  for (const c of components) {
    const found = new Set<string>();
    for (const text of strings(c.properties)) {
      for (const m of text.matchAll(OBJECT_GUARD)) found.add(`components.${m[1]}.${m[2]}`);
    }
    if (!found.size) continue;
    const [first] = found;
    errors.push(
      `${c.type ?? 'Component'} "${c.name ?? ''}" tests ${[...found].join(', ')} itself, but a selection is {} when nothing is ` +
        `selected, which is truthy: the guard always passes and the values draw blank. Test a stable key instead: ` +
        `${first.replace(/\.(selectedRow|selectedItem|selectedBooking)$/, '?.$1')}?.id ? ... : '-' (or read each field as ` +
        `${first.replace(/\.(selectedRow|selectedItem|selectedBooking)$/, '?.$1')}?.field ?? '-').`
    );
  }
  return errors;
}
