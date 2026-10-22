/* FlexContainer heights as the app draws them, for a planned batch (polishFlexRows runs this on lint and apply alike).

   The editor draws every FlexContainer at its saved height. The app (the viewer) fits a card, and a row in the UI 2.0
   layout, to its content, whatever height is saved (ToolJet frontend dynamicHeightPolicy.fitsContentInView and
   dynamicHeightReflowFlexContainer.resolveFlexContainerHeight); any other container with dynamic height on grows to its
   content and keeps its saved height as a floor. A row saved at ToolJet's 300px default around 150px of content showed
   an empty band in the editor only, and the next section started that much lower there (2026-10-22).

   So each container whose children all have a planned height is saved at:
     content + padding x 2 + box padding (2px a side) + border (1px a side) + card header (48px, 70px with a description)
   where the content is the children summed with the gap between them in a column, and each flex line's tallest child
   (with the gap between lines) in a row. A card or a UI 2.0 row is set to exactly that; any other container with
   dynamic height is only raised to it. The cards of an Equal heights row share their line's height, as the app
   stretches them. Siblings below a grid-placed container move with its new bottom, so no gap or overlap opens. */
import type { ComponentSpec } from './tooljetClient.js';

/** The widget box padding around every FlexContainer (frontend appCanvasConstants BOX_PADDING) unless its padding style
 *  is 'none', and its border (SUBCONTAINER_CANVAS_BORDER_WIDTH; a card's 1px border). */
const BOX_PADDING_PX = 2;
const BORDER_PX = 1;
/** The card header (frontend flexContainer.utils.js flexCardHeaderPx). */
const CARD_HEADER_PX = { title: 48, withDescription: 70 };
/** Unset properties are the widget definition's defaults, which ToolJet merges into a saved FlexContainer: a row that
 *  wraps, 12px gap and padding, Equal heights on. */
const DEFAULT_GAP = 12;
const DEFAULT_PADDING = 12;
/** The canvas widths a page-level row's line packing is judged at: the page compiler's layout width, and a 1600px
 *  window with the page menu collapsed (the canvas takes the whole window). */
const CANVAS_PX = { narrow: 1100, wide: 1600 };
const GRID_COLUMNS = 43;
const DIALOG_TYPES = new Set(['ShadDialog', 'ModalV2', 'Modal']);

type Rect = NonNullable<ComponentSpec['layout']> & { fillWidth?: boolean; widthPx?: number; minWidthPx?: number };

const valueOf = (entry: unknown): unknown =>
  entry && typeof entry === 'object' && !Array.isArray(entry) && 'value' in (entry as Record<string, unknown>)
    ? (entry as Record<string, unknown>).value
    : entry;
const text = (entry: unknown): string => {
  const v = valueOf(entry);
  return typeof v === 'string' ? v.trim() : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';
};
const prop = (c: ComponentSpec, key: string): string =>
  text(c.properties && typeof c.properties === 'object' ? (c.properties as Record<string, unknown>)[key] : undefined);
const style = (c: ComponentSpec, key: string): string =>
  text(c.styles && typeof c.styles === 'object' ? (c.styles as Record<string, unknown>)[key] : undefined);
const bool = (raw: string, fallback: boolean): boolean => {
  const bare = raw.replace(/[{}\s]/g, '').toLowerCase();
  return bare === 'true' ? true : bare === 'false' ? false : fallback;
};
const num = (raw: string, fallback: number): number => {
  const n = Number(raw.replace(/[{}\s]/g, '').replace(/px$/, ''));
  return raw === '' || !Number.isFinite(n) ? fallback : n;
};
const refOf = (c: ComponentSpec): string | undefined => c.clientRef ?? c.name;
const rectsOf = (c: ComponentSpec): Rect[] =>
  [c.layout, c.layouts?.desktop].filter((r, i, all): r is Rect => !!r && typeof r.height === 'number' && all.indexOf(r) === i);
