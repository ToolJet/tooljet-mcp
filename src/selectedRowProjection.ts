import { parseExpression } from '@babel/parser';
import { lintUntrackedReactiveBindings, lintQueryArrayMutations } from './reactiveBindingContract.js';
import type { LintComponent } from './lint.js';
type ProjectionComponent = Pick<LintComponent, 'id' | 'name' | 'type' | 'properties' | 'styles'>;

type Node = Record<string, unknown>;
const node = (v: unknown): Node | undefined => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Node : undefined;
const member = (n: Node | undefined): boolean => n?.type === 'MemberExpression' || n?.type === 'OptionalMemberExpression';
function key(n: Node | undefined): string | undefined {
  if (!n) return;
  const p = node(n.property ?? n.key);
  if (!n.computed && p?.type === 'Identifier') return String(p.name);
  if (p?.type === 'StringLiteral') return String(p.value);
}
function expression(value: unknown): Node | undefined {
  if (typeof value !== 'string') return;
  const m = value.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!m) return;
  try { return parseExpression(m[1]!) as unknown as Node; } catch { return; }
}
function walk(value: unknown, visit: (n: Node) => void): void {
  if (Array.isArray(value)) { for (const child of value) walk(child, visit); return; }
  const n = node(value);
  if (!n) return;
  visit(n);
  for (const [k, child] of Object.entries(n)) {
    if (k !== 'loc' && k !== 'extra' && k !== 'comments') walk(child, visit);
  }
}

/** Only prove a closed final map projection. Spreads, computed keys, block callbacks,
 * and subsequent transforms are unknown, not invalid. Never execute user code. */
function projectedFields(c: ProjectionComponent): Map<string, Node | undefined> | undefined {
  if (c.type !== 'Table') return;
  const raw = c.properties?.data;
  const root = expression(node(raw) && 'value' in node(raw)! ? node(raw)!.value : raw);
  if (root?.type !== 'CallExpression') return;
  const callee = node(root.callee);
  if (!member(callee) || key(callee) !== 'map') return;
  const args = root.arguments;
  if (!Array.isArray(args) || args.length !== 1) return;
  const callback = node(args[0]);
  if (callback?.type !== 'ArrowFunctionExpression') return;
  const body = node(callback.body);
  if (body?.type !== 'ObjectExpression' || !Array.isArray(body.properties)) return;
  const keys = new Map<string, Node | undefined>();
  for (const prop of body.properties) {
    const p = node(prop);
    if (p?.type !== 'ObjectProperty' || p.computed) return;
    const name = key(p);
    if (name === undefined || name === '__proto__') return;
    keys.set(name, node(p.value));
  }
  return keys;
}

/** Advisory because missing-property fallbacks can be intentional. Warn about the
 * data contract, not about JavaScript validity; do not impose a projection style. */
