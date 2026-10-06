/**
 * The query panel's four toggles. ToolJet stores them as booleans and tests them for truthiness without evaluating
 * them (dataQuerySlice runOnLoadQueries), so any text, including "{{false}}", turns the toggle on: a write query
 * saved with runOnPageLoad "{{false}}" runs every time the app opens.
 *
 * These rules do not depend on the datasource kind, so they hold on routes that cannot resolve one
 * (update_query with only query_id + version_id).
 */
export const QUERY_TOGGLES = ['runOnPageLoad', 'runOnDependencyChange', 'requestConfirmation', 'showSuccessNotification'] as const;

const STATIC_TOGGLE = /^\s*(?:\{\{\s*(true|false)\s*\}\}|(true|false))\s*$/;

export interface QueryToggleIssue { code: 'query_toggle_not_boolean'; path: string; message: string }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** "true" / "false" / "{{true}}" / "{{false}}" (whitespace-tolerant) as a boolean; anything else undefined. */
export function staticToggle(value: unknown): boolean | undefined {
  if (typeof value !== 'string') return undefined;
  const match = STATIC_TOGGLE.exec(value);
  return match ? (match[1] ?? match[2]) === 'true' : undefined;
}

/** Rewrite the static string forms to booleans. Returns the same object when nothing changed. */
export function normalizeQueryToggles<T extends Record<string, unknown>>(options: T): T {
  if (!isPlainObject(options)) return options;
  let out = options;
  for (const key of QUERY_TOGGLES) {
    const value = staticToggle(options[key]);
    if (value === undefined) continue;
    if (out === options) out = { ...options };
    (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  if (typeof value === 'object') return 'an object';
  if (typeof value === 'string') return JSON.stringify(value);
  return `${typeof value} ${String(value)}`;
}

/** After normalization a toggle must be a boolean or absent. Everything else is refused before a write. */
export function queryToggleIssues(options: unknown): QueryToggleIssue[] {
  if (!isPlainObject(options)) return [];
  const issues: QueryToggleIssue[] = [];
  for (const key of QUERY_TOGGLES) {
    if (!(key in options)) continue;
    const value = options[key];
    if (value === undefined || typeof value === 'boolean' || staticToggle(value) !== undefined) continue;
    const dynamic = typeof value === 'string'
      ? ' ToolJet does not evaluate it and treats any text as on. Run the query from an event instead when it depends on state.'
      : '';
    issues.push({
      code: 'query_toggle_not_boolean',
      path: key,
      message: `${key} must be true or false (or left out), not ${describe(value)}.${dynamic}`,
    });
  }
  return issues;
}

/** One warning line for toggles that normalization rewrote, or undefined. */
export function toggleRewriteWarning(before: Record<string, unknown>, after: Record<string, unknown>): string | undefined {
  const changed = QUERY_TOGGLES.filter((key) => before?.[key] !== after?.[key]);
  if (!changed.length) return undefined;
  return `${changed.map((key) => `${key} ${JSON.stringify(before[key])} saved as ${String(after[key])}`).join(', ')}; ` +
    'ToolJet reads these as true/false and runs any text on load.';
}

/** Last-line check for the persistence client: throws when a toggle about to be sent is not a boolean. */
export function assertPersistableQueryToggles(options: unknown, subject: string): void {
  const issues = queryToggleIssues(options);
  const strings = isPlainObject(options) ? QUERY_TOGGLES.filter((key) => typeof options[key] === 'string') : [];
  const messages = [
    ...issues.map((issue) => issue.message),
    ...strings.filter((key) => !issues.some((issue) => issue.path === key))
      .map((key) => `${key} must be sent as a boolean, not ${JSON.stringify((options as Record<string, unknown>)[key])}.`),
  ];
  if (messages.length) throw new Error(`${subject}: ${messages.join(' ')}`);
}
