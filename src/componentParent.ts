export const COMPONENT_SLOT_NAMES = ['body', 'header', 'footer'] as const;

export type ComponentSlotName = (typeof COMPONENT_SLOT_NAMES)[number];

const ENCODED_SLOT_SUFFIXES = ['header', 'footer'] as const;

/**
 * ToolJet persists header/footer placement by suffixing the parent component id. The MCP surface
 * exposes a stable slot name so callers never need to know that storage convention. Body children
 * use the unsuffixed parent id.
 */
export function encodeComponentParent(parentId: string, slotName?: ComponentSlotName): string {
  if (!slotName) return parentId;
  if (slotName === 'body') return decodeComponentParent(parentId).parentId;
  const base = decodeComponentParent(parentId).parentId;
  return `${base}-${slotName}`;
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
  return { parentId, slotName: 'body' };
}
