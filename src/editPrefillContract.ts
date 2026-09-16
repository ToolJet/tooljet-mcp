import type { AppSummary } from './tooljetClient.js';
import { bindingReferences } from './bindingReferences.js';

const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const unwrap = (v: unknown): unknown => Object.hasOwn(record(v), 'value') ? record(v).value : v;

/** A narrow edit-form advisory: several blank inputs feed one existing-row update.
 * Never infer an initial value or rewrite a write payload. Explicit control events or RunJS
 * references may prepare the fields; leave those paths to runtime QA instead of guessing.
 */
export function lintEditPrefill(summary: AppSummary): string[] {
  const controls = summary.pages.flatMap(p => p.components);
  const names = new Map(controls.filter(c => c.name).map(c => [c.name!, c]));
  const warnings: string[] = [];
  for (const q of summary.queries) {
    const options = record(q.options);
    if (q.kind !== 'tooljetdb' || options.operation !== 'update_rows') continue;
    const update = record(options.update_rows);
    if (!Object.keys(record(update.where_filters)).length) continue;
    // A literal write alongside inputs often denotes a transition (complete,
    // return, acknowledge), not an edit of existing values. Prefer silence for
    // these ambiguous workflows: prefill can itself overwrite newly entered data.
    const entries = Object.values(record(update.columns)).map(record);
    if (entries.some(entry => Object.hasOwn(entry, 'value') &&
      (typeof entry.value !== 'string' || !entry.value.includes('{{')))) continue;
    const referenced = [...new Set(bindingReferences(update.columns).filter(r => r.namespace === 'components').map(r => r.name))];
    const blank = referenced.flatMap(name => {
      const c = names.get(name);
      if (!c || !['TextInput','EmailInput','PhoneInput','NumberInput','TextArea'].includes(c.type ?? '')) return [];
      const p = record(c.properties);
      if (['value','defaultValue'].some(k => { const v = unwrap(p[k]); return v !== undefined && v !== null && v !== ''; })) return [];
      // Both literal control events and arbitrary preparation code are plausible initializers.
      if (summary.events.some(e => JSON.stringify(e.event).includes(c.id))) return [];
      if (summary.queries.some(other => other.kind === 'runjs' && JSON.stringify(other.options).includes(name))) return [];
      return [name];
    });
    if (blank.length < 2) continue;
    warnings.push(`Query "${q.name ?? q.id}" updates an existing row from blank controls ${blank.map(n=>JSON.stringify(n)).join(', ')} with no visible prefill path. ` +
      'If these edit existing values, initialize them from the selected raw record (generate_edit_contract can supply supported field defaults/events), then verify a one-field edit preserves untouched values. ' +
      'Do not require users to re-enter existing contact details. An intentional multi-field replacement form may be valid; this advisory does not change values or layout.');
  }
  return warnings;
}

/** A static selector with no initial selection can pass null straight into an edit.
 * Advisory only: clearing may be legitimate, and opaque initialization/guards are not guessed.
 */
export function lintUninitializedWriteSelections(summary: AppSummary): string[] {
  const controls = summary.pages.flatMap(p => p.components);
  const warnings: string[] = [];
  for (const q of summary.queries) {
    const options = record(q.options);
    if (q.kind !== 'tooljetdb' || options.operation !== 'update_rows') continue;
    const update = record(options.update_rows);
    if (!Object.keys(record(update.where_filters)).length) continue;
    const reads = new Set(bindingReferences(update.columns).filter(r => r.namespace === 'components').map(r => r.name));
    for (const c of controls) {
      if (c.type !== 'DropdownV2' || !c.name || !reads.has(c.name)) continue;
      const p = record(c.properties);
      const choices = unwrap(p.options);
      if (unwrap(p.advanced) || !Array.isArray(choices) || !choices.length) continue;
      // A default (including a dynamic default) or explicit empty option is intentional.
      if (choices.some(choice => {
        const item = record(choice);
        return (item.default !== undefined && item.default !== false) || item.value === '' || item.value === null;
      })) continue;
      if (summary.events.some(e => JSON.stringify(e.event).includes(c.id))) continue;
      if (summary.queries.some(other => other.kind === 'runjs' && JSON.stringify(other.options).includes(c.name!))) continue;
      const guardSources = [options.disableQuery, (q as unknown as Record<string, unknown>).disableQuery,
        ...controls.filter(b => b.type === 'Button').map(b => record(b.properties).disabledState)];
      if (guardSources.some(g => bindingReferences(g).some(r => r.namespace === 'components' && r.name === c.name))) continue;
      warnings.push(`Query "${q.name ?? q.id}" writes from DropdownV2 "${c.name}" with static choices but no default, explicit empty option, visible initialization or selection guard. Saving before a choice can clear the stored value. Prefill the existing value or guard the write until a valid choice exists; if clearing is intentional, model that choice explicitly. This advisory never chooses a default for the user.`);
    }
  }
  return warnings;
}
