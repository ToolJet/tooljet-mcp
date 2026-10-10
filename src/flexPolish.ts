/* Layout polish for FlexContainer rows in a planned batch: mechanical alignment fixes a designer would always make,
   applied before lint so the stored plan carries them (lint and apply run the same pass). Each fix is reported as a
   warning naming the row, so the model sees what changed; nothing here changes what the page shows, only how it
   lines up.

   - A row of top-labelled fields with a badge, text or button beside them: the row's children align on their last
     text line (alignItems "last baseline"), so the badge, the note and the button's label sit level with the field's
     value instead of centring on label + field.
   - A row of two or more cards (surfaced FlexContainers): alignItems stretch, so the cards share one height.
   - A header row whose action buttons come before the title: the actions move after the title block (to the right). */
import type { ComponentSpec } from './tooljetClient.js';

const FIELD_TYPES = new Set([
  'ShadInput',
  'ShadSelect',
  'ShadDatePicker',
  'ShadDateTimePicker',
  'ShadTimePicker',
  'ShadCombobox',
  'ShadMultiselect',
  'ShadNumberInput',
  'ShadCurrencyInput',
  'ShadPhoneInput',
  'ShadPasswordInput',
  'ShadTagsInput',
  'ShadColorPicker',
  'ShadSlider',
]);
const ACTION_TYPES = new Set(['ShadButton', 'ShadButtonGroup', 'ShadDropdownMenu']);
// One-line widgets that may sit beside fields in a toolbar row.
const INLINE_TYPES = new Set([
  ...FIELD_TYPES,
  ...ACTION_TYPES,
  'ShadBadge',
  'ShadText',
  'ShadToggleGroup',
  'ShadSwitch',
  'ShadCheckbox',
  'ShadLink',
  'ShadIcon',
  'ShadTags',
  'ShadSpinner',
]);

const valueOf = (entry: unknown): unknown =>
  entry && typeof entry === 'object' && !Array.isArray(entry) && 'value' in (entry as Record<string, unknown>)
    ? (entry as Record<string, unknown>).value
    : entry;
const text = (entry: unknown): string => {
  const v = valueOf(entry);
  return typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
};
const props = (component: ComponentSpec): Record<string, unknown> =>
  component.properties && typeof component.properties === 'object' ? component.properties : {};
const prop = (component: ComponentSpec, key: string): unknown => props(component)[key];
const styleText = (component: ComponentSpec, key: string): string =>
  text(component.styles && typeof component.styles === 'object' ? component.styles[key] : undefined);
const refOf = (component: ComponentSpec): string | undefined => component.clientRef ?? component.name;

const setProp = (component: ComponentSpec, key: string, value: unknown): void => {
  const current = props(component)[key];
  component.properties = {
    ...props(component),
    [key]:
      current && typeof current === 'object' && !Array.isArray(current) ? { ...(current as object), value } : { value },
  };
};

const isRow = (component: ComponentSpec): boolean =>
  component.type === 'FlexContainer' && text(prop(component, 'direction')) === 'row';
const isLabelledField = (component: ComponentSpec): boolean =>
  FIELD_TYPES.has(component.type) && text(prop(component, 'label')) !== '';
const isSurface = (component: ComponentSpec): boolean => {
  if (component.type !== 'FlexContainer') return false;
  if (['shadcnCard', 'antCard'].includes(text(prop(component, 'cardStyle')))) return true;
  const background = styleText(component, 'backgroundColor').toLowerCase();
  return background !== '' && background !== 'transparent' && !/^#[0-9a-f]{6}00$/.test(background);
};
const isTitle = (component: ComponentSpec, children: (ref: string) => ComponentSpec[]): boolean =>
  component.type === 'ShadHeading' ||
  (component.type === 'FlexContainer' &&
    !isRow(component) &&
    children(refOf(component) ?? '').some((inner) => inner.type === 'ShadHeading'));

// One line of heading text: font size by level (ui.jsx HEADING) times an average glyph width, plus a little slack.
const HEADING_PX: Record<string, number> = { h1: 36, h2: 30, h3: 24, h4: 20 };
const headingLineWidth = (component: ComponentSpec): number | null => {
  const raw = text(prop(component, 'text'));
  if (!raw || raw.includes('{{')) return null;
  const size = HEADING_PX[text(prop(component, 'level'))] ?? HEADING_PX.h2;
  return Math.ceil(raw.length * size * (size >= 36 ? 0.6 : 0.56) + 8);
};
type FlexRect = { widthPx?: number; fillWidth?: boolean };
const fixedRects = (component: ComponentSpec): FlexRect[] =>
  [component.layout, component.layouts?.desktop].filter(
    (rect): rect is FlexRect & NonNullable<ComponentSpec['layout']> =>
      !!rect && (rect as FlexRect).fillWidth === false && typeof (rect as FlexRect).widthPx === 'number'
  ) as FlexRect[];
const META_TYPES = new Set(['ShadText', 'ShadBadge', 'ShadTags']);

