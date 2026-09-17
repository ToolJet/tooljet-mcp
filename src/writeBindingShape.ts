import { parseExpression } from '@babel/parser';
import { bindingSpans } from './bindingSpans.js';

/** Parse only a complete bound object literal. Unknown calls, spreads and runtime
 * records are left alone: we must not guess their shape or evaluate user code. */
export function primitiveWriteBindingEntries(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  const source = value.trim();
  const spans = bindingSpans(source);
  if (spans.length !== 1 || spans[0].start !== 0 || spans[0].end !== source.length) return [];
  try {
    const node = parseExpression(spans[0].body);
    if (node.type !== 'ObjectExpression') return [];
    return node.properties.flatMap(p => {
      if (p.type !== 'ObjectProperty' || p.computed) return [];
      const key = p.key.type === 'Identifier' ? p.key.name :
        p.key.type === 'StringLiteral' || p.key.type === 'NumericLiteral' ? String(p.key.value) : undefined;
      if (!key) return [];
      // Every such expression is a primitive, never a {column, value} record.
      return ['StringLiteral','NumericLiteral','BooleanLiteral','NullLiteral','TemplateLiteral','UnaryExpression'].includes(p.value.type)
        ? [key] : [];
    });
  } catch { return []; }
}