const heightOf = (c: ComponentSpec): number => Number((c.layouts?.desktop ?? c.layout)?.height ?? NaN);
const setHeight = (c: ComponentSpec, height: number): void => rectsOf(c).forEach((r) => (r.height = height));

/** Fits the batch's FlexContainers (mutating their layouts) and returns the ones whose height it set. */
export function fitFlexHeights(components: ComponentSpec[], warnings: string[]): Set<ComponentSpec> {
  const fitted = new Set<ComponentSpec>();
  const byRef = new Map<string, ComponentSpec>();
  for (const c of components) if (c && refOf(c)) byRef.set(refOf(c)!, c);
  const childrenOf = (ref: string) => components.filter((c) => c && c.parentRef === ref && !c.slotName);
  const depth = (c: ComponentSpec): number => {
    let d = 0;
    for (let p = c.parentRef; p && d < 20; p = byRef.get(p)?.parentRef) d += 1;
    return d;
  };
  const isCard = (c: ComponentSpec) => c.type === 'FlexContainer' && prop(c, 'cardStyle') === 'shadcnCard';
  // The definition's direction is row; a container saved before the UI 2.0 layout keeps the lts-3.16 one, but the MCP
  // creates every container with layoutVersion '2'.
  const directionOf = (c: ComponentSpec) => prop(c, 'direction') || 'row';
  const layoutV2 = (c: ComponentSpec) => prop(c, 'layoutVersion') === '' || num(prop(c, 'layoutVersion'), 2) >= 2;
  // A hidden child takes no space in the UI 2.0 layout, nor does a dialog (it opens apart).
  const inFlow = (c: ComponentSpec) => !DIALOG_TYPES.has(c.type) && bool(prop(c, 'visibility'), true);

  const boxes = components.filter((c) => c && c.type === 'FlexContainer').sort((a, b) => depth(b) - depth(a));
  const original = new Map(boxes.map((c) => [c, heightOf(c)]));
  const notes: Array<{ box: ComponentSpec; kind: string; moved: number }> = [];
  for (const box of boxes) {
    const rects = rectsOf(box);
    const ref = refOf(box);
    if (!rects.length || !ref) continue;
    const inner = childrenOf(ref).filter(inFlow);
    if (!inner.length || inner.some((c) => !Number.isFinite(heightOf(c)))) continue;
    const row = directionOf(box) === 'row';
    const card = isCard(box);
    const fitsContent = layoutV2(box) && (card || row);
    // With dynamic height off a plain column keeps its drawn height (and scrolls); the MCP turns it on when unset.
    if (!fitsContent && !bool(prop(box, 'dynamicHeight'), true)) continue;
    const gap = num(prop(box, 'gap'), DEFAULT_GAP);
    const padding = num(prop(box, 'padding'), DEFAULT_PADDING);

    let lines: ComponentSpec[][];
    if (!row) {
      lines = inner.map((c) => [c]);
    } else {
      // The browser packs a wrapping row's children at their minimum widths (a fill child) or own widths (a fixed one);
      // fill children with no minimum always share one line.
      const lineWidth = (c: ComponentSpec): number => {
        const r = (c.layouts?.desktop ?? c.layout) as Rect | undefined;
        if (r?.fillWidth === false && typeof r.widthPx === 'number') return r.widthPx;
        return typeof r?.minWidthPx === 'number' ? r.minWidthPx : 0;
      };
      const widths = inner.map(lineWidth);
      const wraps = bool(prop(box, 'flexWrap'), true);
      if (!wraps || widths.every((w) => w === 0)) {
        lines = [inner];
      } else {
        // A page-level row is packed at the narrowest and widest canvas it is commonly drawn on; when the two give
        // different lines, its height depends on the window, and it is left as drawn. A nested row's width is not known
        // here, so it is left as drawn too.
        const pageLevel = !box.parentRef && !(box as { parent?: unknown }).parent;
        if (!pageLevel) continue;
        const pack = (canvasPx: number): ComponentSpec[][] => {
          const available = ((rects[0]!.width ?? GRID_COLUMNS) / GRID_COLUMNS) * canvasPx - padding * 2;
          const packed: ComponentSpec[][] = [];
          let used = 0;
          inner.forEach((c, i) => {
            const w = Math.min(widths[i]!, available);
            const current = packed[packed.length - 1];
            if (!current || used + gap + w > available) {
              packed.push([c]);
              used = w;
            } else {
              current.push(c);
              used += gap + w;
            }
          });
          return packed;
        };
        const narrow = pack(CANVAS_PX.narrow);
        const wide = pack(CANVAS_PX.wide);
        if (narrow.length !== wide.length || narrow.some((line, i) => line.length !== wide[i]!.length)) continue;
        lines = narrow;
      }
      // The cards of an Equal heights row (the default) or one aligned to stretch fill their line's height in the app;
      // the editor draws the saved height, so each card is saved at its line's.
      const stretches = prop(box, 'alignItems') === 'stretch' || bool(prop(box, 'equalHeights'), true);
      if (stretches) {
        for (const line of lines) {
          if (line.length < 2) continue;
          const tallest = Math.max(...line.map(heightOf));
          for (const c of line) if (isCard(c) && heightOf(c) < tallest) setHeight(c, tallest);
        }
      }
    }

    const content = lines.reduce((sum, line) => sum + Math.max(...line.map(heightOf)), 0) + gap * (lines.length - 1);
    const title = prop(box, 'cardTitle');
    const extra = prop(box, 'cardExtra');
    const header = card && (title || extra) ? (extra ? CARD_HEADER_PX.withDescription : CARD_HEADER_PX.title) : 0;
    const boxPadding = style(box, 'padding') === 'none' ? 0 : BOX_PADDING_PX;
    const needed = Math.ceil(content + padding * 2 + boxPadding * 2 + BORDER_PX * 2 + header);
    const was = heightOf(box);
    const target = fitsContent ? needed : Math.max(needed, was);
    if (target === was) continue;
    setHeight(box, target);
    fitted.add(box);

    // What sits below a grid-placed container moves with its bottom; in a flex parent the browser lays it out.
    const parent = box.parentRef ? byRef.get(box.parentRef) : undefined;
    let moved = 0;
    if (parent?.type !== 'FlexContainer') {
      const placeOf = (c: ComponentSpec) => `${c.parentRef ?? (c as { parent?: unknown }).parent ?? ''}|${c.slotName ?? ''}`;
      const top = (box.layouts?.desktop ?? box.layout)?.top;
      if (typeof top === 'number') {
        const oldBottom = top + was;
        const dy = target - was;
        for (const other of components) {
          if (!other || other === box || placeOf(other) !== placeOf(box) || DIALOG_TYPES.has(other.type)) continue;
          const otherRects = [other.layout, other.layouts?.desktop].filter(
            (r, i, all): r is Rect => !!r && typeof r.top === 'number' && all.indexOf(r) === i
          );
          if (!otherRects.length || otherRects[0]!.top! < oldBottom - 1) continue;
          otherRects.forEach((r) => (r.top = r.top! + dy));
          moved += 1;
        }
      }
    }
    notes.push({ box, kind: card ? 'Card' : row ? 'Row' : 'Container', moved });
  }
  // Reported by the height each container ends at: a card fitted on its own may be stretched back to its row's line.
  for (const { box, kind, moved } of notes) {
    const was = original.get(box)!;
    const now = heightOf(box);
    if (now === was) {
      fitted.delete(box);
      continue;
    }
    const shifted = moved ? ` (${moved} component${moved > 1 ? 's' : ''} below it moved ${now < was ? 'up' : 'down'} ${Math.abs(now - was)}px)` : '';
    warnings.push(
      now < was
        ? `${kind} "${box.name}" was ${was}px tall; it is now ${now}px, the height the app draws it at, so the editor shows no ` +
            `empty band under it${shifted}.`
        : `${kind} "${box.name}" was ${was}px tall; it is now ${now}px, the height the app draws it at, so the editor does not ` +
            `cut its content off${shifted}.`
    );
  }
  return fitted;
}
