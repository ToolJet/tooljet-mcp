import { parseExpression } from '@babel/parser';
import type { ComponentSummary } from './tooljetClient.js';

type Node = Record<string, any>;
const member = (n: Node | undefined) => n && ['MemberExpression', 'OptionalMemberExpression'].includes(n.type);
const key = (n: Node) => n.computed ? n.property?.type === 'StringLiteral' ? n.property.value : undefined : n.property?.name;
const unwrap = (v: unknown): unknown => v && typeof v === 'object' && 'value' in v ? (v as {value: unknown}).value : v;

// Intentionally only whole-value bindings. Do not parse SQL or infer constraints
// from arbitrary code, dynamic component names, or local `components` variables.
function inputRefs(value: unknown): Set<string> {
  const refs = new Set<string>();
  const scan = (v: unknown) => {
    if (Array.isArray(v)) { v.forEach(scan); return; }
    if (v && typeof v === 'object') { Object.values(v).forEach(scan); return; }
    if (typeof v !== 'string') return;
    const binding = v.trim().match(/^\{\{([\s\S]*)\}\}$/);
    if (!binding) return;
    let root: Node;
    try { root = parseExpression(binding[1]!) as unknown as Node; } catch { return; }
    const found = new Set<string>(); let uncertain = false;
    const visit = (n: any) => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { n.forEach(visit); return; }
      if (n.params || n.type === 'VariableDeclarator' || n.type === 'WithStatement') uncertain = true;
      if (member(n) && ['value', 'selectedDate', 'isValid'].includes(key(n)) && member(n.object)) {
        const owner = n.object;
        if (owner.object?.type === 'Identifier' && owner.object.name === 'components' && key(owner)) found.add(key(owner));
      }
      Object.values(n).forEach(visit);
    };
    visit(root);
    if (!uncertain) found.forEach(name => refs.add(name));
  };
  scan(value); return refs;
}

// Recognize only the simple observed guard shape, not arbitrary validation JS.
// A trim, regex, isValid, function, comparison, or conditional leaves the case
// unverified rather than producing a speculative warning.
function truthyOnlyRequiredText(value: unknown, disabled: boolean): Set<string> {
  const raw = unwrap(value);
  if (typeof raw !== 'string') return new Set();
  const binding = raw.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!binding) return new Set();
  let root: Node;
  try { root = parseExpression(binding[1]!) as unknown as Node; } catch { return new Set(); }
  const refs = new Set<string>();
  const rooted = (n: Node, name: string) => member(n) && n.object?.type === 'Identifier' && n.object.name === name && key(n);
  const visit = (n: Node): boolean => {
    if (n.type === 'LogicalExpression' && n.operator === (disabled ? '||' : '&&')) return visit(n.left) && visit(n.right);
    if (disabled && n.type === 'UnaryExpression' && n.operator === '!') {
      const v = n.argument;
      if (member(v) && key(v) === 'value' && rooted(v.object, 'components')) {
        refs.add(key(v.object)); return true;
      }
    }
    if (!disabled && member(n) && key(n) === 'value' && rooted(n.object, 'components')) {
      refs.add(key(n.object)); return true;
    }
    // A loading flag does not validate user input.
    const v = n.type === 'UnaryExpression' && n.operator === '!' ? n.argument : n;
    return Boolean(member(v) && key(v) === 'isLoading' && rooted(v.object, 'queries'));
  };
  return visit(root) ? refs : new Set();
}

/** Advisory for a direct button -> native mutation. A required marker does not
 * prevent a query firing outside Form validation. Never invent or rewrite guards. */
export function requiredMutationGuardWarnings(
  source: ComponentSummary,
  query: {name?: string; id: string; options?: unknown},
  action: Record<string, unknown>,
  components: ComponentSummary[]
): string[] {
  const inputs = inputRefs(query.options);
  const guarded = inputRefs([source.properties?.disabledState, action.runOnlyIf]);
  const missing = components.filter(c => c.name && inputs.has(c.name) && !guarded.has(c.name) &&
    ['TextInput', 'TextArea', 'NumberInput', 'CurrencyInput', 'DatePickerV2'].includes(c.type ?? '') &&
    [true, 'true', '{{true}}'].includes(unwrap(c.validation?.mandatory) as any));
  const warnings = missing.length ? [`Button "${source.name ?? source.id}" directly runs mutation "${query.name ?? query.id}" using required inputs ` +
    `${missing.map(c => `"${c.name}"`).join(', ')}, but no field validation is visible in disabledState or runOnlyIf. ` +
    'A required marker alone does not stop this query. Validate before writing (including whitespace-only text), or route through a validating Form/RunJS success chain. Preserve zero and false; keep database constraints authoritative. This advisory does not prove arbitrary guards or server validation.'] : [];
  const disabledRefs = inputRefs(source.properties?.disabledState), actionRefs = inputRefs(action.runOnlyIf);
  const disabledTruthy = truthyOnlyRequiredText(source.properties?.disabledState, true);
  const actionTruthy = truthyOnlyRequiredText(action.runOnlyIf, false);
  // An authored non-empty check expresses intent even without a mandatory flag.
  // This remains conditional advice, not a new required-field constraint.
  const weak = components.filter(c => c.name && inputs.has(c.name) && ['TextInput','TextArea'].includes(c.type ?? '') &&
    (disabledTruthy.has(c.name) || actionTruthy.has(c.name)) &&
    (!disabledRefs.has(c.name) || disabledTruthy.has(c.name)) && (!actionRefs.has(c.name) || actionTruthy.has(c.name)));
  if (weak.length) warnings.push(`Button "${source.name ?? source.id}" checks text ${weak.map(c=>`"${c.name}"`).join(', ')} ` +
    'using only truthiness. Whitespace-only text can pass this guard. If blank text is invalid, trim before checking length (and validate before writing); do not apply truthiness validation to numbers or booleans.');
  return warnings;
}
