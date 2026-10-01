import { parseHtml, stripHtmlBindings } from './htmlHeight.js';
import { bindingSpans } from './bindingSpans.js';
import { parseExpression } from '@babel/parser';

type Values = Record<string, unknown>;
type Component = {type?: string; name?: string; id?: string; properties?: Values; styles?: Values};
const value = (o: Values | undefined, key: string): unknown => {
  const v = o?.[key];
  return v && typeof v === 'object' && 'value' in v ? (v as {value:unknown}).value : v;
};
const positive = (v: unknown): boolean => {
  if (typeof v === 'number') return v > 0;
  if (typeof v !== 'string') return false;
  const literal = v.replace(/^\{\{\s*(\d*\.?\d+)\s*\}\}$/, '$1');
  return /^\s*\d*\.?\d+(?:px|em|rem|%)?\s*$/.test(literal) && parseFloat(literal) > 0;
};
function horizontal(style: Record<string,string>, key: string): boolean {
  const parts = (style[key] ?? '').trim().split(/\s+/);
  return positive(parts.length === 1 ? parts[0] : parts[1]) || positive(parts[3]) ||
    positive(style[key+'-left']) || positive(style[key+'-right']) || positive(style[key+'-inline']) ||
    positive(style[key+'-inline-start']) || positive(style[key+'-inline-end']);
}

// Reconstruct only the static markup around interpolated values. Never execute
// a binding or descend into callbacks/conditionals to guess the chosen branch.
function concatenatedMarkup(body: string): string | undefined {
  type Ast = {type:string; value?:string; operator?:string; left?:Ast; right?:Ast; quasis?:{value:{cooked?:string}}[]};
  let ast: Ast;
  try { ast = parseExpression(body) as unknown as Ast; } catch { return; }
  if (ast.type !== 'StringLiteral' && ast.type !== 'TemplateLiteral' && !(ast.type === 'BinaryExpression' && ast.operator === '+')) return;
  const render = (n:Ast):string => n.type === 'StringLiteral' ? n.value ?? '' :
    n.type === 'TemplateLiteral' ? (n.quasis ?? []).map(q=>q.value.cooked ?? '').join('VALUE') :
    n.type === 'BinaryExpression' && n.operator === '+' ? render(n.left!) + render(n.right!) : 'VALUE';
  return render(ast);
}

/** Layout advisories only. Do not rewrite deliberate insets, alignment or branding. */
export function lintSurfaceInsets(c: Component): string[] {
  if (c.type === 'Html') {
    const raw = value(c.properties, 'rawHtml');
    if (typeof raw !== 'string') return [];
    const roots = parseHtml(stripHtmlBindings(raw).html).children.filter(n => n.tag !== '#text' || n.text.trim());
    if (roots.length !== 1 || roots[0]!.tag === '#text') return [];
    const root = roots[0]!;
    if (!horizontal(root.style, 'padding') && !horizontal(root.style, 'margin')) return [];
    const paintedChild = root.children.some(n => n.tag !== '#text' && (n.style.background || n.style['background-color'] || n.style.border));
    if (!paintedChild) return [];
    return [`Html "${c.name ?? c.id}": the background-covering root has horizontal padding/margin around a painted child surface. This shrinks its visible edges inside the component box. If it should align with adjacent native surfaces, keep the root horizontal inset at zero and put text padding inside the painted child. Preserve intentional insets/shadow clearance when browser-verified; this is advisory, not a full-width requirement.`];
  }
  if (c.type !== 'Text') return [];
  const background = value(c.styles, 'backgroundColor');
  if (typeof background !== 'string' || !background.trim() || /transparent|^#(?:[0-9a-f]{6}00|0000)$|^rgba\([^)]*,\s*0\s*\)/i.test(background)) return [];
  const radius = value(c.styles, 'borderRadius');
  if (!positive(radius)) return [];
  const alignment = value(c.styles, 'textAlign');
  if (alignment != null && !['left', 'start', ''].includes(String(alignment))) return [];
  const raw = value(c.properties, 'text');
  if (typeof raw !== 'string' || !raw.trim()) return [];
  // Conditional HTML/CSS cannot be reliably assessed by this small static check.
  let markup = raw;
  for (const span of [...bindingSpans(raw)].reverse()) {
    if (!/<[a-z]/i.test(span.body)) continue;
    const known = concatenatedMarkup(span.body);
    if (known === undefined) return [];
    markup = markup.slice(0, span.start) + known + markup.slice(span.end);
  }
  const tree = parseHtml(stripHtmlBindings(markup).html);
  type Node = typeof tree;
  const unknownOrInset = (n: Node): boolean => Boolean(n.attrs.class || n.style['text-indent'] ||
    ['padding','padding-inline','padding-inline-start','padding-inline-end','padding-left','padding-right','margin','margin-inline','margin-left','margin-right'].some(k => n.style[k] && !/^0(?:px)?$/.test(n.style[k]!)) ||
    ['center','right','end'].includes(n.style['text-align'] ?? '') || n.children.some(unknownOrInset));
  if (unknownOrInset(tree)) return [];
  return [`Text "${c.name ?? c.id}": left-aligned text sits on a rounded colored surface without an authored content inset. Native Text's styles.padding does not add inner text padding. Use padded HTML content (with enough height), inset native Text within a Container, or center a compact metric when appropriate. Keep transparent headings/plain labels unchanged; verify the visible text-to-card edge spacing.`];
}
