/** The modal containers with ModalV2's contract: ModalV2 and the shadcn/ui pack's Dialog (ModalV2 in the pack's look:
 *  same slots, canvases, open/close actions, show and launch button). */
export const MODAL_V2_TYPES = new Set(['ModalV2', 'ShadDialog']);
export const isModalV2Type = (type: string | undefined | null): boolean => MODAL_V2_TYPES.has(type ?? '');
