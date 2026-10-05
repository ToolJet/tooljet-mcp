import { z } from 'zod';

// Match App Builder's validateQueryName character set plus the Inspector's non-empty check.
// Names are also interpolated into CSS classes, so whitespace must never reach persistence.
const COMPONENT_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;
const COMPONENT_NAME_RULE = 'Component names must be non-empty and contain only ASCII letters, numbers, underscores, or hyphens. Use camelCase for multi-word names; put display text in component properties.';

export const componentNameSchema = z.string()
  .regex(COMPONENT_NAME_PATTERN, COMPONENT_NAME_RULE)
  .describe(COMPONENT_NAME_RULE);

export function componentNameError(name: unknown): string | undefined {
  if (typeof name !== 'string' || !COMPONENT_NAME_PATTERN.test(name)) {
    return `Invalid component name ${JSON.stringify(name)}. ${COMPONENT_NAME_RULE}`;
  }
  return undefined;
}
