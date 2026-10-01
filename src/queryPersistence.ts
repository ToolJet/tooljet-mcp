import { issueMessages, normalizeQueryOptions, validateQueryOptions, type QueryValidationResult } from './queryValidation.js';
import { normalizeQueryToggles, queryToggleIssues, toggleRewriteWarning } from './queryToggles.js';

export interface PreparedQueryOptions {
  /** The options to hand to the persistence client (or to keep in a plan). */
  options: Record<string, unknown>;
  /** Blocking problems; a route must not write when this is non-empty. */
  errors: string[];
  warnings: string[];
  /** Contract validation, present only when the datasource kind is known. */
  validation?: QueryValidationResult;
}

/**
 * The one preparation step every route that writes query options goes through (add_query, add_queries,
 * update_query, lint_app_spec plans, apply_app_phase). Kind-independent rules run first, so a route that cannot
 * resolve the datasource kind still gets them:
 *  - the four query toggles: static "true"/"false"/"{{true}}"/"{{false}}" become booleans; any other supplied value
 *    (an expression, array, object, number, null) is refused.
 * With a kind, the options are then normalized for that kind (write column maps, MongoDB documents) and contract-validated.
 */
export function prepareQueryOptionsForWrite(
  kind: string | undefined,
  raw: Record<string, unknown>,
  subject?: string
): PreparedQueryOptions {
  const prefix = subject ? `${subject}: ` : '';
  const line = (text: string) => subject ? `${prefix}${text}` : text.charAt(0).toUpperCase() + text.slice(1);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { options: raw, errors: [line('options must be an object.')], warnings: [] };
  }
  const toggled = normalizeQueryToggles(raw);
  const warnings: string[] = [];
  const rewrite = toggleRewriteWarning(raw, toggled);
  if (rewrite) warnings.push(`${prefix}${rewrite}`);
  if (!kind) {
    return { options: toggled, errors: issueMessages(queryToggleIssues(toggled), subject), warnings };
  }
  const options = normalizeQueryOptions(kind, toggled);
  if (options !== toggled) {
    warnings.push(line(kind === 'mongodb'
      ? 'serialized MongoDB document fields to the JSON text expected by the plugin.'
      : `rewrote the ${String(options.operation)} column map to ToolJet's {index: {column, value}} shape; ` +
        'the flat {column: value} form sends an empty body and fails at runtime.'));
  }
  // validateQueryOptions includes the toggle issues, so they are not added twice.
  const validation = validateQueryOptions(kind, options);
  warnings.push(...issueMessages(validation.warnings, subject));
  return { options, errors: issueMessages(validation.errors, subject), warnings, validation };
}
