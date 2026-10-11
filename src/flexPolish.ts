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

  // A page's top-level FlexContainer grows with its content: a gym page's root fixed at 710px with dynamic height off
  // clipped both cards and the table under them.
  for (const root of components) {
    if (!root || root.type !== 'FlexContainer' || root.parentRef || (root as { parent?: unknown }).parent) continue;
    const dynamic = text(prop(root, 'dynamicHeight')).replace(/[{}\s]/g, '');
    if (dynamic === 'true') continue;
    setProp(root, 'dynamicHeight', '{{true}}'); // silent: it changes nothing the model must reconsider
  }

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
    // A lone button in a row placed at its end or centre keeps its own width: filling, it drew at the left of the row.
    const lone = children.length === 1 ? children[0] : undefined;
    if (lone && lone.type === 'ShadButton' && ['flex-end', 'end', 'center'].includes(text(prop(container, 'justifyContent')))) {
      const rects = [lone.layout, lone.layouts?.desktop].filter(
        (rect): rect is NonNullable<ComponentSpec['layout']> => !!rect && (rect as FlexRect).fillWidth !== false
      );
      if (rects.length) {
        const caption = text(prop(lone, 'text')) || text(prop(lone, 'label'));
        const own = rects.map((rect) => (rect as FlexRect).widthPx).find((w) => typeof w === 'number' && w > 0);
        const width = own ?? Math.max(96, Math.ceil(caption.length * 8 + (text(prop(lone, 'icon')) ? 64 : 40)));
        rects.forEach((rect) => {
          (rect as FlexRect).fillWidth = false;
          (rect as FlexRect).widthPx = width;
        });
        warnings.push(`"${lone.name}" filled row "${label0}" and drew at its left; it now keeps its own width (${width}px).`);
      }
    }
    if (children.length < 2) continue;

    // 0a. Two or more children each drawn the row's full width (43 columns) were meant to share it: unfilled, each took
    //     a whole line of a wrapping row and five KPI cards stacked down the first screen.
    const fullWidth = children.filter((child) => {
      const rect = child.layout ?? child.layouts?.desktop;
      return rect && typeof rect.width === 'number' && rect.width >= 40 && (rect as FlexRect).fillWidth !== true &&
        typeof (rect as FlexRect).widthPx !== 'number';
    });
    if (fullWidth.length >= 2) {
      fullWidth.forEach((child) => {
        [child.layout, child.layouts?.desktop].forEach((rect) => {
          if (rect) (rect as FlexRect).fillWidth = true;
        });
      });
      warnings.push(`Row "${label0}": ${fullWidth.length} children were each drawn full-width; they now share the row.`);
    }

    // 0b. A button beside other content keeps its own width: filling, it took half the row and drew at the left of
    //     that half (a header's page action sat mid-header).
    // A row of only buttons placed at its end, centre or spread (justifyContent) too: a filling button draws at the
    // left of its box, so "Add recipe" sat at the left of a flex-end actions row.
    const placed = ['flex-end', 'end', 'center', 'space-between', 'space-around', 'space-evenly'].includes(
      text(prop(container, 'justifyContent'))
    );
    if (placed || children.some((child) => !ACTION_TYPES.has(child.type))) {
      const hasTitle = children.some((c) => isTitle(c, childrenOf));
      for (const child of children) {
        // A button anywhere in a mixed row; a badge, tag or link beside a title (it filled and floated mid-header).
        const inline = child.type === 'ShadButton' || (hasTitle && ['ShadBadge', 'ShadTags', 'ShadLink'].includes(child.type));
        if (!inline) continue;
        // A flex child fills unless it says fillWidth:false (flexContainer.utils resolveFlexChildSizing): an unset flag
        // filled half a gym header and drew its button mid-header, even with widthPx set.
        const rects = [child.layout, child.layouts?.desktop].filter(
          (rect): rect is NonNullable<ComponentSpec['layout']> => !!rect && (rect as FlexRect).fillWidth !== false
        );
        if (!rects.length) continue;
        const caption = text(prop(child, 'text')) || text(prop(child, 'label'));
        const fitted =
          child.type === 'ShadButton'
            ? Math.max(96, Math.ceil(caption.length * 8 + (text(prop(child, 'icon')) ? 64 : 40)))
            : Math.min(320, Math.max(48, Math.ceil(caption.length * 7 + 28)));
        const own = rects.map((rect) => (rect as FlexRect).widthPx).find((w) => typeof w === 'number' && w > 0);
        const width = own ?? fitted;
        rects.forEach((rect) => {
          (rect as FlexRect).fillWidth = false;
          (rect as FlexRect).widthPx = width;
        });
        warnings.push(`"${child.name}" in row "${label0}" filled the row's width; it now keeps its own (${width}px).`);
      }
    }
    // 0c. Headers with a title. A column of only buttons beside it is laid out as a row (a pets header stacked "Add a
    //     pet" over "Record vaccination"). In a space-between header, a group of actions and short meta text keep their
    //     own width and the title takes the rest: with all of them filling, the header split in halves and "Add recipe"
    //     and "24 saved" sat mid-header.
    if (children.some((c) => isTitle(c, childrenOf))) {
      const buttonWidth = (button: ComponentSpec): number => {
        const own = [button.layout, button.layouts?.desktop]
          .map((rect) => (rect as FlexRect | undefined)?.widthPx)
          .find((w) => typeof w === 'number' && w > 0);
        if (own) return own;
        const caption = text(prop(button, 'text')) || text(prop(button, 'label'));
        return Math.max(96, Math.ceil(caption.length * 8 + (text(prop(button, 'icon')) ? 64 : 40)));
      };
      const actionGroup = (c: ComponentSpec): ComponentSpec[] | null => {
        if (c.type !== 'FlexContainer' || isSurface(c)) return null;
        const inner = childrenOf(refOf(c) ?? '');
        return inner.length && inner.every((b) => ACTION_TYPES.has(b.type)) ? inner : null;
      };
      for (const c of children) {
        const inner = actionGroup(c);
        if (!inner || inner.length < 2 || isRow(c)) continue;
        setProp(c, 'direction', 'row');
        if (text(prop(c, 'gap')) === '') setProp(c, 'gap', 8);
        warnings.push(`"${c.name}" stacked its ${inner.length} buttons beside a title; it now lays them out in a row.`);
      }
      const [first, ...rest] = children;
      if (first && rest.length && isTitle(first, childrenOf) && text(prop(container, 'justifyContent')) === 'space-between') {
        const fills = (c: ComponentSpec) =>
          [c.layout, c.layouts?.desktop].filter(
            (rect): rect is NonNullable<ComponentSpec['layout']> => !!rect && (rect as FlexRect).fillWidth !== false
          );
        for (const c of rest) {
          const rects = fills(c);
          if (!rects.length) continue;
          let width: number | null = null;
          const inner = actionGroup(c);
          if (inner) {
            const rawGap = text(prop(c, 'gap'));
            const gap = rawGap === '' ? 8 : Number(rawGap) || 0;
            const rawPad = text(prop(c, 'padding'));
            const pad = rawPad === '' ? 12 : Number(rawPad) || 0;
            width = inner.reduce((sum, b) => sum + buttonWidth(b), 0) + gap * (inner.length - 1) + pad * 2 + 4;
          } else if (c.type === 'ShadText') {
            // A binding counts as a few characters ("{{rows.length}} saved" reads "24 saved").
            const shown = text(prop(c, 'text')).replace(/\{\{[\s\S]*?\}\}/g, '0000');
            if (shown.length <= 40) width = Math.min(320, Math.max(48, Math.ceil(shown.length * 7 + 28)));
          }
          if (width === null) continue;
          const own = width;
          rects.forEach((rect) => {
            (rect as FlexRect).fillWidth = false;
            (rect as FlexRect).widthPx = own;
          });
          warnings.push(`"${c.name}" in header "${label0}" filled half the header; it now keeps its own width (${own}px).`);
        }
        const titleRects = [first.layout, first.layouts?.desktop].filter(
          // A title the build sized itself (fillWidth:false) keeps its width; space-between still puts the rest right.
          (rect): rect is NonNullable<ComponentSpec['layout']> => !!rect && (rect as FlexRect).fillWidth === undefined
        );
        if (titleRects.length && rest.every((c) => !fills(c).length)) {
          titleRects.forEach((rect) => {
            (rect as FlexRect).fillWidth = true;
          });
        }
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

    // 2c. A table in one of several cards side by side fits its columns to the card's share of the page (about 1280px
    //     wide): four tables on a room board clipped their last column ("Mark clean", guest names). Columns scale
    //     down together, none below 64px; the widths stay ordinary column sizes, editable in the inspector.
    //     A table card beside a chart counts too, at its own width when it sets one: a six-column table in a 390px
    //     card beside a trend chart ran off the card's right edge.
    if (children.length >= 2 && children.some(isSurface)) {
      const rawGap = text(prop(container, 'gap'));
      const gap = rawGap === '' ? 16 : Number(rawGap) || 0;
      const share = Math.floor((1280 - gap * (children.length - 1)) / children.length);
      for (const card of children) {
        if (!isSurface(card)) continue;
        const rawPad = text(prop(card, 'padding'));
        const pad = rawPad === '' ? 12 : Number(rawPad) || 0;
        const own = fixedRects(card).map((rect) => rect.widthPx).find((w) => typeof w === 'number' && w > 0);
        const available = (own ?? share) - pad * 2 - 4;
        for (const table of childrenOf(refOf(card) ?? '')) {
          if (table.type !== 'Table') continue;
          const columns = valueOf(prop(table, 'columns'));
          if (!Array.isArray(columns)) continue;
          const visible = columns.filter(
            (c): c is Record<string, unknown> => !!c && typeof c === 'object' && (c as Record<string, unknown>).columnVisibility !== false
          );
          const size = (c: Record<string, unknown>) => (Number.isFinite(Number(c.columnSize)) ? Number(c.columnSize) : 120);
          const total = visible.reduce((sum, c) => sum + size(c), 0);
          if (!visible.length || total <= available) continue;
          // Squeezed under 80px a column cuts its values to a letter or two: ask for fewer columns instead.
          if (available / visible.length < 80) {
            warnings.push(
              `Table "${table.name}" shows ${visible.length} columns (${total}px) in a card about ${available}px wide; ` +
                'show fewer columns there (the 3 or 4 this card is about), or give the card more of the row.'
            );
            continue;
          }
          const factor = available / total;
          setProp(
            table,
            'columns',
            columns.map((c) =>
              visible.includes(c as Record<string, unknown>)
                ? {
                    ...(c as Record<string, unknown>),
                    // A button column keeps room for its button's label.
                    columnSize: Math.max(
                      (c as Record<string, unknown>).columnType === 'button' ? 110 : 64,
                      Math.floor(size(c as Record<string, unknown>) * factor)
                    ),
                  }
                : c
            )
          );
          warnings.push(`Table "${table.name}" in a narrow card: its columns (${total}px) now fit the card's ${available}px.`);
        }
      }
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

    // 4b. A space-between header with a title and two or more items after it: the title takes the free space, so the
    //     badges and actions gather at the right instead of one floating mid-header.
    if (text(prop(container, 'justifyContent')) === 'space-between' && children.length >= 3) {
      const first = children[0];
      if (isTitle(first, childrenOf)) {
        const rects = [first.layout, first.layouts?.desktop].filter(
          (rect): rect is NonNullable<ComponentSpec['layout']> => !!rect && (rect as FlexRect).fillWidth !== true
        );
        if (rects.length) {
          rects.forEach((rect) => {
            (rect as FlexRect).fillWidth = true;
          });
          warnings.push(`Row "${label}": the title now takes the free space, so the items after it sit together at the right of the header.`);
        }
      }
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
