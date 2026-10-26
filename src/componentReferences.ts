/** Planned components have one logical identity: an explicit client ref, otherwise their name.
 * Runtime bindings still use component names; an explicit ref does not create a second logical alias.
 */
export function componentRef(component: { clientRef?: string; name: string }): string {
  return component.clientRef ?? component.name;
}

interface ReferencedComponent {
  name: string;
  clientRef?: string;
  parentRef?: string;
  parent?: string;
}

/** Shared by plan lint, batch preparation and the writer, before any mutation.
 * A phase can also name an existing parent on its page. Resolve that ref to a persisted id before
 * handing the batch to the writer, whose parentRef namespace contains only the new components.
 */
export function indexComponentReferences<T extends ReferencedComponent>(
  components: T[],
  existing: Array<{ id: string; name?: string }> = [],
): {
  refs: Map<string, T>;
  components: T[];
  errors: string[];
} {
  const refs = new Map<string, T>();
  const errors: string[] = [];
  const names = new Set<string>();
  const persisted = new Map<string, Set<string>>();
  for (const component of existing) {
    for (const ref of new Set([component.id, component.name].filter((key): key is string => Boolean(key)))) {
      const ids = persisted.get(ref) ?? new Set<string>();
      ids.add(component.id);
      persisted.set(ref, ids);
    }
  }
  for (const component of components) {
    const ref = componentRef(component);
    if (!ref.trim()) errors.push(`Component "${component.name}": client_ref must not be empty.`);
    if (refs.has(ref) || persisted.has(ref)) errors.push(`Duplicate component client_ref/name "${ref}".`);
    else refs.set(ref, component);
    if (names.has(component.name)) errors.push(`Duplicate component name "${component.name}" in batch.`);
    names.add(component.name);
  }
  const resolved = components.map((component) => {
    if (component.parentRef !== undefined && component.parent !== undefined) {
      errors.push(`Component "${component.name}": set EITHER parent or parent_ref, not both.`);
    }
    if (component.parentRef !== undefined && !refs.has(component.parentRef)) {
      const ids = persisted.get(component.parentRef);
      if (ids?.size === 1 && component.parent === undefined) {
        return { ...component, parentRef: undefined, parent: [...ids][0]! };
      }
      errors.push(`Component "${component.name}": unknown parent_ref "${component.parentRef}". ` +
        'Use a same-batch client_ref (or name when no client_ref is set), or an unambiguous existing parent on this page.');
    }
    return component;
  });
  return { refs, components: resolved, errors };
}
