import { parseExpression } from '@babel/parser';
import { bindingSpans } from './bindingSpans.js';
import type { QueryValidationIssue } from './queryValidation.js';

type Node = Record<string, any>;

/* A MongoDB `$set` of a whole array rebuilt from component state replaces the stored array on every
   save, dropping every element and field the components do not hold. Element-targeted paths preserve
   the surrounding array; the validator inspects expressions without executing user code. */

const UPDATE_OPERATIONS = new Set(['update_one', 'update_many', 'find_one_update']);
const BULK_UPDATES = ['updateOne', 'updateMany'];
const ARRAY_METHODS = new Set(['map', 'filter', 'concat', 'flat', 'flatMap', 'slice', 'sort', 'reverse', 'toSorted', 'toReversed']);
const STRING_OR_ARRAY_METHODS = new Set(['slice', 'concat']);
// Table exposed row collections; a single control's `values` (MultiSelect, TagsInput) is a whole value on purpose.
const ROW_COLLECTIONS = new Set(['currentData', 'updatedData', 'filteredData', 'currentPageData', 'selectedRows', 'newRows']);
const ELEMENT_PATH = /\$|\.\d+(\.|$)/;

const isMember = (n: Node | undefined) => n?.type === 'MemberExpression' || n?.type === 'OptionalMemberExpression';
const propertyName = (n: Node): string | undefined =>
  n.computed ? (n.property?.type === 'StringLiteral' ? n.property.value : undefined) : n.property?.name;
const keyName = (p: Node): string | undefined =>
  p.computed ? undefined : p.key?.type === 'Identifier' ? p.key.name : p.key?.type === 'StringLiteral' ? p.key.value : undefined;
const property = (n: Node | undefined, key: string): Node | undefined =>
  n?.type === 'ObjectExpression' ? n.properties.find((p: Node) => p.type === 'ObjectProperty' && keyName(p) === key)?.value : undefined;

/** Inspect transparent serialization and simple inline wrappers without evaluating their code. */
function unwrap(n: Node | undefined): Node | undefined {
  while (n?.type === 'CallExpression') {
    if (isMember(n.callee) && n.callee.object?.name === 'JSON' &&
        propertyName(n.callee) === 'stringify' && n.arguments.length >= 1) {
      n = n.arguments[0];
      continue;
    }
    const fn = n.callee;
    // Parameters, local declarations and arbitrary control flow need scope/data-flow analysis.
    // Only unwrap a synchronous, zero-argument function that directly returns its expression.
    if (!['ArrowFunctionExpression', 'FunctionExpression'].includes(fn?.type) || fn.async || fn.generator ||
        fn.params.length || n.arguments.length) break;
    if (fn.body.type !== 'BlockStatement') {
      n = fn.body;
    } else if (fn.body.body.length === 1 && fn.body.body[0].type === 'ReturnStatement') {
      n = fn.body.body[0].argument;
    } else break;
  }
  return n;
}

/** Parse JSON5 text with embedded `{{ }}` bindings as one JS expression. A binding that is the whole
 * content of a quoted string stands for its expression, as it does once ToolJet resolves it. */
function parseField(value: unknown): Node | undefined {
  if (value !== null && typeof value === 'object') value = JSON.stringify(value);
  if (typeof value !== 'string' || !value.trim()) return undefined;
  let source = '';
  let from = 0;
  for (const span of bindingSpans(value)) {
    const quote = value[span.start - 1];
    const quoted = (quote === '"' || quote === "'") && value[span.end] === quote && span.start - 1 >= from;
    source += value.slice(from, quoted ? span.start - 1 : span.start) + `(${span.body})`;
    from = quoted ? span.end + 1 : span.end;
  }
  source += value.slice(from);
  try { return unwrap(parseExpression(source) as unknown as Node); } catch { return undefined; }
}

function referencesComponents(n: unknown): boolean {
  if (!n || typeof n !== 'object') return false;
  if (Array.isArray(n)) return n.some(referencesComponents);
  const node = n as Node;
  if (isMember(node) && node.object?.type === 'Identifier' && node.object.name === 'components') return true;
  return Object.entries(node).some(([key, child]) => !['loc', 'extra', 'comments'].includes(key) && referencesComponents(child));
}

