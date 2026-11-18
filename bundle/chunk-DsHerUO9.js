import { createRequire } from "node:module";
import { e9 as resolveRef } from "./chunk-BrqxMLVS.js";
import { aC as external_exports, aK as fail, aL as ok, aM as activePackSet, aN as registerComponentSchemas, aO as registerLibraryPacks, ax as getComponentSchema, aP as exposeActions, aG as getCatalog, aE as internalComponentTypeNote, aH as getLegacyComponentReplacement } from "./chunk-CS6hDtiZ.js";
import { d as decodeComponentParent, c as componentSlotSchema, r as resolveParentRef, a as applyResolvedParent, i as isPackContainerType, e as encodeComponentParent, b as introducedLintFindings, l as lintComponentSlots, f as lintComponentSpec, g as lintUnusableTextGeometry, h as lintNestedContainerWidths, j as lintStandardSingleLineInputHeight, k as lintTextGeometry, m as lintRenderedGeometry, n as isMisplacedStyleKey, P as PROPERTY_KEY_ALIASES, S as STYLE_KEYS_IN_PROPERTIES, o as nearestCatalogKey, p as componentNameSchema, q as componentNameError, s as slotFindingKey, t as lintKanbanInteractions, u as lintShadKanbanCards, v as lintShadScheduleScale } from "./chunk-Z4CBDLNB.js";
import { y as resolvePackSlot, K as packSlotsFromManifest, L as describePackSlots, A as retiredUi2Name, M as suggestedHtmlHeight, N as componentLibraryChoices } from "./chunk-BZWhmyFq.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { randomUUID } from "node:crypto";
import { n as normalizeQueryOptions, v as validateQueryOptions, i as issueMessages } from "./chunk-CgSLCcEW.js";
import { isDeepStrictEqual } from "node:util";
import { g as getDatasourceQuerySchema, s as singleSpecRef, b as SPEC_DISCOVERY_METHODS, c as hubspotSpecs, e as extractSpec, l as loadKindSpec, d as listEndpoints, f as specHost, r as rankEndpoints, i as endpointTagCounts, j as endpointParameters } from "./chunk-BIWKBVpC.js";
createRequire(import.meta.url);
function strictEntry(shape, describeUnknown) {
  return external_exports.strictObject(shape, {
    error: (issue) => issue.code === "unrecognized_keys" ? issue.keys.map(describeUnknown).join(" ") : void 0
  });
}
function hasNonEmptyDefinition(definition2) {
  if (!definition2)
    return false;
  return Object.values(definition2).some((section) => section !== null && typeof section === "object" && Object.keys(section).length > 0);
}
var FLEX_CONTAINER_TYPE = "FlexContainer";
var FLEX_FILL_WIDTH_DESCRIPTION = "FlexContainer child only: true (the default) fills the free main-axis width; false uses widthPx. Ignored elsewhere.";
var FLEX_WIDTH_PX_DESCRIPTION = "FlexContainer child only: fixed width in pixels, applied when fillWidth is false. Ignored elsewhere.";
var FLEX_GROW_DESCRIPTION = "FlexContainer row child only: share of the free width among fill children (default 1; 2 beside 1 takes two thirds). Ignored elsewhere.";
var FLEX_MIN_WIDTH_PX_DESCRIPTION = "FlexContainer row child only: narrowest a fill child may get, in pixels; in a wrapping row a narrower child moves to the next line. Ignored elsewhere.";
function isFlexContainerType(type) {
  return type === FLEX_CONTAINER_TYPE;
}
function storedChildOrder(properties) {
  const entry = properties?.childOrder;
  const value = Array.isArray(entry) ? entry : entry?.value;
  return Array.isArray(value) ? value.filter((id) => typeof id === "string" && id.length > 0) : [];
}
function normalizeChildOrder(childOrder, actualChildIds) {
  const actual = new Set(actualChildIds);
  const seen = /* @__PURE__ */ new Set();
  const normalized = [];
  for (const id of [...childOrder.filter((id2) => actual.has(id2)), ...actualChildIds]) {
    if (seen.has(id))
      continue;
    seen.add(id);
    normalized.push(id);
  }
  return normalized;
}
function desktopRect(component) {
  const desktop = component.layouts?.desktop;
  return {
    top: typeof desktop?.top === "number" ? desktop.top : 0,
    left: typeof desktop?.left === "number" ? desktop.left : 0
  };
}
function bodyParentId(parent) {
  if (!parent)
    return void 0;
  const decoded = decodeComponentParent(parent);
  return decoded.slotName === "body" ? decoded.parentId : void 0;
}
function currentChildOrder(container, page) {
  const children = page.filter((component) => bodyParentId(component.parent) === container.id);
  const stored = storedChildOrder(container.properties);
  const storedSet = new Set(stored);
  const unordered = children.filter((child) => !storedSet.has(child.id)).sort((a, b) => {
    const ra = desktopRect(a), rb = desktopRect(b);
    return ra.top - rb.top || ra.left - rb.left;
  }).map((child) => child.id);
  return normalizeChildOrder(stored, [...children.map((child) => child.id).filter((id) => storedSet.has(id)), ...unordered]);
}
function appendedChildOrders(page, additions) {
  const byId = new Map(page.map((component) => [component.id, component]));
  const added = /* @__PURE__ */ new Map();
  for (const { parentId, childId } of additions) {
    const container = byId.get(parentId);
    if (!container || !isFlexContainerType(container.type))
      continue;
    const ids = added.get(parentId) ?? [];
    if (!ids.includes(childId))
      ids.push(childId);
    added.set(parentId, ids);
  }
  const orders = /* @__PURE__ */ new Map();
  for (const [parentId, newIds] of added) {
    const container = byId.get(parentId);
    const newSet = new Set(newIds);
    const existing = currentChildOrder(container, page.filter((component) => !newSet.has(component.id)));
    const stored = storedChildOrder(container.properties);
    const next = normalizeChildOrder(stored, [...existing, ...newIds]);
    if (next.length !== stored.length || next.some((id, index) => stored[index] !== id))
      orders.set(parentId, next);
  }
  return orders;
}
function batchChildOrders(entries, explicit = /* @__PURE__ */ new Map(), resolveRef2 = () => void 0) {
  const orders = /* @__PURE__ */ new Map();
  for (const container of entries) {
    if (!isFlexContainerType(container.type))
      continue;
    const children = entries.filter((entry) => entry.parentId === container.id).map((entry) => entry.id);
    const authored = (explicit.get(container.id) ?? []).flatMap((ref2) => typeof ref2 === "string" ? [resolveRef2(ref2) ?? ref2] : []);
    orders.set(container.id, [.../* @__PURE__ */ new Set([...authored, ...children])]);
  }
  return orders;
}
function childOrderProperty(order) {
  return { value: order };
}
function reparentAdditions(page, moves) {
  const byId = new Map(page.map((component) => [component.id, component]));
  return moves.flatMap(({ componentId, parent }) => {
    if (parent === void 0)
      return [];
    const nextParent = bodyParentId(parent);
    if (!nextParent || nextParent === bodyParentId(byId.get(componentId)?.parent))
      return [];
    return [{ parentId: nextParent, childId: componentId }];
  });
}
function resolveAuthoredChildOrder(container, page, authored) {
  const children = page.filter((component) => bodyParentId(component.parent) === container.id);
  const unknown = [];
  const ids = authored.flatMap((item) => {
    const ref2 = typeof item === "string" ? item : String(item);
    const child = children.find((candidate) => candidate.id === ref2) ?? children.find((candidate) => candidate.name === ref2);
    if (!child) {
      unknown.push(ref2);
      return [];
    }
    return [child.id];
  });
  return { order: normalizeChildOrder(ids, [...ids, ...currentChildOrder(container, page)]), unknown };
}
createRequire(import.meta.url);
var rect = external_exports.object({
  top: external_exports.number(),
  left: external_exports.number(),
  width: external_exports.number(),
  height: external_exports.number(),
  fillWidth: external_exports.boolean().optional().describe(FLEX_FILL_WIDTH_DESCRIPTION),
  widthPx: external_exports.number().positive().optional().describe(FLEX_WIDTH_PX_DESCRIPTION),
  grow: external_exports.number().positive().optional().describe(FLEX_GROW_DESCRIPTION),
  minWidthPx: external_exports.number().nonnegative().optional().describe(FLEX_MIN_WIDTH_PX_DESCRIPTION)
});
var RECT_KEYS = /* @__PURE__ */ new Set(["top", "left", "width", "height"]);
var layoutEntrySchema = strictEntry({
  component_id: external_exports.string(),
  desktop: rect.optional(),
  mobile: rect.optional(),
  parent: external_exports.string().optional(),
  slot_name: componentSlotSchema.optional()
}, (key) => {
  if (RECT_KEYS.has(key)) {
    return `Layout entry key "${key}" must be nested under desktop and/or mobile (e.g. { component_id, desktop: { top, left, width, height } }).`;
  }
  if (key === "layout" || key === "layouts") {
    return `Layout entry key "${key}" is not accepted; put the rect directly under desktop and/or mobile on the entry.`;
  }
  if (key === "definition" || key === "properties" || key === "styles") {
    return `Layout entry key "${key}" is not accepted by update_layout; edit component values with update_components.`;
  }
  return `Unknown layout entry key "${key}"; accepted keys are component_id, desktop, mobile, parent, slot_name.`;
});
function updateLayoutTool(client) {
  return {
    name: "update_layout",
    title: "Update Layout",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false
    },
    description: "Move / resize existing components (batch) without touching their properties. `left`/`width` are in the immediate parent canvas's own 43-column grid, including nested containers; `top`/`height` are pixels. Full rows use width 43, independent of the parent outer width. Container/Form/modal insets may use left 2, width 39; grid-mode Listview full rows use left 0, width 43. Provide desktop and/or mobile per component. Use this to fix overlaps or reflow a page. Set `parent` to reparent; use `slot_name` (header/body/footer) for native ModalV2/Form/Container regions or modal for Kanban card-click content. `slot_name` alone keeps the current parent. A FlexContainer child takes its width from fillWidth/widthPx, not width/left; a component reparented into a FlexContainer is appended to its childOrder.",
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string(),
      page_id: external_exports.string(),
      layouts: external_exports.array(layoutEntrySchema).min(1)
    },
    async handler(args) {
      try {
        const summary = await client.getAppSummary(args.app_id);
        const page = summary.pages.find((candidate) => candidate.id === args.page_id);
        if (!page)
          return fail(new Error(`Page "${args.page_id}" does not exist in app "${args.app_id}".`));
        const components = new Map(page.components.map((component) => [component.id, component]));
        const layoutWarnings = [];
        const resolveErrors = [];
        const resolvedIds = /* @__PURE__ */ new Map();
        for (const layout of args.layouts) {
          if (!layout.desktop && !layout.mobile && layout.parent === void 0 && layout.slot_name === void 0) {
            resolveErrors.push(`Component "${layout.component_id}": nothing to update. Provide desktop and/or mobile rects, or a parent/slot_name change.`);
            continue;
          }
          if (resolvedIds.has(layout.component_id))
            continue;
          const resolution = resolveRef(page.components, layout.component_id, "Component", `on page "${args.page_id}"`);
          if (!resolution.ok) {
            resolveErrors.push(resolution.error);
            continue;
          }
          resolvedIds.set(layout.component_id, resolution.target.id);
          if (resolution.warning)
            layoutWarnings.push(resolution.warning);
        }
        if (resolveErrors.length)
          return fail(new Error(resolveErrors.join(" ")));
        args = {
          ...args,
          layouts: args.layouts.map((layout) => ({
            ...layout,
            component_id: resolvedIds.get(layout.component_id) ?? layout.component_id
          }))
        };
        const rootSlotWarnings = [];
        const parentErrors = [];
        const resolvedLayouts = args.layouts.map((layout) => {
          const current = components.get(layout.component_id);
          let parent = layout.parent;
          let slot_name = layout.slot_name;
          let parentType;
          if (typeof parent === "string" && parent) {
            const resolvedParent = resolveParentRef(page.components, parent);
            const entry = { parent, slot_name };
            const parentError = resolvedParent.ok ? applyResolvedParent(entry, resolvedParent) : resolvedParent.error;
            if (parentError) {
              parentErrors.push(`Component "${layout.component_id}": ${parentError}`);
              return { ...layout, parentType };
            }
            parent = entry.parent;
            slot_name = entry.slot_name;
          }
          if (slot_name !== void 0) {
            parent ??= current.parent ? decodeComponentParent(current.parent).parentId : void 0;
            if (!parent) {
              if (slot_name === "body") {
                rootSlotWarnings.push(`Component "${layout.component_id}": slot_name:"body" ignored on a root component (it has no parent slots).`);
                slot_name = void 0;
              } else {
                throw new Error(`Component "${layout.component_id}": slot_name:"${slot_name}" requires an existing or explicit parent.`);
              }
            }
          }
          if (parent) {
            const decoded = decodeComponentParent(parent);
            const parentComponent = components.get(decoded.parentId);
            if (parentComponent && isPackContainerType(parentComponent.type)) {
              const named = slot_name ?? (parent !== decoded.parentId ? decoded.slotName : void 0);
              const slot = resolvePackSlot(parentComponent, named, current.name ?? current.id);
              if (!slot.ok)
                parentErrors.push(slot.error);
              else {
                parent = decoded.parentId;
                slot_name = slot.slotName;
                parentType = parentComponent.type;
              }
            }
          }
          return { ...layout, parent, slot_name, parentType };
        });
        if (parentErrors.length) {
          return fail(new Error(`${parentErrors.join(" ")} (Nothing was saved: refused before any write.)`));
        }
        const changes = new Map(resolvedLayouts.map((layout) => [layout.component_id, layout]));
        const projected = page.components.map((component) => {
          const change = changes.get(component.id);
          if (!change)
            return component;
          const currentLayouts = component.layouts ?? {};
          return {
            ...component,
            layouts: {
              ...currentLayouts,
              desktop: change.desktop ?? currentLayouts?.desktop,
              mobile: change.mobile ?? currentLayouts?.mobile
            },
            parent: change.parent !== void 0 ? encodeComponentParent(change.parent, change.slot_name, change.parentType) : component.parent,
            slotName: change.slot_name
          };
        });
        const changedIds = new Set(resolvedLayouts.map((layout) => layout.component_id));
        const changed = projected.filter((component) => component.id && changedIds.has(component.id));
        const introducedForChanged = (lint2) => changed.flatMap((component) => introducedLintFindings(lint2([components.get(component.id)]), lint2([component])));
        const errors = [
          ...introducedLintFindings(lintComponentSlots(page.components), lintComponentSlots(projected)),
          ...introducedForChanged((items) => items.flatMap((component) => lintComponentSpec(component).errors)),
          ...introducedForChanged(lintUnusableTextGeometry)
        ];
        if (errors.length)
          return fail(new Error(`${errors.join(" ")} (Nothing was saved: refused before any write.)`));
        const nestedWidths = new Set(lintNestedContainerWidths(projected));
        const warnings = [.../* @__PURE__ */ new Set([
          ...layoutWarnings,
          ...rootSlotWarnings,
          ...introducedForChanged((items) => items.flatMap((component) => lintComponentSpec(component).warnings)),
          ...introducedForChanged((items) => items.flatMap(lintStandardSingleLineInputHeight)),
          ...introducedForChanged(lintTextGeometry),
          ...lintRenderedGeometry(projected).filter((warning) => !nestedWidths.has(warning)),
          ...introducedLintFindings(lintNestedContainerWidths(page.components), [...nestedWidths])
        ])];
        const result = await client.updateLayouts({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          layouts: resolvedLayouts.map((l) => ({
            componentId: l.component_id,
            desktop: l.desktop,
            mobile: l.mobile,
            parent: l.parent,
            slotName: l.slot_name,
            parentType: l.parentType
          }))
        });
        const appended = appendedChildOrders(page.components, reparentAdditions(page.components, resolvedLayouts.map((layout) => ({
          componentId: layout.component_id,
          parent: layout.parent !== void 0 ? encodeComponentParent(layout.parent, layout.slot_name, layout.parentType) : void 0
        }))));
        if (appended.size) {
          await client.updateComponents({
            appId: args.app_id,
            versionId: args.version_id,
            pageId: args.page_id,
            updates: [...appended].map(([componentId, order]) => ({
              componentId,
              definition: { properties: { childOrder: childOrderProperty(order) } }
            }))
          });
        }
        return ok({ ...result, warnings });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
createRequire(import.meta.url);
var cached;
var SAMPLE_BLANKS = {
  ShadHero: { eyebrow: "", subtitle: "", meta: "{{[]}}", actionLabel: "" },
  ShadCardGrid: { badgeField: "", descriptionField: "", metaFields: "" },
  ShadRecordList: { metaFields: "", valueField: "", valueFormat: "auto" },
  // The sample's budget fields (spent, budget, note, status) are not a build's data: the config's own names stand.
  ShadProgressList: {
    labelField: "label",
    valueField: "value",
    targetField: "target",
    captionField: "",
    statusField: "",
    valueFormat: "auto"
  },
  ShadSchedule: { resourceField: "resource", resourceTitle: "" },
  // The sample's delivery stops (customer, address, eta, driver) are not a build's data: no rows, generic fields.
  ShadMap: { data: "{{[]}}", titleField: "name", subtitleField: "", popupFields: "" },
  // 'auto' reads money from a figure's label; the 'currency' default showed counts of rooms as dollars.
  ShadSummaryStrip: { valueFormat: "auto" },
  ShadTags: { tags: "{{[]}}", tagColors: "{{{}}}" },
  ShadAvatar: { names: "" },
  ShadLink: { linkTarget: "" },
  ShadCombobox: { searchPlaceholder: "Search..." },
  ShadMultiselect: { searchPlaceholder: "Search..." },
  ShadTagsInput: { suggestions: "{{[]}}" },
  // The sample greeting talks about orders, invoices and deliveries; a build's chat starts from its own history.
  ShadChat: { initialChat: "{{[]}}" },
  // The sample's 'set up your workspace' line is not a build's; completeTitle alone reads fine.
  ShadQuestionnaire: { completeText: "" }
};
var PACK_SAMPLE_TEXT = ["label", "title", "resourceTitle", "subTitle", "message"];
function registerPackDefinitions(extra) {
  packDefaultDefinition("");
  const defs = extra;
  for (const def of Object.values(defs)) {
    for (const key of PACK_SAMPLE_TEXT) {
      const entry = def?.properties?.[key];
      if (entry && typeof entry.value === "string" && entry.value && !entry.value.trim().startsWith("{{"))
        def.properties[key] = { ...entry, value: "" };
    }
  }
  Object.assign(activePackSet().definitions, defs);
}
function packDefaultDefinition(type) {
  if (!cached) {
    try {
      const path = resolve(dirname(fileURLToPath(import.meta.url)), "../data/pack-default-definitions.json");
      cached = JSON.parse(readFileSync(path, "utf8")).definitions ?? {};
      for (const [type2, blanks] of Object.entries(SAMPLE_BLANKS)) {
        const def = cached[type2];
        if (!def?.properties)
          continue;
        for (const [key, value] of Object.entries(blanks)) {
          if (key in def.properties)
            def.properties[key] = { ...def.properties[key], value };
        }
      }
    } catch {
      cached = {};
    }
  }
  return activePackSet().definitions[type] ?? cached[type];
}
createRequire(import.meta.url);
var words = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
var eventLabel = (s) => words(s).replace(/ (\w)/g, (_, c) => ` ${c.toLowerCase()}`);
var VALUE_TYPE = { string: "string", number: "number", boolean: "boolean", array: "array", object: "object", enumeration: "string" };
var stamp = (p) => {
  if (p.default === void 0)
    return p.type === "boolean" ? "{{false}}" : "";
  if (p.type === "boolean")
    return `{{${p.default}}}`;
  if (p.type === "enumeration" || p.type === "string")
    return String(p.default);
  return `{{${JSON.stringify(p.default)}}}`;
};
var SAMPLE_TEXT = /^(eyebrow|subtitle|description|meta|actionLabel|secondaryActionLabel|asideValue|asideLabel|changeLabel|change)$/;
var SAMPLE_LABELS = /* @__PURE__ */ new Set(["label", "title", "resourceTitle", "subTitle", "message"]);
var NEUTRAL_TEXT = /* @__PURE__ */ new Set(["Empty.description", "ListView.actionLabel"]);
var sampleBlank = (component, p) => {
  if (p.type === "boolean" || NEUTRAL_TEXT.has(`${component}.${p.name}`))
    return void 0;
  if (SAMPLE_TEXT.test(p.name))
    return p.type === "array" ? "{{[]}}" : "";
  const literal = typeof p.default === "string" && p.default !== "" && !p.default.trim().startsWith("{{");
  return SAMPLE_LABELS.has(p.name) && literal ? "" : void 0;
};
function legacyPackId(lib) {
  const name2 = lib.manifest?.manifestVersion === 2 ? lib.manifest.pack || lib.name : "";
  return typeof name2 === "string" ? name2.toLowerCase().replace(/[^a-z0-9]+/g, "") : "";
}
function packFromLibrary(lib, occupied = /* @__PURE__ */ new Set()) {
  const manifest = lib.manifest;
  if (lib.codeMode || !lib.revisions?.[0]?.version || !manifest?.components || !Object.keys(manifest.components).length)
    return null;
  if (manifest.manifestVersion !== void 0 && manifest.manifestVersion !== 2)
    return null;
  const legacy = legacyPackId(lib);
  const packId = legacy && !occupied.has(legacy) ? legacy : `lib${lib.id.replace(/-/g, "")}`;
  return packFromManifest(packId, lib.name, lib.revisions[0].version, manifest, {
    kind: "library",
    libraryId: lib.id,
    correlationId: lib.correlationId
  });
}
function packFromBuiltin(info, manifest) {
  if (!manifest?.components)
    return null;
  const packId = info.pack.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return packFromManifest(packId, info.displayName || info.pack, info.version ?? "", manifest, {
    kind: "builtin",
    libraryId: "",
    correlationId: "",
    serverPack: info.pack
  });
}
function packFromManifest(packId, libraryName, version, manifest, identity) {
  const { serverPack, ...packIdentity } = identity;
  if (!manifest.components)
    return null;
  const lib = { name: libraryName };
  const prefix = `Lib_${packId}_`;
  const schemas = {};
  const definitions = {};
  const components = {};
  const manifestListsSlots = Object.values(manifest.components).some((entry) => entry.slots !== void 0);
  for (const [name2, entry] of Object.entries(manifest.components)) {
    const type = `${prefix}${name2}`;
    const allProps = entry.props ?? [];
    const runtimeValue = (p) => p.name === "value" && p.inspector === "hidden" && allProps.some((q) => q.name === "defaultValue");
    const props = allProps.filter((p) => !runtimeValue(p));
    const fits = entry.fit === true;
    const slotInfo = packSlotsFromManifest(entry.slots ?? (manifestListsSlots ? [] : void 0), allProps);
    components[name2] = {
      type,
      props: props.map((p) => p.name),
      events: (entry.events ?? []).map((e) => e.name),
      styles: (entry.styles ?? []).map((s) => s.name),
      actions: (entry.actions ?? []).map((a) => a.name),
      fit: fits,
      ...entry.role ? { role: entry.role } : {},
      ...entry.roleProps ? { roleProps: entry.roleProps } : {},
      ...entry.roleEvents ? { roleEvents: entry.roleEvents } : {},
      ...entry.roleActions ? { roleActions: entry.roleActions } : {},
      // Preserve whether this manifest supplies slot metadata, including explicit empty lists.
      slotsKnown: manifestListsSlots,
      // The canvases a child may go on (lint.ts lintPackItemSlots), as the offline catalog lists them.
      ...entry.slots?.length ? { slots: entry.slots } : {}
    };
    schemas[type] = {
      type,
      name: type,
      // Read by the AI compiler, which plans in roles and resolves a role to this pack's component (libSwap.ts).
      pack: {
        id: packId,
        component: name2,
        ...entry.role ? { role: entry.role } : {},
        ...entry.roleProps ? { roleProps: entry.roleProps } : {},
        ...entry.roleEvents ? { roleEvents: entry.roleEvents } : {},
        ...entry.roleActions ? { roleActions: entry.roleActions } : {},
        ...entry.roleValues ? { roleValues: entry.roleValues } : {},
        ...entry.labelCase ? { labelCase: entry.labelCase } : {},
        slots: entry.slots ?? [],
        ...slotInfo ? { slotInfo } : {},
        ...manifest.surface ? { surface: manifest.surface } : {},
        ...manifest.themeMode ? { themeMode: manifest.themeMode } : {}
      },
      description: [
        `${entry.displayName ?? words(name2)} from the ${lib.name} pack.`,
        entry.usage,
        describePackSlots(slotInfo),
        fits ? "Sizes to its content in the app (Dynamic height on)." : "Drawn at the height you give it."
      ].filter(Boolean).join(" "),
      defaultSize: { width: entry.defaultWidth ?? 6, height: (entry.defaultHeight ?? 4) * 10 },
      properties: [
        ...props.map((p) => ({
          key: p.name,
          label: p.label ?? words(p.name),
          valueType: VALUE_TYPE[p.type] ?? "string",
          ...p.default !== void 0 ? { default: stamp(p) } : {},
          ...p.enumValues ? { allowedValues: p.enumValues } : {},
          ...p.description ? { description: p.description } : {}
        })),
        { key: "visibility", label: "Visibility", valueType: "boolean", default: "{{true}}" },
        // ToolJet's PackComponent saves it on every pack component; the host frees a hidden one's space with it.
        { key: "collapseWhenHidden", label: "Collapse when hidden", valueType: "boolean", default: "{{false}}" },
        { key: "loadingState", label: "Loading state", valueType: "boolean", default: "{{false}}" },
        { key: "disabledState", label: "Disable", valueType: "boolean", default: "{{false}}" },
        { key: "dynamicHeight", label: "Dynamic height", valueType: "boolean", default: fits ? "{{true}}" : "{{false}}" }
      ],
      styles: [
        ...(entry.styles ?? []).map((s) => ({ key: s.name, label: s.label ?? words(s.name), valueType: VALUE_TYPE[s.type] ?? "string" })),
        { key: "boxShadow", label: "Box shadow", valueType: "string" }
      ],
      events: (entry.events ?? []).map((e) => ({ id: e.name, label: e.displayName ?? eventLabel(e.name) })),
      actions: [
        ...(entry.actions ?? []).map((a) => ({
          handle: a.name,
          displayName: a.displayName ?? words(a.name),
          ...a.params?.length ? { params: a.params.map((p) => ({ handle: p.handle, displayName: p.displayName ?? words(p.handle) })) } : {}
        })),
        { handle: "setVisibility", displayName: "Set visibility", params: [{ handle: "visibility", displayName: "Value", defaultValue: "{{false}}" }] },
        { handle: "setLoading", displayName: "Set loading", params: [{ handle: "loading", displayName: "Value", defaultValue: "{{false}}" }] },
        { handle: "setDisable", displayName: "Set disable", params: [{ handle: "disable", displayName: "Value", defaultValue: "{{false}}" }] }
      ],
      exposedVariables: [
        // The default an agent-built component starts with: a blanked sample is advertised blank, as it is saved.
        ...allProps.map((p) => {
          const blank = p.default !== void 0 ? sampleBlank(name2, p) : void 0;
          const advertised = blank === void 0 ? p.default : blank === "{{[]}}" ? [] : "";
          return { name: p.name, ...advertised !== void 0 ? { default: advertised } : {} };
        }),
        { name: "isVisible", default: true },
        { name: "isLoading", default: false },
        { name: "isDisabled", default: false },
        ...entry.validation ? [{ name: "isValid", default: true }, { name: "isMandatory", default: false }] : []
      ]
    };
    definitions[type] = {
      properties: {
        ...Object.fromEntries(props.map((p) => [p.name, { value: sampleBlank(name2, p) ?? stamp(p) }])),
        visibility: { value: "{{true}}" },
        collapseWhenHidden: { value: "{{false}}" },
        loadingState: { value: "{{false}}" },
        disabledState: { value: "{{false}}" },
        dynamicHeight: { value: fits ? "{{true}}" : "{{false}}" }
      },
      styles: { boxShadow: { value: "0px 0px 0px 0px #00000040" } },
      others: { showOnDesktop: { value: "{{true}}" }, showOnMobile: { value: "{{false}}" } }
    };
  }
  return {
    pack: { pack: serverPack ?? packId, prefix, ...packIdentity, libraryName, version, components },
    schemas,
    definitions
  };
}
async function loadInstalledPacks(listLibraries, listBuiltin) {
  const builtin = await listBuiltin?.().catch(() => null);
  const libraries = await listLibraries().catch(() => []);
  const packs = (builtin ?? []).map((b) => packFromBuiltin(b.info, b.manifest)).filter((p) => !!p);
  const occupied = new Set(packs.map((p) => p.pack.prefix.slice(4, -1)));
  const nameCounts = /* @__PURE__ */ new Map();
  for (const lib of libraries) {
    occupied.add(`lib${lib.id.replace(/-/g, "")}`);
    if (lib.codeMode || !lib.revisions?.[0]?.version)
      continue;
    const name2 = legacyPackId(lib);
    nameCounts.set(name2, (nameCounts.get(name2) ?? 0) + 1);
  }
  for (const [name2, count] of nameCounts)
    if (count > 1)
      occupied.add(name2);
  for (const lib of libraries) {
    try {
      const built = packFromLibrary(lib, occupied);
      if (built)
        packs.push(built);
    } catch {
      console.error(`tooljet-mcp: skipped invalid component manifest for library ${lib.id}`);
    }
  }
  if (!packs.length)
    return [];
  registerComponentSchemas(Object.assign({}, ...packs.map((p) => p.schemas)));
  registerPackDefinitions(Object.assign({}, ...packs.map((p) => p.definitions)));
  registerLibraryPacks(packs.map((p) => p.pack));
  return packs.map((p) => `${p.pack.libraryName} ${p.pack.version}`);
}
createRequire(import.meta.url);
var workflowName = external_exports.string().min(1).refine((value) => value.trim().length > 0, "Name must not be blank.");
var name$1 = workflowName;
var conditionBranches = external_exports.array(external_exports.object({ id: external_exports.string().min(1), code: external_exports.string().min(1), label: external_exports.string() }).strict()).min(1);
var elseBranch = external_exports.object({ enabled: external_exports.boolean(), label: external_exports.string().optional() }).strict();
var workflowInputs = external_exports.array(external_exports.object({
  key: name$1,
  type: external_exports.enum(["string", "number", "object", "array", "boolean", "null"]),
  required: external_exports.boolean(),
  defaultValue: external_exports.unknown().optional(),
  description: external_exports.string().optional()
}).strict()).superRefine((inputs, ctx) => {
  const keys = /* @__PURE__ */ new Set();
  inputs.forEach((input, i) => {
    const canonicalKey = input.key.trim().toLowerCase();
    if (keys.has(canonicalKey))
      ctx.addIssue({ code: "custom", path: [i, "key"], message: "Duplicate workflow input." });
    keys.add(canonicalKey);
    const value = input.defaultValue;
    if (value === void 0)
      return;
    const valid = input.type === "null" ? value === null : input.type === "array" ? Array.isArray(value) : input.type === "object" ? value !== null && typeof value === "object" && !Array.isArray(value) : typeof value === input.type;
    if (!valid)
      ctx.addIssue({ code: "custom", path: [i, "defaultValue"], message: "Default must match input type." });
  });
});
var humanConfig = {
  description: external_exports.string().optional(),
  outcomes: external_exports.array(external_exports.object({ key: name$1, label: external_exports.string().min(1) }).strict()).min(1),
  input_schema: external_exports.array(external_exports.object({ name: name$1, type: external_exports.enum(["text", "number", "boolean", "select"]), label: external_exports.string().optional(), required: external_exports.boolean().optional(), options: external_exports.array(external_exports.string()).optional(), default: external_exports.unknown().optional() }).strict()).optional(),
  approvers: external_exports.object({ users: external_exports.array(external_exports.string().uuid()).optional(), groups: external_exports.array(external_exports.string().uuid()).optional(), dynamic: external_exports.string().optional(), tokenBypass: external_exports.boolean().optional() }).strict(),
  timeout: external_exports.object({ enabled: external_exports.boolean(), durationSeconds: external_exports.number().finite().positive().optional(), onExpire: external_exports.enum(["fail", "branch"]).optional(), timeoutOutcome: external_exports.string().optional() }).strict().optional(),
  reminders: external_exports.array(external_exports.object({ id: external_exports.string().optional(), afterSeconds: external_exports.number().finite().min(1) }).strict()).optional(),
  notification: external_exports.object({ url: external_exports.string().optional(), method: external_exports.string().optional(), headers: external_exports.record(external_exports.string(), external_exports.string()).optional(), bodyTemplate: external_exports.string().optional(), includeResolveUrl: external_exports.boolean().optional() }).strict().optional()
};
function humanConfigurationErrors(data) {
  const record = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const atLeastOneSecond = (value) => typeof value === "number" && Number.isFinite(value) && value >= 1;
  const errors = [];
  const outcomes = Array.isArray(data.outcomes) ? data.outcomes.map(record) : [];
  if (!outcomes.length || outcomes.some((outcome) => typeof outcome.key !== "string" || !outcome.key.trim()))
    errors.push("Human approval requires named outcomes.");
  if (new Set(outcomes.map((outcome) => outcome.key)).size !== outcomes.length)
    errors.push("Human outcome keys must be unique.");
  const fields = Array.isArray(data.inputSchema) ? data.inputSchema.map(record) : [];
  if (fields.some((field) => typeof field.name !== "string" || !field.name.trim()) || new Set(fields.map((field) => field.name)).size !== fields.length)
    errors.push("Human input field names must be nonblank and unique.");
  const timeout = record(data.timeout);
  if (timeout.enabled === true && !atLeastOneSecond(timeout.durationSeconds))
    errors.push("Human timeout must be at least one second.");
  if (timeout.enabled === true && timeout.onExpire === "branch" && !outcomes.some((outcome) => outcome.key === timeout.timeoutOutcome))
    errors.push("Human timeout must select an existing outcome.");
  const reminders = [...Array.isArray(data.reminders) ? data.reminders : [], ...Array.isArray(timeout.reminders) ? timeout.reminders : []];
  if (reminders.some((reminder) => !atLeastOneSecond(record(reminder).afterSeconds)))
    errors.push("Human reminders must be at least one second.");
  const approvers = record(data.approvers);
  const hasUsers = Array.isArray(approvers.users) && approvers.users.length > 0;
  const hasGroups = Array.isArray(approvers.groups) && approvers.groups.length > 0;
  const hasDynamic = typeof approvers.dynamic === "string" && approvers.dynamic.trim().length > 0;
  if (approvers.tokenBypass === false && !hasUsers && !hasGroups && !hasDynamic)
    errors.push("Human requires an approver when token bypass is disabled.");
  return errors;
}
function conditionHandles(data) {
  const branches = data.conditions;
  return Array.isArray(branches) && branches.length ? [...branches.map((branch) => branch.id), "false"] : ["true", "false"];
}
var ref = external_exports.string().min(1).max(100);
var base = { ref, existing_id: external_exports.string().uuid().optional(), label: external_exports.string().max(100).optional(), position: external_exports.object({ x: external_exports.number().finite(), y: external_exports.number().finite() }).optional() };
var query = { name: external_exports.string().regex(/^[A-Za-z_$][\w$]*$/), datasource_id: external_exports.string().min(1), options: external_exports.record(external_exports.string(), external_exports.unknown()) };
var agentModel = external_exports.object(query).strict();
var nodeSchema = external_exports.discriminatedUnion("type", [
  external_exports.object({ ...base, type: external_exports.literal("start") }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("javascript"), name: query.name, code: external_exports.string().min(1) }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("query"), ...query, looped: external_exports.boolean().optional(), iteration_values_code: external_exports.string().refine((value) => !!value.trim(), "Loop requires an array expression.").optional() }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("loop"), name: query.name, iteration_values_code: external_exports.string().refine((value) => !!value.trim(), "Loop requires an array expression."), code: external_exports.string().min(1) }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("condition"), name: workflowName.optional(), code: external_exports.string().min(1).optional(), conditions: conditionBranches.optional(), else_branch: elseBranch.optional() }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("filter"), name: workflowName, input_expression: external_exports.string().min(1), predicate_expression: external_exports.string().min(1) }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("wait"), name: workflowName, duration_seconds: external_exports.number().finite().min(1).max(2592e3) }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("human"), name: workflowName, ...humanConfig }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("response"), name: workflowName.optional(), status_code_expression: external_exports.string().min(1).optional(), code: external_exports.string().min(1), status_code: external_exports.number().int().min(100).max(599).optional() }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("agent"), name: workflowName.optional(), system_prompt: external_exports.string().optional(), user_prompt: external_exports.string().optional(), output_format: external_exports.record(external_exports.string(), external_exports.unknown()).nullable().optional(), model: agentModel.nullable().optional() }).strict()
]);
var specSchema = external_exports.object({
  schema_version: external_exports.literal(1).default(1),
  nodes: external_exports.array(nodeSchema).max(200).default([]),
  edges: external_exports.array(external_exports.object({ ref, existing_id: external_exports.string().optional(), from: ref, to: ref, port: external_exports.string().min(1) }).strict()).max(500).default([]),
  agent_tools: external_exports.array(external_exports.object({ ref, existing_id: external_exports.string().optional(), from: ref, to: ref }).strict()).default([]),
  webhook_parameters: external_exports.array(external_exports.object({ key: workflowName, dataType: external_exports.enum(["string", "number", "object", "array", "boolean", "null"]) }).strict()).optional(),
  remove_node_ids: external_exports.array(external_exports.string()).default([]),
  remove_edge_ids: external_exports.array(external_exports.string()).default([]),
  setup_script: external_exports.object({ javascript: external_exports.string().optional(), python: external_exports.string().optional() }).strict().optional(),
  workflow_inputs: workflowInputs.optional(),
  test_parameters: external_exports.record(external_exports.string(), external_exports.unknown()).optional()
}).strict();
function assertWorkflowJavaScript(code, label) {
  if (typeof code !== "string" || !code.trim())
    throw new Error(`Missing JavaScript code in ${label}.`);
  try {
    new Script(`(async function() {${code}
})`);
  } catch {
    throw new Error(`Invalid JavaScript syntax in ${label}.`);
  }
}
function isAttachmentEdge(edge) {
  return edge.targetHandle === "ai-model" || edge.targetHandle === "tool";
}
function controlFlowEdges(graph) {
  return graph.edges.filter((edge) => !isAttachmentEdge(edge));
}
function definition(value) {
  if (value == null)
    return { nodes: [], edges: [], queries: [] };
  const parsed = external_exports.object({
    nodes: external_exports.array(external_exports.object({ id: external_exports.string(), type: external_exports.string(), data: external_exports.record(external_exports.string(), external_exports.unknown()) }).passthrough()).default([]),
    edges: external_exports.array(external_exports.object({ id: external_exports.string(), source: external_exports.string(), target: external_exports.string(), sourceHandle: external_exports.string().nullable().optional(), targetHandle: external_exports.string().nullable().optional(), data: external_exports.record(external_exports.string(), external_exports.unknown()).optional() }).passthrough()).default([]),
    queries: external_exports.array(external_exports.object({ id: external_exports.string(), idOnDefinition: external_exports.string() }).passthrough()).default([])
  }).passthrough().parse(value);
  return structuredClone(parsed);
}
function validateGraph(graph, queryIds) {
  const errors = [], warnings = [];
  const error = (code, path, message) => errors.push({ code, path, message });
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  if (nodes.size !== graph.nodes.length)
    error("duplicate_node", "nodes", "Node IDs must be unique.");
  if (new Set(graph.edges.map((e) => e.id)).size !== graph.edges.length)
    error("duplicate_edge", "edges", "Edge IDs must be unique.");
  const starts = graph.nodes.filter((n) => n.type === "input" && n.data.nodeType === "start");
  if (starts.length !== 1)
    error("start_count", "nodes", "Exactly one start node is required.");
  const mappings = new Map(graph.queries.map((q) => [q.idOnDefinition, q.id]));
  if (mappings.size !== graph.queries.length)
    error("duplicate_mapping", "queries", "Query definition IDs must be unique.");
  for (const mapping of graph.queries)
    if (queryIds && !queryIds.has(mapping.id))
      error("missing_query", "queries", `Query ${mapping.id} does not belong to this version.`);
  for (const n of graph.nodes) {
    if (n.type === "query" && !mappings.has(String(n.data.idOnDefinition)))
      error("missing_mapping", `nodes.${n.id}`, "Query node has no query mapping.");
    if (!["input", "query", "if-condition", "output", "agent", "human", "filter", "wait"].includes(n.type))
      warnings.push({ code: "unsupported_node", path: `nodes.${n.id}`, message: `Retained ${n.type} node; configuration not validated.` });
  }
  const flowEdges = controlFlowEdges(graph);
  for (const edge of graph.edges) {
    const source = nodes.get(edge.source), target = nodes.get(edge.target), path = `edges.${edge.id}`;
    if (!source || !target) {
      error("missing_endpoint", path, "Edge endpoint does not exist.");
      continue;
    }
    if (isAttachmentEdge(edge)) {
      if (!(source.type === "query" && source.data.isChildOfAgent === true && source.data.agentConnectionType === edge.targetHandle && target.type === "agent")) {
        error("invalid_attachment", path, "Agent attachment must connect a matching query child to an Agent.");
      }
      if (graph.edges.filter((candidate) => isAttachmentEdge(candidate) && candidate.source === source.id).length > 1 || flowEdges.some((candidate) => candidate.source === source.id || candidate.target === source.id))
        error("invalid_attachment", path, "An attached query belongs to one Agent and cannot also participate in control flow.");
      continue;
    }
    if (target.type === "input")
      error("start_inbound", path, "Start cannot have inbound edges.");
    const ports = { input: [null, void 0], query: ["success", "failure"], "if-condition": conditionHandles(source.data), human: (source.data.outcomes ?? []).map((outcome) => outcome.key), filter: [null, void 0], wait: [null, void 0], output: [], agent: ["output"] };
    if (ports[source.type] && !ports[source.type].includes(edge.sourceHandle))
      error("invalid_port", path, `Invalid source port for ${source.type}.`);
    if (source.type === "query" && edge.sourceHandle === "failure" && !source.data.errorHandler)
      error("error_handler_disabled", path, "Failure edge requires query error handling.");
  }
  for (const filter of graph.nodes.filter((node) => node.type === "filter")) {
    if (flowEdges.filter((edge) => edge.target === filter.id).length > 1)
      error("filter_inbound", `nodes.${filter.id}`, "Filter accepts exactly one upstream connection.");
  }
  for (const agent of graph.nodes.filter((node) => node.type === "agent")) {
    if (graph.edges.filter((edge) => edge.target === agent.id && edge.targetHandle === "ai-model").length > 1) {
      error("duplicate_agent_model", `nodes.${agent.id}.model`, "Agent can have only one AI model attachment.");
    }
  }
  const adjacency = new Map(graph.nodes.map((n) => [n.id, flowEdges.filter((e) => e.source === n.id).map((e) => e.target)]));
  const visited = /* @__PURE__ */ new Set(), active = /* @__PURE__ */ new Set();
  const visit = (id) => {
    if (active.has(id))
      return true;
    if (visited.has(id))
      return false;
    visited.add(id);
    active.add(id);
    const cyclic = (adjacency.get(id) ?? []).some(visit);
    active.delete(id);
    return cyclic;
  };
  if (graph.nodes.some((n) => visit(n.id)))
    error("cycle", "edges", "Cycles are unsupported in the basic node set.");
  const reachable = /* @__PURE__ */ new Set();
  const reach = (id) => {
    if (reachable.has(id))
      return;
    reachable.add(id);
    (adjacency.get(id) ?? []).forEach(reach);
  };
  starts.forEach((n) => reach(n.id));
  for (const n of graph.nodes)
    if (!reachable.has(n.id) && n.data.isChildOfAgent !== true)
      warnings.push({ code: "unreachable", path: `nodes.${n.id}`, message: "Node is unreachable from start." });
  return { errors, warnings, runtime_verified: false };
}
function compileGraph(current, spec, ids, datasourceKinds = /* @__PURE__ */ new Map()) {
  const graph = structuredClone(current);
  const node_ids = /* @__PURE__ */ Object.create(null), edge_ids = /* @__PURE__ */ Object.create(null);
  const model_ids = /* @__PURE__ */ Object.create(null);
  const query_nodes = [];
  const checkUnique = (refs) => {
    if (new Set(refs).size !== refs.length)
      throw new Error("Duplicate logical refs.");
  };
  checkUnique(spec.nodes.map((n) => n.ref));
  checkUnique(spec.edges.map((e) => e.ref));
  for (const id of spec.remove_node_ids)
    if (!graph.nodes.some((n) => n.id === id))
      throw new Error(`Unknown node to remove: ${id}`);
  for (const id of spec.remove_edge_ids)
    if (!graph.edges.some((e) => e.id === id))
      throw new Error(`Unknown edge to remove: ${id}`);
  const removedNodeIds = new Set(spec.remove_node_ids);
  const cascadedChildIds = /* @__PURE__ */ new Set();
  for (const agentId of spec.remove_node_ids) {
    for (const edge of graph.edges.filter((candidate) => candidate.target === agentId && candidate.targetHandle === "ai-model")) {
      removedNodeIds.add(edge.source);
      cascadedChildIds.add(edge.source);
    }
  }
  const removedDefinitionIds = graph.nodes.filter((n) => removedNodeIds.has(n.id)).map((n) => n.data.idOnDefinition);
  graph.nodes = graph.nodes.filter((n) => !removedNodeIds.has(n.id));
  graph.edges = graph.edges.filter((e) => !spec.remove_edge_ids.includes(e.id) && !cascadedChildIds.has(e.source) && !cascadedChildIds.has(e.target));
  const editedIds = /* @__PURE__ */ new Set();
  for (const input of spec.nodes) {
    if ("code" in input && input.code !== void 0) {
      try {
        new Script(input.type === "condition" ? `(${input.code})` : `(async function() {${input.code}
})`);
      } catch {
        throw new Error(`Invalid JavaScript syntax in node ${input.ref}.`);
      }
    }
    if ((input.type === "loop" || input.type === "query") && input.iteration_values_code !== void 0) {
      try {
        new Script(`(async function() {${input.iteration_values_code}
})`);
      } catch {
        throw new Error(`Invalid iteration JavaScript syntax in node ${input.ref}.`);
      }
    }
    const id = input.existing_id ?? ids?.node_ids[input.ref] ?? randomUUID();
    if (editedIds.has(id))
      throw new Error("Multiple node edits target the same ID.");
    editedIds.add(id);
    const old = graph.nodes.find((n) => n.id === id);
    if (input.existing_id && !old)
      throw new Error(`Unknown existing node: ${id}`);
    const type = { start: "input", javascript: "query", query: "query", loop: "query", condition: "if-condition", response: "output", agent: "agent", human: "human", filter: "filter", wait: "wait" }[input.type];
    if (old && old.type !== type)
      throw new Error("Changing node type is unsupported; remove and add explicitly.");
    const data = { ...old?.data, label: input.label ?? old?.data.label ?? input.ref };
    if (input.type !== "condition")
      data.nodeType = input.type === "javascript" || input.type === "loop" ? "query" : input.type;
    if (input.type === "condition") {
      if (input.code !== void 0 && input.conditions !== void 0)
        throw new Error("Specify code or conditions, not both.");
      if (input.code !== void 0) {
        if (Array.isArray(data.conditions) && data.conditions.length)
          throw new Error("This node uses ordered conditions. Edit conditions explicitly; code would leave active branches unchanged.");
        data.code = input.code;
      }
      if (input.conditions !== void 0) {
        if (new Set(input.conditions.map((branch) => branch.id)).size !== input.conditions.length || input.conditions.some((branch) => branch.id === "false"))
          throw new Error("Condition IDs must be unique and cannot be false.");
        input.conditions.forEach((branch) => {
          new Script(`(${branch.code})`);
        });
        data.conditions = input.conditions.map((branch) => ({ ...data.conditions?.find((old2) => old2.id === branch.id) ?? {}, ...branch }));
        delete data.code;
      }
      if (input.else_branch !== void 0) {
        if (!Array.isArray(data.conditions) && typeof data.code === "string") {
          data.conditions = [{ id: "true", code: data.code, label: "If" }];
          delete data.code;
        }
        data.elseBranch = { ...data.elseBranch ?? {}, ...input.else_branch };
      }
      if (data.code === void 0 && !Array.isArray(data.conditions))
        throw new Error("Condition requires code or conditions.");
    }
    if (input.type === "condition" || input.type === "response")
      data.nodeName = input.name ?? old?.data.nodeName ?? input.ref;
    if (input.type === "response") {
      data.code = input.code;
      if (input.status_code_expression !== void 0) {
        if (input.status_code !== void 0)
          throw new Error("Use status_code or status_code_expression, not both.");
        new Script(`(${input.status_code_expression})`);
        data.statusCode = { fxActive: true, value: input.status_code_expression };
      }
    }
    if (input.type === "filter") {
      new Script(`(${input.input_expression})`);
      new Script(`(${input.predicate_expression})`);
      Object.assign(data, { nodeName: input.name, inputExpression: input.input_expression, predicateExpression: input.predicate_expression });
    }
    if (input.type === "wait")
      Object.assign(data, { nodeName: input.name, durationSeconds: input.duration_seconds });
    if (input.type === "human") {
      Object.assign(data, { nodeName: input.name, outcomes: input.outcomes.map((outcome) => ({ ...data.outcomes?.find((old2) => old2.key === outcome.key) ?? {}, ...outcome })), approvers: { ...data.approvers ?? {}, ...input.approvers } });
      for (const [from, to] of Object.entries({ description: "description", input_schema: "inputSchema", timeout: "timeout", reminders: "reminders", notification: "notification" })) {
        const value = input[from];
        if (value !== void 0)
          data[to] = structuredClone(value);
      }
      const configurationErrors = humanConfigurationErrors(data);
      if (configurationErrors.length)
        throw new Error(configurationErrors.join(" "));
    }
    if (input.type === "response" && (input.status_code !== void 0 || data.statusCode === void 0)) {
      data.statusCode = { fxActive: false, value: String(input.status_code ?? 200) };
    }
    if (input.type === "query") {
      if (input.looped !== void 0)
        data.looped = input.looped;
      if (input.iteration_values_code !== void 0)
        data.iterationValuesCode = input.iteration_values_code;
    }
    if (input.type === "loop") {
      data.looped = true;
      data.iterationValuesCode = input.iteration_values_code;
    }
    if (input.type === "agent") {
      const oldOptions = old?.data.options && typeof old.data.options === "object" && !Array.isArray(old.data.options) ? old.data.options : {};
      data.nodeName = input.name ?? old?.data.nodeName ?? input.ref;
      data.options = {
        ...oldOptions,
        systemPrompt: input.system_prompt ?? oldOptions.systemPrompt ?? "",
        userPrompt: input.user_prompt ?? oldOptions.userPrompt ?? "",
        outputFormat: input.output_format === void 0 ? oldOptions.outputFormat ?? null : input.output_format === null ? null : { example: input.output_format }
      };
      const attachments = graph.edges.filter((edge) => edge.target === id && edge.targetHandle === "ai-model");
      if (attachments.length > 1)
        throw new Error(`Agent ${input.ref} has multiple AI model attachments.`);
      const attachment = attachments[0];
      const child = attachment && graph.nodes.find((node2) => node2.id === attachment.source);
      if (input.model === null && attachment) {
        if (typeof child?.data.idOnDefinition === "string")
          removedDefinitionIds.push(child.data.idOnDefinition);
        graph.edges = graph.edges.filter((edge) => edge.id !== attachment.id);
        graph.nodes = graph.nodes.filter((node2) => node2.id !== attachment.source);
      } else if (input.model) {
        const modelNodeId = child?.id ?? ids?.model_ids[input.ref]?.node_id ?? randomUUID();
        const definitionId = typeof child?.data.idOnDefinition === "string" ? child.data.idOnDefinition : randomUUID();
        const kind = datasourceKinds.get(input.model.datasource_id);
        const modelNode = {
          ...child,
          id: modelNodeId,
          type: "query",
          sourcePosition: "right",
          targetPosition: "left",
          deletable: false,
          data: { ...child?.data, idOnDefinition: definitionId, nodeType: "query", kind, isChildOfAgent: true, agentConnectionType: "ai-model" },
          position: child?.position ?? { x: 100, y: 70 }
        };
        if (child)
          graph.nodes[graph.nodes.indexOf(child)] = modelNode;
        else
          graph.nodes.push(modelNode);
        const edgeId = attachment?.id ?? ids?.model_ids[input.ref]?.edge_id ?? randomUUID();
        const modelEdge = { ...attachment, id: edgeId, source: modelNodeId, target: id, sourceHandle: "output", targetHandle: "ai-model", type: "custom", data: { direction: "vertical" } };
        if (attachment)
          graph.edges[graph.edges.indexOf(attachment)] = modelEdge;
        else
          graph.edges.push(modelEdge);
        model_ids[input.ref] = { node_id: modelNodeId, edge_id: edgeId };
        query_nodes.push({ role: "agent-model", parent_agent_id: id, node_id: modelNodeId, definition_id: definitionId, datasource_id: input.model.datasource_id, name: input.model.name, options: input.model.options });
      }
    }
    if (input.type === "query" || input.type === "javascript" || input.type === "loop") {
      const definitionId = typeof data.idOnDefinition === "string" ? data.idOnDefinition : randomUUID();
      data.idOnDefinition = definitionId;
      query_nodes.push({ role: "workflow-node", spec: input, node_id: id, definition_id: definitionId });
    }
    const node = { ...old, id, type, sourcePosition: "right", targetPosition: "left", deletable: false, data, position: input.position ?? old?.position ?? { x: 100 + graph.nodes.length * 320, y: 250 } };
    if (old)
      graph.nodes[graph.nodes.indexOf(old)] = node;
    else
      graph.nodes.push(node);
    node_ids[input.ref] = id;
  }
  const resolve2 = (ref2) => node_ids[ref2] ?? (graph.nodes.some((n) => n.id === ref2) ? ref2 : void 0);
  const editedEdges = /* @__PURE__ */ new Set();
  for (const input of spec.edges) {
    const id = input.existing_id ?? ids?.edge_ids[input.ref] ?? randomUUID();
    if (editedEdges.has(id))
      throw new Error("Multiple edge edits target the same ID.");
    editedEdges.add(id);
    const old = graph.edges.find((e) => e.id === id);
    if (input.existing_id && !old)
      throw new Error(`Unknown existing edge: ${id}`);
    const source = resolve2(input.from), target = resolve2(input.to);
    if (!source || !target)
      throw new Error(`Unknown endpoint in edge ${input.ref}. Use a supplied ref or existing node ID.`);
    const sourceNode = graph.nodes.find((node) => node.id === source);
    const sourceHandle = input.port === "default" && !["if-condition", "human"].includes(sourceNode?.type ?? "") ? sourceNode?.type === "agent" ? "output" : null : input.port;
    const edge = { ...old, id, source, target, sourceHandle, type: "custom" };
    if (old)
      graph.edges[graph.edges.indexOf(old)] = edge;
    else
      graph.edges.push(edge);
    edge_ids[input.ref] = id;
    if (input.port === "failure") {
      const n = graph.nodes.find((n2) => n2.id === source);
      if (n.type === "query")
        n.data.errorHandler = true;
    }
  }
  for (const attachment of spec.agent_tools) {
    if (edge_ids[attachment.ref])
      throw new Error("Duplicate edge ref.");
    const source = node_ids[attachment.from] ?? attachment.from;
    const target = node_ids[attachment.to] ?? attachment.to;
    const queryNode = graph.nodes.find((node) => node.id === source);
    const agent = graph.nodes.find((node) => node.id === target);
    if (queryNode?.type !== "query" || agent?.type !== "agent")
      throw new Error("Agent tools must connect a query to an Agent.");
    if (queryNode.data.agentConnectionType === "ai-model")
      throw new Error("A model cannot also be an Agent tool.");
    if (controlFlowEdges(graph).some((edge2) => edge2.source === source || edge2.target === source))
      throw new Error("Agent tool queries cannot also have control-flow connections.");
    const old = attachment.existing_id ? graph.edges.find((edge2) => edge2.id === attachment.existing_id) : graph.edges.find((edge2) => edge2.source === source && edge2.target === target && edge2.targetHandle === "tool");
    if (attachment.existing_id && (!old || old.targetHandle !== "tool"))
      throw new Error("Unknown Agent tool attachment.");
    const id = old?.id ?? ids?.edge_ids[attachment.ref] ?? randomUUID();
    const edge = { ...old, id, source, target, sourceHandle: "output", targetHandle: "tool", type: "custom", data: { direction: "vertical" } };
    if (old)
      graph.edges[graph.edges.indexOf(old)] = edge;
    else
      graph.edges.push(edge);
    Object.assign(queryNode.data, { isChildOfAgent: true, agentConnectionType: "tool" });
    edge_ids[attachment.ref] = id;
  }
  for (const node of graph.nodes) {
    if (node.data.agentConnectionType === "tool" && !graph.edges.some((edge) => edge.source === node.id && edge.targetHandle === "tool")) {
      delete node.data.isChildOfAgent;
      delete node.data.agentConnectionType;
    }
  }
  graph.queries = graph.queries.filter((q) => !removedDefinitionIds.includes(q.idOnDefinition) || graph.nodes.some((n) => n.data.idOnDefinition === q.idOnDefinition));
  const depths = new Map(graph.nodes.map((n) => [n.id, 0]));
  for (let pass = 0; pass < graph.nodes.length; pass++) {
    let changed = false;
    for (const edge of controlFlowEdges(graph)) {
      const next = (depths.get(edge.source) ?? 0) + 1;
      if (next > (depths.get(edge.target) ?? 0)) {
        depths.set(edge.target, next);
        changed = true;
      }
    }
    if (!changed)
      break;
  }
  const placed = graph.nodes.filter((n) => current.nodes.some((old) => old.id === n.id) || spec.nodes.some((input) => node_ids[input.ref] === n.id && input.position));
  for (const n of graph.nodes.filter((n2) => !placed.includes(n2))) {
    const x = 100 + (depths.get(n.id) ?? 0) * 320;
    let y = 250;
    while (placed.some((other) => other.position && Math.abs(other.position.x - x) < 300 && Math.abs(other.position.y - y) < 160))
      y += 180;
    n.position = { x, y };
    placed.push(n);
  }
  for (const previous of current.nodes) {
    const updated = graph.nodes.find((node) => node.id === previous.id);
    const oldName = previous.data.nodeName;
    const newName = updated?.data.nodeName;
    if (typeof oldName !== "string" || typeof newName !== "string" || oldName === newName)
      continue;
    for (const edge of controlFlowEdges(graph).filter((edge2) => edge2.source === previous.id)) {
      const target = graph.nodes.find((node) => node.id === edge.target);
      if (target?.type !== "filter" || typeof target.data.inputExpression !== "string")
        continue;
      if (spec.nodes.some((input) => input.existing_id === target.id && input.type === "filter"))
        continue;
      const expression = target.data.inputExpression;
      const trimmed = expression.trimStart();
      const suffix = trimmed.slice(oldName.length);
      if (trimmed.startsWith(oldName) && (!suffix.trim() || suffix.startsWith(".") || suffix.startsWith("[") || suffix.startsWith("?."))) {
        const source = /^[A-Za-z_$][\w$]*$/.test(newName) ? newName : `globalThis[${JSON.stringify(newName)}]`;
        target.data.inputExpression = expression.slice(0, expression.length - trimmed.length) + source + suffix;
      }
    }
  }
  if (spec.webhook_parameters !== void 0)
    graph.webhookParams = structuredClone(spec.webhook_parameters);
  if (spec.setup_script !== void 0)
    graph.setupScript = spec.setup_script;
  if (spec.workflow_inputs !== void 0)
    graph.workflowInputs = structuredClone(spec.workflow_inputs);
  if (spec.test_parameters !== void 0)
    graph.defaultParams = JSON.stringify(spec.test_parameters);
  return { graph, node_ids, edge_ids, model_ids, query_nodes };
}
var nodeCatalog = {
  schema_version: 1,
  runtime_context: {
    inputs: "Read workflow inputs from startTrigger.params, for example startTrigger.params.left. A logical start-node ref does not create a JavaScript global.",
    query_results: "Read a preceding query result as <persisted_query_name>.data, for example computeSum.data. There is no app-style queries namespace in workflow code.",
    code: "JavaScript and response code runs in a server-side function body; return the result explicitly. Condition code is a boolean expression without a return statement. Read only preceding nodes on the current execution path.",
    example: {
      query_name: "computeSum",
      javascript: "return { sum: Number(startTrigger.params.left) + Number(startTrigger.params.right) };",
      condition: "computeSum.data.sum > 0",
      response: "return computeSum.data;"
    }
  },
  nodes: [
    { type: "start", renderer: "input", ports: ["default"] },
    { type: "javascript", renderer: "query", ports: ["success", "failure"], fields: ["name", "code"] },
    { type: "query", renderer: "query", ports: ["success", "failure"], fields: ["name", "datasource_id", "options", "looped", "iteration_values_code"] },
    { type: "loop", renderer: "query", ports: ["success", "failure"], fields: ["name", "iteration_values_code", "code"] },
    { type: "condition", renderer: "if-condition", ports: ["condition id", "false (else)"], fields: ["name", "code (legacy only)", "conditions", "else_branch"] },
    { type: "filter", renderer: "filter", ports: ["default"], fields: ["name", "input_expression", "predicate_expression"] },
    { type: "wait", renderer: "wait", ports: ["default"], fields: ["name", "duration_seconds"] },
    { type: "human", renderer: "human", ports: ["outcome key"], fields: ["name", "outcomes", "input_schema", "approvers", "timeout", "reminders", "notification"] },
    { type: "response", renderer: "output", ports: [], fields: ["name", "code", "status_code", "status_code_expression"] },
    { type: "agent", renderer: "agent", ports: ["default"], fields: ["name", "system_prompt", "user_prompt", "output_format", "model"] }
  ],
  edit_semantics: "Patch. Use existing_id to edit nodes/edges; edge endpoints may use existing node IDs. Omitted objects are preserved. Removal requires explicit IDs and incident edge removal.",
  workflow_inputs: "Use workflow_inputs to replace typed declarations; omission preserves them and [] clears them. test_parameters remains separate.",
  advanced_nodes: "Filter expressions use value and index in the predicate. Human and Wait suspend durably and cannot run as child workflows. Use resolve_workflow_approval for an explicitly requested decision. Agent tools use agent_tools attachments.",
  limitations: ["Publishing uses release_app; management tools configure schedules and webhooks", "No concurrent-edit protection", "No automatic execution during authoring", "Unknown node types are preserved but not authored"]
};
createRequire(import.meta.url);
var capabilityRequestSchema = external_exports.object({
  version_id: external_exports.string().uuid()
}).strict();
var datasourceCapabilitySchema = external_exports.enum(["query", "ai-model", "email"]);
var workflowCapabilityReportSchema = external_exports.object({
  version_id: external_exports.string().uuid(),
  authorable_node_types: external_exports.array(external_exports.string()),
  datasources: external_exports.array(external_exports.object({
    id: external_exports.string(),
    name: external_exports.string(),
    kind: external_exports.string(),
    capabilities: external_exports.array(datasourceCapabilitySchema)
  }).strict())
}).strict();
var AI_DATASOURCE_KINDS = /* @__PURE__ */ new Set(["openai", "anthropic", "gemini", "mistral_ai"]);
var EMAIL_DATASOURCE_KINDS = /* @__PURE__ */ new Set(["smtp", "sendgrid", "mailgun"]);
function datasourceCapabilities(kind) {
  const capabilities = ["query"];
  if (AI_DATASOURCE_KINDS.has(kind))
    capabilities.push("ai-model");
  if (EMAIL_DATASOURCE_KINDS.has(kind))
    capabilities.push("email");
  return capabilities;
}
async function getWorkflowCapabilities(client, input) {
  const { version_id } = capabilityRequestSchema.parse(input);
  const datasources = await client.workflows.listDatasources(version_id);
  return workflowCapabilityReportSchema.parse({
    version_id,
    authorable_node_types: nodeCatalog.nodes.map((node) => node.type),
    datasources: datasources.map((datasource) => ({
      id: datasource.id,
      name: datasource.name,
      kind: datasource.kind,
      capabilities: datasourceCapabilities(datasource.kind)
    }))
  });
}
function workflowReadiness(graph, structuralErrors) {
  if (structuralErrors.length)
    return { runtime_readiness: "blocked", blockers: structuralErrors };
  const adjacency = new Map(graph.nodes.map((node) => [node.id, []]));
  for (const edge of controlFlowEdges(graph))
    adjacency.get(edge.source)?.push(edge.target);
  const reachable = /* @__PURE__ */ new Set();
  const visit = (id) => {
    if (reachable.has(id))
      return;
    reachable.add(id);
    for (const target of adjacency.get(id) ?? [])
      visit(target);
  };
  for (const start of graph.nodes.filter((node) => node.type === "input" && node.data.nodeType === "start"))
    visit(start.id);
  const blockers = [];
  for (const node of graph.nodes.filter((node2) => reachable.has(node2.id))) {
    const issues = [];
    if (node.type === "query" && node.data.looped === true && (typeof node.data.iterationValuesCode !== "string" || !node.data.iterationValuesCode.trim()))
      issues.push("Loop requires an array expression.");
    if (node.type === "human")
      issues.push(...humanConfigurationErrors(node.data));
    if (node.type === "wait") {
      const duration = node.data.durationSeconds;
      if (typeof duration !== "number" || !Number.isFinite(duration) || duration < 1 || duration > 2592e3)
        issues.push("Wait duration must be between 1 second and 30 days.");
    }
    if (node.type === "filter" && [node.data.inputExpression, node.data.predicateExpression].some((value) => typeof value !== "string" || !value.trim()))
      issues.push("Filter requires input and predicate expressions.");
    if (node.type === "if-condition") {
      const conditions = Array.isArray(node.data.conditions) ? node.data.conditions : [{ code: node.data.code }];
      if (!conditions.length || conditions.some((branch) => !branch || typeof branch.code !== "string" || !branch.code.trim()))
        issues.push("Every condition branch requires an expression.");
    }
    for (const message of issues)
      blockers.push({ code: "node_configuration", path: `nodes.${node.id}`, message });
  }
  for (const filter of graph.nodes.filter((node) => node.type === "filter")) {
    if (!controlFlowEdges(graph).some((edge) => edge.target === filter.id))
      blockers.push({
        code: "filter_missing_input",
        path: `nodes.${filter.id}`,
        message: "Filter requires one upstream connection before it can run."
      });
  }
  for (const agent of graph.nodes.filter((node) => node.type === "agent" && reachable.has(node.id))) {
    const attachment = graph.edges.find((edge) => edge.target === agent.id && edge.targetHandle === "ai-model");
    const child = attachment && graph.nodes.find((node) => node.id === attachment.source);
    const definitionId = child?.data.idOnDefinition;
    const mapping = typeof definitionId === "string" && graph.queries.find((query2) => query2.idOnDefinition === definitionId);
    if (!attachment || !child || !mapping)
      blockers.push({
        code: "agent_missing_model",
        path: `nodes.${agent.id}.model`,
        message: "Reachable Agent requires one configured AI model attachment."
      });
  }
  return { runtime_readiness: blockers.length ? "draft_only" : "runnable", blockers };
}
var plans = /* @__PURE__ */ new Map();
var TTL = 30 * 6e4;
function prune() {
  for (const [key, plan] of plans)
    if (plan.expires <= Date.now())
      plans.delete(key);
}
async function prepare(client, workflowId, versionId, spec, ids) {
  const snapshot = await client.get(workflowId, versionId);
  if (!snapshot.editable)
    throw new Error("Only editable draft workflow versions can be changed.");
  const [queries, datasources] = await Promise.all([client.getQueries(versionId), client.listDatasources(versionId)]);
  const compiled = compileGraph(snapshot.definition, spec, ids, new Map(datasources.map((datasource) => [datasource.id, datasource.kind])));
  const warnings = [];
  const writes = [];
  const finalDefinitionIds = new Set(compiled.graph.nodes.map((node) => node.data.idOnDefinition).filter((value) => typeof value === "string"));
  const removedDefinitionIds = new Set(snapshot.definition.nodes.map((node) => node.data.idOnDefinition).filter((value) => typeof value === "string" && !finalDefinitionIds.has(value)));
  const deletions = [];
  for (const mapping of snapshot.definition.queries) {
    if (!removedDefinitionIds.has(mapping.idOnDefinition))
      continue;
    if (compiled.graph.queries.some((retained) => retained.id === mapping.id))
      continue;
    if (deletions.some((deletion) => deletion.query_id === mapping.id))
      continue;
    const node = snapshot.definition.nodes.find((candidate) => candidate.data.idOnDefinition === mapping.idOnDefinition);
    if (!node)
      continue;
    if (!queries.some((query2) => query2.id === mapping.id))
      throw new Error(`Query ${mapping.id} is missing from the target version.`);
    deletions.push({ node_id: node.id, definition_id: mapping.idOnDefinition, query_id: mapping.id });
  }
  const claimedNames = /* @__PURE__ */ new Set();
  for (const item of compiled.query_nodes) {
    const existingMapping = snapshot.definition.queries.find((q) => q.idOnDefinition === item.definition_id);
    const oldQuery = queries.find((q) => q.id === existingMapping?.id);
    if (existingMapping && !oldQuery)
      throw new Error(`Query ${existingMapping.id} is missing from the target version.`);
    if (oldQuery && snapshot.definition.nodes.filter((n) => snapshot.definition.queries.some((q) => q.id === oldQuery.id && q.idOnDefinition === n.data.idOnDefinition)).length > 1)
      throw new Error(`Query ${oldQuery.id} is shared by multiple nodes. Shared query editing is unsupported.`);
    const input = item.role === "workflow-node" ? item.spec : void 0;
    const datasource = item.role === "agent-model" ? datasources.find((d) => d.id === item.datasource_id) : input.type === "javascript" || input.type === "loop" ? datasources.find((d) => d.kind === "runjs") : datasources.find((d) => d.id === input.datasource_id);
    const label = item.role === "agent-model" ? "Agent model" : `node ${input.ref}`;
    if (!datasource)
      throw new Error(`Datasource unavailable for ${label}.`);
    if (item.role === "agent-model" && !AI_DATASOURCE_KINDS.has(datasource.kind))
      throw new Error(`Datasource ${datasource.id} is not an AI model datasource.`);
    const kind = datasource.kind;
    const dataSourceId = datasource.id;
    const name2 = item.role === "agent-model" ? item.name : input.name;
    if (oldQuery && (oldQuery.kind !== kind || oldQuery.data_source_id !== dataSourceId))
      throw new Error(item.role === "agent-model" ? "Changing an Agent model datasource is unsupported; remove the model first, then add its replacement in a second phase." : "Changing an existing query datasource is unsupported; add a new node.");
    if (oldQuery?.name !== void 0 && oldQuery.name !== name2)
      throw new Error(item.role === "agent-model" ? "Renaming an Agent model query is unsupported; remove the model first, then add its replacement in a second phase." : "Renaming existing queries is unsupported because code references cannot be rewritten safely.");
    if (claimedNames.has(name2) || queries.some((q) => q.name === name2 && q.id !== oldQuery?.id))
      throw new Error(`Duplicate query name: ${name2}`);
    claimedNames.add(name2);
    const requestedOptions = item.role === "agent-model" ? item.options : input.type === "javascript" || input.type === "loop" ? { ...oldQuery?.options ?? {}, code: input.code } : input.options;
    let options = item.role === "agent-model" ? structuredClone(requestedOptions) : normalizeQueryOptions(kind, requestedOptions);
    if (kind === "workflows")
      options = (await client.resolveReference(options, snapshot)).options;
    if (item.role === "workflow-node" && kind === "runjs")
      assertWorkflowJavaScript(options.code, label);
    if (item.role === "workflow-node") {
      const validation2 = validateQueryOptions(kind, options, "workflow");
      if (validation2.errors.length)
        throw new Error(issueMessages(validation2.errors).join(" "));
      warnings.push(...issueMessages(validation2.warnings));
    }
    writes.push({ node_id: item.node_id, definition_id: item.definition_id, existing_id: oldQuery?.id, name: name2, dataSourceId: dataSourceId ?? "", kind, options });
    if (!existingMapping && !compiled.graph.queries.some((mapping) => mapping.idOnDefinition === item.definition_id))
      compiled.graph.queries.push({ idOnDefinition: item.definition_id, id: `pending:${item.node_id}` });
  }
  const stateNames = /* @__PURE__ */ new Set();
  for (const node of compiled.graph.nodes) {
    const mapping = compiled.graph.queries.find((mapping2) => mapping2.idOnDefinition === node.data.idOnDefinition);
    const write = writes.find((write2) => write2.node_id === node.id);
    const name2 = node.type === "query" ? write?.name ?? queries.find((query2) => query2.id === mapping?.id)?.name : node.data.nodeName;
    if (typeof name2 !== "string" || !name2.trim())
      continue;
    if (stateNames.has(name2))
      throw new Error(`Duplicate workflow node name: ${name2}`);
    stateNames.add(name2);
  }
  const queryIds = /* @__PURE__ */ new Set([...queries.map((q) => q.id), ...writes.filter((q) => !q.existing_id).map((q) => `pending:${q.node_id}`)]);
  const validation = validateGraph(compiled.graph, queryIds);
  const readiness = workflowReadiness(compiled.graph, validation.errors);
  return { snapshot, compiled, writes, deletions, validation, readiness, warnings };
}
async function lint(client, workflowId, versionId, spec, allowDraft = false) {
  const prepared = await prepare(client, workflowId, versionId, spec);
  if (prepared.validation.errors.length || prepared.readiness.runtime_readiness === "draft_only" && !allowDraft)
    return { ...prepared.validation, ...prepared.readiness, query_warnings: prepared.warnings };
  prune();
  while (plans.size >= 200)
    plans.delete(plans.keys().next().value);
  const token = randomUUID();
  plans.set(token, { scope: await client.planScope(), workflowId, versionId, spec: structuredClone(spec), ids: prepared.compiled, allowDraft, expires: Date.now() + TTL });
  return {
    plan_token: token,
    expires_in_seconds: TTL / 1e3,
    node_ids: prepared.compiled.node_ids,
    edge_ids: prepared.compiled.edge_ids,
    ...prepared.validation,
    ...prepared.readiness,
    query_warnings: prepared.warnings,
    changes: { node_upserts: spec.nodes.length, edge_upserts: spec.edges.length, node_removals: spec.remove_node_ids, edge_removals: spec.remove_edge_ids, queries: [...prepared.writes.map((q) => ({ name: q.name, operation: q.existing_id ? "update" : "create" })), ...prepared.deletions.map((q) => ({ query_id: q.query_id, operation: "delete" }))] }
  };
}
async function apply(client, token) {
  prune();
  const scope = await client.planScope();
  const plan = plans.get(token);
  if (!plan || plan.scope !== scope)
    throw new Error("Unknown, expired, consumed, or differently scoped plan. Run lint_workflow_spec again.");
  plans.delete(token);
  const { compiled, snapshot, writes, deletions, validation, readiness } = await prepare(client, plan.workflowId, plan.versionId, plan.spec, plan.ids);
  if (validation.errors.length)
    throw new Error(JSON.stringify(validation.errors));
  if (readiness.runtime_readiness === "draft_only" && !plan.allowDraft)
    throw new Error(JSON.stringify(readiness.blockers));
  const completed = [];
  let phase = "queries";
  let attemptedQuery;
  try {
    for (const write of writes) {
      attemptedQuery = { name: write.name, node_id: write.node_id, existing_id: write.existing_id };
      const result = write.existing_id ? await client.updateQuery({ queryId: write.existing_id, versionId: plan.versionId, name: write.name, options: write.options }) : await client.createWorkflowQuery({ workflowId: plan.workflowId, versionId: plan.versionId, name: write.name, dataSourceId: write.dataSourceId || void 0, kind: write.kind, options: write.options });
      completed.push({ operation: write.existing_id ? "update" : "create", query_id: result.query_id, node_id: write.node_id });
      compiled.graph.queries = compiled.graph.queries.filter((q) => q.idOnDefinition !== write.definition_id);
      compiled.graph.queries.push({ idOnDefinition: write.definition_id, id: result.query_id });
      attemptedQuery = void 0;
    }
    phase = "save";
    await client.save(snapshot, compiled.graph);
    phase = "readback";
    const [saved, queries] = await Promise.all([client.get(plan.workflowId, plan.versionId), client.getQueries(plan.versionId)]);
    const validation2 = validateGraph(saved.definition, new Set(queries.map((q) => q.id)));
    if (!isDeepStrictEqual(saved.definition, compiled.graph))
      throw new Error("Saved definition differs from the intended graph. Inspect get_workflow before retrying.");
    for (const write of writes) {
      const id = completed.find((q) => q.node_id === write.node_id).query_id;
      const persisted = queries.find((q) => q.id === id);
      if (!persisted || persisted.name !== write.name || persisted.kind !== write.kind || persisted.data_source_id !== write.dataSourceId || !isDeepStrictEqual(persisted.options, write.options))
        throw new Error(`Query ${id} readback differs from intended datasource, kind, name, or options.`);
    }
    if (validation2.errors.length)
      throw new Error(JSON.stringify(validation2.errors));
    phase = "query_deletions";
    for (const deletion of deletions) {
      attemptedQuery = { name: deletion.query_id, node_id: deletion.node_id, existing_id: deletion.query_id };
      await client.deleteQuery({ queryId: deletion.query_id, versionId: plan.versionId });
      completed.push({ operation: "delete", query_id: deletion.query_id, node_id: deletion.node_id });
      attemptedQuery = void 0;
    }
    return { workflow_id: plan.workflowId, version_id: plan.versionId, editor_url: saved.editor_url, node_ids: compiled.node_ids, edge_ids: compiled.edge_ids, completed, validation: validation2, ...readiness };
  } catch (error) {
    return {
      failed: true,
      workflow_id: plan.workflowId,
      version_id: plan.versionId,
      phase,
      completed,
      attempted_query: attemptedQuery,
      node_ids: compiled.node_ids,
      edge_ids: compiled.edge_ids,
      graph_persistence: phase === "queries" ? "not_attempted" : phase === "save" ? "unknown" : "saved",
      error: error instanceof Error ? error.message : String(error),
      recovery: "Inspect get_workflow and its queries; reuse persisted IDs when replanning. Do not repeat creation blindly. No resources were automatically deleted."
    };
  }
}
async function deleteNode(client, workflowId, versionId, nodeId) {
  const snapshot = await client.get(workflowId, versionId);
  if (!snapshot.definition.nodes.some((node) => node.id === nodeId))
    throw new Error(`Unknown workflow node: ${nodeId}`);
  const spec = specSchema.parse({ remove_node_ids: [nodeId], remove_edge_ids: snapshot.definition.edges.filter((edge) => edge.source === nodeId || edge.target === nodeId).map((edge) => edge.id) });
  const result = await lint(client, workflowId, versionId, spec, true);
  if (!("plan_token" in result))
    throw new Error(JSON.stringify({ errors: result.errors, blockers: result.blockers }));
  return apply(client, result.plan_token);
}
createRequire(import.meta.url);
var name = external_exports.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).refine((v) => !["__proto__", "prototype", "constructor"].includes(v));
var editContractSchema = external_exports.object({
  source_query: name.describe("Already-loaded bounded raw row-array query; never a display projection."),
  table_component: name,
  id_field: name.default("id"),
  prefix: name.describe("Unique prefix for generated snapshot/draft variables and RunJS query names."),
  fields: external_exports.array(external_exports.object({
    field: name,
    component: name,
    type: external_exports.enum(["text", "number", "date_only", "boolean"]),
    required: external_exports.boolean().default(false),
    nullable: external_exports.boolean().default(false).describe("Opt in to clearing to null; a user change event is also required."),
    trim: external_exports.boolean().default(false),
    choices: external_exports.union([
      external_exports.array(external_exports.object({ label: external_exports.string(), value: external_exports.union([external_exports.string(), external_exports.number().finite()]) }).strict()).min(1).max(100),
      external_exports.object({ query: name, value_field: name, label_field: name }).strict()
    ]).optional().describe("Opt-in DropdownV2 for text/number fields: literal label/value options or an already-loaded bounded raw option query. Values must match the declared field type.")
  })).min(1).max(40)
}).strict();
function canonical(value, field) {
  if (value === void 0)
    throw new Error(`Missing input: ${field.field}`);
  if (value === null || value === "") {
    if (field.required)
      throw new Error(`Required field: ${field.field}`);
    if (value === null && !field.nullable)
      throw new Error(`Null not allowed: ${field.field}`);
    return value;
  }
  if (field.type === "text") {
    if (typeof value !== "string")
      throw new Error(`Expected text: ${field.field}`);
    if (field.required && !value.trim())
      throw new Error(`Required field: ${field.field}`);
    return field.trim ? value.trim() : value;
  }
  if (field.type === "boolean") {
    if (typeof value !== "boolean")
      throw new Error(`Expected boolean: ${field.field}`);
    return value;
  }
  if (field.type === "number") {
    if (typeof value !== "number" && typeof value !== "string" || typeof value === "string" && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value) || !Number.isFinite(Number(value)))
      throw new Error(`Expected finite number: ${field.field}`);
    return Number(value);
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) {
    throw new Error(`Expected ISO date: ${field.field}`);
  }
  const day = value.slice(0, 10);
  const parsed = /* @__PURE__ */ new Date(day + "T00:00:00Z");
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day || !Number.isFinite(Date.parse(value))) {
    throw new Error(`Invalid date: ${field.field}`);
  }
  return day;
}
function generateEditContract(input) {
  const spec = editContractSchema.parse(input);
  for (const key of ["field", "component"]) {
    if (new Set(spec.fields.map((f) => f[key])).size !== spec.fields.length)
      throw new Error(`Duplicate ${key} in edit contract`);
  }
  if (spec.fields.some((f) => f.field === spec.id_field))
    throw new Error("The stable primary key cannot be edited");
  if (spec.fields.some((f) => f.required && f.nullable))
    throw new Error("A required field cannot be nullable");
  for (const f of spec.fields)
    if (f.choices) {
      if (!["text", "number"].includes(f.type))
        throw new Error("Choices require a text or number field");
      if (Array.isArray(f.choices)) {
        if (f.choices.some((o) => typeof o.value !== (f.type === "text" ? "string" : "number")))
          throw new Error("Choice values must match field type");
        if (new Set(f.choices.map((o) => o.value)).size !== f.choices.length)
          throw new Error("Duplicate choice value");
      }
    }
  const snapshot = `${spec.prefix}Snapshot`, draft = `${spec.prefix}Draft`;
  const openName = `${spec.prefix}Open`, prepareName = `${spec.prefix}Prepare`;
  const q = JSON.stringify;
  const helpers = `const canonical = ${canonical.toString()};
const fields = ${q(spec.fields)};
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
`;
  const openCode = helpers + `await actions.setVariable(${q(snapshot)}, null);
await actions.setVariable(${q(draft)}, null);
const selection = components.${spec.table_component}.selectedRow;
const id = selection && selection[${q(spec.id_field)}];
if ((typeof id !== 'string' && typeof id !== 'number') || id === '' || (typeof id === 'number' && !Number.isFinite(id))) throw new Error('Select a record first');
const rows = queries.${spec.source_query}.data;
if (!Array.isArray(rows)) throw new Error('Raw records are not loaded');
const matches = rows.filter(r => r && own(r, ${q(spec.id_field)}) && r[${q(spec.id_field)}] === id);
if (matches.length !== 1) throw new Error('Expected exactly one raw record for the selected ID');
const values = {};
for (const field of fields) {
  if (!own(matches[0], field.field)) throw new Error('Raw record omits: ' + field.field);
  // Existing incomplete records must be openable for correction. Validate required
  // values on Prepare, not before the user can edit them.
  values[field.field] = canonical(matches[0][field.field], { ...field, required: false, nullable: true });
}
await actions.setVariable(${q(snapshot)}, { id, values });
return { id };`;
  const prepareCode = helpers + `const snapshot = variables.${snapshot};
const draft = variables.${draft};
const selection = components.${spec.table_component}.selectedRow;
if (!snapshot || !selection || selection[${q(spec.id_field)}] !== snapshot.id) throw new Error('Reopen the selected record before saving');
if (draft && draft.id !== snapshot.id) throw new Error('Draft belongs to another record');
const changes = draft ? draft.values : {};
if (!changes || typeof changes !== 'object' || Array.isArray(changes)) throw new Error('Invalid draft');
const patch = {};
for (const key of Object.keys(changes)) if (!fields.some(f => f.field === key)) throw new Error('Unknown draft field: ' + key);
for (const field of fields) {
  if (!own(snapshot.values, field.field)) throw new Error('Incomplete edit snapshot');
  if (!own(changes, field.field)) {
    canonical(snapshot.values[field.field], field);
    continue;
  }
  const raw = changes[field.field];
  let value = canonical(raw, field);
  if (value === '' && field.type !== 'text') value = null;
  if (value === '' || value === null) {
    if (!field.nullable) throw new Error('Clearing is not allowed: ' + field.field);
    value = null;
  }
  if (value !== snapshot.values[field.field]) patch[field.field] = value;
}
return { id: snapshot.id, patch, changed: Object.keys(patch).length > 0 };`;
  const inputs = spec.fields.map((f) => {
    const type = f.choices ? "DropdownV2" : { text: "TextInput", number: "NumberInput", date_only: "DatePickerV2", boolean: "Checkbox" }[f.type];
    const initialKey = f.choices ? "schema" : ["date_only", "boolean"].includes(f.type) ? "defaultValue" : "value";
    const exposed = f.type === "date_only" ? "selectedDate" : "value";
    const trigger = f.choices || f.type === "date_only" ? "onSelect" : "onChange";
    const schema = getComponentSchema(type);
    if (!schema?.properties.some((p) => p.key === initialKey) || !schema.events?.some((e) => e.id === trigger))
      throw new Error(`Unsupported edit adapter: ${type}`);
    const initial = `variables.${snapshot} && variables.${snapshot}.values[${q(f.field)}]`;
    let value = `{{${initial} != null ? variables.${snapshot}.values[${q(f.field)}] : ${f.type === "boolean" ? "false" : "''"}}}`;
    if (f.choices) {
      const options = Array.isArray(f.choices) ? q(f.choices) : `(queries.${f.choices.query}.data || []).map(r=>({label:r[${q(f.choices.label_field)}],value:r[${q(f.choices.value_field)}]}))`;
      value = `{{(${options}).map(option=>({label:option.label,value:option.value,visible:true,default:!!variables.${snapshot} && option.value === variables.${snapshot}.values[${q(f.field)}]}))}}`;
    }
    const exposedValue = `components.${f.component}.${exposed}`;
    const changedValue = f.choices && f.nullable ? `(${exposedValue} == null ? null : ${exposedValue})` : exposedValue;
    const draftValue = `{{({id:variables.${snapshot}.id,values:Object.assign({},variables.${draft} && variables.${draft}.id === variables.${snapshot}.id ? variables.${draft}.values : {},{${q(f.field)}:${changedValue}})})}}`;
    return {
      name: f.component,
      type,
      properties: { [initialKey]: value, ...f.choices ? { advanced: "{{true}}", showClearBtn: f.nullable } : {}, ...f.type === "date_only" ? { dateFormat: "YYYY-MM-DD" } : {} },
      validation: { mandatory: f.required },
      events: [{ source_ref: f.component, source_type: "component", trigger, action: {
        actionId: "set-custom-variable",
        key: draft,
        value: draftValue,
        runOnlyIf: `{{!!variables.${snapshot}}}`
      } }]
    };
  });
  return {
    queries: [
      { name: openName, kind: "runjs", options: { code: openCode } },
      { name: prepareName, kind: "runjs", options: { code: prepareCode } }
    ],
    inputs,
    mutation_contract: {
      id: `{{queries.${prepareName}.data.id}}`,
      patch: `{{queries.${prepareName}.data.patch}}`,
      runOnlyIf: `{{queries.${prepareName}.data && queries.${prepareName}.data.changed === true}}`
    },
    wiring: [
      `Run ${openName} on Edit; open the editor only on its success. Merge the returned input properties and change events into your native layout. Never use display selectedRow fields as defaults.`,
      `Run ${prepareName} on Save; run a datasource-specific PATCH/update ONLY on its success and with mutation_contract.runOnlyIf. No change means no write. Bind the ID and patch from mutation_contract; never expand missing patch keys to null or empty strings.`,
      "Gate Save while open/prepare/write are loading. Preserve the editor on failure. Refresh affected queries and close/reset only after the actual mutation succeeds; refresh actions are not assumed to complete in order."
    ],
    limitations: [
      "Requires an already-loaded bounded raw row array and a single stable scalar ID. This generates wiring only; it does not create resources or persist data.",
      "Only text, finite number, ISO date-only and boolean fields are covered; text/number fields can opt into dropdown choices. Required/nullable/trim are explicit opt-ins; domain constraints, authorization and optimistic concurrency must be enforced separately.",
      "Dropdown option queries must already return bounded raw arrays with matching ID types and include the current value, including inactive owners when necessary. Missing options are not permission to clear stored relationships. Validate membership/authorization separately; this helper does not create or execute option queries.",
      "Draft tracks native change events, not every displayed input value. Programmatic field changes must update the draft explicitly. Browser-verify that all change events fire, including both checkbox transitions."
    ]
  };
}
createRequire(import.meta.url);
var userRole = external_exports.enum(["admin", "builder", "end-user"]);
var userStatus = external_exports.enum(["active", "archived", "invited"]);
var listWorkspaceAppsInput = external_exports.object({
  page: external_exports.number().int().positive().optional(),
  search_text: external_exports.string().trim().max(100).describe("Filter by app name.").optional(),
  folder_id: external_exports.string().uuid().describe("Folder ID returned by list_workspace_folders.").optional()
}).strict();
var listWorkspaceFoldersInput = external_exports.object({
  search_text: external_exports.string().trim().max(100).describe("Case-insensitive folder-name search.").optional()
}).strict();
function listWorkspaceAppsTool(client) {
  return {
    name: "list_workspace_apps",
    title: "List Workspace Apps",
    strictInput: true,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    description: "List front-end apps in the workspace pinned to the current ToolJet connection, with pagination, app-name search, and optional folder_id filtering. Discover folder IDs with list_workspace_folders. Each app includes folders: [{id,name}] (empty when unfiled). The top-level folder describes the selected folder, or is null. meta.workspace_folder_count counts visible app folders; meta.folder_app_count counts matching apps in the selected folder (null without a folder filter). meta.total_count remains the workspace-wide count of matching apps even with folder_id; use meta.folder_app_count for the folder. This cannot inspect or switch to another workspace.",
    inputSchema: listWorkspaceAppsInput.shape,
    async handler(input) {
      try {
        const args = listWorkspaceAppsInput.parse(input);
        return ok(await client.listWorkspaceApps({ page: args.page, searchText: args.search_text, folderId: args.folder_id }));
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function listWorkspaceFoldersTool(client) {
  return {
    name: "list_workspace_folders",
    title: "List Workspace Folders",
    strictInput: true,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    description: "List visible front-end app folders in the workspace pinned to the current ToolJet connection. Returns folders: [{id,name,app_count}] and meta.total_count (matching folders). app_count counts apps visible to you. search_text filters folder names, not app names. Includes empty folders when ToolJet permits you to see them. Pass a returned id as folder_id to list_workspace_apps to read that folder\u2019s apps with pagination and app-name search. OAuth connections require the apps scope; existing ToolJet permissions still apply.",
    inputSchema: listWorkspaceFoldersInput.shape,
    async handler(input) {
      try {
        const args = listWorkspaceFoldersInput.parse(input);
        return ok(await client.listWorkspaceFolders({ searchText: args.search_text }));
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function listWorkspaceUsersTool(client) {
  return {
    name: "list_workspace_users",
    title: "List Workspace Users",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    description: "List users in the workspace pinned to the current ToolJet connection. Supports pagination, search, and status filtering. OAuth connections require the workspace_users scope.",
    inputSchema: {
      page: external_exports.number().int().positive().optional(),
      search_text: external_exports.string().trim().max(100).optional(),
      filter_status: userStatus.optional()
    },
    async handler(args) {
      try {
        return ok(await client.listWorkspaceUsers({
          page: args.page,
          searchText: args.search_text,
          status: args.filter_status
        }));
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function required(value, label) {
  if (!value)
    throw new Error(`${label} is required for this action.`);
  return value;
}
var manageWorkspaceUsersInput = external_exports.object({
  action: external_exports.enum(["invite", "update", "archive", "unarchive"]),
  organization_user_id: external_exports.string().uuid().optional(),
  email: external_exports.string().email().optional(),
  first_name: external_exports.string().trim().max(99).optional(),
  last_name: external_exports.string().trim().max(99).optional(),
  role: userRole.optional(),
  group_ids: external_exports.array(external_exports.string().uuid()).max(100).optional(),
  user_metadata: external_exports.record(external_exports.string(), external_exports.unknown()).optional(),
  confirm: external_exports.boolean().optional()
}).strict();
function manageWorkspaceUsersTool(client) {
  return {
    name: "manage_workspace_users",
    title: "Manage Workspace Users",
    strictInput: true,
    // invite is additive, but update overwrites a member's role and archive revokes their access to
    // the workspace, so the hint covers its widest action.
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: "Manage users only in the workspace pinned to the current ToolJet connection. OAuth connections require the workspace_users scope. Invite, update, archive, and unarchive require confirm:true. Updates can change role, add existing custom group_ids while preserving all other memberships, and merge supplied user_metadata keys while preserving other keys. Empty group_ids never removes groups. first_name/last_name are only supported for invitations: editing an existing name requires a Super Admin in ToolJet and is refused by this workspace-scoped tool before any mutation. Updates are read back before success is reported. Use manage_workspace_groups remove_member for explicit membership removal. Updates cannot change email or passwords. Changing a role to end-user also transfers any apps owned by that user to the acting admin under ToolJet's existing behavior; disclose this before confirmation. Invite accepts email, optional names/role/group_ids; archive/unarchive accepts only organization_user_id. Never substitute role or membership changes for a rejected name edit, or bypass the connection owner's ToolJet permissions.",
    inputSchema: manageWorkspaceUsersInput.shape,
    async handler(input) {
      try {
        const args = manageWorkspaceUsersInput.parse(input);
        const allowed = args.action === "invite" ? ["email", "first_name", "last_name", "role", "group_ids"] : args.action === "update" ? ["organization_user_id", "first_name", "last_name", "role", "group_ids", "user_metadata"] : ["organization_user_id"];
        for (const key of Object.keys(args)) {
          if (!["action", "confirm", ...allowed].includes(key))
            throw new Error(`${key} is not supported for ${args.action}; no changes were made.`);
        }
        if (args.action === "update" && (args.first_name !== void 0 || args.last_name !== void 0)) {
          throw new Error("Name changes require a Super Admin and are not supported by this workspace-scoped tool. No changes were made. Ask a Super Admin to edit the name in ToolJet.");
        }
        if (args.confirm !== true) {
          throw new Error(`${args.action} requires confirm:true after checking the exact workspace user.`);
        }
        if (args.action === "invite") {
          await client.inviteWorkspaceUser({
            email: required(args.email, "email"),
            role: args.role ?? "end-user",
            firstName: args.first_name,
            lastName: args.last_name,
            groupIds: args.group_ids
          });
          return ok({ invited: true, email: args.email });
        }
        const organizationUserId = required(args.organization_user_id, "organization_user_id");
        if (args.action === "archive" || args.action === "unarchive") {
          await client.setWorkspaceUserArchived(organizationUserId, args.action === "archive");
          return ok({ organization_user_id: organizationUserId, status: args.action === "archive" ? "archived" : "active" });
        }
        if (args.first_name === void 0 && args.last_name === void 0 && args.role === void 0 && !args.group_ids?.length && args.user_metadata === void 0) {
          throw new Error("update requires at least one changed field.");
        }
        const result = await client.updateWorkspaceUser(organizationUserId, {
          firstName: args.first_name,
          lastName: args.last_name,
          role: args.role,
          addGroupIds: args.group_ids,
          userMetadata: args.user_metadata
        });
        return ok({
          organization_user_id: organizationUserId,
          ...result,
          ...!result.updated ? { already_satisfied: true } : {}
        });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
var workspaceUsers = [
  {
    action: "invite",
    name: "invite_workspace_user",
    title: "Invite Workspace User",
    description: "Send an email invitation to the pinned workspace. Requires confirm:true for the exact recipient and access. Role defaults to end-user; optional group_ids add existing custom groups. Requires workspace_users OAuth scope and ToolJet permissions. Do not automatically retry an uncertain send.",
    required: ["email", "confirm"],
    optional: ["first_name", "last_name", "role", "group_ids"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true }
  },
  {
    action: "update",
    name: "update_workspace_user",
    title: "Update Workspace User",
    description: "Change a workspace member role, add custom group memberships, or merge supplied metadata keys. Preserves other memberships and metadata; empty group_ids removes nothing. Changing role to end-user transfers owned apps to the acting admin: disclose before confirm:true. Cannot change names, email, or passwords. Requires workspace_users scope and ToolJet permissions; reads back updates.",
    required: ["organization_user_id", "confirm"],
    optional: ["role", "group_ids", "user_metadata"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "archive",
    name: "archive_workspace_user",
    title: "Archive Workspace User",
    description: "Archive the exact member of the pinned workspace and revoke their workspace access. Requires confirm:true, workspace_users OAuth scope, and ToolJet permissions.",
    required: ["organization_user_id", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "unarchive",
    name: "unarchive_workspace_user",
    title: "Unarchive Workspace User",
    description: "Restore an archived member to active status in the pinned workspace. Requires confirm:true, workspace_users OAuth scope, and ToolJet permissions.",
    required: ["organization_user_id", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  }
];
function workspaceUserActionTools(source) {
  return exposeActions(source, workspaceUsers);
}
createRequire(import.meta.url);
var requestSchema = external_exports.object({
  method: external_exports.string().min(1),
  schema: external_exports.string().optional(),
  table: external_exports.string().optional(),
  search: external_exports.string().optional(),
  page: external_exports.number().int().positive().optional(),
  limit: external_exports.number().int().positive().max(1e3).optional(),
  args: external_exports.record(external_exports.string(), external_exports.any()).optional()
});
function datasourceMetadataTools(source) {
  const methods = [
    ["listDatasets", "list_datasource_datasets", "List Datasource Datasets", "List dataset names in a connected datasource."],
    ["listTables", "list_datasource_tables", "List Datasource Tables", "List tables or API endpoint paths from a connected datasource; for HubSpot, an omitted schema lists spec groups."],
    ["listColumns", "list_datasource_columns", "List Datasource Columns", "Read column definitions for one datasource table."],
    ["getSheets", "list_datasource_sheets", "List Datasource Sheets", "List sheets in a connected spreadsheet datasource."],
    ["getSpreadsheets", "list_datasource_spreadsheets", "List Datasource Spreadsheets", "List spreadsheets available to a connected datasource."],
    ["getEndpointSchema", "get_datasource_endpoint_schema", "Get Datasource Endpoint Schema", "Read the request contract for one API endpoint from its specification; never send the endpoint request."],
    ["listCollections", "list_datasource_collections", "List Datasource Collections", "List collection names in a connected document datasource."],
    ["listSchemas", "list_datasource_schemas", "List Datasource Schemas", "List database schema names in a connected datasource."],
    ["getTenants", "list_datasource_tenants", "List Datasource Tenants", "List tenant metadata available through a connected datasource."]
  ];
  return exposeActions(source, methods.map(([action, name2, title, description]) => ({
    action,
    name: name2,
    title,
    description: `${description} Uses the fixed ${action} metadata method, only when the datasource advertises it. Does not execute saved queries, author resources, or invoke the API endpoints described by a returned schema. schema/table/search/page/limit are selectors; args supplies datasource-specific selectors such as spreadsheet ID or endpoint HTTP method.`,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    required: ["version_id", "datasource_id"],
    optional: ["schema", "table", "search", "page", "limit", "args"]
  })), "method");
}
function invokeArgs(request) {
  const customValues = request.args?.values && typeof request.args.values === "object" && !Array.isArray(request.args.values) ? request.args.values : {};
  const values = {
    ...customValues,
    ...request.schema !== void 0 ? { schema: request.schema } : {},
    ...request.table !== void 0 ? { table: request.table } : {}
  };
  return {
    ...request.args ?? {},
    ...Object.keys(values).length ? { values } : {},
    ...request.search !== void 0 ? { search: request.search } : {},
    ...request.page !== void 0 ? { page: request.page } : {},
    ...request.limit !== void 0 ? { limit: request.limit } : {}
  };
}
var specCache = /* @__PURE__ */ new Map();
function specText(entry) {
  const raw = entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
  return typeof raw === "string" ? raw : void 0;
}
function parseSpecCached(options) {
  const key = specText(options.spec) ?? specText(options.definition);
  if (key === void 0)
    return extractSpec(options);
  const hit = specCache.get(key);
  if (hit)
    return hit;
  const parsed = extractSpec(options);
  if (parsed) {
    if (specCache.size > 8)
      specCache.clear();
    specCache.set(key, parsed);
  }
  return parsed;
}
function openapiIntrospection(spec, request) {
  if (request.method === "listTables") {
    const endpoints = listEndpoints(spec);
    const host2 = specHost(spec);
    const header = { total: endpoints.length, ...host2 ? { host: host2 } : {} };
    if (request.search) {
      const ranked = rankEndpoints(spec, endpoints, request.search);
      const limit2 = request.limit ?? 25;
      return {
        ...header,
        search: request.search,
        matched: ranked.length,
        ...ranked.length > limit2 ? { returned: limit2 } : {},
        // Ordered by relevance, not spec order: the caller should read from the top.
        endpoints: ranked.slice(0, limit2).map(({ score, ...endpoint }) => endpoint),
        ...ranked.length ? {} : { hint: "No endpoint matched. Retry with a broader term, or omit `search` to see the spec's tags." }
      };
    }
    const limit = request.limit ?? 200;
    if (endpoints.length > limit) {
      return {
        ...header,
        tags: endpointTagCounts(spec, endpoints),
        returned: limit,
        truncated: true,
        next_step: `This spec has ${endpoints.length} endpoints. Call listTables again with \`search\` describing what you need (a phrase is fine, it is ranked by relevance), or with a tag name from \`tags\`.`,
        endpoints: endpoints.slice(0, limit)
      };
    }
    return { ...header, endpoints };
  }
  const path = request.table ?? (typeof request.args?.path === "string" ? request.args.path : void 0);
  const method = ["operation", "method", "httpMethod", "http_method", "verb"].map((key) => request.args?.[key]).find((value) => typeof value === "string" && !!value);
  if (!path || !method) {
    throw new Error('getEndpointSchema needs the endpoint path and HTTP method: pass the path as `table` and the method as `args.operation` (for example table:"/pets/{petId}", args:{operation:"get"}); `args.httpMethod` and `args.method` are accepted too.');
  }
  const result = endpointParameters(spec, path, method);
  if (!result.found) {
    throw new Error(`The spec has no ${method.toLowerCase()} operation on path "${path}". Call listTables first.`);
  }
  const buckets = {};
  for (const parameter of result.parameters) {
    const bucket = parameter.in === "header" ? "params.header" : parameter.in === "path" ? "params.path" : parameter.in === "query" ? "params.query" : `unsupported:${parameter.in}`;
    (buckets[bucket] ??= []).push(parameter.name);
  }
  if (result.requestBody)
    buckets["params.request"] = ["<request body>"];
  const operation = method.toLowerCase();
  const host = specHost(spec);
  return {
    path,
    operation,
    /* A runnable skeleton, not just a description: copy it and fill the buckets.
       All four buckets are present even when empty because the plugin destructures every one of
       them and calls Object.entries(params.path) unguarded — omitting a bucket fails the query with
       "Cannot convert undefined or null to object" before the request is ever built. */
    query_options: {
      ...host ? { host } : {},
      path,
      operation,
      params: { request: {}, query: {}, header: {}, path: {} }
    },
    // Which query-option bucket each parameter belongs in, so the caller does not have to infer it.
    buckets,
    parameters: result.parameters,
    ...result.response ? { response: result.response } : {},
    ...result.requestBody ? { requestBody: result.requestBody } : {},
    ...host ? {} : { host_warning: 'This spec declares no server URL. The query needs an explicit `host`, or the request fails with "Invalid URL".' }
  };
}
function inspectDatasourceSchemaTool(client) {
  return {
    name: "inspect_datasource_schema",
    title: "Inspect Datasource Schema",
    // Invokes only plugin-advertised read-only metadata methods.
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true
    },
    description: 'Invoke one read-only metadata method advertised by a connected datasource plugin (for example listSchemas, listTables, listColumns, or listCollections). This avoids creating/running ad-hoc information_schema queries. HubSpot: call listTables without schema to list spec groups, then pass schema for endpoint discovery. Use get_datasource_query_schema with sections:["introspection"] to discover exact methods. Common schema/table/search/page/limit inputs are converted to ToolJet selector args; `args` adds plugin-specific fields. Only the requested metadata method is called. Use requests (up to 20) to batch independent table/column lookups after the schema/table names are known; every method is validated before any invocation.',
    inputSchema: {
      version_id: external_exports.string(),
      datasource_id: external_exports.string(),
      method: external_exports.string().min(1).optional(),
      schema: external_exports.string().optional(),
      table: external_exports.string().optional(),
      search: external_exports.string().optional(),
      page: external_exports.number().int().positive().optional(),
      limit: external_exports.number().int().positive().max(1e3).optional(),
      args: external_exports.record(external_exports.string(), external_exports.any()).optional(),
      requests: external_exports.array(requestSchema).min(1).max(20).optional()
    },
    async handler(args) {
      try {
        const datasource = (await client.listDatasources(args.version_id)).find((candidate) => candidate.id === args.datasource_id);
        if (!datasource) {
          return fail(new Error(`Datasource "${args.datasource_id}" is not available on version "${args.version_id}".`));
        }
        const contract = getDatasourceQuerySchema(datasource.kind);
        const kindSpec = singleSpecRef(datasource.kind);
        const methods = [.../* @__PURE__ */ new Set([...contract?.introspectionMethods ?? [], ...kindSpec ? SPEC_DISCOVERY_METHODS : []])];
        const topLevel = args.method ? [{
          method: args.method,
          schema: args.schema,
          table: args.table,
          search: args.search,
          page: args.page,
          limit: args.limit,
          args: args.args
        }] : [];
        const seenRequests = /* @__PURE__ */ new Set();
        const requests = [...args.requests ?? [], ...topLevel].filter((request) => {
          if (!request.method)
            return false;
          const key = JSON.stringify([request.method, request.schema ?? null, request.table ?? null, request.search ?? null]);
          if (seenRequests.has(key))
            return false;
          seenRequests.add(key);
          return true;
        });
        if (!requests.length) {
          return fail(new Error("Provide a `method` or a `requests` batch."));
        }
        const asBatch = !!args.requests?.length || requests.length > 1;
        const unsupported = [...new Set(requests.map((request) => request.method).filter((method) => !methods.includes(method)))];
        if (unsupported.length) {
          return fail(new Error(`Datasource kind "${datasource.kind}" does not advertise introspection method(s) ${unsupported.map((method) => `"${method}"`).join(", ")}. Available methods: ${methods.length ? methods.join(", ") : "none"}.`));
        }
        let openapiSpec;
        if (datasource.kind === "openapi") {
          const details = await client.getDatasourceConnectionDetails(args.datasource_id);
          openapiSpec = parseSpecCached(details.options);
          if (!openapiSpec) {
            return fail(new Error("This OpenAPI datasource has no readable spec stored in its options, so its endpoints cannot be listed. Re-save the datasource with a valid OpenAPI/Swagger (JSON or YAML) document."));
          }
        }
        const hubspotDocuments = /* @__PURE__ */ new Map();
        let kindSpecDocument;
        const results = await Promise.all(requests.map(async (request) => {
          if (datasource.kind === "hubspot") {
            const specs = hubspotSpecs();
            const selector = request.schema ?? request.args?.specType;
            if (!selector && request.method === "listTables") {
              return { method: request.method, result: {
                specs,
                next_step: "Choose a spec using schema (name, label or specType), then call listTables to find paths or getEndpointSchema to get query_options. Properties and Pipelines describe endpoints for discovering account-specific fields and stages."
              } };
            }
            const selected = specs.find((spec) => [spec.name, spec.label, spec.specType].includes(String(selector)));
            if (!selected)
              throw new Error("HubSpot discovery requires a known schema. Call listTables without schema to list installed spec groups.");
            if (!hubspotDocuments.has(selected.name)) {
              hubspotDocuments.set(selected.name, client.getPluginSpec("hubspot", selected.name).then((text) => {
                const spec = extractSpec({ spec: text });
                if (!spec)
                  throw new Error(`HubSpot spec "${selected.name}" is unavailable or invalid. Reinstall/update the plugin; do not invent its endpoints.`);
                return spec;
              }));
            }
            const document = await hubspotDocuments.get(selected.name);
            const result2 = openapiIntrospection(document, request);
            if (result2.query_options) {
              delete result2.query_options.host;
              delete result2.query_options.params.header;
              delete result2.host_warning;
              result2.query_options.specType = selected.specType;
              if (result2.buckets?.["params.header"])
                result2.unsupported_headers = result2.buckets["params.header"];
              result2.notes = "HubSpot fixes the API host and authentication in the plugin. The spec describes API shapes; read Properties/Pipelines endpoints to verify account-specific fields and valid stage IDs. Do not guess them.";
            }
            return { method: request.method, schema: selected.name, specType: selected.specType, result: result2 };
          }
          if (kindSpec && SPEC_DISCOVERY_METHODS.includes(request.method)) {
            kindSpecDocument ??= loadKindSpec(client, datasource.kind, kindSpec);
            const result2 = openapiIntrospection(await kindSpecDocument, request);
            if (result2.query_options) {
              delete result2.query_options.host;
              delete result2.query_options.params?.header;
              delete result2.host_warning;
              if (result2.buckets?.["params.header"])
                result2.unsupported_headers = result2.buckets["params.header"];
              result2.notes = `The ${datasource.kind} plugin fixes the API host and authentication. Copy query_options as they are; put IDs in params.path and filters in params.query, each value flat (created[gte], expand[0]): the plugin cannot send a list or an object.`;
            }
            return { method: request.method, ...request.table ? { table: request.table } : {}, result: result2 };
          }
          if (openapiSpec) {
            const result2 = openapiIntrospection(openapiSpec, request);
            return { method: request.method, ...request.table ? { table: request.table } : {}, result: result2 };
          }
          const converted = invokeArgs(request);
          const result = await client.invokeDatasourceMethod({
            dataSourceId: args.datasource_id,
            method: request.method,
            ...Object.keys(converted).length ? { args: converted } : {}
          });
          return {
            method: request.method,
            ...request.schema ? { schema: request.schema } : {},
            ...request.table ? { table: request.table } : {},
            result
          };
        }));
        const header = { datasource: { id: datasource.id, name: datasource.name, kind: datasource.kind } };
        return asBatch ? ok({ ...header, results }) : ok({ ...header, method: results[0].method, result: results[0].result });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
createRequire(import.meta.url);
var COMPONENT_FX_GUIDANCE = "For properties/styles/validation with an FX toggle, use `{ value: <expression>, fxActive: true }` only for bindings/conditions/calculations the normal control cannot express. Keep defaults and panel-editable constants (including `{{true}}`/`{{false}}`, numbers, selections, colors) out of FX. For nested Table columns/buttons/options and KeyValuePair fields, add the property key (e.g. `columnVisibility`, `disableButton`, `fieldVisibility`, `isEditable`) to that object's `fxActiveFields`, preserving other entries. ";
var COMPONENT_FX_UPDATE_GUIDANCE = COMPONENT_FX_GUIDANCE + "Updates must include both `value` and `fxActive`; revert with `{ value: <constant>, fxActive: false }`. For nested Table fields, remove only reverted property keys from `fxActiveFields`. KeyValuePair arrays merge by index; verify flag removals and report retained flags. ";
createRequire(import.meta.url);
function separateAdjacentClosingBraces(text) {
  let out = "";
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (!text.startsWith("{{", i)) {
      out += text[i];
      i += 1;
      continue;
    }
    let j = i + 2;
    let depth = 0;
    let quote = null;
    let expr = "";
    let terminated = false;
    while (j < n) {
      const c = text[j];
      if (quote) {
        expr += c;
        if (c === "\\" && j + 1 < n) {
          expr += text[j + 1];
          j += 2;
          continue;
        }
        if (c === quote)
          quote = null;
        j += 1;
        continue;
      }
      if (c === "'" || c === '"' || c === "`") {
        quote = c;
        expr += c;
        j += 1;
        continue;
      }
      if (c === "{") {
        depth += 1;
        expr += c;
        j += 1;
        continue;
      }
      if (c === "}") {
        if (depth === 0 && text[j + 1] === "}") {
          terminated = true;
          break;
        }
        depth = Math.max(depth - 1, 0);
        expr += c;
        if (text[j + 1] === "}")
          expr += " ";
        j += 1;
        continue;
      }
      expr += c;
      j += 1;
    }
    if (!terminated) {
      out += text.slice(i);
      break;
    }
    out += `{{${expr}}}`;
    i = j + 2;
  }
  return out;
}
function separateAdjacentClosingBracesDeep(value) {
  if (typeof value === "string") {
    if (!value.includes("{{"))
      return { value, changed: false };
    const fixed = separateAdjacentClosingBraces(value);
    return { value: fixed, changed: fixed !== value };
  }
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const result = separateAdjacentClosingBracesDeep(item);
      changed ||= result.changed;
      return result.value;
    });
    return { value: changed ? next : value, changed };
  }
  if (value && typeof value === "object") {
    let changed = false;
    const next = {};
    for (const [key, item] of Object.entries(value)) {
      const result = separateAdjacentClosingBracesDeep(item);
      changed ||= result.changed;
      next[key] = result.value;
    }
    return { value: changed ? next : value, changed };
  }
  return { value, changed: false };
}
function normalizeSection(section) {
  if (!section)
    return { value: void 0, patch: void 0 };
  const value = {};
  const patch = {};
  for (const [key, entry] of Object.entries(section)) {
    const canonical2 = entry !== null && typeof entry === "object" && !Array.isArray(entry) && "value" in entry ? entry : { value: entry };
    value[key] = canonical2;
    if (canonical2 !== entry)
      patch[key] = canonical2;
  }
  return {
    value,
    patch: Object.keys(patch).length ? patch : void 0
  };
}
function propValue(properties, key) {
  const entry = properties[key];
  return entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
}
function isTruthy(value) {
  if (value === true || value === 1)
    return true;
  if (typeof value !== "string")
    return false;
  const compact = value.replace(/\s+/g, "").toLowerCase();
  return compact === "true" || compact === "{{true}}" || compact === "1" || compact === "{{1}}";
}
function catalogDefault(type, key, fallback) {
  return getComponentSchema(type)?.properties.find((property) => property.key === key)?.default ?? fallback;
}
var MONEY_WORDS = /\b(price|amount|cost|total|revenue|balance|fee|fees|spend|spent|salary|budget|paid|payment|invoice|subtotal|tax|refund|value|mrr|arr)\b/i;
var PERSON_WORDS = /\b(customer|client|requester|requestor|owner|assignee|assigned to|contact|lead|member|patient|guest|organi[sz]er|employee|technician|tech|agent|rep|student|author|reporter|host|driver|candidate|applicant|tenant|buyer|seller|manager|person|attendee|trainer|coach|instructor|doctor|vet|veterinarian|nurse|resident|full name|customer name|contact name)\b/i;
var UNIT_WORDS = /\b(min|mins|minutes?|hours?|hrs?|days?|weeks?|time|count|qty|quantity|servings?|units?|items?|points?|score|percent|pct|kg|lbs?|reps?|sets?|seats?|guests?|nights?|orders?|tickets?|visits?)\b/i;
var COUNT_WORDS = /\b(min|mins|minutes?|hours?|hrs?|count|qty|quantity|servings?|units?|items?|points?|score|percent|pct|kg|lbs?|reps?|sets?|seats?|guests?|nights?|orders?|tickets?|visits?|jobs?|rate)\b/i;
var STATE_WORDS = /\b(status|stage|state|priority|severity|availability|health|risk|condition)\b/i;
var AMBIGUOUS_MONEY_WORDS = /\b(total|totals|value)\b/gi;
var COUNTED_NOUNS = /\b(clients?|clientes?|customers?|users?|usu[aá]rios?|members?|membros?|miembros?|patients?|pacientes?|leads?|accounts?|contas?|cuentas?|vendors?|suppliers?|fornecedor(es)?|proveedor(es)?|employees?|funcion[aá]rios?|empleados?|staff|people|pessoas|personas|students?|alunos?|estudiantes?|contacts?|contatos?|contactos?|compan(y|ies)|empresas?|projects?|projetos?|proyectos?|tasks?|tarefas?|tareas?|bugs?|issues?|requests?|pedidos?|solicita[cç](ão|ões|ión|iones)|records?|registros?|rooms?|salas?|bookings?|reservations?|reservas?|appointments?|agendamentos?|consultas?|citas?|recipes?|receitas?|recetas?|ingredients?|ingredientes?|products?|produtos?|productos?|assets?|ativos?|devices?|dispositivos?|vehicles?|ve[ií]culos?|audits?|auditorias?|findings?|cases?|casos?|deals?|negócios?|events?|eventos?)\b/i;
var countLabel = (label) => {
  if (COUNT_WORDS.test(label))
    return true;
  return !MONEY_WORDS.test(label.replace(AMBIGUOUS_MONEY_WORDS, " ")) && COUNTED_NOUNS.test(label);
};
function plannedCurrency(components) {
  for (const component of components) {
    if (component.type !== "ShadStat")
      continue;
    const currency = propValue(component.properties ?? {}, "currency");
    if (typeof currency === "string" && /^[A-Za-z]{3}$/.test(currency.trim()))
      return currency.trim().toUpperCase();
  }
  return void 0;
}
var CLIENT_SERVER_BOOLEAN_KEYS = /* @__PURE__ */ new Set([
  "serverSidePagination",
  "serverSideSearch",
  "serverSideSort",
  "serverSideFilter"
]);
var STATISTICS_ICON_VALUE_MIN_SAFE_WIDTH_COLS = 24;
function isStrippableUnknownKey(type, section, key, knownKeys) {
  if (knownKeys.includes(key))
    return false;
  if (section === "properties" && retiredUi2Name(type, "properties", key))
    return false;
  if (type === "DropdownV2" && section === "properties" && ["value", "defaultValue"].includes(key))
    return false;
  if (section === "properties" && STYLE_KEYS_IN_PROPERTIES.has(key))
    return false;
  const aliasTarget = PROPERTY_KEY_ALIASES[key.toLowerCase()];
  if (aliasTarget && (knownKeys.includes(aliasTarget) || STYLE_KEYS_IN_PROPERTIES.has(aliasTarget)))
    return false;
  if (nearestCatalogKey(key, knownKeys))
    return false;
  return true;
}
function packValueAsDefault(type, name2, properties) {
  if (!properties || properties.value === void 0)
    return { properties };
  const schema = type ? getComponentSchema(type) : void 0;
  const keys = new Set((schema?.properties ?? []).map((entry) => entry.key));
  if (!schema?.pack || !keys.has("defaultValue") || keys.has("value"))
    return { properties };
  const { value, ...rest } = properties;
  if (rest.defaultValue !== void 0) {
    return { properties: rest, warning: `${type} "${name2}": dropped properties.value, the input's runtime value; it starts from defaultValue.` };
  }
  return {
    properties: { ...rest, defaultValue: value },
    warning: `${type} "${name2}": moved properties.value to defaultValue, where the input takes its starting value from.`
  };
}
function normalizeComponentSpec(component, options = {}) {
  const normalizedSections = Object.fromEntries(["properties", "styles", "validation", "others"].map((section) => [
    section,
    normalizeSection(component[section])
  ]));
  const warnings = [];
  const packValue = packValueAsDefault(component.type, component.name, normalizedSections.properties.value);
  if (packValue.warning)
    warnings.push(packValue.warning);
  const properties = { ...packValue.properties ?? {} };
  const propertyPatch = {};
  const stylePatch = {};
  const setProperty = (key, value) => {
    const current = properties[key];
    const wrapped = current && typeof current === "object" && !Array.isArray(current) ? { ...current, value } : { value };
    properties[key] = wrapped;
    propertyPatch[key] = wrapped;
  };
  const stylesValue = normalizedSections.styles.value ?? {};
  let stylesChanged = false;
  const setStyle = (key, value) => {
    const current = stylesValue[key];
    stylesValue[key] = current && typeof current === "object" && !Array.isArray(current) ? { ...current, value } : { value };
    stylePatch[key] = stylesValue[key];
    normalizedSections.styles.value = stylesValue;
  };
  const schema = getComponentSchema(component.type);
  const knownPropertyKeys = schema ? new Set(schema.properties.map((entry) => entry.key)) : void 0;
  const knownStyleKeys = schema ? new Set(schema.styles.map((entry) => entry.key)) : void 0;
  const aliasTargetFor = (key) => {
    if (knownPropertyKeys?.has(key))
      return void 0;
    const target = PROPERTY_KEY_ALIASES[key.toLowerCase()];
    if (!target)
      return void 0;
    if (!schema)
      return target;
    return knownStyleKeys.has(target) || knownPropertyKeys.has(target) ? target : void 0;
  };
  for (const key of Object.keys(properties)) {
    const aliasTarget = aliasTargetFor(key);
    const canonical2 = aliasTarget ?? key;
    const belongsInStyles = canonical2 !== "styles" && (isMisplacedStyleKey(component.type, canonical2) || !!aliasTarget && !!knownStyleKeys?.has(canonical2) && !knownPropertyKeys?.has(canonical2));
    if (!aliasTarget && !belongsInStyles)
      continue;
    if (belongsInStyles) {
      if (stylesValue[canonical2] === void 0)
        stylesValue[canonical2] = properties[key];
      delete properties[key];
      stylesChanged = true;
      warnings.push(`${component.type} "${component.name}": moved ${aliasTarget ? `alias "${key}"` : `style key "${key}"`} to styles.${canonical2} (ToolJet reads it from styles, not properties).`);
    } else if (canonical2 !== key) {
      if (properties[canonical2] === void 0)
        properties[canonical2] = properties[key];
      delete properties[key];
      warnings.push(`${component.type} "${component.name}": renamed alias "${key}" to "${canonical2}".`);
    }
  }
  if (schema && options.stripUnknownKeys) {
    for (const key of Object.keys(stylesValue)) {
      if (knownStyleKeys.has(key) || !knownPropertyKeys.has(key))
        continue;
      if (properties[key] === void 0) {
        properties[key] = stylesValue[key];
        propertyPatch[key] = stylesValue[key];
      }
      delete stylesValue[key];
      stylesChanged = true;
      warnings.push(`${component.type} "${component.name}": moved styles.${key} to properties.${key} (ToolJet reads it from properties for ${component.type}).`);
    }
  }
  if (stylesChanged)
    normalizedSections.styles.value = stylesValue;
  if (options.stripUnknownKeys && component.type === "NumberInput") {
    for (const key of ["minValue", "maxValue"]) {
      const value = propValue(properties, key);
      if (value == null || typeof value === "string" && !value.trim())
        continue;
      const validation = normalizedSections.validation.value ?? {};
      const current = propValue(validation, key);
      if (validation[key] !== void 0 && current !== value)
        continue;
      validation[key] = properties[key];
      normalizedSections.validation.value = validation;
      normalizedSections.validation.patch = { ...normalizedSections.validation.patch, [key]: validation[key] };
      delete properties[key];
      warnings.push(`NumberInput "${component.name}": moved properties.${key} to validation.${key}, where the renderer reads the bound.`);
    }
  }
  for (const key of CLIENT_SERVER_BOOLEAN_KEYS) {
    const current = propValue(properties, key);
    if (current !== "clientSide" && current !== "serverSide")
      continue;
    setProperty(key, current === "serverSide");
    warnings.push(`${component.name} "${key}": normalized ${JSON.stringify(current)} to a boolean ToolJet binding.`);
  }
  if (component.type === "FlexContainer") {
    const card = propValue(properties, "cardStyle");
    if (card === "shadcnCard" && !isTruthy(propValue(properties, "dynamicHeight"))) {
      setProperty("dynamicHeight", "{{true}}");
    }
  }
  if (component.type === "Table") {
    const lookEntry0 = stylesValue.tableLook;
    const look0 = lookEntry0 && typeof lookEntry0 === "object" ? lookEntry0.value : lookEntry0;
    const height = (component.layouts?.desktop ?? component.layout)?.height;
    const staticNumber = (v) => {
      const m = typeof v === "number" ? String(v) : typeof v === "string" ? /^\s*(?:\{\{\s*)?(\d+)\s*(?:\}\})?\s*$/.exec(v)?.[1] : void 0;
      return m !== void 0 ? Number(m) : void 0;
    };
    const isFalse = (v) => v === false || typeof v === "string" && /^\s*(\{\{\s*)?false(\s*\}\})?\s*$/.test(v);
    if (look0 === "shadcn" && properties.dynamicHeight === void 0) {
      setProperty("dynamicHeight", "{{true}}");
    }
    if (look0 === "shadcn" && typeof height === "number" && !isTruthy(propValue(properties, "dynamicHeight")) && !isTruthy(propValue(properties, "serverSidePagination")) && !isFalse(propValue(properties, "enablePagination"))) {
      const rowsPerPage = staticNumber(propValue(properties, "rowsPerPage")) ?? 10;
      const toolbar = isFalse(propValue(properties, "displaySearchBox")) ? 0 : 64;
      const cellEntry = stylesValue.cellSize;
      const cellSize = cellEntry && typeof cellEntry === "object" ? cellEntry.value : cellEntry;
      const rowPx = cellSize === "condensed" ? 40 : 46;
      const fit = Math.floor((height - toolbar - 41 - 47) / rowPx);
      if (fit < rowsPerPage) {
        if (fit >= 3) {
          setProperty("rowsPerPage", `{{${fit}}}`);
          warnings.push(`Table "${component.name}": height ${height}px fits ${fit} rows; rowsPerPage is now ${fit} so no row is cut off.`);
        } else {
          setProperty("dynamicHeight", "{{true}}");
          warnings.push(`Table "${component.name}": height ${height}px fits fewer than 3 rows; dynamicHeight is on so the table fits its rows.`);
        }
      }
    }
    if (look0 === "shadcn" && properties.highlightSelectedRow === void 0 && !isTruthy(propValue(properties, "showBulkSelector")) && !isFalse(propValue(properties, "allowSelection"))) {
      setProperty("highlightSelectedRow", "{{true}}");
    }
    if (properties.useDynamicColumn === void 0) {
      setProperty("useDynamicColumn", catalogDefault("Table", "useDynamicColumn", "{{false}}"));
    }
    if (properties.columnData === void 0) {
      setProperty("columnData", catalogDefault("Table", "columnData", "{{[{name: 'email', key: 'email', id: '1'}, {name: 'Full name', key: 'name', id: '2', isEditable: true}]}}"));
    }
    const columns = propValue(properties, "columns");
    const dynamicColumns = isTruthy(propValue(properties, "useDynamicColumn"));
    const autogenerateColumns = propValue(properties, "autogenerateColumns");
    if (options.stripUnknownKeys && columns === void 0 && !dynamicColumns && isTruthy(autogenerateColumns) && typeof propValue(properties, "data") === "string" && /\bqueries(?:\.|\[)/.test(String(propValue(properties, "data")))) {
      setProperty("columns", []);
    }
    if (Array.isArray(columns) && !dynamicColumns && !isTruthy(autogenerateColumns)) {
      setProperty("autogenerateColumns", true);
      if (autogenerateColumns !== void 0) {
        warnings.push(`Table "${component.name}": normalized autogenerateColumns from false to true for runtime compatibility. Some ToolJet Table versions crash while generating transformations for explicit static columns when it is false. Project the data binding to intended keys and declare behavior-only keys with columnVisibility:false.`);
      }
    }
    if (Array.isArray(columns)) {
      const lookEntry = stylesValue.tableLook;
      const shadcnLook = (lookEntry && typeof lookEntry === "object" ? lookEntry.value : lookEntry) === "shadcn";
      const wrapNow = stylesValue.contentWrap?.value ?? stylesValue.contentWrap;
      const multiLine = columns.some((c) => c && typeof c === "object" && !Array.isArray(c) && c.columnVisibility !== false && ["html", "text", "json", "image", "markdown"].includes(String(c.columnType)));
      if (shadcnLook && multiLine && wrapNow === false)
        setStyle("contentWrap", true);
      else if (shadcnLook && !multiLine && wrapNow !== false)
        setStyle("contentWrap", false);
      let changedColumns = false;
      const repairedColumns = columns.map((column) => {
        if (options.stripUnknownKeys && column && typeof column === "object" && !Array.isArray(column) && column.columnType === "button" && Array.isArray(column.buttons)) {
          const buttons = column.buttons.map((button) => {
            if (!button || typeof button !== "object" || Array.isArray(button))
              return button;
            const b = button;
            if (typeof b.label !== "string" || b.buttonLabel !== void 0)
              return button;
            const { label, ...rest } = b;
            changedColumns = true;
            warnings.push(`Table "${component.name}" action "${b.id}": moved label to buttonLabel, where the renderer reads the caption.`);
            return { ...rest, buttonLabel: label };
          });
          column = { ...column, buttons };
        }
        if (column && typeof column === "object" && !Array.isArray(column) && column.columnType === "datepicker" && column.isDateSelectionEnabled === false && column.isTimeChecked !== true) {
          changedColumns = true;
          const entry = column;
          warnings.push(`Table "${component.name}" date column "${entry.name ?? entry.key}": enabled date selection \u2014 a datepicker column with both date selection and time disabled renders blank regardless of the data.`);
          return { ...entry, isDateSelectionEnabled: true };
        }
        if (shadcnLook && column && typeof column === "object" && !Array.isArray(column) && column.columnType === "datepicker" && !isTruthy(column.isEditable) && /^Y{4}[-/]MM[-/]DD$/.test(String(column.dateFormat ?? "").trim())) {
          changedColumns = true;
          const entry = column;
          column = { ...entry, parseDateFormat: entry.parseDateFormat ?? entry.dateFormat, dateFormat: "MMM D, YYYY" };
        }
        if (column && typeof column === "object" && !Array.isArray(column) && column.columnType === "newMultiSelect" && !isTruthy(column.isEditable) && /^(status|severity|priority|stage|state|level|risk)$/i.test(String(column.key ?? column.name ?? "").replace(/[_\s-]+/g, ""))) {
          changedColumns = true;
          const entry = column;
          warnings.push(`Table "${component.name}" column "${entry.name ?? entry.key}": a single state per row; columnType is now "select" (a multi-select shows "Select.." for a single value).`);
          column = { ...entry, columnType: "select" };
        }
        if (shadcnLook && column && typeof column === "object" && !Array.isArray(column) && column.columnType === "number" && (column.horizontalAlignment === void 0 || column.thousandSeparator === void 0)) {
          changedColumns = true;
          const entry = column;
          column = {
            ...entry,
            horizontalAlignment: entry.horizontalAlignment ?? "right",
            thousandSeparator: entry.thousandSeparator ?? true
          };
        }
        if (shadcnLook && column && typeof column === "object" && !Array.isArray(column)) {
          const entry = column;
          const words2 = `${String(entry.key ?? "")} ${String(entry.name ?? "")}`.replace(/[_-]+/g, " ");
          const next = { ...entry };
          if (entry.columnType === "number" && entry.decimalPlaces === void 0 && MONEY_WORDS.test(words2) && !UNIT_WORDS.test(words2)) {
            next.decimalPlaces = 2;
          }
          if (["string", void 0].includes(entry.columnType) && entry.displayAsChip === void 0 && !isTruthy(entry.isEditable) && STATE_WORDS.test(words2)) {
            next.displayAsChip = true;
          }
          const size = Number(entry.columnSize);
          const label = String(entry.name ?? entry.key ?? "");
          if (Number.isFinite(size) && size > 0 && label) {
            const email = /\be ?mail\b/i.test(words2) ? 240 : 0;
            const chip = next.displayAsChip === true || entry.displayAsChip === true ? 140 : 0;
            const needed = Math.max(email, chip, Math.ceil(label.length * 7.5) + 32 + (isTruthy(entry.isEditable) ? 18 : 0));
            if (size < needed)
              next.columnSize = needed;
          }
          if (entry.columnType === "button" && Array.isArray(entry.buttons)) {
            const buttons = entry.buttons.map((button) => {
              if (!button || typeof button !== "object" || Array.isArray(button))
                return button;
              const b = button;
              const bg = b.buttonBackgroundColor;
              const defaultBg = bg === void 0 || ["#4368E3", "#4368e3", "var(--cc-primary-brand)"].includes(String(bg));
              return (b.buttonType === void 0 || b.buttonType === "solid") && defaultBg ? { ...b, buttonType: "outline" } : button;
            });
            if (buttons.some((b, i) => b !== entry.buttons[i]))
              next.buttons = buttons;
          }
          if (Object.keys(next).some((k) => next[k] !== entry[k])) {
            changedColumns = true;
            column = next;
          }
        }
        return column;
      });
      if (shadcnLook) {
        const visible = repairedColumns.filter((c) => !!c && typeof c === "object" && !Array.isArray(c) && c.columnVisibility !== false);
        const width = (c) => Number(c.columnSize) > 0 ? Number(c.columnSize) : 120;
        const total = visible.reduce((sum, c) => sum + width(c), 0);
        if (visible.length > 1 && total > 1240) {
          const factor = 1240 / total;
          const floor = (c) => c.columnType === "button" ? 110 : Math.max(/\be ?mail\b/i.test(`${String(c.key ?? "")} ${String(c.name ?? "")}`.replace(/[_-]+/g, " ")) ? 240 : 64, Math.ceil(String(c.name ?? c.key ?? "").length * 7.5) + 32);
          for (let i = 0; i < repairedColumns.length; i++) {
            const c = repairedColumns[i];
            if (!visible.includes(c))
              continue;
            repairedColumns[i] = { ...c, columnSize: Math.max(floor(c), Math.floor(width(c) * factor)) };
          }
          changedColumns = true;
          warnings.push(`Table "${component.name}": its visible columns (${total}px) were wider than a page; they now scale to fit about 1240px.`);
        }
      }
      if (shadcnLook) {
        const index = repairedColumns.findIndex((c) => {
          if (!c || typeof c !== "object" || Array.isArray(c))
            return false;
          const entry2 = c;
          const words2 = `${String(entry2.key ?? "")} ${String(entry2.name ?? "")}`.replace(/[_-]+/g, " ");
          return entry2.columnVisibility !== false && ["string", void 0].includes(entry2.columnType) && PERSON_WORDS.test(words2) && !/\b(e ?mail|id|phone|count|type|notes?)\b/i.test(words2);
        });
        const entry = index >= 0 ? repairedColumns[index] : void 0;
        if (entry && entry.displayAvatar === void 0 && entry.displayAsChip === void 0 && !isTruthy(entry.isEditable)) {
          repairedColumns[index] = { ...entry, displayAvatar: true };
          changedColumns = true;
        }
      }
      if (changedColumns)
        setProperty("columns", repairedColumns);
    }
  }
  const statFormat = propValue(properties, "valueFormat");
  if (component.type === "ShadStat" && (statFormat === void 0 || statFormat === "auto")) {
    const label = String(propValue(properties, "label") ?? "");
    let value = propValue(properties, "value");
    const moneyLabel = MONEY_WORDS.test(label.replace(/[_-]+/g, " ")) && !countLabel(label.replace(/[_-]+/g, " "));
    const trailingFormat = /\.(?:toLocaleString\((?:[^()]|\([^()]*\))*\)|toFixed\(\s*\d*\s*\))\s*\}\}\s*$/;
    if (moneyLabel && typeof value === "string" && trailingFormat.test(value) && !/[$€£₹¥]|Intl\.|currency/i.test(value)) {
      value = value.replace(trailingFormat, "}}");
      setProperty("value", value);
    }
    if (typeof value === "string" && /^\s*\{\{[\s\S]*\}\}\s*$/.test(value) && !/[$€£₹¥]|toLocaleString|toFixed|Intl\.|currency/i.test(value) && moneyLabel) {
      setProperty("valueFormat", "currency");
      if (options.currency && propValue(properties, "currency") === void 0)
        setProperty("currency", options.currency);
    }
  }
  if (component.type === "KeyValuePair") {
    const fields = propValue(properties, "fields");
    if (Array.isArray(fields) && fields.length > 0) {
      const explicitIds = new Set(fields.flatMap((field) => {
        const id = field && typeof field === "object" ? field.id : void 0;
        return typeof id === "string" && id.length > 0 ? [id] : [];
      }));
      const demoFields = catalogDefault("KeyValuePair", "fields", []);
      const currentHistory = propValue(properties, "fieldDeletionHistory");
      const deletionHistory = new Set(Array.isArray(currentHistory) ? currentHistory.filter((key) => typeof key === "string" && key.length > 0) : []);
      const before = deletionHistory.size;
      if (Array.isArray(demoFields)) {
        for (const field of demoFields) {
          if (!field || typeof field !== "object")
            continue;
          const { id, key } = field;
          if (typeof key === "string" && !explicitIds.has(String(id ?? "")))
            deletionHistory.add(key);
        }
      }
      if (deletionHistory.size > before || properties.fieldDeletionHistory === void 0) {
        setProperty("fieldDeletionHistory", [...deletionHistory]);
        warnings.push(`KeyValuePair "${component.name}": normalized fieldDeletionHistory so ToolJet does not append or positionally merge catalog demo fields into the explicit fields array.`);
      }
    }
  }
  if (component.type === "Statistics") {
    const width = (component.layouts?.desktop ?? component.layout)?.width;
    const iconName = propValue(properties, "icon");
    const iconVisible = typeof iconName === "string" && iconName.trim() !== "" && propValue(properties, "iconVisibility") !== false && propValue(properties, "iconVisibility") !== "{{false}}";
    const rawSize = propValue(stylesValue, "primaryValueSize") ?? propValue(properties, "primaryValueSize");
    const sizeText = typeof rawSize === "string" ? rawSize.replace(/[{}]/g, "").trim() : rawSize;
    const numericSize = typeof sizeText === "number" ? sizeText : typeof sizeText === "string" && /^\d+$/.test(sizeText) ? Number(sizeText) : void 0;
    const rawValue = propValue(properties, "primaryValue");
    const currencyValue = typeof rawValue === "string" && /minimumFractionDigits|style\s*:\s*['"]currency['"]|[$£€¥]/.test(rawValue);
    const widthKnown = typeof width === "number";
    const narrowTile = widthKnown && width < STATISTICS_ICON_VALUE_MIN_SAFE_WIDTH_COLS;
    const clipProne = iconVisible && narrowTile || currencyValue && (narrowTile || !widthKnown);
    if (isTruthy(propValue(properties, "hideSecondary")) && (numericSize === void 0 || numericSize > 22) && clipProne) {
      setStyle("primaryValueSize", "{{22}}");
      warnings.push(`Statistics "${component.name}": set styles.primaryValueSize to 22 so the ${currencyValue ? "currency " : ""}value fits a value-only tile${widthKnown ? ` (${width} columns wide)` : ""} (larger sizes clip or wrap the value).`);
    }
  }
  if (options.stripUnknownKeys) {
    const schema2 = getComponentSchema(component.type);
    if (schema2) {
      const sections = [
        ["properties", properties],
        ["styles", normalizedSections.styles.value]
      ];
      for (const [section, sectionValue] of sections) {
        if (!sectionValue)
          continue;
        const knownKeys = (schema2[section] ?? []).map((entry) => entry.key);
        for (const key of Object.keys(sectionValue)) {
          if (!isStrippableUnknownKey(component.type, section, key, knownKeys))
            continue;
          delete sectionValue[key];
          warnings.push(`${component.type} "${component.name}": removed unknown ${section} key "${key}" \u2014 ToolJet ignores it, so it is kept out of the saved definition rather than persisted as an unusable key.`);
        }
      }
    }
  }
  const braceFixedKeys = [];
  for (const key of Object.keys(properties)) {
    const result = separateAdjacentClosingBracesDeep(propValue(properties, key));
    if (!result.changed)
      continue;
    setProperty(key, result.value);
    braceFixedKeys.push(`properties.${key}`);
  }
  for (const key of Object.keys(stylesValue)) {
    const result = separateAdjacentClosingBracesDeep(propValue(stylesValue, key));
    if (!result.changed)
      continue;
    setStyle(key, result.value);
    braceFixedKeys.push(`styles.${key}`);
  }
  if (braceFixedKeys.length) {
    warnings.push(`${component.type} "${component.name}": separated adjacent closing braces inside ${braceFixedKeys.join(", ")} (ToolJet ends a {{ }} expression at the first "}}", which would have left the component blank). Write nested closes as "} }" inside bindings.`);
  }
  const booleanKeys = /* @__PURE__ */ new Set(["loadingState", "visibility", "disabledState"]);
  for (const entry of schema?.properties ?? [])
    if (entry.valueType === "boolean")
      booleanKeys.add(entry.key);
  const BARE_EXPRESSION = /^\s*!?\s*\(?\s*(queries|components|variables|globals|page|constants|parameters)\.[\w$]/;
  const wrappedKeys = [];
  for (const key of booleanKeys) {
    const current = propValue(properties, key);
    if (typeof current !== "string" || current.includes("{{") || !BARE_EXPRESSION.test(current))
      continue;
    const entry = properties[key];
    const wrapped = { ...entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {}, value: `{{${current.trim()}}}`, fxActive: true };
    properties[key] = wrapped;
    propertyPatch[key] = wrapped;
    wrappedKeys.push(key);
  }
  if (wrappedKeys.length) {
    warnings.push(`${component.type} "${component.name}": wrapped the bare expression in ${wrappedKeys.map((k) => `properties.${k}`).join(", ")} in {{ }}; without the braces ToolJet reads it as text, which counts as true (a table stays on its loading spinner).`);
  }
  const CODE_START = /^\s*(?:String|Number|Math|moment|Intl|JSON|Object|Array)\s*[.(]|^\s*[([!]|^\s*(?:queries|components|variables|globals|page|constants|parameters)\.[\w$]/;
  const CODE_ROOT = /\b(?:queries|components|variables|globals|constants|parameters)\.[\w$]/;
  const CODE_OPERATOR = /=>|\|\||&&|===|!==|\.length\b|\.(?:filter|map|reduce|toFixed|toLocaleString|find|some)\s*\(/;
  const codeKeys = [];
  const showsCode = /CodeEditor|Html|Markdown|RichText|Json/i.test(component.type ?? "");
  for (const [key, entry] of Object.entries(showsCode ? {} : properties)) {
    if (booleanKeys.has(key))
      continue;
    const current = propValue(properties, key);
    if (typeof current !== "string" || current.includes("{{") || current.length > 2e3)
      continue;
    if (!CODE_START.test(current) || !CODE_ROOT.test(current) || !CODE_OPERATOR.test(current))
      continue;
    const wrapped = { ...entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {}, value: `{{${current.trim()}}}` };
    properties[key] = wrapped;
    propertyPatch[key] = wrapped;
    codeKeys.push(key);
  }
  if (codeKeys.length) {
    warnings.push(`${component.type} "${component.name}": ${codeKeys.map((k) => `properties.${k}`).join(", ")} held a JavaScript expression without {{ }}, which shows the code on screen; it is now wrapped in {{ }}.`);
  }
  const patch = Object.fromEntries(["properties", "styles", "validation", "others"].flatMap((section) => {
    const envelopePatch = normalizedSections[section].patch ?? {};
    const semanticPatch = section === "properties" ? propertyPatch : section === "styles" ? stylePatch : {};
    const merged = { ...envelopePatch, ...semanticPatch };
    return Object.keys(merged).length ? [[section, merged]] : [];
  }));
  return {
    component: {
      ...component,
      properties,
      ...normalizedSections.styles.value ? { styles: normalizedSections.styles.value } : {},
      ...normalizedSections.validation.value ? { validation: normalizedSections.validation.value } : {},
      ...normalizedSections.others.value ? { others: normalizedSections.others.value } : {}
    },
    patch,
    warnings
  };
}
createRequire(import.meta.url);
var DEFINITION_SECTIONS = ["properties", "styles", "validation", "general", "general_styles", "others"];
var definitionSchema = strictEntry({
  properties: external_exports.record(external_exports.string(), external_exports.any()).optional(),
  styles: external_exports.record(external_exports.string(), external_exports.any()).optional(),
  validation: external_exports.record(external_exports.string(), external_exports.any()).optional(),
  general: external_exports.record(external_exports.string(), external_exports.any()).optional(),
  general_styles: external_exports.record(external_exports.string(), external_exports.any()).optional(),
  others: external_exports.record(external_exports.string(), external_exports.any()).optional()
}, (key) => key === "layout" || key === "layouts" ? `definition."${key}" is not a component definition section; move/resize with update_layout instead.` : `definition."${key}" is not a component definition section; use one of ${DEFINITION_SECTIONS.join("/")}.`);
var updateSchema = strictEntry({
  component_id: external_exports.string(),
  definition: definitionSchema.optional(),
  name: componentNameSchema.optional(),
  parent: external_exports.string().optional(),
  slot_name: componentSlotSchema.optional()
}, (key) => {
  if (DEFINITION_SECTIONS.includes(key)) {
    return `Update entry key "${key}" must be nested under \`definition\` (e.g. { component_id, definition: { ${key}: {...} } }); top-level ${key} would write nothing.`;
  }
  if (key === "layout" || key === "layouts") {
    return `Update entry key "${key}" is not accepted by update_components; move/resize with update_layout instead.`;
  }
  return `Unknown update entry key "${key}"; accepted keys are component_id, definition, name, parent, slot_name.`;
});
function updateComponentsTool(client) {
  return {
    name: "update_components",
    title: "Update Components",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false
    },
    description: "Edit existing components IN PLACE instead of deleting + re-adding. Send only the CHANGED leaves under `definition` (properties/styles/validation/others) \u2014 ToolJet deep-merges, so untouched values are preserved. Leaves may be raw values or `{ value: ... }` envelopes; MCP canonicalizes them. " + COMPONENT_FX_UPDATE_GUIDANCE + "NOTE: array values (Table `columns`, DropdownV2 `options`/`schema`) are REPLACED wholesale, so send the full array. Set EITHER `definition` OR name/parent/slot_name per entry, not both. `slot_name` accepts header/body/footer and can move a child between native ModalV2/Form/Container regions, or modal for Kanban card-click content; omit parent to keep the current parent. Unknown entry keys are rejected (a top-level properties/styles patch is an error, not a silent no-op), and an entry that changes nothing fails. Get component ids + current values from get_app_summary / get_component. To reorder a FlexContainer, set its properties.childOrder to the child names or ids in the wanted order; unlisted children follow in their current order.",
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string(),
      page_id: external_exports.string(),
      updates: external_exports.array(updateSchema).min(1)
    },
    async handler(args) {
      try {
        const summary = await client.getAppSummary(args.app_id);
        const page = summary.pages.find((candidate) => candidate.id === args.page_id);
        if (!page)
          return fail(new Error(`Page "${args.page_id}" does not exist in app "${args.app_id}".`));
        const projected = new Map(page.components.map((component) => [component.id, component]));
        const warnings = [];
        const errors = [];
        const changedComponents = [];
        let placementChanged = false;
        const layoutFixes = [];
        const batchProperties = /* @__PURE__ */ new Map();
        for (const update of args.updates) {
          const properties = update.definition?.properties;
          if (!properties)
            continue;
          const target = resolveRef(page.components, update.component_id, "Component", "");
          if (!target.ok)
            continue;
          const id = target.target.id;
          batchProperties.set(id, { ...batchProperties.get(id) ?? target.target.properties ?? {}, ...properties });
        }
        const resolvedUpdates = [];
        for (const update of args.updates) {
          if (update.name !== void 0) {
            const nameError = componentNameError(update.name);
            if (nameError) {
              errors.push(`Component "${update.component_id}": ${nameError}`);
              continue;
            }
          }
          const resolution = resolveRef(page.components, update.component_id, "Component", `on page "${args.page_id}"`);
          if (!resolution.ok) {
            errors.push(resolution.error);
            continue;
          }
          if (resolution.warning)
            warnings.push(resolution.warning);
          const current = resolution.target;
          const componentId = current.id;
          if (update.definition && (update.name !== void 0 || update.parent !== void 0 || update.slot_name !== void 0)) {
            errors.push(`Component "${update.component_id}": set EITHER definition OR name/parent/slot_name in one entry.`);
            continue;
          }
          if (!hasNonEmptyDefinition(update.definition) && update.name === void 0 && update.parent === void 0 && update.slot_name === void 0) {
            errors.push(`Component "${update.component_id}": nothing to update. Send the changed leaves under definition (properties/styles/validation/others) or a name/parent/slot_name change.`);
            continue;
          }
          let parent = update.parent;
          if (typeof parent === "string" && parent) {
            const resolvedParent = resolveParentRef(page.components, parent);
            const entry = { parent, slot_name: update.slot_name };
            const parentError = resolvedParent.ok ? applyResolvedParent(entry, resolvedParent) : resolvedParent.error;
            if (parentError) {
              errors.push(`Component "${update.component_id}": ${parentError}`);
              continue;
            }
            parent = entry.parent;
            update.slot_name = entry.slot_name;
          }
          let slotName = update.slot_name;
          if (slotName !== void 0) {
            parent ??= current.parent ? decodeComponentParent(current.parent).parentId : void 0;
            if (!parent) {
              if (slotName === "body") {
                warnings.push(`Component "${update.component_id}": slot_name:"body" ignored on a root component (it has no parent slots).`);
                slotName = void 0;
              } else {
                errors.push(`Component "${update.component_id}": slot_name:"${slotName}" requires an existing or explicit parent.`);
                continue;
              }
            }
          }
          let parentType;
          if (parent) {
            const decoded = decodeComponentParent(parent);
            const parentComponent = page.components.find((component) => component.id === decoded.parentId);
            if (parentComponent && isPackContainerType(parentComponent.type)) {
              const named = slotName ?? (parent !== decoded.parentId ? decoded.slotName : void 0);
              const slot = resolvePackSlot({ ...parentComponent, properties: batchProperties.get(parentComponent.id) ?? parentComponent.properties }, named, current.name ?? current.id);
              if (!slot.ok) {
                errors.push(slot.error);
                continue;
              }
              parent = decoded.parentId;
              slotName = slot.slotName;
              parentType = parentComponent.type;
            }
          }
          const authoredOrder = update.definition?.properties?.childOrder;
          if (authoredOrder !== void 0 && isFlexContainerType(current.type)) {
            const raw = authoredOrder;
            const value = Array.isArray(raw) ? raw : raw?.value;
            if (!Array.isArray(value)) {
              errors.push(`FlexContainer "${current.name ?? current.id}": properties.childOrder must be an array of child component ids or names.`);
              continue;
            }
            const resolved = resolveAuthoredChildOrder(current, page.components, value);
            if (resolved.unknown.length) {
              errors.push(`FlexContainer "${current.name ?? current.id}": childOrder names ${resolved.unknown.map((ref2) => `"${ref2}"`).join(", ")}, which are not children of this container. List its child component ids or names.`);
              continue;
            }
            update.definition = {
              ...update.definition,
              properties: { ...update.definition.properties, childOrder: childOrderProperty(resolved.order) }
            };
          }
          const packValue = packValueAsDefault(current.type, current.name ?? current.id, update.definition?.properties);
          if (packValue.warning) {
            warnings.push(packValue.warning);
            update.definition = { ...update.definition, properties: packValue.properties };
          }
          const definition2 = update.definition;
          const next = {
            id: current.id,
            name: update.name ?? current.name ?? current.id,
            type: current.type,
            properties: { ...current.properties ?? {}, ...definition2?.properties ?? {} },
            styles: { ...current.styles ?? {}, ...definition2?.styles ?? {} },
            layouts: current.layouts,
            parent: parent !== void 0 ? encodeComponentParent(parent, slotName, parentType) : current.parent,
            slotName
          };
          const normalized = normalizeComponentSpec({
            name: next.name ?? current.id,
            type: next.type ?? current.type ?? "",
            properties: next.properties ?? {},
            styles: next.styles,
            validation: definition2?.validation,
            others: { ...current.others ?? {}, ...definition2?.others ?? {} },
            layouts: next.layouts,
            parent: next.parent
          });
          const normalizedNext = { ...normalized.component, id: current.id };
          const heightFix = update.definition ? suggestedHtmlHeight(normalizedNext) : null;
          const desktopRect2 = current.layouts?.desktop;
          if (heightFix && desktopRect2 && typeof desktopRect2.top === "number") {
            normalizedNext.layouts = { ...normalizedNext.layouts ?? {}, desktop: { ...desktopRect2, height: heightFix.to } };
            layoutFixes.push({ componentId: current.id, desktop: { ...desktopRect2, height: heightFix.to } });
            warnings.push(`Html "${normalizedNext.name ?? current.id}" needed about ${heightFix.needed}px for its new markup but was ${heightFix.from}px; its height is now ${heightFix.to}px. Anything within ${heightFix.to - heightFix.from}px below it now overlaps; move it down.`);
          }
          projected.set(current.id, normalizedNext);
          if (update.definition)
            changedComponents.push({ before: current, after: normalizedNext });
          placementChanged ||= update.parent !== void 0 || update.slot_name !== void 0;
          warnings.push(...onlyTouchedBraceNotes(normalized.warnings, definition2));
          let normalizedDefinition = update.definition;
          if (update.definition && Object.keys(normalized.patch).length) {
            normalizedDefinition = { ...update.definition };
            for (const section of ["properties", "styles", "validation", "others"]) {
              const sectionPatch = normalized.patch[section];
              if (!sectionPatch)
                continue;
              normalizedDefinition[section] = {
                ...update.definition[section] ?? {},
                ...sectionPatch
              };
            }
          }
          resolvedUpdates.push({
            componentId,
            definition: normalizedDefinition,
            name: update.name,
            parent: parentType && parent !== void 0 ? encodeComponentParent(parent, slotName, parentType) : parent,
            slotName: parentType ? void 0 : update.slot_name
          });
          if (!update.definition)
            continue;
          errors.push(...introducedLintFindings(lintComponentSpec(current).errors, lintComponentSpec(normalizedNext).errors));
          warnings.push(...introducedLintFindings(lintComponentSpec(current).warnings, lintComponentSpec(normalizedNext).warnings));
        }
        const allComponents = [...projected.values()];
        const introducedForChanged = (lint2) => changedComponents.flatMap(({ before, after }) => introducedLintFindings(lint2([before]), lint2([after])));
        const parents = new Set(page.components.map((component) => component.parent).filter(Boolean));
        const hasChildren = (id) => typeof id === "string" && [...parents].some((parent) => parent === id || parent.startsWith(`${id}-`));
        if (placementChanged || changedComponents.some(({ before }) => hasChildren(before.id))) {
          errors.push(...introducedLintFindings(lintComponentSlots(page.components), lintComponentSlots(allComponents), slotFindingKey));
        }
        errors.push(...introducedForChanged(lintUnusableTextGeometry));
        if (errors.length)
          return fail(new Error(`${errors.join(" ")} (Nothing was saved: refused before any write.)`));
        warnings.push(...introducedForChanged((items) => items.flatMap(lintStandardSingleLineInputHeight)));
        warnings.push(...introducedForChanged(lintTextGeometry));
        warnings.push(...lintRenderedGeometry(allComponents));
        warnings.push(...lintKanbanInteractions(allComponents));
        warnings.push(...lintShadKanbanCards(allComponents));
        warnings.push(...lintShadScheduleScale(allComponents));
        const result = await client.updateComponents({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          updates: resolvedUpdates
        });
        if (layoutFixes.length) {
          await client.updateLayouts({ appId: args.app_id, versionId: args.version_id, pageId: args.page_id, layouts: layoutFixes });
        }
        const appended = appendedChildOrders(page.components, reparentAdditions(page.components, resolvedUpdates.map((update) => ({
          componentId: update.componentId,
          parent: update.parent !== void 0 ? encodeComponentParent(update.parent, update.slotName, update.parentType) : void 0
        }))));
        if (appended.size) {
          await client.updateComponents({
            appId: args.app_id,
            versionId: args.version_id,
            pageId: args.page_id,
            updates: [...appended].map(([componentId, order]) => ({
              componentId,
              definition: { properties: { childOrder: childOrderProperty(order) } }
            }))
          });
        }
        return ok({ ...result, warnings: [...new Set(warnings)] });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function onlyTouchedBraceNotes(warnings, definition2) {
  const touched = /* @__PURE__ */ new Set([
    ...Object.keys(definition2?.properties ?? {}).map((key) => `properties.${key}`),
    ...Object.keys(definition2?.styles ?? {}).map((key) => `styles.${key}`)
  ]);
  return warnings.flatMap((warning) => {
    const m = /^(.*?: separated adjacent closing braces inside )(.+?)( \(ToolJet ends.*)$/s.exec(warning);
    if (!m)
      return [warning];
    const keys = m[2].split(", ").filter((key) => touched.has(key));
    return keys.length ? [`${m[1]}${keys.join(", ")}${m[3]}`] : [];
  });
}
createRequire(import.meta.url);
async function mapKeyRefusal(client, componentTypes, library) {
  if (![...componentTypes].includes("Map") || typeof client?.hasGoogleMapsKey !== "function")
    return void 0;
  let hasKey;
  try {
    hasKey = await client.hasGoogleMapsKey();
  } catch {
    return void 0;
  }
  if (hasKey !== false)
    return void 0;
  const noKey = "This ToolJet instance has no Google Maps API key (GOOGLE_MAPS_API_KEY), so a Map component shows a Google error instead of a map.";
  const ui2Map = "Use ShadMap, the ToolJet UI 2.0 Map: OpenStreetMap tiles, no key, one marker per data row read through latField, lngField and idField, with onMarkerClick and selectedMarker.";
  if (library === "ui2")
    return `${noKey} ${ui2Map}`;
  return `${noKey} In a ToolJet UI 2.0 app: ${ui2Map} In a UI 1.0 app, show the locations in a Table (a link column to https://www.google.com/maps?q=<lat>,<lng> opens each one), and tell the user in your reply that an in-app map needs the Google Maps API key on the instance.`;
}
createRequire(import.meta.url);
var CATALOG_SECTIONS = [
  "overview",
  "properties",
  "styles",
  "events",
  "actions",
  "exposedVariables",
  "defaultChildren",
  "renderingHints",
  "authoringHints"
];
var DEFAULT_TYPED_SECTIONS = [
  "overview",
  "properties",
  "events",
  "actions"
];
var CATALOG_TYPE_ALIASES = /* @__PURE__ */ new Map([
  ["gridview", {
    type: "Listview",
    note: 'ToolJet grid view is Listview with mode:"grid" (properties.mode.value); use type:"Listview" when creating it.'
  }]
]);
function resolveCatalogType(requestedType) {
  const alias = CATALOG_TYPE_ALIASES.get(requestedType.replace(/[\s_-]+/g, "").toLowerCase());
  if (alias)
    return { type: alias.type, alias: { requested_type: requestedType, note: alias.note } };
  if (getComponentSchema(requestedType))
    return { type: requestedType };
  const wanted = requestedType.replace(/[\s_-]+/g, "").toLowerCase();
  const types = getCatalog().map((entry) => entry.type);
  const near = types.find((type) => type.toLowerCase() === wanted) ?? types.find((type) => type.toLowerCase().replace(/v\d+$/, "") === wanted);
  return near ? { type: near, alias: { requested_type: requestedType, note: `There is no "${requestedType}"; this is ${near}. Use type "${near}".` } } : { type: requestedType };
}
var PACK_CONCEPTS = [
  [/table|grid|datatable/i, ["ShadTable"]],
  [/metric|stat|kpi/i, ["ShadStat", "ShadSparkline", "ShadSummaryStrip"]],
  [/summary|figures|totals|strip|headline/i, ["ShadSummaryStrip"]],
  [/recent|activity|feed|records?|orders|people|contacts|inbox/i, ["ShadRecordList"]],
  [/card|panel|surface/i, ['FlexContainer (cardStyle "shadcnCard")', "ShadCardGrid"]],
  [/gallery|tiles?|catalog|products?|cards|grid/i, ["ShadCardGrid"]],
  [/hero|header|masthead|jumbotron|cover|welcome/i, ["ShadHero"]],
  [/modal|dialog|sheet|drawer/i, ["ShadDialog"]],
  [/dropdown|menu/i, ["ShadDropdownMenu", "ShadSelect", "ShadCombobox"]],
  [/list/i, ["ShadListView", "ShadRecordList", "ShadKeyValue"]],
  [/chat|message|assistant|conversation|copilot|bot|thread/i, ["ShadChat"]],
  [/question|survey|quiz|onboarding|intake|wizard|poll|triage|form/i, ["ShadQuestionnaire"]],
  [/chart|graph/i, ["ShadBarChart", "ShadLineChart", "ShadAreaChart", "ShadPieChart", "ShadComboChart", "ShadScatterChart", "ShadFunnelChart", "ShadHeatmapChart"]],
  [/funnel|conversion/i, ["ShadFunnelChart"]],
  [/scatter|bubble|correlation/i, ["ShadScatterChart"]],
  [/heat|matrix|grid|calendar/i, ["ShadHeatmapChart"]],
  [/board|kanban|pipeline|stage|trello|dispatch|grouped by/i, ["ShadKanban"]],
  [/combo|composed|mixed|dual/i, ["ShadComboChart"]],
  [/label|title|typography/i, ["ShadHeading", "ShadText"]],
  [/date/i, ["ShadDatePicker", "ShadDateTimePicker", "ShadCalendar"]],
  [/toast|notification|banner/i, ["ShadAlert"]],
  [/divider/i, ["ShadSeparator"]],
  [/schedule|scheduler|booking|reservation|roster|rota|shift|on.?call|resource|timeline.?view|gantt|availability|rooms?/i, ["ShadSchedule"]],
  [/progress|goal|budget|quota|target|onboarding|checklist|capacity|completion/i, ["ShadProgressList", "ShadProgress"]],
  [/map|geo|location|pins?$|markers?|route|locator|spatial|leaflet|places|zones?$|territor|geofence|dispatch|fleet/i, ["ShadMap"]]
];
function packSuggestions(requestedType) {
  if (!/^Shad[A-Z]/.test(requestedType))
    return [];
  const rest = requestedType.slice(4);
  return [...new Set(PACK_CONCEPTS.filter(([pattern]) => pattern.test(rest)).flatMap(([, types]) => types))];
}
function nearbyTypes(requestedType) {
  const words2 = requestedType.split(/(?=[A-Z])|[\s_-]+/).map((word) => word.toLowerCase()).filter((word) => word.length >= 4);
  return getCatalog().map((entry) => entry.type).filter((type) => words2.some((word) => type.toLowerCase().includes(word))).slice(0, 6);
}
function selectEntries(entries, keys, detail) {
  const selected = keys?.length ? entries.filter((entry) => keys.includes(entry.key)) : entries;
  if (detail === "full" || keys?.length)
    return selected;
  return selected.map(({ key, valueType, valueTypes, allowedValues, requires, mutuallyExclusiveWith }) => ({
    key,
    ...valueType !== void 0 ? { valueType } : {},
    ...valueTypes !== void 0 ? { valueTypes } : {},
    ...allowedValues !== void 0 ? { allowedValues } : {},
    ...requires !== void 0 ? { requires } : {},
    ...mutuallyExclusiveWith !== void 0 ? { mutuallyExclusiveWith } : {}
  }));
}
function selectSchema(schema, args) {
  const detail = args.detail ?? "compact";
  const sections = new Set(args.sections ?? DEFAULT_TYPED_SECTIONS);
  const result = { type: schema.type };
  if (sections.has("overview")) {
    if (schema.name !== void 0)
      result.name = schema.name;
    if (schema.description !== void 0)
      result.description = schema.description;
    if (schema.defaultSize !== void 0)
      result.defaultSize = schema.defaultSize;
  }
  if (sections.has("properties")) {
    result.properties = selectEntries(schema.properties, args.property_keys, detail);
  }
  if (sections.has("styles")) {
    result.styles = selectEntries(schema.styles, args.style_keys, detail);
  }
  if (sections.has("events") && schema.events !== void 0)
    result.events = schema.events;
  if (sections.has("actions") && schema.actions !== void 0)
    result.actions = schema.actions;
  if (sections.has("exposedVariables") && schema.exposedVariables !== void 0) {
    result.exposedVariables = schema.exposedVariables;
  }
  if (sections.has("defaultChildren") && schema.defaultChildren !== void 0) {
    result.defaultChildren = schema.defaultChildren;
  }
  if (sections.has("renderingHints") && schema.renderingHints !== void 0) {
    result.renderingHints = schema.renderingHints;
  }
  if (sections.has("authoringHints") && schema.authoringHints !== void 0) {
    result.authoringHints = schema.authoringHints;
  }
  return result;
}
function legacyNotice(type) {
  const replacement = getLegacyComponentReplacement(type);
  return replacement ? {
    deprecated: true,
    replacement,
    deprecation_note: `"${type}" remains available only for inspecting or repairing existing apps. Use "${replacement}" for new components.`
  } : {};
}
async function instanceNote(client, type) {
  const refusal = type === "Map" ? await mapKeyRefusal(client, ["Map"]) : void 0;
  return refusal ? { instance_note: refusal } : {};
}
function getComponentCatalogTool(client) {
  return {
    name: "get_component_catalog",
    title: "Get Component Catalog",
    // Served from the bundled catalog in data/; never reaches the ToolJet instance.
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    description: 'Discover ToolJet components. With no type(s), returns the lightweight palette. Use type for one component or types for a batch needed in the current page/phase. Typed reads default to detail:"compact" and the overview/properties/events/actions sections; compact property/style lists omit labels and defaults. Use detail:"full" or exact property_keys/style_keys only when those values are needed. Request renderingHints/authoringHints for layout-sensitive or nested components. Use requests when different types need different sections/keys in one call; top-level detail/sections/keys apply as defaults to every requested type, and the type/types/requests selectors may be combined. sections selects only overview, properties, styles, events, actions, exposedVariables, defaultChildren, renderingHints, and/or authoringHints; property_keys/style_keys narrow those arrays further. A batch returns {components,unknown_types}. GridView is a lookup alias for Listview mode:"grid"; component writes must still use type:"Listview". authoringHints covers nested contracts such as ModalV2 native slots, Table row-action Button columns, and Form JSON-schema field types. Fetch complex/unfamiliar contracts once and reuse them; never guess property/event/action ids.',
    inputSchema: {
      list_libraries: external_exports.boolean().optional().describe("List available shipped packs and published workspace libraries with their exact picker values and catalog prefixes."),
      type: external_exports.string().optional(),
      types: external_exports.array(external_exports.string()).min(1).max(25).optional(),
      requests: external_exports.array(external_exports.object({
        type: external_exports.string(),
        detail: external_exports.enum(["compact", "full"]).optional(),
        sections: external_exports.array(external_exports.enum(CATALOG_SECTIONS)).min(1).optional(),
        property_keys: external_exports.array(external_exports.string()).min(1).optional(),
        style_keys: external_exports.array(external_exports.string()).min(1).optional()
      })).min(1).max(25).optional(),
      detail: external_exports.enum(["compact", "full"]).optional(),
      sections: external_exports.array(external_exports.enum(CATALOG_SECTIONS)).min(1).optional(),
      property_keys: external_exports.array(external_exports.string()).min(1).optional(),
      style_keys: external_exports.array(external_exports.string()).min(1).optional()
    },
    async handler(args) {
      try {
        if (args?.list_libraries)
          return ok({ component_libraries: componentLibraryChoices() });
        const singleType = args?.type;
        const typesList = args?.types ?? [];
        const batch = args?.requests ?? [];
        const hasSelector = !!singleType || typesList.length > 0 || batch.length > 0;
        if (!hasSelector) {
          if (args.detail || args.sections || args.property_keys || args.style_keys) {
            return fail(new Error("Catalog detail/sections/key filters require `type`, `types`, or `requests`."));
          }
          return ok(getCatalog());
        }
        if (singleType && typesList.length === 0 && batch.length === 0) {
          const internal = internalComponentTypeNote(singleType);
          if (internal)
            return fail(new Error(`"${singleType}" ${internal}`));
          const resolved = resolveCatalogType(singleType);
          const schema = getComponentSchema(resolved.type);
          if (!schema) {
            const near = nearbyTypes(singleType);
            const suggested = [.../* @__PURE__ */ new Set([...packSuggestions(singleType), ...near])].slice(0, 6);
            const packTypes = /^Shad[A-Z]/.test(singleType) ? getCatalog().map((entry) => entry.type).filter((type) => /^Shad[A-Z]/.test(type)) : [];
            return ok({
              error: `Unknown component type "${singleType}". Call with no argument to list valid types.`,
              ...suggested.length ? { did_you_mean: suggested } : {},
              ...packTypes.length ? { pack_types: packTypes } : {}
            });
          }
          return ok({
            ...selectSchema(schema, args),
            ...legacyNotice(schema.type),
            ...resolved.alias ? { alias: resolved.alias } : {},
            ...await instanceNote(client, schema.type)
          });
        }
        const withDefaults = (type, over) => ({
          type,
          detail: over?.detail ?? args.detail,
          sections: over?.sections ?? args.sections,
          property_keys: over?.property_keys ?? args.property_keys,
          style_keys: over?.style_keys ?? args.style_keys
        });
        const ordered = [
          ...batch.map((r) => withDefaults(r.type, r)),
          ...typesList.map((t) => withDefaults(t)),
          ...singleType ? [withDefaults(singleType)] : []
        ];
        const components = [];
        const unknownTypes = [];
        const componentByResolvedType = /* @__PURE__ */ new Map();
        const seenUnknown = /* @__PURE__ */ new Set();
        for (const request of ordered) {
          if (!request.type)
            continue;
          const resolved = resolveCatalogType(request.type);
          const schema = internalComponentTypeNote(request.type) ? null : getComponentSchema(resolved.type);
          if (!schema) {
            if (!seenUnknown.has(request.type)) {
              seenUnknown.add(request.type);
              unknownTypes.push(request.type);
            }
            continue;
          }
          const existing = componentByResolvedType.get(resolved.type);
          if (existing) {
            if (resolved.alias) {
              const requestedAliases = Array.isArray(existing.requested_aliases) ? existing.requested_aliases : [];
              if (!requestedAliases.includes(request.type)) {
                existing.requested_aliases = [...requestedAliases, request.type];
              }
            }
            continue;
          }
          const component = {
            ...selectSchema(schema, request),
            ...legacyNotice(schema.type),
            ...resolved.alias ? { alias: resolved.alias } : {},
            ...resolved.alias ? { requested_aliases: [request.type] } : {},
            ...await instanceNote(client, schema.type)
          };
          components.push(component);
          componentByResolvedType.set(resolved.type, component);
        }
        const suggestions = Object.fromEntries(unknownTypes.map((type) => [type, [.../* @__PURE__ */ new Set([...packSuggestions(type), ...nearbyTypes(type)])].slice(0, 6)]).filter(([, near]) => near.length));
        const guessedPack = unknownTypes.some((type) => /^Shad[A-Z]/.test(type));
        return ok({
          components,
          unknown_types: unknownTypes,
          ...Object.keys(suggestions).length ? { suggestions } : {},
          ...guessedPack ? { pack_types: getCatalog().map((entry) => entry.type).filter((type) => /^Shad[A-Z]/.test(type)) } : {}
        });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
export {
  datasourceMetadataTools as A,
  nodeCatalog as B,
  COMPONENT_FX_GUIDANCE as C,
  capabilityRequestSchema as D,
  getWorkflowCapabilities as E,
  FLEX_MIN_WIDTH_PX_DESCRIPTION as F,
  lint as G,
  apply as H,
  deleteNode as I,
  validateGraph as J,
  editContractSchema as K,
  generateEditContract as L,
  workspaceUserActionTools as M,
  batchChildOrders as a,
  bodyParentId as b,
  childOrderProperty as c,
  appendedChildOrders as d,
  definition as e,
  plannedCurrency as f,
  FLEX_GROW_DESCRIPTION as g,
  hasNonEmptyDefinition as h,
  isFlexContainerType as i,
  FLEX_WIDTH_PX_DESCRIPTION as j,
  FLEX_FILL_WIDTH_DESCRIPTION as k,
  specSchema as l,
  mapKeyRefusal as m,
  normalizeComponentSpec as n,
  nodeSchema as o,
  packDefaultDefinition as p,
  loadInstalledPacks as q,
  listWorkspaceAppsTool as r,
  strictEntry as s,
  listWorkspaceFoldersTool as t,
  listWorkspaceUsersTool as u,
  manageWorkspaceUsersTool as v,
  inspectDatasourceSchemaTool as w,
  getComponentCatalogTool as x,
  updateComponentsTool as y,
  updateLayoutTool as z
};
