export const COMPONENT_SLOT_NAMES = ['body', 'header', 'footer'] as const;

export type ComponentSlotName = (typeof COMPONENT_SLOT_NAMES)[number];

export interface DecodedComponentParent {
  parentId: string;
  slotName: ComponentSlotName;
  /** Tabs persist children as `<tabs component id>-<tab id>`. */
  tabId?: string;
}

const ENCODED_SLOT_SUFFIXES = ['header', 'footer'] as const;

/**
 * ToolJet persists header/footer placement by suffixing the parent component id. The MCP surface
 * exposes a stable slot name so callers never need to know that storage convention. Body children
 * use the unsuffixed parent id.
 */
export function encodeComponentParent(
  parentId: string,
  slotName?: ComponentSlotName,
  tabId?: string
): string {
  if (slotName && tabId !== undefined) {
    throw new Error('A component parent cannot use both slotName and tabId.');
  }
  if (tabId !== undefined) {
    if (!tabId.trim()) throw new Error('tabId must be a non-empty string.');
    const base = decodeComponentParent(parentId).parentId;
    return `${base}-${tabId}`;
  }
  if (!slotName) return parentId;
  if (slotName === 'body') return decodeComponentParent(parentId).parentId;
  const base = decodeComponentParent(parentId).parentId;
  return `${base}-${slotName}`;
}

export function decodeComponentParent(
  parentId: string,
  tabsParentIds?: Iterable<string>
): DecodedComponentParent {
  for (const slotName of ENCODED_SLOT_SUFFIXES) {
    const suffix = `-${slotName}`;
    if (parentId.endsWith(suffix)) {
      return { parentId: parentId.slice(0, -suffix.length), slotName };
    }
  }
  if (tabsParentIds) {
    const tabsParentId = [...tabsParentIds]
      .filter((candidate) => parentId.startsWith(`${candidate}-`))
      .sort((left, right) => right.length - left.length)[0];
    if (tabsParentId) {
      return {
        parentId: tabsParentId,
        slotName: 'body',
        tabId: parentId.slice(tabsParentId.length + 1),
      };
    }
  }
  return { parentId, slotName: 'body' };
}
