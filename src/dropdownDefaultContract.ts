import { parseExpression } from '@babel/parser';

type Node = Record<string, any>;

/** A dropdown's own current value is not an initializer for an existing record.
 * Only inspect explicit default expressions in closed literal/map/concat option
 * lists. This remains advisory: event-driven initialization may be intentional. */
export function dropdownSelfDefaultWarning(value: unknown, name: string): string[] {
  if (typeof value !== 'string') return [];
  const binding = value.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!binding) return [];
  let root: Node;
  try { root = parseExpression(binding[1]!) as unknown as Node; } catch { return []; }
  const member = (n: Node | undefined) => n?.type === 'MemberExpression' || n?.type === 'OptionalMemberExpression';
  const key = (n: Node) => n.computed ? n.property?.type === 'StringLiteral' ? n.property.value : undefined : n.property?.name;
  const readsSelf = (n: Node | null): boolean => {
    if (!n || typeof n !== 'object') return false;
    // Do not cross scopes; unknown/shadowed code is not verified.
    if (/Function/.test(n.type ?? '')) return false;
    if (member(n) && key(n) === 'value' && member(n.object) && key(n.object) === name &&
      n.object.object?.type === 'Identifier' && n.object.object.name === 'components') return true;
    return Object.values(n).some(v => Array.isArray(v) ? v.some(readsSelf) : v && typeof v === 'object' && readsSelf(v));
  };
  let self = false;
  const option = (n: Node | null) => {
    if (n?.type !== 'ObjectExpression' || n.properties.some((p: Node) => p.type !== 'ObjectProperty' || p.computed)) return;
    const defaults = n.properties.filter((p: Node) => (p.key?.name ?? p.key?.value) === 'default');
    if (defaults.length === 1 && readsSelf(defaults[0].value)) self = true;
  };
  const list = (n: Node | null) => {
    if (n?.type === 'ArrayExpression') n.elements.forEach(option);
    else if (n?.type === 'CallExpression' && member(n.callee) && !n.callee.computed) {
      if (n.callee.property?.name === 'concat') {
        list(n.callee.object);
        n.arguments.forEach(list);
      } else if (n.callee.property?.name === 'map' && n.arguments.length === 1) {
        const callback = n.arguments[0];
        if (callback?.type === 'ArrowFunctionExpression' && callback.params.every((p: Node) => p.type === 'Identifier' && p.name !== 'components')) option(callback.body);
      }
    }
  };
  list(root);
  return self ? [`DropdownV2 "${name}": option.default reads this dropdown's own value. This does not initialize it from an existing record and can leave edit fields blank or stale when switching records. For record editing compare option.value with the raw record/draft field, preserving ID types and null; or verify explicit initialization/reset events before every edit. A missing selection must not silently clear a stored relationship. Advisory only: intentional event-driven initialization is not verified.`] : [];
}

/** Default lookup requires visible === true, unlike the menu which treats an
 * omitted visible as true. Inspect only closed option objects, never execute
 * bindings, infer query schemas, or rewrite intentional visibility. */
export function dropdownDefaultVisibilityWarning(value: unknown, label: string): string[] {
  let missing = false;
  if (Array.isArray(value)) {
    missing = value.some(option => option && typeof option === 'object' &&
      option.default === true && !Object.prototype.hasOwnProperty.call(option, 'visible'));
  } else if (typeof value === 'string') {
    const binding = value.trim().match(/^\{\{([\s\S]*)\}\}$/);
    if (!binding) return [];
    let root: Node;
    try { root = parseExpression(binding[1]!) as unknown as Node; } catch { return []; }
    const option = (entry: Node | null) => {
      if (entry?.type !== 'ObjectExpression') return;
      if (entry.properties.some((p: Node) => p.type !== 'ObjectProperty' || p.computed)) return;
      const properties = entry.properties as Node[];
      const name = (p: Node) => p.key?.name ?? p.key?.value;
      const defaults = properties.filter(p => name(p) === 'default');
      if (defaults.length !== 1 || properties.some(p => name(p) === 'visible')) return;
      const d = defaults[0]!.value;
      if (d.type === 'BooleanLiteral' && d.value === false || d.type === 'NullLiteral') return;
      missing = true;
    };
    if (root.type === 'ArrayExpression') root.elements.forEach(option);
    else if (root.type === 'CallExpression' && root.callee?.type === 'MemberExpression' &&
      !root.callee.computed && root.callee.property?.name === 'map' && root.arguments.length === 1) {
      const callback = root.arguments[0];
      if (callback?.type === 'ArrowFunctionExpression') option(callback.body);
    }
  }
  return missing ? [`DropdownV2 "${label}": an option declares a default but omits visible. ToolJet's default lookup requires visible:true even though the menu displays options with omitted visibility. Set visible:true on selectable default options; preserve intentional hidden options. Otherwise edit preselection can appear blank. This is advisory; unknown dynamic option sources are not verified.`] : [];
}
