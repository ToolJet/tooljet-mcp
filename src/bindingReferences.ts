import { namespaceReads } from './runjsReferences.js';

/** Read literal namespace references anywhere in a binding, not only immediately after {{.
 * Not a JS evaluator. Quoted strings/comments are ignored; computed names are left unverified.
 */
export function bindingReferences(value: unknown): Array<{ namespace: 'components' | 'queries'; name: string }> {
  if (Array.isArray(value)) return value.flatMap(bindingReferences);
  if (value && typeof value === 'object') return Object.values(value).flatMap(bindingReferences);
  if (typeof value !== 'string') return [];
  const refs: Array<{ namespace: 'components' | 'queries'; name: string }> = [];
  for (const binding of value.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
    const reads = (['components', 'queries'] as const).flatMap(namespace =>
      namespaceReads(`(${binding[1]})`, namespace).map(read => ({ ...read, namespace })));
    refs.push(...reads.sort((a, b) => a.start - b.start).map(({ namespace, name }) => ({ namespace, name })));
  }
  return refs;
}
