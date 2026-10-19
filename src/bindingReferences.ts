import { dynamicNamespaceReads, namespaceReads } from './runjsReferences.js';
import { bindingSpans } from './bindingSpans.js';

/** Read literal namespace references anywhere in a binding, not only immediately after {{.
 * Not a JS evaluator. Quoted strings/comments are ignored; computed names are left unverified.
 */
export function bindingReferences(value: unknown): Array<{ namespace: 'components' | 'queries'; name: string }> {
  if (Array.isArray(value)) return value.flatMap(bindingReferences);
  if (value && typeof value === 'object') return Object.values(value).flatMap(bindingReferences);
  if (typeof value !== 'string') return [];
  const refs: Array<{ namespace: 'components' | 'queries'; name: string }> = [];
  for (const binding of bindingSpans(value)) {
    const reads = (['components', 'queries'] as const).flatMap(namespace =>
      namespaceReads(`(${binding.body})`, namespace).map(read => ({ ...read, namespace })));
    refs.push(...reads.sort((a, b) => a.start - b.start).map(({ namespace, name }) => ({ namespace, name })));
  }
  return refs;
}

/** The namespaces a binding reads by a name it builds at runtime (components["a" + b]): ToolJet resolves only literal
 *  names inside {{ }}, so the read is always empty. */
export function dynamicBindingNamespaces(value: unknown): Array<'components' | 'queries'> {
  if (Array.isArray(value)) return [...new Set(value.flatMap(dynamicBindingNamespaces))];
  if (value && typeof value === 'object') return [...new Set(Object.values(value).flatMap(dynamicBindingNamespaces))];
  if (typeof value !== 'string') return [];
  return (['components', 'queries'] as const).filter(namespace =>
    bindingSpans(value).some(binding => dynamicNamespaceReads(`(${binding.body})`, namespace) > 0));
}
