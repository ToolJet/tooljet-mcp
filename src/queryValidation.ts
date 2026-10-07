import { normalizeQueryToggles, queryToggleIssues, staticToggle } from './queryToggles.js';
import { parse as babelParse } from '@babel/parser';
import { hubspotQueryIssues } from './hubspotQuery.js';
import { SPEC_DISCOVERY_NOTE, apiEndpointQueryIssues, singleSpecRef } from './specEndpointKinds.js';
import {
  COMMON_QUERY_OPTION_FIELDS,
  getDatasourceQuerySchema,
  type DatasourceOperationContract,
  type DatasourceContractVariant,
  type DatasourceFieldContract,
  type DatasourceQuerySchema,
} from './datasourceCatalog.js';
import { LARGE_READ_ROW_THRESHOLD, assessQueryRead } from './queryExecutionSafety.js';
import { primitiveWriteBindingEntries } from './writeBindingShape.js';
import { conditionalWriteWarning } from './arithmeticWriteContract.js';
import { mongoArrayReplacementIssues } from './mongoWriteContract.js';

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
  return value === true || staticToggle(value) === true;
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

// An empty `operations` list is not "this kind has no operations" — see DatasourceOperationSelection.
// Saying so keeps a caller from concluding the datasource is unsupported and silently substituting
// another one.
function describeOperationSelection(schema: DatasourceQuerySchema): string {
  if (schema.kind === 'hubspot') return 'Use inspect_datasource_schema getEndpointSchema and copy query_options (operation, path, specType and params).';
  if (singleSpecRef(schema.kind)) return SPEC_DISCOVERY_NOTE;
  const selection = schema.operationSelection;
  if (schema.operations.length) {
    const fields = selection?.fields?.length ? selection.fields.join(' + ') : 'operation';
    return `Set ${fields}. Valid operations: ${schema.operations.join(', ')}.`;
  }
  if (selection?.mode === 'remote-spec') {
    return (
      `This kind takes its operation from the remote API spec${selection.specUrl ? ` (${selection.specUrl})` : ''}, ` +
      `not from a fixed list; set ${selection.field ?? 'the operation field'} to an operation id from that spec.`
    );
  }
  return 'This kind has a single unnamed query form; author it against the default contract.';
}

