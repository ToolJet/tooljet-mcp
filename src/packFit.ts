/* UI 2.0 widgets in a planned batch are saved at the height the app draws them (packHeights.ts), as the page compiler
   saves the widgets it places. The editor draws the saved height, while the app fits these widgets to their content:
   a plan's 120px ShadStat drew 124 and a 340px record list of three rows drew 188, so the editor showed a band (or cut
   the content off) the app does not, and every section below sat elsewhere there (2026-10-22).

   Only a height that depends on nothing but the plan is set: a text bound to data, a list fed by a query, or a widget
   whose drawn width is not known here (a filling child of a flex row) keeps the planned height. Siblings below a
   grid-placed widget move with its new bottom. polishFlexRows runs this before it fits the FlexContainers. */
import type { ComponentSpec } from './tooljetClient.js';
import { drawnPackHeight, type PackHeightInput } from './packHeights.js';
import { packDefaultDefinition } from './packDefaults.js';
import { moveBelow } from './flexFit.js';

/** Drawn px of one grid column on a page (the page compiler's reference, a 1440px window). */
const VIEWER_COLUMN_PX = 32.2;
const GRID_COLUMNS = 43;
/** Widgets whose drawn height follows their width (wrapping text, an image's aspect, cards a row). */
const WIDTH_SENSITIVE = new Set(['ShadText', 'ShadHeading', 'ShadAlert', 'ShadCardGrid', 'ShadImage', 'ShadSwitch', 'ShadCheckbox',
  'ShadInput', 'ShadSelect', 'ShadDatePicker', 'ShadNumberInput', 'ShadCurrencyInput', 'ShadMultiselect', 'ShadCombobox',
  'ShadPasswordInput', 'ShadPhoneInput', 'ShadTimePicker', 'ShadDateTimePicker', 'ShadTagsInput', 'ShadOtpInput', 'ShadColorPicker']);
type Rect = NonNullable<ComponentSpec['layout']> & { fillWidth?: boolean; widthPx?: number };

const valueOf = (entry: unknown): unknown =>
  entry && typeof entry === 'object' && !Array.isArray(entry) && 'value' in (entry as Record<string, unknown>)
    ? (entry as Record<string, unknown>).value
    : entry;
const asText = (v: unknown): string | undefined =>
  v === undefined || v === null ? undefined : typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : JSON.stringify(v);
