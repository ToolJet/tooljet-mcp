import {
  COMMON_QUERY_OPTION_FIELDS,
  getDatasourceQuerySchema,
  type DatasourceContractVariant,
  type DatasourceFieldContract,
} from './datasourceCatalog.js';

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
  contracts: Record<string, unknown>,
  defaults: Record<string, unknown>
): string | undefined {
  const operation = options.operation ?? defaults.operation;
  if (typeof operation === 'string' && operation) return operation;
  const mode = options.mode ?? defaults.mode;
  if (typeof mode === 'string' && mode && Object.prototype.hasOwnProperty.call(contracts, mode)) return mode;
  if (Object.prototype.hasOwnProperty.call(contracts, 'default')) return 'default';
  return undefined;
}

function variantMatches(variant: DatasourceContractVariant, options: Record<string, unknown>): boolean {
  return Object.entries(variant.when).every(([selector, accepted]) => {
    const actual = options[selector];
    return actual === undefined || (typeof actual === 'string' && accepted.includes(actual));
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
    if (!field.allowedValues?.length) continue;
    const value = valueAtPath(options, path);
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