function operationFromOptions(
  options: Record<string, unknown>,
  contracts: Record<string, DatasourceOperationContract>,
  defaults: Record<string, unknown>
): string | undefined {
  const operation = options.operation ?? defaults.operation;
  if (typeof operation === 'string' && operation) {
    if (Object.prototype.hasOwnProperty.call(contracts, operation)) return operation;
    // A kind with a single `default` contract does not enumerate operations, and for some (openapi)
    // `operation` is not a plugin operation name at all — it is the HTTP method of the endpoint.
    // Its one contract covers every value, so resolve to it rather than reporting the value invalid.
    if (Object.prototype.hasOwnProperty.call(contracts, 'default')) return 'default';
    return operation;
  }
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

/** ToolJet splices `{{...}}` into SQL as RAW TEXT, not as a bound parameter. So a comparison written
 * as `col = {{components.filter.value}}` becomes `col = ` the moment that component is empty — a hard
 * SQL syntax error, not an empty result. Empty is the DEFAULT state of a filter on page load, so the
 * table renders "No data" and the page looks broken from the very first paint.
 *
 * Observed live: a generated analytics app wrote the plausible null-safe idiom
 *   WHERE (region = {{components.regionFilter.value}} OR {{!components.regionFilter.value}})
 * which the server executed as `WHERE (region =  OR true)` → `syntax error at or near`. Static
 * validation passed; only the user ever saw it.
 *
 * Quoting the binding ('{{...}}') makes the empty case `col = ''` — valid SQL that simply matches
 * nothing — so the surrounding OR-guard then works as intended. */
function unquotedSqlBindingIssues(sql: string): QueryValidationIssue[] {
  const issues: QueryValidationIssue[] = [];
  // A binding with no adjacent quote, either as the right-hand side of a comparison/LIKE or as a
  // function argument. The argument case is just as fatal — `CONCAT('%', {{search}}, '%')` becomes
  // `CONCAT('%', , '%')` when the component is empty — and it is what a search filter usually looks
  // like, so matching only comparison operators misses the most common form.
  const risky = /(=|<>|!=|>|<|>=|<=|\bLIKE\b|\bILIKE\b|,|\()\s*(?!')\{\{/gi;
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = risky.exec(sql)) !== null) {
    const raw = match[1].toUpperCase();
    const operator = raw === ',' || raw === '(' ? 'a function argument' : raw;
    if (seen.has(operator)) continue;
    seen.add(operator);
    issues.push({
      code: 'unquoted_sql_binding',
      path: 'query',
      message:
        `SQL uses an unquoted binding (as ${operator}). ToolJet splices bindings in as ` +
        'raw text, so when that component is empty — its state on page load — the statement becomes ' +
        `nothing at that position and fails with a SQL syntax error; the table then shows ` +
        '"No data" and the page looks broken on first open. Pass it as a parameter instead: put ' +
        '`:name` in the statement and the binding in query_params, e.g. `WHERE priority = :priority` ' +
        'with query_params [["priority", "{{components.priorityFilter.value}}"]]. That fixes the empty ' +
        'case and the escaping together. Quoting it (\'{{...}}\') only fixes the empty case and leaves ' +
        'the value spliced into the statement as text.',
    });
  }
  return issues;
}

/* A component value pasted into the statement inside quotes.

   Escaped only by the two quotes in the text, so a value containing a quote changes the statement.
   Measured against a real table: with `P1' OR '1'='1`, the spliced query returned all 15,000 rows
   with the filter bypassed, while the same query parameterised returned 0.

   A warning rather than an error: a dropdown with fixed options is safe in practice, and blocking
   every such query would stall builds over a risk that depends on what is bound. The danger is that
   the query stays exactly as written when someone later points it at a text input. */
function interpolatedSqlBindingIssues(sql: string): QueryValidationIssue[] {
  const quoted = /'\s*\{\{[^}]*\}\}\s*'/g;
  if (!quoted.test(sql)) return [];
  return [
    {
      code: 'interpolated_sql_binding',
      path: 'query',
      message:
        "SQL pastes a binding into the statement as quoted text ('{{...}}'). The quotes are the only " +
        'escaping, so a value containing a quote rewrites the statement. Pass it as a parameter ' +
        'instead: `:name` in the query and the binding in query_params, e.g. ' +
        '`WHERE priority = :priority` with query_params [["priority", "{{components.priorityFilter.value}}"]]. ' +
        'Safe today if the value comes from a fixed dropdown, but the query does not change when ' +
        'someone later binds it to a text input.',
    },
  ];
}

/** Parse JavaScript query code the way ToolJet runs it (an async function body). Returns the syntax
 *  error message, or undefined when it parses. A stray quote in a chart query (round eight, 2026-09-12)
 *  failed the query silently and left the chart it fed as empty axes. */
/** The names ToolJet passes a RunJS query as parameters (frontend queryPanelSlice runJS: fnParams); declaring one of
 *  them again at the top of the code is a SyntaxError when the query runs (ds-tower d1: `const actions`). */
const RUNJS_PARAMETERS = ['moment', '_', 'components', 'queries', 'globals', 'page', 'axios', 'variables', 'actions', 'constants'];

export function runjsSyntaxError(code: string): string | undefined {
  try {
    new Function(`return (async (${RUNJS_PARAMETERS.join(', ')}) => {\n${code}\n});`);
    return undefined;
  } catch (error) {
    if (!(error instanceof SyntaxError)) return undefined;
    const clash = error.message.match(/Identifier '([\w$]+)' has already been declared/)?.[1];
    if (clash && RUNJS_PARAMETERS.includes(clash)) {
      return `the code declares \`${clash}\`, a name ToolJet already gives every RunJS query (${RUNJS_PARAMETERS.join(', ')}), ` +
        `so the query fails with "Identifier '${clash}' has already been declared" when it runs. Rename it (${clash}List, say).`;
    }
    // Name the place: in a long query "Unexpected token ';'" alone sent the model rereading every line.
    try {
      babelParse(`async function f(){\n${code}\n}`, { sourceType: 'script' });
    } catch (located) {
      const loc = (located as { loc?: { line: number; column: number } }).loc;
      const line = loc ? code.split('\n')[loc.line - 2] : undefined;
      if (loc && line !== undefined) {
        const from = Math.max(0, loc.column - 60);
        const excerpt = line.slice(from, loc.column + 20).trim();
        return `${error.message}, at line ${loc.line - 1} column ${loc.column + 1}: ${from > 0 ? '…' : ''}${excerpt}`;
      }
    }
    return error.message;
  }
}

/** Names a RunJS query may use without declaring: what ToolJet passes it (RUNJS_PARAMETERS, plus `parameters` when
 *  the query has parameters and `input` in a module), JavaScript's own globals, and the browser's. A JavaScript
 *  library added to the workspace also arrives as a parameter; agent-built apps add none, so it is not listed. */
const RUNJS_KNOWN_NAMES = new Set([
  ...RUNJS_PARAMETERS, 'parameters', 'input', 'arguments', 'undefined', 'NaN', 'Infinity', 'globalThis',
  'eval', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent',
  'escape', 'unescape', 'Object', 'Function', 'Boolean', 'Symbol', 'Error', 'AggregateError', 'EvalError', 'RangeError',
  'ReferenceError', 'SyntaxError', 'TypeError', 'URIError', 'Number', 'BigInt', 'Math', 'Date', 'String', 'RegExp', 'Array',
  'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array', 'Float32Array',
  'Float64Array', 'BigInt64Array', 'BigUint64Array', 'Map', 'Set', 'WeakMap', 'WeakSet', 'WeakRef', 'FinalizationRegistry',
  'ArrayBuffer', 'SharedArrayBuffer', 'DataView', 'Atomics', 'JSON', 'Promise', 'Proxy', 'Reflect', 'Intl',
  'window', 'self', 'document', 'navigator', 'location', 'history', 'screen', 'localStorage', 'sessionStorage', 'console',
  'alert', 'confirm', 'prompt', 'fetch', 'Blob', 'File', 'FileReader', 'FormData', 'Headers', 'Request', 'Response', 'URL',
  'URLSearchParams', 'AbortController', 'atob', 'btoa', 'crypto', 'performance', 'structuredClone', 'queueMicrotask',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'TextEncoder', 'TextDecoder', 'DOMParser', 'XMLHttpRequest', 'WebSocket', 'Image', 'getComputedStyle', 'Event', 'CustomEvent',
]);

type AstNode = { type: string; [key: string]: unknown };
const isNode = (value: unknown): value is AstNode => !!value && typeof value === 'object' && typeof (value as AstNode).type === 'string';

/** Names a binding pattern declares: `a`, `{ a, b: c, ...d }`, `[e, = f]`. */
function patternNames(node: unknown, out: Set<string>): void {
  if (!isNode(node)) return;
  if (node.type === 'Identifier') out.add(String(node.name));
  else if (node.type === 'ObjectPattern') for (const p of node.properties as AstNode[]) patternNames(p.type === 'RestElement' ? p.argument : p.value, out);
  else if (node.type === 'ArrayPattern') for (const e of node.elements as unknown[]) patternNames(e, out);
  else if (node.type === 'RestElement') patternNames(node.argument, out);
  else if (node.type === 'AssignmentPattern') patternNames(node.left, out);
}

/** Identifiers a RunJS query reads but never declares, in first-use order. A name counts as declared only inside the
 *  function that declares it (its parameters, and its var/let/const/function/class declarations anywhere in its body,
 *  so hoisting and block scope are not checked). This reports only names that cannot exist where they are read: a
 *  ReferenceError the first time that line runs, which fails the query and empties what it feeds. Code that does not
 *  parse returns [] (the syntax check reports it). */
export function runjsUndeclaredNames(code: string): string[] {
  return undeclaredNames(`async function __runjs__(){\n${code}\n}`, RUNJS_KNOWN_NAMES);
}

/** Names a {{ }} binding reads but never declares. Bindings get ToolJet's state (components, queries, variables,
 *  globals, page, constants), moment and lodash, and the names some properties are evaluated with: a table column's
 *  rowData/cellValue/currentRow, a list view's listItem, a Kanban card's cardData. */
export function bindingUndeclaredNames(expression: string): string[] {
  // A reference ToolJet saved by id (components.d883eafc-af1c-...) is resolved before evaluation; leave those alone.
  if (/\b(components|queries)\.[0-9a-f]{8}-[0-9a-f]{4}-/i.test(expression)) return [];
  return undeclaredNames(`(function __binding__(){ return (\n${expression}\n); })`, BINDING_KNOWN_NAMES);
}

/** Errors for every {{ }} in `value` (any nesting) that reads an undeclared name. Over 149,513 bindings in a local
 *  workspace this flagged 15, all broken: a filter that lost its `r =>`, a query read without `queries.`, a cell
 *  style reading `row` instead of `rowData`. */
export function lintBindingNames(value: unknown, label: string, path = ''): string[] {
  if (Array.isArray(value)) return value.flatMap((child, i) => lintBindingNames(child, label, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => lintBindingNames(child, label, path ? `${path}.${key}` : key));
  }
  if (typeof value !== 'string' || !value.includes('{{')) return [];
  const names = [...new Set([...value.matchAll(/\{\{([\s\S]*?)\}\}/g)].flatMap((m) => bindingUndeclaredNames(m[1]!)))];
  if (!names.length) return [];
  const hints = names.map((n) => (/^[a-z_$][\w$]*$/i.test(n) && n.length > 2 && !['row', 'item', 'r', 'x', 'd', 'e'].includes(n)
    ? `\`${n}\` (a query is read as queries.${n})` : `\`${n}\``));
  return [`${label}${path ? ` ${path}` : ''}: the binding reads ${hints.join(', ')}, which nothing declares there, so it throws and ` +
    'the component shows nothing. Declare it (a callback needs its parameter: `rows.filter(r => r.status === "Open")`), or use ' +
    "ToolJet's names: components, queries, variables, globals, page, constants, and in a table column rowData/cellValue, in a " +
    'list view listItem, on a Kanban card cardData.'];
}

const BINDING_KNOWN_NAMES = new Set([
  ...RUNJS_KNOWN_NAMES, 'rowData', 'cellValue', 'currentRow', 'listItem', 'cardData', 'theme',
]);

const FUNCTION_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'ObjectMethod', 'ClassMethod', 'ClassPrivateMethod']);

