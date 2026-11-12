import { decodeComponentParent } from './componentParent.js';

/**
 * FlexContainer is laid out by the browser, not by ToolJet's grid. Its children render in the order of
 * `properties.childOrder.value` (an array of child component ids); a child missing from that array is
 * appended in whatever order the page store happens to hold it (frontend
 * Widgets/FlexContainer/flexContainer.utils.js `normalizeChildOrder`). The editor writes childOrder on every
 * drop and move (`_stores/slices/flexContainerSlice.js`), so a component batch written through this server
 * has to write it too, or the children come out shuffled.
 */
export const FLEX_CONTAINER_TYPE = 'FlexContainer';

export const FLEX_FILL_WIDTH_DESCRIPTION =
  'FlexContainer child only: true (the default) fills the free main-axis width; false uses widthPx. Ignored elsewhere.';
export const FLEX_WIDTH_PX_DESCRIPTION =
  'FlexContainer child only: fixed width in pixels, applied when fillWidth is false. Ignored elsewhere.';
export const FLEX_GROW_DESCRIPTION =
  'FlexContainer row child only: share of the free width among fill children (default 1; 2 beside 1 takes two thirds). Ignored elsewhere.';
export const FLEX_MIN_WIDTH_PX_DESCRIPTION =
  'FlexContainer row child only: narrowest a fill child may get, in pixels; in a wrapping row a narrower child moves to the next line. Ignored elsewhere.';

export function isFlexContainerType(type: unknown): boolean {
  return type === FLEX_CONTAINER_TYPE;
}

/** The stored childOrder of a component definition's properties, or [] when absent or malformed. */
export function storedChildOrder(properties: Record<string, unknown> | undefined): string[] {
  const entry = properties?.childOrder as { value?: unknown } | unknown[] | undefined;
  const value = Array.isArray(entry) ? entry : (entry as { value?: unknown } | undefined)?.value;
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
}

/** Port of ToolJet's normalizeChildOrder: the stored order restricted to real children, then the rest. */
export function normalizeChildOrder(childOrder: readonly string[], actualChildIds: readonly string[]): string[] {
  const actual = new Set(actualChildIds);
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const id of [...childOrder.filter((id) => actual.has(id)), ...actualChildIds]) {
    if (seen.has(id)) continue;
    seen.add(id);
    normalized.push(id);
  }
  return normalized;
}

export interface FlexPageComponent {
  id: string;
  type?: string;
  parent?: string;
  properties?: Record<string, unknown>;
  layouts?: unknown;
}

function desktopRect(component: FlexPageComponent): { top: number; left: number } {
  const desktop = (component.layouts as { desktop?: { top?: unknown; left?: unknown } } | undefined)?.desktop;
  return {
    top: typeof desktop?.top === 'number' ? desktop.top : 0,
    left: typeof desktop?.left === 'number' ? desktop.left : 0,
  };
}

/** The id of the component's body parent, or undefined for a page-root component or a header/footer child. */
function bodyParentId(parent: string | undefined): string | undefined {
  if (!parent) return undefined;
  const decoded = decodeComponentParent(parent);
  return decoded.slotName === 'body' ? decoded.parentId : undefined;
}

/**
 * The order a FlexContainer on the page renders today: its stored childOrder, then any child the stored order
 * misses. Those are sorted by their grid position (top, then left), the order a model that authored them with
 * grid coordinates most likely meant, rather than left in the arbitrary order the page read returns them.
 */
export function currentChildOrder(container: FlexPageComponent, page: readonly FlexPageComponent[]): string[] {
  const children = page.filter((component) => bodyParentId(component.parent) === container.id);
  const stored = storedChildOrder(container.properties);
  const storedSet = new Set(stored);
  const unordered = children
    .filter((child) => !storedSet.has(child.id))
    .sort((a, b) => {
      const ra = desktopRect(a), rb = desktopRect(b);
      return ra.top - rb.top || ra.left - rb.left;
    })
    .map((child) => child.id);
  return normalizeChildOrder(stored, [...children.map((child) => child.id).filter((id) => storedSet.has(id)), ...unordered]);
}

/**
 * New children added to FlexContainers that already exist on the page, appended to each container's current
 * order in request order. `additions` pairs a parent id (body slot) with the new child's id. Returns the next
 * childOrder for each existing FlexContainer whose stored order changes; parents that are not FlexContainers, or
 * are not on the page, are skipped.
 *
 * A child created again under an id the container's stored order already lists (a page replace recreates a
 * changed component under its own id) keeps its position: only ids the stored order does not hold are appended.
 */
