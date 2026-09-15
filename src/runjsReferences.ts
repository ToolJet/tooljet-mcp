import { parse } from '@babel/parser';

type Node = Record<string, unknown> & { type: string };

function isNode(value: unknown): value is Node {
  return !!value && typeof value === 'object' && typeof (value as Node).type === 'string';
}

function bindsQueries(value: unknown): boolean {
  if (!isNode(value)) return false;
  if (value.type === 'Identifier') return value.name === 'queries';
  if (value.type === 'RestElement') return bindsQueries(value.argument);
  if (value.type === 'AssignmentPattern') return bindsQueries(value.left);
  if (value.type === 'ArrayPattern') return (value.elements as unknown[]).some(bindsQueries);
  if (value.type === 'ObjectPattern') {
    return (value.properties as Node[]).some((property) =>
      bindsQueries(property.type === 'RestElement' ? property.argument : property.value));
  }
  return false;
}

/** Parse only: never execute user code. Resolve literal reads of the ToolJet queries namespace.
 * If any local binding shadows queries, conservatively leave the body unverified rather than
 * reject valid local objects. Computed/dynamic names and syntactically invalid bodies are also
 * left to their respective runtime/syntax checks. Comments and string examples aren't reads.
 */
export function runjsQueryReferences(code: string): string[] {
  let root: unknown;
  try {
    root = parse(code, { sourceType: 'script', allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true });
  } catch {
    return [];
  }
  const names = new Set<string>();
  let shadowed = false;
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!isNode(value)) return;
    if (
      (value.type === 'VariableDeclarator' && bindsQueries(value.id)) ||
      (/^(Function|Class)(Declaration|Expression)$/.test(value.type) && bindsQueries(value.id)) ||
      (Array.isArray(value.params) && value.params.some(bindsQueries)) ||
      (value.type === 'CatchClause' && bindsQueries(value.param)) ||
      value.type === 'WithStatement' ||
      (value.type === 'CallExpression' && isNode(value.callee) && value.callee.type === 'Identifier' && value.callee.name === 'eval')
    ) shadowed = true;
    if (
      (value.type === 'MemberExpression' || value.type === 'OptionalMemberExpression') &&
      isNode(value.object) && value.object.type === 'Identifier' && value.object.name === 'queries' &&
      isNode(value.property)
    ) {
      if (!value.computed && value.property.type === 'Identifier') names.add(value.property.name as string);
      if (value.computed && value.property.type === 'StringLiteral') names.add(value.property.value as string);
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(root);
  return shadowed ? [] : [...names];
}