function undeclaredNames(source: string, known: Set<string>): string[] {
  let ast: unknown;
  try {
    ast = babelParse(source, { sourceType: 'script', errorRecovery: false });
  } catch {
    return [];
  }
  /** Declarations that belong to this function body: not those inside nested functions (their own scope). */
  const declaredIn = (body: unknown, into: Set<string>): void => {
    const visit = (node: unknown): void => {
      if (Array.isArray(node)) { node.forEach(visit); return; }
      if (!isNode(node)) return;
      if (node.type === 'VariableDeclarator') patternNames(node.id, into);
      if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && isNode(node.id)) into.add(String(node.id.name));
      if (node.type === 'CatchClause') patternNames(node.param, into);
      if (FUNCTION_TYPES.has(node.type)) return;
      for (const [k, v] of Object.entries(node)) if (k !== 'loc' && k !== 'extra' && !k.endsWith('Comments')) visit(v);
    };
    visit(body);
  };
  const used: string[] = [];
  const scopes: Set<string>[] = [];
  const isDeclared = (name: string) => scopes.some((scope) => scope.has(name));
  const walk = (node: unknown, parent?: AstNode, key?: string): void => {
    if (Array.isArray(node)) { for (const child of node) walk(child, parent, key); return; }
    if (!isNode(node)) return;
    if (node.type === 'Identifier') {
      const p = parent?.type;
      const notARead =
        ((p === 'MemberExpression' || p === 'OptionalMemberExpression') && key === 'property' && !parent!.computed) ||
        ((p === 'ObjectProperty' || p === 'ObjectMethod' || p === 'ClassMethod' || p === 'ClassProperty' || p === 'ClassPrivateProperty') &&
          key === 'key' && !parent!.computed) ||
        ((p === 'LabeledStatement' || p === 'BreakStatement' || p === 'ContinueStatement') && key === 'label') ||
        (p === 'UnaryExpression' && parent!.operator === 'typeof') ||
        p === 'MetaProperty' ||
        // a declaration's own name, a parameter or a pattern binding is not a read
        (p === 'VariableDeclarator' && key === 'id') || (p !== undefined && FUNCTION_TYPES.has(p) && (key === 'id' || key === 'params')) ||
        ((p === 'ClassDeclaration' || p === 'ClassExpression') && key === 'id') || (p === 'CatchClause' && key === 'param');
      const name = String(node.name);
      if (!notARead && !isDeclared(name)) used.push(name);
      return;
    }
    if (node.type === 'Program' || FUNCTION_TYPES.has(node.type)) {
      const scope = new Set<string>();
      if (FUNCTION_TYPES.has(node.type)) {
        // A function expression's own name is visible inside it (a named recursive callback).
        if (node.type === 'FunctionExpression' && isNode(node.id)) scope.add(String(node.id.name));
        for (const param of (node.params as unknown[]) ?? []) patternNames(param, scope);
        declaredIn(node.body, scope);
      } else {
        declaredIn(node.body, scope);
      }
      scopes.push(scope);
      for (const [k, v] of Object.entries(node)) {
        if (k === 'loc' || k === 'extra' || k.endsWith('Comments')) continue;
        // Parameters: their default values are reads; the bound names themselves are not.
        if (k === 'params') { for (const param of v as unknown[]) walkPatternDefaults(param); continue; }
        walk(v, node, k);
      }
      scopes.pop();
      return;
    }
    if (node.type === 'VariableDeclarator') { walkPatternDefaults(node.id); walk(node.init, node, 'init'); return; }
    if (node.type === 'CatchClause') { walk(node.body, node, 'body'); return; }
    for (const [k, v] of Object.entries(node)) {
      if (k === 'loc' || k === 'start' || k === 'end' || k === 'extra' || k.endsWith('Comments')) continue;
      walk(v, node, k);
    }
  };
  /** In a binding pattern, only default values and computed keys are reads. */
  const walkPatternDefaults = (pattern: unknown): void => {
    if (!isNode(pattern)) return;
    if (pattern.type === 'AssignmentPattern') { walkPatternDefaults(pattern.left); walk(pattern.right, pattern, 'right'); }
    else if (pattern.type === 'ObjectPattern') for (const p of pattern.properties as AstNode[]) {
      if (p.type === 'RestElement') walkPatternDefaults(p.argument);
      else { if (p.computed) walk(p.key, p, 'computedKey'); walkPatternDefaults(p.value); }
    }
    else if (pattern.type === 'ArrayPattern') for (const e of pattern.elements as unknown[]) walkPatternDefaults(e);
    else if (pattern.type === 'RestElement') walkPatternDefaults(pattern.argument);
  };
  walk(ast);
  return [...new Set(used.filter((name) => !known.has(name) && name !== '__runjs__' && name !== '__binding__'))];
}

