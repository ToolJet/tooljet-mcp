/** Read literal namespace references anywhere in a binding, not only immediately after {{.
 * Not a JS evaluator. Quoted strings/comments are ignored; computed names are left unverified.
 */
export function bindingReferences(value: unknown): Array<{ namespace: 'components' | 'queries'; name: string }> {
  if (Array.isArray(value)) return value.flatMap(bindingReferences);
  if (value && typeof value === 'object') return Object.values(value).flatMap(bindingReferences);
  if (typeof value !== 'string') return [];
  const refs: Array<{ namespace: 'components' | 'queries'; name: string }> = [];
  for (const binding of value.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
    // Consume quoted strings first so examples such as 'components.foo' are not dependencies.
    const tokens = /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|\/\*[\s\S]*?\*\/|\/\/[^\n]*|(?<![\w$.])(components|queries)\s*(?:\?\.)?\s*(?:\.\s*([A-Za-z_$][\w$]*)|\[\s*(['"])([^'"\n]+)\3\s*\])|(?<![\w$.])(components|queries)\?\.\s*([A-Za-z_$][\w$]*)/g;
    for (const match of binding[1].matchAll(tokens)) {
      const namespace = match[1] || match[5];
      const name = match[2] || match[4] || match[6];
      if (namespace && name) refs.push({ namespace: namespace as 'components' | 'queries', name });
    }
  }
  return refs;
}
