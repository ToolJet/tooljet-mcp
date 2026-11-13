/* A pack container that draws one canvas per item of a list property: ToolJet.Slot "<prefix>_<item id>", stored as the
   child's parent "<container id>-<prefix>_<item id>". Renaming an item's id or removing the item leaves its children on
   a canvas nothing draws: saved, never shown, and unreachable in the editor. These mirror how each pack reads its items
   and names their canvases (ToolJet packs/<pack>/src: lib/slots.ts slotNames, toItems, ui2/nav/model.ts toTabs, and
   lib/data.ts toKeyedItems), so a stranded child can be refused before it is written. */

const MAX_SLOT_ITEMS = 50;

type Ids = (raw: unknown[]) => string[];

const str = (value: unknown): string => (value === undefined || value === null ? '' : String(value));
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

// shadcn TabsContainer (toTabs): a scalar is its own id; an object its id or value, else its position.
const shadTabIds: Ids = (raw) =>
  raw.slice(0, MAX_SLOT_ITEMS).flatMap((item, i) => {
    if (item === null || item === undefined || typeof item !== 'object') return item === null || item === undefined ? [] : [String(item)];
    if (!isRecord(item)) return [];
    return [str(item.id ?? item.value) || String(i + 1)];
  });

// shadcn Stepper and AccordionContainer (toItems): objects only, their id, else their position among the objects.
const shadItemIds: Ids = (raw) =>
  raw
    .filter(isRecord)
    .slice(0, MAX_SLOT_ITEMS)
    .map((item, i) => String(item.id ?? i + 1));

// Ant Design and MUI (toKeyedItems): a string is its own key; an object its key, id, value or label. No position.
const keyedIds: Ids = (raw) =>
  raw.slice(0, MAX_SLOT_ITEMS).flatMap((item) => {
    if (typeof item === 'string') return item ? [item] : [];
    if (!isRecord(item)) return [];
    const key = str(item.key ?? item.id ?? item.value ?? item.label);
    return key ? [key] : [];
  });

const CONTAINERS: Record<string, { property: string; prefix: string; ids: Ids }> = {
  Lib_shadcn_TabsContainer: { property: 'tabs', prefix: 'tab', ids: shadTabIds },
  Lib_shadcn_Stepper: { property: 'steps', prefix: 'step', ids: shadItemIds },
  Lib_shadcn_AccordionContainer: { property: 'sections', prefix: 'section', ids: shadItemIds },
  Lib_antd_Tabs: { property: 'items', prefix: 'tab', ids: keyedIds },
  Lib_antd_Collapse: { property: 'items', prefix: 'panel', ids: keyedIds },
  Lib_mui_Tabs: { property: 'tabs', prefix: 'tab', ids: keyedIds },
};

const toSlotName = (prefix: string, id: string) => `${prefix}_${id.replace(/\W/g, '_')}`;

// FNV-1a tag of an id, as the packs tag ids whose slot names collide.
const idTag = (id: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
};

/** The packs' slotNames: each distinct id's canvas name, colliding folded ids tagged. */
function slotNames(prefix: string, ids: string[]): Set<string> {
  const taken = new Set<string>();
  const distinct = [...new Set(ids)];
  for (const id of distinct.filter((id) => !/\W/.test(id))) taken.add(toSlotName(prefix, id));
  for (const id of distinct.filter((id) => /\W/.test(id)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    const base = toSlotName(prefix, id);
    let name = base;
    for (let n = 1; taken.has(name); n += 1) name = `${base}_${idTag(id)}${n > 1 ? `_${n}` : ''}`;
    taken.add(name);
  }
  return taken;
}

/** The item canvases a pack container draws now, or undefined when its type is not one or its items are not a literal
 *  list (a binding resolves only at runtime). */
export function packItemSlots(type: unknown, properties: Record<string, unknown> | undefined): { prefix: string; property: string; slots: Set<string> } | undefined {
  const container = typeof type === 'string' ? CONTAINERS[type] : undefined;
  if (!container) return undefined;
  const entry = properties?.[container.property];
  const raw = isRecord(entry) && 'value' in entry ? entry.value : entry;
  if (!Array.isArray(raw)) return undefined;
  return { prefix: container.prefix, property: container.property, slots: slotNames(container.prefix, container.ids(raw)) };
}
