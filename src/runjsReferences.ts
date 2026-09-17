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

/** Parse only: never execute user code. Resolve literal reads of a ToolJet namespace.
 * If any local binding shadows that namespace, conservatively leave the body unverified rather than
 * reject valid local objects. Computed/dynamic names and syntactically invalid bodies are also
 * left to their respective runtime/syntax checks. Comments and string examples aren't reads.
 */
export function namespaceReads(code: string, namespace: Namespace): Array<{ name: string; start: number; end: number; optional: boolean }> {
  let root: unknown;
  try {
    root = parse(code, { sourceType: 'script', allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true });
  } catch {
    return [];
  }
  const reads: Array<{ name: string; start: number; end: number; optional: boolean }> = [];
  let shadowed = false;
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!isNode(value)) return;
    if (
      (value.type === 'VariableDeclarator' && bindsNamespace(value.id, namespace)) ||
      (/^(Function|Class)(Declaration|Expression)$/.test(value.type) && bindsNamespace(value.id, namespace)) ||
      (Array.isArray(value.params) && value.params.some(item => bindsNamespace(item, namespace))) ||
      (value.type === 'CatchClause' && bindsNamespace(value.param, namespace)) ||
      value.type === 'WithStatement' ||
      (value.type === 'CallExpression' && isNode(value.callee) && value.callee.type === 'Identifier' && value.callee.name === 'eval')
    ) shadowed = true;
    if (
      (value.type === 'MemberExpression' || value.type === 'OptionalMemberExpression') &&
      isNode(value.object) && value.object.type === 'Identifier' && value.object.name === namespace &&
      isNode(value.property)
    ) {
      const name = !value.computed && value.property.type === 'Identifier' ? value.property.name
        : value.computed && value.property.type === 'StringLiteral' ? value.property.value : undefined;
      if (typeof name === 'string' && typeof value.start === 'number' && typeof value.end === 'number') {
        reads.push({ name, start: value.start, end: value.end, optional: value.optional === true });
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

export function runjsComponentReferences(code: string): string[] {
  return [...new Set(namespaceReads(code, 'components').map(read => read.name))];
}