/* A transformation is three fields, not one. `transformations` / `transformation` carries the code,
   but ToolJet only runs it when `enableTransformation` is true and `transformationLanguage` names the
   language the code is under. Writing the code alone saves a transformation that never executes, and
   the app looks like the transformation is wrong rather than off. Observed on a real build (thread
   f4e3a7da): three turns of rewriting a transformation that was never enabled. */
function transformationWarnings(options: Record<string, unknown>): QueryValidationIssue[] {
  const warnings: QueryValidationIssue[] = [];
  const bag = isObject(options.transformations) ? options.transformations : undefined;
  const languages: string[] = bag ? Object.keys(bag).filter((key) => key === 'javascript' || key === 'python') : [];
  const hasCode = languages.length > 0
    || (typeof options.transformation === 'string' && options.transformation.trim() !== '');
  if (!hasCode) return warnings;

  const enabled = isTruthyStatic(options.enableTransformation);
  const language = typeof options.transformationLanguage === 'string' ? options.transformationLanguage : undefined;
  if (!enabled) {
    warnings.push({
      code: 'transformation_not_enabled',
      path: 'enableTransformation',
      message:
        'A transformation is supplied but enableTransformation is not true, so ToolJet saves the code and never runs it. ' +
        'Set enableTransformation: true and transformationLanguage to the language the code is written in.',
    });
  }
  if (!language) {
    warnings.push({
      code: 'transformation_language_missing',
      path: 'transformationLanguage',
      message:
        'A transformation is supplied without transformationLanguage, so ToolJet cannot tell how to run it. ' +
        `Set it to ${languages.length === 1 ? `"${languages[0]}"` : '"javascript" or "python"'}.`,
    });
  } else if (languages.length > 0 && !languages.includes(language)) {
    warnings.push({
      code: 'transformation_language_mismatch',
      path: 'transformationLanguage',
      message:
        `transformationLanguage is "${language}" but the code is under transformations.${languages.join('/')}. ` +
        'ToolJet runs the entry matching transformationLanguage, so the supplied code is ignored.',
    });
  }
  return warnings;
}

