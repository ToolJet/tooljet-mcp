/**
 * ToolJet resolves `{{ ... }}` bindings with a non-greedy `/{{(.*?)}}/` match, so the FIRST `}}` in a
 * property ends the expression. Any nested object literal that closes with two adjacent braces
 * (`marker:{color:'#0E7490'}}`, a Plotly `layout` block, an IIFE ending `}})()`) is cut off there, the
 * expression fails to parse, and the component renders blank with no error: a Table shows "No data",
 * a Chart draws empty axes. `} }` is the same JavaScript, so inserting a space is a safe, deterministic
 * repair. Quoted strings are left untouched.
 */
export function separateAdjacentClosingBraces(text: string): string {
  let out = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (!text.startsWith('{{', i)) {
      out += text[i];
      i += 1;
      continue;
    }
    let j = i + 2;
    let depth = 0;
    let quote: string | null = null;
    let expr = '';
    let terminated = false;
    while (j < n) {
      const c = text[j];
      if (quote) {
        expr += c;
        if (c === '\\' && j + 1 < n) {
          expr += text[j + 1];
          j += 2;
          continue;
        }
        if (c === quote) quote = null;
        j += 1;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') {
        quote = c;
        expr += c;
        j += 1;
        continue;
      }
      if (c === '{') {
        depth += 1;
        expr += c;
        j += 1;
        continue;
      }
      if (c === '}') {
        if (depth === 0 && text[j + 1] === '}') {
          terminated = true;
          break;
        }
        depth = Math.max(depth - 1, 0);
        expr += c;
        if (text[j + 1] === '}') expr += ' ';
        j += 1;
        continue;
      }
      expr += c;
      j += 1;
    }
    if (!terminated) {
      out += text.slice(i);
      break;
    }
    out += `{{${expr}}}`;
    i = j + 2;
  }
  return out;
}

/** Apply `separateAdjacentClosingBraces` to every string inside a value (arrays and plain objects walked). */
export function separateAdjacentClosingBracesDeep(value: unknown): { value: unknown; changed: boolean } {
  if (typeof value === 'string') {
    if (!value.includes('{{')) return { value, changed: false };
    const fixed = separateAdjacentClosingBraces(value);
    return { value: fixed, changed: fixed !== value };
  }
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const result = separateAdjacentClosingBracesDeep(item);
      changed ||= result.changed;
      return result.value;
    });
    return { value: changed ? next : value, changed };
  }
  if (value && typeof value === 'object') {
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const result = separateAdjacentClosingBracesDeep(item);
      changed ||= result.changed;
      next[key] = result.value;
    }
    return { value: changed ? next : value, changed };
  }
  return { value, changed: false };
}
