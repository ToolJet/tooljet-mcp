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
    component && typeof component === 'object' ? { ...component, properties: { ...props(component) } } : component
  );
  const childrenOf = (ref: string): ComponentSpec[] =>
    components.filter((component) => component && component.parentRef === ref && !component.slotName);

  for (const container of components) {
    if (!container || !isRow(container)) continue;
    const ref = refOf(container);
    if (!ref) continue;
    const children = childrenOf(ref);
    if (children.length < 2) continue;
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

    // 3. Actions before the title in a header row move after it.
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