/** Evidence that an expression returns an array; method names shared with strings are insufficient. */
function isArrayValue(raw: Node | undefined): boolean {
  const n = unwrap(raw);
  if (!n) return false;
  if (n.type === 'LogicalExpression') return isArrayValue(n.left) || isArrayValue(n.right);
  if (n.type === 'ConditionalExpression') return isArrayValue(n.consequent) || isArrayValue(n.alternate);
  if (n.type === 'ArrayExpression') return true;
  if (n.type === 'CallExpression' || n.type === 'OptionalCallExpression') {
    const callee = n.callee;
    const method = isMember(callee) ? propertyName(callee) ?? '' : '';
    if (ARRAY_METHODS.has(method)) {
      return !STRING_OR_ARRAY_METHODS.has(method) || isArrayValue(callee.object);
    }
    if (isMember(callee) && ['Array', 'Object'].includes(callee.object?.name) && ['from', 'values'].includes(propertyName(callee) ?? '')) return true;
    return false;
  }
  return isMember(n) && ROW_COLLECTIONS.has(propertyName(n) ?? '');
}

/** An array value built from component data, rather than a scalar string or a literal constant. */
function isComponentArray(raw: Node | undefined): boolean {
  const n = unwrap(raw);
  if (n?.type === 'LogicalExpression') return isComponentArray(n.left) || isComponentArray(n.right);
  if (n?.type === 'ConditionalExpression') return isComponentArray(n.consequent) || isComponentArray(n.alternate);
  return referencesComponents(n) && isArrayValue(n);
}

/** Top-level `$set` paths (including inside a replaced sub-document) whose value is a component-built array. */
function replacedArrayPaths(set: Node | undefined, prefix = ''): string[] {
  if (set?.type !== 'ObjectExpression') return [];
  return set.properties.flatMap((p: Node) => {
    if (p.type !== 'ObjectProperty') return [];
    const key = keyName(p);
    if (!key) return [];
    const path = prefix ? `${prefix}.${key}` : key;
    if (ELEMENT_PATH.test(path)) return [];
    if (isComponentArray(p.value)) return [path];
    return replacedArrayPaths(unwrap(p.value), path);
  });
}

function setStages(update: Node | undefined): Node[] {
  update = unwrap(update);
  if (update?.type === 'ObjectExpression') return [property(update, '$set')].filter(Boolean) as Node[];
  if (update?.type === 'ArrayExpression') {
    return update.elements.flatMap((stage: Node) => [property(stage, '$set'), property(stage, '$addFields')].filter(Boolean)) as Node[];
  }
  return [];
}

function issue(path: string, field: string): QueryValidationIssue {
  return {
    code: 'mongodb_whole_array_set',
    path,
    message:
      `$set replaces the whole "${field}" array with a value built from component data, so every save drops the elements ` +
      'and fields the components do not hold. Update the edited elements by path instead: ' +
      `{ $set: { "${field}.$[el].<field>": ... } } with options { arrayFilters: [{ "el.<key>": ... }] }, matching a stable ` +
      'key field, and abort the save unless the element count is unchanged apart from explicit adds and deletes.',
  };
}

export function mongoArrayReplacementIssues(options: Record<string, unknown>): QueryValidationIssue[] {
  const operation = typeof options.operation === 'string' ? options.operation : '';
  const updates: Array<{ path: string; update: Node | undefined }> = [];
  if (UPDATE_OPERATIONS.has(operation)) updates.push({ path: 'update', update: parseField(options.update) });
  if (operation === 'bulk_write') {
    const operations = parseField(options.operations);
    if (operations?.type === 'ArrayExpression') {
      operations.elements.forEach((op: Node, index: number) => {
        for (const kind of BULK_UPDATES) {
          const update = unwrap(property(unwrap(property(op, kind)), 'update'));
          if (update) updates.push({ path: `operations[${index}].${kind}.update`, update });
        }
      });
    }
  }
  return updates.flatMap(({ path, update }) =>
    setStages(update).flatMap((set) => replacedArrayPaths(unwrap(set)).map((field) => issue(path, field))));
}
