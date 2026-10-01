import { parseExpression } from '@babel/parser';

type Node = Record<string, unknown>;
const object = (v: unknown): Node | undefined => v && typeof v === 'object' && !Array.isArray(v) ? v as Node : undefined;

/** A successful conditional update may match no rows. Do not infer a transaction
 * or reject a valid predicate; flag the result-handling contract for the caller. */
export function conditionalWriteWarning(kind: string, options: Record<string, unknown>): string | undefined {
  if (kind !== 'tooljetdb' || options.operation !== 'update_rows') return;
  const update = object(options.update_rows);
  const written = new Set(Object.values(object(update?.columns) ?? {}).map(object)
    .flatMap(c => typeof c?.column === 'string' ? [c.column] : []));
  const guarded = Object.values(object(update?.where_filters) ?? {}).map(object)
    .filter(f => typeof f?.column === 'string' && written.has(f.column) && f.operator === 'eq')
    .map(f => String(f!.column));
  if (!guarded.length) return;
  return `update_rows both checks and changes ${[...new Set(guarded)].map(x => JSON.stringify(x)).join(', ')}. ` +
    'This can legitimately succeed with zero matching rows (stale value/state). An untransformed ToolJet DB update_rows returns the changed rows in queries.<name>.data (an empty array means no match); account for any query transformation. Before a dependent write, audit entry, status transition or success message, verify the result contains the intended row and expected count; do not treat onDataQuerySuccess alone as that proof. ' +
    'On no match, stop the dependent chain and show a conflict/reload message. Do not remove the predicate to make the write pass. This is advisory; callers may already handle the result.';
}
function walk(v: unknown, visit: (n: Node) => void): void {
  if (Array.isArray(v)) { for (const x of v) walk(x,visit); return; }
  const n=object(v); if (!n) return; visit(n);
  for (const [key,child] of Object.entries(n)) if (!['loc','extra','comments'].includes(key)) walk(child,visit);
}
function property(n: Node | undefined): string | undefined {
  const p=object(n?.property);
  if (!n?.computed && p?.type==='Identifier') return String(p.name);
  if (p?.type==='StringLiteral') return String(p.value);
}

/** Advisory for proven client-side read/modify/write, not a ban on arithmetic.
 * Unknown expressions and captured application variables are not certified. */
export function arithmeticWriteWarning(kind: string | undefined, options: Record<string, unknown>): string | undefined {
  if (kind!=='tooljetdb' || options.operation!=='update_rows') return;
  const update=object(options.update_rows), columns=object(update?.columns);
  if (!columns) return;
  const filters=Object.values(object(update?.where_filters) ?? {}).map(object);
  const risky: string[]=[];
  for (const entry of Object.values(columns)) {
    const c=object(entry); if (typeof c?.column!=='string' || typeof c.value!=='string') continue;
    // An explicit expected-value predicate can intentionally provide optimistic concurrency.
    if (filters.some(f=>f?.column===c.column && f?.operator==='eq')) continue;
    const match=c.value.trim().match(/^\{\{([\s\S]*)\}\}$/); if (!match) continue;
    let ast: unknown; try { ast=parseExpression(match[1]!); } catch { continue; }
    let shadowed=false,found=false;
    walk(ast,n=>{if (Array.isArray(n.params) && /"components"/.test(JSON.stringify(n.params))) shadowed=true;
      if(n.type==='VariableDeclarator' && /"components"/.test(JSON.stringify(n.id))) shadowed=true;});
    if(shadowed) continue;
    walk(ast,n=>{
      if(n.type!=='BinaryExpression' || !['+','-'].includes(String(n.operator))) return;
      walk(n,member=>{
        if(!['MemberExpression','OptionalMemberExpression'].includes(String(member.type))) return;
        const selected=object(member.object),table=object(selected?.object),namespace=object(table?.object);
        if(property(selected)==='selectedRow' && namespace?.type==='Identifier' && namespace.name==='components') found=true;
      });
    });
    if(found) risky.push(c.column);
  }
  if(!risky.length) return;
  return `update_rows calculates ${[...new Set(risky)].map(x=>JSON.stringify(x)).join(', ')} from selectedRow arithmetic without an expected-value predicate for that column. ` +
    'Verify the source query actually returns every operand; an absent value defaulted to zero can overwrite a real balance. ' +
    'For accumulated stock, balances or counters, prefer a supported atomic database increment/decrement with bounds and idempotency, or an explicit optimistic-concurrency predicate. ' +
    'Do not silently replace the intended calculation; ordinary derived-field formulas may be intentional. This is advisory, not proof that the operation is incorrect.';
}
