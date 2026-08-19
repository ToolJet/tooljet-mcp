// Mechanical, catalog-independent checks that catch the render bugs the skill can only *advise*
// against. Used by add_component(s) (component-level, pre-write) and validate_app (whole-app,
// post-write). Errors block; warnings are surfaced to the agent but don't block.
import type { AppSummary } from './tooljetClient.js';
import { getComponentSchema } from './catalog.js';
import { COMPONENT_SLOT_NAMES, decodeComponentParent, type ComponentSlotName } from './componentParent.js';
import {
  FORM_SCHEMA_FIELD_TYPE_SET,
  SAFE_GENERATED_FORM_FIELD_TYPE_SET,
} from './formFieldTypes.js';

export interface LintResult {
  errors: string[];
  warnings: string[];
}

/** Style-ish keys ToolJet's renderer reads from `definition.styles`, NOT `properties` — placing them
 *  under `properties` is silently dropped. Single source of truth (also used by the client DTO builder). */
export const STYLE_KEYS_IN_PROPERTIES = new Set([
  'styles',
  'textSize',
  'fontWeight',
  'textColor',
  'backgroundColor',
  'borderColor',
  'borderRadius',
  'boxShadow',
  'textAlign',
  'fontVariant',
  'padding',
  'accentColor',
  'iconColor',
]);

/** ToolJet Table column header casing — the ONLY valid values (table.js: 'As typed' / 'AA'). */
export const VALID_HEADER_CASING = new Set(['none', 'uppercase']);

/** Form inputs that carry a label \`alignment\` style ('side' default / 'top'). A narrow one with a
 *  side label wastes most of its width on the label — warn and suggest top alignment. */
export const FORM_INPUT_TYPES = new Set([
  'TextInput',
  'NumberInput',
  'CurrencyInput',
  'PasswordInput',
  'EmailInput',
  'PhoneInput',
  'TextArea',
  'DropdownV2',
  'MultiselectV2',
  'DatePickerV2',
  'DatetimePickerV2',
  'TimePicker',
  'TreeSelect',
  'RadioButtonV2',
]);

/** Exact ToolJet INPUT_COMPONENTS_FOR_FORM list. When one of these widgets uses a top-aligned
 * label, the canvas renderer adds TOP_ALIGNMENT_HEIGHT_INCREMENT (20px) to its authored height. */
export const TOP_ALIGNED_INPUT_TYPES = new Set([
  'TextInput',
  'PasswordInput',
  'EmailInput',
  'PhoneInput',
  'CurrencyInput',
  'NumberInput',
  'DropdownV2',
  'MultiselectV2',
  'Cascader',
  'RadioButtonV2',
  'DatetimePickerV2',
  'Checkbox',
  'ToggleSwitchV2',
  'DatePickerV2',
  'TimePicker',
  'DaterangePicker',
  'TextArea',
  'StarRating',
  'TagsInput',
  'ColorPicker',
  'ButtonGroupV2',
]);
export const TOP_ALIGNMENT_HEIGHT_INCREMENT = 20;
/** At or below this width (grid columns), a side-aligned label leaves too little room for the input. */
const NARROW_SIDE_LABEL_COLS = 18;
const STATISTICS_VALUE_ONLY_MIN_WIDTH_COLS = 12;
const STATISTICS_WITH_SECONDARY_MIN_WIDTH_COLS = 18;
const TABLE_REGULAR_ROW_HEIGHT_PX = 46;
const TABLE_CONDENSED_ROW_HEIGHT_PX = 40;
const TABLE_COLUMN_HEADER_HEIGHT_PX = 40;
const TABLE_TOOLBAR_HEIGHT_PX = 56;
const TABLE_FOOTER_HEIGHT_PX = 56;
const TABLE_BORDER_PX = 2;
const SLOT_PARENT_TYPES = new Set(['ModalV2', 'Form', 'Container']);

interface Rect {
  top?: number;
  left?: number;
  width?: number;
  height?: number;
}
export interface LintComponent {
  id?: string;
  name?: string;
  type?: string;
  properties?: Record<string, unknown>;
  styles?: Record<string, unknown>;
  layout?: Rect;
  layouts?: { desktop?: Rect; mobile?: Rect };
  clientRef?: string;
  parentRef?: string;
  parent?: string;
  slotName?: ComponentSlotName;
}

/** Read a property whose value is wrapped as `{ value: X }` (ToolJet's shape), or a bare value. */
function propVal(props: Record<string, unknown> | undefined, key: string): unknown {
  const p = props?.[key] as { value?: unknown } | undefined;
  return p && typeof p === 'object' && 'value' in p ? p.value : p;
}

