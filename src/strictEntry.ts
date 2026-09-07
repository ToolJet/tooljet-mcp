import { z } from 'zod';

/**
 * A batch-entry schema that REJECTS unknown keys with an actionable message.
 *
 * Plain z.object() silently strips keys it does not know. For an update entry that is the worst
 * possible behaviour: `{ component_id, properties: {...} }` (patch at the top level instead of under
 * `definition`) parses to `{ component_id }`, the write becomes an empty diff, ToolJet answers 200,
 * and the tool reports "updated". Observed live on 2026-09-05: five such calls in a row, nothing
 * persisted, no signal. Rejecting the key names the fix in the same turn instead.
 *
 * `describeUnknown` turns the offending key into the message the model reads.
 */
export function strictEntry<T extends z.ZodRawShape>(
  shape: T,
  describeUnknown: (key: string) => string
) {
  return z.strictObject(shape, {
    error: (issue) =>
      issue.code === 'unrecognized_keys'
        ? (issue.keys as string[]).map(describeUnknown).join(' ')
        : undefined,
  });
}

/** True when `definition` carries at least one section with at least one leaf to write. */
export function hasNonEmptyDefinition(definition: Record<string, unknown> | undefined): boolean {
  if (!definition) return false;
  return Object.values(definition).some(
    (section) => section !== null && typeof section === 'object' && Object.keys(section as object).length > 0
  );
}