/** Items of a written list: a JSON array, or `{{[...]}}` written out. Undefined when the list is computed. */
const listCount = (raw: string | undefined): number | undefined => {
  if (raw === undefined) return undefined;
  const bare = raw.trim().replace(/^\{\{\s*|\s*\}\}$/g, '').trim();
  if (!bare.startsWith('[') || !bare.endsWith(']')) return undefined;
  try {
    const parsed = JSON.parse(bare.replace(/'/g, '"'));
    return Array.isArray(parsed) ? parsed.length : undefined;
  } catch {
    // A JavaScript array literal: count its top-level items.
    let depth = 0;
    let items = 0;
    let any = false;
    let quote = '';
    for (const ch of bare.slice(1, -1)) {
      if (quote) { if (ch === quote) quote = ''; continue; }
      if (ch === '"' || ch === "'" || ch === '`') quote = ch;
      else if ('([{'.includes(ch)) depth += 1;
      else if (')]}'.includes(ch)) depth -= 1;
      else if (ch === ',' && depth === 0) items += 1;
      if (!/\s/.test(ch)) any = true;
    }
    return any ? items + 1 : 0;
  }
};

export interface PackFitNote {
  component: ComponentSpec;
  was: number;
  moved: number;
}

/** Sets planned UI 2.0 widgets to their drawn heights; returns what it changed, for reportPackHeights once the
 *  containers are fitted too (a stat card is then stretched to its row's line). */
export function fitPackHeights(components: ComponentSpec[]): PackFitNote[] {
  const notes: PackFitNote[] = [];
  const byRef = new Map<string, ComponentSpec>();
  for (const c of components) if (c && (c.clientRef ?? c.name)) byRef.set((c.clientRef ?? c.name)!, c);
  const rectOf = (c: ComponentSpec) => (c.layouts?.desktop ?? c.layout) as Rect | undefined;
  /** The px a component is drawn at, when it is known: a page-level width, a fixed flex width, or a share of a grid
   *  parent whose own width is known. */
  const drawnWidth = (c: ComponentSpec, depth = 0): number | undefined => {
    const rect = rectOf(c);
    if (!rect || depth > 20) return undefined;
    const parent = c.parentRef ? byRef.get(c.parentRef) : undefined;
    if (parent?.type === 'FlexContainer') return rect.fillWidth === false && typeof rect.widthPx === 'number' ? rect.widthPx : undefined;
    if (typeof rect.width !== 'number') return undefined;
    if (!c.parentRef && !(c as { parent?: unknown }).parent) return rect.width * VIEWER_COLUMN_PX;
    const outer = parent ? drawnWidth(parent, depth + 1) : undefined;
    return outer === undefined ? undefined : (rect.width / GRID_COLUMNS) * outer;
  };
  for (const c of components) {
    if (!c || !c.type?.startsWith('Shad')) continue;
    const rect = rectOf(c);
    if (!rect || typeof rect.height !== 'number') continue;
    const width = drawnWidth(c);
    if (width === undefined && WIDTH_SENSITIVE.has(c.type)) continue;
    const props = (c.properties ?? {}) as Record<string, unknown>;
    // What the plan leaves unset is saved as the widget's default definition (packDefaults.ts), samples blanked.
    const defaults = (packDefaultDefinition(c.type)?.properties ?? {}) as Record<string, unknown>;
    const raw = (key: string): string | undefined => {
      const v = asText(valueOf(key in props ? props[key] : defaults[key]));
      return key in props || (v !== undefined && v !== '') ? v : undefined;
    };
    const input: PackHeightInput = {
      type: c.type,
      widthPx: width ?? 300,
      attr: raw,
      has: (key) => key in props && (asText(valueOf(props[key])) ?? '').trim() !== '',
      text: (key) => {
        const t = raw(key);
        if (t === undefined) return undefined;
        const bound = t.includes('{{');
        // A binding reads as a typical value of eight characters.
        return { text: t.replace(/\{\{[\s\S]*?\}\}/g, '00000000'), bound };
      },
      count: (key) => listCount(raw(key)),
      itemsHave: (key, field) => new RegExp(`["']?${field}["']?\\s*:\\s*(?!["']{2}|null\\b)`).test(raw(key) ?? ''),
    };
    const drawn = drawnPackHeight(input);
    // Only a height the plan alone decides: data from a query, or a bound text, is the author's to size.
    if (!drawn?.exact || drawn.height === rect.height) continue;
    const parent = c.parentRef ? byRef.get(c.parentRef) : undefined;
    const was = rect.height;
    [c.layout, c.layouts?.desktop].forEach((r) => {
      if (r && typeof r.height === 'number') r.height = drawn.height;
    });
    const moved = parent?.type === 'FlexContainer' ? 0 : moveBelow(components, c, was, drawn.height);
    notes.push({ component: c, was, moved });
  }
  return notes;
}

/** The warnings for what fitPackHeights changed, by the height each widget ends at. */
export function reportPackHeights(notes: PackFitNote[], warnings: string[]): void {
  for (const { component: c, was, moved } of notes) {
    const now = Number((c.layouts?.desktop ?? c.layout)?.height);
    if (!Number.isFinite(now) || now === was) continue;
    warnings.push(
      `${c.type} "${c.name}" was ${was}px tall; it is now ${now}px, the height the app draws it at (it fits its content there), ` +
        `so the editor draws it the same${moved ? ` (${moved} component${moved > 1 ? 's' : ''} below it moved ${now < was ? 'up' : 'down'} ${Math.abs(now - was)}px)` : ''}.`
    );
  }
}