export interface FlexPolishResult {
  components: ComponentSpec[];
  warnings: string[];
}

/** The polish pass over one page's planned components (same-batch children, parented by parentRef). Never throws;
 *  returns a new array (components it changes are copied). */
export function polishFlexRows(input: ComponentSpec[]): FlexPolishResult {
  const warnings: string[] = [];
  if (!Array.isArray(input) || !input.length) return { components: Array.isArray(input) ? [...input] : [], warnings };
  const components = input.map((component) =>
    component && typeof component === 'object'
      ? {
          ...component,
          properties: { ...props(component) },
          ...(component.layout ? { layout: { ...component.layout } } : {}),
          ...(component.layouts
            ? {
                layouts: {
                  ...component.layouts,
                  ...(component.layouts.desktop ? { desktop: { ...component.layouts.desktop } } : {}),
                },
              }
            : {}),
        }
      : component
  );
  const childrenOf = (ref: string): ComponentSpec[] =>
    components.filter((component) => component && component.parentRef === ref && !component.slotName);

  for (const container of components) {
    if (!container || !isRow(container)) continue;
    const ref = refOf(container);
    if (!ref) continue;
    let children = childrenOf(ref);
    const label0 = container.name ?? ref;

    // 00. A titled card left empty with a lone widget placed right after it in the same row: the widget was meant to
    //     be inside the card (a backlog chart parented to the row drew outside its empty "Open backlog trend" card).
    children.forEach((card, i) => {
      const next = children[i + 1];
      if (!next || !isSurface(card) || !text(prop(card, 'cardTitle'))) return;
      const cardRef = refOf(card);
      if (!cardRef || childrenOf(cardRef).length) return;
      if (next.type === 'FlexContainer' || ACTION_TYPES.has(next.type)) return;
      next.parentRef = cardRef;
      const order = valueOf(prop(container, 'childOrder'));
      if (Array.isArray(order)) {
        setProp(container, 'childOrder', order.filter((entry) => entry !== refOf(next) && entry !== next.name));
      }
      warnings.push(`"${next.name}" sat beside the empty card "${card.name}" in row "${label0}"; it is now inside the card.`);
    });
    children = childrenOf(ref);

    // 0. A plain row is at least as tall as its tallest child plus its chrome (padding, the widget's 2px box padding
    //    and the canvas border, 6px in all). The editor draws the authored height, so a 36px button in a 40px row
    //    was clipped and its row scrolled by 2px under the pointer.
    if (!isSurface(container) && !text(prop(container, 'cardTitle'))) {
      const rects = [container.layout, container.layouts?.desktop].filter(
        (rect): rect is NonNullable<ComponentSpec['layout']> => !!rect && typeof rect.height === 'number'
      );
      const tallest = Math.max(
        0,
        ...children.map((c) => Number(c.layout?.height ?? c.layouts?.desktop?.height ?? 0)).filter(Number.isFinite)
      );
      // An unset padding is the FlexContainer's default, 12px.
      const rawPadding = text(prop(container, 'padding'));
      const padding = rawPadding === '' ? 12 : Number(rawPadding) || 0;
      const needed = tallest > 0 ? tallest + padding * 2 + 6 : 0;
      if (needed && rects.length && rects.some((rect) => (rect.height as number) < needed)) {
        rects.forEach((rect) => {
          rect.height = Math.max(rect.height as number, needed);
        });
        warnings.push(`Row "${label0}" was shorter than its tallest child; its height is now ${needed}.`);
      }
    }
    if (children.length < 2) continue;

    // 0b. A button beside other content keeps its own width: filling, it took half the row and drew at the left of
    //     that half (a header's page action sat mid-header).
    if (children.some((child) => !ACTION_TYPES.has(child.type))) {
      for (const child of children) {
        if (child.type !== 'ShadButton') continue;
        const rects = [child.layout, child.layouts?.desktop].filter(
          (rect): rect is NonNullable<ComponentSpec['layout']> => !!rect && (rect as FlexRect).fillWidth === true
        );
        if (!rects.length) continue;
        const caption = text(prop(child, 'text')) || text(prop(child, 'label'));
        const width = Math.max(96, Math.ceil(caption.length * 8 + (text(prop(child, 'icon')) ? 64 : 40)));
        rects.forEach((rect) => {
          (rect as FlexRect).fillWidth = false;
          (rect as FlexRect).widthPx = width;
        });
        warnings.push(`Button "${child.name}" in row "${label0}" filled the row's width; it now keeps its own (${width}px).`);
      }
    }
    const align = text(prop(container, 'alignItems'));
    const label = container.name ?? ref;

    // 1. Labelled fields with other one-line widgets beside them.
    if (
      children.every((child) => INLINE_TYPES.has(child.type)) &&
      children.some(isLabelledField) &&
      children.some((child) => !isLabelledField(child)) &&
      align !== 'last baseline'
    ) {
      setProp(container, 'alignItems', 'last baseline');
      warnings.push(
        `Row "${label}" has labelled fields beside other controls; its alignItems is now "last baseline" so their ` +
          "text lines up with the fields' values instead of centring on label and field."
      );
    }

    // 2. A row of cards shares one height.
    if (children.length >= 2 && children.every(isSurface) && (align === '' || align === 'flex-start')) {
      setProp(container, 'alignItems', 'stretch');
      warnings.push(`Row "${label}" holds ${children.length} cards; its alignItems is now stretch so they share one height.`);
    }

    // 2b. In a stretched row of cards, a card whose last widget is a chart and whose content is shorter than the
    //     tallest card's grows that chart by the difference: stretched, the card otherwise kept an empty band under
    //     the chart (an MRR trend beside a donut and its table).
    if (children.length >= 2 && children.every(isSurface) && text(prop(container, 'alignItems')) === 'stretch') {
      const contentOf = (card: ComponentSpec): { height: number; last?: ComponentSpec } => {
        const inner = childrenOf(refOf(card) ?? '');
        const heights = inner.map((c) => Number(c.layout?.height ?? c.layouts?.desktop?.height ?? NaN));
        if (!inner.length || heights.some((h) => !Number.isFinite(h))) return { height: NaN };
        const rawGap = text(prop(card, 'gap'));
        const gap = rawGap === '' ? 8 : Number(rawGap) || 0;
        return { height: heights.reduce((a, b) => a + b, 0) + gap * (inner.length - 1), last: inner[inner.length - 1] };
      };
      const contents = children.map(contentOf);
      const tallest = Math.max(...contents.map((c) => (Number.isFinite(c.height) ? c.height : 0)));
      contents.forEach(({ height, last }) => {
        if (!last || !Number.isFinite(height) || tallest - height < 24 || !/Chart$/.test(last.type)) return;
        const grow = tallest - height;
        [last.layout, last.layouts?.desktop].forEach((rect) => {
          if (rect && typeof rect.height === 'number') rect.height += grow;
        });
        warnings.push(`Chart "${last.name}" grows by ${grow}px to fill its card, which is stretched to the tallest card in row "${label}".`);
      });
    }

    // 3. A fixed-width heading too narrow for one line of its text is widened to fit (it wrapped onto two lines).
    for (const child of children) {
      if (child.type !== 'ShadHeading') continue;
      const needed = headingLineWidth(child);
      if (!needed) continue;
      const rects = fixedRects(child);
      if (!rects.length || rects.every((rect) => (rect.widthPx ?? 0) >= needed)) continue;
      rects.forEach((rect) => {
        rect.widthPx = Math.max(rect.widthPx ?? 0, needed);
      });
      warnings.push(
        `Heading "${child.name}" in row "${label}" was too narrow for one line of its text; its widthPx is now ${needed}.`
      );
    }

    // 4. A heading with meta text or a badge beside it (no controls) sits on one text baseline.
    if (
      children.some((child) => child.type === 'ShadHeading') &&
      children.some((child) => META_TYPES.has(child.type)) &&
      children.every((child) => child.type === 'ShadHeading' || META_TYPES.has(child.type)) &&
      ['', 'center', 'flex-start'].includes(align)
    ) {
      setProp(container, 'alignItems', 'last baseline');
      warnings.push(`Row "${label}" pairs a heading with meta text; its alignItems is now "last baseline" so they share a baseline.`);
    }

    // 5. Actions before the title in a header row move after it.
    const authored = valueOf(prop(container, 'childOrder'));
    const authoredOrder = Array.isArray(authored) ? authored.filter((entry): entry is string => typeof entry === 'string') : null;
    const ordered = authoredOrder?.length
      ? [
          ...authoredOrder
            .map((name) => children.find((child) => refOf(child) === name || child.name === name))
            .filter((child): child is ComponentSpec => !!child),
          ...children.filter((child) => !authoredOrder.includes(refOf(child) ?? '') && !authoredOrder.includes(child.name)),
        ]
      : children;
    const titleIndex = ordered.findIndex((child) => isTitle(child, childrenOf));
    if (titleIndex <= 0) continue;
    const before = ordered.slice(0, titleIndex);
    const leadingActions = before.filter((child) => ACTION_TYPES.has(child.type));
    if (!leadingActions.length) continue;
    const next = [
      ...before.filter((child) => !ACTION_TYPES.has(child.type)),
      ...ordered.slice(titleIndex),
      ...leadingActions,
    ];
    if (authoredOrder?.length) {
      setProp(container, 'childOrder', next.map((child) => (authoredOrder.includes(child.name) ? child.name : refOf(child))));
    } else {
      // Request order is the render order: put the row's children back into their own slots in the new order.
      const slots = components
        .map((component, index) => (component && component.parentRef === ref && !component.slotName ? index : -1))
        .filter((index) => index >= 0);
      slots.forEach((slot, i) => {
        components[slot] = next[i];
      });
    }
    warnings.push(
      `Row "${label}": ${leadingActions.map((child) => `"${child.name}"`).join(', ')} came before the title; ` +
        'moved after it so the page action sits at the right of the header.'
    );
  }
  return { components, warnings };
}
