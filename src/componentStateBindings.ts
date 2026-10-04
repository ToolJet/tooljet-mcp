import { parseExpression } from '@babel/parser';

type Node = Record<string, unknown> & { type: string };
type Component = { name?: string; type?: string };
const isNode = (value: unknown): value is Node =>
  !!value && typeof value === 'object' && typeof (value as Node).type === 'string';
const isMember = (value: unknown): value is Node =>
  isNode(value) && ['MemberExpression', 'OptionalMemberExpression'].includes(value.type);

function memberName(node: Node): string | undefined {
  const property = node.property;
  if (!isNode(property)) return undefined;
  if (!node.computed && property.type === 'Identifier') return String(property.name);
  if (node.computed && property.type === 'StringLiteral') return String(property.value);
  return undefined;
}

function bindsComponents(value: unknown): boolean {
  if (!isNode(value)) return false;
  if (value.type === 'Identifier') return value.name === 'components';
  if (value.type === 'RestElement') return bindsComponents(value.argument);
  if (value.type === 'AssignmentPattern') return bindsComponents(value.left);
  if (value.type === 'ArrayPattern') return (value.elements as unknown[]).some(bindsComponents);
  if (value.type === 'ObjectPattern') return (value.properties as Node[]).some((p) =>
    bindsComponents(p.type === 'RestElement' ? p.argument : p.value));
  return false;
}

/** Reject a proven wrong runtime alias, not every uncatalogued property.
 * Parses whole-value expressions only; never executes code. Dynamic names, shadowed namespaces,
 * and ambiguous mixed templates are left unverified rather than blocking valid app logic.
 */
export function lintComponentStateBindings(value: unknown, components: Component[], path: string): string[] {
  if (Array.isArray(value)) return value.flatMap((child, i) => lintComponentStateBindings(child, components, `${path}[${i}]`));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, child]) =>
    lintComponentStateBindings(child, components, `${path}.${key}`));
  if (typeof value !== 'string') return [];
  const binding = value.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!binding) return [];
  let root: unknown;
  try { root = parseExpression(binding[1]); } catch { return []; }
  const wrongNames = new Set<string>();
  let shadowed = false;
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!isNode(node)) return;
    if (
      (node.type === 'VariableDeclarator' && bindsComponents(node.id)) ||
      (/^(Function|Class)(Declaration|Expression)$/.test(node.type) && bindsComponents(node.id)) ||
      (Array.isArray(node.params) && node.params.some(bindsComponents)) ||
      (node.type === 'CatchClause' && bindsComponents(node.param)) ||
      node.type === 'WithStatement' ||
      (node.type === 'CallExpression' && isNode(node.callee) && node.callee.type === 'Identifier' && node.callee.name === 'eval')
    ) shadowed = true;
    const prop = isMember(node) ? memberName(node) : undefined;
    if (prop && isMember(node.object)) {
      const owner = node.object;
      if (isNode(owner.object) && owner.object.type === 'Identifier' && owner.object.name === 'components') {
        const name = memberName(owner);
        const type = name ? components.find((c) => c.name === name)?.type : undefined;
        if (name && type && WRONG_ALIASES[type]?.[prop]) wrongNames.add(`${name}\u0000${type}\u0000${prop}`);
      }
    }
    Object.values(node).forEach(visit);
  };
  visit(root);
  return shadowed ? [] : [...wrongNames].map((key) => {
    const [name, type, prop] = key.split('\u0000') as [string, string, string];
    return `${path}: ${WRONG_ALIASES[type]![prop]!(name)}`;
  });
}

/** Properties a binding reads that are proven wrong for that component type, with the message naming the right one. */
const WRONG_ALIASES: Record<string, Record<string, (name: string) => string>> = {
  Kanban: {
    selectedCard: (name) => `Kanban "${name}" does not expose selectedCard. Use components.${name}.lastSelectedCard after onCardSelected; ` +
      'the incorrect alias is undefined and opens an empty detail form. Keep the selected record id and raw fields for edits.',
  },
  // A claims build filtered its queue on a radio's label, the caption "Type", so no row matched (2026-10-04).
  RadioButtonV2: {
    label: (name) => `RadioButton "${name}": label is the field's caption, not the chosen option, so a filter or write reading it ` +
      `matches nothing. Read components.${name}.value for the selection.`,
  },
};
