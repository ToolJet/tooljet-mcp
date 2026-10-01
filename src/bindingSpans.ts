import { parseExpression } from '@babel/parser';

/** Parse-only template boundaries. Object literals, strings and template strings may contain
 * `}}`, so the first textual delimiter is not necessarily the end of an expression.
 * Invalid/ambiguous expressions remain unchanged for the syntax/runtime checks.
 */
export function bindingSpans(value: string): Array<{ start: number; end: number; body: string }> {
  const spans: Array<{ start: number; end: number; body: string }> = [];
  let from = 0;
  while (from < value.length) {
    const start = value.indexOf('{{', from);
    if (start < 0) break;
    let close = value.indexOf('}}', start + 2);
    let matched = false;
    while (close >= 0) {
      const body = value.slice(start + 2, close);
      try {
        parseExpression(`(${body})`);
        spans.push({ start, end: close + 2, body });
        from = close + 2;
        matched = true;
        break;
      } catch {
        // Advance one character: nested objects can produce three adjacent closing braces.
        close = value.indexOf('}}', close + 1);
      }
    }
    if (!matched) from = start + 2;
  }
  return spans;
}
