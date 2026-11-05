import type { QueryValidationIssue } from './queryValidation.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALIASES = { workflow_id: 'workflowId', workflow_version_id: 'workflowVersionId' } as const;

export function normalizeWorkflowQueryOptions(options: Record<string, unknown>): Record<string, unknown> {
  let normalized = options;
  for (const [alias, field] of Object.entries(ALIASES)) {
    if (!(alias in options)) continue;
    // Preserve conflicting selectors so validation rejects them instead of choosing a target.
    if (options[field] !== undefined && options[field] !== options[alias]) continue;
    if (normalized === options) normalized = { ...options };
    if (normalized[field] === undefined) normalized[field] = normalized[alias];
    delete normalized[alias];
  }
  return normalized;
}

/** Workflow selectors are literal IDs, not app bindings or Select option objects. */
export function workflowQueryIssues(options: Record<string, unknown>): QueryValidationIssue[] {
  const errors: QueryValidationIssue[] = [];
  for (const [alias, field] of Object.entries(ALIASES)) {
    if (alias in options && options[field] !== undefined && options[field] !== options[alias]) errors.push({
      code: 'conflicting_workflow_target', path: alias, message: `Conflicting workflow selectors ${field} and ${alias}; specify one target.` });
  }
  if ('sync_execution' in options) errors.push({ code: 'invalid_workflow_option', path: 'sync_execution', message: 'Use the native syncExecution boolean, not sync_execution.' });
  options = normalizeWorkflowQueryOptions(options);
  for (const field of ['workflowId', 'workflowVersionId']) {
    const value = options[field];
    if (field === 'workflowVersionId' && (value === undefined || value === null)) continue;
    if (typeof value !== 'string' || !UUID.test(value)) errors.push({ code: 'invalid_workflow_target', path: field,
      message: `Workflow query options.${field} must be a literal workflow ${field === 'workflowId' ? 'ID from list_workflows/get_workflow' : 'version ID from list_app_versions/get_workflow'}. ` +
        'A query and its success/failure handlers do not establish the workflow mapping.' });
  }
  if (options.syncExecution !== undefined && typeof options.syncExecution !== 'boolean') {
    errors.push({ code: 'invalid_workflow_option', path: 'syncExecution', message: 'Workflow query syncExecution must be a boolean.' });
  }
  if (options.params !== undefined && (!Array.isArray(options.params) || options.params.some(param =>
    !param || typeof param !== 'object' || Array.isArray(param) || typeof param.key !== 'string' || !Object.hasOwn(param, 'value')))) {
    errors.push({ code: 'invalid_workflow_option', path: 'params', message: 'Workflow query params must be an array of {key, value} entries; values may contain app bindings.' });
  }
  return errors;
}

export function assertWorkflowQueryOptions(options: Record<string, unknown>): void {
  const errors = workflowQueryIssues(options);
  if (errors.length) throw new Error(errors.map(error => error.message).join(' '));
}

export function workflowMappingMatches(expected: Record<string, unknown>, actual: unknown): boolean {
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false;
  const saved = normalizeWorkflowQueryOptions(actual as Record<string, unknown>);
  return saved.workflowId === expected.workflowId &&
    (saved.workflowVersionId ?? null) === (expected.workflowVersionId ?? null);
}
