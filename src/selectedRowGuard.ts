import { parseExpression } from '@babel/parser';
import { bindingSpans } from './bindingSpans.js';
import type { AppSummary } from './tooljetClient.js';

type Node = Record<string, unknown>;
const obj = (v: unknown): Node => v && typeof v === 'object' && !Array.isArray(v) ? v as Node : {};
const member = (n: Node): unknown => obj(n.property)[n.computed ? 'value' : 'name'];

/** Advisory, never a rewrite: an unselected Table can expose a truthy empty row object. */
export function lintSelectedRowObjectGuards(summary: AppSummary): string[] {
  const controls = summary.pages.flatMap(p => p.components);
  const tables = new Set(controls.filter(c => c.type === 'Table').map(c => c.name));
  const warnings: string[] = [];
  for (const c of controls.filter(c => ['Button', 'Text', 'Html'].includes(c.type ?? ''))) {
    const key = c.type === 'Button' ? 'disabledState' : c.type === 'Html' ? 'rawHtml' : 'text';
    const raw = obj(c.properties)[key];
    const value = Object.hasOwn(obj(raw), 'value') ? obj(raw).value : raw;
    if (typeof value !== 'string') continue;
    const found = new Set<string>();
    const rowName = (v: unknown): string | undefined => {
      const row = obj(v), table = obj(row.object), root = obj(table.object);
      const name = member(table);
      if (['MemberExpression', 'OptionalMemberExpression'].includes(String(row.type)) && member(row) === 'selectedRow' &&
          ['MemberExpression', 'OptionalMemberExpression'].includes(String(table.type)) && root.type === 'Identifier' && root.name === 'components' &&
          typeof name === 'string' && tables.has(name)) return name;
      return undefined;
    };
    const walk = (v: unknown, booleanContext = false): void => {
      if (Array.isArray(v)) { v.forEach(x => walk(x)); return; }
      const n = obj(v);
      // Leave function-local scopes and their aliases to runtime verification.
      if (['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration', 'ObjectMethod'].includes(String(n.type))) return;
      const name = booleanContext ? rowName(n) : undefined;
      if (name) found.add(name);
      if (n.type === 'UnaryExpression' && n.operator === '!') { walk(n.argument, true); return; }
      if (n.type === 'ConditionalExpression') { walk(n.test, true); walk(n.consequent, booleanContext); walk(n.alternate, booleanContext); return; }
      if (n.type === 'LogicalExpression' && ['&&', '||'].includes(String(n.operator))) {
        walk(n.left, true); walk(n.right, booleanContext); return;
      }
      for (const child of Object.values(n)) if (child && typeof child === 'object') walk(child);
    };
    for (const span of bindingSpans(value)) { try { walk(parseExpression(span.body), c.type === 'Button'); } catch { /* Unknown syntax is checked elsewhere. */ } }
    if (found.size) warnings.push(`${c.type} "${c.name ?? c.id}" ${key} tests the selectedRow object from ${[...found].map(n => JSON.stringify(n)).join(', ')} as a boolean. An unselected/refreshed Table can return {}, which is truthy. Check the real record's stable key (for example selectedRow?.id != null) and show the empty-selection state; do not infer selection from the object itself. Verify the guard after filtering or refreshing the queue.`);
  }
  return warnings;
}
