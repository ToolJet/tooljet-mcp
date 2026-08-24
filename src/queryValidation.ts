import {
  COMMON_QUERY_OPTION_FIELDS,
  getDatasourceQuerySchema,
  type DatasourceOperationContract,
  type DatasourceContractVariant,
  type DatasourceFieldContract,
} from './datasourceCatalog.js';
import { LARGE_READ_ROW_THRESHOLD, assessQueryRead } from './queryExecutionSafety.js';

export interface QueryValidationIssue {
  code: string;
  path?: string;
  message: string;
}

export interface QueryValidationResult {
  kind: string;
  operation?: string;
  schemaFound: boolean;
  errors: QueryValidationIssue[];
  warnings: QueryValidationIssue[];
}

const KNOWN_IGNORED_KEYS: Record<string, string> = {
  run_on_page_load: 'runOnPageLoad',
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isTruthyStatic(value: unknown): boolean {
  return value === true || value === 'true' || value === '{{true}}';
}

function isDynamicBinding(value: unknown): value is string {
  return typeof value === 'string' && value.includes('{{');
}

function valueAtPath(source: Record<string, unknown>, path: string): unknown {
  let cursor: unknown = source;
  for (const segment of path.split('.')) {
    if (!isObject(cursor) || !Object.prototype.hasOwnProperty.call(cursor, segment)) return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

function operationFromOptions(
  options: Record<string, unknown>,
  contracts: Record<string, DatasourceOperationContract>,
  defaults: Record<string, unknown>
): string | undefined {
  const operation = options.operation ?? defaults.operation;
  if (typeof operation === 'string' && operation) return operation;
  const mode = options.mode ?? defaults.mode;
  if (typeof mode === 'string' && mode && Object.prototype.hasOwnProperty.call(contracts, mode)) return mode;
  if (Object.prototype.hasOwnProperty.call(contracts, 'default')) return 'default';

  // Some ToolJet wrappers select their contract through a plugin-native field rather than
  // `operation` or `mode` (REST uses `method`). Resolve a contract only when its declared
  // selectors produce one unambiguous static match; dynamic selectors remain fail-closed.
  const selectorMatches = Object.entries(contracts).filter(([, contract]) =>
    contract.variants.some((variant) => {
      const selectors = Object.entries(variant.when);
      return selectors.length > 0 && selectors.every(([selector, accepted]) => {
        const actual = options[selector] ?? defaults[selector];
        return typeof actual === 'string' && !isDynamicBinding(actual) && accepted.includes(actual);
      });
    })
  );
  if (selectorMatches.length === 1) return selectorMatches[0]![0];
  return undefined;
}

function variantMatches(variant: DatasourceContractVariant, options: Record<string, unknown>): boolean {
  return Object.entries(variant.when).every(([selector, accepted]) => {
    const actual = options[selector];
    return actual === undefined || isDynamicBinding(actual) ||
      (typeof actual === 'string' && accepted.includes(actual));
  });
}

function intersection(values: string[][]): string[] {
  if (!values.length) return [];
  return values[0]!.filter((value) => values.every((items) => items.includes(value)));
}

function fieldMap(variants: DatasourceContractVariant[]): Record<string, DatasourceFieldContract> {
  const fields: Record<string, DatasourceFieldContract> = { ...COMMON_QUERY_OPTION_FIELDS };
  for (const variant of variants) Object.assign(fields, variant.fields);
  return fields;
}

function topLevelKeys(fields: Record<string, DatasourceFieldContract>): Set<string> {
  return new Set(Object.keys(fields).map((path) => path.split('.')[0]!));
}

function nestedChildren(fields: Record<string, DatasourceFieldContract>, root: string): Set<string> {
  return new Set(
    Object.keys(fields)
      .filter((path) => path.startsWith(`${root}.`))
      .map((path) => path.slice(root.length + 1).split('.')[0]!)
  );
}

function suffixSuggestion(key: string, fields: Record<string, DatasourceFieldContract>): string | undefined {
  const matches = Object.keys(fields).filter((path) => path.endsWith(`.${key}`));
  return matches.length === 1 ? matches[0] : undefined;
}

function tupleArity(field: DatasourceFieldContract): number | undefined {
  const tuple = field.shape?.['<index>'];
  return Array.isArray(tuple) && tuple.length > 0 ? tuple.length : undefined;
}

function bindingStrings(value: unknown, path = ''): Array<{ path?: string; value: string }> {
  if (typeof value === 'string') return [{ path: path || undefined, value }];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => bindingStrings(item, `${path}[${index}]`));
  }
  if (!isObject(value)) return [];
  return Object.entries(value).flatMap(([key, item]) => bindingStrings(item, path ? `${path}.${key}` : key));
}

/** Table state is not guaranteed to exist when a page-load query first evaluates. Catch the
 * common offset recipe that turns undefined into NaN before the Table has published pageIndex. */
function tableStateWarnings(options: Record<string, unknown>): QueryValidationIssue[] {
  const warnings: QueryValidationIssue[] = [];
  for (const binding of bindingStrings(options)) {
    const match = binding.value.match(/components\.([A-Za-z_$][\w$]*)\.pageIndex\s*-\s*1/);
    if (!match) continue;
    warnings.push({
      code: 'unguarded_table_page_index',
      path: binding.path,
      message:
        `Table pageIndex may be undefined when the first page-load query evaluates; ` +
        `"${match[0]}" can produce NaN and an empty table. Use ` +
        `((components.${match[1]}.pageIndex || 1) - 1) * pageSize (or an equivalent nullish guard).`,
    });
  }
  return warnings;
}

export function validateQueryOptions(kind: string, options: Record<string, unknown>): QueryValidationResult {
  const errors: QueryValidationIssue[] = [];
  const warnings: QueryValidationIssue[] = tableStateWarnings(options);
  const readAssessment = assessQueryRead({ id: '<planned-query>', kind, options });
  if (readAssessment.selectStar) {
    warnings.push({
      code: 'select_star_read',
      path: typeof options.query === 'string' ? 'query' : undefined,
      message:
        'SELECT * will be refused by run_query. Inspect the table schema and select only the fields the app needs; ' +
        'this avoids unknown/wide columns and accidental sensitive-data reads.',
    });
  }
  if (readAssessment.provenRead && readAssessment.requiresCountPreflight) {
    warnings.push({
      code: 'unbounded_read',
      path: typeof options.query === 'string' ? 'query' : undefined,
      message:
        `${readAssessment.reason ?? 'This read is not statically bounded'} Count the same table before running it. ` +
        'Prefer a bounded preview and server-side pagination for large or growing datasets.',
    });
  }
  const automaticRead = isTruthyStatic(options.runOnPageLoad) || isTruthyStatic(options.runOnDependencyChange);
  if (automaticRead && readAssessment.provenRead && readAssessment.requiresCountPreflight) {
    errors.push({
      code: 'unsafe_automatic_unbounded_read',
      path: isTruthyStatic(options.runOnPageLoad) ? 'runOnPageLoad' : 'runOnDependencyChange',
      message:
        'An unbounded read cannot run automatically on page load or dependency change. Add a static row limit at or below ' +
        `${LARGE_READ_ROW_THRESHOLD} and use server-side pagination, or disable automatic execution and run it only after an explicit user decision.`,
    });
  }
  if (automaticRead && readAssessment.requiresBillableReadConfirmation) {
    errors.push({
      code: 'unsafe_automatic_billable_read',
      path: isTruthyStatic(options.runOnPageLoad) ? 'runOnPageLoad' : 'runOnDependencyChange',
      message:
        'A potentially billable warehouse read cannot run automatically. Trigger it through an explicit user action, ' +
        'and use run_query user_confirmed_billable_read:true only after the user approves any MCP-side verification run.',
    });
  }
  const schema = getDatasourceQuerySchema(kind);
  if (!schema) {
    warnings.push({
      code: 'schema_unavailable',
      message: `No generated query contract is available for datasource kind "${kind}"; options were not validated.`,
    });
    return { kind, schemaFound: false, errors, warnings };
  }

  const operation = operationFromOptions(options, schema.contracts, schema.defaults);
  if (!operation) {
    errors.push({
      code: 'missing_operation',
      path: schema.contracts.sql ? 'mode' : 'operation',
      message: `Datasource "${kind}" needs an operation/mode. Valid operations: ${schema.operations.join(', ') || 'default'}.`,
    });
    return { kind, schemaFound: true, errors, warnings };
  }

  const contract = schema.contracts[operation];
  if (!contract) {
    errors.push({
      code: 'invalid_operation',
      path: typeof options.operation === 'string' ? 'operation' : 'mode',
      message: `Unknown operation/mode "${operation}" for datasource "${kind}". Valid operations: ${schema.operations.join(', ')}.`,
    });
    return { kind, operation, schemaFound: true, errors, warnings };
  }

  const matching = contract.variants.filter((variant) => variantMatches(variant, options));
  if (!matching.length) {
    const selectors = new Map<string, Set<string>>();
    for (const variant of contract.variants) {
      for (const [selector, accepted] of Object.entries(variant.when)) {
        const values = selectors.get(selector) ?? new Set<string>();
        accepted.forEach((value) => values.add(value));
        selectors.set(selector, values);
      }
    }
    for (const [selector, accepted] of selectors) {
      const actual = options[selector];
      if (typeof actual === 'string' && !accepted.has(actual)) {
        errors.push({
          code: 'invalid_selector_value',
          path: selector,
          message: `Invalid ${selector} "${actual}" for ${kind}/${operation}. Allowed values: ${[...accepted].sort().join(', ')}.`,
        });
      }
    }
    return { kind, operation, schemaFound: true, errors, warnings };
  }

  const dynamicSelectors = [...new Set(
    contract.variants.flatMap((variant) => Object.keys(variant.when))
      .filter((selector) => isDynamicBinding(options[selector]))
  )];
  for (const selector of dynamicSelectors) {
    warnings.push({
      code: 'runtime_selector_binding',
      path: selector,
      message:
        `Selector "${selector}" is a dynamic binding, so MCP validated the fields shared by every possible ` +
        `${kind}/${operation} variant. Browser-verify any fields required only by the runtime-selected value.`,
    });
  }

  const fields = fieldMap(matching);
  const allowedTopLevel = topLevelKeys(fields);
  for (const key of Object.keys(options)) {
    if (allowedTopLevel.has(key)) continue;
    const exactReplacement = KNOWN_IGNORED_KEYS[key];
    const nestedReplacement = suffixSuggestion(key, fields);
    const replacement = exactReplacement ?? nestedReplacement;
    warnings.push({
      code: replacement ? 'ignored_or_misplaced_option_key' : 'unknown_option_key',
      path: key,
      message: replacement
        ? `Option key "${key}" is not read at this location for ${kind}/${operation}; use "${replacement}".`
        : `Unknown option key "${key}" for ${kind}/${operation}; ToolJet plugins may silently drop it.`,
    });
  }

  for (const root of allowedTopLevel) {
    const children = nestedChildren(fields, root);
    const actual = options[root];
    if (!children.size || !isObject(actual)) continue;
    for (const child of Object.keys(actual)) {
      if (!children.has(child)) {
        warnings.push({
          code: 'unknown_nested_option_key',
          path: `${root}.${child}`,
          message: `Unknown nested option key "${root}.${child}" for ${kind}/${operation}; ToolJet may silently drop it.`,
        });
      }
    }
  }

  const required = intersection(matching.map((variant) => variant.required));
  for (const path of required) {
    const value = valueAtPath(options, path);
    if (value === undefined || value === null || value === '') {
      errors.push({
        code: 'missing_required_option',
        path,
        message: `Missing required option "${path}" for ${kind}/${operation}.`,
      });
    }
  }

  for (const [path, field] of Object.entries(fields)) {
    const value = valueAtPath(options, path);
    const arity = tupleArity(field);
    if (arity !== undefined && value !== undefined && !isDynamicBinding(value)) {
      if (!Array.isArray(value)) {
        errors.push({
          code: 'invalid_option_shape',
          path,
          message: `Option "${path}" for ${kind}/${operation} must be an array of ${arity}-item tuples.`,
        });
      } else {
        const invalidIndex = value.findIndex((item) => !Array.isArray(item) || item.length !== arity);
        if (invalidIndex >= 0) {
          errors.push({
            code: 'invalid_option_shape',
            path: `${path}[${invalidIndex}]`,
            message: `Option "${path}" for ${kind}/${operation} must contain ${arity}-item tuples such as [["key", "value"]].`,
          });
        }
      }
    }
    if (!field.allowedValues?.length) continue;
    if (
      typeof value === 'string' &&
      !value.includes('{{') &&
      !field.allowedValues.includes(value)
    ) {
      errors.push({
        code: 'invalid_option_value',
        path,
        message: `Invalid value "${value}" for ${kind}/${operation} option "${path}". Allowed values: ${field.allowedValues.join(', ')}.`,
      });
    }
  }

  if (kind === 'tooljetdb' && (operation === 'create_row' || operation === 'update_rows')) {
    // ToolJet reduces these column maps with `Object.values(cols).reduce((acc, c) => ... c.column ...)`
    // (tooljet-db-data-operations.service.ts createRow/updateRows), so every VALUE must be a
    // {column, value} record. A flat {columnName: value} map looks correct and passes every other
    // check, but reduces to an EMPTY body — PostgREST then rejects it with PGRST102
    // "Empty or invalid json" and the write silently fails at runtime, only when a user clicks.
    // This is an error, not a warning: the query is guaranteed to be broken as authored.
    const columnsPath = operation === 'create_row' ? 'create_row' : 'update_rows.columns';
    const columns = valueAtPath(options, columnsPath);
    if (isObject(columns) && Object.keys(columns).length > 0) {
      const flat = Object.entries(columns).filter(
        ([, clause]) => !isObject(clause) || typeof clause.column !== 'string' || clause.column === ''
      );
      if (flat.length > 0) {
        const example = flat[0][0];
        errors.push({
          code: 'malformed_write_columns',
          path: `${columnsPath}.${example}`,
          message:
            `ToolJet DB ${operation} "${columnsPath}" must map each entry to a {column, value} record, not a ` +
            `flat {"${example}": <value>} pair. ToolJet reads .column off each entry, so as authored this write ` +
            `sends an empty body and fails at runtime with PGRST102 ("Empty or invalid json") even though the ` +
            `app validates. Use {"0": {"column": "${example}", "value": <value>}, …}.`,
        });
      }
    }
  }

  if (kind === 'tooljetdb' && operation === 'list_rows') {
    const orderFilters = valueAtPath(options, 'list_rows.order_filters');
    if (isObject(orderFilters)) {
      for (const [mapKey, rawClause] of Object.entries(orderFilters)) {
        if (!isObject(rawClause) || typeof rawClause.id !== 'string' || rawClause.id === mapKey) continue;
        warnings.push({
          code: 'mismatched_record_id',
          path: `list_rows.order_filters.${mapKey}.id`,
          message:
            `ToolJet DB order_filters key "${mapKey}" does not match its inner id "${rawClause.id}"; ` +
            'ToolJet can silently ignore the sort. Use the same stable value for the outer key and inner id.',
        });
      }
    }
  }

  return { kind, operation, schemaFound: true, errors, warnings };
}

export function issueMessages(issues: QueryValidationIssue[], prefix?: string): string[] {
  return issues.map((issue) => `${prefix ? `${prefix}: ` : ''}${issue.message}`);
}

/** Rewrite a flat {columnName: value} write map into the {index: {column, value}} shape ToolJet
 * actually reads (see the malformed_write_columns check above). Models author the flat shape often
 * enough — across providers — that failing the build on it wastes a turn when the intent is
 * unambiguous; normalizing here fixes it at authoring time and the validation above stays as the
 * backstop for anything that reaches the spec another way. Entries already in {column, value} form
 * are passed through untouched, so a partially-correct map is preserved. */
function normalizeWriteColumnMap(columns: unknown): Record<string, unknown> | null {
  if (!isObject(columns) || Object.keys(columns).length === 0) return null;
  const entries = Object.entries(columns);
  if (entries.every(([, clause]) => isObject(clause) && typeof clause.column === 'string' && clause.column !== '')) {
    return null; // already correct — do not rewrite keys
  }
  const normalized: Record<string, unknown> = {};
  entries.forEach(([key, clause], index) => {
    if (isObject(clause) && typeof clause.column === 'string' && clause.column !== '') {
      normalized[String(index)] = clause;
      return;
    }
    normalized[String(index)] = { column: key, value: clause };
  });
  return normalized;
}

/** Normalize a tooljetdb create_row / update_rows column map in place-ish (returns a new options
 * object when something changed, else the original). Call this on every authoring path so a
 * persisted query is never the silently-broken flat shape. */
export function normalizeQueryOptions(kind: string, options: Record<string, unknown>): Record<string, unknown> {
  if (kind !== 'tooljetdb' || !isObject(options)) return options;
  const operation = typeof options.operation === 'string' ? options.operation : '';

  if (operation === 'create_row') {
    const normalized = normalizeWriteColumnMap(options.create_row);
    return normalized ? { ...options, create_row: normalized } : options;
  }

  if (operation === 'update_rows') {
    const updateRows = options.update_rows;
    if (!isObject(updateRows)) return options;
    const normalized = normalizeWriteColumnMap(updateRows.columns);
    return normalized ? { ...options, update_rows: { ...updateRows, columns: normalized } } : options;
  }

  return options;
}
