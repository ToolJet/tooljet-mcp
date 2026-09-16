import { parseExpression } from '@babel/parser';

type Node = Record<string, any>;

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
