import { createRequire } from "node:module";
import { o as ok, f as fail, j as exposeActions, k as assessQueryRead, m as resolvedReadRefusal, p as resolveStaticBindings, s as sqlConnectorPath, G as GUI_LIST_ROWS_KEYS, q as applyResolvedBindings, u as connectorLabel, S as SQL_DIALECT } from "./chunk-w14kofOC.mjs";
import { W as WORKSPACE_ACCESS_KEYS, a as WORKSPACE_PERMISSION_KEYS, w as workspaceAccessKeys } from "./chunk-d_W8P3vu.mjs";
import { b0 as external_exports } from "./chunk-5U2_zDJi.mjs";
import { g as getDatasourceQuerySchema, s as singleSpecRef, b as SPEC_DISCOVERY_METHODS, c as hubspotSpecs, e as extractSpec, l as loadKindSpec, d as listEndpoints, f as specHost, r as rankEndpoints, i as endpointTagCounts, j as endpointParameters } from "./chunk-D7K0V5QF.mjs";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, request } from "node:http";
import { lookup } from "node:dns/promises";
import { BlockList, isIP, connect } from "node:net";
createRequire(import.meta.url);
var listWorkspaceGroupsInput = external_exports.object({
  group_id: external_exports.string().uuid().optional(),
  include_permissions: external_exports.boolean().optional(),
  resource_type: external_exports.enum(["app", "module", "workflow", "data_source"]).optional()
}).strict();
function listWorkspaceGroupsTool(client) {
  return {
    name: "list_workspace_groups",
    title: "List Workspace Groups",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    description: "List groups in the workspace pinned to the current connection. OAuth connections require the workspace_users scope. Supply group_id to list its non-archived members with group_user_id (membership id, distinct from user_id and organization_user_id). Use include_permissions:true with group_id to read permission switches and granular access rules. Use resource_type (app/module/workflow/data_source) to discover selectable resources and their names/IDs. Use exact returned ids for group changes. Requires ToolJet admin permissions.",
    inputSchema: listWorkspaceGroupsInput.shape,
    async handler(input) {
      try {
        const args = listWorkspaceGroupsInput.parse(input);
        if (args.include_permissions && !args.group_id)
          throw new Error("group_id is required with include_permissions.");
        const resources = args.resource_type ? { resources: await client.listWorkspaceGroupResources(args.resource_type) } : {};
        if (!args.group_id)
          return ok({ ...args.resource_type ? {} : { groups: await client.listWorkspaceGroups() }, ...resources });
        const group = await client.getWorkspaceGroup(args.group_id);
        return ok({
          group,
          members: await client.listWorkspaceGroupMembers(args.group_id),
          ...resources,
          ...args.include_permissions ? { access_rules: await client.listWorkspaceGroupAccess(args.group_id) } : {}
        });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
var manageWorkspaceGroupsInput = external_exports.object({
  action: external_exports.enum(["create", "rename", "delete", "remove_member", "duplicate", "update_permissions", "create_access", "update_access", "delete_access"]),
  group_id: external_exports.string().uuid().optional(),
  name: external_exports.string().trim().min(1).max(50).optional(),
  group_user_id: external_exports.string().uuid().optional(),
  confirm: external_exports.boolean().optional(),
  permissions: external_exports.object(Object.fromEntries(WORKSPACE_PERMISSION_KEYS.map((key) => [key, external_exports.boolean().optional()]))).strict().optional(),
  copy: external_exports.object({
    permissions: external_exports.boolean().optional(),
    members: external_exports.boolean().optional(),
    apps: external_exports.boolean().optional(),
    modules: external_exports.boolean().optional(),
    workflows: external_exports.boolean().optional(),
    data_sources: external_exports.boolean().optional()
  }).strict().optional(),
  rule_id: external_exports.string().uuid().optional(),
  resource_type: external_exports.enum(["app", "module", "workflow", "data_source"]).optional(),
  access: external_exports.object({
    name: external_exports.string().trim().min(1).max(255).optional(),
    is_all: external_exports.boolean().optional(),
    actions: external_exports.object(Object.fromEntries(WORKSPACE_ACCESS_KEYS.map((key) => [key, external_exports.boolean().optional()]))).strict().optional(),
    resource_ids: external_exports.array(external_exports.string().uuid()).max(1e3).optional(),
    add_resource_ids: external_exports.array(external_exports.string().uuid()).min(1).max(1e3).optional(),
    remove_resource_ids: external_exports.array(external_exports.string().uuid()).min(1).max(1e3).optional()
  }).strict().optional(),
  allow_role_change: external_exports.boolean().optional()
}).strict();
function manageWorkspaceGroupsTool(client) {
  return {
    name: "manage_workspace_groups",
    title: "Manage Workspace Groups",
    strictInput: true,
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    description: "Create, rename, delete custom groups or remove a member in the workspace pinned to the current connection. OAuth connections require the workspace_users scope. All actions require confirm:true after reviewing the exact change. create needs name; rename needs group_id and name; delete needs group_id; remove_member needs group_id and group_user_id from list_workspace_groups. Removing membership does not delete the workspace user. Deleting a group removes its memberships and permissions. duplicate needs group_id and at least one true copy flag (permissions/members/apps/modules/workflows/data_sources; omitted flags false); ToolJet assigns the copy name. update_permissions needs group_id and permissions (only supplied switches change). create_access needs group_id, resource_type and access {name,is_all,actions,resource_ids}; update_access needs group_id, rule_id and access (only supplied fields change); delete_access needs group_id and rule_id. For update/delete access, optional resource_type must match the existing rule. Read include_permissions:true first to resolve rule IDs; resource_type discovers selectable resource IDs. On update_access, use access.add_resource_ids/remove_resource_ids to change only those resources and preserve the rest. access.resource_ids is only for an explicitly requested replacement of the entire rule selection; do not combine it with add/remove_resource_ids. Resource additions/removals require a selected-resource rule; is_all:true applies to ALL current and future resources of its type. On create_access, omitted action switches are disabled. App actions: canEdit/canView/hideFromDashboard/canAccessDevelopment/canAccessStaging/canAccessProduction/canAccessReleased. Module actions: canEdit/canView/hideFromDashboard. Workflow actions: canEdit/canView. Data source actions: canConfigure/canUse. canEdit/canView and canConfigure/canUse are exclusive pairs: enabling one disables the other, including on partial updates. Disabled groups and read_only rules are not editable under the current license/plan. allow_role_change is only for permission updates and access updates, and only with explicit consent to change affected member roles. Admin permissions cannot be changed; default group names/memberships cannot be changed here. To add members use manage_workspace_users with group_ids. ToolJet admin and license checks apply.",
    inputSchema: manageWorkspaceGroupsInput.shape,
    async handler(input) {
      try {
        const args = manageWorkspaceGroupsInput.parse(input);
        if (args.confirm !== true)
          throw new Error(`${args.action} requires confirm:true after reviewing the exact change.`);
        const needsName = args.action === "create" || args.action === "rename";
        if (needsName !== (args.name !== void 0))
          throw new Error(needsName ? "name is required." : "name must be omitted.");
        if (args.action !== "create" !== (args.group_id !== void 0)) {
          throw new Error(args.action === "create" ? "group_id must be omitted for create." : "group_id is required.");
        }
        if (args.action === "remove_member" !== (args.group_user_id !== void 0)) {
          throw new Error(args.action === "remove_member" ? "group_user_id is required." : "group_user_id must be omitted.");
        }
        const expected = {
          duplicate: ["copy"],
          update_permissions: ["permissions", "allow_role_change"],
          create_access: ["resource_type", "access"],
          update_access: ["rule_id", "access", "allow_role_change", "resource_type"],
          delete_access: ["rule_id", "resource_type"]
        };
        for (const key of ["copy", "permissions", "resource_type", "access", "rule_id", "allow_role_change"]) {
          if (args[key] !== void 0 && !expected[args.action]?.includes(key))
            throw new Error(`${key} must be omitted for ${args.action}.`);
        }
        for (const key of expected[args.action] ?? []) {
          if (key !== "allow_role_change" && !(key === "resource_type" && args.action !== "create_access") && args[key] === void 0)
            throw new Error(`${key} is required.`);
        }
        if (args.permissions && !Object.keys(args.permissions).length)
          throw new Error("permissions must contain at least one switch.");
        if (args.access && !Object.keys(args.access).length)
          throw new Error("access must contain at least one change.");
        if (args.action === "create")
          return ok({ group: await client.createWorkspaceGroup(args.name) });
        const group = await client.getWorkspaceGroup(args.group_id);
        if (group.disabled === true)
          throw new Error(`Group "${group.name}" is read-only under the current license/plan.`);
        const permissionAction = ["update_permissions", "create_access", "update_access", "delete_access"].includes(args.action);
        if (group.type !== "custom" && args.action !== "duplicate" && !(permissionAction && group.name !== "admin")) {
          throw new Error("Only custom groups can be changed with this tool.");
        }
        if (args.action === "duplicate") {
          const copy = args.copy;
          if (!Object.values(copy).some((value) => value === true))
            throw new Error("Select at least one category to duplicate.");
          return ok({ group: await client.duplicateWorkspaceGroup(group.id, {
            addPermission: copy.permissions ?? false,
            addUsers: copy.members ?? false,
            addApps: copy.apps ?? false,
            addModules: copy.modules ?? false,
            addWorkflows: copy.workflows ?? false,
            addDataSource: copy.data_sources ?? false
          }) });
        }
        if (args.action === "update_permissions") {
          await client.updateWorkspaceGroupPermissions(group.id, args.permissions, args.allow_role_change);
          return ok({ group: await client.getWorkspaceGroup(group.id), updated: true });
        }
        if (["create_access", "update_access", "delete_access"].includes(args.action)) {
          const rules = await client.listWorkspaceGroupAccess(group.id);
          const rule = args.rule_id ? rules.find((item) => item.id === args.rule_id) : void 0;
          if (args.rule_id && !rule)
            throw new Error("Access rule not found in this group. Read include_permissions:true again.");
          if (rule?.read_only)
            throw new Error(rule.read_only_reason || "This access rule is read-only under the current license/plan.");
          if (rule && args.resource_type && args.resource_type !== rule.type)
            throw new Error("resource_type does not match this access rule.");
          const type = rule?.type ?? args.resource_type;
          if (args.action === "delete_access") {
            await client.writeWorkspaceGroupAccess("DELETE", group.id, type, rule.id);
            return ok({ group_id: group.id, name: group.name, rule_id: rule.id, rule_name: rule.name, deleted: true });
          }
          const access = args.access;
          const creating = args.action === "create_access";
          const delta = access.add_resource_ids !== void 0 || access.remove_resource_ids !== void 0;
          if (delta && (creating || access.resource_ids !== void 0 || access.is_all !== void 0)) {
            throw new Error("Resource additions/removals only update an existing selected-resource rule; do not combine them with resource_ids or is_all.");
          }
          if (creating && (!access.name || access.is_all === void 0 || !access.actions)) {
            throw new Error("create_access requires access.name, is_all and actions.");
          }
          const actionKeys = workspaceAccessKeys(type);
          if (access.actions && (!Object.keys(access.actions).length || Object.keys(access.actions).some((key) => !actionKeys.includes(key)))) {
            throw new Error(`Invalid actions for ${type}. Use ${actionKeys.join(", ")}.`);
          }
          const all = access.is_all ?? rule.is_all;
          const currentIds = rule?.resources.map((item) => item.id) ?? [];
          if (delta && all)
            throw new Error("An all-resource rule cannot add/remove individual resources. Explicitly choose a replacement selected-resource scope instead.");
          if (delta && (new Set(access.add_resource_ids).size !== (access.add_resource_ids?.length ?? 0) || new Set(access.remove_resource_ids).size !== (access.remove_resource_ids?.length ?? 0) || access.add_resource_ids?.some((id) => access.remove_resource_ids?.includes(id)) || access.remove_resource_ids?.some((id) => !currentIds.includes(id)))) {
            throw new Error("Use unique, non-overlapping resource additions/removals; removed resources must belong to this rule.");
          }
          const selected = delta ? [.../* @__PURE__ */ new Set([...currentIds.filter((id) => !access.remove_resource_ids?.includes(id)), ...access.add_resource_ids ?? []])] : access.resource_ids ?? (all ? [] : currentIds);
          if (new Set(selected).size !== selected.length || all && selected.length || !all && !selected.length) {
            throw new Error("Use unique resource_ids for a selected-resource rule; omit them or use [] for is_all:true.");
          }
          if (access.resource_ids || access.add_resource_ids || creating || rule?.is_all && !all) {
            const available = await client.listWorkspaceGroupResources(type);
            if (selected.some((id) => !available.some((item) => item.id === id)))
              throw new Error("Resource not found in this workspace/resource type.");
          }
          const resourceKey = type === "data_source" ? "dataSourceId" : "appId";
          const actions = { ...creating ? Object.fromEntries(actionKeys.map((key) => [key, false])) : rule.actions, ...access.actions };
          const [primary, secondary] = type === "data_source" ? ["canConfigure", "canUse"] : ["canEdit", "canView"];
          if (access.actions?.[primary] === true && access.actions?.[secondary] === void 0)
            actions[secondary] = false;
          if (access.actions?.[secondary] === true && access.actions?.[primary] === void 0)
            actions[primary] = false;
          if (actions[primary] && actions[secondary])
            throw new Error(`${primary} and ${secondary} cannot both be enabled.`);
          if (creating) {
            await client.writeWorkspaceGroupAccess("POST", group.id, type, void 0, {
              name: access.name,
              type,
              groupId: group.id,
              isAll: all,
              createResourcePermissionObject: {
                ...type === "data_source" ? { action: actions } : actions,
                resourcesToAdd: selected.map((id) => ({ [resourceKey]: id }))
              }
            });
          } else {
            const current = rule.resources;
            await client.writeWorkspaceGroupAccess("PUT", group.id, type, rule.id, {
              ...access.name !== void 0 ? { name: access.name } : {},
              isAll: all,
              actions,
              resourcesToAdd: selected.filter((id) => !current.some((item) => item.id === id)).map((id) => ({ [resourceKey]: id })),
              resourcesToDelete: current.filter((item) => !selected.includes(item.id)).map((item) => ({ id: item.membership_id })),
              allowRoleChange: args.allow_role_change ?? false
            });
          }
          return ok({ group_id: group.id, name: group.name, access_rules: await client.listWorkspaceGroupAccess(group.id) });
        }
        if (args.action === "rename") {
          await client.renameWorkspaceGroup(group.id, args.name);
          return ok({ group_id: group.id, name: args.name, renamed: true });
        }
        if (args.action === "delete") {
          await client.deleteWorkspaceGroup(group.id);
          return ok({ group_id: group.id, name: group.name, deleted: true });
        }
        const members = await client.listWorkspaceGroupMembers(group.id);
        if (!members.some((member) => member.group_user_id === args.group_user_id)) {
          throw new Error("Membership not found in this group. Use list_workspace_groups with group_id for current member ids.");
        }
        await client.removeWorkspaceGroupMember(args.group_user_id);
        return ok({ group_id: group.id, group_user_id: args.group_user_id, removed: true });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
var groupBoundary = " Requires confirm:true for the exact change, workspace_users OAuth scope, and ToolJet admin permissions. License restrictions apply.";
var accessBehavior = " App actions: canEdit/canView/hideFromDashboard/canAccessDevelopment/canAccessStaging/canAccessProduction/canAccessReleased; module: canEdit/canView/hideFromDashboard; workflow: canEdit/canView; data_source: canConfigure/canUse. canEdit/canView and canConfigure/canUse are exclusive pairs; enabling one disables the other. is_all:true includes current and future resources.";
var workspaceGroups = [
  {
    action: "create",
    name: "create_workspace_group",
    title: "Create Workspace Group",
    description: "Create an empty custom group in the pinned workspace." + groupBoundary,
    required: ["name", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
  },
  {
    action: "rename",
    name: "rename_workspace_group",
    title: "Rename Workspace Group",
    description: "Rename an existing custom group. Default group names cannot be changed." + groupBoundary,
    required: ["group_id", "name", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "delete",
    name: "delete_workspace_group",
    title: "Delete Workspace Group",
    description: "Delete an existing custom group, including its memberships and permissions. Cannot delete default groups." + groupBoundary,
    required: ["group_id", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "remove_member",
    name: "remove_workspace_group_member",
    title: "Remove Workspace Group Member",
    description: "Remove one membership from a custom group without deleting the workspace user. group_user_id is the membership ID returned by list_workspace_groups, not a user ID; membership must belong to this group." + groupBoundary,
    required: ["group_id", "group_user_id", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "duplicate",
    name: "duplicate_workspace_group",
    title: "Duplicate Workspace Group",
    description: "Duplicate a group with selected categories: permissions, members, apps, modules, workflows, or data_sources. At least one copy flag must be true; omitted flags are false. ToolJet assigns the copy name. Copying members and permissions can grant access through the new group." + groupBoundary,
    required: ["group_id", "copy", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
  },
  {
    action: "update_permissions",
    name: "update_workspace_group_permissions",
    title: "Update Workspace Group Permissions",
    description: "Update only supplied permission switches on a group. Admin permissions cannot be changed. allow_role_change requires explicit consent to change affected member roles." + groupBoundary,
    required: ["group_id", "permissions", "confirm"],
    optional: ["allow_role_change"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "create_access",
    name: "create_workspace_group_access",
    title: "Create Workspace Group Access Rule",
    description: "Create a granular group access rule for the selected resource type. access requires name, is_all, and actions; selected-resource rules also need resource_ids from list_workspace_groups. Omitted action switches are disabled." + accessBehavior + groupBoundary,
    required: ["group_id", "resource_type", "access", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
  },
  {
    action: "update_access",
    name: "update_workspace_group_access",
    title: "Update Workspace Group Access Rule",
    description: "Update an existing rule belonging to this group; read IDs with list_workspace_groups include_permissions:true. Only supplied fields change. add_resource_ids/remove_resource_ids preserve other selections and require a selected-resource rule; do not combine with resource_ids or is_all. resource_ids replaces the entire selection. Optional resource_type must match the rule. allow_role_change needs explicit role-change consent." + accessBehavior + groupBoundary,
    required: ["group_id", "rule_id", "access", "confirm"],
    optional: ["resource_type", "allow_role_change"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "delete_access",
    name: "delete_workspace_group_access",
    title: "Delete Workspace Group Access Rule",
    description: "Delete a granular access rule belonging to this group. Read rule IDs with list_workspace_groups include_permissions:true. Optional resource_type must match. Read-only rules cannot be deleted." + groupBoundary,
    required: ["group_id", "rule_id", "confirm"],
    optional: ["resource_type"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  }
];
function workspaceGroupActionTools(source) {
  return exposeActions(source, workspaceGroups);
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
  return exposeActions(source, methods.map(([action, name, title, description]) => ({
    action,
    name,
    title,
    description: `${description} Uses the fixed ${action} metadata method, only when the datasource advertises it. Does not execute saved queries, author resources, or invoke the API endpoints described by a returned schema. schema/table/search/page/limit are selectors; args supplies datasource-specific selectors such as spreadsheet ID or endpoint HTTP method.`,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    required: ["version_id", "datasource_id"],
    optional: ["schema", "table", "search", "page", "limit", "args"]
  })), "method");
}
function invokeArgs(request2) {
  const customValues = request2.args?.values && typeof request2.args.values === "object" && !Array.isArray(request2.args.values) ? request2.args.values : {};
  const values = {
    ...customValues,
    ...request2.schema !== void 0 ? { schema: request2.schema } : {},
    ...request2.table !== void 0 ? { table: request2.table } : {}
  };
  return {
    ...request2.args ?? {},
    ...Object.keys(values).length ? { values } : {},
    ...request2.search !== void 0 ? { search: request2.search } : {},
    ...request2.page !== void 0 ? { page: request2.page } : {},
    ...request2.limit !== void 0 ? { limit: request2.limit } : {}
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
function openapiIntrospection(spec, request2) {
  if (request2.method === "listTables") {
    const endpoints = listEndpoints(spec);
    const host2 = specHost(spec);
    const header = { total: endpoints.length, ...host2 ? { host: host2 } : {} };
    if (request2.search) {
      const ranked = rankEndpoints(spec, endpoints, request2.search);
      const limit2 = request2.limit ?? 25;
      return {
        ...header,
        search: request2.search,
        matched: ranked.length,
        ...ranked.length > limit2 ? { returned: limit2 } : {},
        // Ordered by relevance, not spec order: the caller should read from the top.
        endpoints: ranked.slice(0, limit2).map(({ score, ...endpoint }) => endpoint),
        ...ranked.length ? {} : { hint: "No endpoint matched. Retry with a broader term, or omit `search` to see the spec's tags." }
      };
    }
    const limit = request2.limit ?? 200;
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
  const path = request2.table ?? (typeof request2.args?.path === "string" ? request2.args.path : void 0);
  const method = ["operation", "method", "httpMethod", "http_method", "verb"].map((key) => request2.args?.[key]).find((value) => typeof value === "string" && !!value);
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
        const topLevel2 = args.method ? [{
          method: args.method,
          schema: args.schema,
          table: args.table,
          search: args.search,
          page: args.page,
          limit: args.limit,
          args: args.args
        }] : [];
        const seenRequests = /* @__PURE__ */ new Set();
        const requests = [...args.requests ?? [], ...topLevel2].filter((request2) => {
          if (!request2.method)
            return false;
          const key = JSON.stringify([request2.method, request2.schema ?? null, request2.table ?? null, request2.search ?? null]);
          if (seenRequests.has(key))
            return false;
          seenRequests.add(key);
          return true;
        });
        if (!requests.length) {
          return fail(new Error("Provide a `method` or a `requests` batch."));
        }
        const asBatch = !!args.requests?.length || requests.length > 1;
        const unsupported = [...new Set(requests.map((request2) => request2.method).filter((method) => !methods.includes(method)))];
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
        const results = await Promise.all(requests.map(async (request2) => {
          if (datasource.kind === "hubspot") {
            const specs = hubspotSpecs();
            const selector = request2.schema ?? request2.args?.specType;
            if (!selector && request2.method === "listTables") {
              return { method: request2.method, result: {
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
            const document2 = await hubspotDocuments.get(selected.name);
            const result2 = openapiIntrospection(document2, request2);
            if (result2.query_options) {
              delete result2.query_options.host;
              delete result2.query_options.params.header;
              delete result2.host_warning;
              result2.query_options.specType = selected.specType;
              if (result2.buckets?.["params.header"])
                result2.unsupported_headers = result2.buckets["params.header"];
              result2.notes = "HubSpot fixes the API host and authentication in the plugin. The spec describes API shapes; read Properties/Pipelines endpoints to verify account-specific fields and valid stage IDs. Do not guess them.";
            }
            return { method: request2.method, schema: selected.name, specType: selected.specType, result: result2 };
          }
          if (kindSpec && SPEC_DISCOVERY_METHODS.includes(request2.method)) {
            kindSpecDocument ??= loadKindSpec(client, datasource.kind, kindSpec);
            const result2 = openapiIntrospection(await kindSpecDocument, request2);
            if (result2.query_options) {
              delete result2.query_options.host;
              delete result2.query_options.params?.header;
              delete result2.host_warning;
              if (result2.buckets?.["params.header"])
                result2.unsupported_headers = result2.buckets["params.header"];
              result2.notes = `The ${datasource.kind} plugin fixes the API host and authentication. Copy query_options as they are; put IDs in params.path and filters in params.query, each value flat (created[gte], expand[0]): the plugin cannot send a list or an object.`;
            }
            return { method: request2.method, ...request2.table ? { table: request2.table } : {}, result: result2 };
          }
          if (openapiSpec) {
            const result2 = openapiIntrospection(openapiSpec, request2);
            return { method: request2.method, ...request2.table ? { table: request2.table } : {}, result: result2 };
          }
          const converted = invokeArgs(request2);
          const result = await client.invokeDatasourceMethod({
            dataSourceId: args.datasource_id,
            method: request2.method,
            ...Object.keys(converted).length ? { args: converted } : {}
          });
          return {
            method: request2.method,
            ...request2.schema ? { schema: request2.schema } : {},
            ...request2.table ? { table: request2.table } : {},
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
var MAX_AUTO_ROWS = 1e3;
var PURE_FUNCTIONS = /* @__PURE__ */ new Set([
  // aggregates
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "bool_and",
  "bool_or",
  "every",
  "string_agg",
  "array_agg",
  "group_concat",
  "json_agg",
  "jsonb_agg",
  "json_object_agg",
  "jsonb_object_agg",
  "stddev",
  "stddev_pop",
  "stddev_samp",
  "variance",
  "var_pop",
  "var_samp",
  "percentile_cont",
  "percentile_disc",
  "mode",
  // window ranking
  "row_number",
  "rank",
  "dense_rank",
  "percent_rank",
  "cume_dist",
  "ntile",
  "lag",
  "lead",
  "first_value",
  "last_value",
  "nth_value",
  // conditional and casts
  "coalesce",
  "nullif",
  "greatest",
  "least",
  "cast",
  "ifnull",
  "isnull",
  "nvl",
  "iif",
  // strings
  "lower",
  "upper",
  "trim",
  "ltrim",
  "rtrim",
  "btrim",
  "length",
  "char_length",
  "character_length",
  "octet_length",
  "substring",
  "substr",
  "left",
  "right",
  "concat",
  "concat_ws",
  "replace",
  "position",
  "strpos",
  "split_part",
  "lpad",
  "rpad",
  "initcap",
  "reverse",
  "format",
  "to_char",
  // numbers
  "abs",
  "round",
  "floor",
  "ceil",
  "ceiling",
  "trunc",
  "mod",
  "power",
  "sqrt",
  "sign",
  "to_number",
  // dates and times
  "now",
  "current_timestamp",
  "current_date",
  "date_trunc",
  "date_part",
  "extract",
  "age",
  "to_date",
  "to_timestamp",
  "date",
  "year",
  "month",
  "day",
  "datediff",
  "dateadd",
  "date_add",
  "date_sub",
  "date_format",
  "make_date",
  "make_interval",
  "justify_interval",
  // json reads
  "json_extract_path_text",
  "jsonb_extract_path_text",
  "json_array_length",
  "jsonb_array_length"
]);
var PAREN_KEYWORDS = /* @__PURE__ */ new Set([
  "select",
  "from",
  "where",
  "in",
  "exists",
  "on",
  "using",
  "as",
  "and",
  "or",
  "not",
  "any",
  "all",
  "some",
  "values",
  "case",
  "when",
  "then",
  "else",
  "between",
  "distinct",
  "having",
  "limit",
  "offset",
  "lateral",
  "order",
  "group",
  "with",
  "array",
  "row"
]);
var AGGREGATES = /* @__PURE__ */ new Set([
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "bool_and",
  "bool_or",
  "every",
  "string_agg",
  "array_agg",
  "group_concat",
  "json_agg",
  "jsonb_agg"
]);
var TEXT_FUNCTIONS = /* @__PURE__ */ new Set([
  "lower",
  "upper",
  "trim",
  "ltrim",
  "rtrim",
  "btrim",
  "length",
  "char_length",
  "character_length",
  "octet_length",
  "substring",
  "substr",
  "left",
  "right",
  "replace",
  "position",
  "strpos",
  "split_part",
  "lpad",
  "rpad",
  "initcap",
  "reverse"
]);
var NUMERIC_FUNCTIONS = /* @__PURE__ */ new Set(["abs", "round", "floor", "ceil", "ceiling", "trunc", "mod", "power", "sqrt", "sign"]);
var TEXT_TYPES = /* @__PURE__ */ new Set(["text", "varchar", "character", "char", "bpchar", "name", "citext", "nvarchar", "nchar"]);
var NUMERIC_TYPES = /* @__PURE__ */ new Set([
  "numeric",
  "decimal",
  "int",
  "integer",
  "int2",
  "int4",
  "int8",
  "smallint",
  "bigint",
  "real",
  "float",
  "float4",
  "float8",
  "double"
]);
var READ_HINTS = /* @__PURE__ */ new Set(["nolock", "readuncommitted"]);
function maskSql(sql, dialect, backslashEscapes) {
  const mysqlRules = dialect === void 0 || dialect === "mysql";
  let out = "";
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "{" && sql[i + 1] === "{") {
      const end = sql.indexOf("}}", i + 2);
      if (end < 0)
        return { refusal: "its {{ }} bindings do not close" };
      out += "''";
      i = end + 1;
    } else if (ch === "'") {
      let closed = false;
      while (++i < sql.length) {
        if (sql[i] === "\\" && backslashEscapes) {
          i++;
          continue;
        }
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            i++;
            continue;
          }
          closed = true;
          break;
        }
      }
      if (!closed)
        return { refusal: "a string literal does not close" };
      out += "''";
    } else if (ch === '"' || ch === "`" || ch === "[" && dialect === "mssql") {
      const close = ch === "[" ? "]" : ch;
      const end = sql.indexOf(close, i + 1);
      if (end < 0)
        return { refusal: "a quoted identifier does not close" };
      out += " _q ";
      i = end;
    } else if (ch === "-" && sql[i + 1] === "-") {
      if (mysqlRules && !/^[\s\x00-\x1f]$/.test(sql[i + 2] ?? "")) {
        return { refusal: "it has -- without a space after it, which MySQL does not read as a comment" };
      }
      while (i < sql.length && sql[i] !== "\n")
        i++;
      out += " ";
    } else if (ch === "#" && mysqlRules) {
      return { refusal: "it has a #, which starts a comment in MySQL" };
    } else if (ch === "/" && sql[i + 1] === "*") {
      if (/^\/\*\s*(?:!|M!|\+)/.test(sql.slice(i)))
        return { refusal: "it has an executable comment or optimizer hint (/*! */, /*M! */, /*+ */)" };
      const end = sql.indexOf("*/", i + 2);
      if (end < 0)
        return { refusal: "a comment does not close" };
      out += " ";
      i = end + 1;
    } else if (ch === "$" && /^\$[A-Za-z_]*\$/.test(sql.slice(i))) {
      return { refusal: "it uses dollar quoting" };
    } else
      out += ch;
  }
  return { text: out.replace(/\s+/g, " ").trim().replace(/;\s*$/, "").trim().toLowerCase() };
}
function maskBothWays(sql, dialect) {
  const plain = maskSql(sql, dialect, false);
  const escaped = maskSql(sql, dialect, true);
  if ("refusal" in plain)
    return plain;
  if ("refusal" in escaped)
    return escaped;
  if (plain.text !== escaped.text)
    return { refusal: "its string literals read differently with and without backslash escapes" };
  return plain;
}
function topLevel(sql) {
  let depth = 0;
  let out = "";
  for (const ch of sql) {
    if (ch === "(") {
      if (depth === 0)
        out += "(";
      depth++;
    } else if (ch === ")") {
      depth--;
      if (depth < 0)
        return void 0;
      if (depth === 0)
        out += ")";
    } else if (depth === 0)
      out += ch;
  }
  return depth === 0 ? out : void 0;
}
var FROM_END = /^(where|group|order|limit|having|window|union|intersect|except|fetch|offset|for|qualify|returning|on|using)\b/;
function crossProduct(masked) {
  const sql = masked.toLowerCase();
  if (/\bcross\s+(join|apply)\b/.test(sql))
    return "it has a CROSS JOIN";
  if (/\bnatural\s+((left|right|full|inner)\s+)?(outer\s+)?join\b/.test(sql))
    return "it has a NATURAL JOIN";
  if (/\bon\s*\(?\s*(true|1\s*=\s*1|0\s*=\s*0)\s*\)?(?=\s|$|\))/.test(sql))
    return "it joins ON a condition that is always true";
  for (const match of sql.matchAll(/\bfrom\b/g)) {
    let depth = 0;
    for (let i = match.index + 4; i < sql.length; i++) {
      const ch = sql[i];
      if (ch === "(")
        depth++;
      else if (ch === ")") {
        if (--depth < 0)
          break;
      } else if (depth === 0) {
        if (ch === ",")
          return "it lists tables separated by commas in FROM (an implicit cross join)";
        if (ch === ";")
          break;
        if (/[a-z_]/.test(ch) && !/[a-z0-9_$]/.test(sql[i - 1] ?? " ") && FROM_END.test(sql.slice(i)))
          break;
      }
    }
  }
  return void 0;
}
var items = (clause) => clause.split(",").map((item) => item.trim()).filter(Boolean);
function closingParen(sql, open) {
  let depth = 0;
  for (let i = open; i < sql.length; i++) {
    if (sql[i] === "(")
      depth++;
    else if (sql[i] === ")" && --depth === 0)
      return i;
  }
  return -1;
}
function keywordCallAllowed(name, sql, at, dialect) {
  const before = sql.slice(0, at).trimEnd();
  if (name === "filter" || name === "over")
    return before.endsWith(")");
  if (name === "by")
    return /\b(?:order|group|partition)$/.test(before);
  if (name === "join")
    return /^join\s*\(\s*select\b/.test(sql.slice(at));
  if (name === "top")
    return (dialect === "mssql" || dialect === void 0) && /^select(?:\s+(?:distinct|all))?$/.test(before);
  return false;
}
function impureCall(sql, dialect) {
  const calls = sql.matchAll(/([a-z_][\w$]*(?:\s*\.\s*[a-z_][\w$]*)*|_q)\s*\(/g);
  for (const call of calls) {
    const name = call[1].replace(/\s+/g, "");
    if (name.includes(".") || name === "_q")
      return name;
    if (PAREN_KEYWORDS.has(name))
      continue;
    if (["filter", "over", "by", "join", "top"].includes(name)) {
      if (keywordCallAllowed(name, sql, call.index, dialect))
        continue;
      return name;
    }
    if (!PURE_FUNCTIONS.has(name))
      return name;
  }
  return void 0;
}
function overloadedCall(sql) {
  for (const call of sql.matchAll(/\b([a-z_][\w$]*)\s*\(/g)) {
    const name = call[1];
    const family = TEXT_FUNCTIONS.has(name) ? TEXT_TYPES : NUMERIC_FUNCTIONS.has(name) ? NUMERIC_TYPES : void 0;
    if (!family)
      continue;
    const open = call.index + call[0].length - 1;
    const close = closingParen(sql, open);
    const args = sql.slice(open + 1, close < 0 ? void 0 : close);
    const casts = [...args.matchAll(/::\s*([a-z_][\w$]*)/g), ...args.matchAll(/\bcast\s*\([^]*?\bas\s+([a-z_][\w$]*)/g)];
    const foreign = casts.map((cast) => cast[1]).find((type) => !family.has(type));
    if (foreign)
      return `${name}() with an argument cast to ${foreign === "_q" ? "a quoted type" : foreign}`;
  }
  return void 0;
}
function topBound(masked) {
  const head = masked.match(/^select\s+(?:(?:distinct|all)\s+)?top\b\s*(.*)$/);
  if (!head)
    return void 0;
  const count = head[1].match(/^(?:\(\s*(\d+)\s*\)|(\d+)\b)\s*(.*)$/);
  if (!count)
    return { refusal: "its TOP is not a fixed row count" };
  if (/^percent\b/.test(count[3]))
    return { refusal: "its TOP is a PERCENT of the rows, not a fixed row count" };
  if (/^with\s+ties\b/.test(count[3]))
    return { refusal: "its TOP ... WITH TIES can return more rows than its count" };
  return { rows: Number(count[1] ?? count[2]) };
}
function autoReadSqlRefusal(sql, dialect) {
  const read = maskBothWays(sql, dialect);
  if ("refusal" in read)
    return `its SQL cannot be read with certainty: ${read.refusal}`;
  const masked = read.text;
  if (!masked || masked.includes(";"))
    return "it is empty or has more than one statement";
  const top = topLevel(masked);
  if (top === void 0)
    return "its parentheses do not balance";
  if (/^with\b/.test(top))
    return "a statement with a WITH list (CTE) is not run automatically";
  if (!/^select\b/.test(top))
    return "only a single SELECT is run automatically";
  if (/\b(union|intersect|except)\b/.test(top))
    return "UNION, INTERSECT and EXCEPT are not run automatically";
  if (/\b(insert|update|delete|merge|upsert|truncate|drop|alter|create|grant|revoke|copy|call|exec|execute|into|lock)\b/.test(masked)) {
    return "it contains a statement that writes or runs code";
  }
  if (/\bfor\s+(update|share|no\s+key\s+update|key\s+share)\b/.test(top))
    return "a locking SELECT is not run automatically";
  if (/\bnext\s+value\s+for\b/.test(masked))
    return "it takes NEXT VALUE FOR a sequence, which advances it";
  if (/:=/.test(masked))
    return "it assigns a variable (:=)";
  if (/\b(updlock|xlock|holdlock|tablock|tablockx|paglock|rowlock|serializable|repeatableread|readcommittedlock)\b/.test(masked)) {
    return "it has a table hint that takes or holds locks";
  }
  for (const hint of masked.matchAll(/\bwith\s*\(([^()]*)\)/g)) {
    const names = hint[1].split(",").map((name) => name.trim()).filter(Boolean);
    if (!names.length || names.some((name) => !READ_HINTS.has(name)))
      return `it has the table hint WITH (${hint[1].trim()}), which is not a plain read`;
  }
  if (/\boption\s*\(/.test(masked))
    return "it has a query hint (OPTION (...))";
  if (/\bwith\s+ties\b/.test(masked))
    return "WITH TIES can return more rows than its limit";
  const product = crossProduct(masked);
  if (product)
    return `${product}, which can read the product of its tables however small its LIMIT; join on a condition`;
  const fn = impureCall(masked, dialect);
  if (fn)
    return `it calls ${fn}(), which is not a well-known pure function`;
  const overload = overloadedCall(masked);
  if (overload)
    return `it calls ${overload}, which is not the built-in function's signature (another overload would run)`;
  const limit = top.match(/\blimit\s+(\d+)(?:\s*,\s*(\d+))?(?:\s+offset\s+\d+)?$/) ?? top.match(/\boffset\s+\d+(?:\s+rows?)?\s+limit\s+(\d+)$/);
  const fetch = top.match(/\bfetch\s+(?:first|next)\s+(\d+)\s+rows?\s+only$/);
  const topN = topBound(masked);
  if (topN && "refusal" in topN)
    return topN.refusal;
  const bounds = [limit ? Number(limit[2] ?? limit[1]) : void 0, fetch ? Number(fetch[1]) : void 0, topN?.rows].filter((n) => n !== void 0);
  const bound = bounds.length ? Math.min(...bounds) : void 0;
  if (bound !== void 0) {
    return bound <= MAX_AUTO_ROWS ? void 0 : `its LIMIT ${bound} is above the ${MAX_AUTO_ROWS}-row automatic bound`;
  }
  if (/\b(limit|fetch|top)\b/.test(masked)) {
    return "its row limit is not the final clause of the outer SELECT (a LIMIT in a subquery bounds nothing it returns)";
  }
  const from = top.search(/\bfrom\b/);
  if (from < 0)
    return void 0;
  const projection = items(top.slice("select".length, from).replace(/^\s*distinct\b/, ""));
  const aggregateOnly = projection.length > 0 && projection.every((item) => {
    const m = item.match(/^([a-z_][\w$]*)\s*\(\)(?:\s+(?:as\s+)?[a-z_][\w$]*)?$/);
    return !!m && AGGREGATES.has(m[1]);
  });
  if (aggregateOnly && !/\b(group\s+by|over)\b/.test(top.slice(from)))
    return void 0;
  return "it has no row limit on the outer SELECT";
}
var sqlDialectOf = (kind) => kind ? SQL_DIALECT[kind.toLowerCase()] : void 0;
function batchSafeRead(query) {
  const assessment = assessQueryRead(query);
  if (assessment.provenRead && assessment.directSafe && !assessment.selectStar) {
    const refusal = resolvedReadRefusal(query, assessment, resolveStaticBindings(query.options).resolved);
    return refusal ? { safe: false, reason: refusal } : { safe: true };
  }
  if (assessment.provenRead && assessment.requiresRemoteReadConfirmation) {
    return {
      safe: false,
      reason: `${assessment.reason ?? "remote read"} run_queries cannot run remote reads at all. Use singular run_query for this one: tell the user which saved query will run, and once they approve, call run_query with user_confirmed_remote_read:true. Do not retry run_queries with it.`
    };
  }
  return {
    safe: false,
    reason: assessment.reason ?? (assessment.requiresCountPreflight ? "read requires a count-first preflight through singular run_query" : "query is not a proven bounded read")
  };
}
var NOT_CHECKED_AUTOMATICALLY = "not checked automatically, run it explicitly with run_query: ";
var AUTO_SQL_KINDS = /* @__PURE__ */ new Set(["postgresql", "mysql", "mariadb", "mssql", "oracledb"]);
var MODE_REQUIRED = /* @__PURE__ */ new Set(["postgresql", "mysql", "mssql"]);
var TOOLJETDB_LIST_ROWS_KEYS = /* @__PURE__ */ new Set(["limit", "offset", "where_filters", "order_filters", "aggregates", "group_by"]);
var record = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
var hasText = (value) => typeof value === "string" && !!value.trim();
function sqlRefusal(kind, options, sql) {
  if (!sql)
    return "its SQL text is empty";
  const dialect = sqlDialectOf(kind);
  const saved = autoReadSqlRefusal(sql, dialect);
  if (saved)
    return saved;
  let resolvedOptions;
  try {
    resolvedOptions = applyResolvedBindings(options, resolveStaticBindings(options).resolved);
  } catch {
    return "its bindings cannot be resolved without a browser";
  }
  const resolved = kind === "tooljetdb" ? record(resolvedOptions.sql_execution)?.sqlQuery : (() => {
    const path = sqlConnectorPath(kind, resolvedOptions);
    return path?.path === "sql" ? path.sql : void 0;
  })();
  if (typeof resolved !== "string")
    return "its SQL text is not text once its bindings resolve";
  if (resolved === sql)
    return void 0;
  const after = autoReadSqlRefusal(resolved, dialect);
  return after ? `once its {{ }} bindings resolve, ${after}` : void 0;
}
function connectorRefusal(query) {
  const kind = query.kind?.toLowerCase();
  const options = record(query.options);
  if (!kind || !options)
    return "its datasource kind or options are unavailable";
  if (kind === "tooljetdb") {
    if (options.operation === "list_rows") {
      if (options.limit !== void 0 || options.offset !== void 0) {
        return "it has a top-level limit or offset, which ToolJet Database ignores (it reads list_rows.limit and list_rows.offset)";
      }
      const stray = Object.keys(record(options.list_rows) ?? {}).filter((key) => !TOOLJETDB_LIST_ROWS_KEYS.has(key));
      return stray.length ? `its list_rows carries ${stray.join(", ")}, which ToolJet Database does not read` : void 0;
    }
    if (options.operation === "sql_execution")
      return sqlRefusal(kind, options, record(options.sql_execution)?.sqlQuery);
    return `ToolJet Database operation "${String(options.operation ?? "<missing>")}" is not one the automatic check runs`;
  }
  if (!AUTO_SQL_KINDS.has(kind)) {
    return `automatic checks run only ToolJet Database, PostgreSQL, MySQL, MariaDB, SQL Server and Oracle queries, whose read and write branches are known; this is a ${kind} query`;
  }
  const label = connectorLabel(kind);
  const mode = options.mode;
  if (MODE_REQUIRED.has(kind) && mode !== "sql" && mode !== "gui") {
    return `its mode is ${mode === void 0 ? "missing" : `"${String(mode)}"`}: ${label} runs a query only in mode "sql" or "gui"`;
  }
  if (mode !== void 0 && mode !== "sql" && mode !== "gui")
    return `its mode "${String(mode)}" is neither "sql" nor "gui"`;
  const path = sqlConnectorPath(kind, options);
  if (path.path === "not_read")
    return path.reason;
  if (path.path === "gui_list_rows") {
    if (hasText(options.query))
      return "it is a GUI query that also carries SQL text in query; remove the one that is not meant to run";
    const stray = Object.keys(record(options.list_rows) ?? {}).filter((key) => !GUI_LIST_ROWS_KEYS.has(key));
    if (stray.includes("limit") || stray.includes("offset")) {
      return `its row bound is in list_rows, which ${label} ignores (it applies only the top-level limit and offset), so it is unbounded`;
    }
    if (stray.length)
      return `its list_rows carries ${stray.join(", ")}, which ${label} does not read`;
    if (options.limit === void 0)
      return `it has no top-level limit, which is where ${label} applies the row limit`;
    return void 0;
  }
  if (hasText(options.operation)) {
    return `it is a SQL query that also names the GUI operation "${String(options.operation)}"; remove the one that is not meant to run`;
  }
  return sqlRefusal(kind, options, path.sql);
}
function autoReadPreflight(query) {
  const general = batchSafeRead(query);
  if (!general.safe)
    return { run: false, reason: String(general.reason ?? "not a proven bounded read") };
  const refusal = connectorRefusal(query);
  return refusal ? { run: false, reason: `${NOT_CHECKED_AUTOMATICALLY}${refusal}` } : { run: true };
}
createRequire(import.meta.url);
var running = 0;
var grants = /* @__PURE__ */ new Set();
function reserveRenderAudit(grant) {
  const configured = Number(process.env.MCP_RENDER_AUDIT_MAX_BROWSERS ?? 2);
  const limit = Number.isInteger(configured) && configured >= 1 && configured <= 32 ? configured : 2;
  if (running >= limit || grant && grants.has(grant))
    return void 0;
  running++;
  if (grant)
    grants.add(grant);
  let released = false;
  return () => {
    if (released)
      return;
    released = true;
    running--;
    if (grant)
      grants.delete(grant);
  };
}
async function waitForRenderAudit(grant, timeoutMs = 6e4) {
  const deadline = Date.now() + timeoutMs;
  for (; ; ) {
    const release = reserveRenderAudit(grant);
    if (release || grant && grants.has(grant) || Date.now() >= deadline)
      return release;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
function httpUrl(value) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Render audit URLs must use HTTP(S) without embedded credentials");
  }
  return url;
}
function renderAuditOrigins(configuredBase, additional = "") {
  return /* @__PURE__ */ new Set([httpUrl(configuredBase).origin, ...additional.split(",").map((s) => s.trim()).filter(Boolean).map((s) => httpUrl(s).origin)]);
}
function isSandboxFrameDocument(url, configured = process.env.CODE_MODE_SANDBOX_URL) {
  if (!configured || !url.pathname.endsWith("/api/code-frame/frame.html"))
    return false;
  try {
    const sandbox = new URL(configured.replace("*.", "wildcard."));
    const host = sandbox.hostname.replace(/^wildcard\./, "");
    const hostMatches = configured.includes("*.") ? url.hostname.endsWith(`.${host}`) : url.hostname === host;
    return hostMatches && url.protocol === sandbox.protocol && url.port === sandbox.port;
  } catch {
    return false;
  }
}
function renderAuditUrlAllowed(value, origins) {
  try {
    const url = httpUrl(value);
    return origins.has(url.origin) || isSandboxFrameDocument(url);
  } catch {
    return false;
  }
}
function renderAuditPrivateOrigins(configuredBase) {
  const named = [process.env.TOOLJET_URL, process.env.MCP_RENDER_AUDIT_PRIVATE_ORIGINS].filter(Boolean).join(",");
  return renderAuditOrigins(configuredBase, named);
}
function renderAuditBase(configuredBase, override) {
  const origins = renderAuditOrigins(configuredBase, process.env.MCP_RENDER_AUDIT_ALLOWED_ORIGINS);
  const url = httpUrl(override ?? configuredBase);
  if (!origins.has(url.origin))
    throw new Error("viewer_url origin is not configured for render audits");
  if (url.search || url.hash)
    throw new Error("viewer_url must be a base URL without query or fragment");
  return { base: url.href.replace(/\/$/, ""), origins };
}
function hasBinding(value) {
  if (typeof value === "string")
    return value.includes("{{");
  if (Array.isArray(value))
    return value.some(hasBinding);
  return !!value && typeof value === "object" && Object.values(value).some(hasBinding);
}
function renderAuditRequest(url, method, saved) {
  if (["GET", "HEAD", "OPTIONS"].includes(method))
    return { allowed: true };
  const blocked = (detail) => ({ allowed: false, detail: `${detail}; this behavior was not verified` });
  if (method !== "POST" || !saved?.version_id)
    return blocked("A potentially mutating request was blocked");
  const parsed = httpUrl(url);
  const match = parsed.pathname.match(/\/api\/data-queries\/([A-Za-z0-9_-]+)(?:\/versions\/([A-Za-z0-9_-]+))?\/run(?:\/([A-Za-z0-9_-]+))?$/);
  if (!match || match[2] && (match[2] !== saved.version_id || !match[3] || parsed.searchParams.get("mode") !== "view") || !match[2] && match[3])
    return blocked("An unverified query or mutating request was blocked");
  const query = saved.queries.find((item) => item.id === match[1]);
  if (!query)
    return blocked("A query outside the audited app/version was blocked");
  const options = query.options;
  if (hasBinding(options))
    return blocked("A query with dynamic bindings was blocked");
  if (options?.requestConfirmation || options?.request_confirmation)
    return blocked("A query requiring confirmation was blocked");
  if (!autoReadPreflight(query).run)
    return blocked("A query that is not a proven bounded read was blocked");
  return { allowed: true, postData: JSON.stringify({ resolvedOptions: {} }) };
}
var INTERNAL = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4]
])
  INTERNAL.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8]
])
  INTERNAL.addSubnet(net, prefix, "ipv6");
var embeddedIpv4 = (address) => {
  const lower = address.toLowerCase();
  const dotted = /^(?:::ffff:|::|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (dotted)
    return dotted[1];
  const hex = /^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower);
  if (!hex)
    return void 0;
  const hi = parseInt(hex[1], 16);
  const lo = parseInt(hex[2], 16);
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
};
function internalAddress(address) {
  const family = isIP(address);
  if (family === 4)
    return INTERNAL.check(address, "ipv4");
  if (family !== 6)
    return true;
  const v4 = embeddedIpv4(address);
  if (v4)
    return INTERNAL.check(v4, "ipv4");
  return INTERNAL.check(address, "ipv6");
}
var systemResolver = (hostname) => lookup(hostname, { all: true, verbatim: true });
var literalHost = (hostname) => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return isIP(host) !== 0 || host === "localhost" || host.endsWith(".localhost");
};
function connectionKey(value) {
  try {
    const url = new URL(value);
    if (!/^(https?|wss?):$/.test(url.protocol))
      return void 0;
    return `${url.hostname.toLowerCase()}:${url.port || defaultPort(url.protocol)}`;
  } catch {
    return void 0;
  }
}
var HOP_BY_HOP = ["proxy-connection", "proxy-authorization", "connection", "keep-alive", "te", "trailer", "upgrade"];
var forwardHeaders = (headers) => {
  const out = { ...headers };
  for (const name of HOP_BY_HOP)
    delete out[name];
  return out;
};
var defaultPort = (protocol) => protocol === "https:" || protocol === "wss:" ? "443" : "80";
var tunnelTargets = (origins) => {
  const targets = /* @__PURE__ */ new Set();
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      targets.add(`${url.hostname.toLowerCase()}:${url.port || defaultPort(url.protocol)}`);
    } catch {
    }
  }
  return targets;
};
var tunnelTarget = (authority) => {
  if (!authority || !/:\d{1,5}$/.test(authority))
    return void 0;
  try {
    const url = new URL(`http://${authority}`);
    const port = /:(\d{1,5})$/.exec(authority)[1];
    return url.username || url.password || url.pathname !== "/" ? void 0 : `${url.hostname.toLowerCase()}:${port}`;
  } catch {
    return void 0;
  }
};
var unbracket = (hostname) => hostname.replace(/^\[|\]$/g, "");
async function startEgressProxy(origins, onBlocked = () => {
}, options = {}) {
  const tunnels = tunnelTargets(origins);
  const mayBeInternal = tunnelTargets(new Set([...origins].filter((origin) => {
    try {
      return options.privateOrigins?.has(new URL(origin).origin) || literalHost(new URL(origin).hostname);
    } catch {
      return false;
    }
  })));
  const resolver = options.resolve ?? systemResolver;
  const pin = async (host, port) => {
    const bare = unbracket(host);
    const internalOk = mayBeInternal.has(`${host.toLowerCase()}:${port}`);
    let addresses;
    if (isIP(bare))
      addresses = [bare];
    else {
      try {
        addresses = (await resolver(bare)).map((entry) => entry.address);
      } catch {
        return void 0;
      }
    }
    if (!addresses.length)
      return void 0;
    if (!internalOk && addresses.some(internalAddress))
      return void 0;
    return addresses[0];
  };
  const sockets = /* @__PURE__ */ new Set();
  const track = (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  };
  const refuseSocket = (socket, destination) => {
    socket.on("error", () => socket.destroy());
    onBlocked(destination);
    socket.end("HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
  };
  const tunnel = async (client, host, port, destination, first) => {
    client.on("error", () => client.destroy());
    const address2 = await pin(host, port);
    if (client.destroyed)
      return;
    if (!address2) {
      refuseSocket(client, destination);
      return;
    }
    const upstream = connect(port, address2, () => {
      first(upstream);
      upstream.pipe(client);
      client.pipe(upstream);
    });
    track(upstream);
    upstream.on("error", () => client.destroy());
    client.on("error", () => upstream.destroy());
  };
  const server = createServer((req, res) => {
    let url;
    try {
      url = new URL(req.url ?? "");
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (url.protocol !== "http:" || !renderAuditUrlAllowed(url.href, origins)) {
      onBlocked(connectionKey(url.href) ?? url.origin);
      res.writeHead(403, { "content-length": "0", connection: "close" }).end();
      return;
    }
    const port = Number(url.port || 80);
    req.on("error", () => res.destroy());
    req.pause();
    void pin(url.hostname, port).then((address2) => {
      if (!address2) {
        onBlocked(connectionKey(url.href) ?? url.origin);
        res.writeHead(403, { "content-length": "0", connection: "close" }).end();
        return;
      }
      const upstream = request({ host: address2, port, method: req.method, path: url.pathname + url.search, headers: forwardHeaders(req.headers) }, (answer) => {
        const headers = { ...answer.headers };
        for (const name of ["connection", "keep-alive", "transfer-encoding"])
          delete headers[name];
        res.writeHead(answer.statusCode ?? 502, answer.statusMessage, headers);
        answer.pipe(res);
      });
      upstream.on("error", () => {
        if (!res.headersSent)
          res.writeHead(502, { "content-length": "0" });
        res.end();
      });
      req.pipe(upstream);
      req.resume();
    }).catch(() => res.destroy());
  });
  server.on("clientError", (_error, socket) => socket.destroy());
  server.on("connection", track);
  server.on("connect", (req, client, head) => {
    const target = tunnelTarget(req.url);
    if (!target || !tunnels.has(target)) {
      refuseSocket(client, target ?? "an unreadable tunnel target");
      return;
    }
    const at = target.lastIndexOf(":");
    void tunnel(client, target.slice(0, at), Number(target.slice(at + 1)), target, (upstream) => {
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length)
        upstream.write(head);
    }).catch(() => client.destroy());
  });
  server.on("upgrade", (req, client, head) => {
    let url;
    try {
      url = new URL(req.url ?? "");
    } catch {
      refuseSocket(client, "an unreadable upgrade target");
      return;
    }
    const asHttp = url.href.replace(/^ws:/i, "http:");
    if (!/^(http|ws):$/i.test(url.protocol) || !renderAuditUrlAllowed(asHttp, origins)) {
      refuseSocket(client, connectionKey(url.href) ?? url.origin);
      return;
    }
    void tunnel(client, url.hostname, Number(url.port || 80), connectionKey(url.href) ?? url.origin, (upstream) => {
      const lines = [`${req.method} ${url.pathname}${url.search} HTTP/${req.httpVersion}`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        if (!/^proxy-/i.test(req.rawHeaders[i]))
          lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
      }
      upstream.write(lines.join("\r\n") + "\r\n\r\n");
      if (head.length)
        upstream.write(head);
    }).catch(() => client.destroy());
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("The render egress proxy has no address");
  return {
    server: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => {
      for (const socket of sockets)
        socket.destroy();
      server.close(() => resolve());
    })
  };
}
var screenshotDir = () => process.env.MCP_RENDER_AUDIT_SCREENSHOTS || join(tmpdir(), "tooljet-render-audit");
async function axeInCodePage(page) {
  const handle = await page.$("iframe[data-tj-code-page-frame]");
  const frame = await handle?.contentFrame();
  if (!frame)
    return void 0;
  const { default: axe } = await import("axe-core");
  await frame.evaluate(`${axe.source}
;void 0`);
  return frame.evaluate(axeRunInFrame);
}
function axeRunInFrame() {
  const refusal = '[data-cy^="code-screen-no-access"]';
  const context = document.querySelector(refusal) ? { exclude: [refusal] } : document;
  const textOf = (selector) => {
    try {
      const text = (document.querySelector(selector)?.textContent ?? "").trim().replace(/\s+/g, " ");
      return text ? text.length > 60 ? `${text.slice(0, 57)}...` : text : void 0;
    } catch {
      return void 0;
    }
  };
  return window.axe.run(context, { resultTypes: ["violations"], runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }).then((r) => r.violations.map((v) => {
    const nodes = v.nodes.slice(0, 3);
    const targets = nodes.map((n) => [].concat(n.target).join(" "));
    const out = { id: v.id, impact: v.impact ?? null, help: v.help, nodes: v.nodes.length, targets };
    if (v.id === "color-contrast") {
      out.elements = nodes.map((n, i) => {
        const data = (n.any ?? []).find((c) => c?.data?.fgColor)?.data ?? {};
        const text = textOf(targets[i]);
        return {
          target: targets[i],
          ...text ? { text } : {},
          ...data.fgColor ? { fg: data.fgColor } : {},
          ...data.bgColor ? { bg: data.bgColor } : {},
          ...typeof data.contrastRatio === "number" ? { ratio: data.contrastRatio } : {},
          ...data.expectedContrastRatio ? { needs: data.expectedContrastRatio } : {}
        };
      });
    }
    return out;
  }));
}
function auditScript() {
  const widgets = Array.from(document.querySelectorAll('[data-cy^="draggable-widget-"]'));
  const boxes = [];
  const findings = [];
  const seenNames = /* @__PURE__ */ new Set();
  const bad = /\bundefined\b|\bNaN\b|\bnull\b|Invalid date|\bTab [123]\b|Select\.\.|\\n|\[object Object\]|\{\{|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}|%%|·\s*·|[$€£]\s?\d{5,}(?![,.]\d)/;
  for (const el of widgets) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4)
      continue;
    const cy = el.getAttribute("data-cy") || "";
    const type = (el.className.toString().match(/_tooljet-([A-Za-z0-9]+)/) || [])[1] || "?";
    const name = `${type}:${cy.replace("draggable-widget-", "")}`;
    if (seenNames.has(cy))
      continue;
    seenNames.add(cy);
    const text = (el.innerText || "").trim();
    boxes.push({ name, x: r.x, y: r.y, w: r.width, h: r.height, el });
    const textual = /^(Html|Text|Statistics|Table|Tabs|Listview|Kanban|KeyValuePair|Timeline|Steps):/.test(name);
    const emptyStateByName = /empty|placeholder|no_?data|nothing/i.test(cy);
    if (textual && text.length === 0 && r.height > 30 && !emptyStateByName) {
      findings.push({ kind: "empty_render", component: name, detail: `${Math.round(r.width)}x${Math.round(r.height)}px box renders no text (a multi-line binding or a broken expression)` });
    }
    const m = text.match(bad);
    if (m)
      findings.push({ kind: "placeholder_text", component: name, detail: `rendered text contains "${m[0]}"` });
    let clippedHere = false;
    for (const node of [el, ...Array.from(el.querySelectorAll("*"))]) {
      const cs = getComputedStyle(node);
      const hidden = cs.overflow === "hidden" || cs.overflowY === "hidden" || cs.overflowX === "hidden";
      if (!hidden || (node.innerText || "").trim().length === 0)
        continue;
      if (node.scrollHeight > node.clientHeight + 6 && node.clientHeight > 12) {
        findings.push({ kind: "clipped", component: name, detail: `"${(node.innerText || "").trim().slice(0, 40)}" needs ${node.scrollHeight}px but has ${node.clientHeight}px` });
        clippedHere = true;
        break;
      }
    }
    if (!clippedHere && !/^(Table|Listview|Kanban|Container|Form|Tabs):/.test(name)) {
      const leaves = Array.from(el.querySelectorAll("*")).filter((n) => n.children.length === 0 && (n.textContent || "").trim());
      const overflow = Math.max(0, ...leaves.map((n) => n.getBoundingClientRect().bottom)) - (r.top + r.height);
      if (overflow > 4) {
        findings.push({ kind: "clipped", component: name, detail: `text runs ${Math.round(overflow)}px past the widget's bottom edge; the widget needs ${Math.round(r.height + overflow)}px` });
        clippedHere = true;
      }
    }
    if (/^Chart:/.test(name)) {
      const tick = el.querySelector(".xtick text, .ytick text, .legendtext");
      const family = tick ? getComputedStyle(tick).fontFamily.toLowerCase() : "";
      if (family.includes("open sans") || family.includes("verdana")) {
        findings.push({ kind: "placeholder_text", component: name, detail: "chart uses Plotly default styling (Open Sans/Verdana labels); draw it with plotFromJson and the house layout" });
      }
      const traces = el.querySelectorAll(".trace, .bars path, .slice, .scatterlayer path, .heatmaplayer image").length;
      if (el.querySelector(".js-plotly-plot, .plot-container") && traces === 0) {
        findings.push({ kind: "empty_render", component: name, detail: "chart has axes but no data trace; the query feeding it returned the wrong shape (a chart needs {data:[...], layout:{...}})" });
      }
      const slices = Array.from(el.querySelectorAll(".slice path, .pie path"));
      const fills = new Set(slices.map((n) => (n.getAttribute("style") || "").match(/fill:\s*([^;]+)/)?.[1] ?? n.getAttribute("fill") ?? "").filter(Boolean));
      if (fills.has("rgb(31, 119, 180)") && fills.has("rgb(255, 127, 14)")) {
        findings.push({ kind: "placeholder_text", component: name, detail: "pie chart uses Plotly default rainbow colours; use the theme series palette" });
      }
      const drag = el.querySelector(".nsewdrag");
      const dr = drag ? drag.getBoundingClientRect() : null;
      if (dr) {
        const cutLabels = Array.from(el.querySelectorAll(".bartext")).filter((t) => {
          const tr = t.getBoundingClientRect();
          if (tr.top >= dr.top - 1 && tr.right <= dr.right + 1)
            return false;
          let n = t.parentElement;
          while (n && n !== el) {
            if (n.getAttribute("clip-path"))
              return true;
            n = n.parentElement;
          }
          return false;
        });
        if (cutLabels.length)
          findings.push({ kind: "clipped", component: name, detail: `${cutLabels.length} bar value label(s) are cut by the plot area (e.g. "${(cutLabels[0].textContent || "").trim()}"); set cliponaxis:false on the bar trace` });
      }
      const plotEl = el.querySelector(".js-plotly-plot");
      for (const trace of plotEl?.data ?? []) {
        if ((trace.type ?? "scatter") !== "bar" || !Array.isArray(trace.x))
          continue;
        const seen = /* @__PURE__ */ new Set();
        const dup = trace.x.map(String).find((v) => seen.has(v) ? true : (seen.add(v), false));
        if (dup !== void 0) {
          findings.push({ kind: "placeholder_text", component: name, detail: `category "${dup}" appears more than once in a bar trace, so its bars stack and read as one taller bar; aggregate the rows per category in the query` });
          break;
        }
      }
      if (dr && r.height > 120 && dr.height < r.height * 0.55)
        findings.push({ kind: "clipped", component: name, detail: `plot area is ${Math.round(dr.height)}px of a ${Math.round(r.height)}px chart (styles.padding is the Plotly margin on every side; set it to 16)` });
      const rawLabels = Array.from(el.querySelectorAll(".bartext")).filter((t) => /^\d{5,}(\.\d+)?$/.test((t.textContent || "").trim()));
      if (rawLabels.length)
        findings.push({ kind: "placeholder_text", component: name, detail: `bar value labels are unformatted numbers (e.g. "${(rawLabels[0].textContent || "").trim()}"); format them with toLocaleString and the unit` });
      const ticks = Array.from(el.querySelectorAll(".xaxislayer-above .xtick text, .xtick text"));
      const runOff = ticks.filter((t) => t.getBoundingClientRect().bottom > r.bottom - 2);
      if (runOff.length)
        findings.push({ kind: "clipped", component: name, detail: `${runOff.length} category label(s) run off the bottom of the chart (e.g. "${(runOff[0].textContent || "").trim().slice(0, 30)}"); shorten the categories or draw horizontal bars (orientation 'h')` });
    }
    if (!clippedHere && /^Table:/.test(name)) {
      const cut = [];
      for (const cell of Array.from(el.querySelectorAll('td, [role="cell"], .td'))) {
        const text2 = (cell.innerText || "").trim();
        if (!text2)
          continue;
        const cellRect = cell.getBoundingClientRect();
        const spill = Array.from(cell.querySelectorAll("*")).find((node) => {
          if (!(node.innerText || "").trim() || node.children.length > 0)
            return false;
          const nr = node.getBoundingClientRect();
          return nr.width > 0 && (nr.right > cellRect.right + 2 || nr.left < cellRect.left - 2);
        });
        if (spill) {
          cut.push(text2.slice(0, 24));
          if (cut.length >= 3)
            break;
          continue;
        }
        for (const node of [cell, ...Array.from(cell.querySelectorAll("*"))]) {
          const cs = getComputedStyle(node);
          if ((cs.overflow === "hidden" || cs.overflowX === "hidden") && cs.textOverflow !== "ellipsis" && node.scrollWidth > node.clientWidth + 4 && node.clientWidth > 20) {
            cut.push(text2.slice(0, 24));
            break;
          }
        }
        if (cut.length >= 3)
          break;
      }
      if (cut.length)
        findings.push({ kind: "clipped", component: name, detail: `${cut.length}+ cells cut mid value (e.g. "${cut[0]}"); widen the column with columnSize or shorten the value` });
      const rawHeaders = Array.from(el.querySelectorAll('th, [role="columnheader"], .th')).map((h) => (h.innerText || "").trim()).filter((text2) => /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(text2));
      if (rawHeaders.length)
        findings.push({ kind: "placeholder_text", component: name, detail: `${rawHeaders.length} column header(s) are raw field names (e.g. "${rawHeaders[0]}"); author the columns with readable names instead of letting ToolJet generate them` });
      const scroller = Array.from(el.querySelectorAll("*")).find((node) => node.scrollWidth > node.clientWidth + 12 && node.clientWidth > 200 && /table/i.test(node.className.toString()));
      if (scroller)
        findings.push({ kind: "clipped", component: name, detail: `columns overflow the table by ${scroller.scrollWidth - scroller.clientWidth}px to the right (the columnSize values exceed the table width); show fewer columns or shrink them` });
      const body = el.querySelector('.table-responsive, .tbody, tbody, [class*="table-body"]');
      const rows = body ? Array.from(body.querySelectorAll('tr, [role="row"], .tr')) : [];
      if (body && rows.length) {
        const bodyBottom = body.getBoundingClientRect().bottom;
        const sliced = rows.filter((row) => {
          const rr = row.getBoundingClientRect();
          return rr.top < bodyBottom - 4 && rr.bottom > bodyBottom + 6 && (row.innerText || "").trim().length > 0;
        });
        if (sliced.length)
          findings.push({ kind: "clipped", component: name, detail: `a row is sliced by the table's bottom edge; size the table to whole rows (header 40 + rows x row height + footer) or enable pagination` });
      }
    }
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (/^(ModalV2|ShadDialog):/.test(a.name) || /^(ModalV2|ShadDialog):/.test(b.name))
        continue;
      if (a.name.split(":")[1] === b.name.split(":")[1])
        continue;
      if (a.el.contains(b.el) || b.el.contains(a.el))
        continue;
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 8 && iy > 8)
        findings.push({ kind: "overlap", component: `${a.name} and ${b.name}`, detail: `${Math.round(ix)}x${Math.round(iy)}px shared; move one` });
    }
  }
  return { widgets: widgets.length, findings: findings.slice(0, 60) };
}
function codePageAuditScript(route, outside) {
  const frame = outside ? null : document.querySelector("iframe[data-tj-code-page-frame]");
  if (!outside && !frame)
    return null;
  const findings = [];
  const doc = outside ? document : frame.contentDocument;
  const width = outside ? outside.width : window.innerWidth;
  const host = outside ? outside : document.scrollingElement;
  if (host && host.scrollWidth > host.clientWidth + 1)
    findings.push({ kind: "overflow", component: "Code mode app", detail: `the page scrolls sideways at ${width}px (${host.scrollWidth}px wide)` });
  if (!doc || !doc.body) {
    findings.push({ kind: "empty_render", component: "Code mode app", detail: "the Code mode frame has no document" });
    return findings;
  }
  if (doc.querySelector('[data-cy^="code-screen-no-access"]')) {
    findings.push({
      kind: "unreachable",
      component: "Code mode app",
      reason: "screen_refused",
      detail: `ToolJet showed "You don't have access to this screen"${route ? ` for ${route}` : ""}: the check's signed-in user may not open it (a screen limit), so this screen was not checked. The refusal is ToolJet's, not the app's: change nothing for it`
    });
  }
  const root = doc.getElementById("tj-frame-root");
  const text = (root?.innerText ?? "").trim();
  if (!root || root.children.length === 0 || !text && !root.querySelector("svg,canvas,img")) {
    findings.push({ kind: "empty_render", component: "Code mode app", detail: "the Code mode app rendered nothing" });
    return findings;
  }
  const scroller = doc.scrollingElement;
  if (scroller && scroller.scrollWidth > scroller.clientWidth + 1)
    findings.push({ kind: "overflow", component: "Code mode app", detail: `the app scrolls sideways at ${width}px (${scroller.scrollWidth}px of content in ${scroller.clientWidth}px)` });
  const below = outside ? outside.below : frame.getBoundingClientRect().bottom - window.innerHeight;
  if (below > 1)
    findings.push({ kind: "clipped", component: "Code mode app", detail: `the app runs ${Math.round(below)}px below the window` });
  const describe = (el) => {
    const id = el.getAttribute("data-testid") || el.id;
    const label = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${el.tagName.toLowerCase()}${id ? `#${id}` : ""}${label ? ` "${label}"` : ""}`;
  };
  const win = doc.defaultView;
  const insideScroller = (el) => {
    for (let a = el.parentElement; a && a !== doc.body; a = a.parentElement) {
      const ox = win.getComputedStyle(a).overflowX;
      if (ox === "auto" || ox === "scroll")
        return true;
    }
    return false;
  };
  const cut = [];
  const frameWidth = doc.documentElement.clientWidth;
  for (const el of Array.from(doc.querySelectorAll("#tj-frame-root *"))) {
    if (cut.length >= 3)
      break;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.right <= frameWidth + 1)
      continue;
    if (!insideScroller(el))
      cut.push(describe(el));
  }
  if (cut.length)
    findings.push({ kind: "clipped", component: "Code mode app", detail: `cut off at the right edge at ${width}px: ${cut.join(", ")}` });
  const spills = (el) => {
    const h = el;
    if (!(h.clientWidth >= 8) || h.scrollWidth <= h.clientWidth + 4)
      return false;
    const cs = win.getComputedStyle(h);
    if (cs.display === "inline" || cs.overflowX === "auto" || cs.overflowX === "scroll" || cs.textOverflow === "ellipsis")
      return false;
    return !insideScroller(h);
  };
  const spilled = Array.from(doc.querySelectorAll("#tj-frame-root *")).filter(spills);
  const innermost = spilled.filter((el) => !spilled.some((other) => other !== el && el.contains(other)));
  const spillLines = innermost.slice(0, 3).map((el) => {
    const h = el;
    const cs = win.getComputedStyle(h);
    const widest = Array.from(h.children).reduce((best, c) => !best || c.getBoundingClientRect().width > best.getBoundingClientRect().width ? c : best, null);
    const tracks = cs.display === "grid" && cs.gridTemplateColumns !== "none" ? `, its grid columns (${cs.gridTemplateColumns}) are wider than the box` : "";
    const what = widest && widest.getBoundingClientRect().width > h.clientWidth + 4 ? `${describe(widest)} (${Math.round(widest.getBoundingClientRect().width)}px)` : `content ${h.scrollWidth}px wide`;
    const clips = cs.overflowX === "hidden" || cs.overflowX === "clip" ? " and is cut off" : " and spills out";
    return `${what} in ${describe(h)} (${h.clientWidth}px)${tracks}${clips}`;
  });
  if (spillLines.length)
    findings.push({ kind: "overflow", component: "Code mode app", detail: `content wider than its box${route ? ` on ${route}` : ""} at ${width}px: ${spillLines.join("; ")}. Let it wrap or shrink (min-w-0, flexible columns, fewer fixed widths), or put it in an overflow-x-auto wrapper` });
  const placeholder = text.match(/\b(undefined|NaN|Invalid date|\[object Object\])\b/);
  if (placeholder)
    findings.push({ kind: "placeholder_text", component: "Code mode app", detail: `the app shows "${placeholder[1]}"` });
  return findings;
}
async function loadPlaywright() {
  const explicit = process.env.MCP_RENDER_AUDIT_PLAYWRIGHT;
  if (explicit) {
    try {
      const { pathToFileURL } = await import("node:url");
      const { createRequire: createRequire2 } = await import("node:module");
      const req = createRequire2(pathToFileURL(explicit.replace(/\/?$/, "/")).href);
      return req(explicit);
    } catch {
    }
  }
  try {
    const specifier = "playwright-core";
    return await import(specifier);
  } catch {
    return null;
  }
}
var STATIC_RESOURCES = /* @__PURE__ */ new Set(["script", "stylesheet", "image", "font"]);
var socketHttpUrl = (url) => url.replace(/^ws(s?):/i, "http$1:");
var INFORMATIONAL_KINDS = /* @__PURE__ */ new Set(["blocked_socket", "blocked_query"]);
var pathOf = (url) => {
  try {
    return new URL(url).pathname;
  } catch {
    return "?";
  }
};
function trackNetwork(page) {
  if (typeof page?.on !== "function")
    return void 0;
  const tracker = { inflight: /* @__PURE__ */ new Map(), lastActivity: Date.now() };
  const done = (request2) => {
    tracker.inflight.delete(request2);
    tracker.lastActivity = Date.now();
  };
  page.on("request", (request2) => {
    if (STREAM_PATHS.test(pathOf(String(request2?.url?.() ?? ""))))
      return;
    tracker.inflight.set(request2, Date.now());
    tracker.lastActivity = Date.now();
  });
  page.on("requestfinished", done);
  page.on("requestfailed", done);
  return tracker;
}
var CODE_QUIET_MS = Number(process.env.MCP_RENDER_AUDIT_QUIET_MS || 750);
var CODE_MIN_SETTLE_MS = 750;
var LONG_REQUEST_MS = 3e3;
var STREAM_PATHS = /\/api\/code-page-security$/;
function codeFrameDrawn() {
  const frame = document.querySelector("iframe[data-tj-code-page-frame]");
  if (frame?.hasAttribute("data-tj-code-page-isolated"))
    return true;
  const root = frame?.contentDocument?.getElementById("tj-frame-root");
  return !!root && root.children.length > 0;
}
async function isolatedFrame(page) {
  const handle = await page.$("iframe[data-tj-code-page-frame][data-tj-code-page-isolated]");
  return await handle?.contentFrame() ?? null;
}
async function waitForIsolatedFrame(page, untilMs) {
  while (Date.now() < untilMs) {
    const frame = await isolatedFrame(page).catch(() => null);
    if (!frame)
      return;
    const drawn = await frame.evaluate(() => {
      const root = document.getElementById("tj-frame-root");
      return !!root && root.children.length > 0;
    }).catch(() => false);
    if (drawn)
      return;
    await page.waitForTimeout(100);
  }
}
async function auditCodePage(page, route) {
  const frame = await isolatedFrame(page);
  if (!frame)
    return page.evaluate(codePageAuditScript, route);
  const outside = await page.evaluate(() => {
    const el = document.querySelector("iframe[data-tj-code-page-frame]");
    const host = document.scrollingElement;
    return {
      width: window.innerWidth,
      scrollWidth: host?.scrollWidth ?? 0,
      clientWidth: host?.clientWidth ?? 0,
      below: el.getBoundingClientRect().bottom - window.innerHeight
    };
  });
  return frame.evaluate(`(${codePageAuditScript.toString()})(${route ? JSON.stringify(route) : "undefined"}, ${JSON.stringify(outside)})`);
}
async function settleWhenQuiet(page, tracker, maxMs) {
  const started = Date.now();
  await page.waitForTimeout(Math.min(CODE_MIN_SETTLE_MS, maxMs));
  while (Date.now() - started < maxMs) {
    const now = Date.now();
    const loading = [...tracker.inflight.values()].some((since) => now - since < LONG_REQUEST_MS);
    if (!loading && now - tracker.lastActivity >= CODE_QUIET_MS && await page.evaluate(codeFrameDrawn).catch(() => true) !== false)
      return;
    await page.waitForTimeout(100);
  }
}
async function auditPages(pages, options = {}, driver = loadPlaywright) {
  const unreachable = (p, reason, detail) => ({ ...p, widgets: 0, findings: [{ kind: "unreachable", component: "-", reason, detail }] });
  if (!pages.length)
    return [];
  const origins = options.allowedOrigins ?? renderAuditOrigins(pages[0].url);
  if (pages.some((p) => !renderAuditUrlAllowed(p.url, origins))) {
    return pages.map((p) => unreachable(p, "blocked_destination", "The requested viewer is outside the configured render-audit origins"));
  }
  const pw = await driver();
  if (!pw) {
    return pages.map((p) => unreachable(p, "browser_unavailable", "playwright-core is not installed on the MCP host; the render audit cannot run"));
  }
  const proxies = [];
  const proxyFor = async (onBlocked) => {
    const proxy = await startEgressProxy(origins, onBlocked, { privateOrigins: options.privateOrigins ?? renderAuditPrivateOrigins(pages[0].url) });
    proxies.push(proxy);
    return { server: proxy.server, bypass: "<-loopback>" };
  };
  const closeProxies = () => Promise.all(proxies.splice(0).map((proxy) => proxy.close().catch(() => {
  })));
  const logged = /* @__PURE__ */ new Set();
  const logUnattributed = (destination) => {
    if (logged.has(destination))
      return;
    logged.add(destination);
    console.error(`tooljet-mcp: render check refused a connection the page did not make (${destination}); not reported as a finding`);
  };
  const launch = {
    headless: true,
    chromiumSandbox: true,
    args: ["--force-webrtc-ip-handling-policy=disable_non_proxied_udp", "--disable-sync", "--no-pings", "--disable-domain-reliability"]
  };
  if (options.executablePath)
    launch.executablePath = options.executablePath;
  else
    launch.channel = options.channel ?? "chrome";
  let browser;
  try {
    launch.proxy = await proxyFor(logUnattributed);
    browser = await pw.chromium.launch(launch);
  } catch {
    await closeProxies();
    return pages.map((p) => unreachable(p, "browser_unavailable", "Chrome could not start on the MCP host; check the configured executable/channel"));
  }
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 4, pages.length || 1));
  const reports = new Array(pages.length);
  const auditOne = async (index) => {
    const p = pages[index];
    let ctx;
    let blocked;
    const blocks = [];
    const blockFindings = [];
    const block = (finding, where) => {
      blocked ??= finding;
      const line = `${finding.reason}: ${where}`;
      if (blocks.length < 4 && !blocks.includes(line))
        blocks.push(line);
      if (blockFindings.length < 4 && !blockFindings.some((f) => f.reason === finding.reason && f.detail === finding.detail))
        blockFindings.push(finding);
    };
    const proxyBlocks = /* @__PURE__ */ new Set();
    const pageConnections = /* @__PURE__ */ new Set();
    const attributeProxyBlocks = () => {
      for (const destination of proxyBlocks) {
        if (pageConnections.has(destination)) {
          block({
            kind: "unreachable",
            component: "-",
            reason: "redirect_blocked",
            detail: "A redirect or connection to a destination outside the configured audit origins was blocked"
          }, `connection to ${destination}`);
        } else
          logUnattributed(destination);
      }
      proxyBlocks.clear();
    };
    try {
      const width = options.viewportWidth ?? 1600;
      const proxy = await proxyFor((destination) => proxyBlocks.add(destination));
      ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 812 : 900 }, serviceWorkers: "block", proxy });
      ctx.on?.("request", (request2) => {
        const key = connectionKey(String(request2.url?.() ?? ""));
        if (key)
          pageConnections.add(key);
      });
      if (!ctx.routeWebSocket) {
        reports[index] = unreachable(p, "browser_unavailable", "The render audit requires Playwright 1.48+ for WebSocket interception");
        return;
      }
      if (options.session) {
        if (typeof options.session === "string") {
          const origin = new URL(p.url).origin;
          await ctx.addCookies([{
            name: "tj_auth_token",
            value: options.session,
            url: origin,
            httpOnly: true,
            secure: origin.startsWith("https:"),
            sameSite: "Lax"
          }]);
        } else {
          if (new URL(p.url).origin !== options.session.origin || options.session.expiresAt <= Date.now() / 1e3) {
            reports[index] = unreachable(p, "auth_required", "The scoped viewer credential does not authorize this page origin or has expired");
            return;
          }
          await ctx.addCookies([{
            name: "tj_oauth_viewer",
            value: options.session.token,
            url: options.session.origin,
            httpOnly: true,
            secure: options.session.origin.startsWith("https:"),
            sameSite: "Lax",
            expires: options.session.expiresAt
          }]);
        }
      }
      await ctx.routeWebSocket("**/*", (socket) => {
        const url = String(socket.url?.() ?? "");
        if (renderAuditUrlAllowed(socketHttpUrl(url), origins)) {
          socket.connectToServer();
          return;
        }
        block({ kind: "blocked_socket", component: "-", reason: "blocked_destination", detail: "A WebSocket to a destination outside the audit origins was blocked; its live behavior was not verified" }, `WebSocket ${(() => {
          try {
            return new URL(url).host;
          } catch {
            return "?";
          }
        })()}`);
        socket.close();
      });
      await ctx.route("**/*", async (route) => {
        const request2 = route.request();
        const url = request2.url();
        if (!renderAuditUrlAllowed(url, origins)) {
          block({ kind: "unreachable", component: "-", reason: "blocked_destination", detail: "A navigation or resource outside the configured audit origins was blocked" }, `${request2.method()} ${new URL(url).origin}`);
          await route.abort();
          return;
        }
        try {
          const policy = renderAuditRequest(url, request2.method(), options.savedQueries);
          if (!policy.allowed) {
            block({
              kind: "blocked_query",
              component: "-",
              reason: "blocked_execution",
              detail: `${policy.detail} (${request2.method()} ${pathOf(url)})`
            }, `${request2.method()} ${pathOf(url)}`);
            await route.abort();
            return;
          }
          if (request2.method() === "GET" && STATIC_RESOURCES.has(request2.resourceType?.())) {
            await route.continue();
            return;
          }
          const response2 = await route.fetch({
            maxRedirects: 0,
            maxRetries: 0,
            timeout: 3e4,
            ...policy.postData === void 0 ? {} : { postData: policy.postData }
          });
          try {
            if (response2.status() >= 300 && response2.status() < 400 && response2.headers().location) {
              const dest = new URL(response2.headers().location, url);
              const signIn = renderAuditUrlAllowed(dest.href, origins) && /\/(?:login|sign-in|signin)\b/i.test(dest.pathname);
              block({
                kind: "unreachable",
                component: "-",
                reason: signIn ? "auth_required" : "redirect_blocked",
                detail: signIn ? "The viewer requires sign-in; private app rendering was not verified" : "An HTTP redirect was blocked. Configure the canonical viewer/resource URL and its trusted origin"
              }, `${request2.method()} ${pathOf(url)} redirected`);
              await route.abort();
            } else
              await route.fulfill({ response: response2 });
          } finally {
            await response2.dispose();
          }
        } catch {
          block({ kind: "unreachable", component: "-", reason: "navigation_failed", detail: "A viewer resource could not be loaded; the audit is incomplete" }, `${request2.method()} ${pathOf(url)}`);
          await route.abort().catch(() => {
          });
        }
      });
      const page = await ctx.newPage();
      const network = trackNetwork(page);
      const response = await page.goto(p.url, { waitUntil: "domcontentloaded", timeout: 6e4 });
      if (response && response.status() >= 400) {
        const status = response.status();
        reports[index] = unreachable(p, [401, 403].includes(status) ? "auth_required" : "navigation_failed", "Viewer returned HTTP " + status);
        return;
      }
      const contentWaitMs = options.contentWaitMs ?? Number(process.env.MCP_RENDER_AUDIT_CONTENT_WAIT_MS || 3e4);
      const waitStarted = Date.now();
      await page.waitForFunction(() => {
        if (!document.querySelector('[data-cy^="draggable-widget-"]'))
          return false;
        const frame = document.querySelector("iframe[data-tj-code-page-frame]");
        if (!frame || frame.hasAttribute("data-tj-code-page-isolated"))
          return true;
        const root = frame.contentDocument?.getElementById("tj-frame-root");
        return !!root && root.children.length > 0;
      }, void 0, { timeout: contentWaitMs }).catch(() => void 0);
      await waitForIsolatedFrame(page, waitStarted + contentWaitMs);
      const codeFrame = network ? options.codePage || await page.evaluate(() => !!document.querySelector("iframe[data-tj-code-page-frame]")).catch(() => false) : false;
      if (codeFrame === true) {
        await settleWhenQuiet(page, network, options.settleMs ?? 6e3);
      } else {
        await page.waitForTimeout(options.settleMs ?? 6e3);
        await page.waitForFunction(() => {
          const charts = document.querySelectorAll('[data-cy^="draggable-widget-"]._tooljet-Chart').length;
          const plots = document.querySelectorAll('[data-cy^="draggable-widget-"]._tooljet-Chart .js-plotly-plot').length;
          return charts === 0 || plots >= charts;
        }, void 0, { timeout: options.chartWaitMs ?? 2e4 }).catch(() => void 0);
        await page.waitForTimeout(1500);
      }
      attributeProxyBlocks();
      const landed = page.url();
      if (/\/(?:login|sign-in|signin)\b/i.test(new URL(landed).pathname)) {
        reports[index] = unreachable(p, "auth_required", "The viewer requires sign-in; private app rendering was not verified");
        return;
      }
      const result = await page.evaluate(auditScript);
      const codePage = await auditCodePage(page, new URL(p.url).searchParams.get("route") || void 0);
      if (Array.isArray(codePage)) {
        const accessibility = await axeInCodePage(page).catch(() => void 0);
        let screenshot;
        try {
          const dir = screenshotDir();
          mkdirSync(dir, { recursive: true });
          const route = new URL(p.url).searchParams.get("route") || "/";
          const app = /\/applications\/([^/?]+)/.exec(new URL(p.url).pathname)?.[1]?.slice(0, 8) ?? "app";
          const slug = `${app}-${p.page}${route.replace(/[^A-Za-z0-9]+/g, "-")}`.replace(/-+$/, "");
          screenshot = join(dir, `${slug}-${options.viewportWidth ?? 1600}.png`);
          await page.screenshot({ path: screenshot, fullPage: false });
        } catch {
          screenshot = void 0;
        }
        reports[index] = {
          page: p.page,
          url: p.url,
          widgets: result.widgets,
          findings: [...codePage, ...blockFindings],
          ...accessibility ? { accessibility } : {},
          ...screenshot ? { screenshot } : {}
        };
        return;
      }
      reports[index] = result.widgets === 0 && blocked ? { page: p.page, url: p.url, widgets: 0, findings: [{ ...blocked, kind: "unreachable", detail: `${blocked.detail}; the page then showed no widgets. Blocked: ${blocks.join("; ")}` }] } : result.widgets === 0 ? unreachable(p, "no_widgets", "No ToolJet widgets were found; the page may be empty, unauthenticated, or not loaded") : { page: p.page, url: p.url, widgets: result.widgets, findings: [...result.findings, ...blockFindings] };
    } catch (err) {
      attributeProxyBlocks();
      const why = String(err?.message ?? err).split("\n")[0].slice(0, 200);
      reports[index] = blocked ? { ...p, widgets: 0, findings: [{ ...blocked, kind: "unreachable", detail: `${blocked.detail}; the audit then stopped: ${why}. Blocked: ${blocks.join("; ")}` }] } : unreachable(p, "navigation_failed", `Could not load or inspect the viewer page: ${why}`);
    } finally {
      await ctx?.close().catch(() => {
      });
    }
  };
  try {
    let next = 0;
    const workers = Array.from({ length: concurrency }, async () => {
      while (next < pages.length) {
        const index = next++;
        await auditOne(index);
      }
    });
    await Promise.all(workers);
  } finally {
    await browser.close();
    await closeProxies();
  }
  return reports;
}
function verifyPageRenderTool(client, viewerBase, driver = loadPlaywright) {
  return {
    name: "verify_page_render",
    title: "Verify Page Render",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    description: 'Render audit of one page or every page of an app in a headless browser (1600x900 unless viewport_width is set; 1280 with route), after the app is built. On an app in Code mode it checks inside the app: sideways scrolling, content cut off at the right edge, an empty app and placeholder text; pass route to open one route of it and viewport_width (375, 768, 1280) to check each width. An app in Code mode also gets an axe-core accessibility run (WCAG 2 A/AA; `accessibility` lists violations by impact) and a screenshot path. Reports what lint cannot see: Html/Text widgets that render empty (a multi-line binding, a broken expression), placeholder text a customer would read as a bug ("undefined", "NaN", "Invalid date", "Tab 1", "Select..", a literal \\n), text clipped inside its box, and components overlapping each other. Run it once per page before the handoff and review every finding; report unverified behavior explicitly. Opens the version being edited with the builder\'s ToolJet session, or a separate app-scoped OAuth viewer credential (limited to the viewer origin), so a private app is audited without being made public. Only saved, static, bounded read queries may run; writes, dynamic queries and queries requiring confirmation are blocked and reported as unverified. WebSockets to the ToolJet origin pass; any other WebSocket is closed and reported as a `blocked_socket` finding, which does not make `ok` false. Returns { pages: [{ page, url, widgets, findings: [{ kind, component, detail }] }], ok }.',
    inputSchema: {
      app_id: external_exports.string().regex(/^[A-Za-z0-9_-]+$/),
      page_handle: external_exports.string().optional().describe("one page handle; omit to audit every page"),
      viewer_url: external_exports.string().optional().describe("canonical viewer base URL; alternate origins require host configuration in MCP_RENDER_AUDIT_ALLOWED_ORIGINS"),
      viewport_width: external_exports.number().int().min(320).max(2560).optional().describe("window width in px; default 1280 with route, else 1600"),
      route: external_exports.string().regex(/^\/[A-Za-z0-9_\-\/:.]*$/).optional().describe("a Code mode route path to open, such as /orders/36")
    },
    async handler(args) {
      const release = await waitForRenderAudit(client.renderAuditGrant);
      if (!release)
        return fail(new Error("Render verification is busy; rendering remains unverified. Retry shortly."));
      try {
        if (!/^[A-Za-z0-9_-]+$/.test(args.app_id))
          return fail(new Error("Invalid app id"));
        const { base, origins } = renderAuditBase(viewerBase(), args.viewer_url);
        if (client.browserRenderOrigin && new URL(base).origin !== client.browserRenderOrigin) {
          return fail(new Error("OAuth render verification must use the configured ToolJet deployment origin"));
        }
        const summary = await client.getAppSummary(args.app_id);
        const allPages = summary.pages ?? [];
        const visible = allPages.filter((p) => p.hidden !== true && p.hidden?.value !== true && p.hidden?.value !== "{{true}}");
        const pages = args.route && !args.page_handle ? (visible.length ? visible : allPages).slice(0, 1) : allPages;
        const version = await client.editingVersionName?.(args.app_id).catch(() => void 0);
        const query = new URLSearchParams();
        if (version) {
          query.set("env", "development");
          query.set("version", version);
        }
        if (args.route)
          query.set("route", args.route);
        const preview = query.toString() ? `?${query}` : "";
        const targets = pages.filter((p) => !args.page_handle || p.handle === args.page_handle).map((p) => ({ page: p.handle ?? p.name ?? "home", url: `${base}/applications/${args.app_id}/${encodeURIComponent(p.handle ?? "home")}${preview}` }));
        if (!targets.length)
          return fail(new Error(`no page ${args.page_handle ?? ""} in app ${args.app_id}`));
        if (summary.queries?.length) {
          if (!summary.version_id)
            return fail(new Error("Cannot verify datasource eligibility without an app version."));
          if (summary.queries.some((query2) => !query2.data_source_id)) {
            return fail(new Error("Cannot verify an app query datasource; refusing browser verification."));
          }
          await client.listDatasources(summary.version_id);
          await Promise.all([...new Set(summary.queries.map((query2) => query2.data_source_id))].map((id) => client.assertDatasourceAllowed(id, summary.version_id)));
        }
        const options = {
          channel: process.env.MCP_RENDER_AUDIT_CHANNEL || "chrome",
          executablePath: process.env.MCP_RENDER_AUDIT_CHROME || void 0,
          allowedOrigins: origins,
          privateOrigins: renderAuditPrivateOrigins(viewerBase()),
          savedQueries: summary,
          viewportWidth: args.viewport_width ?? (args.route ? 1280 : void 0),
          codePage: Boolean(args.route),
          // MCP_RENDER_AUDIT_SESSION=off keeps the browser unauthenticated (private apps are then reported unverified).
          session: process.env.MCP_RENDER_AUDIT_SESSION === "off" ? void 0 : client.browserRenderOrigin ? await client.viewerSession?.(args.app_id) : await client.viewerSession?.(args.app_id).catch(() => void 0)
        };
        const reports = await auditPages(targets, options, driver);
        const total = reports.reduce((n, r) => n + r.findings.filter((f) => !INFORMATIONAL_KINDS.has(f.kind)).length, 0);
        const axeCount = reports.reduce((n, r) => n + (r.accessibility?.length ?? 0), 0);
        return ok({ pages: reports, ok: total === 0, findings: total, ...reports.some((r) => r.accessibility) ? { accessibility_violations: axeCount } : {} });
      } catch (err) {
        return fail(err);
      } finally {
        release();
      }
    }
  };
}
export {
  NOT_CHECKED_AUTOMATICALLY as N,
  autoReadPreflight as a,
  datasourceMetadataTools as d,
  inspectDatasourceSchemaTool as i,
  listWorkspaceGroupsTool as l,
  manageWorkspaceGroupsTool as m,
  verifyPageRenderTool as v,
  workspaceGroupActionTools as w
};
