/* A section taller than what it holds (Restaurant POS, 2026-10-11: a 1500px row around two ~900px cards drew a tall
   empty panel under them). A FlexContainer that is not a card keeps its authored height as a floor in the viewer even
   with dynamic height on (FlexContainer.jsx: minHeight = height), so the band below its content never closes; a card
   (cardStyle shadcnCard) fits its content and is exempt. Advisory: children's heights are the authored estimates. */
import { decodeComponentParent } from './componentParent.js';

interface Rect { top?: number; width?: number; height?: number }
interface Spec {
  id?: string;
  name?: string;
  type?: string;
  clientRef?: string;
  parentRef?: string;
  parent?: string;
  properties?: Record<string, unknown>;
  layout?: Rect;
  layouts?: { desktop?: Rect };
}

const valueOf = (props: Record<string, unknown> | undefined, key: string): unknown => {
  const entry = props?.[key] as { value?: unknown } | undefined;
  return entry && typeof entry === 'object' && 'value' in entry ? entry.value : entry;
};
const num = (value: unknown, fallback: number): number => {
  const text = typeof value === 'string' ? value.replace(/[{}\s]/g, '').replace(/px$/, '') : value;
  const n = typeof text === 'number' ? text : typeof text === 'string' && text !== '' ? Number(text) : NaN;
  return Number.isFinite(n) ? n : fallback;
};
const flag = (value: unknown): boolean | undefined => {
  if (value === true || value === false) return value;
  const text = typeof value === 'string' ? value.replace(/[{}\s]/g, '') : '';
  return text === 'true' ? true : text === 'false' ? false : undefined;
};
const height = (c: Spec): number => (c.layouts?.desktop ?? c.layout)?.height ?? 0;
const isCard = (c: Spec): boolean => valueOf(c.properties, 'cardStyle') === 'shadcnCard';
// Overlays take no room in the page flow.
const OVERLAYS = new Set(['ModalV2', 'Modal', 'ShadDialog']);
const CARD_HEADER_PX = 56;
const GRID_COLUMNS = 43;
const MIN_EMPTY_PX = 160;
const MIN_RATIO = 1.2;

function parentOf(c: Spec): string | undefined {
  if (c.parentRef) return c.parentRef;
  return c.parent ? decodeComponentParent(c.parent).parentId : undefined;
}

export function lintTallContainers(components: Spec[]): string[] {
  const byParent = new Map<string, Spec[]>();
  for (const c of components) {
    const parent = parentOf(c);
    if (!parent || OVERLAYS.has(c.type ?? '')) continue;
    byParent.set(parent, [...(byParent.get(parent) ?? []), c]);
  }
  const childrenOf = (c: Spec): Spec[] => {
    const seen = new Set<Spec>();
    for (const ref of [c.clientRef, c.id, c.name]) for (const child of ref ? byParent.get(ref) ?? [] : []) seen.add(child);
    return [...seen];
  };

  // A row's lines: a wrapping row packs its children by width (columns of its 43-column grid), the others keep one line.
  const lines = (c: Spec, children: Spec[]): Spec[][] => {
    if (!flag(valueOf(c.properties, 'flexWrap'))) return [children];
    const packed: Spec[][] = [];
    let used = GRID_COLUMNS + 1;
    for (const child of children) {
      const width = (child.layouts?.desktop ?? child.layout)?.width ?? GRID_COLUMNS;
      if (used + width > GRID_COLUMNS) { packed.push([]); used = 0; }
      packed[packed.length - 1]!.push(child);
      used += width;
    }
    return packed;
  };
  // What the children need when every plain container below is cut to its content: the height to recommend.
  const fitted = (c: Spec, depth = 0): number => {
    const children = depth > 20 ? [] : childrenOf(c);
    if (!children.length) return height(c);
    if (c.type === 'Container') {
      return Math.max(...children.map((child) => ((child.layouts?.desktop ?? child.layout)?.top ?? 0) + fitted(child, depth + 1))) + 10;
    }
    if (c.type !== 'FlexContainer') return height(c);
    const props = c.properties;
    const padding = num(valueOf(props, 'padding'), 12);
    const gap = num(valueOf(props, 'gap'), 12);
    const row = String(valueOf(props, 'direction') ?? 'column') === 'row';
    const heights = children.map((child) => fitted(child, depth + 1));
    const content = row
      ? lines(c, children).reduce((sum, line, i) => sum + (i ? gap : 0) + Math.max(...line.map((child) => heights[children.indexOf(child)]!)), 0)
      : heights.reduce((sum, h) => sum + h, 0) + gap * (children.length - 1);
    const header = isCard(c) && (valueOf(props, 'cardTitle') || valueOf(props, 'cardDescription')) ? CARD_HEADER_PX : 0;
    return Math.ceil(content + 2 * padding + header);
  };

  const warnings: string[] = [];
  for (const c of components) {
    if (c.type !== 'FlexContainer' && c.type !== 'Container') continue;
    if (c.type === 'FlexContainer' && isCard(c)) continue;
    const props = c.properties;
    const dynamic = flag(valueOf(props, 'dynamicHeight'));
    // A native Container with dynamic height on fits its content; a FlexContainer does not shrink below its height.
    if (c.type === 'Container' && dynamic) continue;
    if (!childrenOf(c).length) continue;
    // A wrapping row that needs more than one line depends on the viewer's width (and its cards' minimum widths): no estimate.
    if (c.type === 'FlexContainer' && String(valueOf(props, 'direction') ?? 'column') === 'row' && lines(c, childrenOf(c)).length > 1) continue;
    const authored = height(c);
    const content = fitted(c);
    if (authored - content < MIN_EMPTY_PX || authored < content * MIN_RATIO) continue;
    const target = Math.ceil(content / 10) * 10;
    warnings.push(
      `${c.type} "${c.name ?? c.clientRef ?? c.id ?? '?'}": ${authored}px tall, but its children need about ${content}px, so it draws ` +
        `about ${authored - content}px of empty space below them. ` +
        (c.type === 'FlexContainer'
          ? 'A container that is not a card keeps its authored height as its minimum even with dynamic height on. '
          : '') +
        `Set its height to about ${target}px` +
        (dynamic === false || (c.type === 'Container' && !dynamic) ? ' and dynamicHeight to {{true}} so it still grows with its content.' : '; dynamic height still lets it grow.')
    );
  }
  return warnings;
}
