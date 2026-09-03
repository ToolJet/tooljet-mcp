export interface StaticBooleanBinding {
  value: string;
  fxActive: false;
}

/** ToolJet's canonical representation for a static value in a Boolean bindable field. */
export function staticBooleanBinding(value: boolean): StaticBooleanBinding {
  return { value: `{{${value}}}`, fxActive: false };
}

/** Read the static forms ToolJet or an older client may have persisted. */
export function booleanBindingValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const match = /^\{\{\s*(true|false)\s*\}\}$/.exec(value);
  return match ? match[1] === 'true' : undefined;
}

export function isCanonicalStaticBooleanBinding(value: unknown, expected: boolean): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const binding = value as Record<string, unknown>;
  return binding.value === `{{${expected}}}` && binding.fxActive === false;
}