/* InfluxDB query_data returns the raw /api/v2/query response body: annotated CSV as one string, not
   rows. Every component that expects rows — Table above all — needs a transformation to parse it.
   The MCP client inferred this; the AI builder did not, and needed telling twice (reported build,
   90+ minutes). Say it at authoring time instead. */
function influxTransformWarnings(kind: string, options: Record<string, unknown>): QueryValidationIssue[] {
  if (kind !== 'influxdb') return [];
  const operation = typeof options.operation === 'string' ? options.operation.toLowerCase() : undefined;
  if (operation !== 'query_data') return [];
  if (isTruthyStatic(options.enableTransformation)) return [];
  return [{
    code: 'influx_raw_csv_response',
    path: 'enableTransformation',
    message:
      'InfluxDB query_data returns annotated CSV as a single raw string, not rows. Bound directly, a Table renders ' +
      'nothing. Add a transformation that parses the CSV into an array of row objects (skip the #datatype/#group/' +
      '#default annotation lines and the empty leading columns), with enableTransformation: true and ' +
      'transformationLanguage: "javascript".',
  }];
}

/** Fields naming what a query acts on. */
const TARGET_FIELD = /(^|_)(table|table_name|table_id|collection|collection_name|spreadsheet_id|base_id|bucket|bucket_name|index|index_name|container|url|endpoint|list_id|database_id|page_id|object_type|resource_name)$/i;

