import { parseExpression } from '@babel/parser';
import { bindingSpans } from './bindingSpans.js';
import { bindingReferences } from './bindingReferences.js';
import type { AppSummary } from './tooljetClient.js';

type N = Record<string, unknown>;
const obj = (x: unknown): N => x && typeof x === 'object' && !Array.isArray(x) ? x as N : {};
const prop = (x: N): unknown => obj(x.property)[x.computed ? 'value' : 'name'];

/** Advisory only: preserve original text; never trim submitted data or alter the guard. */
export function lintWhitespaceGuards(summary: AppSummary): string[] {
  const controls = summary.pages.flatMap(p => p.components);
  const textAreas = new Set(controls.filter(c=>c.type==='TextArea').map(c=>c.name));
  const sources = controls.filter(c=>c.type==='Button').map(c=>({name:c.name ?? c.id,value:obj(c.properties).disabledState}));
  const warnings: string[]=[];
  for (const source of sources) {
    const value = Object.hasOwn(obj(source.value),'value') ? obj(source.value).value : source.value;
    if(typeof value!=='string') continue;
    const reads = new Set(bindingReferences(value).filter(r=>r.namespace==='components').map(r=>r.name));
    const found = new Set<string>();
    const walk=(x: unknown):void=>{
      if(Array.isArray(x)){x.forEach(walk);return;}
      const n=obj(x);
      if(n.type==='UnaryExpression' && n.operator==='!') {
        const field=obj(n.argument), control=obj(field.object), root=obj(control.object);
        const name=prop(control);
        if(prop(field)==='value' && root.type==='Identifier' && root.name==='components' && typeof name==='string' && reads.has(name) && textAreas.has(name)) found.add(name);
      }
      for(const child of Object.values(n)) if(child && typeof child==='object') walk(child);
    };
    for(const span of bindingSpans(value)) { try { walk(parseExpression(span.body)); } catch { /* unknown */ } }
    if(found.size) warnings.push(`Button "${source.name}" tests TextArea ${[...found].map(n=>JSON.stringify(n)).join(', ')} with a truthiness-only empty guard. Spaces pass that check. If a meaningful reason/note is required, test String(value ?? '').trim().length and repeat the guard at the write boundary; preserve the user's original text. Intentional whitespace-only input may be valid, so this is advisory.`);
  }
  return warnings;
}
