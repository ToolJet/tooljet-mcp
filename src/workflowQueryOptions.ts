import type { QueryValidationIssue } from './queryValidation.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Workflow selectors are literal IDs, not app bindings or Select option objects. */
export function workflowQueryIssues(options: Record<string, unknown>): QueryValidationIssue[] {
  const errors: QueryValidationIssue[] = [];
  for (const [alias, field] of Object.entries({ workflow_id: 'workflowId', workflow_version_id: 'workflowVersionId', sync_execution: 'syncExecution' })) {
    if (alias in options) errors.push({ code: 'invalid_workflow_option', path: alias,
      message: `Workflow queries use options.${field}, not ${alias}. Keep the complete options object when updating a query.` });
  }
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
  const saved = actual as Record<string, unknown>;
  return saved.workflowId === expected.workflowId &&
    (saved.workflowVersionId ?? null) === (expected.workflowVersionId ?? null);
}
