import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeComponentParent } from './componentParent.js';
import type { ComponentLayout, ComponentSpec, ComponentSummary } from './tooljetClient.js';

/**
 * A page replace, compared with what the page holds.
 *
 * Replacing a page deleted every component on it and created the plan's: a one-line change rewrote the whole page,
 * gave every component a new id (so events elsewhere had to be re-pointed) and left the page half-built when a
 * write failed midway. ToolJet keeps a component's children when it is deleted and accepts a create under an id
 * that was just freed (probed live, 2026-09-30), so the plan can be applied as a difference instead:
 *
 * - a component the plan leaves as it is is not written;
 * - one that only moved gets a layout update;
 * - one that changed is deleted and created again under its own id (an update merges into the stored definition
 *   and would keep values the plan no longer sets);
 * - one the plan adds is created, one it drops is deleted.
 *
 * Components are matched by name, which is unique in an app. "As it is" is exact, not a heuristic: ToolJet stores a
 * component as it was sent and, on every read, merges it over the widget's default definition (the server's
 * buildComponentMetaDefinition). The plan is put through the same merge (data/component-default-definitions.json,
 * generated from ToolJet's widget-config) and compared with the page as read. A widget this build has no defaults
 * for, or whose defaults differ on the instance, compares as changed: that costs a rewrite and never keeps a value
 * the plan does not ask for.
 */
export interface InPlaceComponent extends ComponentSpec {
  /** The id the component is created under: its own when it replaces a component of the same name. */
  id: string;
}

export interface InPlaceDiff {
  /** Planned ref (client ref, and name) -> the component's id after the apply. */
  ids: Map<string, string>;
  /** Names of components left untouched. */
  keep: string[];
  relayout: Array<{ componentId: string; desktop?: ComponentLayout; mobile?: ComponentLayout }>;
  /** New components and changed ones, each with the id to create it under and its parent resolved to an id. */
  create: InPlaceComponent[];
  /** Names among `create` that replace a component of the same name. */
  recreated: string[];
  /** Changed components (created again under the same id) and ones the plan drops. */
  deleteIds: string[];
  /** For each recreated component, what differed (its type, parent, or the first differing entry). */
  why: Record<string, string>;
}

type Section = 'properties' | 'styles' | 'validation' | 'others';
const SECTIONS: Section[] = ['properties', 'styles', 'validation', 'others'];
/** Widget type -> its default definition, by section. */
export type DefaultDefinitions = Record<string, Partial<Record<Section, Record<string, unknown>>>>;