export function validateQueryOptions(kind: string, options: Record<string, unknown>): QueryValidationResult {
  const errors: QueryValidationIssue[] = [];
  errors.push(...queryToggleIssues(options));
  if (kind === 'hubspot') errors.push(...hubspotQueryIssues(options).map((issue) => ({ code: 'invalid_hubspot_query', ...issue })));
  errors.push(...apiEndpointQueryIssues(kind, options).map((issue) => ({ code: 'invalid_api_endpoint_query', ...issue })));
  if (kind === 'hubspot' && options.operation !== 'get' &&
      (isTruthyStatic(options.runOnPageLoad) || isTruthyStatic(options.runOnDependencyChange))) {
    errors.push({ code: 'automatic_hubspot_write', message: 'HubSpot writes must run from an explicit user action, not on page load or dependency changes.' });
  }
  const warnings: QueryValidationIssue[] = tableStateWarnings(options);
  const conditionalWrite = conditionalWriteWarning(kind, options);
  if (conditionalWrite) warnings.push({ code: 'conditional_write_result', path: 'update_rows', message: conditionalWrite });
  if (kind === 'mongodb') errors.push(...mongoArrayReplacementIssues(options));
  if (kind === 'runjs' && typeof options.code === 'string' && options.code.trim()) {
    const syntax = runjsSyntaxError(options.code);
    if (syntax) {
      errors.push({
        code: 'runjs_syntax_error',
        path: 'code',
        message:
          `the JavaScript does not parse (${syntax}). ToolJet marks the query failed and every component bound to its data stays empty; ` +
          'fix the code before writing it.',
      });
    } else {
      const undeclared = runjsUndeclaredNames(options.code);
      if (undeclared.length) {
        errors.push({
          code: 'runjs_undeclared_name',
          path: 'code',
          message:
            `the JavaScript uses ${undeclared.map((n) => `\`${n}\``).join(', ')} but never declares ${undeclared.length > 1 ? 'them' : 'it'}. ` +
            'The query throws a ReferenceError when that line runs, ToolJet marks it failed, and every component bound to its data stays ' +
            'empty. Declare the value, or use the name you meant.',
        });
      }
    }
  }
  warnings.push(...transformationWarnings(options));
  warnings.push(...influxTransformWarnings(kind, options));
  if (typeof options.query === "string") {
    errors.push(...unquotedSqlBindingIssues(options.query));
    warnings.push(...interpolatedSqlBindingIssues(options.query));
  }
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
        'An unbounded read cannot run automatically on page load or dependency change. ' +
        (readAssessment.reason ? `${readAssessment.reason} ` : `Add a static row limit at or below ${LARGE_READ_ROW_THRESHOLD}. `) +
        'Use server-side pagination for more, or run it only after an explicit user decision.',
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

  const operationHint = describeOperationSelection(schema);
  const operation = operationFromOptions(options, schema.contracts, schema.defaults);
  if (!operation) {
    errors.push({
      code: 'missing_operation',
      path: schema.contracts.sql ? 'mode' : 'operation',
      message: `Datasource "${kind}" needs an operation/mode. ${operationHint}`,
    });
    return { kind, schemaFound: true, errors, warnings };
  }

  const contract = schema.contracts[operation];
  if (!contract) {
    errors.push({
      code: 'invalid_operation',
      path: typeof options.operation === 'string' ? 'operation' : 'mode',
      message: `Unknown operation/mode "${operation}" for datasource "${kind}". ${operationHint}`,
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
  // A single-spec API-endpoint plugin runs on operation, path and params; its catalog lists only the editor's picker
  // key (stripe_operation), which the plugin never reads, and "correcting" operation to it broke the query (2026-09-27).
  if (singleSpecRef(kind)) for (const key of ['operation', 'path', 'params', 'selectedOperation']) allowedTopLevel.add(key);
  // A misnamed field: an unknown key that resembles one of this operation's fields while that field is unset (Supabase
  // `table` for `get_table_name`; catalog sweep 2026-09-26). The plugin drops the key and runs without the field, so it is
  // an error. Other unknown keys (an upstream wrapper, a legacy key) stay warnings: the plugin ignores them harmlessly.
  const own = [...allowedTopLevel].filter((k) => !(k in COMMON_QUERY_OPTION_FIELDS));
  for (const key of Object.keys(options)) {
    if (allowedTopLevel.has(key)) continue;
    const exactReplacement = KNOWN_IGNORED_KEYS[key];
    const nestedReplacement = suffixSuggestion(key, fields);
    const replacement = exactReplacement ?? nestedReplacement;
    const meant = key.length >= 4 ? own.filter((f) => f !== key && options[f] === undefined &&
      (f.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(f.toLowerCase()))) : [];
    if (!replacement && meant.length === 1) {
      errors.push({
        code: 'unknown_option_key',
        path: key,
        message: `Option key "${key}" does not exist for ${kind}/${operation}; the field is "${meant[0]}". ToolJet drops "${key}" ` +
          `and the query runs without it.`,
      });
      continue;
    }
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

  // What the query acts on (a table, collection, spreadsheet, base, bucket, index, URL): the catalog marks only the
  // selector required, so {operation: "get_rows"} with no table looked complete (sweep pilot, 2026-09-26). None set is an
  // error; some set is a warning, since a sheet tab or similar may be optional.
  if (options.mode !== 'sql') {
    const targets = Object.keys(fields).filter((path) => !path.includes('.') && TARGET_FIELD.test(path) && !(path in COMMON_QUERY_OPTION_FIELDS));
    const set = targets.filter((path) => { const v = options[path]; return v !== undefined && v !== null && v !== ''; });
    if (targets.length && !set.length) {
      errors.push({ code: 'missing_target', path: targets[0], message: `${kind}/${operation} names nothing to act on: set ${targets.join(' or ')}.` });
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
    const primitiveEntries = primitiveWriteBindingEntries(columns);
    if (primitiveEntries.length) errors.push({
      code: 'malformed_write_columns', path: columnsPath,
      message: `ToolJet DB ${operation} "${columnsPath}" binds a flat object with primitive entry values at ${primitiveEntries.map(k=>JSON.stringify(k)).join(', ')}. ` +
        'ToolJet reads {column, value} records, so these fields are omitted or the write fails. ' +
        'Use a literal column map with bound values, e.g. {"0":{"column":"status","value":"{{components.status.value}}"}}, or make the binding return that same record-map shape. Do not change the intended field values.',
    });
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

  if (kind !== 'tooljetdb' && operation === 'create_row' && isObject(valueAtPath(options, 'create_row'))) {
    // SQL plugins nest the map one level deeper than ToolJet DB: `create_row.columns`, not `create_row`.
    // The shared builder skips any entry without a usable `column` and, if NOTHING survives, emits
    // `INSERT INTO <table> DEFAULT VALUES` (plugins/packages/common/lib/queryBuilder.ts) — which
    // succeeds on any all-nullable table and inserts a BLANK ROW with status ok. Carrying the ToolJet DB
    // shape across (map placed at create_row) is the natural mistake and produces exactly that.
    const createRow = valueAtPath(options, 'create_row') as Record<string, unknown>;
    const columns = createRow.columns;
    const usable =
      isObject(columns) &&
      Object.values(columns).some(
        (clause) => isObject(clause) && typeof clause.column === 'string' && clause.column !== ''
      );
    if (!usable) {
      const misplaced =
        !isObject(columns) &&
        Object.values(createRow).some(
          (clause) => isObject(clause) && typeof clause.column === 'string' && clause.column !== ''
        );
      errors.push({
        code: 'malformed_write_columns',
        path: 'create_row.columns',
        message:
          misplaced
            ? `${kind} create_row expects the column map under "create_row.columns", not directly on ` +
              '"create_row" (that is the ToolJet DB shape). As authored no column is read, and the driver ' +
              'falls back to INSERT ... DEFAULT VALUES — inserting a BLANK ROW that reports success.'
            : `${kind} create_row requires "create_row.columns" as {"0": {"column": "<name>", "value": <v>}, …}. ` +
              'With no usable column entry the driver emits INSERT ... DEFAULT VALUES, inserting a BLANK ROW ' +
              'and reporting success.',
      });
    }
  }

  if (kind === 'tooljetdb' && (operation === 'update_rows' || operation === 'delete_rows')) {
    // The FILTER half of the same hazard, and far more dangerous than the column half.
    // buildPostgrestQuery only emits a clause when BOTH `column` and `operator` are non-empty
    // (tooljet-db-data-operations.service.ts), silently dropping anything else. If every clause is
    // dropped the query string is empty — and update_rows then issues an UNFILTERED PATCH that
    // rewrites EVERY ROW in the table while reporting status:ok. Catch it before it is ever written.
    const filtersPath = `${operation}.where_filters`;
    const filters = valueAtPath(options, filtersPath);
    // The backend iterates Object.keys(filters), accepting indexed objects AND
    // arrays. Both must receive the same targeting guard: [] otherwise bypasses
    // validation and can become an unfiltered PATCH.
    if (isObject(filters) || Array.isArray(filters)) {
      const usable = Object.entries(filters).filter(
        ([, clause]) =>
          isObject(clause) &&
          typeof clause.column === 'string' &&
          clause.column !== '' &&
          typeof clause.operator === 'string' &&
          clause.operator !== ''
      );
      if (usable.length === 0) {
        const example = Object.keys(filters)[0];
        errors.push({
          code: 'malformed_where_filters',
          path: filtersPath,
          message:
            `ToolJet DB ${operation} "${filtersPath}" has no usable clause: every entry must be a ` +
            `{column, operator, value} record (for example {"0": {"column": "id", "operator": "eq", ` +
            `"value": "{{components.table1.selectedRow.id}}"}}). ToolJet silently drops any clause ` +
            `missing column or operator` +
            (operation === 'update_rows'
              ? ', and an update with no surviving clause updates EVERY ROW in the table.'
              : '.') +
            (example ? ` Entry "${example}" is not in that shape.` : ''),
        });
      }
    } else if (filters === undefined && operation === 'update_rows') {
      errors.push({
        code: 'malformed_where_filters',
        path: filtersPath,
        message:
          `ToolJet DB update_rows requires "${filtersPath}"; without it the write is unfiltered and ` +
          'updates EVERY ROW in the table. Add {"0": {"column", "operator", "value"}}.',
      });
    }
  }

  if (kind === 'tooljetdb' && ['list_rows', 'update_rows', 'delete_rows'].includes(operation)) {
    // ToolJet DB returns date and timestamp columns as full ISO timestamps with an offset
    // ("2026-09-04T00:00:00+00:00"), so an equality filter against a calendar day matches nothing:
    // the query succeeds, the table shows "No data", and the model spends turns repairing bindings
    // instead. Measured on a one-page visitor log: two repair rounds and more credits than a
    // four-page build on the same model. Name it before the query is written.
    const filters = valueAtPath(options, `${operation}.where_filters`);
    // Array-form filters execute through the same PostgREST builder as maps.
    // Case17 saved operator "=" in an array because this check only saw objects.
    if (isObject(filters) || Array.isArray(filters)) {
      for (const [mapKey, rawClause] of Object.entries(filters)) {
        // Observed in the Luna stock-movement benchmark: `equals` passes the record-shape
        // check, then buildPostgrestQuery calls a nonexistent builder method. Reject known
        // foreign/UI spellings, not an exhaustive allowlist tied to one server version.
        // Never rewrite a persisted write filter or change its target silently.
        const aliases: Record<string, string> = {
          equals: 'eq', equal: 'eq', '==': 'eq', '===': 'eq', '=': 'eq',
          not_equals: 'neq', notEquals: 'neq', '!=': 'neq', '!==': 'neq', '<>': 'neq',
          greater_than: 'gt', greaterThan: 'gt', '>': 'gt',
          greater_than_or_equal: 'gte', '>=': 'gte',
          less_than: 'lt', lessThan: 'lt', '<': 'lt',
          less_than_or_equal: 'lte', '<=': 'lte',
        };
        if (isObject(rawClause) && typeof rawClause.operator === 'string' &&
            Object.hasOwn(aliases, rawClause.operator)) {
          errors.push({
            code: 'invalid_tooljetdb_filter_operator',
            path: `${operation}.where_filters.${mapKey}.operator`,
            message: `ToolJet DB filter operator "${rawClause.operator}" is not a PostgREST builder operator. ` +
              `Use "${aliases[rawClause.operator]}" for this comparison; keep the same column and value. ` +
              'The query was not automatically rewritten. Fetch the datasource operation contract if unsure.',
          });
        }
        if (!isObject(rawClause) || rawClause.operator !== 'eq') continue;
        const column = typeof rawClause.column === 'string' ? rawClause.column : '';
        const value = typeof rawClause.value === 'string' ? rawClause.value : '';
        const dateLikeColumn = /(^|_)(date|day|time|at|on)$|_date_|timestamp/i.test(column);
        const dayValue = /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) || /format\(\s*['"]YYYY-MM-DD['"]\s*\)/.test(value);
        if (!dayValue && !dateLikeColumn) continue;
        if (!dayValue && !/moment\(|new Date|Date\.now/.test(value)) continue;
        warnings.push({
          code: 'date_equality_filter',
          path: `${operation}.where_filters.${mapKey}`,
          message:
            `ToolJet DB ${operation} filter "${column}" uses "eq" against a calendar day. Date and timestamp ` +
            'columns come back as full ISO timestamps ("2026-09-04T00:00:00+00:00"), so equality with ' +
            '"YYYY-MM-DD" matches no rows and the table shows "No data" with no error. Filter a day as a ' +
            'range instead: one clause "gte" the day at 00:00 and one "lt" the next day, or store the day in a ' +
            'text column seeded as YYYY-MM-DD when this build creates the table.',
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
export function normalizeQueryOptions(kind: string, rawOptions: Record<string, unknown>): Record<string, unknown> {
  const options = normalizeQueryToggles(rawOptions);
  if (kind === 'mongodb' && isObject(options)) {
    // The plugin's parseEJSON calls JSON5.parse, which receives "[object Object]" for objects.
    // Preserve string bindings and EJSON markers; only serialize already-structured literals.
    let result = options;
    for (const field of ['filter', 'options', 'pipeline', 'document', 'documents', 'update', 'replacement', 'operations']) {
      const value = options[field];
      if (value !== null && typeof value === 'object') {
        if (result === options) result = { ...options };
        result[field] = JSON.stringify(value);
      }
    }
    return result;
  }
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
