/** Syntax-only check for a whole-value ToolJet expression. Never invoke the compiled function.
 * Mixed text/interpolation and ambiguous embedded delimiters are deliberately left unchecked;
 * this is not a runtime evaluator, sanitizer, or complete template parser.
 */
export function lintBindingSyntax(value: unknown, path: string, wholeValueRequired = false): string[] {
  if (Array.isArray(value)) return value.flatMap((child, index) => lintBindingSyntax(child, `${path}[${index}]`, wholeValueRequired));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => lintBindingSyntax(child, `${path}.${key}`, wholeValueRequired));
  }
  if (typeof value !== 'string') return [];
  const match = value.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!match) {
    return wholeValueRequired && value.includes('{{')
      ? [`${path}: expected one whole-value JavaScript binding, without text before or after {{...}}; this property is not an interpolated text field.`]
      : [];
  }
  if (!wholeValueRequired && (match[1].includes('{{') || match[1].includes('}}'))) return [];
  try {
    // Compile only: unknown runtime names are valid and no application code is executed here.
    // Parentheses require an expression (including an IIFE), just like a component value binding.
    new Function(`return (\n${match[1]}\n);`);
    return [];
  } catch (error) {
    if (!(error instanceof SyntaxError)) return [];
    return [`${path}: invalid JavaScript binding syntax (${error.message}). Fix the expression before saving; a failed binding can render as empty data. This check does not execute the expression.`];
  }
}