export function lintSelectedRowProjections(
  components: ProjectionComponent[],
  extraSources: Array<{ label: string; value: unknown }> = [],
): string[] {
  const tables = new Map<string, Map<string, Node | undefined> | undefined>();
  for (const c of components) {
    if (!c.name) continue;
    // Ambiguous duplicate names cannot establish a reliable contract.
    tables.set(c.name, tables.has(c.name) ? undefined : projectedFields(c));
  }
  // Edit events commonly snapshot selectedRow into a variable. Follow only a
  // single known table assignment (plus null/reset); mixed/unknown writers are
  // unverified. This is an advisory, not general interprocedural dataflow.
  const aliases = new Map<string, string | undefined>();
  for (const source of extraSources) {
    const action = node(source.value);
    if (action?.actionId !== 'set-custom-variable' || typeof action.key !== 'string') continue;
    const selected = expression(action.value);
    if (action.value === null || selected?.type === 'NullLiteral') continue;
    const table = node(selected?.object), namespace = node(table?.object);
    const name = member(selected) && key(selected) === 'selectedRow' && member(table) &&
      namespace?.type === 'Identifier' && namespace.name === 'components' ? key(table) : undefined;
    if (!aliases.has(action.key)) aliases.set(action.key, name);
    else if (aliases.get(action.key) !== name) aliases.set(action.key, undefined);
  }
  // RunJS can assign variables outside the declarative events; do not infer an
  // alias if such a writer exists anywhere in these sources.
  if (extraSources.some(s => /actions\s*(?:\.\s*(?:setVariable|unsetVariable)|\[\s*["'](?:setVariable|unsetVariable)["']\s*\])/.test(JSON.stringify(s.value)))) aliases.clear();
  const warnings = new Set<string>();
  function inspect(value: unknown, label: string): void {
    if (Array.isArray(value)) { for (const v of value) inspect(v, label); return; }
    if (node(value)) { for (const v of Object.values(node(value)!)) inspect(v, label); return; }
    const root = expression(value);
    if (!root) return;
    // A locally bound `components` is not ToolJet's component namespace.
    let shadowed = false;
    walk(root, n => {
      if (Array.isArray(n.params) && /"(?:components|variables)"/.test(JSON.stringify(n.params))) shadowed = true;
      if (n.type === 'VariableDeclarator' && /"(?:components|variables)"/.test(JSON.stringify(n.id))) shadowed = true;
    });
    if (shadowed) return;
    walk(root, n => {
      if (!member(n)) return;
      const field = key(n), selection = node(n.object), table = node(selection?.object), namespace = node(table?.object);
      if (field && member(selection) && table?.type === 'Identifier' && table.name === 'variables') {
        const alias = key(selection), name = alias ? aliases.get(alias) : undefined;
        const fields = name ? tables.get(name) : undefined;
        if (name && fields && !fields.has(field) && !['toString','valueOf','constructor','hasOwnProperty','__proto__','isPrototypeOf','propertyIsEnumerable','toLocaleString'].includes(field)) {
          warnings.add(`${label}: reads variables.${alias}.${field}; an event assigns that variable from Table "${name}" selectedRow, whose closed map projection omits "${field}". This edit can overwrite the missing value with a blank/false default. Preserve the raw field or resolve the raw record by stable id before opening the editor; generate_edit_contract can provide that snapshot. Unknown runtime writes are not certified by this advisory.`);
        }
      }
      if (!field || !member(selection) || key(selection) !== 'selectedRow' || !member(table) || namespace?.type !== 'Identifier' || namespace.name !== 'components') return;
      const name = key(table), keys = name ? tables.get(name) : undefined;
      if (!name || !keys || keys.has(field) || ['toString', 'valueOf', 'constructor', 'hasOwnProperty', '__proto__', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString'].includes(field)) return;
      warnings.add(`${label}: reads components.${name}.selectedRow.${field}, but Table "${name}" has a closed map projection that omits "${field}". Preserve the raw field in the row (hide its column if needed), or look up the source record by its stable id. Check edit/review prefill and avoid overwriting omitted values with blanks. If the missing-field fallback is intentional, no change is required.`);
    });
  }
  for (const c of components) {
    const value = { p: c.properties, s: c.styles }, label = `Component "${c.name ?? c.id ?? '?'}"`;
    inspect(value, label);
    for (const warning of lintUntrackedReactiveBindings(value, label)) warnings.add(warning);
    for (const warning of lintQueryArrayMutations(value, label)) warnings.add(warning);
  }
  for (const source of extraSources) inspect(source.value, source.label);
  // Typed editors must not reuse display-only projections as their raw defaults. Keep this
  // advisory: conversions in the consumer, open projections and dynamic formats are unknown.
  const unwrap = (value: unknown) => node(value) && 'value' in node(value)! ? node(value)!.value : value;
  // Text placeholders belong in display cells, not persisted edit defaults.
  // Only follow direct field access or a known declarative selectedRow alias.
  for (const c of components) {
    if (!['TextInput','TextArea','EmailInput','PhoneInput'].includes(c.type ?? '')) continue;
    let selected = expression(unwrap(c.properties?.value));
    if (selected?.type === 'LogicalExpression' && ['||','??'].includes(String(selected.operator))) selected = node(selected.left);
    if (!member(selected)) continue;
    const field=key(selected), selection=node(selected?.object), owner=node(selection?.object), namespace=node(owner?.object);
    if (!field || !member(selection)) continue;
    const tableName = owner?.type === 'Identifier' && owner.name === 'variables'
      ? aliases.get(key(selection) ?? '')
      : key(selection) === 'selectedRow' && member(owner) && namespace?.type === 'Identifier' && namespace.name === 'components'
        ? key(owner) : undefined;
    const projected=tableName ? tables.get(tableName)?.get(field) : undefined;
    if (projected?.type !== 'LogicalExpression' || !['||','??'].includes(String(projected.operator))) continue;
    const fallback=node(projected.right);
    if (fallback?.type !== 'StringLiteral' || !String(fallback.value).trim()) continue;
    warnings.add(`Component "${c.name ?? c.id ?? '?'}": editable value reads "${field}" from Table "${tableName}", whose projection replaces missing raw text with a non-empty display fallback. Saving another field can persist that label as real data. Keep raw text separate from display labels, or resolve the raw record by stable id; preserve untouched null/empty values. This is advisory, not a claim that every fallback is unintended.`);
  }
  for (const c of components) {
    const property = c.type === 'DatePickerV2' ? 'defaultValue' : ['NumberInput', 'CurrencyInput'].includes(c.type ?? '') ? 'value' : undefined;
    if (!property) continue;
    let selected = expression(unwrap(c.properties?.[property]));
    if (selected?.type === 'LogicalExpression' && ['||', '??'].includes(String(selected.operator))) selected = node(selected.left);
    if (!member(selected)) continue;
    const field = key(selected), selection = node(selected?.object), table = node(selection?.object), namespace = node(table?.object);
    if (!field || !member(selection)) continue;
    const tableName = table?.type === 'Identifier' && table.name === 'variables'
      ? aliases.get(key(selection) ?? '')
      : key(selection) === 'selectedRow' && member(table) && namespace?.type === 'Identifier' && namespace.name === 'components'
        ? key(table) : undefined;
    const value = tableName ? tables.get(tableName)?.get(field) : undefined;
    if (!value) continue;
    const formats: string[] = [];
    let localizedNumber = false;
    walk(value, n => {
      if (n.type !== 'CallExpression') return;
      const callee = node(n.callee);
      if (!member(callee)) return;
      if (key(callee) === 'toLocaleString' || key(callee) === 'toFixed') localizedNumber = true;
      const args = n.arguments;
      if (key(callee) === 'format' && Array.isArray(args) && node(args[0])?.type === 'StringLiteral') formats.push(String(node(args[0])!.value));
    });
    const expected = unwrap(c.properties?.dateFormat) ?? 'DD/MM/YYYY';
    // A date column's parseDateFormat describes the raw row string; its
    // dateFormat changes display only. DatePickerV2 instead uses dateFormat
    // for BOTH parsing defaultValue and display. Follow only a closed map's
    // direct raw member projection, not conversions or guessed field names.
    if (c.type === 'DatePickerV2' && member(value) && typeof expected === 'string' && !expected.includes('{{')) {
      const source = components.find(t => t.type === 'Table' && t.name === tableName);
      const columns = unwrap(source?.properties?.columns);
      const matches = Array.isArray(columns) ? columns.filter(col => {
        const entry = node(col);
        return entry?.key === field && entry.columnType === 'datepicker';
      }) : [];
      const parseFormat = matches.length === 1 ? node(matches[0])?.parseDateFormat : undefined;
      const yearLast = /^(?:D{1,2}[^A-Za-z]+M{1,4}|M{1,4}[^A-Za-z]+D{1,2})[^A-Za-z]+Y{2,4}$/.test(expected);
      // ISO timestamp -> ISO date-only is often intentional and safe. Limit
      // this warning to the observed ISO -> year-last reinterpretation.
      if (typeof parseFormat === 'string' && parseFormat.startsWith('YYYY-MM-DD') && !parseFormat.includes('{{') && yearLast) {
        warnings.add(`Component "${c.name ?? c.id ?? '?'}": defaultValue reads raw ${tableName}.selectedRow.${field}; that Table column declares parseDateFormat "${parseFormat}", but the DatePickerV2 parses its default with dateFormat "${expected}". A name-only edit can silently change the date. Match the editor's input format or explicitly format the raw default before opening it; table display formatting does not convert selectedRow. Advisory only: verify the actual source value before changing it.`);
      }
    }
    if ((c.type === 'DatePickerV2' && formats.some(f => typeof expected === 'string' && !expected.includes('{{') && f !== expected)) ||
        (c.type !== 'DatePickerV2' && localizedNumber)) {
      warnings.add(`Component "${c.name ?? c.id ?? '?'}": ${property} reads display-formatted ${tableName}.selectedRow.${field} into a typed ${c.type} editor${c.type === 'DatePickerV2' ? ` (dateFormat ${String(expected)})` : ''}. Look up the raw record by stable id, or explicitly convert to the editor's input format. Preserve untouched fields on save; generate_edit_contract can provide raw-record defaults and changed-field-only payloads.`);
    }
  }
  return [...warnings];
}