let bundled: DefaultDefinitions | undefined;
function bundledDefinitions(): DefaultDefinitions {
  if (!bundled) {
    const path = resolve(dirname(fileURLToPath(import.meta.url)), '../data/component-default-definitions.json');
    try {
      bundled = (JSON.parse(readFileSync(path, 'utf8')) as { definitions: DefaultDefinitions }).definitions;
    } catch {
      bundled = {}; // no defaults: every component compares as changed
    }
  }
  return bundled;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// Widgets whose array-valued properties the server takes whole from the stored component rather than merging
// index by index (util.service.ts buildComponentMetaDefinition).
const WHOLE_ARRAY_TYPES = new Set(['Table', 'DropdownV2', 'MultiselectV2', 'PopoverMenu', 'Steps', 'Tabs', 'RadioButtonV2', 'Tags',
  'TagsInput', 'TreeSelect', 'Cascader', 'Navigation', 'ButtonGroupV2']);

/** lodash `mergeWith(target, source, customizer)` as the server calls it: objects merge key by key, arrays index by
 *  index, anything else (null included, undefined excluded) replaces. Returns a new value; the inputs are not changed. */
function mergeLikeServer(target: unknown, source: unknown, wholeArrays: boolean): unknown {
  if (wholeArrays && Array.isArray(target)) {
    if (source === undefined) return target;
    if (Array.isArray(source)) return source;
    // Table returns the stored value as it is; the others take an object's values as the array.
    return isPlainObject(source) ? Object.values(source) : source;
  }
  if (Array.isArray(source)) {
    const base: unknown[] = Array.isArray(target) ? [...target] : [];
    source.forEach((item, index) => {
      const merged = mergeLikeServer(base[index], item, wholeArrays);
      if (merged !== undefined || !(index in base)) base[index] = merged;
    });
    return base;
  }
  if (isPlainObject(source)) {
    const base: Record<string, unknown> = isPlainObject(target) ? { ...target } : {};
    for (const [key, value] of Object.entries(source)) {
      const merged = mergeLikeServer(base[key], value, wholeArrays);
      if (merged !== undefined || !(key in base)) base[key] = merged;
    }
    return base;
  }
  return source === undefined ? target : source;
}

const stable = (value: unknown): string =>
  JSON.stringify(value, (_key, inner) =>
    isPlainObject(inner) ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : inner);

/** One section of a component as ToolJet returns it on read: what was stored, merged over the widget's defaults. */
export function sectionAsRead(type: string, section: Section, stored: Record<string, unknown> | undefined,
  definitions: DefaultDefinitions = bundledDefinitions()): Record<string, unknown> {
  // The server takes stored arrays whole for these widgets, in properties only; every other merge is lodash's.
  const wholeArrays = section === 'properties' && WHOLE_ARRAY_TYPES.has(type);
  return mergeLikeServer(definitions[type]?.[section] ?? {}, stored ?? {}, wholeArrays) as Record<string, unknown>;
}

/** The first entry of a section that reads differently for the plan and for the stored component, if any. */
function differingKey(type: string, section: Section, planned: Record<string, unknown> | undefined, stored: Record<string, unknown> | undefined,
  definitions: DefaultDefinitions): string | undefined {
  const asRead = sectionAsRead(type, section, planned, definitions);
  const have = stored ?? {};
  for (const key of new Set([...Object.keys(asRead), ...Object.keys(have)])) {
    if (stable(asRead[key]) !== stable(have[key])) return key;
  }
  return undefined;
}

const RECT_KEYS = ['top', 'left', 'width', 'height'] as const;
const sameRect = (planned: ComponentLayout | undefined, stored: unknown): boolean => {
  if (!planned) return true;
  if (!stored || typeof stored !== 'object') return false;
  return RECT_KEYS.every((key) => Number((stored as Record<string, unknown>)[key]) === Number(planned[key]));
};

export function diffPageInPlace(
  stored: ComponentSummary[],
  planned: ComponentSpec[],
  definitions: DefaultDefinitions = bundledDefinitions(),
  newId: () => string = randomUUID,
): InPlaceDiff {
  const storedByName = new Map(stored.filter((component) => component.name).map((component) => [component.name!, component]));
  const ids = new Map<string, string>();
  const idOf = new Map<ComponentSpec, string>();
  for (const spec of planned) {
    const id = storedByName.get(spec.name)?.id ?? newId();
    idOf.set(spec, id);
    ids.set(spec.name, id);
    if (spec.clientRef) ids.set(spec.clientRef, id);
  }
  const diff: InPlaceDiff = { ids, keep: [], relayout: [], create: [], recreated: [], deleteIds: [], why: {} };
  const plannedNames = new Set(planned.map((spec) => spec.name));
  for (const component of stored) if (!component.name || !plannedNames.has(component.name)) diff.deleteIds.push(component.id);

  for (const spec of planned) {
    const id = idOf.get(spec)!;
    const parent = spec.parentRef ? ids.get(spec.parentRef) : spec.parent;
    // A Form names its submit Button by ref; the page holds that Button's id.
    const submit = spec.type === 'Form' ? (spec.properties as Record<string, { value?: unknown }> | undefined)?.buttonToSubmit : undefined;
    const submitId = submit && typeof submit.value === 'string' ? ids.get(submit.value) : undefined;
    const properties = submit && submitId ? { ...spec.properties, buttonToSubmit: { ...submit, value: submitId } } : spec.properties;
    const { clientRef: _clientRef, parentRef: _parentRef, ...rest } = spec;
    const resolved: InPlaceComponent = { ...rest, properties, id, ...(parent ? { parent } : {}) };
    if (!parent) delete resolved.parent;

    const existing = storedByName.get(spec.name);
    if (!existing) {
      diff.create.push(resolved);
      continue;
    }
    let why: string | undefined;
    if (existing.type !== spec.type) why = `type ${existing.type} -> ${spec.type}`;
    // The page holds the parent as ToolJet stores it: the parent's id, suffixed for a header, footer or tab.
    else if ((existing.parent ?? undefined) !== (parent ? encodeComponentParent(parent, spec.slotName) : undefined)) why = 'parent';
    else if (!definitions[spec.type]) why = 'no default definition for this widget';
    else {
      for (const section of SECTIONS) {
        const key = differingKey(spec.type, section,
          (section === 'properties' ? properties : spec[section]) as Record<string, unknown> | undefined,
          existing[section] as Record<string, unknown> | undefined, definitions);
        if (key !== undefined) { why = `${section}.${key}`; break; }
      }
    }
    if (why) {
      diff.deleteIds.push(existing.id);
      diff.create.push(resolved);
      diff.recreated.push(spec.name);
      diff.why[spec.name] = why;
      continue;
    }
    const layouts = (existing.layouts ?? {}) as Record<string, unknown>;
    const desktop = spec.layouts?.desktop ?? spec.layout;
    const mobile = spec.layouts?.mobile ?? spec.layout;
    if (sameRect(desktop, layouts.desktop) && sameRect(mobile, layouts.mobile)) diff.keep.push(spec.name);
    else diff.relayout.push({ componentId: existing.id, ...(desktop ? { desktop } : {}), ...(mobile ? { mobile } : {}) });
  }
  return diff;
}
