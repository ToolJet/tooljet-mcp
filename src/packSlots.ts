/* The drop areas of a pack widget. A pack widget draws each slot, its body included, on a canvas "<id>-<slot>"
   (ToolJet's SdkComponentHost renderSlot); a child on a canvas the widget does not draw is saved and never shown.
   A pack's manifest lists the slots each component drew when the pack was built: fixed ones (a Card's body, a
   SplitPane's first and second, a Modal's popup body, a List's row) and, for a component that repeats items, one per
   item of its default list (Tabs tab_tab1, Collapse panel_panel1, Stepper step_account). Those are named
   "<prefix>_<key>" from the widget's own items (the packs' lib/slots.ts slotNames), so a Tabs whose items are
   overview and details draws tab_overview and tab_details. QA on PR #18847, 2026-11-12: a child added with no
   slot_name under a Collapse, Stepper or SplitPane went on a canvas none of them draws (DVRL-9), and any tab_<key> was
   taken under any parent (DVRL-60). */
import JSON5 from 'json5';
import { getComponentSchema } from './catalog.js';

/** Slots "<prefix>_<key>", one per item of `itemsProp`, keyed by the item's `keyField`. */
export interface PackSlotFamily {
  prefix: string;
  itemsProp: string;
  keyField: string;
  /** The property's default: the items of a widget that leaves it unset. */
  defaultItems: unknown[];
}

export interface PackSlots {
  fixed: string[];
  families: PackSlotFamily[];
}

// The packs' slotNames (packs/*/src/lib/slots.ts, the same in each): a key's characters other than letters, digits and
// underscores fold to "_", and a key that then collides with another gets a tag of its own text.
export const toSlotName = (prefix: string, key: string): string => `${prefix}_${key.replace(/[^A-Za-z0-9_]/g, '_')}`;

const keyTag = (key: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
};

