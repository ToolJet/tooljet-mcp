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
  // ToolJet's runtime evaluates a {{ }} binding as a single line: any newline inside the braces makes
  // the whole binding resolve to nothing, and an Html or Text component then renders empty even though
  // the expression compiles. Seen live on 2026-09-12 (a status page whose banner, board and history were
  // multi-line IIFEs). This applies to embedded bindings in text as much as to whole-value ones.
  const multiline = multilineBindings(value);
  if (multiline.length) {
    return multiline.map(
      (snippet) =>
        `${path}: a {{ }} binding contains a line break (${snippet}); ToolJet evaluates bindings as one line and renders a multi-line one as empty. Put the expression on a single line, or compute the value in a JavaScript query / transformation and bind {{queries.name.data}}.`
    );
  }
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

/** Every {{ ... }} span in `value` whose body contains a newline, as short snippets for the message. */
export function multilineBindings(value: string): string[] {
  const found: string[] = [];
  let from = 0;
  for (;;) {
    const open = value.indexOf('{{', from);
    if (open === -1) break;
    const close = value.indexOf('}}', open + 2);
    if (close === -1) break;
    const body = value.slice(open + 2, close);
    if (/[\r\n]/.test(body)) found.push(JSON.stringify(body.trim().slice(0, 40)) + (body.trim().length > 40 ? '…' : ''));
    from = close + 2;
  }
  return found;
}
