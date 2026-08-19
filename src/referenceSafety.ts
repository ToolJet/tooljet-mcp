function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function containsExactValue(value: unknown, expected: string): boolean {
  if (value === expected) return true;
  if (Array.isArray(value)) return value.some((entry) => containsExactValue(entry, expected));
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((entry) => containsExactValue(entry, expected));
  }
  return false;
}

export function containsNamedBinding(value: unknown, namespace: 'components' | 'queries', name: string): boolean {
  if (typeof value === 'string') {
    return new RegExp(`\\b${namespace}\\s*\\.\\s*${escapeRegExp(name)}(?:\\b|\\s*\\[)`).test(value);
  }
  if (Array.isArray(value)) return value.some((entry) => containsNamedBinding(entry, namespace, name));
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .some((entry) => containsNamedBinding(entry, namespace, name));
  }
  return false;
}