export function slotNames(prefix: string, keys: string[]): string[] {
  const names: string[] = [];
  const taken = new Set<string>();
  const distinct = [...new Set(keys)];
  const plain = distinct.filter((k) => /^[A-Za-z0-9_]*$/.test(k));
  const folded = distinct.filter((k) => !/^[A-Za-z0-9_]*$/.test(k)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (const k of plain) {
    names.push(toSlotName(prefix, k));
    taken.add(toSlotName(prefix, k));
  }
  for (const k of folded) {
    const base = toSlotName(prefix, k);
    let name = base;
    for (let n = 1; taken.has(name); n += 1) name = `${base}_${keyTag(k)}${n > 1 ? `_${n}` : ''}`;
    names.push(name);
    taken.add(name);
  }
  return names;
}

const KEY_FIELDS = ['key', 'id', 'value', 'name'];

/** Each item's key in `field`, or null when an item has none (the widget then keys it its own way). */
function keysOf(items: unknown[], field: string): string[] | null {
  const keys = items.map((item) => {
    const value = item && typeof item === 'object' ? (item as Record<string, unknown>)[field] : undefined;
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  });
  return keys.every(Boolean) ? keys : null;
}

/** A manifest component's slots: the ones a default item list names form a family, the rest are fixed. */
export function packSlotsFromManifest(
  slots: ReadonlyArray<{ name: string; kind?: string }> | undefined,
  props: ReadonlyArray<{ name: string; default?: unknown }> | undefined
): PackSlots | undefined {
  if (!slots?.length) return undefined;
  const names = slots.map((slot) => slot.name);
  const families: PackSlotFamily[] = [];
  const claimed = new Set<string>();
  const prefixes = [...new Set(names.flatMap((name) => /^([A-Za-z0-9]+)_./.exec(name)?.[1] ?? []))];
  for (const prefix of prefixes) {
    const listed = names.filter((name) => name.startsWith(`${prefix}_`));
    const family = (props ?? []).flatMap((prop) => {
      if (!Array.isArray(prop.default) || !prop.default.length) return [];
      return KEY_FIELDS.flatMap((field) => {
        const keys = keysOf(prop.default as unknown[], field);
        const drawn = keys ? new Set(slotNames(prefix, keys)) : undefined;
        return drawn && listed.every((name) => drawn.has(name))
          ? [{ prefix, itemsProp: prop.name, keyField: field, defaultItems: prop.default as unknown[] }]
          : [];
      });
    })[0];
    if (!family) continue;
    families.push(family);
    listed.forEach((name) => claimed.add(name));
  }
  return { fixed: names.filter((name) => !claimed.has(name)), families };
}

/** For the catalogue: the slot_names a widget's child components take. */
export function describePackSlots(slots: PackSlots | undefined): string | undefined {
  if (!slots) return undefined;
  const parts = [
    ...slots.fixed,
    ...slots.families.map((family) => {
      const sample = slotNames(family.prefix, keysOf(family.defaultItems, family.keyField) ?? []);
      return `${family.prefix}_<${family.keyField} of each ${family.itemsProp} item>${sample.length ? ` (by default ${sample.join(', ')})` : ''}`;
    }),
  ];
  return parts.length ? `Child components go in slot_name ${parts.join(', ')}.` : undefined;
}

/** The slots of a pack type (Lib_<pack>_<Component>) from its catalogue entry, or undefined for any other type and
 *  for a pack this server has not read. */
export function packSlotsOfType(type: unknown): PackSlots | undefined {
  if (typeof type !== 'string' || !type.startsWith('Lib_')) return undefined;
  return (getComponentSchema(type) as { pack?: { slotInfo?: PackSlots } } | null)?.pack?.slotInfo;
}

/** A property's items as the widget reads them: undefined when unset, null when they come from a binding. */
function itemsOf(properties: unknown, key: string): unknown[] | undefined | null {
  const entry = (properties as Record<string, unknown> | undefined)?.[key];
  if (entry === undefined) return undefined;
  const raw = entry && typeof entry === 'object' && !Array.isArray(entry) && 'value' in entry ? (entry as { value?: unknown }).value : entry;
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  const body = /^\s*\{\{([\s\S]*)\}\}\s*$/.exec(raw)?.[1]?.trim() ?? (raw.trim().startsWith('[') ? raw : undefined);
  if (body === undefined) return raw.includes('{{') ? null : [];
  try {
    const value = JSON5.parse(body.replace(/^\(([\s\S]*)\)$/, '$1')) as unknown;
    return Array.isArray(value) ? value : [];
  } catch {
    return null;
  }
}

export interface WidgetSlots {
  /** The slots the widget draws that are known here. */
  known: string[];
  /** Families whose items come from data (a binding), so any "<prefix>_<key>" may be one of its slots. */
  open: Array<{ prefix: string; itemsProp: string }>;
}

/** The slots a pack widget draws, from its type and its properties (pass properties undefined when they are not known:
 *  its item families are then open). Undefined for a widget that is not a pack's. */
export function widgetSlots(
  component: { type?: unknown; properties?: unknown },
  { propertiesKnown = true }: { propertiesKnown?: boolean } = {}
): WidgetSlots | undefined {
  const slots = packSlotsOfType(component.type);
  if (!slots) return undefined;
  const known = [...slots.fixed];
  const open: WidgetSlots['open'] = [];
  for (const family of slots.families) {
    const items = propertiesKnown ? itemsOf(component.properties, family.itemsProp) : null;
    const keys = items === null ? null : keysOf(items ?? family.defaultItems, family.keyField);
    if (keys) known.push(...slotNames(family.prefix, keys));
    else open.push({ prefix: family.prefix, itemsProp: family.itemsProp });
  }
  return { known, open };
}

export type SlotResolution = { ok: true; slotName?: string } | { ok: false; error: string };

/**
 * The slot a child of a pack widget goes in: the one named, when the widget draws it; with none named, its body, or its
 * only slot. Anything else is refused with the slots it has, before a write that would store a child never shown.
 * A parent that is not a pack widget this server has read is left as it was.
 */
export function resolvePackSlot(
  parent: { id?: string; name?: string; type?: unknown; properties?: unknown },
  slotName: string | undefined,
  child: string,
  options: { propertiesKnown?: boolean } = {}
): SlotResolution {
  const slots = widgetSlots(parent, options);
  if (!slots) return { ok: true, slotName };
  const listed = [...slots.known, ...slots.open.map((family) => `${family.prefix}_<key of each ${family.itemsProp} item>`)];
  const where = `${String(parent.type)} "${parent.name ?? parent.id ?? '?'}"`;
  if (slotName === undefined) {
    if (slots.known.includes('body')) return { ok: true, slotName: 'body' };
    if (slots.known.length === 1 && !slots.open.length) return { ok: true, slotName: slots.known[0] };
    return {
      ok: false,
      error:
        `Component "${child}": ${where} draws its children in named slots; set slot_name to one of ${listed.join(', ')}. ` +
        'Without one the component is saved on a canvas the widget does not draw, and never shown.',
    };
  }
  if (slots.known.includes(slotName)) return { ok: true, slotName };
  if (slots.open.some((family) => slotName.startsWith(`${family.prefix}_`) && slotName.length > family.prefix.length + 1)) {
    return { ok: true, slotName };
  }
  return {
    ok: false,
    error:
      `Component "${child}": ${where} has no slot "${slotName}" (its slots: ${listed.join(', ')}), so the component ` +
      'would be saved and never shown. Use one of those slots, or add the item it should go in to the widget first.',
  };
}
