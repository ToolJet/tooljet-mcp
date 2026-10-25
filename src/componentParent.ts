import { z } from 'zod';

export const COMPONENT_SLOT_NAMES = ['body', 'header', 'footer', 'modal'] as const;

/** A tab of a Tabs component: "tab-<tab item id>", the item ids being t0, t1, ... */
export type TabSlotName = `tab-t${number}`;
export type ComponentSlotName = (typeof COMPONENT_SLOT_NAMES)[number] | TabSlotName;

const TAB_SLOT = /^tab-(t\d+)$/;
// A tab of a published library's tabs container (ToolJet.Slot `tab_<item id>`): stored as "<id>-tab_t0".
const LIBRARY_TAB_SLOT = /^tab_[A-Za-z0-9_]+$/;
const TAB_CANVAS_SUFFIX = /-(t\d+)$/;

export function isComponentSlotName(value: unknown): value is ComponentSlotName {
  return (
    typeof value === 'string' &&
    ((COMPONENT_SLOT_NAMES as readonly string[]).includes(value) || TAB_SLOT.test(value) || LIBRARY_TAB_SLOT.test(value))
  );
}

export function isTabSlot(value: unknown): value is TabSlotName {
  return typeof value === 'string' && TAB_SLOT.test(value);
}

/** The slot_name a tool accepts: header, body, footer, Kanban modal, or a tab ("tab-t0"). */
export const componentSlotSchema = z.union([
  z.enum(COMPONENT_SLOT_NAMES),
  z.string().regex(TAB_SLOT),
  z.string().regex(LIBRARY_TAB_SLOT),
]) as unknown as z.ZodType<ComponentSlotName>;

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

/**
 * A `parent` naming an existing component on the page by its name instead of its id, resolved to the id (with any
 * slot kept). A deepseek build added four cards with parent "rowTrend" (2026-10-13): stored as written, the name
 * matched no component, ToolJet left the cards unattached and the page showed two empty rows.
 */
export function resolveParentRef(
  pageComponents: readonly { id: string; name?: string }[],
  parent: string
): { ok: true; parent: string; renamed: boolean } | { ok: false; error: string } {
  const byId = (id: string) => pageComponents.some((component) => component.id === id);
  if (byId(parent) || byId(decodeComponentParent(parent).parentId)) return { ok: true, parent, renamed: false };
  const named = (name: string) => pageComponents.filter((component) => component.name === name);
  const whole = named(parent);
  if (whole.length === 1) return { ok: true, parent: whole[0].id, renamed: true };
  const decoded = decodeComponentParent(parent);
  const base = named(decoded.parentId);
  if (whole.length === 0 && base.length === 1) {
    return { ok: true, parent: encodeComponentParent(base[0].id, decoded.slotName), renamed: true };
  }
  if (whole.length > 1 || base.length > 1) {
    return { ok: false, error: `parent "${parent}" names more than one component on this page; pass the parent's id.` };
  }
  return {
    ok: false,
    error:
      `parent "${parent}" is not a component on this page (by id or name), so the component would be stored detached ` +
      'and never render. Pass an existing container id or name, or create the parent in the same batch with client_ref/parent_ref.',
  };
}
