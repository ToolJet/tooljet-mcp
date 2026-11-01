import { createRequire } from "node:module";
import { o as external_exports, p as COMPONENT_FX_GUIDANCE } from "./chunk-8iUq0slz.js";
import { r as resolveRef$1, c as componentRef, v as validateTableBatch, n as normalizeComponentSpec, i as indexComponentReferences, a as normalizeType, b as booleanBindingValue, T as TOOLJET_DB_DATA_TYPES, f as fail, d as invalidSeedTimestamps, o as ok } from "./chunk-DbFNT0Gf.js";
import { p as lintComponentStateBindings, d as decodeComponentParent, q as minimumTextHeight, r as pageIconError, t as lintComponents, e as encodeComponentParent, v as validateAppStructure, a as componentNameSchema, c as componentSlotSchema, s as suggestedHtmlHeight, u as pageIconSchema, w as namespaceReads } from "./chunk-gznY6rD8.js";
import { e5 as getComponentSchema } from "./chunk-BEuHHGL1.js";
import { f as normalizeQueryToggles, t as toggleRewriteWarning, i as issueMessages, q as queryToggleIssues, e as normalizeQueryOptions, v as validateQueryOptions, p as parseExpression, g as arithmeticWriteWarning, b as bindingSpans } from "./chunk-yxr8SUor.js";
import { randomUUID } from "node:crypto";
import { j as union, A as string, V as number, a7 as looseObject, U as object, a8 as literal, i as unknown, ax as _enum, aU as array, ai as intersection, K as record, aQ as boolean, N as preprocess, T as optional, ae as iso_exports, aD as discriminatedUnion, aI as custom, Y as _null2 } from "./chunk-4DDZMCNh.js";
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
  let unknown2 = false;
  let found = false;
  let group = false;
  const visit = (items) => {
    if (typeof items === "string" && items.includes("{{")) {
      unknown2 = true;
      return;
    }
    if (!Array.isArray(items)) {
      if (items == null)
        unknown2 = true;
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
        unknown2 = true;
      if (item.isGroup)
        visit(item.children ?? []);
    }
  };
  visit(propVal(source.properties, "menuItems"));
  return group ? "invalid" : found ? "valid" : unknown2 ? "unknown" : "invalid";
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
    const label = event.name ? `Event "${event.name}"` : `Event[${index}]`;
    errors.push(...lintComponentStateBindings(event.action, [...components.values()], label));
    if (event.sourceType === "component") {
      const source = components.get(event.sourceId);
      for (const ref of new Set([event.ref, event.action.ref].filter((ref2) => ref2 != null && ref2 !== ""))) {
        if (source?.type !== "Navigation" || event.trigger !== "onClick") {
          (options.savedRefs?.has(event) ? warnings : errors).push(`${label}: ordinary component events cannot use ref; use name to label the handler. Only Navigation onClick item refs and Table Button-column refs have component sub-element scopes.`);
        } else if (!nonEmptyString(ref) || ref.includes("{{")) {
          errors.push(`${label}: Navigation onClick ref must be a literal non-empty item id.`);
        } else {
          const membership = navigationItemRef(source, ref);
          if (membership === "invalid")
            errors.push(`${label}: Navigation ref "${ref}" does not identify a non-group menu item.`);
          if (membership === "unknown")
            warnings.push(`${label}: Navigation ref "${ref}" membership cannot be verified because menuItems are unresolved/dynamic. Verify the runtime item id; no item membership was inferred.`);
        }
      }
      if (!source)
        errors.push(`${label}: component source "${event.sourceId}" does not exist.`);
      else if (source.type) {
        const schema = getComponentSchema(source.type);
        const validTriggers = schema?.events?.map((item) => item.id) ?? [];
        if (schema && !validTriggers.includes(event.trigger)) {
          errors.push(`${label}: trigger "${event.trigger}" is not valid for ${source.type}. Valid triggers: ${validTriggers.join(", ") || "none"}.`);
        }
        if (source.type === "Kanban" && event.trigger === "onCardSelected" && isFalseBinding(propVal(source.properties, "openModalOnCardClick"))) {
          errors.push(`${label}: Kanban onCardSelected cannot fire while openModalOnCardClick is false; ToolJet returns before it sets lastSelectedCard or fires the event. Enable the native card modal AND populate it with children parented to the Kanban using slot_name:"modal", or remove this handler and use a separate supported detail flow.`);
        }
      }
    } else if (event.sourceType === "data_query") {
      if (!queries.has(event.sourceId))
        errors.push(`${label}: query source "${event.sourceId}" does not exist.`);
      if (!["onDataQuerySuccess", "onDataQueryFailure"].includes(event.trigger)) {
        errors.push(`${label}: query trigger must be onDataQuerySuccess or onDataQueryFailure, not "${event.trigger}".`);
      }
    } else if (event.sourceType === "page") {
      if (!pages.has(event.sourceId))
        errors.push(`${label}: page source "${event.sourceId}" does not exist.`);
      if (event.trigger !== "onPageLoad")
        errors.push(`${label}: page trigger must be onPageLoad, not "${event.trigger}".`);
    } else if (event.sourceType === "table_column") {
      const source = components.get(event.sourceId);
      if (!source)
        errors.push(`${label}: Table source "${event.sourceId}" does not exist.`);
      else if (source.type !== "Table")
        errors.push(`${label}: table_column source must be a Table, not ${source.type ?? "unknown"}.`);
      else {
        if (event.trigger !== "onClick")
          errors.push(`${label}: Table Button-column trigger must be onClick.`);
        const refError = validateTableColumnRef(source, event.ref);
        if (refError)
          errors.push(`${label}: ${refError}`);
      }
    } else if (event.sourceType === "table_action") {
      errors.push(`${label}: deprecated table_action handlers are not authored reliably. Use a columnType:"button" column with source_type:"table_column".`);
    }
    const actionId = event.action.actionId;
    if (typeof actionId !== "string" || !ACTION_IDS.has(actionId)) {
      errors.push(`${label}: unknown actionId "${String(actionId)}"; ToolJet silently ignores invalid action ids.`);
      return;
    }
    const targetId = pageScopedTarget(event.action);
    const targetPage = targetId ? pageOfComponent.get(targetId) : void 0;
    if (targetId && targetPage) {
      const targetLabel = `${components.get(targetId)?.type ?? "component"} "${components.get(targetId)?.name ?? targetId}" on page "${pageName.get(targetPage)}"`;
      const sourcePage = event.sourceType === "page" ? event.sourceId : event.sourceType === "component" || event.sourceType === "table_column" ? pageOfComponent.get(event.sourceId) : void 0;
      if (sourcePage && sourcePage !== targetPage) {
        errors.push(`${label}: ${actionId} targets ${targetLabel} from page "${pageName.get(sourcePage)}". A page-scoped action only reaches components on the page that is open; on another page the target is not mounted and the action fails at runtime. Put this handler on page "${pageName.get(targetPage)}" (its onPageLoad, or a component there), or drop it: switch-page mounts that page fresh.`);
      } else if (event.sourceType === "data_query") {
        const triggerPages = queryTriggerPages.get(event.sourceId);
        const elsewhere = triggerPages ? [...triggerPages].filter((page) => page !== targetPage) : [];
        if (elsewhere.length) {
          const where = elsewhere.includes("*") ? "on every page load (runOnPageLoad)" : `from page "${elsewhere.map((p) => pageName.get(p) ?? p).join('", "')}"`;
          errors.push(`${label}: ${actionId} targets ${targetLabel}, but query "${queryById.get(event.sourceId)?.name ?? event.sourceId}" runs ${where}, where that component is not mounted, so the success handler fails at runtime. Move the action to page "${pageName.get(targetPage)}" (its onPageLoad, or the filter's own event there), or run the query only from that page.`);
        }
      }
    }
    if (actionId === "run-query") {
      let queryId = event.action.queryId;
      if (typeof queryId === "string" && !queries.has(queryId)) {
        const resolution = resolveRef$1(summary.queries, queryId, "Query", "in this app");
        if (resolution.ok) {
          if (resolution.warning)
            warnings.push(`${label}: ${resolution.warning}`);
          queryId = resolution.target.id;
          event.action.queryId = queryId;
        }
      }
      if (typeof queryId !== "string" || !queries.has(queryId)) {
        const available = summary.queries.map((q) => `${q.name ?? "(unnamed)"}=${q.id}`).join(", ");
        errors.push(`${label}: no query with id or name "${String(queryId)}" in this app. Do not re-read \u2014 the app currently has: ${available || "(no queries)"}.`);
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
        errors.push(`${label}: switch-page target "${String(pageId)}" does not exist.`);
      }
    }
    if (["show-modal", "close-modal"].includes(actionId)) {
      const modal = event.action.modal;
      const target = typeof modal === "string" ? components.get(modal) : void 0;
      if (!target) {
        errors.push(`${label}: ${actionId} modal target "${String(modal)}" does not exist.`);
      } else if (!["Modal", "ModalV2"].includes(target.type ?? "")) {
        errors.push(`${label}: ${actionId} target must be a Modal or ModalV2, not ${target.type ?? "unknown"} "${target.name ?? target.id}".`);
      }
    }
    if (actionId === "control-component") {
      const componentId = event.action.componentId;
      const target = typeof componentId === "string" ? components.get(componentId) : void 0;
      if (!target) {
        errors.push(`${label}: control-component target "${String(componentId)}" does not exist.`);
      } else {
        const handle = event.action.componentSpecificActionHandle;
        const schema = target.type ? getComponentSchema(target.type) : null;
        const componentAction = typeof handle === "string" ? schema?.actions?.find((candidate) => candidate.handle === handle) : void 0;
        if (!nonEmptyString(handle)) {
          errors.push(`${label}: control-component requires componentSpecificActionHandle.`);
        } else if (!componentAction) {
          errors.push(`${label}: control-component action "${handle}" is not valid for ${target.type ?? "unknown"} "${target.name ?? target.id}". Valid actions: ${schema?.actions?.map((candidate) => candidate.handle).join(", ") || "none"}.`);
        } else {
          const params = event.action.componentSpecificActionParams;
          if (params !== void 0 && !Array.isArray(params)) {
            errors.push(`${label}: componentSpecificActionParams must be an array.`);
          } else if (Array.isArray(params)) {
            const supplied = new Set(params.flatMap((param) => isRecord(param) && nonEmptyString(param.handle) ? [param.handle] : []));
            if (params.some((param) => !isRecord(param) || !nonEmptyString(param.handle))) {
              errors.push(`${label}: every componentSpecificActionParams entry requires a string handle.`);
            }
            const requiredHandles = (componentAction.params ?? []).flatMap((param) => nonEmptyString(param.handle) ? [param.handle] : []);
            const missing = requiredHandles.filter((required) => !supplied.has(required));
            if (missing.length) {
              errors.push(`${label}: control-component action "${handle}" is missing parameter handles: ${missing.join(", ")}.`);
            }
          } else if ((componentAction.params?.length ?? 0) > 0) {
            errors.push(`${label}: control-component action "${handle}" requires componentSpecificActionParams for ${componentAction.params.map((param) => String(param.handle)).join(", ")}.`);
          }
        }
      }
    }
    if (actionId === "scroll-component-into-view") {
      const componentId = event.action.componentId;
      if (typeof componentId !== "string" || !components.has(componentId)) {
        errors.push(`${label}: scroll-component-into-view target "${String(componentId)}" does not exist.`);
      }
    }
    if (actionId === "show-alert") {
      if (!nonEmptyString(event.action.message))
        errors.push(`${label}: show-alert requires a non-empty message.`);
      if (!["success", "info", "warning", "error"].includes(String(event.action.alertType))) {
        errors.push(`${label}: show-alert alertType must be success, info, warning, or error.`);
      }
    }
    if (["set-custom-variable", "set-page-variable", "set-localstorage-value"].includes(actionId)) {
      if (!nonEmptyString(event.action.key))
        errors.push(`${label}: ${actionId} requires a non-empty key.`);
      if (!Object.prototype.hasOwnProperty.call(event.action, "value"))
        errors.push(`${label}: ${actionId} requires value.`);
    }
    if (actionId === "unset-custom-variable" && !nonEmptyString(event.action.key)) {
      errors.push(`${label}: unset-custom-variable requires a non-empty key.`);
    }
    if (actionId === "open-webpage" && !nonEmptyString(event.action.url)) {
      errors.push(`${label}: open-webpage requires a non-empty url.`);
    }
    if (actionId === "copy-to-clipboard" && !Object.prototype.hasOwnProperty.call(event.action, "contentToCopy")) {
      errors.push(`${label}: copy-to-clipboard requires contentToCopy.`);
    }
    if (actionId === "set-table-page") {
      const tableId = event.action.table;
      const table = typeof tableId === "string" ? components.get(tableId) : void 0;
      if (!table) {
        errors.push(`${label}: set-table-page Table target "${String(tableId)}" does not exist.`);
      } else if (table.type !== "Table") {
        errors.push(`${label}: set-table-page target must be a Table, not ${table.type ?? "unknown"}.`);
      }
      const pageIndex = event.action.pageIndex;
      if (!["string", "number"].includes(typeof pageIndex) || String(pageIndex).trim() === "") {
        errors.push(`${label}: set-table-page requires a numeric value or binding in pageIndex.`);
      }
    }
    if (actionId === "generate-file") {
      const format = ["fileType", "type", "format", "extension"].map((key2) => event.action[key2]).find((value) => typeof value === "string");
      if (format && /\bpdf\b/i.test(format)) {
        warnings.push(`${label}: generate-file PDF is a pass-through and expects pre-formed PDF bytes; it does not convert text/HTML/data into a PDF. Use CSV/plaintext, or supply and browser-verify real PDF bytes.`);
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
        if (parent.type === "ModalV2" && chain.slice(index + 1).some(({ event: later2 }) => later2.action.actionId === "show-modal" && later2.action.modal === parent.id)) {
          errors.push(`Event "${event.name ?? index}": prefill targets a child of ModalV2 "${parent.name ?? parent.id}" before show-modal. Closed modal children are not mounted; these values can be lost. Bind input defaults to the selected record, or initialize after the modal opens.`);
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
    const label = navigation.event.name ? `${navigation.persisted ? "Persisted event" : "Event"} "${navigation.event.name}"` : `${navigation.persisted ? "Persisted event" : "Event"}[${navigation.index}]`;
    errors.push(`${label}: switch-page must be the LAST handler for the same source and trigger; ToolJet does not run later handlers (${later}). Put state updates and run-query actions before navigation.`);
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
  const line = (text) => subject ? `${prefix}${text}` : text.charAt(0).toUpperCase() + text.slice(1);
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
      if (!["Modal", "ModalV2"].includes(modal.type ?? "")) {
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
function unique$2(values, label, sourceName, warnings) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const value of values) {
    if (seen.has(value)) {
      warnings.push(`Query "${sourceName}" lifecycle listed ${label} "${value}" more than once; duplicate ignored.`);
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}
function normalizePlannedLayouts(component) {
  const warnings = [];
  const label = `${component.type ?? "component"} "${component.name ?? "?"}"`;
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
      warnings.push(`${label}: raised ${name} height ${rect.height}px to ${textMinimum}px so one line of text renders.`);
    } else if (compactHeight !== void 0 && rect.height > compactHeight) {
      fixed.set(name, { ...rect, height: compactHeight });
      warnings.push(`${label}: lowered ${name} height ${rect.height}px to the standard single-line ${compactHeight}px (oversizing does not enlarge the value text; a top label renders outside the box).`);
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
function escapeRegExp$1(value) {
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
    return new RegExp(`\\b${namespace}\\s*\\.\\s*${escapeRegExp$1(name)}(?:\\b|\\s*\\[)`).test(value);
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
    const label = component.name ?? "Chart";
    if (!code.trim()) {
      errors.push(`Chart "${label}" is bound to query "${query.name}", which has no JavaScript code to build the chart object.`);
      continue;
    }
    if (/textposition\s*:\s*['"]outside['"]/.test(code) && !/cliponaxis\s*:\s*false/.test(code)) {
      errors.push(`Chart "${label}" is bound to query "${query.name}", whose bar trace places its text outside without cliponaxis:false, so the tallest bar's value label is cut in half by the plot area. Add cliponaxis:false to the trace.`);
    }
    const missing = ["data", "layout"].filter((key2) => !code.includes(key2));
    if (missing.length) {
      errors.push(`Chart "${label}" is bound to query "${query.name}", whose code never mentions ${missing.join(", ")}: a query feeding a chart must return the whole { data: [trace], layout: { font, xaxis, yaxis, ... } } object from references/ui-layout.md. A bare array of points draws empty axes in Plotly's default font.`);
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
  const isTrue = (value) => value === true || typeof value === "string" && value.replace(/\s+/g, "").toLowerCase() === "{{true}}";
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
      if (!isTrue(propValue(properties, "serverSidePagination")))
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
  (spec.pages ?? []).forEach((plannedPage, pageIndex) => {
    const pageRef = plannedPage.clientRef ?? plannedPage.name;
    const existingPage = matchPlannedPage(pages, plannedPage.name, new Set((spec.pages ?? []).map((page) => page.name)));
    const pageId = existingPage?.id ?? `planned-page:${pageIndex}:${pageRef}`;
    bindRef(pageRefs, pageRef, { id: pageId, name: plannedPage.name }, "page", errors);
    const iconError = pageIconError(plannedPage.icon);
    if (iconError)
      errors.push(`Page "${plannedPage.name}": ${iconError}`);
    const normalized = (plannedPage.components ?? []).map((component) => {
      const definition = normalizeComponentSpec(component, { stripUnknownKeys: true });
      const geometry = normalizePlannedLayouts(definition.component);
      return { component: geometry.component, warnings: [...definition.warnings, ...geometry.warnings] };
    });
    warnings.push(...normalized.flatMap((item) => item.warnings));
    const expansion = materializeRequiredDefaultChildren(normalized.map((item) => item.component));
    warnings.push(...expansion.warnings);
    const componentLint = lintComponents(expansion.components, options);
    errors.push(...componentLint.errors.map((message) => `Page "${plannedPage.name}": ${message}`));
    errors.push(...lintQueryFedCharts(expansion.components, spec.queries ?? []).map((message) => `Page "${plannedPage.name}": ${message}`));
    warnings.push(...componentLint.warnings.map((message) => `Page "${plannedPage.name}": ${message}`));
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
function resolveAction(raw, queries, pages, components, errors, label) {
  const { target_ref: explicitRef, ...action } = raw;
  const targetRef = explicitRef ?? (action.actionId === "run-query" ? action.queryId ?? action.queryName : void 0);
  if (Object.values(action).some((value) => typeof value === "string" && /^planned-(query|page|component):/.test(value))) {
    errors.push(`${label}: synthetic planned ids cannot be saved. Use action.target_ref with the logical client_ref or name.`);
    return action;
  }
  if (targetRef === void 0)
    return action;
  if (typeof targetRef !== "string") {
    errors.push(`${label} target_ref must be a string.`);
    return action;
  }
  const actionId = action.actionId;
  const target = actionId === "run-query" ? queries.get(targetRef) : actionId === "switch-page" ? pages.get(targetRef) : ["show-modal", "close-modal", "control-component", "set-table-page", "scroll-component-into-view"].includes(String(actionId)) ? components.get(targetRef) : void 0;
  if (!target) {
    errors.push(`${label} action "${String(actionId)}" has unknown or unsupported target_ref "${targetRef}".`);
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
function resolveRefs(refs, map, errors, label) {
  return refs?.flatMap((ref) => {
    const value = map.get(ref);
    if (!value) {
      errors.push(`${label} ref "${ref}" does not exist.`);
      return [];
    }
    return [value.id];
  });
}
function resolveRef(ref, map, errors, label) {
  if (!ref)
    return void 0;
  const value = map.get(ref);
  if (!value) {
    errors.push(`${label} ref "${ref}" does not exist.`);
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
  height: external_exports.number()
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
  const normalized = requested.map((component) => {
    const definition = normalizeComponentSpec(component, { stripUnknownKeys: true });
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
  const expanded = materializeRequiredDefaultChildren(normalized.map((result) => result.component));
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
var escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var idPattern = (ids) => new RegExp(`(?<![\\w-])(?:${[...ids].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")})(?![\\w-])`, "g");
function mentionsId(text, id) {
  return idPattern([id]).test(text);
}
function replaceIds(text, newIds) {
  const ids = [...newIds.keys()];
  if (!ids.length)
    return { text, missing: [] };
  const missing = /* @__PURE__ */ new Set();
  const replaced = text.replace(idPattern(ids), (id) => {
    const next = newIds.get(id);
    if (next)
      return next;
    missing.add(id);
    return id;
  });
  return { text: replaced, missing: [...missing] };
}
var readsQuery = (text, name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`queries\\s*(?:\\?\\.|\\.)\\s*${escaped}(?![\\w$])|queries\\s*\\[\\s*['"]${escaped}['"]\\s*\\]`).test(text);
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
  const readsOf = (text) => summary.queries.filter((q) => q.name && readsQuery(text, q.name)).map((q) => q.id);
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
    const text = JSON.stringify(action);
    if (replacedComponentIds.some((id) => mentionsId(text, id)))
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
    const text = JSON.stringify(event.event ?? {});
    return [...replacedComponentNames.keys()].some((id) => mentionsId(text, id));
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
  const reads = (text, name) => new RegExp(`components\\s*(?:\\?\\.|\\.)\\s*${name.replace(/[$]/g, "\\$")}\\b|components\\s*\\[\\s*['"]${name.replace(/[$]/g, "\\$")}['"]\\s*\\]`).test(text);
  for (const page of summary.pages.filter((p) => !view.replacedPageIds.includes(p.id))) {
    for (const component of page.components) {
      const text = JSON.stringify([component.properties ?? {}, component.styles ?? {}]);
      for (const name of dropped) {
        if (reads(text, name))
          errors.push(`Page "${page.name}": "${component.name ?? component.id}" reads components.${name}, which the replace of "${view.replacedPageNames.join('", "')}" drops. Keep ${name} in that page's plan, or change "${page.name}" first.`);
      }
    }
  }
  const droppedIds = [...view.replacedComponentNames].filter(([, name]) => dropped.includes(name));
  const sourceName = new Map(summary.pages.flatMap((p) => p.components.map((c) => [c.id, `${c.name ?? c.id}" on page "${p.name}`])));
  for (const event of view.eventsToRetarget) {
    const text = JSON.stringify(event.event ?? {});
    for (const [id, name] of droppedIds) {
      if (!mentionsId(text, id))
        continue;
      const source = event.sourceId ? sourceName.get(event.sourceId) ?? event.sourceId : "the app";
      errors.push(`"${source}" has an event that acts on ${name}, which the replace of "${view.replacedPageNames.join('", "')}" drops. Keep ${name} in that page's plan, or change that event first.`);
    }
  }
  const redefined = new Set(view.queriesToUpdate.values());
  for (const query of summary.queries.filter((q) => !redefined.has(q.id))) {
    const text = JSON.stringify(query.options ?? {});
    for (const name of dropped) {
      if (reads(text, name))
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
    const named = query.datasource_name !== void 0 ? datasources.filter((source) => source.name === query.datasource_name) : [];
    const datasource = query.datasource_id !== void 0 ? datasources.find((source) => source.id === query.datasource_id) : named.length === 1 ? named[0] : void 0;
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
async function mapKeyRefusal(client, componentTypes) {
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
  return "This ToolJet instance has no Google Maps API key (GOOGLE_MAPS_API_KEY), so a Map component shows a Google error instead of a map. Show the locations in a Table (a link column to https://www.google.com/maps?q=<lat>,<lng> opens each one), and tell the user in your reply that an in-app map needs the Google Maps API key on the instance.";
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
        const mapRefusal = await mapKeyRefusal(client, (args.pages ?? []).flatMap((page) => (page.components ?? []).map((c) => String(c.type))));
        if (mapRefusal)
          preflightErrors.push(mapRefusal);
        const needsTables = Boolean(args.tables?.length || args.seed_data?.length || args.queries?.some((query) => query.table_ref || typeof query.options?.table_id === "string"));
        const [existingTables, fetchedSummary] = await Promise.all([
          needsTables ? client.listTables() : Promise.resolve([]),
          args.app_id ? client.getAppSummary(args.app_id) : Promise.resolve(void 0)
        ]);
        const frozen = frozenAppRefusal(fetchedSummary);
        if (frozen)
          return fail(new Error(frozen));
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
            if (!query.datasource_name || matches.length !== 1) {
              preflightErrors.push(`Query "${query.name}" datasource_name "${query.datasource_name}" must match exactly one source in this version (found ${matches.length}). Use the exact name or id returned by list_datasources(version_id).`);
            } else
              datasourceId = matches[0].id;
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
createRequire(import.meta.url);
var LATEST_PROTOCOL_VERSION = "2025-11-25";
var DEFAULT_NEGOTIATED_PROTOCOL_VERSION = "2025-03-26";
var SUPPORTED_PROTOCOL_VERSIONS = [LATEST_PROTOCOL_VERSION, "2025-06-18", "2025-03-26", "2024-11-05", "2024-10-07"];
var RELATED_TASK_META_KEY = "io.modelcontextprotocol/related-task";
var JSONRPC_VERSION = "2.0";
var AssertObjectSchema = custom((v) => v !== null && (typeof v === "object" || typeof v === "function"));
var ProgressTokenSchema = union([string(), number().int()]);
var CursorSchema = string();
looseObject({
  /**
   * Requested duration in milliseconds to retain task from creation.
   */
  ttl: number().optional(),
  /**
   * Time in milliseconds to wait between task status requests.
   */
  pollInterval: number().optional()
});
var TaskMetadataSchema = object({
  ttl: number().optional()
});
var RelatedTaskMetadataSchema = object({
  taskId: string()
});
var RequestMetaSchema = looseObject({
  /**
   * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
   */
  progressToken: ProgressTokenSchema.optional(),
  /**
   * If specified, this request is related to the provided task.
   */
  [RELATED_TASK_META_KEY]: RelatedTaskMetadataSchema.optional()
});
var BaseRequestParamsSchema = object({
  /**
   * See [General fields: `_meta`](/specification/draft/basic/index#meta) for notes on `_meta` usage.
   */
  _meta: RequestMetaSchema.optional()
});
var TaskAugmentedRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * If specified, the caller is requesting task-augmented execution for this request.
   * The request will return a CreateTaskResult immediately, and the actual result can be
   * retrieved later via tasks/result.
   *
   * Task augmentation is subject to capability negotiation - receivers MUST declare support
   * for task augmentation of specific request types in their capabilities.
   */
  task: TaskMetadataSchema.optional()
});
var isTaskAugmentedRequestParams = (value) => TaskAugmentedRequestParamsSchema.safeParse(value).success;
var RequestSchema = object({
  method: string(),
  params: BaseRequestParamsSchema.loose().optional()
});
var NotificationsParamsSchema = object({
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: RequestMetaSchema.optional()
});
var NotificationSchema = object({
  method: string(),
  params: NotificationsParamsSchema.loose().optional()
});
var ResultSchema = looseObject({
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: RequestMetaSchema.optional()
});
var RequestIdSchema = union([string(), number().int()]);
var JSONRPCRequestSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  ...RequestSchema.shape
}).strict();
var isJSONRPCRequest = (value) => JSONRPCRequestSchema.safeParse(value).success;
var JSONRPCNotificationSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  ...NotificationSchema.shape
}).strict();
var isJSONRPCNotification = (value) => JSONRPCNotificationSchema.safeParse(value).success;
var JSONRPCResultResponseSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  result: ResultSchema
}).strict();
var isJSONRPCResultResponse = (value) => JSONRPCResultResponseSchema.safeParse(value).success;
var ErrorCode;
(function(ErrorCode2) {
  ErrorCode2[ErrorCode2["ConnectionClosed"] = -32e3] = "ConnectionClosed";
  ErrorCode2[ErrorCode2["RequestTimeout"] = -32001] = "RequestTimeout";
  ErrorCode2[ErrorCode2["ParseError"] = -32700] = "ParseError";
  ErrorCode2[ErrorCode2["InvalidRequest"] = -32600] = "InvalidRequest";
  ErrorCode2[ErrorCode2["MethodNotFound"] = -32601] = "MethodNotFound";
  ErrorCode2[ErrorCode2["InvalidParams"] = -32602] = "InvalidParams";
  ErrorCode2[ErrorCode2["InternalError"] = -32603] = "InternalError";
  ErrorCode2[ErrorCode2["UrlElicitationRequired"] = -32042] = "UrlElicitationRequired";
})(ErrorCode || (ErrorCode = {}));
var JSONRPCErrorResponseSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema.optional(),
  error: object({
    /**
     * The error type that occurred.
     */
    code: number().int(),
    /**
     * A short description of the error. The message SHOULD be limited to a concise single sentence.
     */
    message: string(),
    /**
     * Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).
     */
    data: unknown().optional()
  })
}).strict();
var isJSONRPCErrorResponse = (value) => JSONRPCErrorResponseSchema.safeParse(value).success;
var JSONRPCMessageSchema = union([
  JSONRPCRequestSchema,
  JSONRPCNotificationSchema,
  JSONRPCResultResponseSchema,
  JSONRPCErrorResponseSchema
]);
union([JSONRPCResultResponseSchema, JSONRPCErrorResponseSchema]);
var EmptyResultSchema = ResultSchema.strict();
var CancelledNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The ID of the request to cancel.
   *
   * This MUST correspond to the ID of a request previously issued in the same direction.
   */
  requestId: RequestIdSchema.optional(),
  /**
   * An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
   */
  reason: string().optional()
});
var CancelledNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/cancelled"),
  params: CancelledNotificationParamsSchema
});
var IconSchema = object({
  /**
   * URL or data URI for the icon.
   */
  src: string(),
  /**
   * Optional MIME type for the icon.
   */
  mimeType: string().optional(),
  /**
   * Optional array of strings that specify sizes at which the icon can be used.
   * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
   *
   * If not provided, the client should assume that the icon can be used at any size.
   */
  sizes: array(string()).optional(),
  /**
   * Optional specifier for the theme this icon is designed for. `light` indicates
   * the icon is designed to be used with a light background, and `dark` indicates
   * the icon is designed to be used with a dark background.
   *
   * If not provided, the client should assume the icon can be used with any theme.
   */
  theme: _enum(["light", "dark"]).optional()
});
var IconsSchema = object({
  /**
   * Optional set of sized icons that the client can display in a user interface.
   *
   * Clients that support rendering icons MUST support at least the following MIME types:
   * - `image/png` - PNG images (safe, universal compatibility)
   * - `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)
   *
   * Clients that support rendering icons SHOULD also support:
   * - `image/svg+xml` - SVG images (scalable but requires security precautions)
   * - `image/webp` - WebP images (modern, efficient format)
   */
  icons: array(IconSchema).optional()
});
var BaseMetadataSchema = object({
  /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
  name: string(),
  /**
   * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
   * even by those unfamiliar with domain-specific terminology.
   *
   * If not provided, the name should be used for display (except for Tool,
   * where `annotations.title` should be given precedence over using `name`,
   * if present).
   */
  title: string().optional()
});
var ImplementationSchema = BaseMetadataSchema.extend({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  version: string(),
  /**
   * An optional URL of the website for this implementation.
   */
  websiteUrl: string().optional(),
  /**
   * An optional human-readable description of what this implementation does.
   *
   * This can be used by clients or servers to provide context about their purpose
   * and capabilities. For example, a server might describe the types of resources
   * or tools it provides, while a client might describe its intended use case.
   */
  description: string().optional()
});
var FormElicitationCapabilitySchema = intersection(object({
  applyDefaults: boolean().optional()
}), record(string(), unknown()));
var ElicitationCapabilitySchema = preprocess((value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (Object.keys(value).length === 0) {
      return { form: {} };
    }
  }
  return value;
}, intersection(object({
  form: FormElicitationCapabilitySchema.optional(),
  url: AssertObjectSchema.optional()
}), record(string(), unknown()).optional()));
var ClientTasksCapabilitySchema = looseObject({
  /**
   * Present if the client supports listing tasks.
   */
  list: AssertObjectSchema.optional(),
  /**
   * Present if the client supports cancelling tasks.
   */
  cancel: AssertObjectSchema.optional(),
  /**
   * Capabilities for task creation on specific request types.
   */
  requests: looseObject({
    /**
     * Task support for sampling requests.
     */
    sampling: looseObject({
      createMessage: AssertObjectSchema.optional()
    }).optional(),
    /**
     * Task support for elicitation requests.
     */
    elicitation: looseObject({
      create: AssertObjectSchema.optional()
    }).optional()
  }).optional()
});
var ServerTasksCapabilitySchema = looseObject({
  /**
   * Present if the server supports listing tasks.
   */
  list: AssertObjectSchema.optional(),
  /**
   * Present if the server supports cancelling tasks.
   */
  cancel: AssertObjectSchema.optional(),
  /**
   * Capabilities for task creation on specific request types.
   */
  requests: looseObject({
    /**
     * Task support for tool requests.
     */
    tools: looseObject({
      call: AssertObjectSchema.optional()
    }).optional()
  }).optional()
});
var ClientCapabilitiesSchema = object({
  /**
   * Experimental, non-standard capabilities that the client supports.
   */
  experimental: record(string(), AssertObjectSchema).optional(),
  /**
   * Present if the client supports sampling from an LLM.
   */
  sampling: object({
    /**
     * Present if the client supports context inclusion via includeContext parameter.
     * If not declared, servers SHOULD only use `includeContext: "none"` (or omit it).
     */
    context: AssertObjectSchema.optional(),
    /**
     * Present if the client supports tool use via tools and toolChoice parameters.
     */
    tools: AssertObjectSchema.optional()
  }).optional(),
  /**
   * Present if the client supports eliciting user input.
   */
  elicitation: ElicitationCapabilitySchema.optional(),
  /**
   * Present if the client supports listing roots.
   */
  roots: object({
    /**
     * Whether the client supports issuing notifications for changes to the roots list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the client supports task creation.
   */
  tasks: ClientTasksCapabilitySchema.optional(),
  /**
   * Extensions that the client supports. Keys are extension identifiers (vendor-prefix/extension-name).
   */
  extensions: record(string(), AssertObjectSchema).optional()
});
var InitializeRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
   */
  protocolVersion: string(),
  capabilities: ClientCapabilitiesSchema,
  clientInfo: ImplementationSchema
});
var InitializeRequestSchema = RequestSchema.extend({
  method: literal("initialize"),
  params: InitializeRequestParamsSchema
});
var isInitializeRequest = (value) => InitializeRequestSchema.safeParse(value).success;
var ServerCapabilitiesSchema = object({
  /**
   * Experimental, non-standard capabilities that the server supports.
   */
  experimental: record(string(), AssertObjectSchema).optional(),
  /**
   * Present if the server supports sending log messages to the client.
   */
  logging: AssertObjectSchema.optional(),
  /**
   * Present if the server supports sending completions to the client.
   */
  completions: AssertObjectSchema.optional(),
  /**
   * Present if the server offers any prompt templates.
   */
  prompts: object({
    /**
     * Whether this server supports issuing notifications for changes to the prompt list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the server offers any resources to read.
   */
  resources: object({
    /**
     * Whether this server supports clients subscribing to resource updates.
     */
    subscribe: boolean().optional(),
    /**
     * Whether this server supports issuing notifications for changes to the resource list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the server offers any tools to call.
   */
  tools: object({
    /**
     * Whether this server supports issuing notifications for changes to the tool list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the server supports task creation.
   */
  tasks: ServerTasksCapabilitySchema.optional(),
  /**
   * Extensions that the server supports. Keys are extension identifiers (vendor-prefix/extension-name).
   */
  extensions: record(string(), AssertObjectSchema).optional()
});
var InitializeResultSchema = ResultSchema.extend({
  /**
   * The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
   */
  protocolVersion: string(),
  capabilities: ServerCapabilitiesSchema,
  serverInfo: ImplementationSchema,
  /**
   * Instructions describing how to use the server and its features.
   *
   * This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.
   */
  instructions: string().optional()
});
var InitializedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/initialized"),
  params: NotificationsParamsSchema.optional()
});
var PingRequestSchema = RequestSchema.extend({
  method: literal("ping"),
  params: BaseRequestParamsSchema.optional()
});
var ProgressSchema = object({
  /**
   * The progress thus far. This should increase every time progress is made, even if the total is unknown.
   */
  progress: number(),
  /**
   * Total number of items to process (or total progress required), if known.
   */
  total: optional(number()),
  /**
   * An optional message describing the current progress.
   */
  message: optional(string())
});
var ProgressNotificationParamsSchema = object({
  ...NotificationsParamsSchema.shape,
  ...ProgressSchema.shape,
  /**
   * The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
   */
  progressToken: ProgressTokenSchema
});
var ProgressNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/progress"),
  params: ProgressNotificationParamsSchema
});
var PaginatedRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * An opaque token representing the current pagination position.
   * If provided, the server should return results starting after this cursor.
   */
  cursor: CursorSchema.optional()
});
var PaginatedRequestSchema = RequestSchema.extend({
  params: PaginatedRequestParamsSchema.optional()
});
var PaginatedResultSchema = ResultSchema.extend({
  /**
   * An opaque token representing the pagination position after the last returned result.
   * If present, there may be more results available.
   */
  nextCursor: CursorSchema.optional()
});
var TaskStatusSchema = _enum(["working", "input_required", "completed", "failed", "cancelled"]);
var TaskSchema = object({
  taskId: string(),
  status: TaskStatusSchema,
  /**
   * Time in milliseconds to keep task results available after completion.
   * If null, the task has unlimited lifetime until manually cleaned up.
   */
  ttl: union([number(), _null2()]),
  /**
   * ISO 8601 timestamp when the task was created.
   */
  createdAt: string(),
  /**
   * ISO 8601 timestamp when the task was last updated.
   */
  lastUpdatedAt: string(),
  pollInterval: optional(number()),
  /**
   * Optional diagnostic message for failed tasks or other status information.
   */
  statusMessage: optional(string())
});
var CreateTaskResultSchema = ResultSchema.extend({
  task: TaskSchema
});
var TaskStatusNotificationParamsSchema = NotificationsParamsSchema.merge(TaskSchema);
var TaskStatusNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/tasks/status"),
  params: TaskStatusNotificationParamsSchema
});
var GetTaskRequestSchema = RequestSchema.extend({
  method: literal("tasks/get"),
  params: BaseRequestParamsSchema.extend({
    taskId: string()
  })
});
var GetTaskResultSchema = ResultSchema.merge(TaskSchema);
var GetTaskPayloadRequestSchema = RequestSchema.extend({
  method: literal("tasks/result"),
  params: BaseRequestParamsSchema.extend({
    taskId: string()
  })
});
ResultSchema.loose();
var ListTasksRequestSchema = PaginatedRequestSchema.extend({
  method: literal("tasks/list")
});
var ListTasksResultSchema = PaginatedResultSchema.extend({
  tasks: array(TaskSchema)
});
var CancelTaskRequestSchema = RequestSchema.extend({
  method: literal("tasks/cancel"),
  params: BaseRequestParamsSchema.extend({
    taskId: string()
  })
});
var CancelTaskResultSchema = ResultSchema.merge(TaskSchema);
var ResourceContentsSchema = object({
  /**
   * The URI of this resource.
   */
  uri: string(),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: optional(string()),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var TextResourceContentsSchema = ResourceContentsSchema.extend({
  /**
   * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
   */
  text: string()
});
var Base64Schema = string().refine((val) => {
  try {
    atob(val);
    return true;
  } catch {
    return false;
  }
}, { message: "Invalid Base64 string" });
var BlobResourceContentsSchema = ResourceContentsSchema.extend({
  /**
   * A base64-encoded string representing the binary data of the item.
   */
  blob: Base64Schema
});
var RoleSchema = _enum(["user", "assistant"]);
var AnnotationsSchema = object({
  /**
   * Intended audience(s) for the resource.
   */
  audience: array(RoleSchema).optional(),
  /**
   * Importance hint for the resource, from 0 (least) to 1 (most).
   */
  priority: number().min(0).max(1).optional(),
  /**
   * ISO 8601 timestamp for the most recent modification.
   */
  lastModified: iso_exports.datetime({ offset: true }).optional()
});
var ResourceSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * The URI of this resource.
   */
  uri: string(),
  /**
   * A description of what this resource represents.
   *
   * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
   */
  description: optional(string()),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: optional(string()),
  /**
   * The size of the raw resource content, in bytes (i.e., before base64 encoding or any tokenization), if known.
   *
   * This can be used by Hosts to display file sizes and estimate context window usage.
   */
  size: optional(number()),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: optional(looseObject({}))
});
var ResourceTemplateSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * A URI template (according to RFC 6570) that can be used to construct resource URIs.
   */
  uriTemplate: string(),
  /**
   * A description of what this template is for.
   *
   * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
   */
  description: optional(string()),
  /**
   * The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
   */
  mimeType: optional(string()),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: optional(looseObject({}))
});
var ListResourcesRequestSchema = PaginatedRequestSchema.extend({
  method: literal("resources/list")
});
var ListResourcesResultSchema = PaginatedResultSchema.extend({
  resources: array(ResourceSchema)
});
var ListResourceTemplatesRequestSchema = PaginatedRequestSchema.extend({
  method: literal("resources/templates/list")
});
var ListResourceTemplatesResultSchema = PaginatedResultSchema.extend({
  resourceTemplates: array(ResourceTemplateSchema)
});
var ResourceRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The URI of the resource to read. The URI can use any protocol; it is up to the server how to interpret it.
   *
   * @format uri
   */
  uri: string()
});
var ReadResourceRequestParamsSchema = ResourceRequestParamsSchema;
var ReadResourceRequestSchema = RequestSchema.extend({
  method: literal("resources/read"),
  params: ReadResourceRequestParamsSchema
});
var ReadResourceResultSchema = ResultSchema.extend({
  contents: array(union([TextResourceContentsSchema, BlobResourceContentsSchema]))
});
var ResourceListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/resources/list_changed"),
  params: NotificationsParamsSchema.optional()
});
var SubscribeRequestParamsSchema = ResourceRequestParamsSchema;
var SubscribeRequestSchema = RequestSchema.extend({
  method: literal("resources/subscribe"),
  params: SubscribeRequestParamsSchema
});
var UnsubscribeRequestParamsSchema = ResourceRequestParamsSchema;
var UnsubscribeRequestSchema = RequestSchema.extend({
  method: literal("resources/unsubscribe"),
  params: UnsubscribeRequestParamsSchema
});
var ResourceUpdatedNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
   */
  uri: string()
});
var ResourceUpdatedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/resources/updated"),
  params: ResourceUpdatedNotificationParamsSchema
});
var PromptArgumentSchema = object({
  /**
   * The name of the argument.
   */
  name: string(),
  /**
   * A human-readable description of the argument.
   */
  description: optional(string()),
  /**
   * Whether this argument must be provided.
   */
  required: optional(boolean())
});
var PromptSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * An optional description of what this prompt provides
   */
  description: optional(string()),
  /**
   * A list of arguments to use for templating the prompt.
   */
  arguments: optional(array(PromptArgumentSchema)),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: optional(looseObject({}))
});
var ListPromptsRequestSchema = PaginatedRequestSchema.extend({
  method: literal("prompts/list")
});
var ListPromptsResultSchema = PaginatedResultSchema.extend({
  prompts: array(PromptSchema)
});
var GetPromptRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The name of the prompt or prompt template.
   */
  name: string(),
  /**
   * Arguments to use for templating the prompt.
   */
  arguments: record(string(), string()).optional()
});
var GetPromptRequestSchema = RequestSchema.extend({
  method: literal("prompts/get"),
  params: GetPromptRequestParamsSchema
});
var TextContentSchema = object({
  type: literal("text"),
  /**
   * The text content of the message.
   */
  text: string(),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ImageContentSchema = object({
  type: literal("image"),
  /**
   * The base64-encoded image data.
   */
  data: Base64Schema,
  /**
   * The MIME type of the image. Different providers may support different image types.
   */
  mimeType: string(),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var AudioContentSchema = object({
  type: literal("audio"),
  /**
   * The base64-encoded audio data.
   */
  data: Base64Schema,
  /**
   * The MIME type of the audio. Different providers may support different audio types.
   */
  mimeType: string(),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ToolUseContentSchema = object({
  type: literal("tool_use"),
  /**
   * The name of the tool to invoke.
   * Must match a tool name from the request's tools array.
   */
  name: string(),
  /**
   * Unique identifier for this tool call.
   * Used to correlate with ToolResultContent in subsequent messages.
   */
  id: string(),
  /**
   * Arguments to pass to the tool.
   * Must conform to the tool's inputSchema.
   */
  input: record(string(), unknown()),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var EmbeddedResourceSchema = object({
  type: literal("resource"),
  resource: union([TextResourceContentsSchema, BlobResourceContentsSchema]),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ResourceLinkSchema = ResourceSchema.extend({
  type: literal("resource_link")
});
var ContentBlockSchema = union([
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema,
  ResourceLinkSchema,
  EmbeddedResourceSchema
]);
var PromptMessageSchema = object({
  role: RoleSchema,
  content: ContentBlockSchema
});
var GetPromptResultSchema = ResultSchema.extend({
  /**
   * An optional description for the prompt.
   */
  description: string().optional(),
  messages: array(PromptMessageSchema)
});
var PromptListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/prompts/list_changed"),
  params: NotificationsParamsSchema.optional()
});
var ToolAnnotationsSchema = object({
  /**
   * A human-readable title for the tool.
   */
  title: string().optional(),
  /**
   * If true, the tool does not modify its environment.
   *
   * Default: false
   */
  readOnlyHint: boolean().optional(),
  /**
   * If true, the tool may perform destructive updates to its environment.
   * If false, the tool performs only additive updates.
   *
   * (This property is meaningful only when `readOnlyHint == false`)
   *
   * Default: true
   */
  destructiveHint: boolean().optional(),
  /**
   * If true, calling the tool repeatedly with the same arguments
   * will have no additional effect on the its environment.
   *
   * (This property is meaningful only when `readOnlyHint == false`)
   *
   * Default: false
   */
  idempotentHint: boolean().optional(),
  /**
   * If true, this tool may interact with an "open world" of external
   * entities. If false, the tool's domain of interaction is closed.
   * For example, the world of a web search tool is open, whereas that
   * of a memory tool is not.
   *
   * Default: true
   */
  openWorldHint: boolean().optional()
});
var ToolExecutionSchema = object({
  /**
   * Indicates the tool's preference for task-augmented execution.
   * - "required": Clients MUST invoke the tool as a task
   * - "optional": Clients MAY invoke the tool as a task or normal request
   * - "forbidden": Clients MUST NOT attempt to invoke the tool as a task
   *
   * If not present, defaults to "forbidden".
   */
  taskSupport: _enum(["required", "optional", "forbidden"]).optional()
});
var ToolSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * A human-readable description of the tool.
   */
  description: string().optional(),
  /**
   * A JSON Schema 2020-12 object defining the expected parameters for the tool.
   * Must have type: 'object' at the root level per MCP spec.
   */
  inputSchema: object({
    type: literal("object"),
    properties: record(string(), AssertObjectSchema).optional(),
    required: array(string()).optional()
  }).catchall(unknown()),
  /**
   * An optional JSON Schema 2020-12 object defining the structure of the tool's output
   * returned in the structuredContent field of a CallToolResult.
   * Must have type: 'object' at the root level per MCP spec.
   */
  outputSchema: object({
    type: literal("object"),
    properties: record(string(), AssertObjectSchema).optional(),
    required: array(string()).optional()
  }).catchall(unknown()).optional(),
  /**
   * Optional additional tool information.
   */
  annotations: ToolAnnotationsSchema.optional(),
  /**
   * Execution-related properties for this tool.
   */
  execution: ToolExecutionSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ListToolsRequestSchema = PaginatedRequestSchema.extend({
  method: literal("tools/list")
});
var ListToolsResultSchema = PaginatedResultSchema.extend({
  tools: array(ToolSchema)
});
var CallToolResultSchema = ResultSchema.extend({
  /**
   * A list of content objects that represent the result of the tool call.
   *
   * If the Tool does not define an outputSchema, this field MUST be present in the result.
   * For backwards compatibility, this field is always present, but it may be empty.
   */
  content: array(ContentBlockSchema).default([]),
  /**
   * An object containing structured tool output.
   *
   * If the Tool defines an outputSchema, this field MUST be present in the result, and contain a JSON object that matches the schema.
   */
  structuredContent: record(string(), unknown()).optional(),
  /**
   * Whether the tool call ended in an error.
   *
   * If not set, this is assumed to be false (the call was successful).
   *
   * Any errors that originate from the tool SHOULD be reported inside the result
   * object, with `isError` set to true, _not_ as an MCP protocol-level error
   * response. Otherwise, the LLM would not be able to see that an error occurred
   * and self-correct.
   *
   * However, any errors in _finding_ the tool, an error indicating that the
   * server does not support tool calls, or any other exceptional conditions,
   * should be reported as an MCP error response.
   */
  isError: boolean().optional()
});
CallToolResultSchema.or(ResultSchema.extend({
  toolResult: unknown()
}));
var CallToolRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  /**
   * The name of the tool to call.
   */
  name: string(),
  /**
   * Arguments to pass to the tool.
   */
  arguments: record(string(), unknown()).optional()
});
var CallToolRequestSchema = RequestSchema.extend({
  method: literal("tools/call"),
  params: CallToolRequestParamsSchema
});
var ToolListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/tools/list_changed"),
  params: NotificationsParamsSchema.optional()
});
object({
  /**
   * If true, the list will be refreshed automatically when a list changed notification is received.
   * The callback will be called with the updated list.
   *
   * If false, the callback will be called with null items, allowing manual refresh.
   *
   * @default true
   */
  autoRefresh: boolean().default(true),
  /**
   * Debounce time in milliseconds for list changed notification processing.
   *
   * Multiple notifications received within this timeframe will only trigger one refresh.
   * Set to 0 to disable debouncing.
   *
   * @default 300
   */
  debounceMs: number().int().nonnegative().default(300)
});
var LoggingLevelSchema = _enum(["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"]);
var SetLevelRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/logging/message.
   */
  level: LoggingLevelSchema
});
var SetLevelRequestSchema = RequestSchema.extend({
  method: literal("logging/setLevel"),
  params: SetLevelRequestParamsSchema
});
var LoggingMessageNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The severity of this log message.
   */
  level: LoggingLevelSchema,
  /**
   * An optional name of the logger issuing this message.
   */
  logger: string().optional(),
  /**
   * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
   */
  data: unknown()
});
var LoggingMessageNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/message"),
  params: LoggingMessageNotificationParamsSchema
});
var ModelHintSchema = object({
  /**
   * A hint for a model name.
   */
  name: string().optional()
});
var ModelPreferencesSchema = object({
  /**
   * Optional hints to use for model selection.
   */
  hints: array(ModelHintSchema).optional(),
  /**
   * How much to prioritize cost when selecting a model.
   */
  costPriority: number().min(0).max(1).optional(),
  /**
   * How much to prioritize sampling speed (latency) when selecting a model.
   */
  speedPriority: number().min(0).max(1).optional(),
  /**
   * How much to prioritize intelligence and capabilities when selecting a model.
   */
  intelligencePriority: number().min(0).max(1).optional()
});
var ToolChoiceSchema = object({
  /**
   * Controls when tools are used:
   * - "auto": Model decides whether to use tools (default)
   * - "required": Model MUST use at least one tool before completing
   * - "none": Model MUST NOT use any tools
   */
  mode: _enum(["auto", "required", "none"]).optional()
});
var ToolResultContentSchema = object({
  type: literal("tool_result"),
  toolUseId: string().describe("The unique identifier for the corresponding tool call."),
  content: array(ContentBlockSchema).default([]),
  structuredContent: object({}).loose().optional(),
  isError: boolean().optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var SamplingContentSchema = discriminatedUnion("type", [TextContentSchema, ImageContentSchema, AudioContentSchema]);
var SamplingMessageContentBlockSchema = discriminatedUnion("type", [
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema,
  ToolUseContentSchema,
  ToolResultContentSchema
]);
var SamplingMessageSchema = object({
  role: RoleSchema,
  content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)]),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var CreateMessageRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  messages: array(SamplingMessageSchema),
  /**
   * The server's preferences for which model to select. The client MAY modify or omit this request.
   */
  modelPreferences: ModelPreferencesSchema.optional(),
  /**
   * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
   */
  systemPrompt: string().optional(),
  /**
   * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt.
   * The client MAY ignore this request.
   *
   * Default is "none". Values "thisServer" and "allServers" are soft-deprecated. Servers SHOULD only use these values if the client
   * declares ClientCapabilities.sampling.context. These values may be removed in future spec releases.
   */
  includeContext: _enum(["none", "thisServer", "allServers"]).optional(),
  temperature: number().optional(),
  /**
   * The requested maximum number of tokens to sample (to prevent runaway completions).
   *
   * The client MAY choose to sample fewer tokens than the requested maximum.
   */
  maxTokens: number().int(),
  stopSequences: array(string()).optional(),
  /**
   * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
   */
  metadata: AssertObjectSchema.optional(),
  /**
   * Tools that the model may use during generation.
   * The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.
   */
  tools: array(ToolSchema).optional(),
  /**
   * Controls how the model uses tools.
   * The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.
   * Default is `{ mode: "auto" }`.
   */
  toolChoice: ToolChoiceSchema.optional()
});
var CreateMessageRequestSchema = RequestSchema.extend({
  method: literal("sampling/createMessage"),
  params: CreateMessageRequestParamsSchema
});
var CreateMessageResultSchema = ResultSchema.extend({
  /**
   * The name of the model that generated the message.
   */
  model: string(),
  /**
   * The reason why sampling stopped, if known.
   *
   * Standard values:
   * - "endTurn": Natural end of the assistant's turn
   * - "stopSequence": A stop sequence was encountered
   * - "maxTokens": Maximum token limit was reached
   *
   * This field is an open string to allow for provider-specific stop reasons.
   */
  stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens"]).or(string())),
  role: RoleSchema,
  /**
   * Response content. Single content block (text, image, or audio).
   */
  content: SamplingContentSchema
});
var CreateMessageResultWithToolsSchema = ResultSchema.extend({
  /**
   * The name of the model that generated the message.
   */
  model: string(),
  /**
   * The reason why sampling stopped, if known.
   *
   * Standard values:
   * - "endTurn": Natural end of the assistant's turn
   * - "stopSequence": A stop sequence was encountered
   * - "maxTokens": Maximum token limit was reached
   * - "toolUse": The model wants to use one or more tools
   *
   * This field is an open string to allow for provider-specific stop reasons.
   */
  stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens", "toolUse"]).or(string())),
  role: RoleSchema,
  /**
   * Response content. May be a single block or array. May include ToolUseContent if stopReason is "toolUse".
   */
  content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)])
});
var BooleanSchemaSchema = object({
  type: literal("boolean"),
  title: string().optional(),
  description: string().optional(),
  default: boolean().optional()
});
var StringSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  minLength: number().optional(),
  maxLength: number().optional(),
  format: _enum(["email", "uri", "date", "date-time"]).optional(),
  default: string().optional()
});
var NumberSchemaSchema = object({
  type: _enum(["number", "integer"]),
  title: string().optional(),
  description: string().optional(),
  minimum: number().optional(),
  maximum: number().optional(),
  default: number().optional()
});
var UntitledSingleSelectEnumSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  enum: array(string()),
  default: string().optional()
});
var TitledSingleSelectEnumSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  oneOf: array(object({
    const: string(),
    title: string()
  })),
  default: string().optional()
});
var LegacyTitledEnumSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  enum: array(string()),
  enumNames: array(string()).optional(),
  default: string().optional()
});
var SingleSelectEnumSchemaSchema = union([UntitledSingleSelectEnumSchemaSchema, TitledSingleSelectEnumSchemaSchema]);
var UntitledMultiSelectEnumSchemaSchema = object({
  type: literal("array"),
  title: string().optional(),
  description: string().optional(),
  minItems: number().optional(),
  maxItems: number().optional(),
  items: object({
    type: literal("string"),
    enum: array(string())
  }),
  default: array(string()).optional()
});
var TitledMultiSelectEnumSchemaSchema = object({
  type: literal("array"),
  title: string().optional(),
  description: string().optional(),
  minItems: number().optional(),
  maxItems: number().optional(),
  items: object({
    anyOf: array(object({
      const: string(),
      title: string()
    }))
  }),
  default: array(string()).optional()
});
var MultiSelectEnumSchemaSchema = union([UntitledMultiSelectEnumSchemaSchema, TitledMultiSelectEnumSchemaSchema]);
var EnumSchemaSchema = union([LegacyTitledEnumSchemaSchema, SingleSelectEnumSchemaSchema, MultiSelectEnumSchemaSchema]);
var PrimitiveSchemaDefinitionSchema = union([EnumSchemaSchema, BooleanSchemaSchema, StringSchemaSchema, NumberSchemaSchema]);
var ElicitRequestFormParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  /**
   * The elicitation mode.
   *
   * Optional for backward compatibility. Clients MUST treat missing mode as "form".
   */
  mode: literal("form").optional(),
  /**
   * The message to present to the user describing what information is being requested.
   */
  message: string(),
  /**
   * A restricted subset of JSON Schema.
   * Only top-level properties are allowed, without nesting.
   */
  requestedSchema: object({
    type: literal("object"),
    properties: record(string(), PrimitiveSchemaDefinitionSchema),
    required: array(string()).optional()
  })
});
var ElicitRequestURLParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  /**
   * The elicitation mode.
   */
  mode: literal("url"),
  /**
   * The message to present to the user explaining why the interaction is needed.
   */
  message: string(),
  /**
   * The ID of the elicitation, which must be unique within the context of the server.
   * The client MUST treat this ID as an opaque value.
   */
  elicitationId: string(),
  /**
   * The URL that the user should navigate to.
   */
  url: string().url()
});
var ElicitRequestParamsSchema = union([ElicitRequestFormParamsSchema, ElicitRequestURLParamsSchema]);
var ElicitRequestSchema = RequestSchema.extend({
  method: literal("elicitation/create"),
  params: ElicitRequestParamsSchema
});
var ElicitationCompleteNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The ID of the elicitation that completed.
   */
  elicitationId: string()
});
var ElicitationCompleteNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/elicitation/complete"),
  params: ElicitationCompleteNotificationParamsSchema
});
var ElicitResultSchema = ResultSchema.extend({
  /**
   * The user action in response to the elicitation.
   * - "accept": User submitted the form/confirmed the action
   * - "decline": User explicitly decline the action
   * - "cancel": User dismissed without making an explicit choice
   */
  action: _enum(["accept", "decline", "cancel"]),
  /**
   * The submitted form data, only present when action is "accept".
   * Contains values matching the requested schema.
   * Per MCP spec, content is "typically omitted" for decline/cancel actions.
   * We normalize null to undefined for leniency while maintaining type compatibility.
   */
  content: preprocess((val) => val === null ? void 0 : val, record(string(), union([string(), number(), boolean(), array(string())])).optional())
});
var ResourceTemplateReferenceSchema = object({
  type: literal("ref/resource"),
  /**
   * The URI or URI template of the resource.
   */
  uri: string()
});
var PromptReferenceSchema = object({
  type: literal("ref/prompt"),
  /**
   * The name of the prompt or prompt template
   */
  name: string()
});
var CompleteRequestParamsSchema = BaseRequestParamsSchema.extend({
  ref: union([PromptReferenceSchema, ResourceTemplateReferenceSchema]),
  /**
   * The argument's information
   */
  argument: object({
    /**
     * The name of the argument
     */
    name: string(),
    /**
     * The value of the argument to use for completion matching.
     */
    value: string()
  }),
  context: object({
    /**
     * Previously-resolved variables in a URI template or prompt.
     */
    arguments: record(string(), string()).optional()
  }).optional()
});
var CompleteRequestSchema = RequestSchema.extend({
  method: literal("completion/complete"),
  params: CompleteRequestParamsSchema
});
function assertCompleteRequestPrompt(request) {
  if (request.params.ref.type !== "ref/prompt") {
    throw new TypeError(`Expected CompleteRequestPrompt, but got ${request.params.ref.type}`);
  }
}
function assertCompleteRequestResourceTemplate(request) {
  if (request.params.ref.type !== "ref/resource") {
    throw new TypeError(`Expected CompleteRequestResourceTemplate, but got ${request.params.ref.type}`);
  }
}
var CompleteResultSchema = ResultSchema.extend({
  completion: looseObject({
    /**
     * An array of completion values. Must not exceed 100 items.
     */
    values: array(string()).max(100),
    /**
     * The total number of completion options available. This can exceed the number of values actually sent in the response.
     */
    total: optional(number().int()),
    /**
     * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
     */
    hasMore: optional(boolean())
  })
});
var RootSchema = object({
  /**
   * The URI identifying the root. This *must* start with file:// for now.
   */
  uri: string().startsWith("file://"),
  /**
   * An optional name for the root.
   */
  name: string().optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ListRootsRequestSchema = RequestSchema.extend({
  method: literal("roots/list"),
  params: BaseRequestParamsSchema.optional()
});
var ListRootsResultSchema = ResultSchema.extend({
  roots: array(RootSchema)
});
var RootsListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/roots/list_changed"),
  params: NotificationsParamsSchema.optional()
});
union([
  PingRequestSchema,
  InitializeRequestSchema,
  CompleteRequestSchema,
  SetLevelRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema
]);
union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  InitializedNotificationSchema,
  RootsListChangedNotificationSchema,
  TaskStatusNotificationSchema
]);
union([
  EmptyResultSchema,
  CreateMessageResultSchema,
  CreateMessageResultWithToolsSchema,
  ElicitResultSchema,
  ListRootsResultSchema,
  GetTaskResultSchema,
  ListTasksResultSchema,
  CreateTaskResultSchema
]);
union([
  PingRequestSchema,
  CreateMessageRequestSchema,
  ElicitRequestSchema,
  ListRootsRequestSchema,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema
]);
union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  LoggingMessageNotificationSchema,
  ResourceUpdatedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ToolListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
  TaskStatusNotificationSchema,
  ElicitationCompleteNotificationSchema
]);
union([
  EmptyResultSchema,
  InitializeResultSchema,
  CompleteResultSchema,
  GetPromptResultSchema,
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ReadResourceResultSchema,
  CallToolResultSchema,
  ListToolsResultSchema,
  GetTaskResultSchema,
  ListTasksResultSchema,
  CreateTaskResultSchema
]);
var McpError = class _McpError extends Error {
  constructor(code, message, data) {
    super(`MCP error ${code}: ${message}`);
    this.code = code;
    this.data = data;
    this.name = "McpError";
  }
  /**
   * Factory method to create the appropriate error type based on the error code and data
   */
  static fromError(code, message, data) {
    if (code === ErrorCode.UrlElicitationRequired && data) {
      const errorData = data;
      if (errorData.elicitations) {
        return new UrlElicitationRequiredError(errorData.elicitations, message);
      }
    }
    return new _McpError(code, message, data);
  }
};
var UrlElicitationRequiredError = class extends McpError {
  constructor(elicitations, message = `URL elicitation${elicitations.length > 1 ? "s" : ""} required`) {
    super(ErrorCode.UrlElicitationRequired, message, {
      elicitations
    });
  }
  get elicitations() {
    return this.data?.elicitations ?? [];
  }
};
export {
  LATEST_PROTOCOL_VERSION as $,
  ListTasksResultSchema as A,
  CancelTaskResultSchema as B,
  CancelledNotificationSchema as C,
  DEFAULT_NEGOTIATED_PROTOCOL_VERSION as D,
  ErrorCode as E,
  ListToolsRequestSchema as F,
  GetTaskRequestSchema as G,
  CallToolRequestSchema as H,
  CompleteRequestSchema as I,
  JSONRPCMessageSchema as J,
  assertCompleteRequestResourceTemplate as K,
  ListTasksRequestSchema as L,
  McpError as M,
  assertCompleteRequestPrompt as N,
  ListResourcesRequestSchema as O,
  ProgressNotificationSchema as P,
  ListResourceTemplatesRequestSchema as Q,
  RELATED_TASK_META_KEY as R,
  SUPPORTED_PROTOCOL_VERSIONS as S,
  TaskStatusNotificationSchema as T,
  ReadResourceRequestSchema as U,
  ListPromptsRequestSchema as V,
  GetPromptRequestSchema as W,
  LoggingLevelSchema as X,
  InitializeRequestSchema as Y,
  InitializedNotificationSchema as Z,
  SetLevelRequestSchema as _,
  isJSONRPCRequest as a,
  EmptyResultSchema as a0,
  CreateMessageResultWithToolsSchema as a1,
  CreateMessageResultSchema as a2,
  ElicitResultSchema as a3,
  ListRootsResultSchema as a4,
  CallToolResultSchema as a5,
  dbColumnTypeSchema as a6,
  componentInputSchema as a7,
  lintAppSpecTool as a8,
  projectJavascriptRuntime as a9,
  projectAppSettings as aa,
  compactTheme as ab,
  pageSettingProperties as ac,
  containsExactValue as ad,
  inspectUpdateCompatibility as ae,
  normalizePlanBindingAliases as af,
  containsNamedBinding as ag,
  normalizePlannedLayouts as ah,
  materializeRequiredDefaultChildren as ai,
  mapKeyRefusal as aj,
  persistedEventIds as ak,
  isJSONRPCResultResponse as b,
  isJSONRPCErrorResponse as c,
  consumeAppPlan as d,
  replaceFingerprint as e,
  frozenAppRefusal as f,
  danglingAfterReplace as g,
  prepareQueryOptionsForWrite as h,
  isInitializeRequest as i,
  prepareComponentBatch as j,
  replaceIds as k,
  literalCanvasColor as l,
  matchPlannedPage as m,
  expandQueryLifecycles as n,
  navigationReorders as o,
  peekAppPlan as p,
  persistedEventSpecs as q,
  replaceView as r,
  PingRequestSchema as s,
  GetTaskPayloadRequestSchema as t,
  CancelTaskRequestSchema as u,
  validateEvents as v,
  isJSONRPCNotification as w,
  isTaskAugmentedRequestParams as x,
  CreateTaskResultSchema as y,
  GetTaskResultSchema as z
};
