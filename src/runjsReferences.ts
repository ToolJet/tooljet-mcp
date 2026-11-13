import { parse } from '@babel/parser';

type Node = Record<string, unknown> & { type: string };

function isNode(value: unknown): value is Node {
  return !!value && typeof value === 'object' && typeof (value as Node).type === 'string';
}

type Namespace = 'queries' | 'components';

function bindsNamespace(value: unknown, namespace: Namespace): boolean {
  if (!isNode(value)) return false;
  if (value.type === 'Identifier') return value.name === namespace;
  if (value.type === 'RestElement') return bindsNamespace(value.argument, namespace);
  if (value.type === 'AssignmentPattern') return bindsNamespace(value.left, namespace);
  if (value.type === 'ArrayPattern') return (value.elements as unknown[]).some(item => bindsNamespace(item, namespace));
  if (value.type === 'ObjectPattern') {
    return (value.properties as Node[]).some((property) =>
      bindsNamespace(property.type === 'RestElement' ? property.argument : property.value, namespace));
  }
  return false;
}

/** A node that declares its own `namespace` (a variable, parameter, function or catch binding), or a with/eval that
 *  may: reads after it are not ToolJet's namespace. */
function shadows(value: Node, namespace: Namespace): boolean {
  return (
    (value.type === 'VariableDeclarator' && bindsNamespace(value.id, namespace)) ||
    (/^(Function|Class)(Declaration|Expression)$/.test(value.type) && bindsNamespace(value.id, namespace)) ||
    (Array.isArray(value.params) && value.params.some(item => bindsNamespace(item, namespace))) ||
    (value.type === 'CatchClause' && bindsNamespace(value.param, namespace)) ||
    value.type === 'WithStatement' ||
    (value.type === 'CallExpression' && isNode(value.callee) && value.callee.type === 'Identifier' && value.callee.name === 'eval')
  );
}

/** Parse only: never execute user code. Resolve literal reads of a ToolJet namespace.
 * If any local binding shadows that namespace, conservatively leave the body unverified rather than
 * reject valid local objects. Computed/dynamic names and syntactically invalid bodies are also
 * left to their respective runtime/syntax checks. Comments and string examples aren't reads.
 */
export function namespaceReads(code: string, namespace: Namespace): Array<{ name: string; start: number; end: number; optional: boolean }> {
  const { source, ids } = maskSavedIds(code);
  return namespaceAccesses(source, namespace).flatMap(read =>
    read.name === undefined ? [] : [{ ...read, name: ids.get(read.name) ?? read.name }]);
}

/** Reads of a ToolJet namespace whose name is built at runtime (components["a" + b]). ToolJet resolves only literal
 *  names in a {{ }} binding, so such a read finds nothing. */
export function dynamicNamespaceReads(code: string, namespace: Namespace): number {
  return namespaceAccesses(maskSavedIds(code).source, namespace).filter(read => read.name === undefined).length;
}

/** ToolJet saves references by id (components.d9ccffce-ad5a-...), which JS reads as a subtraction. Swap each id for a
 *  placeholder identifier of the same length, so offsets still point into the original code, and map it back. */
const SAVED_ID = /\b(components|queries)(\??\.)([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\b/gi;
function maskSavedIds(code: string): { source: string; ids: Map<string, string> } {
  const ids = new Map<string, string>();
  const source = code.replace(SAVED_ID, (_m, ns: string, dot: string, id: string) => {
    const placeholder = `$${id.slice(1).replace(/-/g, '_')}`;
    ids.set(placeholder, id);
    return `${ns}${dot}${placeholder}`;
  });
  return { source, ids };
}

function namespaceAccesses(code: string, namespace: Namespace): Array<{ name: string | undefined; start: number; end: number; optional: boolean }> {
  let root: unknown;
  try {
    root = parse(code, { sourceType: 'script', allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true });
  } catch {
    return [];
  }
  const reads: Array<{ name: string | undefined; start: number; end: number; optional: boolean }> = [];
  let shadowed = false;
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!isNode(value)) return;
    if (shadows(value, namespace)) shadowed = true;
    if (
      (value.type === 'MemberExpression' || value.type === 'OptionalMemberExpression') &&
      isNode(value.object) && value.object.type === 'Identifier' && value.object.name === namespace &&
      isNode(value.property)
    ) {
      const name = !value.computed && value.property.type === 'Identifier' ? value.property.name
        : value.computed && value.property.type === 'StringLiteral' ? value.property.value : undefined;
      const dynamic = value.computed && !/^(StringLiteral|NumericLiteral|TemplateLiteral)$/.test(String(value.property.type));
      if ((typeof name === 'string' || dynamic) && typeof value.start === 'number' && typeof value.end === 'number') {
        reads.push({ name: typeof name === 'string' ? name : undefined, start: value.start, end: value.end, optional: value.optional === true });
      }
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(root);
  return shadowed ? [] : reads;
}

export function runjsQueryReferences(code: string): string[] {
  return [...new Set(namespaceReads(code, 'queries').map(read => read.name))];
}

/** Literal reads one level into a namespace entry, <namespace>.<name>.<member> (with ?. or ["..."] too), by the same
 *  parse-only, shadowing-aware rules as namespaceReads. */
export function namespaceMemberReads(code: string, namespace: Namespace): Array<{ name: string; member: string }> {
  const { source, ids } = maskSavedIds(code);
  let root: unknown;
  try {
    root = parse(source, { sourceType: 'script', allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true });
  } catch {
    return [];
  }
  const isMember = (value: unknown): value is Node =>
    isNode(value) && (value.type === 'MemberExpression' || value.type === 'OptionalMemberExpression');
  const literal = (member: Node): string | undefined => {
    const property = member.property;
    if (!isNode(property)) return undefined;
    if (!member.computed && property.type === 'Identifier') return String(property.name);
    if (member.computed && property.type === 'StringLiteral') return String(property.value);
    return undefined;
  };
  const reads: Array<{ name: string; member: string }> = [];
  let shadowed = false;
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!isNode(value)) return;
    if (shadows(value, namespace)) shadowed = true;
    const entry = isMember(value) ? value.object : undefined;
    if (isMember(entry) && isNode(entry.object) && entry.object.type === 'Identifier' && entry.object.name === namespace) {
      const name = literal(entry);
      const member = literal(value as Node);
      if (name && member) reads.push({ name: ids.get(name) ?? name, member });
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(root);
  return shadowed ? [] : reads;
}

export function runjsComponentReferences(code: string): string[] {
  return [...new Set(namespaceReads(code, 'components').map(read => read.name))];
}
