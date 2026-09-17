import { parseExpression } from '@babel/parser';

type Node = Record<string, any>;
const member = (n: Node | undefined) => n?.type === 'MemberExpression' || n?.type === 'OptionalMemberExpression';
const key = (n: Node) => n.computed ? (n.property?.type === 'StringLiteral' ? n.property.value : undefined) : n.property?.name;
const rootRef = (n: Node | undefined): string | undefined => {
  if (!member(n) || !['components', 'queries'].includes(n!.object?.name) || n!.object?.type !== 'Identifier') return;
  const k = key(n!); return k ? `${n!.object.name}.${k}` : undefined;
};
function walk(n: any, visit: (n: Node) => void) {
  if (!n || typeof n !== 'object') return;
  if (Array.isArray(n)) { for (const child of n) walk(child, visit); return; }
  visit(n);
  for (const [key,value] of Object.entries(n)) if (!['loc','extra','comments'].includes(key)) walk(value,visit);
}

/** ToolJet's AST dependency extractor only records components/queries paths with >=3
 * segments. A logical fallback between the component and its exposed value interrupts
 * that chain. Valid JS is not necessarily a tracked binding. Advisory, never rewritten. */
export function lintUntrackedReactiveBindings(value: unknown, label: string): string[] {
  if (Array.isArray(value)) return value.flatMap(v => lintUntrackedReactiveBindings(v,label));
  if (value && typeof value === 'object') return Object.values(value).flatMap(v=>lintUntrackedReactiveBindings(v,label));
  if (typeof value !== 'string') return [];
  const match=value.trim().match(/^\{\{([\s\S]*)\}\}$/); if(!match) return [];
  let ast: Node;
  try { ast=parseExpression(match[1]!) as unknown as Node; } catch { return []; }
  const tracked=new Set<string>(), suspects=new Set<string>();
  let shadowed=false;
  walk(ast,n=>{
    if ((n.params && /"(?:components|queries)"/.test(JSON.stringify(n.params))) ||
        (n.type==='VariableDeclarator' && /"(?:components|queries)"/.test(JSON.stringify(n.id)))) shadowed=true;
    if(!member(n)) return;
    const direct=rootRef(n.object);
    if(direct && key(n)) tracked.add(direct);
    if(n.object?.type==='LogicalExpression' && ['||','??'].includes(n.object.operator)) {
      const wrapped=rootRef(n.object.left);
      if(wrapped && key(n)) suspects.add(wrapped);
    }
  });
  if(shadowed) return [];
  return [...suspects].filter(ref=>!tracked.has(ref)).map(ref=>
    `${label}: a logical fallback wraps ${ref} before its exposed value is read. ToolJet cannot track this dependency, so filters/prefill may stay stale. Keep a complete optional chain, e.g. ${ref}?.value (use the actual exposed property). Valid JavaScript alone does not guarantee reactive updates. No expression was rewritten.`);
}

/** Display bindings must not reorder the shared query result in place. Only
 * recognize direct query.data receivers (optionally with an empty-array fallback).
 * Copies, local arrays, opaque helpers and dynamic query names remain unverified. */
export function lintQueryArrayMutations(value: unknown, label: string): string[] {
  if (Array.isArray(value)) return value.flatMap(v=>lintQueryArrayMutations(v,label));
  if (value && typeof value === 'object') return Object.values(value).flatMap(v=>lintQueryArrayMutations(v,label));
  if (typeof value !== 'string') return [];
  const match=value.trim().match(/^\{\{([\s\S]*)\}\}$/); if(!match) return [];
  let ast: Node;try{ast=parseExpression(match[1]!) as unknown as Node;}catch{return [];}
  let shadowed=false;const mutations=new Set<string>();
  const queryData=(n:Node):string|undefined=>{
    if(n?.type==='LogicalExpression' && ['||','??'].includes(n.operator) && n.right?.type==='ArrayExpression' && n.right.elements.length===0) return queryData(n.left);
    const ref=member(n) && key(n)==='data' ? rootRef(n.object) : undefined;
    return ref?.startsWith('queries.') ? ref : undefined;
  };
  walk(ast,n=>{
    if((n.params && /"queries"/.test(JSON.stringify(n.params))) || (n.type==='VariableDeclarator' && /"queries"/.test(JSON.stringify(n.id)))) shadowed=true;
    if(!['CallExpression','OptionalCallExpression'].includes(n.type) || !member(n.callee) || !['sort','reverse'].includes(key(n.callee)))return;
    const ref=queryData(n.callee.object);if(ref)mutations.add(`${ref}.data.${key(n.callee)}`);
  });
  if(shadowed)return [];
  return [...mutations].map(ref=>`${label}: ${ref}() mutates the shared query array inside a display binding. ToolJet state can be frozen, so this may throw and render an empty table even when the query has rows. Copy first with slice() or a spread, then sort/reverse the copy; a prior map/filter already creates a new array. No expression was rewritten.`);
}