export function appendedChildOrders(
  page: readonly FlexPageComponent[],
  additions: ReadonlyArray<{ parentId: string; childId: string }>
): Map<string, string[]> {
  const byId = new Map(page.map((component) => [component.id, component]));
  const added = new Map<string, string[]>();
  for (const { parentId, childId } of additions) {
    const container = byId.get(parentId);
    if (!container || !isFlexContainerType(container.type)) continue;
    const ids = added.get(parentId) ?? [];
    if (!ids.includes(childId)) ids.push(childId);
    added.set(parentId, ids);
  }
  const orders = new Map<string, string[]>();
  for (const [parentId, newIds] of added) {
    const container = byId.get(parentId)!;
    const newSet = new Set(newIds);
    const existing = currentChildOrder(container, page.filter((component) => !newSet.has(component.id)));
    const stored = storedChildOrder(container.properties);
    const next = normalizeChildOrder(stored, [...existing, ...newIds]);
    if (next.length !== stored.length || next.some((id, index) => stored[index] !== id)) orders.set(parentId, next);
  }
  return orders;
}

/**
 * The childOrder for each FlexContainer created in one batch: its body children in request order, after any
 * order the caller set explicitly. `entries` are the batch in request order, each with its final id, the id of
 * its body parent (if any), and its type; `explicit` maps a container id to an authored order whose items may be
 * ids, client refs or names of batch components (resolved by `resolveRef`).
 */
export function batchChildOrders(
  entries: ReadonlyArray<{ id: string; type?: string; parentId?: string }>,
  explicit: Map<string, unknown[]> = new Map(),
  resolveRef: (ref: string) => string | undefined = () => undefined
): Map<string, string[]> {
  const orders = new Map<string, string[]>();
  for (const container of entries) {
    if (!isFlexContainerType(container.type)) continue;
    const children = entries.filter((entry) => entry.parentId === container.id).map((entry) => entry.id);
    const authored = (explicit.get(container.id) ?? [])
      .flatMap((ref) => (typeof ref === 'string' ? [resolveRef(ref) ?? ref] : []));
    orders.set(container.id, [...new Set([...authored, ...children])]);
  }
  return orders;
}

/** A childOrder value written as a property: ToolJet's `{ value: [...] }` envelope. */
export function childOrderProperty(order: string[]): { value: string[] } {
  return { value: order };
}

export { bodyParentId as flexBodyParentId };

/**
 * Children moved into an existing FlexContainer by a reparent (update_layout / update_components `parent`):
 * the container-to-child pairs whose body parent actually changes. A move within the same container keeps its
 * position; drag-reordering is the editor's job, or an explicit childOrder through update_components.
 */
export function reparentAdditions(
  page: readonly FlexPageComponent[],
  moves: ReadonlyArray<{ componentId: string; parent?: string }>
): Array<{ parentId: string; childId: string }> {
  const byId = new Map(page.map((component) => [component.id, component]));
  return moves.flatMap(({ componentId, parent }) => {
    if (parent === undefined) return [];
    const nextParent = bodyParentId(parent);
    if (!nextParent || nextParent === bodyParentId(byId.get(componentId)?.parent)) return [];
    return [{ parentId: nextParent, childId: componentId }];
  });
}

/**
 * An authored FlexContainer childOrder resolved against the page: each item may be a child's id or its name.
 * Returns the complete order (the authored items first, then any other current child in its current place) and
 * the items that do not name a child of this container.
 */
export function resolveAuthoredChildOrder(
  container: FlexPageComponent,
  page: ReadonlyArray<FlexPageComponent & { name?: string }>,
  authored: readonly unknown[]
): { order: string[]; unknown: string[] } {
  const children = page.filter((component) => bodyParentId(component.parent) === container.id);
  const unknown: string[] = [];
  const ids = authored.flatMap((item) => {
    const ref = typeof item === 'string' ? item : String(item);
    const child = children.find((candidate) => candidate.id === ref) ?? children.find((candidate) => candidate.name === ref);
    if (!child) {
      unknown.push(ref);
      return [];
    }
    return [child.id];
  });
  return { order: normalizeChildOrder(ids, [...ids, ...currentChildOrder(container, page)]), unknown };
}
