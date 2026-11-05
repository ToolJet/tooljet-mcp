import { createRequire } from "node:module";
import { ax as fail, ay as ok, aC as COMPONENT_FX_GUIDANCE } from "./chunk-D70UN33u.js";
import { r as resolveRef$1, F as FLEX_MIN_WIDTH_PX_DESCRIPTION, f as FLEX_GROW_DESCRIPTION, g as FLEX_WIDTH_PX_DESCRIPTION, j as FLEX_FILL_WIDTH_DESCRIPTION, p as plannedCurrency, n as normalizeComponentSpec, m as mapKeyRefusal } from "./chunk-Dlc8fT0Z.js";
import { c as componentRef, p as packDefaultDefinition, i as indexComponentReferences, b as booleanBindingValue, v as validateTableBatch, n as normalizeType, T as TOOLJET_DB_DATA_TYPES, a as invalidSeedTimestamps } from "./chunk-BRL0__1q.js";
import { z as isModalV2Type, A as lintComponentStateBindings, r as retiredUi2Name, d as decodeComponentParent, B as minimumTextHeight, C as unifyChartAccents, a as componentNameSchema, c as componentSlotSchema, D as lintComponents, E as pageIconError, f as encodeComponentParent, F as validateAppStructure, G as pageIconSchema, v as resolveComponentLibrary, H as componentLibraryWarnings, I as namespaceReads } from "./chunk-BAklDiyp.js";
import { C as getComponentSchema, M as suggestedHtmlHeight } from "./chunk-cuZ92804.js";
import { ct as normalizeQueryToggles, cu as toggleRewriteWarning, co as issueMessages, cv as queryToggleIssues, cm as normalizeQueryOptions, cn as validateQueryOptions, cw as arithmeticWriteWarning, cl as bindingSpans } from "./chunk-D7ePN5zJ.js";
import { p as parseExpression } from "./chunk-9lsiMWHR.js";
import { e as external_exports } from "./chunk-B2U2gFJI.js";
import { randomUUID } from "node:crypto";
createRequire(import.meta.url);
var member = (n) => n && ["MemberExpression", "OptionalMemberExpression"].includes(n.type);
var key = (n) => n.computed ? n.property?.type === "StringLiteral" ? n.property.value : void 0 : n.property?.name;
var unwrap = (v) => v && typeof v === "object" && "value" in v ? v.value : v;
function inputRefs(value) {
  const refs = /* @__PURE__ */ new Set();
  const scan = (v) => {
    if (Array.isArray(v)) {
      v.forEach(scan);
      return;
    }
    if (v && typeof v === "object") {
      Object.values(v).forEach(scan);
      return;
    }
    if (typeof v !== "string")
      return;
    const binding = v.trim().match(/^\{\{([\s\S]*)\}\}$/);
    if (!binding)
      return;
    let root;
    try {
      root = parseExpression(binding[1]);
    } catch {
      return;
    }
    const found = /* @__PURE__ */ new Set();
    let uncertain = false;
    const visit = (n) => {
      if (!n || typeof n !== "object")
        return;
      if (Array.isArray(n)) {
        n.forEach(visit);
        return;
      }
      if (n.params || n.type === "VariableDeclarator" || n.type === "WithStatement")
        uncertain = true;
      if (member(n) && ["value", "selectedDate", "isValid"].includes(key(n)) && member(n.object)) {
        const owner = n.object;
        if (owner.object?.type === "Identifier" && owner.object.name === "components" && key(owner))
          found.add(key(owner));
      }
      Object.values(n).forEach(visit);
    };
    visit(root);
    if (!uncertain)
      found.forEach((name) => refs.add(name));
  };
  scan(value);
  return refs;
}
function truthyOnlyRequiredText(value, disabled) {
  const raw = unwrap(value);
  if (typeof raw !== "string")
    return /* @__PURE__ */ new Set();
  const binding = raw.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!binding)
    return /* @__PURE__ */ new Set();
  let root;
  try {
    root = parseExpression(binding[1]);
  } catch {
    return /* @__PURE__ */ new Set();
  }
  const refs = /* @__PURE__ */ new Set();
  const rooted = (n, name) => member(n) && n.object?.type === "Identifier" && n.object.name === name && key(n);
  const visit = (n) => {
    if (n.type === "LogicalExpression" && n.operator === (disabled ? "||" : "&&"))
      return visit(n.left) && visit(n.right);
    if (disabled && n.type === "UnaryExpression" && n.operator === "!") {
      const v2 = n.argument;
      if (member(v2) && key(v2) === "value" && rooted(v2.object, "components")) {
        refs.add(key(v2.object));
        return true;
      }
    }
    if (!disabled && member(n) && key(n) === "value" && rooted(n.object, "components")) {
      refs.add(key(n.object));
      return true;
    }
    const v = n.type === "UnaryExpression" && n.operator === "!" ? n.argument : n;
    return Boolean(member(v) && key(v) === "isLoading" && rooted(v.object, "queries"));
  };
  return visit(root) ? refs : /* @__PURE__ */ new Set();
}
function requiredMutationGuardWarnings(source, query, action, components) {
  const inputs = inputRefs(query.options);
  const guarded = inputRefs([source.properties?.disabledState, action.runOnlyIf]);
  const missing = components.filter((c) => c.name && inputs.has(c.name) && !guarded.has(c.name) && ["TextInput", "TextArea", "NumberInput", "CurrencyInput", "DatePickerV2"].includes(c.type ?? "") && [true, "true", "{{true}}"].includes(unwrap(c.validation?.mandatory)));
  const warnings = missing.length ? [`Button "${source.name ?? source.id}" directly runs mutation "${query.name ?? query.id}" using required inputs ${missing.map((c) => `"${c.name}"`).join(", ")}, but no field validation is visible in disabledState or runOnlyIf. A required marker alone does not stop this query. Validate before writing (including whitespace-only text), or route through a validating Form/RunJS success chain. Preserve zero and false; keep database constraints authoritative. This advisory does not prove arbitrary guards or server validation.`] : [];
  const disabledRefs = inputRefs(source.properties?.disabledState), actionRefs = inputRefs(action.runOnlyIf);
  const disabledTruthy = truthyOnlyRequiredText(source.properties?.disabledState, true);
  const actionTruthy = truthyOnlyRequiredText(action.runOnlyIf, false);
  const weak = components.filter((c) => c.name && inputs.has(c.name) && ["TextInput", "TextArea"].includes(c.type ?? "") && (disabledTruthy.has(c.name) || actionTruthy.has(c.name)) && (!disabledRefs.has(c.name) || disabledTruthy.has(c.name)) && (!actionRefs.has(c.name) || actionTruthy.has(c.name)));
  if (weak.length)
    warnings.push(`Button "${source.name ?? source.id}" checks text ${weak.map((c) => `"${c.name}"`).join(", ")} using only truthiness. Whitespace-only text can pass this guard. If blank text is invalid, trim before checking length (and validate before writing); do not apply truthiness validation to numbers or booleans.`);
  return warnings;
}
function unconditional(action) {
  if (action.disabled)
    return false;
  const guard = action.runOnlyIf;
  return !guard || guard === true || typeof guard === "string" && /^(?:true|\{\{\s*true\s*\}\})$/.test(guard.trim());
}
function queryEventCycleErrors(summary, additions, persisted) {
  const names = new Map(summary.queries.map((q) => [q.id, q.name ?? q.id]));
  const resolve = (value) => {
    if (typeof value !== "string")
      return void 0;
    if (names.has(value))
      return value;
    const matches = summary.queries.filter((q) => q.name === value);
    return matches.length === 1 ? matches[0].id : void 0;
  };
  const edge = (event) => {
    if (event.sourceType !== "data_query" || !names.has(event.sourceId) || event.action.actionId !== "run-query" || !unconditional(event.action))
      return void 0;
    const target = resolve(event.action.queryId);
    return target ? [event.sourceId, target] : void 0;
  };
  const graph = /* @__PURE__ */ new Map();
  for (const event of [...persisted, ...additions]) {
    if (event.trigger !== "onDataQuerySuccess")
      continue;
    const pair = edge(event);
    if (!pair)
      continue;
    const targets = graph.get(pair[0]) ?? /* @__PURE__ */ new Set();
    targets.add(pair[1]);
    graph.set(pair[0], targets);
  }
  const reaches = (start, end) => {
    const queue = [start], visited = /* @__PURE__ */ new Set();
    while (queue.length) {
      const current = queue.pop();
      if (current === end)
        return true;
      if (visited.has(current))
        continue;
      visited.add(current);
      for (const next of graph.get(current) ?? [])
        queue.push(next);
    }
    return false;
  };
  const errors = [];
  for (const event of additions) {
    const pair = edge(event);
    if (!pair)
      continue;
    const [source, target] = pair;
    const successCycle = event.trigger === "onDataQuerySuccess" && reaches(target, source);
    const failureSelfRetry = event.trigger === "onDataQueryFailure" && source === target;
    if (successCycle || failureSelfRetry)
      errors.push(`Query "${names.get(source)}" -> "${names.get(target)}" creates an unconditional query ${failureSelfRetry ? "failure retry" : "success cycle"}. This can repeat queries and writes after one click. Refresh a separate read query with no return edge, or use an explicit bounded retry/termination guard.`);
  }
  return [...new Set(errors)];
}
var ACTION_IDS = /* @__PURE__ */ new Set([
  "run-query",
  "switch-page",
  "show-alert",
  "show-modal",
  "close-modal",
  "set-custom-variable",
  "unset-custom-variable",
  "set-page-variable",
  "set-table-page",
  "copy-to-clipboard",
  "generate-file",
  "open-webpage",
  "go-to-app",
  "logout",
  "control-component",
  "set-localstorage-value",
  "scroll-component-into-view"
]);
function propVal(properties, key2) {
  const value = properties?.[key2];
  return value && typeof value === "object" && "value" in value ? value.value : value;
}
function isFalseBinding(value) {
  return value === false || value === "false" || value === "{{false}}";
}
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function navigationItemRef(source, ref) {
  let unknown = false;
  let found = false;
  let group = false;
  const visit = (items) => {
    if (typeof items === "string" && items.includes("{{")) {
      unknown = true;
      return;
    }
    if (!Array.isArray(items)) {
      if (items == null)
        unknown = true;
      return;
    }
    for (const item of items) {
      if (!isRecord(item))
        continue;
      if (item.id === ref) {
        if (item.isGroup)
          group = true;
        else
          found = true;
      }
      if (typeof item.id === "string" && item.id.includes("{{"))
        unknown = true;
      if (item.isGroup)
        visit(item.children ?? []);
    }
  };
  visit(propVal(source.properties, "menuItems"));
  return group ? "invalid" : found ? "valid" : unknown ? "unknown" : "invalid";
}
function effectiveRef(event) {
  return Object.prototype.hasOwnProperty.call(event.action, "ref") ? event.action.ref : event.ref;
}
function validateTableColumnRef(source, ref) {
  if (!ref)
    return 'Table Button-column events require ref "<column key or name>::<button id>".';
  const separator = ref.lastIndexOf("::");
  if (separator <= 0 || separator === ref.length - 2)
    return `Table Button-column ref "${ref}" is malformed.`;
  const columnRef = ref.slice(0, separator);
  const buttonId = ref.slice(separator + 2);
  const columns = propVal(source.properties, "columns");
  if (!Array.isArray(columns))
    return `Table "${source.name ?? source.id}" has no explicit columns array for ref "${ref}".`;
  const column = columns.find((candidate) => {
    const item = candidate;
    return item?.key === columnRef || item?.name === columnRef;
  });
  if (!column || column.columnType !== "button") {
    return `Table "${source.name ?? source.id}" has no Button column keyed/named "${columnRef}".`;
  }
  if (!Array.isArray(column.buttons) || !column.buttons.some((button) => button?.id === buttonId)) {
    return `Table Button column "${columnRef}" has no button id "${buttonId}".`;
  }
  return void 0;
}
var MUTATION_OPERATIONS = /* @__PURE__ */ new Set([
  "create_row",
  "update_row",
  "update_rows",
  "upsert_rows",
  "delete_row",
  "delete_rows",
  "bulk_insert",
  "bulk_update_pkey",
  "bulk_upsert_pkey",
  "bulk_update_with_primary_key",
  "bulk_upsert_with_primary_key"
]);
function isMutationQuery(query) {
  const options = query.options ?? {};
  const operation = typeof options.operation === "string" ? options.operation.toLowerCase() : void 0;
  if (operation && MUTATION_OPERATIONS.has(operation))
    return true;
  const sqlExecution = options.sql_execution;
  const sql = typeof options.query === "string" ? options.query : typeof options.sql === "string" ? options.sql : typeof sqlExecution?.sqlQuery === "string" ? sqlExecution.sqlQuery : void 0;
  return typeof sql === "string" && /^\s*(insert|update|delete|merge|upsert|replace)\b/i.test(sql);
}
function validateEvents(summary, events, options = {}) {
  const errors = [];
  const warnings = [];
  const components = new Map(summary.pages.flatMap((page) => page.components).map((component) => [component.id, component]));
  const queries = new Set(summary.queries.map((query) => query.id));
  const queryById = new Map(summary.queries.map((query) => [query.id, query]));
  const pages = new Set(summary.pages.map((page) => page.id));
  const pageOfComponent = new Map(summary.pages.flatMap((page) => page.components.map((c) => [c.id, page.id])));
  const pageName = new Map(summary.pages.map((page) => [page.id, page.name ?? page.handle ?? page.id]));
  const queryTriggerPages = /* @__PURE__ */ new Map();
  const noteTrigger = (queryId, pageId) => {
    if (!queryId)
      return;
    const set = queryTriggerPages.get(queryId) ?? /* @__PURE__ */ new Set();
    set.add(pageId ?? "*");
    queryTriggerPages.set(queryId, set);
  };
  for (const query of summary.queries) {
    const opts = query.options && typeof query.options === "object" ? query.options : {};
    const onLoad = opts.runOnPageLoad;
    const raw = onLoad && typeof onLoad === "object" ? onLoad.value : onLoad;
    if (raw === true || String(raw ?? "").replace(/[{}\s]/g, "").toLowerCase() === "true")
      noteTrigger(query.id, void 0);
  }
  for (const persisted of summary.events ?? []) {
    const payload = persisted.event && typeof persisted.event === "object" ? persisted.event : void 0;
    if (!payload || payload.actionId !== "run-query")
      continue;
    const queryId = String(payload.queryId ?? "");
    if (persisted.target === "page")
      noteTrigger(queryId, persisted.sourceId);
    else if (persisted.target === "component" && persisted.sourceId)
      noteTrigger(queryId, pageOfComponent.get(persisted.sourceId));
  }
  for (const event of events) {
    if (event.action?.actionId !== "run-query")
      continue;
    const queryId = String(event.action.queryId ?? "");
    if (event.sourceType === "page")
      noteTrigger(queryId, event.sourceId);
    else if (event.sourceType === "component" || event.sourceType === "table_column")
      noteTrigger(queryId, pageOfComponent.get(event.sourceId));
  }
  const pageScopedTarget = (action) => {
    const id = action.actionId;
    if (id === "set-table-page")
      return typeof action.table === "string" ? action.table : void 0;
    if (id === "control-component" || id === "scroll-component-into-view")
      return typeof action.componentId === "string" ? action.componentId : void 0;
    if (id === "show-modal" || id === "close-modal")
      return typeof action.modal === "string" ? action.modal : void 0;
    return void 0;
  };
  events.forEach((event, index) => {
    const label2 = event.name ? `Event "${event.name}"` : `Event[${index}]`;
    errors.push(...lintComponentStateBindings(event.action, [...components.values()], label2));
    if (event.sourceType === "component") {
      const source = components.get(event.sourceId);
      for (const ref of new Set([event.ref, event.action.ref].filter((ref2) => ref2 != null && ref2 !== ""))) {
        if (source?.type !== "Navigation" || event.trigger !== "onClick") {
          (options.savedRefs?.has(event) ? warnings : errors).push(`${label2}: ordinary component events cannot use ref; use name to label the handler. Only Navigation onClick item refs and Table Button-column refs have component sub-element scopes.`);
        } else if (!nonEmptyString(ref) || ref.includes("{{")) {
          errors.push(`${label2}: Navigation onClick ref must be a literal non-empty item id.`);
        } else {
          const membership = navigationItemRef(source, ref);
          if (membership === "invalid")
            errors.push(`${label2}: Navigation ref "${ref}" does not identify a non-group menu item.`);
          if (membership === "unknown")
            warnings.push(`${label2}: Navigation ref "${ref}" membership cannot be verified because menuItems are unresolved/dynamic. Verify the runtime item id; no item membership was inferred.`);
        }
      }
      if (!source)
        errors.push(`${label2}: component source "${event.sourceId}" does not exist.`);
      else if (source.type) {
        const schema = getComponentSchema(source.type);
        const validTriggers = schema?.events?.map((item) => item.id) ?? [];
        if (schema && !validTriggers.includes(event.trigger)) {
          const renamed = retiredUi2Name(source.type, "events", event.trigger);
          errors.push(renamed ? `${label2}: ${source.type} event "${event.trigger}" was renamed "${renamed}"; use trigger "${renamed}".` : `${label2}: trigger "${event.trigger}" is not valid for ${source.type}. Valid triggers: ${validTriggers.join(", ") || "none"}.`);
        }
        if (source.type === "Kanban" && event.trigger === "onCardSelected" && isFalseBinding(propVal(source.properties, "openModalOnCardClick"))) {
          errors.push(`${label2}: Kanban onCardSelected cannot fire while openModalOnCardClick is false; ToolJet returns before it sets lastSelectedCard or fires the event. Enable the native card modal AND populate it with children parented to the Kanban using slot_name:"modal", or remove this handler and use a separate supported detail flow.`);
        }
      }
    } else if (event.sourceType === "data_query") {
      if (!queries.has(event.sourceId))
        errors.push(`${label2}: query source "${event.sourceId}" does not exist.`);
      if (!["onDataQuerySuccess", "onDataQueryFailure"].includes(event.trigger)) {
        errors.push(`${label2}: query trigger must be onDataQuerySuccess or onDataQueryFailure, not "${event.trigger}".`);
      }
    } else if (event.sourceType === "page") {
      if (!pages.has(event.sourceId))
        errors.push(`${label2}: page source "${event.sourceId}" does not exist.`);
      if (event.trigger !== "onPageLoad")
        errors.push(`${label2}: page trigger must be onPageLoad, not "${event.trigger}".`);
    } else if (event.sourceType === "table_column") {
      const source = components.get(event.sourceId);
      if (!source)
        errors.push(`${label2}: Table source "${event.sourceId}" does not exist.`);
      else if (source.type !== "Table")
        errors.push(`${label2}: table_column source must be a Table, not ${source.type ?? "unknown"}.`);
      else {
        if (event.trigger !== "onClick")
          errors.push(`${label2}: Table Button-column trigger must be onClick.`);
        const refError = validateTableColumnRef(source, event.ref);
        if (refError)
          errors.push(`${label2}: ${refError}`);
      }
    } else if (event.sourceType === "table_action") {
      errors.push(`${label2}: deprecated table_action handlers are not authored reliably. Use a columnType:"button" column with source_type:"table_column".`);
    }
    const actionId = event.action.actionId;
    if (typeof actionId !== "string" || !ACTION_IDS.has(actionId)) {
      errors.push(`${label2}: unknown actionId "${String(actionId)}"; ToolJet silently ignores invalid action ids.`);
      return;
    }
    const targetId = pageScopedTarget(event.action);
    const targetPage = targetId ? pageOfComponent.get(targetId) : void 0;
    if (targetId && targetPage) {
      const targetLabel = `${components.get(targetId)?.type ?? "component"} "${components.get(targetId)?.name ?? targetId}" on page "${pageName.get(targetPage)}"`;
      const sourcePage = event.sourceType === "page" ? event.sourceId : event.sourceType === "component" || event.sourceType === "table_column" ? pageOfComponent.get(event.sourceId) : void 0;
      if (sourcePage && sourcePage !== targetPage) {
        errors.push(`${label2}: ${actionId} targets ${targetLabel} from page "${pageName.get(sourcePage)}". A page-scoped action only reaches components on the page that is open; on another page the target is not mounted and the action fails at runtime. Put this handler on page "${pageName.get(targetPage)}" (its onPageLoad, or a component there), or drop it: switch-page mounts that page fresh.`);
      } else if (event.sourceType === "data_query") {
        const triggerPages = queryTriggerPages.get(event.sourceId);
        const elsewhere = triggerPages ? [...triggerPages].filter((page) => page !== targetPage) : [];
        if (elsewhere.length) {
          const where = elsewhere.includes("*") ? "on every page load (runOnPageLoad)" : `from page "${elsewhere.map((p) => pageName.get(p) ?? p).join('", "')}"`;
          errors.push(`${label2}: ${actionId} targets ${targetLabel}, but query "${queryById.get(event.sourceId)?.name ?? event.sourceId}" runs ${where}, where that component is not mounted, so the success handler fails at runtime. Move the action to page "${pageName.get(targetPage)}" (its onPageLoad, or the filter's own event there), or run the query only from that page.`);
        }
      }
    }
    if (actionId === "run-query") {
      let queryId = event.action.queryId;
      if (typeof queryId === "string" && !queries.has(queryId)) {
        const resolution = resolveRef$1(summary.queries, queryId, "Query", "in this app");
        if (resolution.ok) {
          if (resolution.warning)
            warnings.push(`${label2}: ${resolution.warning}`);
          queryId = resolution.target.id;
          event.action.queryId = queryId;
        }
      }
      if (typeof queryId !== "string" || !queries.has(queryId)) {
        const available = summary.queries.map((q) => `${q.name ?? "(unnamed)"}=${q.id}`).join(", ");
        errors.push(`${label2}: no query with id or name "${String(queryId)}" in this app. Do not re-read \u2014 the app currently has: ${available || "(no queries)"}.`);
      } else if (event.sourceType === "component" && event.trigger === "onClick") {
        const source = components.get(event.sourceId);
        const query = queryById.get(queryId);
        if (source?.type === "Button" && query && isMutationQuery(query)) {
          warnings.push(...requiredMutationGuardWarnings(source, query, event.action, [...components.values()]));
          const disabled = propVal(source.properties, "disabledState");
          const guarded = typeof disabled === "string" && disabled.includes("{{") && /isloading/i.test(disabled);
          if (!guarded) {
            warnings.push(`Button "${source.name ?? source.id}" runs the mutation query "${query.name ?? queryId}" on click but its disabledState does not gate on the query's loading state, so it can be double-submitted. Set disabledState to {{queries.${query.name ?? queryId}.isLoading}}.`);
          }
        }
      }
    }
    if (actionId === "switch-page") {
      const pageId = event.action.pageId;
      if (typeof pageId !== "string" || !pages.has(pageId)) {
        errors.push(`${label2}: switch-page target "${String(pageId)}" does not exist.`);
      }
    }
    if (["show-modal", "close-modal"].includes(actionId)) {
      const modal = event.action.modal;
      const target = typeof modal === "string" ? components.get(modal) : void 0;
      if (!target) {
        errors.push(`${label2}: ${actionId} modal target "${String(modal)}" does not exist.`);
      } else if (target.type !== "Modal" && !isModalV2Type(target.type)) {
        errors.push(`${label2}: ${actionId} target must be a Modal, ModalV2 or ShadDialog, not ${target.type ?? "unknown"} "${target.name ?? target.id}".`);
      }
    }
    if (actionId === "control-component") {
      const componentId = event.action.componentId;
      const target = typeof componentId === "string" ? components.get(componentId) : void 0;
      if (!target) {
        errors.push(`${label2}: control-component target "${String(componentId)}" does not exist.`);
      } else {
        const handle = event.action.componentSpecificActionHandle;
        const schema = target.type ? getComponentSchema(target.type) : null;
        const componentAction = typeof handle === "string" ? schema?.actions?.find((candidate) => candidate.handle === handle) : void 0;
        if (!nonEmptyString(handle)) {
          errors.push(`${label2}: control-component requires componentSpecificActionHandle.`);
        } else if (!componentAction) {
          const renamed = retiredUi2Name(target.type, "actions", handle);
          errors.push(renamed ? `${label2}: ${target.type} action "${handle}" was renamed "${renamed}"; use componentSpecificActionHandle "${renamed}".` : `${label2}: control-component action "${handle}" is not valid for ${target.type ?? "unknown"} "${target.name ?? target.id}". Valid actions: ${schema?.actions?.map((candidate) => candidate.handle).join(", ") || "none"}.`);
        } else {
          const params = event.action.componentSpecificActionParams;
          if (params !== void 0 && !Array.isArray(params)) {
            errors.push(`${label2}: componentSpecificActionParams must be an array.`);
          } else if (Array.isArray(params)) {
            const supplied = new Set(params.flatMap((param) => isRecord(param) && nonEmptyString(param.handle) ? [param.handle] : []));
            if (params.some((param) => !isRecord(param) || !nonEmptyString(param.handle))) {
              errors.push(`${label2}: every componentSpecificActionParams entry requires a string handle.`);
            }
            const requiredHandles = (componentAction.params ?? []).flatMap((param) => nonEmptyString(param.handle) ? [param.handle] : []);
            const missing = requiredHandles.filter((required) => !supplied.has(required));
            if (missing.length) {
              errors.push(`${label2}: control-component action "${handle}" is missing parameter handles: ${missing.join(", ")}.`);
            }
          } else if ((componentAction.params?.length ?? 0) > 0) {
            errors.push(`${label2}: control-component action "${handle}" requires componentSpecificActionParams for ${componentAction.params.map((param) => String(param.handle)).join(", ")}.`);
          }
        }
      }
    }
    if (actionId === "scroll-component-into-view") {
      const componentId = event.action.componentId;
      if (typeof componentId !== "string" || !components.has(componentId)) {
        errors.push(`${label2}: scroll-component-into-view target "${String(componentId)}" does not exist.`);
      }
    }
    if (actionId === "show-alert") {
      if (!nonEmptyString(event.action.message))
        errors.push(`${label2}: show-alert requires a non-empty message.`);
      if (!["success", "info", "warning", "error"].includes(String(event.action.alertType))) {
        errors.push(`${label2}: show-alert alertType must be success, info, warning, or error.`);
      }
    }
    if (["set-custom-variable", "set-page-variable", "set-localstorage-value"].includes(actionId)) {
      if (!nonEmptyString(event.action.key))
        errors.push(`${label2}: ${actionId} requires a non-empty key.`);
      if (!Object.prototype.hasOwnProperty.call(event.action, "value"))
        errors.push(`${label2}: ${actionId} requires value.`);
    }
    if (actionId === "unset-custom-variable" && !nonEmptyString(event.action.key)) {
      errors.push(`${label2}: unset-custom-variable requires a non-empty key.`);
    }
    if (actionId === "open-webpage" && !nonEmptyString(event.action.url)) {
      errors.push(`${label2}: open-webpage requires a non-empty url.`);
    }
    if (actionId === "copy-to-clipboard" && !Object.prototype.hasOwnProperty.call(event.action, "contentToCopy")) {
      errors.push(`${label2}: copy-to-clipboard requires contentToCopy.`);
    }
    if (actionId === "set-table-page") {
      const tableId = event.action.table;
      const table = typeof tableId === "string" ? components.get(tableId) : void 0;
      if (!table) {
        errors.push(`${label2}: set-table-page Table target "${String(tableId)}" does not exist.`);
      } else if (table.type !== "Table") {
        errors.push(`${label2}: set-table-page target must be a Table, not ${table.type ?? "unknown"}.`);
      }
      const pageIndex = event.action.pageIndex;
      if (!["string", "number"].includes(typeof pageIndex) || String(pageIndex).trim() === "") {
        errors.push(`${label2}: set-table-page requires a numeric value or binding in pageIndex.`);
      }
    }
    if (actionId === "generate-file") {
      const format = ["fileType", "type", "format", "extension"].map((key2) => event.action[key2]).find((value) => typeof value === "string");
      if (format && /\bpdf\b/i.test(format)) {
        warnings.push(`${label2}: generate-file PDF is a pass-through and expects pre-formed PDF bytes; it does not convert text/HTML/data into a PDF. Use CSV/plaintext, or supply and browser-verify real PDF bytes.`);
      }
    }
  });
  const chainKey = (event) => [event.sourceType, event.sourceId, event.ref ?? "", event.trigger].join("\0");
  const touchedChains = new Set(events.map(chainKey));
  const chains = /* @__PURE__ */ new Map();
  for (const persisted of options.includePersistedChains === false ? [] : summary.events) {
    const raw = isRecord(persisted.event) ? persisted.event : void 0;
    const sourceType = persisted.target;
    const trigger = raw?.eventId;
    if (!raw || !persisted.sourceId || !sourceType || !nonEmptyString(trigger))
      continue;
    const event = {
      sourceId: persisted.sourceId,
      sourceType,
      ref: nonEmptyString(raw.ref) ? raw.ref : void 0,
      trigger,
      action: raw,
      name: persisted.name
    };
    const key2 = chainKey(event);
    if (!touchedChains.has(key2))
      continue;
    const chain = chains.get(key2) ?? [];
    chain.push({ event, index: persisted.index ?? 0, persisted: true });
    chains.set(key2, chain);
  }
  events.forEach((event, index) => {
    const key2 = chainKey(event);
    const chain = chains.get(key2) ?? [];
    const lastPersistedIndex = chain.reduce((maximum, item) => item.persisted ? Math.max(maximum, item.index) : maximum, -1);
    chain.push({ event, index: lastPersistedIndex + index + 1, persisted: false });
    chains.set(key2, chain);
  });
  for (const chain of chains.values()) {
    chain.sort((left, right) => left.index - right.index || Number(right.persisted) - Number(left.persisted));
    chain.forEach(({ event }, index) => {
      if (event.action.actionId !== "control-component" || !["selectOption", "selectOptions", "setText", "setValue"].includes(String(event.action.componentSpecificActionHandle)))
        return;
      let child = components.get(String(event.action.componentId));
      const visited = /* @__PURE__ */ new Set();
      while (child?.parent && !visited.has(child.id)) {
        visited.add(child.id);
        const parent = components.get(decodeComponentParent(child.parent).parentId);
        if (!parent)
          break;
        if (isModalV2Type(parent.type) && chain.slice(index + 1).some(({ event: later2 }) => later2.action.actionId === "show-modal" && later2.action.modal === parent.id)) {
          errors.push(`Event "${event.name ?? index}": prefill targets a child of ${parent.type} "${parent.name ?? parent.id}" before show-modal. Closed modal children are not mounted; these values can be lost. Bind input defaults to the selected record, or initialize after the modal opens.`);
          break;
        }
        child = parent;
      }
    });
    const navigationIndex = chain.findIndex(({ event }) => event.action.actionId === "switch-page");
    if (navigationIndex === -1 || navigationIndex === chain.length - 1)
      continue;
    const navigation = chain[navigationIndex];
    const afterNavigation = chain.slice(navigationIndex + 1);
    if (options.navigationMovedLast && navigation.persisted && afterNavigation.every((item) => !item.persisted && item.event.action.actionId !== "switch-page"))
      continue;
    const later = chain.slice(navigationIndex + 1).map(({ event }) => String(event.action.actionId)).join(", ");
    const label2 = navigation.event.name ? `${navigation.persisted ? "Persisted event" : "Event"} "${navigation.event.name}"` : `${navigation.persisted ? "Persisted event" : "Event"}[${navigation.index}]`;
    errors.push(`${label2}: switch-page must be the LAST handler for the same source and trigger; ToolJet does not run later handlers (${later}). Put state updates and run-query actions before navigation.`);
  }
  errors.push(...queryEventCycleErrors(summary, events, options.includePersistedChains === false ? [] : persistedEventSpecs(summary)));
  const persistedMode = options.includePersistedChains === false;
  const isNavigation = (sourceType, sourceId, trigger) => sourceType === "component" && components.get(sourceId)?.type === "Navigation" && trigger === "onClick";
  const runKey = (sourceType, sourceId, trigger, queryId) => JSON.stringify([sourceType, sourceId, trigger, queryId]);
  const runScope = (sourceType, sourceId, trigger, ref) => sourceType === "table_column" || isNavigation(sourceType, sourceId, trigger) ? ref || null : null;
  const overlaps = (left, right, navigation) => left === right || navigation && (left === null || right === null);
  const payloadKey = (payload) => JSON.stringify(Object.keys(payload).filter((k) => k !== "index" && k !== "name").sort().map((k) => [k, payload[k]]));
  const heldRuns = /* @__PURE__ */ new Map();
  if (!persistedMode) {
    for (const held of summary.events ?? []) {
      const payload = held.event && typeof held.event === "object" ? held.event : void 0;
      if (!payload || payload.actionId !== "run-query" || !held.sourceId)
        continue;
      if (held.target !== "component" && held.target !== "table_column")
        continue;
      const key2 = runKey(held.target, held.sourceId, payload.eventId, payload.queryId);
      const scope = runScope(held.target, held.sourceId, payload.eventId, payload.ref);
      heldRuns.set(key2, [...heldRuns.get(key2) ?? [], { id: held.id, payload: payloadKey(payload), scope }]);
    }
  }
  const plannedRuns = /* @__PURE__ */ new Map();
  for (const event of events) {
    if (event.action?.actionId !== "run-query")
      continue;
    if (event.sourceType !== "component" && event.sourceType !== "table_column")
      continue;
    const key2 = runKey(event.sourceType, event.sourceId, event.trigger, event.action.queryId);
    const scope = runScope(event.sourceType, event.sourceId, event.trigger, effectiveRef(event));
    const navigation = isNavigation(event.sourceType, event.sourceId, event.trigger);
    const sourceName = components.get(event.sourceId)?.name ?? event.sourceId;
    const queryName = queryById.get(String(event.action.queryId ?? ""))?.name ?? String(event.action.queryName ?? event.action.queryId);
    const mine = payloadKey({ eventId: event.trigger, ...event.ref ? { ref: event.ref } : {}, ...event.action });
    const held = (heldRuns.get(key2) ?? []).filter((h) => overlaps(h.scope, scope, navigation));
    if (held.length && !held.some((h) => h.payload === mine)) {
      errors.push(`"${sourceName}" ${event.trigger} already runs query "${queryName}" (event ${held[0].id}); a second handler would run it twice on one ${event.trigger}. Change that handler with update_events, or delete it with delete_event before adding this one.`);
    } else if ((plannedRuns.get(key2) ?? []).some((previous) => overlaps(previous, scope, navigation))) {
      (persistedMode ? warnings : errors).push(`"${sourceName}" ${event.trigger} runs query "${queryName}" twice: two handlers on it run the same query, so one ${event.trigger} runs it two times. Keep one.`);
    }
    plannedRuns.set(key2, [...plannedRuns.get(key2) ?? [], scope]);
  }
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}
var persistedEventIds = /* @__PURE__ */ new WeakMap();
function persistedEventSpecs(summary) {
  return summary.events.map((event, position) => ({ event, position })).sort((left, right) => (left.event.index ?? left.position) - (right.event.index ?? right.position)).flatMap(({ event }) => {
    if (!event.sourceId || !event.target || !event.event || typeof event.event !== "object")
      return [];
    const payload = event.event;
    if (typeof payload.eventId !== "string")
      return [];
    const { eventId, ref, ...action } = payload;
    if (event.target === "component" && ref != null && typeof ref !== "string")
      action.ref = ref;
    const spec = {
      sourceId: event.sourceId,
      sourceType: event.target,
      ...typeof ref === "string" ? { ref } : {},
      trigger: eventId,
      action,
      name: event.name
    };
    if (event.id)
      persistedEventIds.set(spec, event.id);
    return [spec];
  });
}
function navigationReorders(summary, touched, diagnostics) {
  const touchedKeys = touched ? new Set(touched.map((event) => [event.sourceType, event.sourceId, event.ref ?? "", event.trigger].join("\0"))) : void 0;
  const chains = /* @__PURE__ */ new Map();
  for (const saved of summary.events ?? []) {
    const raw = isRecord(saved.event) ? saved.event : void 0;
    if (!raw || !saved.sourceId || !nonEmptyString(raw.eventId))
      continue;
    const key2 = [saved.target, saved.sourceId, nonEmptyString(raw.ref) ? raw.ref : "", raw.eventId].join("\0");
    const chain = chains.get(key2) ?? [];
    chain.push({ id: saved.id, index: saved.index ?? 0, nav: raw.actionId === "switch-page" });
    chains.set(key2, chain);
  }
  const moves = [];
  for (const [key2, chain] of chains) {
    chain.sort((a, b) => a.index - b.index);
    const navs = chain.filter((item) => item.nav);
    if (!navs.length || chain.slice(-navs.length).every((item) => item.nav))
      continue;
    if (touchedKeys && !touchedKeys.has(key2)) {
      const [, sourceId, ref, trigger] = key2.split("\0");
      diagnostics?.push(`The saved ${trigger} chain of "${sourceId}"${ref ? ` (${ref})` : ""} has a page switch before other handlers, so those never run; this phase did not touch it, so it was left as it is.`);
      continue;
    }
    let next = Math.max(...chain.map((item) => item.index)) + 1;
    for (const nav of navs)
      moves.push({ eventId: nav.id, index: next++ });
  }
  return moves;
}
var lookOf = (c) => {
  const entry = c.styles?.tableLook;
  return entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
};
function packTableLook(components) {
  if (!components.some((c) => /^Shad[A-Z]/.test(c.type ?? "")))
    return { components, warnings: [] };
  const warnings = [];
  const out = components.map((c) => {
    if (c.type !== "Table" || lookOf(c) !== void 0)
      return c;
    warnings.push(`Table "${c.name ?? "Table"}" sits among ToolJet UI 2.0 widgets; it now draws in the UI 2.0 look (styles.tableLook "shadcn").`);
    return { ...c, styles: { ...c.styles ?? {}, tableLook: { value: "shadcn" } } };
  });
  return { components: out, warnings };
}
var BOX_PADDING_PX = 2;
var BORDER_PX = 1;
var CARD_HEADER_PX = { title: 48, withDescription: 70 };
var DEFAULT_GAP = 12;
var DEFAULT_PADDING = 12;
var CANVAS_PX = { narrow: 1100, wide: 1600 };
var GRID_COLUMNS = 43;
var DIALOG_TYPES$1 = /* @__PURE__ */ new Set(["ShadDialog", "ModalV2", "Modal"]);
var valueOf$1 = (entry) => entry && typeof entry === "object" && !Array.isArray(entry) && "value" in entry ? entry.value : entry;
var text = (entry) => {
  const v = valueOf$1(entry);
  return typeof v === "string" ? v.trim() : typeof v === "number" || typeof v === "boolean" ? String(v) : "";
};
var prop = (c, key2) => text(c.properties && typeof c.properties === "object" ? c.properties[key2] : void 0);
var style = (c, key2) => text(c.styles && typeof c.styles === "object" ? c.styles[key2] : void 0);
var bool = (raw, fallback) => {
  const bare = raw.replace(/[{}\s]/g, "").toLowerCase();
  return bare === "true" ? true : bare === "false" ? false : fallback;
};
var num = (raw, fallback) => {
  const n = Number(raw.replace(/[{}\s]/g, "").replace(/px$/, ""));
  return raw === "" || !Number.isFinite(n) ? fallback : n;
};
var refOf$1 = (c) => c.clientRef ?? c.name;
var rectsOf = (c) => [c.layout, c.layouts?.desktop].filter((r, i, all) => !!r && typeof r.height === "number" && all.indexOf(r) === i);
var heightOf = (c) => Number((c.layouts?.desktop ?? c.layout)?.height ?? NaN);
var setHeight = (c, height) => rectsOf(c).forEach((r) => r.height = height);
function moveBelow(components, box, was, now) {
  const placeOf = (c) => `${c.parentRef ?? c.parent ?? ""}|${c.slotName ?? ""}`;
  const top = (box.layouts?.desktop ?? box.layout)?.top;
  if (typeof top !== "number" || now === was)
    return 0;
  const oldBottom = top + was;
  let moved = 0;
  for (const other of components) {
    if (!other || other === box || placeOf(other) !== placeOf(box) || DIALOG_TYPES$1.has(other.type))
      continue;
    const otherRects = [other.layout, other.layouts?.desktop].filter((r, i, all) => !!r && typeof r.top === "number" && all.indexOf(r) === i);
    if (!otherRects.length || otherRects[0].top < oldBottom - 1)
      continue;
    otherRects.forEach((r) => r.top = r.top + now - was);
    moved += 1;
  }
  return moved;
}
function fitFlexHeights(components, warnings) {
  const fitted = /* @__PURE__ */ new Set();
  const byRef = /* @__PURE__ */ new Map();
  for (const c of components)
    if (c && refOf$1(c))
      byRef.set(refOf$1(c), c);
  const childrenOf = (ref) => components.filter((c) => c && c.parentRef === ref && !c.slotName);
  const depth = (c) => {
    let d = 0;
    for (let p = c.parentRef; p && d < 20; p = byRef.get(p)?.parentRef)
      d += 1;
    return d;
  };
  const isCard = (c) => c.type === "FlexContainer" && prop(c, "cardStyle") === "shadcnCard";
  const directionOf = (c) => prop(c, "direction") || "row";
  const layoutV2 = (c) => prop(c, "layoutVersion") === "" || num(prop(c, "layoutVersion"), 2) >= 2;
  const inFlow = (c) => !DIALOG_TYPES$1.has(c.type) && bool(prop(c, "visibility"), true);
  const boxes = components.filter((c) => c && c.type === "FlexContainer").sort((a, b) => depth(b) - depth(a));
  const original = new Map(boxes.map((c) => [c, heightOf(c)]));
  const notes = [];
  for (const box of boxes) {
    const rects = rectsOf(box);
    const ref = refOf$1(box);
    if (!rects.length || !ref)
      continue;
    const inner = childrenOf(ref).filter(inFlow);
    if (!inner.length || inner.some((c) => !Number.isFinite(heightOf(c))))
      continue;
    const row = directionOf(box) === "row";
    const card = isCard(box);
    const fitsContent = layoutV2(box) && (card || row);
    if (!fitsContent && !bool(prop(box, "dynamicHeight"), true))
      continue;
    const gap = num(prop(box, "gap"), DEFAULT_GAP);
    const padding = num(prop(box, "padding"), DEFAULT_PADDING);
    let lines;
    if (!row) {
      lines = inner.map((c) => [c]);
    } else {
      const lineWidth = (c) => {
        const r = c.layouts?.desktop ?? c.layout;
        if (r?.fillWidth === false && typeof r.widthPx === "number")
          return r.widthPx;
        return typeof r?.minWidthPx === "number" ? r.minWidthPx : 0;
      };
      const widths = inner.map(lineWidth);
      const wraps = bool(prop(box, "flexWrap"), true);
      if (!wraps || widths.every((w) => w === 0)) {
        lines = [inner];
      } else {
        const pageLevel = !box.parentRef && !box.parent;
        if (!pageLevel)
          continue;
        const pack = (canvasPx) => {
          const available = (rects[0].width ?? GRID_COLUMNS) / GRID_COLUMNS * canvasPx - padding * 2;
          const packed = [];
          let used = 0;
          inner.forEach((c, i) => {
            const w = Math.min(widths[i], available);
            const current = packed[packed.length - 1];
            if (!current || used + gap + w > available) {
              packed.push([c]);
              used = w;
            } else {
              current.push(c);
              used += gap + w;
            }
          });
          return packed;
        };
        const narrow = pack(CANVAS_PX.narrow);
        const wide = pack(CANVAS_PX.wide);
        if (narrow.length !== wide.length || narrow.some((line, i) => line.length !== wide[i].length))
          continue;
        lines = narrow;
      }
      const stretches = prop(box, "alignItems") === "stretch" || bool(prop(box, "equalHeights"), true);
      if (stretches) {
        for (const line of lines) {
          if (line.length < 2)
            continue;
          const tallest = Math.max(...line.map(heightOf));
          for (const c of line)
            if (isCard(c) && heightOf(c) < tallest)
              setHeight(c, tallest);
          if (bool(prop(box, "equalHeights"), true)) {
            for (const c of line) {
              if (c.type === "ShadStat" && bool(prop(c, "card"), true) && bool(prop(c, "dynamicHeight"), true) && heightOf(c) < tallest) {
                setHeight(c, tallest);
              }
            }
          }
        }
      }
    }
    const content = lines.reduce((sum, line) => sum + Math.max(...line.map(heightOf)), 0) + gap * (lines.length - 1);
    const title = prop(box, "cardTitle");
    const extra = prop(box, "cardExtra");
    const header = card && (title || extra) ? extra ? CARD_HEADER_PX.withDescription : CARD_HEADER_PX.title : 0;
    const boxPadding = style(box, "padding") === "none" ? 0 : BOX_PADDING_PX;
    const needed = Math.ceil(content + padding * 2 + boxPadding * 2 + BORDER_PX * 2 + header);
    const was = heightOf(box);
    const target = fitsContent ? needed : Math.max(needed, was);
    if (target === was)
      continue;
    setHeight(box, target);
    fitted.add(box);
    const parent = box.parentRef ? byRef.get(box.parentRef) : void 0;
    const moved = parent?.type === "FlexContainer" ? 0 : moveBelow(components, box, was, target);
    notes.push({ box, kind: card ? "Card" : row ? "Row" : "Container", moved });
  }
  for (const { box, kind, moved } of notes) {
    const was = original.get(box);
    const now = heightOf(box);
    if (now === was) {
      fitted.delete(box);
      continue;
    }
    const shifted = moved ? ` (${moved} component${moved > 1 ? "s" : ""} below it moved ${now < was ? "up" : "down"} ${Math.abs(now - was)}px)` : "";
    warnings.push(now < was ? `${kind} "${box.name}" was ${was}px tall; it is now ${now}px, the height the app draws it at, so the editor shows no empty band under it${shifted}.` : `${kind} "${box.name}" was ${was}px tall; it is now ${now}px, the height the app draws it at, so the editor does not cut its content off${shifted}.`);
  }
  return fitted;
}
var BOX = 4;
var CHAR_EM = 0.45;
function wrappedLines(text3, widthPx, fontPx) {
  const charPx = fontPx * CHAR_EM;
  const width = Math.max(widthPx, charPx * 4);
  let total = 0;
  for (const paragraph of text3.split("\n")) {
    let lines = 1;
    let used = 0;
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const w = Math.min(word.length * charPx, width);
      const next = used === 0 ? w : used + charPx + w;
      if (next > width) {
        lines += 1;
        used = w;
      } else
        used = next;
    }
    total += lines;
  }
  return Math.max(1, total);
}
var TEXT_TONES = {
  paragraph: { font: 14, line: 28 },
  lead: { font: 20, line: 28 },
  muted: { font: 14, line: 20 },
  small: { font: 14, line: 14 },
  large: { font: 18, line: 28 }
};
var HEADING_LEVELS = {
  h1: { font: 36, line: 40 },
  h2: { font: 30, line: 36 },
  h3: { font: 24, line: 32 },
  h4: { font: 20, line: 28 }
};
var LABELLED_FIELDS = /* @__PURE__ */ new Set([
  "ShadInput",
  "ShadSelect",
  "ShadDatePicker",
  "ShadNumberInput",
  "ShadCurrencyInput",
  "ShadMultiselect",
  "ShadCombobox",
  "ShadPasswordInput",
  "ShadPhoneInput",
  "ShadTimePicker",
  "ShadDateTimePicker",
  "ShadTagsInput",
  "ShadOtpInput",
  "ShadColorPicker"
]);
var FIELD_BOX = 40;
var FIELD_LABEL = 22;
var FIELD_DESCRIPTION = 26;
var FIELD_LABEL_LINE = 14;
var literal = (raw) => raw === void 0 ? void 0 : raw.replace(/^\{\{\s*|\s*\}\}$/g, "").trim();
var isTrue = (raw, fallback) => {
  const v = literal(raw);
  return v === "true" ? true : v === "false" ? false : fallback;
};
var isNumber = (raw) => {
  const v = literal(raw);
  const n = v === void 0 || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : void 0;
};
var shown = (input, key2) => {
  const t = input.text(key2);
  return !!t && (t.bound || t.text.trim() !== "");
};
function drawnPackHeight(input) {
  const { type } = input;
  if (isTrue(input.attr("dynamicHeight"), true) === false)
    return void 0;
  const exact = (height) => ({ height: Math.round(height), exact: true });
  const estimate = (height) => ({ height: Math.round(height), exact: false });
  const inner = input.widthPx - BOX;
  if (type === "ShadText" || type === "ShadHeading") {
    const style2 = type === "ShadText" ? TEXT_TONES[input.attr("tone") ?? "paragraph"] ?? TEXT_TONES.paragraph : HEADING_LEVELS[input.attr("level") ?? "h2"] ?? HEADING_LEVELS.h2;
    const t = input.text("text");
    const lines = wrappedLines(t?.text ?? "", inner, style2.font);
    const height = lines * style2.line + BOX;
    return t?.bound ? estimate(height) : exact(height);
  }
  if (type === "ShadStat") {
    const size = input.attr("size") ?? "default";
    let height = size === "sm" ? 120 : size === "lg" ? 132 : 124;
    if (!isTrue(input.attr("card"), true))
      height -= 42;
    if (shown(input, "footnote"))
      height += 26;
    if (input.has("progress"))
      height += 16 + (shown(input, "progressLabel") ? 20 : 0);
    if (input.has("trendData"))
      height += 46;
    if (shown(input, "icon") && input.attr("iconPosition") === "top")
      height += 42;
    return exact(height);
  }
  if (LABELLED_FIELDS.has(type)) {
    const label2 = input.text("label");
    const labelLines = label2 && (label2.bound || label2.text.trim()) ? wrappedLines(label2.text, inner, 14) : 0;
    const height = FIELD_BOX + (labelLines ? FIELD_LABEL + (labelLines - 1) * FIELD_LABEL_LINE : 0) + (shown(input, "description") ? FIELD_DESCRIPTION : 0) + (type === "ShadTagsInput" ? 2 : 0);
    return label2?.bound ? estimate(height) : exact(height);
  }
  switch (type) {
    case "ShadSwitch":
    case "ShadCheckbox": {
      const label2 = input.text("label");
      const lines = label2 && (label2.bound || label2.text.trim()) ? wrappedLines(label2.text, inner - 24, 14) : 1;
      const row = type === "ShadSwitch" ? 24 : 20;
      const height = (lines > 1 ? lines * 20 : row) + (shown(input, "description") ? type === "ShadSwitch" ? 20 : 24 : 0);
      return lines > 1 || label2?.bound ? estimate(height) : exact(height);
    }
    case "ShadSlider":
      return exact(shown(input, "label") ? 46 : 24);
    case "ShadRating":
      return exact(shown(input, "label") ? 46 : 24);
    case "ShadToggleGroup":
      return exact(40);
    case "ShadTags": {
      const size = input.attr("size") ?? "default";
      return exact(size === "sm" ? 24 : size === "lg" ? 32 : 28);
    }
    case "ShadCircularProgress":
      return exact((isNumber(input.attr("size")) ?? 96) + BOX);
    case "ShadFileUpload":
      return exact(182);
    case "ShadRadioGroup": {
      const label2 = shown(input, "label");
      if (isTrue(input.attr("horizontal"), false))
        return exact(label2 ? 50 : 28);
      const options = input.count("options");
      return options === void 0 ? void 0 : exact((label2 ? 26 : 4) + 24 * options);
    }
    case "ShadAlert": {
      const description = input.text("description");
      const lines = description && (description.bound || description.text.trim()) ? wrappedLines(description.text, inner - 34, 14) : 0;
      const height = 34 + (shown(input, "title") ? 22 : 0) + lines * 20 + (shown(input, "actionLabel") ? 44 : 0);
      return description?.bound ? estimate(height) : exact(height);
    }
    case "ShadSteps": {
      if ((input.attr("orientation") ?? "horizontal") !== "vertical")
        return exact(64);
      const steps = input.count("steps");
      return steps === void 0 ? void 0 : exact(48 * steps + BOX);
    }
    case "ShadSummaryStrip": {
      const size = input.attr("size") ?? "default";
      const panel = (input.attr("appearance") ?? "panel") !== "plain";
      return exact((size === "sm" ? 78 : size === "lg" ? 102 : 90) - (panel ? 0 : 2));
    }
    case "ShadAccordion": {
      const open = input.count("defaultOpen");
      if (open !== void 0 ? open > 0 : input.has("defaultOpen"))
        return void 0;
      const items = input.count("items");
      return items === void 0 || items === 0 ? void 0 : exact(53 * items + BOX);
    }
    case "ShadKeyValue": {
      const n = input.count("data");
      if (!n)
        return void 0;
      const columns = Math.max(1, isNumber(input.attr("columns")) ?? 1);
      return estimateOrExact(input, "data", 41 * Math.ceil(n / columns) + (isTrue(input.attr("dividers"), true) ? 3 : 0));
    }
    case "ShadRecordList": {
      const n = input.count("data");
      if (!n)
        return void 0;
      const density = input.attr("density") ?? "default";
      const avatar = isTrue(input.attr("showAvatar"), true);
      const meta = shown(input, "metaFields");
      const row = density === "compact" ? 45 : density === "comfortable" ? avatar ? 73 : 57 : avatar ? 61 + (meta ? 2 : 0) : 45;
      const chrome = (input.attr("listStyle") ?? "card") === "plain" ? 3 : 5;
      return estimateOrExact(input, "data", n * row + chrome);
    }
    case "ShadProgressList": {
      const n = input.count("data");
      if (!n)
        return void 0;
      const bar = input.attr("barSize") ?? "default";
      const target = input.attr("targetField");
      const row = 59.4 + (target && input.itemsHave("data", target) ? 1 : 0) + (bar === "thick" ? 4 : bar === "thin" ? -2 : 0);
      const chrome = (input.attr("listStyle") ?? "card") === "plain" ? 3 : 13.6;
      return estimateOrExact(input, "data", n * row + chrome);
    }
    case "ShadTimeline": {
      const n = input.count("items");
      if (!n)
        return void 0;
      const compact = input.attr("density") === "compact";
      const item = (compact ? 32 : 44) + (input.itemsHave("items", "description") ? 22 : 0) + (!compact && input.attr("timePosition") === "top" ? 22 : 0);
      return estimateOrExact(input, "items", n * item - (compact ? 8 : 20));
    }
    case "ShadTable": {
      const n = input.count("data");
      if (!n)
        return void 0;
      const cell = input.attr("cellSize") ?? "regular";
      const row = cell === "condensed" ? 36 : cell === "spacious" ? 52 : 44;
      const paged = isTrue(input.attr("enablePagination"), true) && !isTrue(input.attr("serverSidePagination"), false);
      const perPage = Math.max(1, isNumber(input.attr("rowsPerPage")) ?? 10);
      const rows = paged ? Math.min(n, perPage) : n;
      return estimateOrExact(input, "data", 122 + rows * row + (paged && n > perPage ? 16 : 0));
    }
    case "ShadCardGrid": {
      const n = input.count("data");
      if (!n)
        return void 0;
      const gap = 12;
      const columns = (input.attr("layout") ?? "stacked") === "row" ? 1 : Math.max(1, isNumber(input.attr("columns")) ?? 3);
      const min = isNumber(input.attr("minCardWidth")) ?? 240;
      const perRow = Math.max(1, Math.min(columns, Math.floor((input.widthPx + gap) / (min + gap))));
      const cardWidth = (input.widthPx - gap * (perRow - 1)) / perRow;
      const image = isTrue(input.attr("showImage"), true) && shown(input, "imageField");
      const aspect = { "16/9": 9 / 16, "4/3": 3 / 4, "1/1": 1 }[input.attr("imageAspect") ?? "16/9"] ?? 9 / 16;
      const card = 89 + (image ? cardWidth * aspect : 0);
      const rows = Math.ceil(n / perRow);
      return estimate(rows * card + gap * (rows - 1));
    }
    case "ShadImage": {
      const ratio = input.attr("aspectRatio");
      const m = ratio ? /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(ratio) : null;
      return m ? estimate(input.widthPx * Number(m[2]) / Number(m[1])) : void 0;
    }
    default:
      return void 0;
  }
}
function estimateOrExact(input, key2, height) {
  const source = input.attr(key2) ?? "";
  return { height: Math.round(height), exact: /^\s*(\{\{\s*)?\[/.test(source) };
}
var VIEWER_COLUMN_PX = 32.2;
var GRID_COLUMNS2 = 43;
var WIDTH_SENSITIVE = /* @__PURE__ */ new Set([
  "ShadText",
  "ShadHeading",
  "ShadAlert",
  "ShadCardGrid",
  "ShadImage",
  "ShadSwitch",
  "ShadCheckbox",
  "ShadInput",
  "ShadSelect",
  "ShadDatePicker",
  "ShadNumberInput",
  "ShadCurrencyInput",
  "ShadMultiselect",
  "ShadCombobox",
  "ShadPasswordInput",
  "ShadPhoneInput",
  "ShadTimePicker",
  "ShadDateTimePicker",
  "ShadTagsInput",
  "ShadOtpInput",
  "ShadColorPicker"
]);
var valueOf2 = (entry) => entry && typeof entry === "object" && !Array.isArray(entry) && "value" in entry ? entry.value : entry;
var asText = (v) => v === void 0 || v === null ? void 0 : typeof v === "string" ? v : typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(v);
var listCount = (raw) => {
  if (raw === void 0)
    return void 0;
  const bare = raw.trim().replace(/^\{\{\s*|\s*\}\}$/g, "").trim();
  if (!bare.startsWith("[") || !bare.endsWith("]"))
    return void 0;
  try {
    const parsed = JSON.parse(bare.replace(/'/g, '"'));
    return Array.isArray(parsed) ? parsed.length : void 0;
  } catch {
    let depth = 0;
    let items = 0;
    let any = false;
    let quote = "";
    for (const ch of bare.slice(1, -1)) {
      if (quote) {
        if (ch === quote)
          quote = "";
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`")
        quote = ch;
      else if ("([{".includes(ch))
        depth += 1;
      else if (")]}".includes(ch))
        depth -= 1;
      else if (ch === "," && depth === 0)
        items += 1;
      if (!/\s/.test(ch))
        any = true;
    }
    return any ? items + 1 : 0;
  }
};
function fitPackHeights(components) {
  const notes = [];
  const byRef = /* @__PURE__ */ new Map();
  for (const c of components)
    if (c && (c.clientRef ?? c.name))
      byRef.set(c.clientRef ?? c.name, c);
  const rectOf = (c) => c.layouts?.desktop ?? c.layout;
  const drawnWidth = (c, depth = 0) => {
    const rect = rectOf(c);
    if (!rect || depth > 20)
      return void 0;
    const parent = c.parentRef ? byRef.get(c.parentRef) : void 0;
    if (parent?.type === "FlexContainer")
      return rect.fillWidth === false && typeof rect.widthPx === "number" ? rect.widthPx : void 0;
    if (typeof rect.width !== "number")
      return void 0;
    if (!c.parentRef && !c.parent)
      return rect.width * VIEWER_COLUMN_PX;
    const outer = parent ? drawnWidth(parent, depth + 1) : void 0;
    return outer === void 0 ? void 0 : rect.width / GRID_COLUMNS2 * outer;
  };
  for (const c of components) {
    if (!c || !c.type?.startsWith("Shad"))
      continue;
    const rect = rectOf(c);
    if (!rect || typeof rect.height !== "number")
      continue;
    const width = drawnWidth(c);
    if (width === void 0 && WIDTH_SENSITIVE.has(c.type))
      continue;
    const props2 = c.properties ?? {};
    const defaults = packDefaultDefinition(c.type)?.properties ?? {};
    const raw = (key2) => {
      const v = asText(valueOf2(key2 in props2 ? props2[key2] : defaults[key2]));
      return key2 in props2 || v !== void 0 && v !== "" ? v : void 0;
    };
    const input = {
      type: c.type,
      widthPx: width ?? 300,
      attr: raw,
      has: (key2) => key2 in props2 && (asText(valueOf2(props2[key2])) ?? "").trim() !== "",
      text: (key2) => {
        const t = raw(key2);
        if (t === void 0)
          return void 0;
        const bound = t.includes("{{");
        return { text: t.replace(/\{\{[\s\S]*?\}\}/g, "00000000"), bound };
      },
      count: (key2) => listCount(raw(key2)),
      itemsHave: (key2, field) => new RegExp(`["']?${field}["']?\\s*:\\s*(?!["']{2}|null\\b)`).test(raw(key2) ?? "")
    };
    const drawn = drawnPackHeight(input);
    if (!drawn?.exact || drawn.height === rect.height)
      continue;
    const parent = c.parentRef ? byRef.get(c.parentRef) : void 0;
    const was = rect.height;
    [c.layout, c.layouts?.desktop].forEach((r) => {
      if (r && typeof r.height === "number")
        r.height = drawn.height;
    });
    const moved = parent?.type === "FlexContainer" ? 0 : moveBelow(components, c, was, drawn.height);
    notes.push({ component: c, was, moved });
  }
  return notes;
}
function reportPackHeights(notes, warnings) {
  for (const { component: c, was, moved } of notes) {
    const now = Number((c.layouts?.desktop ?? c.layout)?.height);
    if (!Number.isFinite(now) || now === was)
      continue;
    warnings.push(`${c.type} "${c.name}" was ${was}px tall; it is now ${now}px, the height the app draws it at (it fits its content there), so the editor draws it the same${moved ? ` (${moved} component${moved > 1 ? "s" : ""} below it moved ${now < was ? "up" : "down"} ${Math.abs(now - was)}px)` : ""}.`);
  }
}
var FIELD_TYPES = /* @__PURE__ */ new Set([
  "ShadInput",
  "ShadSelect",
  "ShadDatePicker",
  "ShadDateTimePicker",
  "ShadTimePicker",
  "ShadCombobox",
  "ShadMultiselect",
  "ShadNumberInput",
  "ShadCurrencyInput",
  "ShadPhoneInput",
  "ShadPasswordInput",
  "ShadTagsInput",
  "ShadColorPicker",
  "ShadSlider"
]);
var ACTION_TYPES = /* @__PURE__ */ new Set(["ShadButton", "ShadButtonGroup", "ShadDropdownMenu"]);
var INLINE_TYPES = /* @__PURE__ */ new Set([
  ...FIELD_TYPES,
  ...ACTION_TYPES,
  "ShadBadge",
  "ShadText",
  "ShadToggleGroup",
  "ShadSwitch",
  "ShadCheckbox",
  "ShadLink",
  "ShadIcon",
  "ShadTags",
  "ShadSpinner"
]);
var valueOf3 = (entry) => entry && typeof entry === "object" && !Array.isArray(entry) && "value" in entry ? entry.value : entry;
var text2 = (entry) => {
  const v = valueOf3(entry);
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
};
var props = (component) => component.properties && typeof component.properties === "object" ? component.properties : {};
var prop2 = (component, key2) => props(component)[key2];
var styleText = (component, key2) => text2(component.styles && typeof component.styles === "object" ? component.styles[key2] : void 0);
var refOf2 = (component) => component.clientRef ?? component.name;
var setProp = (component, key2, value) => {
  const current = props(component)[key2];
  component.properties = {
    ...props(component),
    [key2]: current && typeof current === "object" && !Array.isArray(current) ? { ...current, value } : { value }
  };
};
var isRow = (component) => component.type === "FlexContainer" && text2(prop2(component, "direction")) === "row";
var isLabelledField = (component) => FIELD_TYPES.has(component.type) && text2(prop2(component, "label")) !== "";
var isSurface = (component) => {
  if (component.type !== "FlexContainer")
    return false;
  if (text2(prop2(component, "cardStyle")) === "shadcnCard")
    return true;
  const background = styleText(component, "backgroundColor").toLowerCase();
  return background !== "" && background !== "transparent" && !/^#[0-9a-f]{6}00$/.test(background);
};
var isTitle = (component, children) => component.type === "ShadHeading" || component.type === "FlexContainer" && !isRow(component) && children(refOf2(component) ?? "").some((inner) => inner.type === "ShadHeading");
var HEADING_PX = { h1: 36, h2: 30, h3: 24, h4: 20 };
var headingLineWidth = (component) => {
  const raw = text2(prop2(component, "text"));
  if (!raw || raw.includes("{{"))
    return null;
  const size = HEADING_PX[text2(prop2(component, "level"))] ?? HEADING_PX.h2;
  return Math.ceil(raw.length * size * (size >= 36 ? 0.6 : 0.56) + 8);
};
var fixedRects = (component) => [component.layout, component.layouts?.desktop].filter((rect) => !!rect && rect.fillWidth === false && typeof rect.widthPx === "number");
var META_TYPES = /* @__PURE__ */ new Set(["ShadText", "ShadBadge", "ShadTags"]);
var shownText = (raw) => raw.replace(/\{\{([\s\S]*?)\}\}/g, (_, code) => {
  const words = [...code.matchAll(/'([^']*)'|"([^"]*)"|`([^`$]*)`/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? "");
  if (!words.length)
    return "0000";
  const values = code.split(/'[^']*'|"[^"]*"|`[^`$]*`/).filter((part) => /[A-Za-z0-9_)\]]/.test(part)).length;
  return words.join("") + "00".repeat(Math.max(1, values));
});
var PAGE_MARGIN = 24;
var LABELLED_FIELD_TYPES = /* @__PURE__ */ new Set([
  "ShadInput",
  "ShadSelect",
  "ShadMultiSelect",
  "ShadCombobox",
  "ShadCurrencyInput",
  "ShadNumberInput",
  "ShadDatePicker",
  "ShadDateRangePicker",
  "ShadTimePicker",
  "ShadPhoneInput",
  "ShadEmailInput",
  "ShadPasswordInput"
]);
function polishFlexRows(input) {
  const warnings = [];
  if (!Array.isArray(input) || !input.length)
    return { components: Array.isArray(input) ? [...input] : [], warnings };
  const components = input.map((component) => component && typeof component === "object" ? {
    ...component,
    properties: { ...props(component) },
    ...component.layout ? { layout: { ...component.layout } } : {},
    ...component.layouts ? {
      layouts: {
        ...component.layouts,
        ...component.layouts.desktop ? { desktop: { ...component.layouts.desktop } } : {}
      }
    } : {}
  } : component);
  const childrenOf = (ref) => components.filter((component) => component && component.parentRef === ref && !component.slotName);
  const DIALOG_TYPES2 = /* @__PURE__ */ new Set(["ShadDialog", "ModalV2", "Modal"]);
  const isRootLevel = (c) => !c.parentRef && !c.parent;
  const topOf = (c) => Number(c.layout?.top ?? c.layouts?.desktop?.top);
  for (const host of [...components]) {
    if (!host || host.type !== "FlexContainer" || !isRootLevel(host))
      continue;
    const ref = refOf2(host);
    const inner = components.filter((c) => c && c.parentRef === ref);
    if (!inner.length || !inner.every((c) => DIALOG_TYPES2.has(c.type)))
      continue;
    inner.forEach((dialog) => {
      delete dialog.parentRef;
      delete dialog.slotName;
    });
    components.splice(components.indexOf(host), 1);
    const hostTop = topOf(host);
    const below = components.filter((c) => c && isRootLevel(c) && !DIALOG_TYPES2.has(c.type) && topOf(c) > hostTop);
    const nextTop = below.length ? Math.min(...below.map(topOf)) : NaN;
    const lift = Number.isFinite(hostTop) && Number.isFinite(nextTop) ? nextTop - hostTop : 0;
    if (lift > 0) {
      below.forEach((c) => {
        [c.layout, c.layouts?.desktop].forEach((rect) => {
          if (rect && typeof rect.top === "number")
            rect.top -= lift;
        });
      });
    }
    warnings.push(`"${host.name}" held only dialogs, which draw nothing until opened, so it showed as an empty band; the dialogs now sit at the page root, the container is gone${lift > 0 ? ` and the sections below moved up ${lift}px` : ""}.`);
  }
  for (const root of components) {
    if (!root || root.type !== "FlexContainer" || root.parentRef || root.parent)
      continue;
    const dynamic = text2(prop2(root, "dynamicHeight")).replace(/[{}\s]/g, "");
    if (dynamic === "true")
      continue;
    setProp(root, "dynamicHeight", "{{true}}");
  }
  for (const root of components) {
    if (!root || root.type !== "FlexContainer" || root.parentRef || root.parent)
      continue;
    const rect = root.layouts?.desktop ?? root.layout;
    if (!rect || typeof rect.left !== "number" || typeof rect.width !== "number")
      continue;
    if (rect.width < 39 || rect.left >= 2 && rect.left + rect.width <= 41)
      continue;
    const band = styleText(root, "backgroundColor").toLowerCase();
    if (band && band !== "transparent" && !band.startsWith("var(--cc-appbackground"))
      continue;
    const raw = text2(prop2(root, "padding"));
    const padding = raw === "" ? 12 : Number(raw) || 0;
    if (padding >= PAGE_MARGIN)
      continue;
    setProp(root, "padding", PAGE_MARGIN);
  }
  const heightOf2 = (c) => Number(c.layout?.height ?? c.layouts?.desktop?.height ?? NaN);
  for (const sheet of components) {
    if (!sheet || sheet.type !== "ShadDialog" || text2(prop2(sheet, "variant")) !== "sheet")
      continue;
    if (["xl", "fullscreen"].includes(text2(prop2(sheet, "size"))))
      continue;
    const descendants = [];
    const queue = [refOf2(sheet)];
    while (queue.length && descendants.length < 400) {
      const parent = queue.shift();
      for (const c of components) {
        if (c && parent && c.parentRef === parent) {
          descendants.push(c);
          queue.push(refOf2(c));
        }
      }
    }
    const pairRow = descendants.find((c) => isRow(c) && components.filter((x) => x && x.parentRef === refOf2(c) && FIELD_TYPES.has(x.type)).length >= 2);
    if (!pairRow)
      continue;
    setProp(sheet, "size", "xl");
    warnings.push(`Sheet "${sheet.name}" holds fields side by side ("${pairRow.name}"); it now opens at the wide size (xl, 640px).`);
  }
  for (const container of components) {
    if (!container || !isRow(container))
      continue;
    const ref = refOf2(container);
    if (!ref)
      continue;
    let children = childrenOf(ref);
    const label0 = container.name ?? ref;
    children.forEach((card, i) => {
      const next2 = children[i + 1];
      if (!next2 || !isSurface(card) || !text2(prop2(card, "cardTitle")))
        return;
      const cardRef = refOf2(card);
      if (!cardRef || childrenOf(cardRef).length)
        return;
      if (next2.type === "FlexContainer" || ACTION_TYPES.has(next2.type))
        return;
      next2.parentRef = cardRef;
      const order = valueOf3(prop2(container, "childOrder"));
      if (Array.isArray(order)) {
        setProp(container, "childOrder", order.filter((entry) => entry !== refOf2(next2) && entry !== next2.name));
      }
      warnings.push(`"${next2.name}" sat beside the empty card "${card.name}" in row "${label0}"; it is now inside the card.`);
    });
    children = childrenOf(ref);
    if (!isSurface(container) && !text2(prop2(container, "cardTitle"))) {
      const rects = [container.layout, container.layouts?.desktop].filter((rect) => !!rect && typeof rect.height === "number");
      const tallest = Math.max(0, ...children.map((c) => Number(c.layout?.height ?? c.layouts?.desktop?.height ?? 0)).filter(Number.isFinite));
      const rawPadding = text2(prop2(container, "padding"));
      const padding = rawPadding === "" ? 12 : Number(rawPadding) || 0;
      const needed = tallest > 0 ? tallest + padding * 2 + 6 : 0;
      if (needed && rects.length && rects.some((rect) => rect.height < needed)) {
        rects.forEach((rect) => {
          rect.height = Math.max(rect.height, needed);
        });
        warnings.push(`Row "${label0}" was shorter than its tallest child; its height is now ${needed}.`);
      }
    }
    const lone = children.length === 1 ? children[0] : void 0;
    if (lone && lone.type === "ShadButton" && ["flex-end", "end", "center"].includes(text2(prop2(container, "justifyContent")))) {
      const rects = [lone.layout, lone.layouts?.desktop].filter((rect) => !!rect && rect.fillWidth !== false);
      if (rects.length) {
        const caption = text2(prop2(lone, "text")) || text2(prop2(lone, "label"));
        const own = rects.map((rect) => rect.widthPx).find((w) => typeof w === "number" && w > 0);
        const width = own ?? Math.max(96, Math.ceil(caption.length * 8 + (text2(prop2(lone, "icon")) ? 64 : 40)));
        rects.forEach((rect) => {
          rect.fillWidth = false;
          rect.widthPx = width;
        });
        warnings.push(`"${lone.name}" filled row "${label0}" and drew at its left; it now keeps its own width (${width}px).`);
      }
    }
    if (children.length < 2)
      continue;
    const fullWidth = children.filter((child) => {
      const rect = child.layout ?? child.layouts?.desktop;
      return rect && typeof rect.width === "number" && rect.width >= 40 && rect.fillWidth !== true && typeof rect.widthPx !== "number";
    });
    if (fullWidth.length >= 2) {
      fullWidth.forEach((child) => {
        [child.layout, child.layouts?.desktop].forEach((rect) => {
          if (rect)
            rect.fillWidth = true;
        });
      });
      warnings.push(`Row "${label0}": ${fullWidth.length} children were each drawn full-width; they now share the row.`);
    }
    const placed = ["flex-end", "end", "center", "space-between", "space-around", "space-evenly"].includes(text2(prop2(container, "justifyContent")));
    if (placed || children.some((child) => !ACTION_TYPES.has(child.type))) {
      const hasTitle = children.some((c) => isTitle(c, childrenOf));
      for (const child of children) {
        const inline = child.type === "ShadButton" || hasTitle && ["ShadBadge", "ShadTags", "ShadLink"].includes(child.type);
        if (!inline)
          continue;
        const rects = [child.layout, child.layouts?.desktop].filter((rect) => !!rect && rect.fillWidth !== false);
        if (!rects.length)
          continue;
        const caption = text2(prop2(child, "text")) || text2(prop2(child, "label"));
        const fitted = child.type === "ShadButton" ? Math.max(96, Math.ceil(caption.length * 8 + (text2(prop2(child, "icon")) ? 64 : 40))) : Math.min(320, Math.max(48, Math.ceil(caption.length * 7 + 28)));
        const own = rects.map((rect) => rect.widthPx).find((w) => typeof w === "number" && w > 0);
        const width = own ?? fitted;
        rects.forEach((rect) => {
          rect.fillWidth = false;
          rect.widthPx = width;
        });
        warnings.push(`"${child.name}" in row "${label0}" filled the row's width; it now keeps its own (${width}px).`);
      }
    }
    if (children.some((c) => isTitle(c, childrenOf))) {
      const buttonWidth = (button) => {
        const own = [button.layout, button.layouts?.desktop].map((rect) => rect?.widthPx).find((w) => typeof w === "number" && w > 0);
        if (own)
          return own;
        const caption = text2(prop2(button, "text")) || text2(prop2(button, "label"));
        return Math.max(96, Math.ceil(caption.length * 8 + (text2(prop2(button, "icon")) ? 64 : 40)));
      };
      const actionGroup = (c) => {
        if (c.type !== "FlexContainer" || isSurface(c))
          return null;
        const inner = childrenOf(refOf2(c) ?? "");
        return inner.length && inner.every((b) => ACTION_TYPES.has(b.type)) ? inner : null;
      };
      const metaWidth = (c) => {
        if (c.type !== "ShadText" && c.type !== "ShadBadge")
          return null;
        const shown2 = shownText(text2(prop2(c, "text")));
        return shown2.length <= 40 ? Math.min(320, Math.max(48, Math.ceil(shown2.length * 7 + 28))) : null;
      };
      const metaActionGroup = (c) => {
        if (c.type !== "FlexContainer" || isSurface(c) || !isRow(c))
          return null;
        const inner = childrenOf(refOf2(c) ?? "");
        return inner.some((b) => ACTION_TYPES.has(b.type)) && inner.some((b) => !ACTION_TYPES.has(b.type)) && inner.every((b) => ACTION_TYPES.has(b.type) || metaWidth(b) !== null) ? inner : null;
      };
      for (const c of children) {
        const inner = actionGroup(c);
        if (inner && inner.length >= 2 && props(c).flexWrap === void 0)
          setProp(c, "flexWrap", "{{false}}");
        if (!inner || inner.length < 2 || isRow(c))
          continue;
        setProp(c, "direction", "row");
        if (text2(prop2(c, "gap")) === "")
          setProp(c, "gap", 8);
        warnings.push(`"${c.name}" stacked its ${inner.length} buttons beside a title; it now lays them out in a row.`);
      }
      const [first, ...rest] = children;
      if (first && rest.length && isTitle(first, childrenOf) && text2(prop2(container, "justifyContent")) === "space-between") {
        const fills = (c) => [c.layout, c.layouts?.desktop].filter((rect) => !!rect && rect.fillWidth !== false);
        for (const c of rest) {
          const rects = fills(c);
          if (!rects.length)
            continue;
          let width = null;
          const inner = actionGroup(c);
          const mixed = inner ? null : metaActionGroup(c);
          if (mixed) {
            const rawGap = text2(prop2(c, "gap"));
            const gap = rawGap === "" ? 8 : Number(rawGap) || 0;
            const rawPad = text2(prop2(c, "padding"));
            const pad = rawPad === "" ? 12 : Number(rawPad) || 0;
            width = mixed.reduce((sum, b) => sum + (ACTION_TYPES.has(b.type) ? buttonWidth(b) : metaWidth(b) ?? 0), 0) + gap * (mixed.length - 1) + pad * 2 + 4;
            for (const meta of mixed) {
              const own2 = metaWidth(meta);
              if (own2 === null)
                continue;
              if (meta.type === "ShadText" && ["", "left"].includes(styleText(meta, "textAlign"))) {
                meta.styles = { ...meta.styles ?? {}, textAlign: { value: "right" } };
              }
              [meta.layout, meta.layouts?.desktop].forEach((rect) => {
                if (!rect)
                  return;
                rect.fillWidth = false;
                rect.widthPx = own2;
              });
            }
          } else if (inner) {
            const rawGap = text2(prop2(c, "gap"));
            const gap = rawGap === "" ? 8 : Number(rawGap) || 0;
            const rawPad = text2(prop2(c, "padding"));
            const pad = rawPad === "" ? 12 : Number(rawPad) || 0;
            width = inner.reduce((sum, b) => sum + buttonWidth(b), 0) + gap * (inner.length - 1) + pad * 2 + 4;
          } else if (c.type === "ShadText") {
            const shown2 = shownText(text2(prop2(c, "text")));
            if (shown2.length <= 40)
              width = Math.min(320, Math.max(48, Math.ceil(shown2.length * 7 + 28)));
          }
          if (width === null)
            continue;
          const own = width;
          rects.forEach((rect) => {
            rect.fillWidth = false;
            rect.widthPx = own;
          });
          warnings.push(`"${c.name}" in header "${label0}" filled half the header; it now keeps its own width (${own}px).`);
        }
        const titleRects = [first.layout, first.layouts?.desktop].filter(
          // A title the build sized itself (fillWidth:false) keeps its width; space-between still puts the rest right.
          (rect) => !!rect && rect.fillWidth === void 0
        );
        if (titleRects.length && rest.every((c) => !fills(c).length)) {
          titleRects.forEach((rect) => {
            rect.fillWidth = true;
          });
        }
      }
    }
    const align = text2(prop2(container, "alignItems"));
    const label2 = container.name ?? ref;
    if (children.every((child) => INLINE_TYPES.has(child.type)) && children.some(isLabelledField) && children.some((child) => !isLabelledField(child)) && align !== "flex-end") {
      setProp(container, "alignItems", "flex-end");
      warnings.push(`Row "${label2}" has labelled fields beside other controls; its alignItems is now "flex-end" so the field boxes and the controls beside them line up along the bottom.`);
    }
    if (children.length >= 2 && children.every(isLabelledField) && text2(prop2(container, "alignItems")) !== "flex-end") {
      setProp(container, "alignItems", "flex-end");
      warnings.push(`Row "${label2}" holds only labelled fields; its alignItems is now "flex-end" so the field boxes line up along the bottom.`);
    }
    if (children.some(isLabelledField) && children.some((child) => ACTION_TYPES.has(child.type)) && !children.every((child) => INLINE_TYPES.has(child.type)) && align !== "flex-end") {
      setProp(container, "alignItems", "flex-end");
      warnings.push(`Row "${label2}" has a labelled field beside buttons; its alignItems is now "flex-end" so the buttons line up with the field box.`);
    }
    if (text2(prop2(container, "alignItems")) === "flex-end" && children.some(isLabelledField)) {
      for (const button of children.filter((child) => child.type === "ShadButton")) {
        const rects = [button.layout, button.layouts?.desktop].filter((rect) => !!rect);
        if (!rects.length || !rects.some((rect) => typeof rect.height === "number" && rect.height < 40))
          continue;
        rects.forEach((rect) => {
          if (typeof rect.height === "number" && rect.height < 40)
            rect.height = 40;
        });
        warnings.push(`"${button.name}" in row "${label2}" is now 40px tall so its box matches the field box beside it.`);
      }
    }
    if (children.length >= 2 && children.every(isSurface) && align !== "stretch") {
      setProp(container, "alignItems", "stretch");
      warnings.push(`Row "${label2}" holds ${children.length} cards; its alignItems is now stretch so they share one height.`);
    }
    if (children.length >= 2 && children.every(isSurface) && text2(prop2(container, "alignItems")) === "stretch") {
      const contentOf = (card) => {
        const inner = childrenOf(refOf2(card) ?? "");
        const heights = inner.map((c) => Number(c.layout?.height ?? c.layouts?.desktop?.height ?? NaN));
        if (!inner.length || heights.some((h) => !Number.isFinite(h)))
          return { height: NaN };
        const rawGap = text2(prop2(card, "gap"));
        const gap = rawGap === "" ? 8 : Number(rawGap) || 0;
        return { height: heights.reduce((a, b) => a + b, 0) + gap * (inner.length - 1), last: inner[inner.length - 1] };
      };
      const contents = children.map(contentOf);
      const tallest = Math.max(...contents.map((c) => Number.isFinite(c.height) ? c.height : 0));
      contents.forEach(({ height, last }) => {
        if (!last || !Number.isFinite(height) || tallest - height < 24 || !/Chart$/.test(last.type))
          return;
        const grow = tallest - height;
        [last.layout, last.layouts?.desktop].forEach((rect) => {
          if (rect && typeof rect.height === "number")
            rect.height += grow;
        });
        warnings.push(`Chart "${last.name}" grows by ${grow}px to fill its card, which is stretched to the tallest card in row "${label2}".`);
      });
    }
    if (children.length >= 2 && children.some(isSurface)) {
      const rawGap = text2(prop2(container, "gap"));
      const gap = rawGap === "" ? 16 : Number(rawGap) || 0;
      const share = Math.floor((1280 - gap * (children.length - 1)) / children.length);
      for (const card of children) {
        if (!isSurface(card))
          continue;
        const rawPad = text2(prop2(card, "padding"));
        const pad = rawPad === "" ? 12 : Number(rawPad) || 0;
        const own = fixedRects(card).map((rect) => rect.widthPx).find((w) => typeof w === "number" && w > 0);
        const available = (own ?? share) - pad * 2 - 4;
        for (const table of childrenOf(refOf2(card) ?? "")) {
          if (table.type !== "Table")
            continue;
          const columns = valueOf3(prop2(table, "columns"));
          if (!Array.isArray(columns))
            continue;
          const visible = columns.filter((c) => !!c && typeof c === "object" && c.columnVisibility !== false);
          const size = (c) => Number.isFinite(Number(c.columnSize)) ? Number(c.columnSize) : 120;
          const total = visible.reduce((sum, c) => sum + size(c), 0);
          if (!visible.length || total <= available)
            continue;
          if (available / visible.length < 80) {
            warnings.push(`Table "${table.name}" shows ${visible.length} columns (${total}px) in a card about ${available}px wide; show fewer columns there (the 3 or 4 this card is about), or give the card more of the row.`);
            continue;
          }
          const factor = available / total;
          setProp(table, "columns", columns.map((c) => visible.includes(c) ? {
            ...c,
            // A button column keeps room for its button's label.
            columnSize: Math.max(c.columnType === "button" ? 110 : 64, Math.floor(size(c) * factor))
          } : c));
          warnings.push(`Table "${table.name}" in a narrow card: its columns (${total}px) now fit the card's ${available}px.`);
        }
      }
    }
    for (const child of children) {
      if (child.type !== "ShadHeading")
        continue;
      const needed = headingLineWidth(child);
      if (!needed)
        continue;
      const rects = fixedRects(child);
      if (!rects.length || rects.every((rect) => (rect.widthPx ?? 0) >= needed))
        continue;
      rects.forEach((rect) => {
        rect.widthPx = Math.max(rect.widthPx ?? 0, needed);
      });
      warnings.push(`Heading "${child.name}" in row "${label2}" was too narrow for one line of its text; its widthPx is now ${needed}.`);
    }
    if (children.some((child) => child.type === "ShadHeading") && children.some((child) => META_TYPES.has(child.type)) && children.every((child) => child.type === "ShadHeading" || META_TYPES.has(child.type)) && ["", "center", "flex-start"].includes(align)) {
      setProp(container, "alignItems", "last baseline");
      warnings.push(`Row "${label2}" pairs a heading with meta text; its alignItems is now "last baseline" so they share a baseline.`);
    }
    if (text2(prop2(container, "justifyContent")) === "space-between" && children.length >= 3) {
      const first = children[0];
      if (isTitle(first, childrenOf)) {
        const rects = [first.layout, first.layouts?.desktop].filter((rect) => !!rect && rect.fillWidth !== true);
        if (rects.length) {
          rects.forEach((rect) => {
            rect.fillWidth = true;
          });
          warnings.push(`Row "${label2}": the title now takes the free space, so the items after it sit together at the right of the header.`);
        }
      }
    }
    const authored = valueOf3(prop2(container, "childOrder"));
    const authoredOrder = Array.isArray(authored) ? authored.filter((entry) => typeof entry === "string") : null;
    const ordered = authoredOrder?.length ? [
      ...authoredOrder.map((name) => children.find((child) => refOf2(child) === name || child.name === name)).filter((child) => !!child),
      ...children.filter((child) => !authoredOrder.includes(refOf2(child) ?? "") && !authoredOrder.includes(child.name))
    ] : children;
    const titleIndex = ordered.findIndex((child) => isTitle(child, childrenOf));
    if (titleIndex <= 0)
      continue;
    const before = ordered.slice(0, titleIndex);
    const leadingActions = before.filter((child) => ACTION_TYPES.has(child.type));
    if (!leadingActions.length)
      continue;
    const next = [
      ...before.filter((child) => !ACTION_TYPES.has(child.type)),
      ...ordered.slice(titleIndex),
      ...leadingActions
    ];
    if (authoredOrder?.length) {
      setProp(container, "childOrder", next.map((child) => authoredOrder.includes(child.name) ? child.name : refOf2(child)));
    } else {
      const slots = components.map((component, index) => component && component.parentRef === ref && !component.slotName ? index : -1).filter((index) => index >= 0);
      slots.forEach((slot, i) => {
        components[slot] = next[i];
      });
    }
    warnings.push(`Row "${label2}": ${leadingActions.map((child) => `"${child.name}"`).join(", ")} came before the title; moved after it so the page action sits at the right of the header.`);
  }
  const firstOf = (parent) => {
    const inner = childrenOf(refOf2(parent) ?? "");
    const authored = valueOf3(prop2(parent, "childOrder"));
    const first = Array.isArray(authored) && typeof authored[0] === "string" ? inner.find((c) => refOf2(c) === authored[0] || c.name === authored[0] || c.id === authored[0]) : void 0;
    return first ?? inner[0];
  };
  for (const card of components) {
    if (!card || !isSurface(card))
      continue;
    const title = text2(prop2(card, "cardTitle"));
    if (!title)
      continue;
    let node = firstOf(card);
    for (let depth = 0; node && node.type === "FlexContainer" && !isSurface(node) && depth < 2; depth++)
      node = firstOf(node);
    if (node?.type !== "ShadHeading")
      continue;
    warnings.push(`Card "${card.name}" is already titled "${title}" and opens with heading "${text2(prop2(node, "text"))}": two section titles stacked read as a card in a card. Keep one: drop the heading (and its caption) or clear cardTitle and cardExtra.`);
  }
  const dialogRefs = new Set(components.filter((c) => c && (c.type === "ShadDialog" || c.type === "ModalV2")).map((c) => refOf2(c)).filter(Boolean));
  for (const heading of components) {
    if (!heading || heading.type !== "ShadHeading" || heading.slotName !== "header" || !dialogRefs.has(heading.parentRef))
      continue;
    const level = text2(prop2(heading, "level")) || "h2";
    if (level !== "h1" && level !== "h2")
      continue;
    setProp(heading, "level", "h3");
    warnings.push(`Heading "${heading.name}" in a dialog header was ${level}; it is now h3, so a long title fits the header.`);
  }
  const DIALOGS = /* @__PURE__ */ new Set(["ShadDialog", "ModalV2"]);
  for (const dialog of [...components]) {
    if (!dialog || !DIALOGS.has(dialog.type))
      continue;
    const ref = refOf2(dialog);
    if (!ref)
      continue;
    const bare = components.filter((c) => c && c.parentRef === ref && c.slotName === "footer" && c.type === "ShadButton");
    if (bare.length < 2 || components.some((c) => c && c.parentRef === ref && c.slotName === "footer" && c.type !== "ShadButton"))
      continue;
    const rowRef = `${ref}FooterRow`;
    if (components.some((c) => c && refOf2(c) === rowRef))
      continue;
    const leftOf = (c) => Number(c.layout?.left ?? c.layouts?.desktop?.left ?? 0);
    const ordered = [...bare].sort((a, b) => leftOf(a) - leftOf(b));
    const top = Math.min(...bare.map((c) => Number(c.layout?.top ?? c.layouts?.desktop?.top ?? 0)));
    const row = {
      name: rowRef,
      type: "FlexContainer",
      clientRef: rowRef,
      parentRef: ref,
      slotName: "footer",
      properties: {
        direction: { value: "row" },
        justifyContent: { value: "flex-end" },
        alignItems: { value: "center" },
        gap: { value: 8 },
        padding: { value: 0 },
        dynamicHeight: { value: "{{true}}" }
      },
      layout: { top: Number.isFinite(top) ? top : 0, left: 0, width: 43, height: 48 }
    };
    for (const button of ordered) {
      button.parentRef = rowRef;
      delete button.slotName;
      const label2 = text2(prop2(button, "text"));
      const width = Math.max(80, Math.ceil(label2.length * 8 + (text2(prop2(button, "icon")) ? 64 : 40)));
      [button.layout, button.layouts?.desktop].forEach((rect) => {
        if (!rect)
          return;
        rect.fillWidth = false;
        rect.widthPx = rect.widthPx ?? width;
      });
    }
    const firstIndex = Math.min(...ordered.map((c) => components.indexOf(c)));
    const rest = components.filter((c) => !ordered.includes(c));
    rest.splice(Math.min(firstIndex, rest.length), 0, row, ...ordered);
    components.splice(0, components.length, ...rest);
    warnings.push(`Dialog "${dialog.name}": its ${ordered.length} footer buttons were placed by hand with uneven gaps; they now sit in one row "${rowRef}" at the right, in their order (${ordered.map((c) => `"${c.name}"`).join(", ")}).`);
  }
  const packNotes = fitPackHeights(components);
  const fittedBoxes = fitFlexHeights(components, warnings);
  reportPackHeights(packNotes, warnings);
  {
    const gridCards = components.filter((c) => c && !c.parentRef && !c.parent && (isSurface(c) || c.type === "ShadStat") && !fittedBoxes.has(c) && Number.isFinite(heightOf2(c)));
    const lines = /* @__PURE__ */ new Map();
    for (const c of gridCards) {
      const top = Number(c.layout?.top ?? c.layouts?.desktop?.top);
      if (!Number.isFinite(top))
        continue;
      const key2 = [...lines.keys()].find((t) => Math.abs(t - top) <= 10) ?? top;
      lines.set(key2, [...lines.get(key2) ?? [], c]);
    }
    for (const line of lines.values()) {
      if (line.length < 2)
        continue;
      const tallest = Math.max(...line.map(heightOf2));
      if (line.every((c) => heightOf2(c) === tallest))
        continue;
      for (const c of line) {
        [c.layout, c.layouts?.desktop].forEach((rect) => {
          if (rect && typeof rect.height === "number")
            rect.height = tallest;
        });
      }
      warnings.push(`Cards ${line.map((c) => `"${c.name}"`).join(", ")} sit side by side; they now share one height (${tallest}px).`);
    }
  }
  const flexRefs = new Set(components.filter((c) => c?.type === "FlexContainer").map((c) => refOf2(c)));
  const rectOf = (c) => c.layouts?.desktop ?? c.layout;
  const placeOf = (c) => String(c.parentRef ?? c.parent ?? "") + "|" + String(c.slotName ?? "");
  const labelled = components.filter((c) => {
    const label2 = props(c).label?.value;
    return c && LABELLED_FIELD_TYPES.has(c.type) && typeof label2 === "string" && label2.trim() !== "" && rectOf(c) && !flexRefs.has(String(c.parentRef ?? ""));
  });
  for (const button of components) {
    if (!button || button.type !== "ShadButton" || flexRefs.has(String(button.parentRef ?? "")))
      continue;
    const b = rectOf(button);
    if (!b || typeof b.top !== "number" || (b.height ?? 0) > 44)
      continue;
    const field = labelled.find((f) => {
      const r = rectOf(f);
      if (placeOf(f) !== placeOf(button) || typeof r.top !== "number")
        return false;
      const sameRow = b.top >= r.top - 4 && b.top < r.top + 18;
      const apart = (b.left ?? 0) >= (r.left ?? 0) + (r.width ?? 0) || (r.left ?? 0) >= (b.left ?? 0) + (b.width ?? 0);
      return sameRow && apart;
    });
    if (!field)
      continue;
    const top = rectOf(field).top + 22;
    b.top = top;
    b.height = 40;
    warnings.push(`Button "${button.name}" sat at the top of a row of labelled fields; it now sits at ${top} (40px tall) so it lines up with the field boxes, not the labels.`);
  }
  const accents = unifyChartAccents(components);
  const tables = packTableLook(accents.components);
  return { components: tables.components, warnings: [...warnings, ...accents.warnings, ...tables.warnings] };
}
var AUTO_MATERIALIZE_DEFAULTS = /* @__PURE__ */ new Set(["Kanban"]);
var TOOLJET_DESKTOP_GRID_COLUMNS = 43;
function wrappedValues(keys, defaults) {
  if (!keys?.length)
    return void 0;
  return Object.fromEntries(keys.map((key2) => [key2, { value: defaults[key2] ?? "" }]));
}
function childLayout(child, parentType, index) {
  const schema = getComponentSchema(child.componentName);
  if (parentType === "Kanban" && child.componentName === "Text") {
    return { top: index === 0 ? 12 : 44, left: 2, width: 39, height: child.layout?.height ?? 30 };
  }
  return {
    top: child.layout?.top ?? 0,
    left: child.layout?.left ?? 0,
    width: child.layout?.width ?? (schema?.defaultSize?.width ?? 1) * 100 / TOOLJET_DESKTOP_GRID_COLUMNS,
    height: child.layout?.height ?? schema?.defaultSize?.height ?? 40
  };
}
function childName(parentName, child, index) {
  const cardField = Object.values(child.defaultValue ?? {}).find((value) => typeof value === "string")?.match(/cardData\.([A-Za-z0-9_]+)/)?.[1];
  const baseRole = cardField ?? child.accessorKey ?? child.componentName;
  const role = baseRole.charAt(0).toUpperCase() + baseRole.slice(1) + (cardField ? "" : index + 1);
  return `${parentName}Card${role}`;
}
function materializeRequiredDefaultChildren(input) {
  const explicitParentRefs = new Set(input.flatMap((component) => component.parentRef && (!component.slotName || component.slotName === "body") ? [component.parentRef] : []));
  const components = [];
  const warnings = [];
  let materializedChildren = 0;
  input.forEach((original) => {
    if (!AUTO_MATERIALIZE_DEFAULTS.has(original.type)) {
      components.push(original);
      return;
    }
    const schema = getComponentSchema(original.type);
    const defaults = schema?.defaultChildren ?? [];
    if (!defaults.length || explicitParentRefs.has(componentRef(original))) {
      components.push(original);
      return;
    }
    const clientRef = componentRef(original);
    components.push(original);
    defaults.forEach((child, childIndex) => {
      const defaultValue = child.defaultValue ?? {};
      components.push({
        name: childName(original.name, child, childIndex),
        type: child.componentName,
        properties: wrappedValues(child.properties, defaultValue) ?? {},
        styles: wrappedValues(child.styles, defaultValue),
        layout: childLayout(child, original.type, childIndex),
        parentRef: clientRef
      });
    });
    materializedChildren += defaults.length;
    warnings.push(`Kanban "${original.name}" had no explicit card children; materialized ${defaults.length} catalog default children so cards render content. For wrapped multi-line card text, use add_components with a Kanban client_ref and an explicit Html child using the matching parent_ref.`);
  });
  return { components, warnings, materializedChildren };
}
function matchPlannedPage(pages, name, plannedNames, claimed = /* @__PURE__ */ new Set()) {
  const byName = pages.find((page) => page.name === name && !claimed.has(page.id));
  if (byName || name !== "Home" || pages.some((page) => page.name === "Home"))
    return byName;
  return pages.find((page) => page.handle === "home" && !claimed.has(page.id) && !plannedNames.has(page.name ?? ""));
}
function prepareQueryOptionsForWrite(kind, raw, subject) {
  const prefix = subject ? `${subject}: ` : "";
  const line = (text3) => subject ? `${prefix}${text3}` : text3.charAt(0).toUpperCase() + text3.slice(1);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { options: raw, errors: [line("options must be an object.")], warnings: [] };
  }
  const toggled = normalizeQueryToggles(raw);
  const warnings = [];
  const rewrite = toggleRewriteWarning(raw, toggled);
  if (rewrite)
    warnings.push(`${prefix}${rewrite}`);
  if (!kind) {
    return { options: toggled, errors: issueMessages(queryToggleIssues(toggled), subject), warnings };
  }
  const options = normalizeQueryOptions(kind, toggled);
  if (options !== toggled) {
    warnings.push(line(kind === "workflows" ? "normalized legacy workflow selectors to workflowId/workflowVersionId." : kind === "mongodb" ? "serialized MongoDB document fields to the JSON text expected by the plugin." : `rewrote the ${String(options.operation)} column map to ToolJet's {index: {column, value}} shape; the flat {column: value} form sends an empty body and fails at runtime.`));
  }
  const validation = validateQueryOptions(kind, options);
  warnings.push(...issueMessages(validation.warnings, subject));
  return { options, errors: issueMessages(validation.errors, subject), warnings, validation };
}
function expandQueryLifecycles(summary, lifecycles) {
  const queries = new Map(summary.queries.map((query) => [query.id, query]));
  const components = new Map(summary.pages.flatMap((page) => page.components).map((component) => [component.id, component]));
  const warnings = [];
  const events = [];
  const seenSources = /* @__PURE__ */ new Set();
  for (const lifecycle of lifecycles) {
    const query = queries.get(lifecycle.queryId);
    if (!query)
      throw new Error(`Query lifecycle source "${lifecycle.queryId}" does not exist.`);
    if (seenSources.has(lifecycle.queryId)) {
      throw new Error(`Query "${query.name ?? lifecycle.queryId}" has more than one lifecycle declaration in this batch.`);
    }
    seenSources.add(lifecycle.queryId);
    const sourceName = query.name ?? lifecycle.queryId;
    const refreshIds = unique$2(lifecycle.refreshQueryIds ?? [], `refresh query`, sourceName, warnings);
    if (refreshIds.includes(lifecycle.queryId)) {
      throw new Error(`Query "${sourceName}" cannot refresh itself after success: this repeats the query indefinitely, including any writes. Refresh a separate read query instead.`);
    }
    const clearIds = unique$2(lifecycle.clearComponentIds ?? [], `clear component`, sourceName, warnings);
    (lifecycle.beforeRefreshActions ?? []).forEach((action, index) => {
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: "data_query",
        trigger: "onDataQuerySuccess",
        action,
        name: `${sourceName} before refresh action ${index + 1}`
      });
    });
    for (const queryId of refreshIds) {
      const refresh = queries.get(queryId);
      if (!refresh)
        throw new Error(`Query "${sourceName}" lifecycle refresh target "${queryId}" does not exist.`);
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: "data_query",
        trigger: "onDataQuerySuccess",
        action: { actionId: "run-query", queryId, queryName: refresh.name ?? queryId },
        name: `Refresh ${refresh.name ?? queryId} after ${sourceName}`
      });
    }
    (lifecycle.successActions ?? []).forEach((action, index) => {
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: "data_query",
        trigger: "onDataQuerySuccess",
        action,
        name: `${sourceName} success action ${index + 1}`
      });
    });
    if (lifecycle.closeModalId) {
      const modal = components.get(lifecycle.closeModalId);
      if (!modal)
        throw new Error(`Query "${sourceName}" lifecycle modal "${lifecycle.closeModalId}" does not exist.`);
      if (modal.type !== "Modal" && !isModalV2Type(modal.type)) {
        throw new Error(`Query "${sourceName}" lifecycle close target "${modal.name ?? modal.id}" is ${modal.type ?? "unknown"}, not a Modal.`);
      }
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: "data_query",
        trigger: "onDataQuerySuccess",
        action: { actionId: "close-modal", modal: lifecycle.closeModalId },
        name: `Close ${modal.name ?? modal.id} after ${sourceName}`
      });
    }
    for (const componentId of clearIds) {
      const component = components.get(componentId);
      if (!component)
        throw new Error(`Query "${sourceName}" lifecycle clear target "${componentId}" does not exist.`);
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: "data_query",
        trigger: "onDataQuerySuccess",
        action: {
          actionId: "control-component",
          componentId,
          componentSpecificActionHandle: "clear",
          componentSpecificActionParams: []
        },
        name: `Clear ${component.name ?? componentId} after ${sourceName}`
      });
    }
    if (lifecycle.successAlert) {
      events.push(alertEvent(lifecycle.queryId, sourceName, "onDataQuerySuccess", lifecycle.successAlert, "success"));
    }
    (lifecycle.failureActions ?? []).forEach((action, index) => {
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: "data_query",
        trigger: "onDataQueryFailure",
        action,
        name: `${sourceName} failure action ${index + 1}`
      });
    });
    if (lifecycle.failureAlert) {
      events.push(alertEvent(lifecycle.queryId, sourceName, "onDataQueryFailure", lifecycle.failureAlert, "error"));
    }
  }
  return { events, warnings };
}
function alertEvent(queryId, queryName, trigger, alert, defaultType) {
  return {
    sourceId: queryId,
    sourceType: "data_query",
    trigger,
    action: { actionId: "show-alert", message: alert.message, alertType: alert.alertType ?? defaultType },
    name: trigger === "onDataQuerySuccess" ? `Confirm ${queryName}` : `${queryName} failed`
  };
}
function unique$2(values, label2, sourceName, warnings) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const value of values) {
    if (seen.has(value)) {
      warnings.push(`Query "${sourceName}" lifecycle listed ${label2} "${value}" more than once; duplicate ignored.`);
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}
function normalizePlannedLayouts(component) {
  const warnings = [];
  const label2 = `${component.type ?? "component"} "${component.name ?? "?"}"`;
  const targets = [];
  if (component.layout)
    targets.push(["layout", component.layout]);
  if (component.layouts?.desktop)
    targets.push(["desktop", component.layouts.desktop]);
  if (component.layouts?.mobile)
    targets.push(["mobile", component.layouts.mobile]);
  if (!targets.length)
    return { component, warnings };
  const textMinimum = component.type === "Text" ? minimumTextHeight(component) : void 0;
  const schema = component.type ? getComponentSchema(component.type) : void 0;
  const compactHeight = schema?.renderingHints?.compactFormHeight ? schema?.defaultSize?.height : void 0;
  const fixed = /* @__PURE__ */ new Map();
  for (const [name, rect] of targets) {
    if (typeof rect.height !== "number")
      continue;
    if (textMinimum !== void 0 && rect.height < textMinimum) {
      fixed.set(name, { ...rect, height: textMinimum });
      warnings.push(`${label2}: raised ${name} height ${rect.height}px to ${textMinimum}px so one line of text renders.`);
    } else if (compactHeight !== void 0 && rect.height > compactHeight) {
      fixed.set(name, { ...rect, height: compactHeight });
      warnings.push(`${label2}: lowered ${name} height ${rect.height}px to the standard single-line ${compactHeight}px (oversizing does not enlarge the value text; a top label renders outside the box).`);
    }
  }
  if (!fixed.size)
    return { component, warnings };
  const next = { ...component };
  if (fixed.has("layout"))
    next.layout = fixed.get("layout");
  if (fixed.has("desktop") || fixed.has("mobile")) {
    next.layouts = {
      ...component.layouts,
      ...fixed.has("desktop") ? { desktop: fixed.get("desktop") } : {},
      ...fixed.has("mobile") ? { mobile: fixed.get("mobile") } : {}
    };
  }
  return { component: next, warnings };
}
createRequire(import.meta.url);
function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function bindingBoolean(value) {
  return booleanBindingValue(value) ?? value;
}
function compactTheme(theme) {
  if (!theme)
    return null;
  return {
    ...typeof theme.id === "string" ? { id: theme.id } : {},
    ...typeof theme.name === "string" ? { name: theme.name } : {},
    ...typeof theme.isDefault === "boolean" ? { is_default: theme.isDefault } : {},
    ...typeof theme.isBasic === "boolean" ? { is_basic: theme.isBasic } : {},
    ...typeof theme.isDisabled === "boolean" ? { is_disabled: theme.isDisabled } : {}
  };
}
function projectAppSettings(snapshot) {
  const global = snapshot.global_settings ?? {};
  const properties = pageSettingProperties(snapshot);
  const disableMenu = asRecord(properties.disableMenu);
  const theme = asRecord(global.theme);
  return {
    app_id: snapshot.app_id,
    version_id: snapshot.version_id,
    canvas: {
      background_color: global.canvasBackgroundColor,
      max_width: {
        value: global.canvasMaxWidth,
        unit: global.canvasMaxWidthType
      },
      mode: global.appMode
    },
    theme: compactTheme(theme),
    // The saved component library (ToolJet UI 1.0 or 2.0); absent on apps from before the setting.
    component_library: global.componentLibrary,
    header: {
      hidden: properties.hideHeader,
      logo_hidden: properties.hideLogo,
      title: properties.name
    },
    navigation: {
      hidden: bindingBoolean(disableMenu.value ?? properties.disableMenu),
      position: properties.position,
      style: properties.style,
      collapsible: properties.collapsable
    }
  };
}
function pageSettingProperties(snapshot) {
  return asRecord(asRecord(snapshot.page_settings).properties);
}
function projectJavascriptRuntime(snapshot) {
  const global = snapshot.global_settings ?? {};
  const raw = asRecord(global.libraries).javascript;
  const entries = Array.isArray(raw) ? raw : [];
  const script = asRecord(global.preloadedScript).javascript;
  return {
    configuration_state: raw === void 0 || Array.isArray(raw) && !raw.length ? "not_configured" : Array.isArray(raw) ? "configured" : "unknown",
    total: Array.isArray(raw) ? raw.length : raw === void 0 ? 0 : null,
    truncated: entries.length > 32,
    libraries: entries.slice(0, 32).map((value) => {
      const lib = asRecord(value);
      let sourceUrl = null;
      let redacted = false;
      let https = false;
      try {
        if (typeof lib.url === "string" && lib.url.length <= 4096) {
          const url = new URL(lib.url);
          if (url.protocol === "https:" || url.protocol === "http:") {
            https = url.protocol === "https:";
            redacted = Boolean(url.username || url.password || url.search || url.hash);
            url.username = "";
            url.password = "";
            url.search = "";
            url.hash = "";
            sourceUrl = url.toString();
          }
        }
      } catch {
      }
      return {
        name: typeof lib.name === "string" ? lib.name.slice(0, 128) : null,
        enabled: typeof lib.enabled === "boolean" ? lib.enabled : null,
        source_url: sourceUrl,
        url_valid: sourceUrl !== null,
        url_redacted: redacted,
        https
      };
    }),
    preloaded_script_present: typeof script === "string" ? Boolean(script.trim()) : null,
    runtime_verified: false,
    guidance: "Configuration is not proof of successful loading, export names, worker/CSP compatibility, or deployment support. In ToolJet versions with the native library loader, enabled HTTPS UMD/IIFE library exports are passed to RunJS as lexical parameters by their configured names, not guaranteed globalThis properties. Do not redeclare those parameter names with const/let. Preloaded script exports may add or override names; their code is intentionally omitted here. This MCP does not configure JavaScript libraries through update_app_settings. If required dependencies are missing, report the prerequisite and request supported setup instead of inventing globals or claiming OCR works. PDF.js rasterization, Tesseract worker initialization and actual image/PDF extraction still need runtime testing. Source URLs omit credentials, query strings and fragments; do not reuse redacted URLs as configuration."
  };
}
async function literalCanvasColor(client, appId, versionId) {
  if (!versionId || typeof client.getAppSettings !== "function")
    return void 0;
  try {
    const snapshot = await client.getAppSettings(appId, versionId);
    const colour = asRecord(snapshot.global_settings).canvasBackgroundColor;
    return typeof colour === "string" && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/i.test(colour.trim()) ? colour.trim() : void 0;
  } catch {
    return void 0;
  }
}
var layoutSchema = external_exports.object({
  top: external_exports.number(),
  left: external_exports.number().describe("Columns in the immediate parent canvas, which has its own 43-column grid."),
  width: external_exports.number().describe("Columns out of 43 in the immediate parent canvas, independent of the parent outer width. Full width is 43. Container/Form/modal inset full rows use left 2, width 39; grid-mode Listview full rows use left 0, width 43."),
  height: external_exports.number(),
  fillWidth: external_exports.boolean().optional().describe(FLEX_FILL_WIDTH_DESCRIPTION),
  widthPx: external_exports.number().positive().optional().describe(FLEX_WIDTH_PX_DESCRIPTION),
  grow: external_exports.number().positive().optional().describe(FLEX_GROW_DESCRIPTION),
  minWidthPx: external_exports.number().nonnegative().optional().describe(FLEX_MIN_WIDTH_PX_DESCRIPTION)
});
var componentInputSchema = external_exports.object({
  name: componentNameSchema,
  type: external_exports.string(),
  properties: external_exports.record(external_exports.string(), external_exports.any()),
  styles: external_exports.record(external_exports.string(), external_exports.any()).optional(),
  validation: external_exports.record(external_exports.string(), external_exports.any()).optional(),
  others: external_exports.record(external_exports.string(), external_exports.any()).optional(),
  layout: layoutSchema.optional(),
  layouts: external_exports.object({ desktop: layoutSchema.optional(), mobile: layoutSchema.optional() }).optional(),
  client_ref: external_exports.string().optional(),
  parent_ref: external_exports.string().optional(),
  parent: external_exports.string().optional(),
  slot_name: componentSlotSchema.optional()
});
function containsListItemBinding(value) {
  if (typeof value === "string")
    return /\blistItem\b/.test(value);
  if (Array.isArray(value))
    return value.some(containsListItemBinding);
  if (value && typeof value === "object") {
    return Object.values(value).some(containsListItemBinding);
  }
  return false;
}
function prepareComponentBatch(inputs, options = {}) {
  const requested = inputs.map(({ client_ref, parent_ref, slot_name, ...component }) => ({
    ...component,
    clientRef: client_ref,
    parentRef: parent_ref,
    slotName: slot_name
  }));
  const currency = plannedCurrency(requested);
  const normalized = requested.map((component) => {
    const definition = normalizeComponentSpec(component, { stripUnknownKeys: true, currency });
    const geometry = normalizePlannedLayouts(definition.component);
    return { ...definition, component: geometry.component, warnings: [...definition.warnings, ...geometry.warnings] };
  });
  const heightFixes = [];
  for (const result of normalized) {
    const component = result.component;
    const fix = suggestedHtmlHeight(component);
    if (!fix)
      continue;
    for (const rect of [component.layout, component.layouts?.desktop])
      if (rect && typeof rect.height === "number")
        rect.height = fix.to;
    heightFixes.push(`Html "${component.name ?? "?"}" needed about ${fix.needed}px for its markup but was ${fix.from}px; saved at ${fix.to}px. Anything placed within ${fix.to - fix.from}px below it now overlaps; move it down.`);
  }
  const materialized = materializeRequiredDefaultChildren(normalized.map((result) => result.component));
  const polished = polishFlexRows(materialized.components);
  const expanded = { components: polished.components, warnings: [...materialized.warnings, ...polished.warnings] };
  const references = indexComponentReferences(expanded.components, options.existingComponents);
  const lint = lintComponents(references.components, options);
  const lateListviewChildWarnings = requested.flatMap((component) => component.parent && containsListItemBinding({
    properties: component.properties,
    styles: component.styles,
    validation: component.validation,
    others: component.others
  }) ? [
    `Component "${component.name}" is being added under an existing parent and reads listItem. ToolJet can mount late-added Listview children with empty repeated values. Create the Listview and all listItem-bound children atomically in one component batch using client_ref/parent_ref.`
  ] : []);
  return {
    components: references.components,
    errors: [...references.errors, ...lint.errors],
    warnings: [
      ...normalized.flatMap((item) => item.warnings),
      ...expanded.warnings,
      ...lint.warnings,
      ...heightFixes,
      ...lateListviewChildWarnings
    ]
  };
}
var PLAN_TTL_MS = 30 * 60 * 1e3;
var MAX_PLANS = 20;
var plans = /* @__PURE__ */ new Map();
function prune(now = Date.now()) {
  for (const [token, plan] of plans)
    if (plan.expiresAt <= now)
      plans.delete(token);
  while (plans.size >= MAX_PLANS)
    plans.delete(plans.keys().next().value);
}
function storeAppPlan(spec, lint, replaceFingerprint2) {
  prune();
  const planToken = randomUUID();
  plans.set(planToken, {
    spec: structuredClone(spec),
    lint: structuredClone(lint),
    expiresAt: Date.now() + PLAN_TTL_MS,
    ...replaceFingerprint2 ? { replaceFingerprint: replaceFingerprint2 } : {}
  });
  return { plan_token: planToken, expires_in_seconds: PLAN_TTL_MS / 1e3 };
}
function peekAppPlan(planToken) {
  prune();
  return plans.get(planToken);
}
function consumeAppPlan(planToken) {
  prune();
  const plan = plans.get(planToken);
  if (!plan)
    throw new Error("Unknown or expired plan_token. Run lint_app_spec again.");
  plans.delete(planToken);
  return plan;
}
var escapeRegExp$1 = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var idPattern = (ids) => new RegExp(`(?<![\\w-])(?:${[...ids].sort((a, b) => b.length - a.length).map(escapeRegExp$1).join("|")})(?![\\w-])`, "g");
function mentionsId(text3, id) {
  return idPattern([id]).test(text3);
}
function replaceIds(text3, newIds) {
  const ids = [...newIds.keys()];
  if (!ids.length)
    return { text: text3, missing: [] };
  const missing = /* @__PURE__ */ new Set();
  const replaced = text3.replace(idPattern(ids), (id) => {
    const next = newIds.get(id);
    if (next)
      return next;
    missing.add(id);
    return id;
  });
  return { text: replaced, missing: [...missing] };
}
var readsQuery = (text3, name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`queries\\s*(?:\\?\\.|\\.)\\s*${escaped}(?![\\w$])|queries\\s*\\[\\s*['"]${escaped}['"]\\s*\\]`).test(text3);
};
function replaceView(summary, plan) {
  const replacedNames = new Set((plan.pages ?? []).filter((page) => page.replace).map((page) => page.name));
  const plannedNames = new Set((plan.pages ?? []).map((page) => page.name));
  const matched = /* @__PURE__ */ new Set();
  const plannedNameById = /* @__PURE__ */ new Map();
  for (const name of replacedNames) {
    const page = matchPlannedPage(summary.pages, name, plannedNames, matched);
    if (page)
      matched.add(page.id);
    if (page)
      plannedNameById.set(page.id, name);
  }
  const replacedPages = summary.pages.filter((page) => matched.has(page.id));
  const replacedPageIds = replacedPages.map((page) => page.id);
  const componentsToDelete = replacedPages.map((page) => ({ pageId: page.id, componentIds: page.components.map((component) => component.id) })).filter((entry) => entry.componentIds.length);
  const replacedComponentIds = componentsToDelete.flatMap((entry) => entry.componentIds);
  const removedSources = /* @__PURE__ */ new Set([...replacedPageIds, ...replacedComponentIds]);
  const planQueryNames = new Set((plan.queries ?? []).map((query) => query.name));
  const replacedComponents = replacedPages.flatMap((page) => page.components);
  const otherComponents = summary.pages.filter((page) => !matched.has(page.id)).flatMap((page) => page.components);
  const componentText = (component) => JSON.stringify([component.properties ?? {}, component.styles ?? {}]);
  const runsQuery = (event, id) => JSON.stringify(event.event ?? {}).includes(`"${id}"`);
  const planQueryIds = new Set(summary.queries.filter((query) => query.name && planQueryNames.has(query.name)).map((query) => query.id));
  const pageOwns = (query) => replacedComponents.some((component) => readsQuery(componentText(component), query.name)) || summary.events.some((event) => event.sourceId && removedSources.has(event.sourceId) && runsQuery(event, query.id));
  const usedElsewhere = (query) => otherComponents.some((component) => readsQuery(componentText(component), query.name)) || summary.events.some((event) => event.sourceId !== query.id && !(event.sourceId && removedSources.has(event.sourceId)) && !(event.sourceId && planQueryIds.has(event.sourceId)) && runsQuery(event, query.id)) || summary.queries.some((other) => other.id !== query.id && !planQueryIds.has(other.id) && readsQuery(JSON.stringify(other.options ?? {}), query.name));
  const readsOf = (text3) => summary.queries.filter((q) => q.name && readsQuery(text3, q.name)).map((q) => q.id);
  const reachedElsewhere = /* @__PURE__ */ new Set([
    ...otherComponents.flatMap((component) => readsOf(componentText(component))),
    ...summary.events.filter((event) => !(event.sourceId && (removedSources.has(event.sourceId) || summary.queries.some((q) => q.id === event.sourceId)))).flatMap((event) => summary.queries.filter((q) => runsQuery(event, q.id)).map((q) => q.id))
  ]);
  for (let frontier = [...reachedElsewhere]; frontier.length; ) {
    const next = frontier.flatMap((id) => {
      const query = summary.queries.find((q) => q.id === id);
      return readsOf(JSON.stringify(query?.options ?? {}));
    }).filter((id) => !reachedElsewhere.has(id));
    next.forEach((id) => reachedElsewhere.add(id));
    frontier = next;
  }
  const owned = new Set(summary.queries.filter((query) => query.name && !reachedElsewhere.has(query.id) && pageOwns(query)).map((query) => query.id));
  for (let grew = true; grew; ) {
    grew = false;
    for (const query of summary.queries) {
      if (!query.name || owned.has(query.id) || reachedElsewhere.has(query.id))
        continue;
      const readByOwned = summary.queries.some((other) => owned.has(other.id) && readsQuery(JSON.stringify(other.options ?? {}), query.name));
      const chainedByOwned = summary.events.some((event) => !!event.sourceId && owned.has(event.sourceId) && runsQuery(event, query.id));
      if (readByOwned || chainedByOwned) {
        owned.add(query.id);
        grew = true;
      }
    }
  }
  const explicitUpdates = new Set((plan.queries ?? []).filter((query) => query.update).map((query) => query.name));
  const implicit = replacedNames.size ? summary.queries.filter((query) => query.name && planQueryNames.has(query.name) && !reachedElsewhere.has(query.id) && (owned.has(query.id) || !usedElsewhere(query))) : [];
  const explicit = summary.queries.filter((query) => query.name && explicitUpdates.has(query.name));
  const queriesToUpdate = new Map([...implicit, ...explicit].map((query) => [query.name, query.id]));
  if (!replacedPages.length && !explicit.length && (!replacedNames.size || !queriesToUpdate.size))
    return void 0;
  const redefinedIds = new Set(queriesToUpdate.values());
  const queryNameById = new Map(summary.queries.map((query) => [query.id, query.name ?? ""]));
  const pageNameById = new Map(summary.pages.map((page) => [page.id, page.name ?? ""]));
  const queryRefName = new Map((plan.queries ?? []).flatMap((query) => [[query.name, query.name], ...query.client_ref ? [[query.client_ref, query.name]] : []]));
  const pageRefName = new Map((plan.pages ?? []).flatMap((page) => [[page.name, page.name], ...page.client_ref ? [[page.client_ref, page.name]] : []]));
  const nameOfQuery = (ref) => typeof ref === "string" ? queryRefName.get(ref) ?? queryNameById.get(ref) ?? ref : "";
  const nameOfPage = (ref) => typeof ref === "string" ? pageRefName.get(ref) ?? pageNameById.get(ref) ?? ref : "";
  const actionKey = (action) => {
    const id = action.actionId;
    if (id === "run-query")
      return `run-query:${nameOfQuery(action.target_ref ?? action.queryName ?? action.queryId)}`;
    if (id === "switch-page")
      return `switch-page:${nameOfPage(action.target_ref ?? action.pageId)}`;
    if (id === "set-custom-variable" || id === "set-page-variable")
      return `${id}:${String(action.key ?? "")}`;
    return void 0;
  };
  const planned = /* @__PURE__ */ new Set();
  const plan_ = (source, trigger, action) => {
    const key2 = action && actionKey(action);
    if (key2)
      planned.add(`${source}|${trigger ?? ""}|${key2}`);
  };
  for (const event of plan.events ?? []) {
    if (event.source_type === "data_query")
      plan_(`q:${nameOfQuery(event.source_ref)}`, event.trigger, event.action);
    if (event.source_type === "page")
      plan_(`p:${nameOfPage(event.source_ref)}`, event.trigger, event.action);
  }
  for (const lc of plan.lifecycles ?? []) {
    const source = `q:${nameOfQuery(lc.query_ref)}`;
    for (const ref of lc.refresh_query_refs ?? [])
      plan_(source, "onDataQuerySuccess", { actionId: "run-query", queryId: ref });
    for (const action of [...lc.before_refresh_actions ?? [], ...lc.success_actions ?? []])
      plan_(source, "onDataQuerySuccess", action);
    for (const action of lc.failure_actions ?? [])
      plan_(source, "onDataQueryFailure", action);
  }
  const replannedFrom = (source, action) => {
    const key2 = actionKey(action);
    return !!key2 && planned.has(`${source}|${String(action.eventId ?? "")}|${key2}`);
  };
  const alertedQueries = /* @__PURE__ */ new Set([
    ...(plan.lifecycles ?? []).filter((lc) => lc.success_alert || lc.failure_alert).map((lc) => nameOfQuery(lc.query_ref)),
    ...(plan.events ?? []).filter((event) => event.source_type === "data_query" && event.action?.actionId === "show-alert").map((event) => nameOfQuery(event.source_ref))
  ]);
  const eventsToDelete = summary.events.filter((event) => {
    const action = event.event ?? {};
    if (event.sourceId && replacedComponentIds.includes(event.sourceId))
      return true;
    if (event.sourceId && replacedPageIds.includes(event.sourceId)) {
      if (replannedFrom(`p:${plannedNameById.get(event.sourceId)}`, action))
        return true;
      return action.actionId === "run-query" && typeof action.queryId === "string" && redefinedIds.has(action.queryId);
    }
    if (!event.sourceId || !redefinedIds.has(event.sourceId))
      return false;
    const text3 = JSON.stringify(action);
    if (replacedComponentIds.some((id) => mentionsId(text3, id)))
      return true;
    if (replannedFrom(`q:${queryNameById.get(event.sourceId)}`, action))
      return true;
    if (action.actionId === "run-query")
      return typeof action.queryId === "string" && redefinedIds.has(action.queryId);
    if (action.actionId === "show-alert")
      return alertedQueries.has(queryNameById.get(event.sourceId) ?? "");
    return false;
  }).map((event) => event.id);
  const deleted = new Set(eventsToDelete);
  const replacedComponentNames = new Map(replacedPages.flatMap((page) => page.components).filter((component) => component.name).map((component) => [component.id, component.name]));
  const eventsToRetarget = summary.events.filter((event) => {
    if (deleted.has(event.id))
      return false;
    const text3 = JSON.stringify(event.event ?? {});
    return [...replacedComponentNames.keys()].some((id) => mentionsId(text3, id));
  });
  const retargeted = new Set(eventsToRetarget.map((event) => event.id));
  return {
    summary: {
      ...summary,
      pages: summary.pages.map((page) => replacedPageIds.includes(page.id) ? { ...page, components: [] } : page),
      // A redefined query stays under a placeholder name: its name is free for the plan's new definition, and
      // events that run it by id (from other pages) still resolve. Dropping it would orphan them.
      queries: summary.queries.map((query) => redefinedIds.has(query.id) ? { ...query, name: `${query.name} (being replaced)` } : query),
      events: summary.events.filter((event) => !deleted.has(event.id) && !retargeted.has(event.id))
    },
    replacedPageIds,
    componentsToDelete,
    eventsToDelete,
    queriesToUpdate,
    eventsToRetarget,
    replacedComponentNames,
    replacedPageNames: replacedPages.map((page) => page.name ?? page.id)
  };
}
function danglingAfterReplace(summary, view, plan) {
  const kept = new Set((plan.pages ?? []).filter((page) => page.replace).flatMap((page) => (page.components ?? []).map((c) => c.name ?? "")));
  const dropped = [...new Set(view.replacedComponentNames.values())].filter((name) => !kept.has(name));
  if (!dropped.length)
    return [];
  const errors = [];
  const reads = (text3, name) => new RegExp(`components\\s*(?:\\?\\.|\\.)\\s*${name.replace(/[$]/g, "\\$")}\\b|components\\s*\\[\\s*['"]${name.replace(/[$]/g, "\\$")}['"]\\s*\\]`).test(text3);
  for (const page of summary.pages.filter((p) => !view.replacedPageIds.includes(p.id))) {
    for (const component of page.components) {
      const text3 = JSON.stringify([component.properties ?? {}, component.styles ?? {}]);
      for (const name of dropped) {
        if (reads(text3, name))
          errors.push(`Page "${page.name}": "${component.name ?? component.id}" reads components.${name}, which the replace of "${view.replacedPageNames.join('", "')}" drops. Keep ${name} in that page's plan, or change "${page.name}" first.`);
      }
    }
  }
  const droppedIds = [...view.replacedComponentNames].filter(([, name]) => dropped.includes(name));
  const sourceName = new Map(summary.pages.flatMap((p) => p.components.map((c) => [c.id, `${c.name ?? c.id}" on page "${p.name}`])));
  for (const event of view.eventsToRetarget) {
    const text3 = JSON.stringify(event.event ?? {});
    for (const [id, name] of droppedIds) {
      if (!mentionsId(text3, id))
        continue;
      const source = event.sourceId ? sourceName.get(event.sourceId) ?? event.sourceId : "the app";
      errors.push(`"${source}" has an event that acts on ${name}, which the replace of "${view.replacedPageNames.join('", "')}" drops. Keep ${name} in that page's plan, or change that event first.`);
    }
  }
  const redefined = new Set(view.queriesToUpdate.values());
  for (const query of summary.queries.filter((q) => !redefined.has(q.id))) {
    const text3 = JSON.stringify(query.options ?? {});
    for (const name of dropped) {
      if (reads(text3, name))
        errors.push(`Query "${query.name}" reads components.${name}, which the replace of "${view.replacedPageNames.join('", "')}" drops. Keep ${name} in that page's plan, or redefine "${query.name}" in this same plan without it (in page markup: write the whole <Query name="${query.name}" ...> in the same document as the page).`);
    }
  }
  return errors;
}
function canonical(value) {
  return JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map((key2) => [key2, item[key2]])) : item);
}
function replaceFingerprint(summary, view) {
  const pageIds = new Set(view.replacedPageIds);
  const replacedPages = summary.pages.filter((page) => pageIds.has(page.id));
  const pages = replacedPages.map((page) => ({
    id: page.id,
    name: page.name ?? null,
    handle: page.handle ?? null,
    icon: page.icon ?? null,
    hidden: page.hidden ?? false,
    components: [...page.components].sort((a, b) => a.id.localeCompare(b.id)).map((component) => ({
      id: component.id,
      name: component.name ?? null,
      type: component.type ?? null,
      parent: component.parent ?? null,
      slot_name: component.slot_name ?? null,
      properties: component.properties ?? {},
      styles: component.styles ?? {},
      layouts: component.layouts ?? {},
      validation: component.validation ?? {},
      others: component.others ?? {}
    }))
  })).sort((a, b) => a.id.localeCompare(b.id));
  const redefined = new Set(view.queriesToUpdate.values());
  const queries = summary.queries.filter((query) => redefined.has(query.id)).map((query) => ({
    id: query.id,
    name: query.name ?? null,
    kind: query.kind ?? null,
    data_source_id: query.data_source_id ?? null,
    options: query.options ?? {}
  })).sort((a, b) => a.id.localeCompare(b.id));
  const touched = [...pageIds, ...replacedPages.flatMap((page) => page.components.map((component) => component.id)), ...redefined];
  const touchedIds = new Set(touched);
  const names = touched.length ? new RegExp(idPattern(touched).source) : void 0;
  const events = summary.events.filter((event) => event.sourceId && touchedIds.has(event.sourceId) || !!names?.test(JSON.stringify(event.event ?? {}))).map((event) => ({
    id: event.id,
    name: event.name ?? null,
    sourceId: event.sourceId ?? null,
    target: event.target ?? null,
    index: event.index ?? null,
    event: event.event ?? {}
  })).sort((a, b) => a.id.localeCompare(b.id));
  return canonical({ pages, queries, events });
}
function frozenAppRefusal(summary) {
  if (!summary?.editor_frozen)
    return void 0;
  const where = summary.environment ? ` is in the ${summary.environment} environment and` : "";
  return `Not executed: this app's version${where} is read-only in ToolJet (the editor is frozen, and ToolJet refuses changes to a promoted version). Nothing was changed. Tell the user to create a new version in development (version menu, Create version) and ask again; do not create tables or try other tools.`;
}
createRequire(import.meta.url);
var PAGE_ARCHETYPES = ["catalog", "personal-overview", "register", "queue-board", "other"];
var MAIN_SURFACE = {
  catalog: { types: /* @__PURE__ */ new Set(["ShadCardGrid"]), label: "a photo card grid (ShadCardGrid)" },
  "personal-overview": {
    types: /* @__PURE__ */ new Set(["ShadSummaryStrip", "ShadStat", "ShadProgress", "ShadCircularProgress"]),
    label: "the period figures (ShadSummaryStrip, then progress tiles)"
  },
  register: { types: /* @__PURE__ */ new Set(["Table", "ShadTable"]), label: 'the records table (Table with tableLook "shadcn")' },
  "queue-board": {
    types: /* @__PURE__ */ new Set(["ShadRecordList", "Table", "ShadTable", "ShadKanban", "ShadCardGrid"]),
    label: "the work itself (a needs-attention ShadRecordList, the queue table or a ShadKanban)"
  }
};
var FILTER_TYPES = /* @__PURE__ */ new Set(["ShadInput", "ShadToggleGroup", "ShadSelect", "ShadTabs", "ShadCombobox", "ShadMultiselect"]);
var DIALOG_TYPES = /* @__PURE__ */ new Set(["ShadDialog", "Modal", "ModalV2"]);
var SHORT_LIST_MAX = 36;
var isChart = (type) => /^Shad\w*Chart$/.test(type ?? "");
var valueOf = (bag, key2) => {
  const entry = bag?.[key2];
  return entry && typeof entry === "object" && !Array.isArray(entry) && "value" in entry ? entry.value : entry;
};
var textOf = (bag, key2) => {
  const v = valueOf(bag, key2);
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
};
var refOf = (c) => c.clientRef ?? c.name ?? "";
var label = (c) => `"${c.name ?? c.clientRef ?? c.type}"`;
function readingOrder(components) {
  const refs = new Set(components.map(refOf).filter(Boolean));
  const parentOf = (c) => {
    const p = c.parentRef ?? c.parent;
    return p && refs.has(p) ? p : void 0;
  };
  const children = /* @__PURE__ */ new Map();
  for (const c of components) {
    const p = parentOf(c);
    if (p)
      children.set(p, [...children.get(p) ?? [], c]);
  }
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  const visit = (c) => {
    if (seen.has(c) || DIALOG_TYPES.has(c.type ?? ""))
      return;
    seen.add(c);
    out.push(c);
    for (const child of children.get(refOf(c)) ?? [])
      visit(child);
  };
  for (const c of components)
    if (!parentOf(c))
      visit(c);
  return out;
}
function chartColourWarnings(chart) {
  const series = valueOf(chart.properties, "yFields");
  const parts = chart.type === "ShadPieChart" || chart.type === "ShadFunnelChart" ? "slice" : Array.isArray(series) && series.length > 1 ? "series" : null;
  if (!parts)
    return [];
  const colors = valueOf(chart.properties, "colors");
  const literal2 = Array.isArray(colors) ? colors : null;
  const bound = typeof colors === "string" && colors.includes("{{") && !/^\{\{\s*\[\s*\]\s*\}\}$/.test(colors.trim());
  if (bound)
    return [];
  if (!literal2 || literal2.length === 0) {
    return [
      `Chart ${label(chart)} draws each ${parts} in the default palette: set colors to explicit, distinct hues that sit with the theme (one family, clearly different lightness or hue per ` + parts + "), so no pair clashes and no slice disappears."
    ];
  }
  const norm = literal2.map((c) => String(c).trim().toLowerCase());
  if (new Set(norm).size < norm.length) {
    return [`Chart ${label(chart)} repeats a colour in colors (${literal2.join(", ")}): give each ${parts} its own hue.`];
  }
  return [];
}
function headerActionWarnings(order, components) {
  const first = order.find((c) => c.type === "ShadHero" || c.type === "ShadHeading");
  if (!first)
    return [];
  if (first.type === "ShadHero") {
    const primary = textOf(first.properties, "actionLabel");
    const secondary = textOf(first.properties, "secondaryActionLabel");
    return primary && secondary ? [`Header ${label(first)} offers two actions ("${primary}", "${secondary}"): keep the one the page is for; move the other into the page (a card's action, a filter or the nav).`] : [];
  }
  const byRef = new Map(components.map((c) => [refOf(c), c]));
  let row;
  let at = first;
  for (let i = 0; i < 2 && at; i++) {
    at = byRef.get(at.parentRef ?? at.parent ?? "");
    if (at?.type === "FlexContainer" && textOf(at.properties, "direction") === "row") {
      row = at;
      break;
    }
  }
  if (!row)
    return [];
  const inRow = /* @__PURE__ */ new Set([refOf(row)]);
  const buttons = [];
  for (const c of order) {
    const p = c.parentRef ?? c.parent ?? "";
    if (!inRow.has(p))
      continue;
    inRow.add(refOf(c));
    if (c.type === "ShadButton")
      buttons.push(c);
  }
  return buttons.length > 1 ? [`Header row ${label(row)} holds ${buttons.length} buttons (${buttons.map(label).join(", ")}): keep one primary action in the header; the rest belong in the page or the nav.`] : [];
}
function lintPageArchetype(archetype, components) {
  const kind = (archetype ?? "").trim();
  if (!kind)
    return [];
  if (!PAGE_ARCHETYPES.includes(kind)) {
    return [`Archetype "${kind}" is not one of ${PAGE_ARCHETYPES.join(", ")}; use "other" for a page that is none of them.`];
  }
  if (kind === "other")
    return [];
  const prefix = `Archetype "${kind}": `;
  const order = readingOrder(components);
  const warnings = [];
  const main = MAIN_SURFACE[kind];
  const mainAt = order.findIndex((c) => main.types.has(c.type ?? ""));
  const chartAt = order.findIndex((c) => isChart(c.type));
  if (mainAt < 0) {
    warnings.push(`the page is built around ${main.label}, and this plan has none.`);
  } else if (chartAt >= 0 && chartAt < mainAt) {
    warnings.push(`chart ${label(order[chartAt])} comes before ${label(order[mainAt])}: the main surface opens the page; a chart, if it earns a place, sits beside or below it, never as the first thing under the header.`);
  }
  const has = (type) => order.some((c) => c.type === type);
  const filterBefore = (index) => order.slice(0, Math.max(index, 0)).some((c) => FILTER_TYPES.has(c.type ?? ""));
  const hasDialog = components.some((c) => DIALOG_TYPES.has(c.type ?? ""));
  if (kind === "catalog" && mainAt >= 0) {
    const grid = order[mainAt];
    if (!filterBefore(mainAt))
      warnings.push(`no search or filter bar above ${label(grid)}: put a search input and a course/kind toggle in a row between the hero and the grid.`);
    if (!hasDialog)
      warnings.push('no detail sheet: a card click opens a ShadDialog (variant "sheet") with the full record.');
  }
  if (kind === "register" && mainAt >= 0) {
    if (!filterBefore(mainAt))
      warnings.push(`no filter row above ${label(order[mainAt])}: a register is read through a period or status toggle and a select.`);
    if (!hasDialog)
      warnings.push('no detail sheet: a row click opens a ShadDialog (variant "sheet") with the record and its actions.');
  }
  if (kind === "personal-overview") {
    if (!has("ShadSummaryStrip"))
      warnings.push("no ShadSummaryStrip under the hero: the period's four key figures go in one strip.");
    const progress = order.some((c) => c.type === "ShadProgress" || c.type === "ShadCircularProgress" || c.type === "ShadStat" && valueOf(c.properties, "progress") !== void 0);
    if (!progress)
      warnings.push("no progress grid: show each goal or budget as a ShadStat with progress (or ShadProgress) against its limit.");
  }
  if (kind === "queue-board" && !has("ShadSummaryStrip")) {
    warnings.push("no ShadSummaryStrip: a queue opens with its counts (open, overdue, unassigned, done this week) in one strip.");
  }
  for (const chart of order.filter((c) => isChart(c.type)))
    warnings.push(...chartColourWarnings(chart));
  warnings.push(...headerActionWarnings(order, components));
  if (order.length > SHORT_LIST_MAX) {
    warnings.push(`${order.length} components outside dialogs: a ${kind} page reads best with a short list (the blueprint has about 10 to 20); merge repeated tiles into one bound component and drop sections the page does not need.`);
  }
  return warnings.map((w) => prefix + w);
}
function invalidPlannedGeneratedPrimaryKeySeeds(columns, rows) {
  const primaryKeys = columns.some((column) => column.primaryKey) ? columns.filter((column) => column.primaryKey) : [{ name: "id", type: "serial", primaryKey: true }];
  const errors = [];
  for (const column of primaryKeys) {
    if (normalizeType(column.type) !== "serial" && !/^nextval\(/i.test(String(column.defaultValue ?? "").trim()))
      continue;
    const supplied = rows.flatMap((row, index) => column.name in row ? [index + 1] : []);
    if (supplied.length) {
      errors.push(`Omit generated primary key "${column.name}" from seed row(s) ${supplied.slice(0, 12).join(", ")}${supplied.length > 12 ? ` and ${supplied.length - 12} more` : ""}. ToolJet allocates it from the table sequence; explicit keys can collide or desynchronize future inserts. No seed values were removed or rewritten.`);
    }
  }
  return errors;
}
var MIN_ROWS = 6;
var METRIC = /(progress|complet|percent|pct|score|rating|health|satisfaction|nps|readiness|utili[sz]ation|occupancy|amount|price|cost|total|revenue|balance|spend|budget|salary|value|hours|minutes|duration|days|stock|quantity|qty|count|tickets|visits|sales|margin|rate)/i;
var NOT_METRIC = /(^id$|_id$|^id_|uuid|key$|^sort|order$|position|rank|index|^year$|^is_|^has_|date|_at$|zip|phone|code$)/i;
var MEASURED = /(progress|complet|percent|pct|score|health|satisfaction|nps|readiness|utili[sz]ation|occupancy)/i;
var asNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value))
    return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim()))
    return Number(value);
  return void 0;
};
function lintUniformSeedMetrics(tableName, rows) {
  if (rows.length < MIN_ROWS)
    return [];
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const warnings = [];
  for (const column of columns) {
    if (!METRIC.test(column) || NOT_METRIC.test(column))
      continue;
    const values = rows.map((row) => asNumber(row[column]));
    const present = values.filter((v) => v !== void 0);
    if (present.length < MIN_ROWS || present.length < rows.length * 0.8)
      continue;
    const distinct = new Set(present);
    if (distinct.size === 1) {
      warnings.push(`Seed data for table "${tableName}": column "${column}" is ${present[0]} in all ${present.length} rows, so every record shows the same figure. Vary it across rows the way real records differ.`);
      continue;
    }
    if (!MEASURED.test(column))
      continue;
    for (const by of columns) {
      if (by === column || NOT_METRIC.test(by))
        continue;
      const groups = /* @__PURE__ */ new Map();
      const sizes = /* @__PURE__ */ new Map();
      let usable = true;
      rows.forEach((row, index) => {
        const group = row[by];
        const value = values[index];
        if (typeof group !== "string" || value === void 0) {
          usable = false;
          return;
        }
        groups.set(group, (groups.get(group) ?? /* @__PURE__ */ new Set()).add(value));
        sizes.set(group, (sizes.get(group) ?? 0) + 1);
      });
      if (!usable || groups.size < 3 || groups.size > 8 || [...sizes.values()].some((n) => n < 2))
        continue;
      if ([...groups.values()].some((set) => set.size > 1))
        continue;
      const examples = [...groups.entries()].slice(0, 3).map(([group, set]) => `${group} ${[...set][0]}`).join(", ");
      warnings.push(`Seed data for table "${tableName}": column "${column}" is one value per ${by} (${examples}), so every record in a ${by} shows the same ${column}. Vary it within each ${by} the way real records differ, and compute it from the record's own data (tasks done of tasks due, for example) rather than a fixed number per stage.`);
      break;
    }
  }
  return warnings;
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function containsExactValue(value, expected) {
  if (value === expected)
    return true;
  if (Array.isArray(value))
    return value.some((entry) => containsExactValue(entry, expected));
  if (value && typeof value === "object") {
    return Object.values(value).some((entry) => containsExactValue(entry, expected));
  }
  return false;
}
function containsNamedBinding(value, namespace, name) {
  if (typeof value === "string") {
    return new RegExp(`\\b${namespace}\\s*\\.\\s*${escapeRegExp(name)}(?:\\b|\\s*\\[)`).test(value);
  }
  if (Array.isArray(value))
    return value.some((entry) => containsNamedBinding(entry, namespace, name));
  if (value && typeof value === "object") {
    return Object.values(value).some((entry) => containsNamedBinding(entry, namespace, name));
  }
  return false;
}
var CHART_QUERY_BINDING = /^\s*\{\{\s*queries\.([A-Za-z_$][\w$]*)\.data\s*\}\}\s*$/;
function lintQueryFedCharts(components, queries) {
  const errors = [];
  for (const component of components) {
    if (component.type !== "Chart")
      continue;
    const raw = component.properties?.jsonDescription;
    const description = typeof raw === "string" ? raw : raw && typeof raw === "object" && "value" in raw ? String(raw.value ?? "") : "";
    const match = CHART_QUERY_BINDING.exec(description);
    if (!match)
      continue;
    const query = queries.find((candidate) => candidate.name === match[1] || candidate.clientRef === match[1]);
    if (!query)
      continue;
    if (query.kind !== "runjs")
      continue;
    const code = String(query.options?.code ?? "");
    const label2 = component.name ?? "Chart";
    if (!code.trim()) {
      errors.push(`Chart "${label2}" is bound to query "${query.name}", which has no JavaScript code to build the chart object.`);
      continue;
    }
    if (/textposition\s*:\s*['"]outside['"]/.test(code) && !/cliponaxis\s*:\s*false/.test(code)) {
      errors.push(`Chart "${label2}" is bound to query "${query.name}", whose bar trace places its text outside without cliponaxis:false, so the tallest bar's value label is cut in half by the plot area. Add cliponaxis:false to the trace.`);
    }
    const missing = ["data", "layout"].filter((key2) => !code.includes(key2));
    if (missing.length) {
      errors.push(`Chart "${label2}" is bound to query "${query.name}", whose code never mentions ${missing.join(", ")}: a query feeding a chart must return the whole { data: [trace], layout: { font, xaxis, yaxis, ... } } object from references/ui-layout.md. A bare array of points draws empty axes in Plotly's default font.`);
    }
  }
  return errors;
}
var QUERY_DATA_REF = /queries\.([A-Za-z_$][\w$]*)\.data\b/g;
var isStaticTrue = (value) => value === true || value === "true" || value === "{{true}}";
function lintRunjsLoadOrder(spec) {
  const errors = [];
  const warnings = [];
  const queries = spec.queries ?? [];
  const byRef = /* @__PURE__ */ new Map();
  for (const query of queries) {
    byRef.set(query.name, query);
    if (query.clientRef)
      byRef.set(query.clientRef, query);
  }
  const chained = /* @__PURE__ */ new Set();
  for (const lifecycle of spec.lifecycles ?? []) {
    for (const target of lifecycle.refreshQueryRefs ?? [])
      chained.add(`${lifecycle.queryRef}->${target}`);
  }
  for (const event of spec.events ?? []) {
    const action = event.action ?? {};
    if (event.sourceType !== "data_query" || event.trigger !== "onDataQuerySuccess" || action.actionId !== "run-query")
      continue;
    const target = String(action.target_ref ?? action.queryName ?? action.queryId ?? "");
    if (target)
      chained.add(`${event.sourceRef}->${target}`);
  }
  const keysOf = (query) => [query.name, ...query.clientRef ? [query.clientRef] : []];
  for (const query of queries) {
    if (query.kind !== "runjs")
      continue;
    const code = String(query.options?.code ?? "");
    if (!isStaticTrue(query.options?.runOnPageLoad))
      continue;
    const refs = new Set([...code.matchAll(QUERY_DATA_REF)].map((match) => match[1]));
    for (const ref of refs) {
      const source = byRef.get(ref);
      if (!source || source === query)
        continue;
      const isChained = keysOf(source).some((from) => keysOf(query).some((to) => chained.has(`${from}->${to}`)));
      if (isChained) {
        warnings.push(`Query "${query.name}" is already run from "${source.name}"'s success but also has runOnPageLoad on, so it runs twice and the first run reads queries.${ref}.data before it exists. Set runOnPageLoad to false.`);
      } else {
        errors.push(`Query "${query.name}" reads queries.${ref}.data and runs on page load, so it races "${source.name}" and reads undefined on first load (the chart or table it feeds stays empty). Set runOnPageLoad to false and run it from "${source.name}"'s success: a lifecycle { queryRef: "${source.clientRef ?? source.name}", refreshQueryRefs: ["${query.clientRef ?? query.name}"] } or an onDataQuerySuccess run-query event.`);
      }
    }
  }
  return { errors, warnings };
}
function lintCrossPageComponentReads(spec) {
  const pages = spec.pages ?? [];
  if (pages.length < 2)
    return [];
  const pageOf = /* @__PURE__ */ new Map();
  for (const page of pages) {
    for (const component of page.components ?? []) {
      if (component.name)
        pageOf.set(component.name, page.name);
      if (component.clientRef)
        pageOf.set(component.clientRef, page.name);
    }
    if (page.clientRef)
      pageOf.set(page.clientRef, page.name);
  }
  const home = pages[0].name;
  const queries = spec.queries ?? [];
  const nameOf = /* @__PURE__ */ new Map();
  for (const q of queries) {
    nameOf.set(q.name, q.name);
    if (q.clientRef)
      nameOf.set(q.clientRef, q.name);
  }
  const startup = new Set(queries.filter((q) => isStaticTrue(q.options?.runOnPageLoad)).map((q) => q.name));
  const runners = /* @__PURE__ */ new Map();
  const add = (target, entry) => {
    const name = nameOf.get(target) ?? target;
    runners.set(name, [...runners.get(name) ?? [], entry]);
  };
  for (const lifecycle of spec.lifecycles ?? []) {
    const from = nameOf.get(lifecycle.queryRef) ?? lifecycle.queryRef;
    for (const target of lifecycle.refreshQueryRefs ?? [])
      add(target, { why: `after "${from}"`, startupChain: from });
  }
  for (const event of spec.events ?? []) {
    const action = event.action ?? {};
    if (action.actionId !== "run-query")
      continue;
    const target = String(action.target_ref ?? action.queryName ?? action.queryId ?? "");
    if (!target)
      continue;
    if (event.sourceType === "data_query")
      add(target, { why: `after "${nameOf.get(event.sourceRef) ?? event.sourceRef}"`, startupChain: nameOf.get(event.sourceRef) ?? event.sourceRef });
    else if (event.sourceType === "page")
      add(target, { why: `from page "${pageOf.get(event.sourceRef) ?? event.sourceRef}"`, page: pageOf.get(event.sourceRef) ?? event.sourceRef });
    else if (event.sourceType === "component")
      add(target, { why: `from page "${pageOf.get(event.sourceRef) ?? "?"}"`, page: pageOf.get(event.sourceRef) });
  }
  const errors = [];
  for (const query of queries) {
    const text3 = JSON.stringify(query.options ?? {});
    const reads = /* @__PURE__ */ new Map();
    for (const match of text3.matchAll(/components\.([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)/g)) {
      const page2 = pageOf.get(match[1]);
      if (page2 && page2 !== home && !reads.has(match[1]))
        reads.set(match[1], `${match[1]}.${match[2]}`);
    }
    if (!reads.size)
      continue;
    const [component, read] = [...reads.entries()][0];
    const page = pageOf.get(component);
    const closed = [];
    if (startup.has(query.name))
      closed.push("at app start");
    for (const runner of runners.get(query.name) ?? []) {
      if (runner.startupChain && startup.has(runner.startupChain))
        closed.push(`${runner.why}, which runs at app start`);
      else if (runner.page && runner.page !== page)
        closed.push(runner.why);
    }
    if (!closed.length)
      continue;
    errors.push(`Query "${query.name}" reads components.${read} (on page "${page}") but runs while "${page}" may be closed: ${[...new Set(closed)].join("; ")}. Only the open page's components exist, so it throws "Cannot read properties of undefined". Read them optionally with a default (components.${read.replace(".", "?.")} ?? ...), and run the query when "${page}" opens (a page onPageLoad run-query event).`);
  }
  return errors;
}
function lintChartNumericBindings(pages, queries) {
  const warnings = [];
  const sqlByName = /* @__PURE__ */ new Map();
  for (const query of queries) {
    const sql = query.options?.query;
    if (query.name && typeof sql === "string")
      sqlByName.set(query.name, sql);
  }
  if (!sqlByName.size)
    return warnings;
  for (const page of pages) {
    for (const component of page.components) {
      if (component.type !== "Chart")
        continue;
      const properties = component.properties;
      const entry = properties?.data;
      const binding = typeof entry?.value === "string" ? entry.value : typeof entry === "string" ? entry : "";
      if (!binding.includes("{{"))
        continue;
      const yMatch = binding.match(/y\s*:\s*(?:\w+\.)?([A-Za-z_]\w*)/);
      const queryMatch = binding.match(/queries\.([A-Za-z_$][\w$]*)/);
      if (!yMatch || !queryMatch)
        continue;
      const column = yMatch[1];
      const sql = sqlByName.get(queryMatch[1]);
      if (!sql)
        continue;
      const aggregate = new RegExp(`\\b(count|sum|avg|min|max)\\s*\\([^)]*\\)\\s+as\\s+${column}\\b`, "i").test(sql);
      if (!aggregate)
        continue;
      const cast = new RegExp(`(cast\\s*\\(|::\\s*(float|numeric|decimal|int|bigint|double))`, "i").test(sql);
      const coerced = /Number\s*\(|parseFloat\s*\(|parseInt\s*\(|\+\s*r\./.test(binding);
      if (cast || coerced)
        continue;
      warnings.push(`Chart "${component.name ?? component.id}" plots y from "${column}", an uncast SQL aggregate in query "${queryMatch[1]}". Many drivers return numeric aggregates as STRINGS (BigQuery INT64 from COUNT(*) especially), and a Chart given string y values renders blank with no error. Cast in SQL (CAST(... AS FLOAT64) / ::float) or coerce in the binding (y: Number(r.${column})).`);
    }
  }
  return warnings;
}
function lintServerSidePaginationRace(pages, queries) {
  const errors = [];
  const queryByName = /* @__PURE__ */ new Map();
  for (const query of queries)
    if (query.name)
      queryByName.set(query.name, query);
  const propValue = (properties, key2) => {
    const entry = properties?.[key2];
    return entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
  };
  const isTrue2 = (value) => value === true || typeof value === "string" && value.replace(/\s+/g, "").toLowerCase() === "{{true}}";
  const runsOnPageLoad = (options) => {
    const opts = options;
    return !!opts && (opts.runOnPageLoad === true || opts.runOnPageLoad === "{{true}}");
  };
  const referencedQueryNames = (dataBinding) => {
    if (typeof dataBinding !== "string")
      return [];
    const names = /* @__PURE__ */ new Set();
    for (const match of dataBinding.matchAll(/queries\.([A-Za-z_$][\w$]*)/g))
      names.add(match[1]);
    return [...names];
  };
  for (const page of pages) {
    for (const component of page.components) {
      if (component.type !== "Table" || !component.name)
        continue;
      const properties = component.properties;
      if (!isTrue2(propValue(properties, "serverSidePagination")))
        continue;
      for (const queryName of referencedQueryNames(propValue(properties, "data"))) {
        const query = queryByName.get(queryName);
        if (!query)
          continue;
        if (runsOnPageLoad(query.options) && containsNamedBinding(query.options, "components", component.name)) {
          errors.push(`Table "${component.name}" uses server-side pagination and its data query "${queryName}" runs on page load while referencing components.${component.name}.* in its SQL. On first load the table is not registered yet, so those bindings resolve to "undefined" and the query fails (e.g. column "undefined" does not exist) \u2014 the table then shows "No data" even though the record count is non-zero. For a bounded result set, prefer client-side pagination: set serverSidePagination:false, bind the table data to the full query, and drop the separate count query. If server-side pagination is genuinely needed, set the data query's runOnPageLoad:false and drive it from the table's onPageChanged/onSearch events so it runs after the table mounts.`);
        }
      }
    }
  }
  return errors;
}
function pagesUsingQuery(summary, name, planPages) {
  if (!summary)
    return [];
  const query = (summary.queries ?? []).find((q) => q.name === name);
  const reads = new RegExp(`queries\\??\\.${name.replace(/[$]/g, "\\$&")}\\b`);
  return (summary.pages ?? []).filter((page) => {
    if (!page.name || planPages.has(page.name))
      return false;
    const ids = new Set(page.components.map((component) => component.id));
    return page.components.some((component) => reads.test(JSON.stringify([component.properties ?? {}, component.styles ?? {}]))) || !!query && (summary.events ?? []).some((event) => !!event.sourceId && (ids.has(event.sourceId) || event.sourceId === page.id) && JSON.stringify(event.event ?? {}).includes(`"${query.id}"`));
  }).map((page) => page.name);
}
function lintPlannedApp(spec, existingSummary, options = {}) {
  const errors = [];
  const warnings = [];
  const checked = [];
  const tables = spec.tables ?? [];
  if (tables.length) {
    checked.push("ToolJet DB table names, columns, foreign keys, reserved names, and dependency order");
    errors.push(...validateTableBatch(tables));
  }
  const seedData = spec.seedData ?? [];
  const seedRows = seedData.reduce((total, seed) => total + seed.rows.length, 0);
  if (seedData.length) {
    checked.push("seed batches have non-empty rows");
    for (const [batchIndex, seed] of seedData.entries()) {
      if (!seed.rows.length)
        errors.push(`Seed data for table "${seed.tableName}" has no rows.`);
      const plannedTable = tables.find((table) => table.tableName.toLowerCase() === seed.tableName.toLowerCase());
      if (plannedTable) {
        errors.push(...invalidPlannedGeneratedPrimaryKeySeeds(plannedTable.columns, seed.rows).map((error) => `Seed data for planned table "${seed.tableName}" (batch ${batchIndex + 1}): ${error}`));
      }
      const columns = plannedTable?.columns ?? [];
      for (const column of columns) {
        if (!/^jsonb?$/i.test(String(column.type ?? "")))
          continue;
        const bad = seed.rows.flatMap((row, index) => {
          const value = row[column.name];
          return value === void 0 || value === null || typeof value === "object" ? [] : [index + 1];
        });
        if (bad.length) {
          errors.push(`Seed data for table "${seed.tableName}": column "${column.name}" is jsonb, so each value must be an object or an array (or null), not ${typeof seed.rows[bad[0] - 1][column.name]}; row(s) ${bad.slice(0, 8).join(", ")}. Store a list as ["a","b"], or make the column string if it holds text.`);
        }
      }
    }
    const rowsByTable = /* @__PURE__ */ new Map();
    for (const seed of seedData)
      rowsByTable.set(seed.tableName, [...rowsByTable.get(seed.tableName) ?? [], ...seed.rows]);
    for (const [tableName, rows] of rowsByTable)
      warnings.push(...lintUniformSeedMetrics(tableName, rows));
  }
  const queryRefs = /* @__PURE__ */ new Map();
  const queryIds = /* @__PURE__ */ new Map();
  const existingQueries = existingSummary?.queries ?? [];
  const existingQueryNames = /* @__PURE__ */ new Set();
  for (const query of existingQueries) {
    const target = { id: query.id, name: query.name ?? query.id };
    queryRefs.set(query.id, target);
    queryIds.set(query.id, target);
    if (query.name) {
      if (existingQueryNames.has(query.name))
        errors.push(`Existing app has duplicate query name "${query.name}".`);
      existingQueryNames.add(query.name);
      queryRefs.set(query.name, target);
    }
  }
  const plannedQueries = (spec.queries ?? []).map((query, index) => {
    const ref = query.clientRef ?? query.name;
    const id = `planned-query:${index}:${ref}`;
    if (existingQueryNames.has(query.name)) {
      const users = pagesUsingQuery(existingSummary, query.name, new Set((spec.pages ?? []).map((page) => page.name)));
      errors.push(`App already has a query named "${query.name}"` + (users.length ? `, which page${users.length > 1 ? "s" : ""} ${users.map((u) => `"${u}"`).join(", ")} also read${users.length > 1 ? "" : "s"} or run${users.length > 1 ? "" : "s"}. To use it as it is, refer to it by name here without defining it. To change it for every page that reads it, mark this definition update: true.` : ". To use it as it is, refer to it by name without defining it in this plan; to change it, mark this definition update: true."));
    }
    registerRef(queryRefs, ref, { id, name: query.name }, "query", errors);
    if (ref !== query.name)
      registerRef(queryRefs, query.name, { id, name: query.name }, "query", errors);
    queryIds.set(id, { id, name: query.name });
    if (!query.kind) {
      errors.push(`Query "${query.name}" has no resolved datasource kind; pass kind or a resolvable datasource_id + version_id.`);
    }
    const prepared = prepareQueryOptionsForWrite(query.kind, query.options, `Query "${query.name}"`);
    const options2 = prepared.options;
    errors.push(...prepared.errors);
    warnings.push(...prepared.warnings);
    return {
      id,
      name: query.name,
      kind: query.kind,
      data_source_id: query.datasourceId,
      options: options2
    };
  });
  const queries = [...existingQueries, ...plannedQueries];
  if (plannedQueries.length)
    checked.push("datasource query option contracts and duplicate logical query references");
  {
    const loadOrder = lintRunjsLoadOrder(spec);
    errors.push(...loadOrder.errors);
    errors.push(...lintCrossPageComponentReads(spec));
    warnings.push(...loadOrder.warnings);
  }
  const pageRefs = /* @__PURE__ */ new Map();
  const componentRefs = /* @__PURE__ */ new Map();
  const pages = (existingSummary?.pages ?? []).map((page) => ({
    ...page,
    components: page.components.map((component) => ({ ...component }))
  }));
  const componentNameCounts = /* @__PURE__ */ new Map();
  for (const page of pages) {
    bindRef(pageRefs, page.id, { id: page.id, name: page.name ?? page.id });
    if (page.name)
      bindRef(pageRefs, page.name, { id: page.id, name: page.name });
    if (page.handle)
      bindRef(pageRefs, page.handle, { id: page.id, name: page.name ?? page.handle });
    for (const component of page.components) {
      const target = { id: component.id, name: component.name ?? component.id, type: component.type };
      bindRef(componentRefs, component.id, target);
      if (component.name)
        componentNameCounts.set(component.name, (componentNameCounts.get(component.name) ?? 0) + 1);
    }
  }
  for (const page of pages) {
    for (const component of page.components) {
      if (component.name && componentNameCounts.get(component.name) === 1) {
        bindRef(componentRefs, component.name, { id: component.id, name: component.name, type: component.type });
      }
    }
  }
  let componentCount = 0;
  const currency = plannedCurrency((spec.pages ?? []).flatMap((page) => page.components ?? []));
  (spec.pages ?? []).forEach((plannedPage, pageIndex) => {
    const pageRef = plannedPage.clientRef ?? plannedPage.name;
    const existingPage = matchPlannedPage(pages, plannedPage.name, new Set((spec.pages ?? []).map((page) => page.name)));
    const pageId = existingPage?.id ?? `planned-page:${pageIndex}:${pageRef}`;
    bindRef(pageRefs, pageRef, { id: pageId, name: plannedPage.name }, "page", errors);
    const iconError = pageIconError(plannedPage.icon);
    if (iconError)
      errors.push(`Page "${plannedPage.name}": ${iconError}`);
    const normalized = (plannedPage.components ?? []).map((component) => {
      const definition = normalizeComponentSpec(component, { stripUnknownKeys: true, currency });
      const geometry = normalizePlannedLayouts(definition.component);
      return { component: geometry.component, warnings: [...definition.warnings, ...geometry.warnings] };
    });
    warnings.push(...normalized.flatMap((item) => item.warnings));
    const materialized = materializeRequiredDefaultChildren(normalized.map((item) => item.component));
    warnings.push(...materialized.warnings);
    const polished = polishFlexRows(materialized.components);
    warnings.push(...polished.warnings.map((message) => `Page "${plannedPage.name}": ${message}`));
    const expansion = { components: polished.components };
    const componentLint = lintComponents(expansion.components, {
      ...options,
      flexContainerIds: (existingPage?.components ?? []).filter((component) => component.type === "FlexContainer").map((component) => component.id)
    });
    errors.push(...componentLint.errors.map((message) => `Page "${plannedPage.name}": ${message}`));
    errors.push(...lintQueryFedCharts(expansion.components, spec.queries ?? []).map((message) => `Page "${plannedPage.name}": ${message}`));
    warnings.push(...componentLint.warnings.map((message) => `Page "${plannedPage.name}": ${message}`));
    warnings.push(...lintPageArchetype(plannedPage.archetype, expansion.components).map((message) => `Page "${plannedPage.name}": ${message}`));
    const references = indexComponentReferences(expansion.components, existingPage?.components);
    errors.push(...references.errors.map((message) => `Page "${plannedPage.name}": ${message}`));
    const localRefs = /* @__PURE__ */ new Map();
    const componentEntries = references.components.map((component, componentIndex) => {
      const ref = componentRef(component);
      const id = `planned-component:${pageIndex}:${componentIndex}:${ref}`;
      if ((existingPage?.components ?? []).some((candidate) => candidate.name === component.name)) {
        errors.push(`Page "${plannedPage.name}" already has a component named "${component.name}".`);
      }
      if (localRefs.has(ref))
        errors.push(`Page "${plannedPage.name}" has duplicate component ref "${ref}".`);
      else
        localRefs.set(ref, id);
      registerRef(componentRefs, ref, { id, name: component.name, type: component.type }, "component", errors);
      componentCount += 1;
      return { component, id, originalParentRef: expansion.components[componentIndex].parentRef };
    });
    const plannedComponents = componentEntries.map(({ component, id, originalParentRef }) => {
      let parent;
      if (component.parentRef) {
        parent = localRefs.get(component.parentRef);
        if (!parent) {
          errors.push(`Page "${plannedPage.name}" component "${component.name}" has unknown parent_ref "${component.parentRef}".`);
        }
      } else if (component.parent) {
        if (!originalParentRef)
          warnings.push(`Page "${plannedPage.name}" component "${component.name}" uses persisted parent id "${component.parent}"; its parent relationship cannot be verified in a pre-write plan. Prefer parent_ref.`);
        parent = component.parent;
      }
      if (parent)
        parent = encodeComponentParent(parent, component.slotName);
      return {
        id,
        name: component.name,
        type: component.type,
        properties: component.properties,
        styles: component.styles,
        validation: component.validation,
        others: component.others,
        layouts: component.layouts ?? (component.layout ? { desktop: component.layout, mobile: component.layout } : void 0),
        parent,
        ...component.slotName && component.slotName !== "body" ? { slot_name: component.slotName } : {}
      };
    });
    const pageSummary = existingPage ?? {
      id: pageId,
      name: plannedPage.name,
      handle: plannedPage.name === "Home" ? "home" : slug(plannedPage.name),
      icon: plannedPage.icon,
      components: []
    };
    pageSummary.name = plannedPage.name;
    pageSummary.icon = plannedPage.icon;
    if (plannedPage.hidden !== void 0)
      pageSummary.hidden = plannedPage.hidden;
    pageSummary.components.push(...plannedComponents);
    if (!existingPage)
      pages.push(pageSummary);
  });
  if (pages.length)
    checked.push("page icons, component contracts, bindings, rendered geometry, modal sizing, and nested refs");
  errors.push(...lintServerSidePaginationRace(pages, queries));
  warnings.push(...lintChartNumericBindings(pages, queries));
  const eventSpecs = [];
  const scanners = new Set((spec.pages ?? []).flatMap((p) => (p.components ?? []).filter((c) => c.type === "QrScanner").flatMap((c) => [c.clientRef, c.name].filter(Boolean))));
  (spec.events ?? []).forEach((event, index) => {
    if (event.sourceType === "component" && event.trigger === "onDetect" && scanners.has(String(event.sourceRef)) && !event.action?.debounce) {
      errors.push(`Event[${index}] (QrScanner "${event.sourceRef}" onDetect): add debounce: "300" to the action. The scanner runs onDetect before it sets lastDetectedValue, so an undelayed action reads the previous scan (nothing on the first).`);
    }
    const source = sourceMap(event.sourceType, componentRefs, queryRefs, pageRefs).get(event.sourceRef);
    if (!source)
      errors.push(`Event[${index}] has unknown ${event.sourceType} source_ref "${event.sourceRef}".`);
    eventSpecs.push({
      sourceId: source?.id ?? `missing-source:${event.sourceRef}`,
      sourceType: event.sourceType,
      ref: event.ref,
      trigger: event.trigger,
      action: resolveAction(event.action, queryRefs, pageRefs, componentRefs, errors, `Event[${index}]`),
      name: event.name
    });
  });
  if ((spec.lifecycles ?? []).length) {
    const lifecycleSpecs = (spec.lifecycles ?? []).flatMap((lifecycle, index) => {
      const source = queryRefs.get(lifecycle.queryRef);
      if (!source) {
        errors.push(`Lifecycle[${index}] has unknown query_ref "${lifecycle.queryRef}".`);
        return [];
      }
      return [{
        queryId: source.id,
        refreshQueryIds: resolveRefs(lifecycle.refreshQueryRefs, queryRefs, errors, `Lifecycle[${index}] refresh query`),
        clearComponentIds: resolveRefs(lifecycle.clearComponentRefs, componentRefs, errors, `Lifecycle[${index}] clear component`),
        closeModalId: resolveRef(lifecycle.closeModalRef, componentRefs, errors, `Lifecycle[${index}] modal`),
        successAlert: lifecycle.successAlert,
        failureAlert: lifecycle.failureAlert,
        beforeRefreshActions: lifecycle.beforeRefreshActions?.map((action, actionIndex) => resolveAction(action, queryRefs, pageRefs, componentRefs, errors, `Lifecycle[${index}] before refresh action[${actionIndex}]`)),
        successActions: lifecycle.successActions?.map((action, actionIndex) => resolveAction(action, queryRefs, pageRefs, componentRefs, errors, `Lifecycle[${index}] success action[${actionIndex}]`)),
        failureActions: lifecycle.failureActions?.map((action, actionIndex) => resolveAction(action, queryRefs, pageRefs, componentRefs, errors, `Lifecycle[${index}] failure action[${actionIndex}]`))
      }];
    });
    try {
      const expanded = expandQueryLifecycles({ app_id: existingSummary?.app_id ?? "planned-app", pages, queries, events: existingSummary?.events ?? [] }, lifecycleSpecs);
      eventSpecs.push(...expanded.events);
      warnings.push(...expanded.warnings);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  const summary = {
    app_id: existingSummary?.app_id ?? "planned-app",
    name: existingSummary?.name ?? "Planned app",
    version_id: existingSummary?.version_id ?? "planned-version",
    pages,
    queries,
    events: [
      ...existingSummary?.events ?? [],
      ...eventSpecs.map((event, index) => ({
        id: `planned-event:${index}`,
        name: event.name,
        sourceId: event.sourceId,
        target: event.sourceType,
        event: { eventId: event.trigger, ...event.ref ? { ref: event.ref } : {}, ...event.action }
      }))
    ]
  };
  if (eventSpecs.length) {
    checked.push("event/lifecycle sources, triggers, action ids, and logical targets");
    const eventValidation = validateEvents(
      { ...summary, events: existingSummary?.events ?? [] },
      eventSpecs,
      // apply_app_phase moves a saved page switch behind the handlers a plan adds (navigationReorders).
      { navigationMovedLast: true }
    );
    errors.push(...eventValidation.errors);
    warnings.push(...eventValidation.warnings);
  }
  const structure = validateAppStructure(summary, options);
  const forward = splitForwardComponentRefs(structure.errors, existingQueryNames);
  errors.push(...forward.errors);
  warnings.push(...structure.warnings, ...forward.notes);
  const deduped = dropUnprefixedDuplicates(errors);
  return {
    ok: deduped.length === 0,
    errors: deduped,
    warnings: dropUnprefixedDuplicates(warnings),
    checked,
    not_checked: [
      "server acceptance of writes or external datasource connectivity",
      "query execution results and mutation side effects",
      "browser event delivery, dynamic bindings, and visual rendering"
    ],
    counts: {
      tables: tables.length,
      seed_rows: seedRows,
      pages: spec.pages?.length ?? 0,
      components: componentCount,
      queries: plannedQueries.length,
      events: eventSpecs.length,
      lifecycles: spec.lifecycles?.length ?? 0
    }
  };
}
function splitForwardComponentRefs(structureErrors, existingQueryNames) {
  const errors = [];
  const missing = /* @__PURE__ */ new Map();
  for (const error of structureErrors) {
    const m = error.match(/^Query "([^"]+)" references components\.([^,]+), but no component is named /) ?? error.match(/^RunJS query "([^"]+)" references components\["([^"]+)"\], but no component is named /);
    if (m && existingQueryNames.has(m[1])) {
      const names = missing.get(m[1]) ?? [];
      if (!names.includes(m[2]))
        names.push(m[2]);
      missing.set(m[1], names);
    } else {
      errors.push(error);
    }
  }
  const notes = [...missing].map(([query, names]) => `Query "${query}" reads ${names.map((n) => `components.${n}`).join(", ")}, which no page has yet. Build them on a later page with that exact name, or the query reads undefined.`);
  return { errors, notes };
}
function bindRef(map, ref, value, type, errors) {
  const existing = map.get(ref);
  if (!existing || existing.id === value.id)
    map.set(ref, value);
  else if (type && errors)
    errors.push(`Duplicate ${type} client_ref/name "${ref}" in planned app.`);
}
function registerRef(map, ref, value, type, errors) {
  if (map.has(ref))
    errors.push(`Duplicate ${type} client_ref/name "${ref}" in planned app.`);
  else
    map.set(ref, value);
}
function sourceMap(sourceType, components, queries, pages) {
  if (sourceType === "data_query")
    return queries;
  if (sourceType === "page")
    return pages;
  return components;
}
function resolveAction(raw, queries, pages, components, errors, label2) {
  const { target_ref: explicitRef, ...action } = raw;
  const targetRef = explicitRef ?? (action.actionId === "run-query" ? action.queryId ?? action.queryName : void 0);
  if (Object.values(action).some((value) => typeof value === "string" && /^planned-(query|page|component):/.test(value))) {
    errors.push(`${label2}: synthetic planned ids cannot be saved. Use action.target_ref with the logical client_ref or name.`);
    return action;
  }
  if (targetRef === void 0)
    return action;
  if (typeof targetRef !== "string") {
    errors.push(`${label2} target_ref must be a string.`);
    return action;
  }
  const actionId = action.actionId;
  const target = actionId === "run-query" ? queries.get(targetRef) : actionId === "switch-page" ? pages.get(targetRef) : ["show-modal", "close-modal", "control-component", "set-table-page", "scroll-component-into-view"].includes(String(actionId)) ? components.get(targetRef) : void 0;
  if (!target) {
    errors.push(`${label2} action "${String(actionId)}" has unknown or unsupported target_ref "${targetRef}".`);
    return action;
  }
  if (actionId === "run-query")
    return { ...action, queryId: target.id, queryName: target.name };
  if (actionId === "switch-page")
    return { ...action, pageId: target.id };
  if (actionId === "show-modal" || actionId === "close-modal")
    return { ...action, modal: target.id };
  if (actionId === "control-component" || actionId === "scroll-component-into-view") {
    return { ...action, componentId: target.id };
  }
  if (actionId === "set-table-page")
    return { ...action, table: target.id };
  return action;
}
function resolveRefs(refs, map, errors, label2) {
  return refs?.flatMap((ref) => {
    const value = map.get(ref);
    if (!value) {
      errors.push(`${label2} ref "${ref}" does not exist.`);
      return [];
    }
    return [value.id];
  });
}
function resolveRef(ref, map, errors, label2) {
  if (!ref)
    return void 0;
  const value = map.get(ref);
  if (!value) {
    errors.push(`${label2} ref "${ref}" does not exist.`);
    return void 0;
  }
  return value.id;
}
function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "page";
}
function unique$1(values) {
  return [...new Set(values)];
}
function dropUnprefixedDuplicates(values) {
  const distinct = unique$1(values);
  const stripped = new Set(distinct.map((value) => value.replace(/^Page "[^"]*": /, "")).filter((value, i) => value !== distinct[i]));
  return distinct.filter((value) => value.startsWith('Page "') || !stripped.has(value));
}
createRequire(import.meta.url);
var BUILT_IN_DB = /^tool\s*jet\s*(db|data\s*base)$/i;
function matchDatasourceByName(sources, name) {
  if (!name)
    return null;
  const exact = sources.filter((s) => s.name === name);
  if (exact.length === 1)
    return { id: exact[0].id, note: null };
  if (BUILT_IN_DB.test(name.trim())) {
    const db = sources.filter((s) => s.kind === "tooljetdb");
    if (db.length === 1)
      return { id: db[0].id, note: `datasource_name "${name}" is ToolJet's built-in database, "${db[0].name}" in this version.` };
  }
  return null;
}
var dbColumnTypeSchema = external_exports.string().describe("ToolJet DB types: string, integer, bigint, serial, number (double precision), boolean, timestamp, jsonb. Existing aliases text/varchar/int/float/decimal/double/bool/datetime/date/json and canonical API type names are accepted. numeric is unsupported; number/decimal are floating-point, not exact decimal. For money consider integer minor units.").refine((value) => TOOLJET_DB_DATA_TYPES.has(normalizeType(value)), {
  message: "Unsupported ToolJet DB type. Use string, integer, bigint, serial, number (double precision), boolean, timestamp or jsonb. numeric is not supported. For money choose on purpose: integer cents where sums must be exact, or number shown with a currency format for prices; never swap one in silently."
});
var foreignKeyAction = external_exports.enum(["RESTRICT", "NO ACTION", "CASCADE", "SET NULL", "SET DEFAULT"]);
var foreignKeySchema = external_exports.object({
  columns: external_exports.array(external_exports.string()).min(1),
  referencedTable: external_exports.string(),
  referencedColumns: external_exports.array(external_exports.string()).min(1),
  onDelete: foreignKeyAction.optional(),
  onUpdate: foreignKeyAction.optional()
});
var columnSchema = external_exports.object({
  name: external_exports.string(),
  type: dbColumnTypeSchema,
  primaryKey: external_exports.boolean().optional(),
  notNull: external_exports.boolean().optional(),
  unique: external_exports.boolean().optional(),
  defaultValue: external_exports.any().optional(),
  configurations: external_exports.record(external_exports.string(), external_exports.any()).optional()
});
var plannedTableSchema = external_exports.object({
  table_name: external_exports.string(),
  columns: external_exports.array(columnSchema).min(1),
  foreign_keys: external_exports.array(foreignKeySchema).optional()
});
var plannedSeedSchema = external_exports.object({
  table_name: external_exports.string(),
  rows: external_exports.array(external_exports.record(external_exports.string(), external_exports.any())).min(1).max(40)
});
var plannedQuerySchema = external_exports.object({
  client_ref: external_exports.string().optional(),
  datasource_id: external_exports.string().optional().describe("Exact id returned by list_datasources(version_id). Provide this OR datasource_name, not both."),
  datasource_name: external_exports.string().optional().describe("Exact, case-sensitive unique name returned by list_datasources(version_id). Alternative to datasource_id; resolved and pinned to that id at lint time."),
  name: external_exports.string(),
  kind: external_exports.string().optional(),
  /** Resolve this planned/existing ToolJet DB table name into options.table_id during lint/apply. */
  table_ref: external_exports.string().optional().describe("Actual table_name of a planned or existing ToolJet DB table, not a client_ref, alias, or UUID."),
  options: external_exports.record(external_exports.string(), external_exports.any()),
  /** The app's query of this name is updated in place with this definition: see pageReplace.ts. */
  update: external_exports.boolean().optional().describe("true: when the app already has a query of this name, it is updated in place with this definition, keeping its id and the events that run it, for every page that reads it (needs app_id). Without it, defining an existing name again is refused unless the definition is identical (then the existing query is used) or a replaced page owns it.")
});
var plannedPageSchema = external_exports.object({
  client_ref: external_exports.string().optional(),
  name: external_exports.string(),
  icon: pageIconSchema,
  hidden: external_exports.boolean().optional(),
  /** The existing page of this name is replaced whole: see pageReplace.ts. */
  replace: external_exports.boolean().optional().describe("true: the existing page of this name ends up holding exactly this plan's components and the events on them (needs app_id). It is written as a difference: a component the plan leaves as it is is not rewritten, one that only moved is moved, and one that changed keeps its id. Queries of that page the plan defines again are updated in place, keeping their ids. Refused when another page, event or query reads a component the plan drops. Not atomic: use it on draft or otherwise recoverable pages."),
  archetype: external_exports.string().optional().describe("The page's archetype: catalog (records with a face: photo cards, search, detail sheet), personal-overview (one person's period at a glance: hero, figures, progress, recent), register (a filtered table of records with a detail sheet), queue-board (work to act on: counts, needs-attention list, queue) or other. Lint checks the page against it."),
  components: external_exports.array(componentInputSchema).optional()
});
var plannedEventSchema = external_exports.object({
  source_ref: external_exports.string(),
  source_type: external_exports.enum(["component", "data_query", "page", "table_column", "table_action"]),
  ref: external_exports.string().optional(),
  trigger: external_exports.string(),
  action: external_exports.record(external_exports.string(), external_exports.any()),
  name: external_exports.string().optional()
});
var alertSchema = external_exports.object({
  message: external_exports.string().min(1),
  alert_type: external_exports.enum(["success", "info", "warning", "error"]).optional()
});
var plannedLifecycleSchema = external_exports.object({
  query_ref: external_exports.string(),
  before_refresh_actions: external_exports.array(external_exports.record(external_exports.string(), external_exports.any())).optional(),
  refresh_query_refs: external_exports.array(external_exports.string()).optional(),
  clear_component_refs: external_exports.array(external_exports.string()).optional(),
  close_modal_ref: external_exports.string().optional(),
  success_alert: alertSchema.optional(),
  failure_alert: alertSchema.optional(),
  success_actions: external_exports.array(external_exports.record(external_exports.string(), external_exports.any())).optional(),
  failure_actions: external_exports.array(external_exports.record(external_exports.string(), external_exports.any())).optional()
});
var appPlanSchema = external_exports.object({
  /** Existing app context for repair phases. Lets lint/apply resolve persisted refs safely. */
  app_id: external_exports.string().optional(),
  version_id: external_exports.string().optional(),
  /** Rename the target app as part of the same governed phase. */
  app_name: external_exports.string().trim().min(1).max(100).optional(),
  /** The user's words asking for the other component library than the app's: see componentLibrary.ts. */
  component_library_request: external_exports.string().trim().min(1).max(300).optional().describe('Only when the user asked in this request for the other component library than the app is built in (for example "use UI 2.0" or "use the new components" in a UI 1.0 app): their words. Without it, lint warns when the plan adds widgets from the other library.'),
  tables: external_exports.array(plannedTableSchema).max(50).optional(),
  seed_data: external_exports.array(plannedSeedSchema).max(50).optional(),
  queries: external_exports.array(plannedQuerySchema).max(200).optional(),
  pages: external_exports.array(plannedPageSchema).max(50).optional(),
  events: external_exports.array(plannedEventSchema).max(1e3).optional(),
  lifecycles: external_exports.array(plannedLifecycleSchema).max(200).optional()
});
function missingCreateRowColumns(options, columns) {
  if (options.operation !== "create_row")
    return;
  const map = options.create_row;
  if (!map || typeof map !== "object" || Array.isArray(map))
    return;
  const entries = Object.values(map);
  if (entries.some((entry) => !entry || typeof entry !== "object" || typeof entry.column !== "string" || !entry.column || entry.column.includes("{{")))
    return;
  const supplied = new Set(entries.filter((entry) => entry.value !== void 0 && entry.value !== null).map((entry) => entry.column));
  return columns.filter((column) => (column.primaryKey || column.notNull) && column.defaultValue == null && !/^(smallserial|serial|bigserial|serial2|serial4|serial8)$/i.test(column.type) && !supplied.has(column.name)).map((column) => column.name);
}
function bulkPrimaryKeyWarning(kind, options, tableName, columns) {
  if (kind !== "tooljetdb" || options.operation !== "bulk_upsert_with_primary_key" || !columns?.length)
    return;
  const config = options.bulk_upsert_with_primary_key;
  const keys = config?.primary_key;
  if (!Array.isArray(keys) || !keys.length || keys.some((key2) => typeof key2 !== "string" || key2.includes("{{")))
    return;
  const invalid = keys.filter((key2) => !columns.some((column) => column.name === key2 && column.primaryKey));
  if (!invalid.length)
    return;
  return `bulk_upsert_with_primary_key for "${tableName}" targets non-primary-key column(s) ${invalid.map((key2) => JSON.stringify(key2)).join(", ")}. This operation requires actual PRIMARY KEY columns; a UNIQUE business reference is not sufficient. Use the real primary key, or a supported conditional SQL upsert that preserves the intended matching and concurrency rules. Do not recreate an existing table or change its primary key merely to repair this query.`;
}
function updateRowsCompatibilityWarning(kind, options, tableName, columns) {
  if (kind !== "tooljetdb" || options.operation !== "update_rows" || !columns?.length)
    return;
  if (columns.includes("id"))
    return;
  return `Table "${tableName}" has no id column, but this query uses update_rows. ToolJet deployments that append order=id to the PATCH will fail even when the filter uses the correct custom primary key. For a new schema, prefer the automatically generated serial id and keep the business reference as a separate unique column. For an existing schema, inspect the primary key and the bulk_update_with_primary_key contract. Use that operation only if it preserves the requested targeting: never drop expected-state, ownership, tenant, or other where_filters to convert the query. If extra predicates are required, use a supported conditional-write operation or report the capability gap. Do not recreate existing tables or execute a mutation just to test compatibility.`;
}
async function inspectUpdateCompatibility(client, queries) {
  const targets = queries.filter((query) => query.kind === "tooljetdb" && ["update_rows", "create_row", "bulk_upsert_with_primary_key"].includes(String(query.options.operation)));
  if (!targets.length)
    return [];
  let tables;
  try {
    tables = await client.listTables();
  } catch {
    return ["Structured-write schema compatibility was not checked: table metadata could not be read."];
  }
  const schemas = /* @__PURE__ */ new Map();
  return (await Promise.all(targets.map(async (query) => {
    const tableId = query.options.table_id;
    if (typeof tableId !== "string" || tableId.includes("{{")) {
      return `Query "${query.name}": structured-write schema compatibility was not checked for a dynamic or missing table_id.`;
    }
    const table = tables.find((item) => item.id === tableId);
    if (!table)
      return `Query "${query.name}": structured-write schema compatibility was not checked: table_id was not found in workspace metadata.`;
    if (!schemas.has(tableId))
      schemas.set(tableId, Promise.resolve().then(() => client.getTableSchema(table.table_name)).catch(() => void 0));
    const schema = await schemas.get(tableId);
    if (!schema?.length)
      return `Query "${query.name}": structured-write schema compatibility was not checked because the schema for "${table.table_name}" was unavailable or empty.`;
    const missing = missingCreateRowColumns(query.options, schema.map((column) => ({
      name: column.name,
      type: column.type,
      primaryKey: column.isPrimaryKey,
      notNull: column.isNotNull,
      defaultValue: column.defaultValue
    })));
    const warning = missing?.length ? `create_row for "${table.table_name}" omits required non-generated column(s) ${missing.map((name) => JSON.stringify(name)).join(", ")}. Seed records do not supply values for future inserts. Supply required values or verify an existing database trigger; metadata does not verify triggers. Do not recreate tables to repair this query.` : bulkPrimaryKeyWarning("tooljetdb", query.options, table.table_name, schema.map((column) => ({ name: column.name, primaryKey: column.isPrimaryKey }))) ?? updateRowsCompatibilityWarning("tooljetdb", query.options, table.table_name, schema.map((column) => column.name));
    const arithmetic = arithmeticWriteWarning(query.kind, query.options);
    const combined = [warning, arithmetic].filter(Boolean).join(" ");
    return combined ? `Query "${query.name}": ${combined}` : void 0;
  }))).filter((warning) => !!warning);
}
function normalizePlanBindingAliases(plan, existing, datasourceKinds = /* @__PURE__ */ new Map(), datasourceNames = /* @__PURE__ */ new Map()) {
  const components = (plan.pages ?? []).flatMap((page) => page.components ?? []);
  const aliases = (items, savedNames) => {
    const counts = /* @__PURE__ */ new Map();
    for (const name of [...savedNames, ...items.map((item) => item.name)])
      counts.set(name, (counts.get(name) ?? 0) + 1);
    const candidates = /* @__PURE__ */ new Map();
    for (const item of items)
      if (item.client_ref && item.client_ref !== item.name) {
        candidates.set(item.client_ref, [...candidates.get(item.client_ref) ?? [], item.name]);
      }
    return new Map([...candidates].flatMap(([alias, names]) => names.length === 1 && !counts.has(alias) && counts.get(names[0]) === 1 ? [[alias, names[0]]] : []));
  };
  const maps = {
    components: aliases(components, (existing?.pages ?? []).flatMap((page) => page.components.flatMap((c) => c.name ? [c.name] : []))),
    queries: aliases(plan.queries ?? [], (existing?.queries ?? []).flatMap((q) => q.name ? [q.name] : []))
  };
  const changed = /* @__PURE__ */ new Set();
  const rewrite = (code) => {
    const edits = ["components", "queries"].flatMap((namespace) => namespaceReads(code, namespace).flatMap((read) => {
      const target = maps[namespace].get(read.name);
      if (!target)
        return [];
      changed.add(`${namespace}[${JSON.stringify(read.name)}] \u2192 ${namespace}[${JSON.stringify(target)}]`);
      return [{ ...read, text: `${namespace}${read.optional ? "?." : ""}[${JSON.stringify(target)}]` }];
    }));
    for (const edit of edits.sort((a, b) => b.start - a.start))
      code = code.slice(0, edit.start) + edit.text + code.slice(edit.end);
    return code;
  };
  const values = (value) => {
    if (typeof value === "string") {
      let result = value;
      for (const span of bindingSpans(value).reverse()) {
        const source = `(${span.body})`;
        const normalized = rewrite(source);
        if (source !== normalized)
          result = result.slice(0, span.start) + `{{${normalized.slice(1, -1)}}}` + result.slice(span.end);
      }
      return result;
    }
    if (Array.isArray(value))
      return value.map(values);
    if (value && typeof value === "object")
      return Object.fromEntries(Object.entries(value).map(([key2, child]) => [key2, values(child)]));
    return value;
  };
  for (const component of components) {
    for (const section of ["properties", "styles", "validation", "others"]) {
      if (component[section])
        component[section] = values(component[section]);
    }
  }
  for (const query of plan.queries ?? []) {
    const kind = datasourceKinds.get(query.datasource_id ?? "") ?? datasourceNames.get(query.datasource_name ?? "") ?? query.kind;
    const originalCode = query.options.code;
    const hasCode = Object.hasOwn(query.options, "code");
    const { code: _code, ...otherOptions } = query.options;
    query.options = values(kind === "runjs" ? otherOptions : query.options);
    if (kind === "runjs" && hasCode) {
      query.options.code = typeof originalCode === "string" ? rewrite(originalCode) : originalCode;
    }
  }
  for (const event of plan.events ?? [])
    event.action = values(event.action);
  for (const lifecycle of plan.lifecycles ?? []) {
    for (const key2 of ["before_refresh_actions", "success_actions", "failure_actions"]) {
      if (lifecycle[key2])
        lifecycle[key2] = values(lifecycle[key2]);
    }
    for (const key2 of ["success_alert", "failure_alert"]) {
      if (lifecycle[key2])
        lifecycle[key2] = values(lifecycle[key2]);
    }
  }
  return [...changed].map((change) => `Resolved explicit binding alias ${change}; the submitted definitions now use the runtime name. No inferred names were rewritten.`);
}
var stable = (value) => JSON.stringify(value, (_key, inner) => inner && typeof inner === "object" && !Array.isArray(inner) ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : inner);
function restatedQueryNames(summary, queries, tables, datasources) {
  const restated = [];
  for (const query of queries) {
    const held = summary.queries.filter((existing2) => existing2.name === query.name);
    if (held.length !== 1)
      continue;
    const existing = held[0];
    const matched = query.datasource_id === void 0 ? matchDatasourceByName(datasources, query.datasource_name) : null;
    const datasource = query.datasource_id !== void 0 ? datasources.find((source) => source.id === query.datasource_id) : matched ? datasources.find((source) => source.id === matched.id) : void 0;
    if (!datasource || datasource.id !== existing.data_source_id)
      continue;
    const options = structuredClone(query.options ?? {});
    if (query.table_ref) {
      const table = tables.find((candidate) => candidate.table_name.toLowerCase() === query.table_ref.toLowerCase());
      if (!table)
        continue;
      options.table_id = table.id;
    }
    const prepared = prepareQueryOptionsForWrite(datasource.kind, options, `Query "${query.name}"`);
    if (prepared.errors.length)
      continue;
    if (stable(prepared.options) === stable(existing.options ?? {}))
      restated.push(query.name);
  }
  return restated;
}
var TABLE_NAME_MAX = 31;
function unique(values) {
  return [...new Set(values)];
}
function lintAppSpecTool(client) {
  return {
    name: "lint_app_spec",
    title: "Lint App Spec (Dry Run)",
    // The dry run half of the governed phase: it never mutates ToolJet.
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: "Dry-run an exact app phase before any writes. It validates optional ToolJet DB tables/seed_data, datasource queries, pages/components, events, and concise query lifecycles together. Give pages, queries, and components stable client_ref values; events use source_ref and targeted actions use target_ref. A query can use table_ref to resolve a planned/existing ToolJet DB table by its actual table_name into options.table_id (not a client_ref or alias). For each query use either the exact datasource_id or the exact unique datasource_name from list_datasources(version_id); names are pinned to IDs during this preflight, never guessed from kind. Set app_name when the target app should be renamed in the same governed phase. For repair/continuation phases, pass app_id so persisted page/component/query refs are included and can be targeted without redeclaring them. To rebuild an existing page whole, mark its plan page replace: true (with app_id): the plan is checked against the app with that page emptied, the page's own queries may be defined again (updated in place on apply), and a component another page, event or query still reads must be kept under its name. A Form submits through a Button inside it: set the Form's properties.buttonToSubmit to that Button's client_ref in the same plan (resolved to its id on apply). On success it returns a one-time 30-minute plan_token for apply_app_phase. Treat this call as an awaited barrier; it never mutates ToolJet. " + COMPONENT_FX_GUIDANCE,
    inputSchema: appPlanSchema.shape,
    async handler(args) {
      try {
        if (!args.app_name && ![args.tables, args.seed_data, args.queries, args.pages, args.events, args.lifecycles].some((items) => items?.length)) {
          return fail(new Error("lint_app_spec needs at least one table, seed_data batch, query, page, event, or lifecycle."));
        }
        const columnless = (args.tables ?? []).filter((table) => !Array.isArray(table.columns));
        if (columnless.length) {
          return fail(new Error(`tables: ${columnless.map((t) => `"${t.table_name ?? "?"}"`).join(", ")} has no columns. List only new tables here, each with its columns; an existing table needs no entry (queries reach it by table_ref).`));
        }
        const preflightErrors = [];
        const preflightWarnings = [];
        const replacePages = (args.pages ?? []).filter((page) => page.replace).map((page) => `"${page.name}"`);
        if (replacePages.length && !args.app_id) {
          preflightErrors.push(`pages ${replacePages.join(", ")}: replace needs app_id, so the plan is checked against the page it replaces.`);
        }
        const needsTables = Boolean(args.tables?.length || args.seed_data?.length || args.queries?.some((query) => query.table_ref || typeof query.options?.table_id === "string"));
        const [existingTables, fetchedSummary] = await Promise.all([
          needsTables ? client.listTables() : Promise.resolve([]),
          args.app_id ? client.getAppSummary(args.app_id) : Promise.resolve(void 0)
        ]);
        const frozen = frozenAppRefusal(fetchedSummary);
        if (frozen)
          return fail(new Error(frozen));
        const appLibrary = fetchedSummary ? fetchedSummary.component_library ?? resolveComponentLibrary(void 0, fetchedSummary.pages.flatMap((page) => page.components.map((c) => c.type))) : { library: "ui2", source: "new" };
        preflightWarnings.push(...componentLibraryWarnings(appLibrary, args.pages, args.component_library_request));
        const mapRefusal = await mapKeyRefusal(client, (args.pages ?? []).flatMap((page) => (page.components ?? []).map((c) => String(c.type))), appLibrary.library);
        if (mapRefusal)
          preflightErrors.push(mapRefusal);
        const plannedNames = /* @__PURE__ */ new Map();
        for (const table of args.tables ?? []) {
          const key2 = table.table_name.toLowerCase();
          if (plannedNames.has(key2))
            return fail(new Error(`Ambiguous planned table name "${table.table_name}": table names must be unique ignoring case.`));
          plannedNames.set(key2, table.table_name);
        }
        const existingNames = /* @__PURE__ */ new Map();
        const ambiguousNames = /* @__PURE__ */ new Set();
        for (const table of existingTables) {
          const key2 = table.table_name.toLowerCase();
          if (existingNames.has(key2))
            ambiguousNames.add(key2);
          existingNames.set(key2, table.table_name);
        }
        const existingExact = new Set(existingTables.map((table) => table.table_name));
        const canonicalTableName = (name) => {
          const key2 = name.toLowerCase();
          if (ambiguousNames.has(key2) && !existingExact.has(name))
            throw new Error(`Ambiguous existing table name "${name}": multiple workspace tables match ignoring case. No plan token was issued.`);
          return plannedNames.get(key2) ?? (existingExact.has(name) ? name : existingNames.get(key2)) ?? name;
        };
        for (const name of plannedNames.values())
          canonicalTableName(name);
        for (const seed of args.seed_data ?? [])
          seed.table_name = canonicalTableName(seed.table_name);
        for (const query of args.queries ?? [])
          if (query.table_ref)
            query.table_ref = canonicalTableName(query.table_ref);
        for (const table of args.tables ?? []) {
          for (const fk of table.foreign_keys ?? []) {
            const ref = fk;
            for (const field of ["referencedTable", "referenced_table", "references_table"]) {
              if (typeof ref[field] === "string")
                ref[field] = canonicalTableName(ref[field]);
            }
          }
        }
        const hasSql = args.queries?.some((query) => query.options?.operation === "sql_execution" || query.options?.sql_execution !== void 0);
        const datasources = args.queries?.length && args.version_id ? await client.listDatasources(args.version_id) : [];
        if (fetchedSummary && args.queries?.length) {
          const restated = restatedQueryNames(fetchedSummary, args.queries.filter((query) => !query.table_ref || !plannedNames.has(query.table_ref.toLowerCase())), existingTables, datasources);
          if (restated.length) {
            args.queries = args.queries.filter((query) => !restated.includes(query.name));
            preflightWarnings.push(`${restated.map((name) => `"${name}"`).join(", ")}: already in the app exactly as written here, so the plan uses the existing quer` + (restated.length > 1 ? "ies" : "y") + " and defines nothing again.");
          }
          const planPages = new Set((args.pages ?? []).map((page) => page.name));
          for (const query of args.queries.filter((candidate) => candidate.update)) {
            const users = pagesUsingQuery(fetchedSummary, query.name, planPages);
            if (users.length) {
              preflightWarnings.push(`Query "${query.name}" is updated in place, and page${users.length > 1 ? "s" : ""} ${users.map((user) => `"${user}"`).join(", ")} also read${users.length > 1 ? "" : "s"} it: keep the fields they use.`);
            }
          }
        }
        const view = fetchedSummary ? replaceView(fetchedSummary, args) : void 0;
        const existingSummary = view?.summary ?? fetchedSummary;
        if (view && fetchedSummary)
          preflightErrors.push(...danglingAfterReplace(fetchedSummary, view, args));
        if (args.version_id && existingSummary?.version_id && args.version_id !== existingSummary.version_id) {
          preflightErrors.push(`App "${args.app_id}" editing version is "${existingSummary.version_id}", not "${args.version_id}".`);
        }
        const tableIds = new Map(existingTables.map((table) => [table.table_name.toLowerCase(), table.id]));
        const reservedTableNames = new Map([...tableIds, ...plannedNames]);
        const plannedNew = new Set((args.tables ?? []).map((table) => table.table_name.toLowerCase()));
        const seededExisting = [...new Set((args.seed_data ?? []).map((seed) => seed.table_name))].filter((name) => tableIds.has(name.toLowerCase()) && !plannedNew.has(name.toLowerCase()));
        const withRows = await Promise.all(seededExisting.map(async (name) => await client.hasRows?.(tableIds.get(name.toLowerCase())).catch(() => void 0) === true ? name : void 0));
        for (const name of withRows.filter(Boolean)) {
          preflightErrors.push(`Seed data targets "${name}", which already has rows (seeded earlier), so they would be inserted again: leave that table out of seed_data. To add more rows to it, call insert_rows_batch with only the new rows.`);
        }
        for (const table of args.tables ?? []) {
          const key2 = table.table_name.toLowerCase();
          if (tableIds.has(key2)) {
            if (hasSql) {
              preflightErrors.push(`Planned table "${table.table_name}" already exists and this plan contains SQL queries. Rename the planned table and update all SQL references, seed data, table_ref and foreign keys together, then lint again. To reuse the existing table, remove it from tables instead.`);
              continue;
            }
            const oldName = table.table_name;
            const newName = nextTableName(oldName, reservedTableNames);
            reservedTableNames.set(newName.toLowerCase(), newName);
            table.table_name = newName;
            for (const seed of args.seed_data ?? [])
              if (seed.table_name === oldName)
                seed.table_name = newName;
            for (const query of args.queries ?? [])
              if (query.table_ref === oldName)
                query.table_ref = newName;
            for (const other of args.tables ?? []) {
              for (const fk of other.foreign_keys ?? []) {
                const ref = fk;
                for (const field of ["referencedTable", "referenced_table", "references_table"]) {
                  if (ref[field] === oldName)
                    ref[field] = newName;
                }
              }
            }
            preflightWarnings.push(`Planned table "${oldName}" already exists in this workspace, so it is created as "${newName}"; seed data, table_ref and foreign keys were updated to match. To reuse the existing table instead, drop it from tables and point queries at it with table_ref.`);
            tableIds.set(newName.toLowerCase(), `planned-table:${newName}`);
          } else
            tableIds.set(key2, `planned-table:${table.table_name}`);
        }
        preflightWarnings.push(...autoFitHtmlHeights(args));
        if (existingSummary) {
          const plannedNames2 = new Set((args.pages ?? []).map((page) => page.name.toLowerCase()));
          const createsPages = (args.pages ?? []).some((page) => !existingSummary.pages.some((existing) => existing.name?.toLowerCase() === page.name.toLowerCase() || page.name === "Home" && existing.handle === "home"));
          const abandoned = existingSummary.pages.filter((page) => page.components.length === 0 && page.handle !== "home" && page.name && !plannedNames2.has(page.name.toLowerCase()));
          if (createsPages && abandoned.length) {
            preflightErrors.push(`App already has ${abandoned.length} empty page(s) this plan does not touch: ${abandoned.map((page) => `"${page.name}"`).join(", ")}. Build on them (use the exact existing name in pages[]) or delete them with delete_page before creating new pages, so the app does not end up with duplicates.`);
          }
        }
        const plannedTables = new Map((args.tables ?? []).map((table) => [table.table_name.toLowerCase(), table]));
        for (const seed of args.seed_data ?? []) {
          if (!tableIds.has(seed.table_name.toLowerCase())) {
            preflightErrors.push(`Seed data targets unknown planned/existing table "${seed.table_name}".`);
          }
          const plannedTable = plannedTables.get(seed.table_name.toLowerCase());
          if (plannedTable) {
            preflightErrors.push(...invalidSeedTimestamps(plannedTable.columns, seed.rows).map((error) => `Seed data for planned table "${seed.table_name}": ${error}`));
            const requiredColumns = plannedTable.columns.filter((column) => (column.primaryKey || column.notNull) && column.defaultValue === void 0 && !/serial/i.test(column.type));
            for (const column of requiredColumns) {
              const missingRows = seed.rows.reduce((indexes, row, index) => {
                if (!(column.name in row) || row[column.name] === null || row[column.name] === void 0) {
                  indexes.push(index + 1);
                }
                return indexes;
              }, []);
              if (!missingRows.length)
                continue;
              if (column.primaryKey && /^(integer|bigint|int|int4|int8)$/i.test(column.type) && (args.seed_data ?? []).filter((batch) => batch.table_name.toLowerCase() === seed.table_name.toLowerCase()).every((batch) => batch.rows.every((row) => !(column.name in row)))) {
                const originalType = column.type;
                column.type = "serial";
                preflightWarnings.push(`Planned table "${seed.table_name}": primary key "${column.name}" was declared ${JSON.stringify(originalType)} with no value in any seed row, so it is created as "serial" (auto-generated). Omit it from inserts.`);
                continue;
              }
              const nullRows = missingRows.filter((n) => column.name in seed.rows[n - 1]);
              const absentRows = missingRows.filter((n) => !nullRows.includes(n));
              if (nullRows.length) {
                preflightErrors.push(`Seed data for planned table "${seed.table_name}": required column "${column.name}" is null in row(s) ${nullRows.join(", ")}. Give each of those rows a real value (seed rows are literal values, not formulas), or add a defaultValue.`);
              }
              if (absentRows.length) {
                preflightErrors.push(`Seed data for planned table "${seed.table_name}" omits required non-generated column "${column.name}" in row(s) ${absentRows.join(", ")}. Use type "serial" for a generated key, add a defaultValue, or provide explicit values.`);
              }
            }
          }
        }
        if (args.queries?.length && !args.version_id) {
          preflightErrors.push("version_id is required when a plan contains queries.");
        }
        const datasourceKinds = new Map(datasources.map((datasource) => [datasource.id, datasource.kind]));
        const uniqueDatasourceNames = new Map(datasources.filter((source) => datasources.filter((other) => other.name === source.name).length === 1).map((source) => [source.name, source.kind]));
        preflightWarnings.push(...normalizePlanBindingAliases(args, existingSummary, datasourceKinds, uniqueDatasourceNames));
        const resolvedQueryIds = /* @__PURE__ */ new Map();
        const queries = (args.queries ?? []).map((query, index) => {
          let datasourceId = query.datasource_id;
          const hasId = query.datasource_id !== void 0;
          const hasName = query.datasource_name !== void 0;
          if (hasId === hasName) {
            preflightErrors.push(`Query "${query.name}" must provide exactly one of datasource_id or datasource_name.`);
          } else if (hasName) {
            const matches = datasources.filter((source) => source.name === query.datasource_name);
            const matched = matchDatasourceByName(datasources, query.datasource_name);
            if (!matched) {
              preflightErrors.push(`Query "${query.name}" datasource_name "${query.datasource_name}" must match exactly one source in this version (found ${matches.length}). Use the exact name or id returned by list_datasources(version_id).`);
            } else {
              datasourceId = matched.id;
              if (matched.note)
                preflightWarnings.push(`Query "${query.name}": ${matched.note}`);
            }
          }
          const datasourceKind = datasourceKinds.get(datasourceId ?? "");
          if (args.version_id && !datasourceKind) {
            preflightErrors.push(`Query "${query.name}" datasource "${datasourceId ?? query.datasource_name ?? ""}" is not available.`);
          }
          if (datasourceId && datasourceKind)
            resolvedQueryIds.set(index, datasourceId);
          if (query.kind && datasourceKind && query.kind !== datasourceKind) {
            preflightErrors.push(`Query "${query.name}" kind "${query.kind}" does not match datasource kind "${datasourceKind}".`);
          }
          const options = structuredClone(query.options);
          if (query.table_ref) {
            const tableId = tableIds.get(query.table_ref.toLowerCase());
            if (!tableId)
              preflightErrors.push(`Query "${query.name}" has unknown table_ref "${query.table_ref}". Use the actual table_name from tables[] or list_tables, not a client_ref, alias, or UUID.`);
            else
              options.table_id = tableId;
          } else if ((datasourceKind ?? query.kind) === "tooljetdb" && typeof options.table_id === "string") {
            const known = new Set(existingTables.map((table) => table.id));
            if (!known.has(options.table_id)) {
              const prefix = options.table_id.slice(0, 8);
              const nearest = existingTables.filter((table) => table.id.startsWith(prefix)).map((table) => `${table.table_name} (${table.id})`);
              preflightErrors.push(`Query "${query.name}": table_id "${options.table_id}" is not a table in this workspace` + (nearest.length ? `; the closest id is ${nearest.join(", ")}` : "") + ". Use table_ref with the table name and let the server resolve the id instead of copying UUIDs.");
            }
          }
          return {
            clientRef: query.client_ref,
            datasourceId: datasourceId ?? "",
            name: query.name,
            kind: datasourceKind ?? query.kind,
            options
          };
        });
        const schemas = /* @__PURE__ */ new Map();
        const insertSchemas = /* @__PURE__ */ new Map();
        for (const table of args.tables ?? []) {
          const columns = table.columns.map((column) => column.name);
          if (!table.columns.some((column) => column.primaryKey))
            columns.push("id");
          schemas.set(`planned-table:${table.table_name}`, columns);
          insertSchemas.set(`planned-table:${table.table_name}`, table.columns.some((column) => column.primaryKey) ? table.columns : [...table.columns, { name: "id", type: "serial", primaryKey: true }]);
        }
        const updateTableIds = new Set(queries.filter((query) => query.kind === "tooljetdb" && ["update_rows", "create_row", "bulk_upsert_with_primary_key"].includes(String(query.options.operation)) && typeof query.options.table_id === "string").map((query) => query.options.table_id));
        await Promise.all([...updateTableIds].map(async (tableId) => {
          if (schemas.has(tableId))
            return;
          const table = existingTables.find((item) => item.id === tableId);
          if (!table)
            return;
          try {
            const schema = await client.getTableSchema(table.table_name);
            schemas.set(tableId, schema.map((column) => column.name));
            insertSchemas.set(tableId, schema.map((column) => ({
              name: column.name,
              type: column.type,
              primaryKey: column.isPrimaryKey,
              notNull: column.isNotNull,
              defaultValue: column.defaultValue
            })));
          } catch {
            preflightWarnings.push(`Could not inspect write target "${table.table_name}"; required insert columns were not checked and update_rows primary-key compatibility was not checked. Inspect its schema before relying on the save workflow.`);
          }
        }));
        for (const query of queries) {
          const tableId = query.options.table_id;
          const tableName = existingTables.find((table) => table.id === tableId)?.table_name ?? (args.tables ?? []).find((table) => `planned-table:${table.table_name}` === tableId)?.table_name ?? tableId;
          const warning = updateRowsCompatibilityWarning(query.kind, query.options, tableName, schemas.get(tableId));
          if (warning)
            preflightWarnings.push(`Query "${query.name}": ${warning}`);
          const arithmetic = arithmeticWriteWarning(query.kind, query.options);
          if (arithmetic)
            preflightWarnings.push(`Query "${query.name}": ${arithmetic}`);
          const bulkWarning = bulkPrimaryKeyWarning(query.kind, query.options, tableName, insertSchemas.get(tableId));
          if (bulkWarning)
            (tableId.startsWith("planned-table:") ? preflightErrors : preflightWarnings).push(`Query "${query.name}": ${bulkWarning}`);
          if (query.kind === "tooljetdb" && insertSchemas.has(tableId)) {
            const missing = missingCreateRowColumns(query.options, insertSchemas.get(tableId));
            if (missing?.length) {
              const message = `Query "${query.name}": create_row for "${tableName}" omits required non-generated column(s) ${missing.map((name) => JSON.stringify(name)).join(", ")}. Seed rows do not supply values for future user-created records. Include the required values in this insert, or use a generated/defaulted key when designing a new table. Never recreate an existing table or change its key merely to fix this query.`;
              if (tableId.startsWith("planned-table:"))
                preflightErrors.push(message);
              else
                preflightWarnings.push(message + " Metadata does not verify database triggers; if an existing trigger supplies these fields, confirm that contract instead.");
            }
          }
        }
        const canvasColor = args.app_id ? await literalCanvasColor(client, args.app_id, existingSummary?.version_id ?? args.version_id) : void 0;
        const lint = lintPlannedApp({
          tables: args.tables?.map((table) => ({
            tableName: table.table_name,
            columns: table.columns,
            foreignKeys: table.foreign_keys
          })),
          seedData: args.seed_data?.map((seed) => ({ tableName: seed.table_name, rows: seed.rows })),
          queries,
          pages: args.pages?.map((page) => ({
            clientRef: page.client_ref,
            name: page.name,
            icon: page.icon,
            hidden: page.hidden,
            archetype: page.archetype,
            components: page.components?.map((component) => ({
              name: component.name,
              type: component.type,
              properties: component.properties,
              styles: component.styles,
              validation: component.validation,
              others: component.others,
              layout: component.layout,
              layouts: component.layouts,
              clientRef: component.client_ref,
              parentRef: component.parent_ref,
              parent: component.parent,
              slotName: component.slot_name
            }))
          })),
          events: args.events?.map((event) => ({
            sourceRef: event.source_ref,
            sourceType: event.source_type,
            ref: event.ref,
            trigger: event.trigger,
            action: event.action,
            name: event.name
          })),
          lifecycles: args.lifecycles?.map((lifecycle) => ({
            queryRef: lifecycle.query_ref,
            beforeRefreshActions: lifecycle.before_refresh_actions,
            refreshQueryRefs: lifecycle.refresh_query_refs,
            clearComponentRefs: lifecycle.clear_component_refs,
            closeModalRef: lifecycle.close_modal_ref,
            successAlert: lifecycle.success_alert ? { message: lifecycle.success_alert.message, alertType: lifecycle.success_alert.alert_type } : void 0,
            failureAlert: lifecycle.failure_alert ? { message: lifecycle.failure_alert.message, alertType: lifecycle.failure_alert.alert_type } : void 0,
            successActions: lifecycle.success_actions,
            failureActions: lifecycle.failure_actions
          }))
        }, existingSummary, { canvasColor });
        const result = {
          ...lint,
          ok: lint.ok && preflightErrors.length === 0,
          errors: unique([...preflightErrors, ...lint.errors]),
          warnings: unique([...preflightWarnings, ...lint.warnings])
        };
        if (!result.ok)
          return ok(result);
        const resolvedSpec = { ...args, queries: args.queries?.map((query, index) => {
          const { datasource_name: _name, ...rest } = query;
          return { ...rest, datasource_id: resolvedQueryIds.get(index) };
        }) };
        const stored = storeAppPlan(resolvedSpec, result, view && fetchedSummary ? replaceFingerprint(fetchedSummary, view) : void 0);
        return ok({ ...result, ...stored });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function nextTableName(name, taken) {
  for (let n = 2; n < 100; n++) {
    const suffix = `_${n}`;
    const candidate = `${name.slice(0, Math.max(1, TABLE_NAME_MAX - suffix.length))}${suffix}`;
    if (!taken.has(candidate.toLowerCase()))
      return candidate;
  }
  return `${name.slice(0, TABLE_NAME_MAX - 7)}_${Date.now().toString(36).slice(-6)}`;
}
function autoFitHtmlHeights(args) {
  const warnings = [];
  for (const page of args.pages ?? []) {
    const components = page.components ?? [];
    for (const component of components) {
      if (component.type !== "Html")
        continue;
      const rect = component.layouts?.desktop ?? component.layout;
      if (!rect || typeof rect.height !== "number" || typeof rect.top !== "number")
        continue;
      const fix = suggestedHtmlHeight(component);
      if (!fix)
        continue;
      const delta = fix.to - fix.from;
      const oldBottom = rect.top + fix.from;
      const parentOf = (c) => c.parent_ref ?? c.parent ?? "";
      const moved = [];
      for (const sibling of components) {
        if (sibling === component || parentOf(sibling) !== parentOf(component))
          continue;
        for (const r of [sibling.layout, sibling.layouts?.desktop, sibling.layouts?.mobile]) {
          if (r && typeof r.top === "number" && r.top >= oldBottom - 4)
            r.top += delta;
        }
        const r0 = sibling.layouts?.desktop ?? sibling.layout;
        if (r0 && typeof r0.top === "number" && r0.top - delta >= oldBottom - 4)
          moved.push(sibling.name ?? sibling.client_ref ?? "?");
      }
      for (const r of [component.layout, component.layouts?.desktop])
        if (r && typeof r.height === "number")
          r.height = fix.to;
      warnings.push(`Page "${page.name}": Html "${component.name ?? component.client_ref ?? "?"}" needed about ${fix.needed}px for its markup but was ${fix.from}px, so its height is now ${fix.to}px` + (moved.length ? ` and ${moved.length} component(s) below it moved down ${delta}px (${[...new Set(moved)].join(", ")})` : "") + ". The plan was applied with these values.");
    }
  }
  return warnings;
}
export {
  normalizePlannedLayouts as A,
  materializeRequiredDefaultChildren as B,
  persistedEventIds as C,
  replaceFingerprint as a,
  prepareQueryOptionsForWrite as b,
  consumeAppPlan as c,
  danglingAfterReplace as d,
  prepareComponentBatch as e,
  frozenAppRefusal as f,
  replaceIds as g,
  expandQueryLifecycles as h,
  persistedEventSpecs as i,
  dbColumnTypeSchema as j,
  componentInputSchema as k,
  literalCanvasColor as l,
  matchPlannedPage as m,
  navigationReorders as n,
  lintAppSpecTool as o,
  peekAppPlan as p,
  projectJavascriptRuntime as q,
  replaceView as r,
  projectAppSettings as s,
  compactTheme as t,
  pageSettingProperties as u,
  validateEvents as v,
  containsExactValue as w,
  inspectUpdateCompatibility as x,
  normalizePlanBindingAliases as y,
  containsNamedBinding as z
};