function projectedTableDataKeys(value: unknown): string[] | undefined {
  if (typeof value !== 'string' || !/\.map\s*\(/.test(value)) return undefined;
  const arrowObject = value.match(/=>\s*\(\s*\{/);
  const returnedObject = value.match(/=>\s*\{[\s\S]*?\breturn\s*\{/);
  const projection = arrowObject ?? returnedObject;
  if (projection?.index === undefined) return undefined;
  const objectOffset = projection[0].lastIndexOf('{');
  if (objectOffset < 0) return undefined;
  const objectStart = projection.index + objectOffset;

  const chunks: string[] = [];
  let chunkStart = objectStart + 1;
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;
  let quote: '"' | "'" | '`' | undefined;
  let escaped = false;
  for (let index = objectStart + 1; index < value.length; index++) {
    const char = value[index]!;
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = undefined;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') braceDepth++;
    else if (char === '}') {
      if (braceDepth === 0) {
        chunks.push(value.slice(chunkStart, index));
        break;
      }
      braceDepth--;
    } else if (char === '[') bracketDepth++;
    else if (char === ']') bracketDepth--;
    else if (char === '(') parenDepth++;
    else if (char === ')') parenDepth--;
    else if (char === ',' && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
      chunks.push(value.slice(chunkStart, index));
      chunkStart = index + 1;
    }
  }
  if (!chunks.length) return undefined;

  const keys: string[] = [];
  for (const rawChunk of chunks) {
    const chunk = rawChunk.trim();
    if (!chunk) continue;
    // A top-level spread preserves every source key, so the projection is not closed.
    if (chunk.startsWith('...') || chunk.startsWith('[')) return undefined;
    const identifier = chunk.match(/^([A-Za-z_$][\w$]*)\s*(?::|$)/);
    if (identifier) {
      keys.push(identifier[1]!);
      continue;
    }
    const quoted = chunk.match(/^(?:"([^"]+)"|'([^']+)')\s*:/);
    const quotedKey = quoted?.[1] ?? quoted?.[2];
    if (quotedKey !== undefined) {
      keys.push(quotedKey);
      continue;
    }
    return undefined;
  }
  return keys;
}

function explicitlyProjectsTableData(value: unknown): boolean {
  return projectedTableDataKeys(value) !== undefined;
}

function explicitlyProjectsObjectData(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const expression = value.trim().replace(/^\{\{\s*/, '').replace(/\s*\}\}$/, '').trim();
  const directObject = /^\(*\s*\{/.test(expression);
  const returnedObject = /\breturn\s*\{/.test(expression);
  return (directObject || returnedObject) && !expression.includes('...');
}

function visibilityExpression(component: LintComponent): string | undefined {
  const value = propVal(component.properties, 'visibility');
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.startsWith('{{') && trimmed.endsWith('}}')
    ? trimmed.slice(2, -2).trim()
    : undefined;
}

function stripOuterParens(value: string): string {
  let result = value;
  while (result.startsWith('(') && result.endsWith(')')) {
    let depth = 0;
    let enclosesWholeExpression = true;
    for (let index = 0; index < result.length; index++) {
      if (result[index] === '(') depth++;
      if (result[index] === ')') depth--;
      if (depth === 0 && index < result.length - 1) {
        enclosesWholeExpression = false;
        break;
      }
    }
    if (!enclosesWholeExpression) break;
    result = result.slice(1, -1);
  }
  return result;
}

function rowsStateExpression(value: string): { query: string; state: 'empty' | 'present' } | undefined {
  const compact = value.replace(/\s+/g, '').replace(/[()]/g, '');
  const queries = [...compact.matchAll(/queries\.([A-Za-z_$][\w$]*)\.(?:isLoading|data)/g)]
    .map((match) => match[1]!);
  if (!queries.length || new Set(queries).size !== 1) return undefined;
  const query = queries[0]!;
  if (compact === `queries.${query}.isLoading||queries.${query}.data||[].length>0`) {
    return { query, state: 'present' };
  }
  if (compact === `!queries.${query}.isLoading&&queries.${query}.data||[].length===0`) {
    return { query, state: 'empty' };
  }
  return undefined;
}

/** Only suppress geometry warnings when two visibility bindings are provably disjoint. */
function mutuallyExclusiveVisibility(a: LintComponent, b: LintComponent): boolean {
  const aVisibility = propVal(a.properties, 'visibility');
  const bVisibility = propVal(b.properties, 'visibility');
  if (isFalseBinding(aVisibility) || isFalseBinding(bVisibility)) return true;
  const aExpression = visibilityExpression(a);
  const bExpression = visibilityExpression(b);
  if (!aExpression || !bExpression) return false;
  const aCompact = stripOuterParens(aExpression.replace(/\s+/g, ''));
  const bCompact = stripOuterParens(bExpression.replace(/\s+/g, ''));
  const negates = (left: string, right: string): boolean =>
    left.startsWith('!') && stripOuterParens(left.slice(1)) === stripOuterParens(right);
  if (negates(aCompact, bCompact) || negates(bCompact, aCompact)) return true;
  const aRowsState = rowsStateExpression(aExpression);
  const bRowsState = rowsStateExpression(bExpression);
  return !!aRowsState && !!bRowsState &&
    aRowsState.query === bRowsState.query && aRowsState.state !== bRowsState.state;
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function isTruthyBinding(v: unknown): boolean {
  return v === true || v === '{{true}}' || v === 'true';
}

function isFalseBinding(v: unknown): boolean {
  return v === false || v === '{{false}}' || v === 'false';
}

function differsFromCatalogDefault(type: string, key: string, value: unknown): boolean {
  if (value === undefined) return false;
  const defaultValue = getComponentSchema(type)?.properties.find((property) => property.key === key)?.default;
  return defaultValue === undefined || JSON.stringify(value) !== JSON.stringify(defaultValue);
}

function catalogValue(
  type: string,
  entries: Record<string, unknown> | undefined,
  key: string,
  section: 'properties' | 'styles' = 'properties'
): unknown {
  const authored = propVal(entries, key);
  if (authored !== undefined) return authored;
  return getComponentSchema(type)?.[section].find((entry) => entry.key === key)?.default;
}

function isDynamicBinding(value: unknown): boolean {
  return typeof value === 'string' && value.includes('{{');
}

function nestedMapInValue(value: unknown): boolean {
  if (typeof value === 'string') return value.includes('{{') && hasNestedMapCall(value);
  if (Array.isArray(value)) return value.some(nestedMapInValue);
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).some(nestedMapInValue);
  return false;
}

function unsafeEmptyArrayFirstRowFallback(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.includes('{{') && /\|\|\s*\[\s*\{\s*\}\s*\]\s*\)\s*\[\s*0\s*\]\s*\./.test(value);
  }
  if (Array.isArray(value)) return value.some(unsafeEmptyArrayFirstRowFallback);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(unsafeEmptyArrayFirstRowFallback);
  }
  return false;
}

/** ToolJet's component-expression evaluator can fail on a map call nested inside another map callback.
 * Distinguish true nesting from safe sequential chains such as rows.map(...).map(...). */
function hasNestedMapCall(source: string): boolean {
  const parenthesisStack: boolean[] = [];
  let quote: "'" | '"' | undefined;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (current === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (current === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (current === '\\') escaped = true;
      else if (current === quote) quote = undefined;
      continue;
    }
    if (current === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (current === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (current === "'" || current === '"') {
      quote = current;
      continue;
    }
    if (current === '(') {
      const isMapCall = /\.map\s*$/.test(source.slice(Math.max(0, index - 24), index));
      if (isMapCall && parenthesisStack.some(Boolean)) return true;
      parenthesisStack.push(isMapCall);
    } else if (current === ')') {
      parenthesisStack.pop();
    }
  }
  return false;
}

function staticNumber(v: unknown, fallback: number): number {
  return optionalStaticNumber(v) ?? fallback;
}

function optionalStaticNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const match = v.trim().match(/^(?:\{\{\s*)?(\d+(?:\.\d+)?)(?:\s*\}\})?(?:px)?$/);
    if (match) return Number(match[1]);
  }
  return undefined;
}

/** ToolJet adds 20px outside the authored layout box for a top-aligned labelled form input.
 * Missing label metadata is treated as the catalog default (labelType:auto), which also increments. */
export function renderedHeight(component: LintComponent, rect?: Rect): number {
  const layout = rect ?? component.layouts?.desktop ?? component.layout;
  const authored = layout?.height ?? 0;
  if (!TOP_ALIGNED_INPUT_TYPES.has(component.type ?? '')) return authored;
  if (propVal(component.styles, 'alignment') !== 'top') return authored;

  const labelType = propVal(component.properties, 'labelType');
  const label = propVal(component.properties, 'label');
  const hasRenderedLabel =
    labelType === undefined ||
    labelType === 'auto' ||
    label === undefined ||
    (typeof label === 'string' ? label.trim().length > 0 : Boolean(label));
  return authored + (hasRenderedLabel ? TOP_ALIGNMENT_HEIGHT_INCREMENT : 0);
}

/** Text renders inside 4px of canvas-wrapper padding plus its own 1px top/bottom border. A single
 * line therefore needs fontSize * lineHeight + 6 authored pixels or descenders are clipped. */
export function minimumTextHeight(component: LintComponent): number | undefined {
  if (component.type !== 'Text') return undefined;
  const dynamicHeight = propVal(component.properties, 'dynamicHeight');
  if (isTruthyBinding(dynamicHeight)) return undefined;
  if (typeof dynamicHeight === 'string' && /\{\{/.test(dynamicHeight) && !isFalseBinding(dynamicHeight)) return undefined;

  const textSizeValue = propVal(component.styles, 'textSize');
  const lineHeightValue = propVal(component.styles, 'lineHeight');
  const textSize = textSizeValue === undefined ? 14 : optionalStaticNumber(textSizeValue);
  const lineHeight = lineHeightValue === undefined ? 1.5 : optionalStaticNumber(lineHeightValue);
  if (textSize === undefined || lineHeight === undefined) return undefined;
  return Math.ceil(textSize * lineHeight + 6);
}

export function lintTextGeometry(components: LintComponent[]): string[] {
  const warnings: string[] = [];
  for (const component of components) {
    const minimum = minimumTextHeight(component);
    if (minimum === undefined) continue;
    const desktop = component.layouts?.desktop ?? component.layout;
    const mobile = component.layouts?.mobile ?? component.layout;
    const layouts: Array<[string, Rect]> = [];
    if (desktop) layouts.push([component.layouts?.desktop ? 'desktop' : 'layout', desktop]);
    if (mobile && mobile !== desktop) layouts.push(['mobile', mobile]);
    const undersized = layouts.filter(([, rect]) => typeof rect.height === 'number' && rect.height < minimum);
    if (!undersized.length) continue;
    const recommended = Math.ceil(minimum / 10) * 10;
    warnings.push(
      `Text "${component.name ?? component.id ?? 'Text'}" is too short for its static font/line height: ` +
        `${undersized.map(([resolution, rect]) => `${resolution} height ${rect.height}px`).join(', ')}; ` +
        `a single line needs at least ${minimum}px (use ${recommended}px on ToolJet's 10px grid), otherwise ` +
        `bold glyphs and descenders are clipped. Enable dynamicHeight for intentionally wrapping content.`
    );
  }
  return warnings;
}

function componentKey(component: LintComponent): string | undefined {
  return component.clientRef ?? component.id;
}

function parentPlacement(component: LintComponent): {
  parentId: string;
  slotName: ComponentSlotName;
} | undefined {
  if (component.parentRef) {
    return { parentId: component.parentRef, slotName: component.slotName ?? 'body' };
  }
  if (!component.parent) return undefined;
  const decoded = decodeComponentParent(component.parent);
  return { parentId: decoded.parentId, slotName: component.slotName ?? decoded.slotName };
}

function placementKey(component: LintComponent): string {
  const placement = parentPlacement(component);
  return placement ? `${placement.parentId}::${placement.slotName}` : '__page__';
}

/** Validate named slot placement when the parent is available in the same component set. */
export function lintComponentSlots(components: LintComponent[]): string[] {
  const errors: string[] = [];
  const refs = new Map(
    components.flatMap((component) => {
      const key = componentKey(component);
      return key ? [[key, component] as const] : [];
    })
  );
  for (const component of components) {
    const persistedSlot = component.parent ? decodeComponentParent(component.parent).slotName : 'body';
    const slotName = component.slotName ?? (persistedSlot === 'body' ? undefined : persistedSlot);
    if (!slotName) continue;
    const placement = parentPlacement(component);
    const parent = placement ? refs.get(placement.parentId) : undefined;
    if (parent && !SLOT_PARENT_TYPES.has(parent.type ?? '')) {
      errors.push(
        `Component "${component.name ?? component.id ?? component.type}" uses slot_name:"${slotName}" with ` +
          `${parent.type ?? 'unknown'} parent "${parent.name ?? parent.id}"; native slots are supported only by ModalV2, Form, and Container.`
      );
    }
  }
  return errors;
}

/** Cross-component Kanban checks that require seeing both the board and its card children. */
export function lintKanbanInteractions(components: LintComponent[]): string[] {
  const warnings: string[] = [];
  const boards = components.filter((component) => component.type === 'Kanban');
  for (const board of boards) {
    const key = componentKey(board);
    if (!key) continue;
    const openModal = propVal(board.properties, 'openModalOnCardClick');
    const nativeModalEnabled = openModal === undefined || isTruthyBinding(openModal);
    if (!nativeModalEnabled) continue;
    const htmlChildren = components.filter(
      (component) => parentPlacement(component)?.parentId === key && component.type === 'Html'
    );
    if (!htmlChildren.length) continue;
    warnings.push(
      `Kanban "${board.name ?? board.id ?? 'Kanban'}" enables the native card modal while using a custom Html ` +
        `card child (${htmlChildren.map((child) => `"${child.name ?? child.id ?? 'Html'}"`).join(', ')}). ` +
        'The card can render correctly while ToolJet opens a blank built-in modal. Prefer ' +
        'openModalOnCardClick:false for a read-only board, or browser-verify a separate supported detail flow.'
    );
  }
  return warnings;
}

/** Repeated Html children render inside Listview wrapper chrome, so a CSS height copied from the
 * authored component rectangle can exceed the real inner canvas and add a scrollbar to every row. */
export function lintListviewChildren(components: LintComponent[]): string[] {
  const warnings: string[] = [];
  const refs = new Map(
    components.flatMap((component) => {
      const key = componentKey(component);
      return key ? [[key, component] as const] : [];
    })
  );
  for (const child of components.filter((component) => component.type === 'Html')) {
    const parent = refs.get(parentPlacement(child)?.parentId ?? '');
    if (parent?.type !== 'Listview') continue;
    const rawHtml = propVal(child.properties, 'rawHtml');
    if (typeof rawHtml !== 'string' || !/\bheight\s*:\s*\d+(?:\.\d+)?px\b/i.test(rawHtml)) continue;
    if (/\bheight\s*:\s*100%\b/i.test(rawHtml)) continue;
    warnings.push(
      `Html "${child.name ?? child.id ?? 'Html'}" is repeated inside Listview ` +
        `"${parent.name ?? parent.id ?? 'Listview'}" and uses a fixed pixel CSS height. The Listview wrapper's ` +
        'inner canvas can be shorter than the authored component, creating a scrollbar in every item. ' +
        'Use height:100%; box-sizing:border-box on the Html root instead.'
    );
  }
  return warnings;
}

/** Lint a single component spec (pre-write). */
export function lintComponentSpec(spec: LintComponent): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const props = spec.properties ?? {};
  const label = spec.name ?? spec.type ?? 'component';

  if (spec.slotName !== undefined) {
    if (!(COMPONENT_SLOT_NAMES as readonly string[]).includes(spec.slotName)) {
      errors.push(`Component "${label}": unsupported slot_name "${String(spec.slotName)}"; use header, body, or footer.`);
    }
    if (!spec.parentRef && !spec.parent) {
      errors.push(`Component "${label}": slot_name requires parent_ref or parent.`);
    }
  }

  // ERROR: style keys under `properties` are silently dropped by ToolJet.
  const misplaced = Object.keys(props).filter((k) => STYLE_KEYS_IN_PROPERTIES.has(k));
  if (misplaced.length) {
    errors.push(
      `Component "${label}": style keys ${JSON.stringify(misplaced)} are under \`properties\`, where ToolJet ` +
        `ignores them — move them to the top-level \`styles\` object.`
    );
  }

  // Layout sanity.
  const rects = [spec.layout, spec.layouts?.desktop, spec.layouts?.mobile].filter(Boolean) as Rect[];
  for (const r of rects) {
    if ((r.width ?? 0) <= 0 || (r.height ?? 0) <= 0) {
      warnings.push(`Component "${label}": layout has non-positive size (${r.width}×${r.height}) — it may be invisible.`);
    }
  }

  const componentSchema = spec.type ? getComponentSchema(spec.type) : null;
  for (const [sectionName, authored, entries] of [
    ['property', spec.properties, componentSchema?.properties],
    ['style', spec.styles, componentSchema?.styles],
  ] as const) {
    if (!authored || !entries) continue;
    for (const entry of entries) {
      if (!entry.allowedValues?.length) continue;
      const value = propVal(authored, entry.key);
      if (value === undefined || isDynamicBinding(value)) continue;
      if (!entry.allowedValues.some((allowed) => Object.is(allowed, value))) {
        errors.push(
          `Component "${label}": unsupported ${sectionName} value ${JSON.stringify(value)} for "${entry.key}"; ` +
            `allowed values are ${entry.allowedValues.map((allowed) => JSON.stringify(allowed)).join(', ')}. ` +
            'ToolJet silently ignores unsupported enum values.'
        );
      }
    }
  }

  // Chart: the native title defaults to a non-empty string that clips at common dashboard sizes.
  if (spec.type === 'Chart') {
    const title = propVal(props, 'title');
    if (title === undefined) {
      warnings.push(
        `Chart "${label}": native title defaults to a non-empty string that clips at common sizes — set ` +
          `properties.title.value = "" and put a separate Text heading above the chart.`
      );
    } else if (typeof title === 'string' && title.trim() !== '') {
      warnings.push(
        `Chart "${label}": native title "${title}" can clip at dashboard sizes — prefer properties.title.value = "" ` +
          `+ a separate Text heading (enable a native title only after visual verification).`
      );
    }
  }

  if (spec.type === 'Html' && nestedMapInValue(propVal(props, 'rawHtml'))) {
    warnings.push(
      `Html "${label}": rawHtml contains .map() inside another .map(); ToolJet's Html expression evaluator ` +
        'can throw and render the component completely blank before an || fallback runs. Flatten to one filter().map() ' +
        'chain, or pre-shape the nested data in a datasource/RunJS query and bind the simple result. Do not generalize ' +
        'this warning to Table data bindings, where lookup joins such as filter(...)[0] inside map() are supported.'
    );
  }

  if (unsafeEmptyArrayFirstRowFallback(spec.properties) || unsafeEmptyArrayFirstRowFallback(spec.styles)) {
    warnings.push(
      `Component "${label}": a binding uses (data || [{}])[0].field as a first-row fallback, but an empty array ` +
        'is truthy, so zero rows still produce undefined.field and can blank the component. Use ' +
        '(data || [])[0]?.field or data?.[0]?.field instead.'
    );
  }

  // Statistics renders secondaryValue in a deliberately narrow delta slot. Prose placed there
  // wraps letter-by-letter even when the tile itself is reasonably wide; keep prose in the label.
  if (spec.type === 'Statistics') {
    const secondaryValue = propVal(props, 'secondaryValue');
    if (
      typeof secondaryValue === 'string' &&
      !secondaryValue.includes('{{') &&
      /[A-Za-z]/.test(secondaryValue)
    ) {
      warnings.push(
        `Statistics "${label}": secondaryValue "${secondaryValue}" is prose, but ToolJet renders it in a narrow delta slot ` +
          'that can wrap letter-by-letter. Put prose in secondaryValueLabel and leave secondaryValue empty; reserve the value for a number or percentage.'
      );
    }
    const width = (spec.layouts?.desktop ?? spec.layout)?.width;
    const secondaryHidden = isTruthyBinding(propVal(props, 'hideSecondary'));
    const minimumWidth = secondaryHidden
      ? STATISTICS_VALUE_ONLY_MIN_WIDTH_COLS
      : STATISTICS_WITH_SECONDARY_MIN_WIDTH_COLS;
    if (typeof width === 'number' && width < minimumWidth) {
      warnings.push(
        `Statistics "${label}": desktop width ${width} columns is too narrow; ` +
          `${secondaryHidden ? 'a value-only tile' : 'a tile with visible secondary content'} needs at least ${minimumWidth} columns ` +
          `to keep labels and values readable. ${secondaryHidden ? 'Use no more than three tiles per content row.' : 'Use a two-column KPI grid, or set hideSecondary:true and use at least 12 columns.'}`
      );
    }
    const primaryLabel = catalogValue('Statistics', props, 'primaryValueLabel');
    if (
      secondaryHidden &&
      typeof width === 'number' &&
      width >= STATISTICS_VALUE_ONLY_MIN_WIDTH_COLS &&
      width < STATISTICS_WITH_SECONDARY_MIN_WIDTH_COLS &&
      typeof primaryLabel === 'string' &&
      !primaryLabel.includes('{{') &&
      (primaryLabel.trim().length > 12 || primaryLabel.trim().split(/\s+/).length > 2)
    ) {
      warnings.push(
        `Statistics "${label}": value-only width ${width} columns is only safe for a short one- or two-word ` +
          `primaryValueLabel, but "${primaryLabel}" can wrap vertically and hide the value in the viewer. ` +
          'Shorten the label, use at least 18 columns, or browser-verify the exact viewer width.'
      );
    }
  }

  // DropdownV2 has two mutually exclusive option surfaces. ToolJet persists defaults for both, so
  // compare with the exact catalog defaults and warn only when the caller authored a custom value.
  if (spec.type === 'DropdownV2') {
    const advanced = propVal(props, 'advanced');
    const schema = propVal(props, 'schema');
    const options = propVal(props, 'options');
    const customSchema = differsFromCatalogDefault('DropdownV2', 'schema', schema);
    const customOptions = differsFromCatalogDefault('DropdownV2', 'options', options);

    if (customSchema && customOptions) {
      warnings.push(
        `DropdownV2 "${label}": custom \`schema\` and custom \`options\` are both present, but the modes are mutually exclusive. ` +
          `Use schema with properties.advanced.value="{{true}}", or options with advanced="{{false}}".`
      );
    }
    if (customSchema && (advanced === undefined || isFalseBinding(advanced))) {
      warnings.push(
        `DropdownV2 "${label}": custom \`schema\` is silently ignored unless properties.advanced.value="{{true}}"; ` +
          `ToolJet will render the static options instead.`
      );
    }
    if (customOptions && isTruthyBinding(advanced)) {
      warnings.push(
        `DropdownV2 "${label}": custom \`options\` are silently ignored while properties.advanced is true; ` +
          `use \`schema\` for dynamic mode or set advanced="{{false}}".`
      );
    }
  }

  if (spec.type === 'DatePickerV2') {
    const defaultValue = propVal(props, 'defaultValue');
    const demoDefault = getComponentSchema('DatePickerV2')?.properties.find(
      (property) => property.key === 'defaultValue'
    )?.default;
    if (defaultValue === undefined || JSON.stringify(defaultValue) === JSON.stringify(demoDefault)) {
      warnings.push(
        `DatePickerV2 "${label}": the untouched default renders ToolJet's 01/01/2022 demo date. ` +
          'Set properties.defaultValue.value="{{null}}" for an empty/create field, or bind an explicit date for edit/filter state.'
      );
    }
  }

  if (spec.type === 'KeyValuePair') {
    const data = propVal(props, 'data');
    const fields = propVal(props, 'fields');
    if (data !== undefined && Array.isArray(fields) && fields.length > 0) {
      const declaredKeys = new Set(
        fields.flatMap((field) => {
          const key = recordValue(field)?.key;
          return typeof key === 'string' && key.length > 0 ? [key] : [];
        })
      );
      const staticData = recordValue(data);
      const undeclaredKeys = staticData
        ? Object.keys(staticData).filter((key) => !declaredKeys.has(key))
        : [];
      if (undeclaredKeys.length > 0 || (!staticData && !explicitlyProjectsObjectData(data))) {
        warnings.push(
          `KeyValuePair "${label}": explicit fields do not suppress undeclared data keys; ToolJet appends them as visible rows. ` +
            (undeclaredKeys.length > 0 ? `Undeclared keys: ${undeclaredKeys.join(', ')}. ` : '') +
            'Project data to a new object containing only the intended field keys; object spreads are not safe projections.'
        );
      }
    }
  }

  // Table: data-binding + column config traps.
  if (spec.type === 'Table') {
    const data = propVal(props, 'data');
    const selector = propVal(props, 'dataSourceSelector');
    const autogen = propVal(props, 'autogenerateColumns');
    const columns = propVal(props, 'columns');
    const hasColumns = Array.isArray(columns);
    const projectedDataKeys = projectedTableDataKeys(data);
    const projectsDataKeys = projectedDataKeys !== undefined;
    const desktopHeight = (spec.layouts?.desktop ?? spec.layout)?.height;
    const dynamicHeight = catalogValue('Table', props, 'dynamicHeight');
    const contentWrap = catalogValue('Table', props, 'contentWrap');
    const expandableRows = catalogValue('Table', props, 'enableExpandableRows');
    const paginationEnabled = catalogValue('Table', props, 'enablePagination');
    const serverSide = catalogValue('Table', props, 'serverSidePagination');
    const rowsPerPage = optionalStaticNumber(
      isTruthyBinding(serverSide)
        ? catalogValue('Table', props, 'serverSideRowsPerPage')
        : catalogValue('Table', props, 'rowsPerPage')
    );
    if (
      typeof desktopHeight === 'number' &&
      rowsPerPage !== undefined &&
      rowsPerPage > 0 &&
      isTruthyBinding(paginationEnabled) &&
      !isTruthyBinding(dynamicHeight) &&
      !isTruthyBinding(contentWrap) &&
      !isTruthyBinding(expandableRows)
    ) {
      const cellSize = catalogValue('Table', spec.styles, 'cellSize', 'styles');
      const rowHeight = cellSize === 'condensed' ? TABLE_CONDENSED_ROW_HEIGHT_PX : TABLE_REGULAR_ROW_HEIGHT_PX;
      const toolbarVisible =
        isTruthyBinding(catalogValue('Table', props, 'displaySearchBox')) ||
        isTruthyBinding(catalogValue('Table', props, 'showFilterButton'));
      const chromeHeight =
        (toolbarVisible ? TABLE_TOOLBAR_HEIGHT_PX : 0) +
        TABLE_COLUMN_HEADER_HEIGHT_PX +
        TABLE_FOOTER_HEIGHT_PX +
        TABLE_BORDER_PX;
      const minimumHeight = chromeHeight + rowsPerPage * rowHeight;
      if (desktopHeight < minimumHeight) {
        warnings.push(
          `Table "${label}": desktop height ${desktopHeight}px is too short to show ${rowsPerPage} ` +
            `${cellSize === 'condensed' ? 'condensed' : 'regular'} rows without an inner scrollbar; use about ` +
            `${minimumHeight}px, reduce rowsPerPage, or enable dynamicHeight. Rows remain reachable but appear clipped ` +
            'behind the Table body scrollbar.'
        );
      }
    }
    if (data !== undefined && selector !== 'rawJson') {
      warnings.push(
        `Table "${label}": binds \`data\` but dataSourceSelector is not "rawJson" — it may render blank. ` +
          `Set properties.dataSourceSelector.value = "rawJson".`
      );
    }
    if (data !== undefined && !isTruthyBinding(autogen) && !hasColumns) {
      warnings.push(
        `Table "${label}": binds \`data\` with neither autogenerateColumns:true nor an explicit columns array — columns may not render.`
      );
    }
    if (hasColumns) {
      const columnKeys = new Map<string, number[]>();
      (columns as unknown[]).forEach((column, index) => {
        const key = (column as Record<string, unknown> | null)?.key;
        if (typeof key !== 'string' || !key) return;
        const indexes = columnKeys.get(key) ?? [];
        indexes.push(index);
        columnKeys.set(key, indexes);
      });
      for (const [key, indexes] of columnKeys) {
        if (indexes.length > 1) {
          errors.push(
            `Table "${label}": duplicate column key "${key}" at indexes ${indexes.join(', ')} — ToolJet silently keeps the last column. Use unique keys.`
          );
        }
      }
      if (isTruthyBinding(autogen) && projectedDataKeys) {
        const undeclaredKeys = projectedDataKeys.filter((key) => !columnKeys.has(key));
        if (undeclaredKeys.length) {
          warnings.push(
            `Table "${label}": projected data keys ${undeclaredKeys.join(', ')} have no matching explicit column while ` +
              'autogenerateColumns is true, so ToolJet will append them as visible columns. Add matching columns with ' +
              'columnVisibility:false when the data is still needed (for example an id used by row actions), or remove ' +
              'the keys from the projection.'
          );
        }
      }
      if (isTruthyBinding(autogen) && !projectsDataKeys) {
        warnings.push(
          `Table "${label}": has an explicit columns array but autogenerateColumns is still true — ` +
            `ToolJet will append undeclared datasource fields (often technical IDs). Project the Table data binding to a new object with only intended keys; ` +
            `identity maps and object spreads are not safe projections. ` +
            `This is safer than disabling autogeneration, which can crash some ToolJet Table versions.`
        );
      }
      (columns as unknown[]).forEach((col, i) => {
        const c = col as Record<string, unknown> | null;
        for (const req of ['name', 'key']) {
          if (c == null || c[req] === undefined) {
            warnings.push(
              `Table "${label}" column[${i}]: missing \`${req}\` — explicit columns should be ` +
                `{name,key,id,columnType,columnSize,autogenerated:false}.`
            );
          }
        }
        if (c && c.headerCasing !== undefined && !VALID_HEADER_CASING.has(c.headerCasing as string)) {
          warnings.push(
            `Table "${label}" column[${i}]: headerCasing "${String(c.headerCasing)}" is invalid — use "none" (as typed) or "uppercase".`
          );
        }
        if (c?.columnType === 'button') {
          const buttons = c.buttons;
          if (!Array.isArray(buttons) || buttons.length === 0) {
            warnings.push(
              `Table "${label}" column[${i}]: button column needs a non-empty \`buttons\` array; ` +
                `read get_component_catalog({type:"Table",sections:["authoringHints"]}).`
            );
          } else {
            const ids = new Set<string>();
            buttons.forEach((button, buttonIndex) => {
              const id = (button as Record<string, unknown> | null)?.id;
              if (typeof id !== 'string' || id.length === 0) {
                warnings.push(
                  `Table "${label}" column[${i}] button[${buttonIndex}]: missing string \`id\`; ` +
                    `its event ref must be <column key or name>::<button id>.`
                );
              } else if (ids.has(id)) {
                warnings.push(`Table "${label}" column[${i}]: duplicate button id "${id}" makes event refs ambiguous.`);
              } else {
                ids.add(id);
              }
            });
          }
        }
      });
    }
    const legacyActions = propVal(props, 'actions');
    if (Array.isArray(legacyActions) && legacyActions.length > 0) {
      warnings.push(
        `Table "${label}": properties.actions is the deprecated row-action surface and can render without a reachable event. Use a columnType:"button" column plus table_column onClick events.`
      );
    }
    if (isTruthyBinding(propVal(props, 'serverSidePagination'))) {
      if (propVal(props, 'serverSideRowsPerPage') === undefined) {
        warnings.push(`Table "${label}": server-side pagination needs serverSideRowsPerPage bound to the query page size.`);
      }
      if (propVal(props, 'totalRecords') === undefined) {
        warnings.push(`Table "${label}": server-side pagination needs totalRecords bound to a separate count/metadata query.`);
      }
    }
  }

  if (spec.type === 'Form') {
    const mode = propVal(props, 'generateFormFrom');
    const schemaValue = propVal(props, 'newJsonSchema');
    if (mode === 'jsonSchema' && schemaValue === undefined) {
      warnings.push(`Form "${label}": generateFormFrom is "jsonSchema" but newJsonSchema is missing.`);
    }
    if (mode === 'rawJson' && propVal(props, 'JSONData') === undefined) {
      warnings.push(`Form "${label}": generateFormFrom is "rawJson" but JSONData is missing.`);
    }
    const fields = recordValue(recordValue(schemaValue)?.properties);
    if (mode === 'jsonSchema' && fields) {
      const standaloneRequiredFields: string[] = [];
      for (const [fieldName, rawField] of Object.entries(fields)) {
        const field = recordValue(rawField);
        if (!field) continue;
        const type = field.type;
        if (typeof type !== 'string' || !FORM_SCHEMA_FIELD_TYPE_SET.has(type)) {
          errors.push(
            `Form "${label}" field "${fieldName}": unsupported type "${String(type)}". ` +
              'Use the authoritative Form field-type list; aliases such as email/star/file do not work.'
          );
          continue;
        }
        if (type === 'filepicker') {
          errors.push(
            `Form "${label}" field "${fieldName}": type "filepicker" crashes the entire Form. ` +
              'Use a standalone FilePicker component and read components.<picker>.file instead.'
          );
        }
        if (type === 'datepicker' && (field.value === null || field.value === undefined)) {
          warnings.push(
            `Form "${label}" field "${fieldName}": a null/omitted datepicker value renders ToolJet's 01/01/2022 demo date. ` +
              'Set value to "{{null}}" for an empty create field.'
          );
        }
        if (['dropdown', 'multiselect'].includes(type)) {
          if ('options' in field) {
            errors.push(
              `Form "${label}" field "${fieldName}": ${type} uses "values" and "displayValues", not "options".`
            );
          }
          if (!('values' in field) || !('displayValues' in field)) {
            warnings.push(
              `Form "${label}" field "${fieldName}": ${type} should define both "values" and "displayValues".`
            );
          }
        }
        if (type !== 'filepicker' && !SAFE_GENERATED_FORM_FIELD_TYPE_SET.has(type)) {
          standaloneRequiredFields.push(`${fieldName} (${type})`);
        }
        const validation = recordValue(field.validation);
        if ('required' in field || validation?.required !== undefined) {
          warnings.push(
            `Form "${label}" field "${fieldName}": "required" is not a supported Form schema validator. ` +
              'Use validation.minLength or validation.customRule.'
          );
        }
      }
      if (standaloneRequiredFields.length > 0) {
        errors.push(
          `Form "${label}": generated fields ${standaloneRequiredFields.join(', ')} are not layout-safe. ` +
            'FormUtils cannot pass alignment through consistently; Dropdown/Multiselect labels become misaligned and TextArea retains a literal "Label". ' +
            'Build the entire form from standalone components with styles.alignment.value="top"; use a consistent two-column grid and full-width TextArea fields.'
        );
      }
    }
  }

  // Form input: a narrow field with a side-aligned label (the default) wastes width on the label.
  if (FORM_INPUT_TYPES.has(spec.type ?? '')) {
    const align = propVal(spec.styles, 'alignment'); // `alignment` is a STYLE, not a property
    const width = (spec.layouts?.desktop ?? spec.layout)?.width;
    if ((align === undefined || align === 'side') && typeof width === 'number' && width <= NARROW_SIDE_LABEL_COLS) {
      warnings.push(
        `${spec.type} "${label}": narrow (${width} cols) with a SIDE-aligned label (the default) — the label ` +
          `eats the input width. Set styles.alignment.value = "top" (label above the control), especially in forms/modals.`
      );
    }
  }

  return { errors, warnings };
}

/** Pairwise desktop-rect overlap within a set of components. */
export function detectOverlaps(components: LintComponent[]): string[] {
  const warnings: string[] = [];
  const items = components
    .map((c) => ({
      component: c,
      name: c.name ?? c.type ?? '?',
      r: c.layouts?.desktop ?? c.layout,
      parent: placementKey(c),
    }))
    .filter((x): x is { component: LintComponent; name: string; r: Rect; parent: string } => !!x.r);
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (items[i].parent !== items[j].parent) continue;
      if (mutuallyExclusiveVisibility(items[i].component, items[j].component)) continue;
      const a = items[i].r;
      const b = items[j].r;
      const ax = a.left ?? 0,
        ay = a.top ?? 0,
        aw = a.width ?? 0,
        ah = renderedHeight(items[i].component, a);
      const bx = b.left ?? 0,
        by = b.top ?? 0,
        bw = b.width ?? 0,
        bh = renderedHeight(items[j].component, b);
      if (ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah) {
        const increments = [items[i], items[j]]
          .filter((item) => renderedHeight(item.component, item.r) > (item.r.height ?? 0))
          .map(
            (item) =>
              `"${item.name}" renders ${renderedHeight(item.component, item.r)}px tall ` +
              `(authored ${item.r.height ?? 0}px + ${TOP_ALIGNMENT_HEIGHT_INCREMENT}px for its top-aligned label)`
          );
        warnings.push(
          `Components "${items[i].name}" and "${items[j].name}" overlap at rendered desktop size` +
            (increments.length ? `; ${increments.join(' and ')}` : '') +
            `.`
        );
      }
    }
  }
  return warnings;
}

function isTitleLikeText(component: LintComponent): boolean {
  if (component.type !== 'Text') return false;
  const top = (component.layouts?.desktop ?? component.layout)?.top ?? 0;
  if (top > 100) return false;
  const name = component.name ?? '';
  const text = propVal(component.properties, 'text');
  const fontWeight = propVal(component.styles, 'fontWeight');
  const textSize = optionalStaticNumber(propVal(component.styles, 'textSize'));
  return (
    /(?:title|heading|header)/i.test(name) ||
    (typeof text === 'string' && !text.includes('{{') && text.trim().length > 0 && text.trim().length <= 80 &&
      (/^(?:add|create|edit|new|view|update)\b/i.test(text.trim()) || /(?:title|details?)$/i.test(text.trim()))) ||
    (typeof fontWeight === 'string' && /bold|[6-9]00/.test(fontWeight)) ||
    (typeof fontWeight === 'number' && fontWeight >= 600) ||
    (textSize !== undefined && textSize >= 18)
  );
}

/** Modal checks work both before a batch write (clientRef/parentRef) and on persisted ids. */
export function lintModalChildren(components: LintComponent[]): string[] {
  const warnings: string[] = [];
  const refs = new Map(
    components.flatMap((component) => {
      const key = componentKey(component);
      return key ? [[key, component] as const] : [];
    })
  );
  const parentOf = (component: LintComponent): LintComponent | undefined =>
    refs.get(parentPlacement(component)?.parentId ?? '');
  const modalChildren = components.filter((component) => {
    const parent = parentOf(component);
    return parent?.type === 'ModalV2' || parent?.type === 'Modal';
  });
  const bodyChildren = modalChildren.filter((component) => parentPlacement(component)?.slotName === 'body');

  for (const child of bodyChildren) {
    if (!FORM_INPUT_TYPES.has(child.type ?? '')) continue;
    const align = propVal(child.styles, 'alignment');
    if (align === undefined || align === 'side') {
      warnings.push(
        `${child.type} "${child.name ?? child.type}": modal form child uses a SIDE-aligned label — ` +
          `set styles.alignment.value = "top" so the control gets the full field width.`
      );
    }
  }

  for (let i = 0; i < bodyChildren.length; i++) {
    for (let j = i + 1; j < bodyChildren.length; j++) {
      const a = bodyChildren[i];
      const b = bodyChildren[j];
      if (
        parentPlacement(a)?.parentId !== parentPlacement(b)?.parentId ||
        !FORM_INPUT_TYPES.has(a.type ?? '') ||
        !FORM_INPUT_TYPES.has(b.type ?? '')
      ) continue;
      const ar = a.layouts?.desktop ?? a.layout;
      const br = b.layouts?.desktop ?? b.layout;
      if (!ar || !br) continue;
      const ax = ar.left ?? 0, aw = ar.width ?? 0, ay = ar.top ?? 0, ah = renderedHeight(a, ar);
      const bx = br.left ?? 0, bw = br.width ?? 0, by = br.top ?? 0, bh = renderedHeight(b, br);
      if (!(ax < bx + bw && bx < ax + aw)) continue;
      const gap = by >= ay + ah ? by - (ay + ah) : ay >= by + bh ? ay - (by + bh) : -1;
      if (gap >= 0 && gap < 10) {
        warnings.push(
          `Modal fields "${a.name ?? a.type}" and "${b.name ?? b.type}" have only ${gap}px vertical gap — ` +
            `use at least 10px on ToolJet's vertical grid.`
        );
      }
    }
  }

  for (const modal of components.filter((component) => component.type === 'ModalV2' || component.type === 'Modal')) {
    const key = componentKey(modal);
    if (!key) continue;
    const children = bodyChildren.filter((child) => parentPlacement(child)?.parentId === key);
    if (modal.type === 'ModalV2' && !isFalseBinding(propVal(modal.properties, 'showHeader'))) {
      const headerChildren = modalChildren.filter((child) => {
        const placement = parentPlacement(child);
        return placement?.parentId === key && placement.slotName === 'header';
      });
      if (!headerChildren.length) {
        warnings.push(
          `Modal "${modal.name ?? modal.type}" has showHeader enabled but its native header slot is empty, so it renders reserved blank chrome. ` +
            'Add a Text child with the modal parent_ref/parent and slot_name:"header", or set showHeader:false.'
        );
      }
      for (const child of children.filter(isTitleLikeText)) {
        warnings.push(
          `Modal "${modal.name ?? modal.type}" has title-like Text "${child.name ?? child.type}" in the body while the native header is visible. ` +
            'Move that Text to slot_name:"header" instead of spending body space on a second title row.'
        );
      }
    }
    const childBottoms = children.flatMap((child) => {
      const rect = child.layouts?.desktop ?? child.layout;
      return rect ? [{ child, bottom: (rect.top ?? 0) + renderedHeight(child, rect) }] : [];
    });
    if (!childBottoms.length) continue;

    const lowest = childBottoms.reduce((current, candidate) => candidate.bottom > current.bottom ? candidate : current);
    const modalHeight = staticNumber(propVal(modal.properties, 'modalHeight'), 400);
    const isV2 = modal.type === 'ModalV2';
    const headerHeight = !isV2 || isFalseBinding(propVal(modal.properties, 'showHeader'))
      ? 0
      : staticNumber(propVal(modal.properties, 'headerHeight'), 80);
    const footerHeight = !isV2 || isFalseBinding(propVal(modal.properties, 'showFooter'))
      ? 0
      : staticNumber(propVal(modal.properties, 'footerHeight'), 80);
    const bottomSlack = 20;
    const requiredHeight = lowest.bottom + headerHeight + footerHeight + bottomSlack;
    if (modalHeight < requiredHeight) {
      warnings.push(
        `Modal "${modal.name ?? modal.type}" has modalHeight ${modalHeight}px but needs at least ${requiredHeight}px ` +
          `for child "${lowest.child.name ?? lowest.child.type}" (rendered bottom ${lowest.bottom}px + ` +
          `${headerHeight}px header + ${footerHeight}px footer + ${bottomSlack}px bottom slack); ` +
          `content can be clipped or forced into unintended scrolling.`
      );
    }
  }
  return warnings;
}

/** Geometry-only checks for a complete page after creates, property edits, or layout edits. */
export function lintRenderedGeometry(components: LintComponent[]): string[] {
  return [
    ...detectOverlaps(components),
    ...lintModalChildren(components),
    ...lintTextGeometry(components),
    ...lintListviewChildren(components),
  ];
}

/** Lint a batch: per-component checks + overlap detection across the batch. */
export function lintComponents(components: LintComponent[]): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const c of components) {
    const r = lintComponentSpec(c);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }
  errors.push(...lintComponentSlots(components));
  warnings.push(...lintRenderedGeometry(components));
  warnings.push(...lintKanbanInteractions(components));
  return { errors, warnings };
}

const uniq = (xs: string[]): string[] => [...new Set(xs)];

/** Whole-app structural validation over a compact app summary (post-write). Catches dangling
 *  references, ambiguous duplicate names, and bindings to non-existent queries/components, plus
 *  re-runs the per-component render lints against what actually persisted. */
export function validateAppStructure(summary: AppSummary): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const allComponents = summary.pages.flatMap((p) => p.components);
  const componentNames = new Set(allComponents.map((c) => c.name).filter(Boolean) as string[]);
  const componentIds = new Set(allComponents.map((c) => c.id));
  const queryNames = new Set(summary.queries.map((q) => q.name).filter(Boolean) as string[]);
  const queryIds = new Set(summary.queries.map((q) => q.id));
  const pageIds = new Set(summary.pages.map((p) => p.id));

  // Duplicate component names within a page (ambiguous {{components.X}}).
  for (const p of summary.pages) {
    // ToolJet renders IconHome2 for the native Home page even when its stored icon is empty. API
    // summaries are not guaranteed to return pages in creation order, so identify Home by its
    // stable handle/name rather than array position. Every other icon-less page falls back to
    // IconFile, which makes multi-page sidebar navigation look unfinished.
    const isNativeHome = p.handle === 'home' || p.name === 'Home';
    if (!isNativeHome && !p.icon) {
      warnings.push(
        `Page "${p.name ?? p.id}" has no icon — set a relevant Tabler icon so the left sidebar does not use generic IconFile.`
      );
    }
    const counts = new Map<string, number>();
    for (const c of p.components) if (c.name) counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
    for (const [name, n] of counts) {
      if (n > 1) warnings.push(`Page "${p.name}": ${n} components named "${name}" — {{components.${name}}} is ambiguous.`);
    }
    for (const kanban of p.components.filter((component) => component.type === 'Kanban')) {
      if (!p.components.some((component) => component.parent === kanban.id)) {
        warnings.push(
          `Kanban "${kanban.name ?? kanban.id}" has no nested card child components, so cards can render with ` +
            `correct columns/counts but blank bodies. Recreate it through add_component(s), or add an Html/Text ` +
            `child parented to this Kanban.`
        );
      }
    }
  }
  // Duplicate query names (ambiguous {{queries.X}}).
  {
    const counts = new Map<string, number>();
    for (const q of summary.queries) if (q.name) counts.set(q.name, (counts.get(q.name) ?? 0) + 1);
    for (const [name, n] of counts) {
      if (n > 1) warnings.push(`${n} queries named "${name}" — {{queries.${name}}} is ambiguous.`);
    }
  }

  // The native Home page is entered during initial app load. A query with runOnPageLoad=true that
  // is also run by Home.onPageLoad executes twice and can noticeably delay first paint.
  const homePage = summary.pages.find((page) => page.handle === 'home' || page.name === 'Home');
  if (homePage) {
    const appLoadQueryIds = new Set(
      summary.queries
        .filter((query) => isTruthyBinding(propVal(recordValue(query.options), 'runOnPageLoad')))
        .map((query) => query.id)
    );
    for (const event of summary.events) {
      if (event.target !== 'page' || event.sourceId !== homePage.id) continue;
      const value = recordValue(event.event);
      if (
        value?.eventId === 'onPageLoad' &&
        value.actionId === 'run-query' &&
        typeof value.queryId === 'string' &&
        appLoadQueryIds.has(value.queryId)
      ) {
        const query = summary.queries.find((candidate) => candidate.id === value.queryId);
        warnings.push(
          `Query "${query?.name ?? value.queryId}" has runOnPageLoad=true and is also run by Home.onPageLoad, ` +
            'so the initial page executes it twice. Keep one lifecycle path; use focused page events for later navigation refreshes.'
        );
      }
    }
  }

  // RunJS code is stored as a plain JavaScript body. ToolJet does not register plain
  // `queries.foo` reads inside that body as reactive bindings, so runOnDependencyChange can leave
  // an aggregate at its first (often empty) result. Treat explicit source-query success chains as
  // the reliable dependency graph.
  const queryByName = new Map(summary.queries.flatMap((query) => query.name ? [[query.name, query] as const] : []));
  for (const query of summary.queries.filter((candidate) => candidate.kind === 'runjs')) {
    const options = recordValue(query.options);
    const code = options?.code;
    if (typeof code !== 'string' || !isTruthyBinding(propVal(options, 'runOnDependencyChange'))) continue;
    const referencedNames = [...new Set([...code.matchAll(/\bqueries\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((match) => match[1]!))];
    if (!referencedNames.length) continue;
    const explicitlyChained = new Set(
      summary.events.flatMap((event) => {
        if (event.target !== 'data_query') return [];
        const payload = recordValue(event.event);
        return payload?.eventId === 'onDataQuerySuccess' &&
          payload.actionId === 'run-query' && payload.queryId === query.id
          ? [event.sourceId]
          : [];
      })
    );
    const missing = referencedNames.filter((name) => {
      const source = queryByName.get(name);
      return source && !explicitlyChained.has(source.id);
    });
    if (missing.length) {
      warnings.push(
        `RunJS query "${query.name ?? query.id}" sets runOnDependencyChange=true but reads ${missing.map((name) => `queries.${name}`).join(', ')} ` +
          'as plain JavaScript. ToolJet does not infer those reads as reactive dependencies, so the result can stay empty or stale. ' +
          'Run this query explicitly from each source query\'s onDataQuerySuccess event (after the source data exists), or invoke it from a later user/page event.'
      );
    }
  }

  // Dangling event references.
  for (const e of summary.events) {
    const name = e.name ?? e.id;
    const validSources =
      e.target === 'data_query'
        ? queryIds
        : e.target === 'page'
          ? pageIds
          : e.target === 'component' || e.target === 'table_column' || e.target === 'table_action'
            ? componentIds
            : new Set([...componentIds, ...queryIds, ...pageIds]);
    if (e.sourceId && !validSources.has(e.sourceId)) {
      errors.push(`Event "${name}" is attached to a source (${e.sourceId}) that no longer exists.`);
    }
    const ev = (e.event ?? {}) as Record<string, unknown>;
    if (ev.actionId === 'run-query' && typeof ev.queryId === 'string' && !queryIds.has(ev.queryId)) {
      errors.push(`Event "${name}" runs a query (${ev.queryId}) that no longer exists.`);
    }
  }

  // Bindings to non-existent queries/components + re-run per-component render lints.
  for (const c of allComponents) {
    const blob = JSON.stringify({ p: c.properties ?? {}, s: c.styles ?? {} });
    for (const m of blob.matchAll(/\{\{\s*queries\.([A-Za-z0-9_]+)/g)) {
      if (!queryNames.has(m[1])) {
        warnings.push(`Component "${c.name ?? c.id}" binds {{queries.${m[1]}…}} but no query is named "${m[1]}".`);
      }
    }
    for (const m of blob.matchAll(/\{\{\s*components\.([A-Za-z0-9_]+)/g)) {
      if (!componentNames.has(m[1])) {
        warnings.push(`Component "${c.name ?? c.id}" binds {{components.${m[1]}…}} but no component is named "${m[1]}".`);
      }
    }
    const r = lintComponentSpec({
      id: c.id,
      name: c.name ?? c.id,
      type: c.type,
      properties: c.properties,
      styles: c.styles,
      layouts: c.layouts as LintComponent['layouts'],
      parent: c.parent,
    });
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }

  const eventsBySource = new Map<string, Set<string>>();
  for (const event of summary.events) {
    if (!event.sourceId || event.target !== 'component') continue;
    const trigger = (event.event as Record<string, unknown> | undefined)?.eventId;
    if (typeof trigger !== 'string') continue;
    const triggers = eventsBySource.get(event.sourceId) ?? new Set<string>();
    triggers.add(trigger);
    eventsBySource.set(event.sourceId, triggers);
  }
  for (const table of allComponents.filter((component) => component.type === 'Table')) {
    const triggers = eventsBySource.get(table.id) ?? new Set<string>();
    const dataBinding = JSON.stringify(propVal(table.properties, 'data') ?? '');
    const boundDataQueries = [...new Set(
      [...dataBinding.matchAll(/queries\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((match) => match[1]!)
    )];
    const hasReactiveDataQuery = (stateName: string): boolean => boundDataQueries.some((queryName) => {
      const query = queryByName.get(queryName);
      const options = recordValue(query?.options);
      if (!options || !isTruthyBinding(propVal(options, 'runOnDependencyChange'))) return false;
      return typeof table.name === 'string' && JSON.stringify(options).includes(`components.${table.name}.${stateName}`);
    });
    const requirements: Array<[string, string, string]> = [
      ['serverSidePagination', 'onPageChanged', 'pageIndex'],
      ['serverSideSearch', 'onSearch', 'searchText'],
      ['serverSideSort', 'onSort', 'sortApplied'],
      ['serverSideFilter', 'onFilterChanged', 'filters'],
    ];
    for (const [property, trigger, stateName] of requirements) {
      if (
        isTruthyBinding(propVal(table.properties, property)) &&
        !triggers.has(trigger) &&
        !hasReactiveDataQuery(stateName)
      ) {
        warnings.push(
          `Table "${table.name ?? table.id}": ${property} is enabled but no ${trigger} event refreshes its data query ` +
            `and no runOnDependencyChange data query is bound to components.${table.name ?? '<table>'}.${stateName}.`
        );
      }
    }

    const tableColumnRefs = new Set(
      summary.events
        .filter((event) => event.sourceId === table.id && event.target === 'table_column')
        .map((event) => (event.event as Record<string, unknown> | undefined)?.ref)
        .filter((ref): ref is string => typeof ref === 'string')
    );
    const columns = propVal(table.properties, 'columns');
    if (Array.isArray(columns)) {
      columns.forEach((column, columnIndex) => {
        const col = column as Record<string, unknown> | null;
        if (col?.columnType !== 'button' || col.useDynamicColumn === true || !Array.isArray(col.buttons)) return;
        const columnKey = col.key ?? col.name;
        if (typeof columnKey !== 'string') return;
        col.buttons.forEach((button, buttonIndex) => {
          const b = button as Record<string, unknown> | null;
          if (Array.isArray(b?.events) && b.events.length > 0) return;
          if (typeof b?.id !== 'string') return;
          const ref = `${columnKey}::${b.id}`;
          if (!tableColumnRefs.has(ref)) {
            warnings.push(
              `Table "${table.name ?? table.id}" column[${columnIndex}] button[${buttonIndex}] has no ` +
                `table_column onClick event with ref "${ref}".`
            );
          }
        });
      });
    }
  }

  for (const p of summary.pages) {
    warnings.push(...lintRenderedGeometry(p.components as LintComponent[]));
    warnings.push(...lintKanbanInteractions(p.components as LintComponent[]));
  }

  return { errors: uniq(errors), warnings: uniq(warnings) };
}
