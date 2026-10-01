import { z } from 'zod';

export const COMPONENT_SLOT_NAMES = ['body', 'header', 'footer', 'modal'] as const;

/** A tab of a Tabs component: "tab-<tab item id>", the item ids being t0, t1, ... */
export type TabSlotName = `tab-t${number}`;
export type ComponentSlotName = (typeof COMPONENT_SLOT_NAMES)[number] | TabSlotName;

const TAB_SLOT = /^tab-(t\d+)$/;
const TAB_CANVAS_SUFFIX = /-(t\d+)$/;

export function isComponentSlotName(value: unknown): value is ComponentSlotName {
  return typeof value === 'string' && ((COMPONENT_SLOT_NAMES as readonly string[]).includes(value) || TAB_SLOT.test(value));
}

export function isTabSlot(value: unknown): value is TabSlotName {
  return typeof value === 'string' && TAB_SLOT.test(value);
}

/** The slot_name a tool accepts: header, body, footer, Kanban modal, or a tab ("tab-t0"). */
export const componentSlotSchema = z.union([z.enum(COMPONENT_SLOT_NAMES), z.string().regex(TAB_SLOT)]) as unknown as z.ZodType<ComponentSlotName>;

const ENCODED_SLOT_SUFFIXES = ['header', 'footer', 'modal'] as const;

/**
 * ToolJet persists header/footer placement by suffixing the parent component id. The MCP surface
 * exposes a stable slot name so callers never need to know that storage convention. Body children
 * use the unsuffixed parent id. Kanban's separate card-click canvas uses the modal suffix. A tab's
 * children sit on "<tabs id>-<tab item id>" (frontend Tabs.jsx: SubContainer id={`${id}-${tab.id}`});
 * tab item ids are t0, t1, ..., which no UUID segment can end with, so the suffix decodes unambiguously.
 */
export function encodeComponentParent(parentId: string, slotName?: ComponentSlotName): string {
  if (!slotName) return parentId;
  if (slotName === 'body') return decodeComponentParent(parentId).parentId;
  const base = decodeComponentParent(parentId).parentId;
  const tab = TAB_SLOT.exec(slotName);
  return tab ? `${base}-${tab[1]}` : `${base}-${slotName}`;
}

export function decodeComponentParent(parentId: string): {
  parentId: string;
  slotName: ComponentSlotName;
} {
  for (const slotName of ENCODED_SLOT_SUFFIXES) {
    const suffix = `-${slotName}`;
    if (parentId.endsWith(suffix)) {
      return { parentId: parentId.slice(0, -suffix.length), slotName };
    }
  }
  const tab = TAB_CANVAS_SUFFIX.exec(parentId);
  if (tab) return { parentId: parentId.slice(0, -tab[0].length), slotName: `tab-${tab[1]}` as TabSlotName };
  return { parentId, slotName: 'body' };
}
