import { z } from 'zod';
import { WORKSPACE_PERMISSION_KEYS, WORKSPACE_ACCESS_KEYS, workspaceAccessKeys, type ToolJetClient } from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

export function listWorkspaceGroupsTool(client: ToolJetClient): ToolDef {
  const schema = z.object({ group_id: z.string().uuid().optional(), include_permissions: z.boolean().optional(),
    resource_type: z.enum(['app', 'module', 'workflow', 'data_source']).optional() }).strict();
  return {
    name: 'list_workspace_groups',
    title: 'List Workspace Groups',
    annotations: { readOnlyHint: true, openWorldHint: true },
    description:
      'List groups in the current PAT-pinned workspace. Supply group_id to list its non-archived members ' +
      'with group_user_id (membership id, distinct from user_id and organization_user_id). ' +
      'Use include_permissions:true with group_id to read permission switches and granular access rules. ' +
      'Use resource_type (app/module/workflow/data_source) to discover selectable resources and their names/IDs. ' +
      'Use exact returned ids for group changes. Requires ToolJet admin permissions.',
    inputSchema: schema.shape,
    async handler(input) {
      try {
        const args = schema.parse(input);
        if (args.include_permissions && !args.group_id) throw new Error('group_id is required with include_permissions.');
        const resources = args.resource_type ? { resources: await client.listWorkspaceGroupResources(args.resource_type) } : {};
        if (!args.group_id) return ok({ ...(args.resource_type ? {} : { groups: await client.listWorkspaceGroups() }), ...resources });
        const group = await client.getWorkspaceGroup(args.group_id);
        return ok({ group, members: await client.listWorkspaceGroupMembers(args.group_id), ...resources,
          ...(args.include_permissions ? { access_rules: await client.listWorkspaceGroupAccess(args.group_id) } : {}) });
      } catch (error) {
        return fail(error);
      }
    },
  };
}

export function manageWorkspaceGroupsTool(client: ToolJetClient): ToolDef {
  const schema = z.object({
    action: z.enum(['create', 'rename', 'delete', 'remove_member', 'duplicate', 'update_permissions', 'create_access', 'update_access', 'delete_access']),
    group_id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(50).optional(),
    group_user_id: z.string().uuid().optional(),
    confirm: z.boolean().optional(),
    permissions: z.object(Object.fromEntries(WORKSPACE_PERMISSION_KEYS.map(key => [key, z.boolean().optional()]))).strict().optional(),
    copy: z.object({ permissions: z.boolean().optional(), members: z.boolean().optional(), apps: z.boolean().optional(),
      modules: z.boolean().optional(), workflows: z.boolean().optional(), data_sources: z.boolean().optional() }).strict().optional(),
    rule_id: z.string().uuid().optional(),
    resource_type: z.enum(['app', 'module', 'workflow', 'data_source']).optional(),
    access: z.object({ name: z.string().trim().min(1).max(255).optional(), is_all: z.boolean().optional(),
      actions: z.object(Object.fromEntries(WORKSPACE_ACCESS_KEYS.map(key => [key, z.boolean().optional()]))).strict().optional(),
      resource_ids: z.array(z.string().uuid()).max(1000).optional() }).strict().optional(),
    allow_role_change: z.boolean().optional(),
  }).strict();
  return {
    name: 'manage_workspace_groups',
    title: 'Manage Workspace Groups',
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    description:
      'Create, rename, delete custom groups or remove a member in the current PAT-pinned workspace. ' +
      'All actions require confirm:true after reviewing the exact change. create needs name; rename needs ' +
      'group_id and name; delete needs group_id; remove_member needs group_id and group_user_id from ' +
      'list_workspace_groups. Removing membership does not delete the workspace user. Deleting a group ' +
      'removes its memberships and permissions. ' +
      'duplicate needs group_id and at least one true copy flag (permissions/members/apps/modules/workflows/data_sources; omitted flags false); ' +
      'ToolJet assigns the copy name. update_permissions needs group_id and permissions (only supplied switches change). ' +
      'create_access needs group_id, resource_type and access {name,is_all,actions,resource_ids}; ' +
      'update_access needs group_id, rule_id and access (only supplied fields change); delete_access needs group_id and rule_id. ' +
      'For update/delete access, optional resource_type must match the existing rule. Read include_permissions:true first to resolve rule IDs; resource_type discovers selectable resource IDs. ' +
      'access.resource_ids replaces the rule selection; is_all:true applies to ALL current and future resources of its type. ' +
      'On create_access, omitted action switches are disabled. App actions: canEdit/canView/hideFromDashboard/canAccessDevelopment/canAccessStaging/canAccessProduction/canAccessReleased. ' +
      'Module actions: canEdit/canView/hideFromDashboard. Workflow actions: canEdit/canView. Data source actions: canConfigure/canUse. ' +
      'canEdit/canView and canConfigure/canUse are exclusive pairs: enabling one disables the other, including on partial updates. ' +
      'Disabled groups and read_only rules are not editable under the current license/plan. ' +
      'allow_role_change is only for permission updates and access updates, and only with explicit consent to change affected member roles. ' +
      'Admin permissions cannot be changed; default group names/memberships cannot be changed here. ' +
      'To add members use manage_workspace_users with group_ids. ToolJet admin and license checks apply.',
    inputSchema: schema.shape,
    async handler(input) {
      try {
        const args = schema.parse(input);
        if (args.confirm !== true) throw new Error(`${args.action} requires confirm:true after reviewing the exact change.`);
        const needsName = args.action === 'create' || args.action === 'rename';
        if (needsName !== (args.name !== undefined)) throw new Error(needsName ? 'name is required.' : 'name must be omitted.');
        if ((args.action !== 'create') !== (args.group_id !== undefined)) {
          throw new Error(args.action === 'create' ? 'group_id must be omitted for create.' : 'group_id is required.');
        }
        if ((args.action === 'remove_member') !== (args.group_user_id !== undefined)) {
          throw new Error(args.action === 'remove_member' ? 'group_user_id is required.' : 'group_user_id must be omitted.');
        }
        const expected: Record<string, string[]> = {
          duplicate: ['copy'], update_permissions: ['permissions', 'allow_role_change'],
          create_access: ['resource_type', 'access'], update_access: ['rule_id', 'access', 'allow_role_change', 'resource_type'],
          delete_access: ['rule_id', 'resource_type'],
        };
        for (const key of ['copy', 'permissions', 'resource_type', 'access', 'rule_id', 'allow_role_change'] as const) {
          if (args[key] !== undefined && !expected[args.action]?.includes(key)) throw new Error(`${key} must be omitted for ${args.action}.`);
        }
        for (const key of expected[args.action] ?? []) {
          if (key !== 'allow_role_change' && !(key === 'resource_type' && args.action !== 'create_access') && args[key as keyof typeof args] === undefined) throw new Error(`${key} is required.`);
        }
        if (args.permissions && !Object.keys(args.permissions).length) throw new Error('permissions must contain at least one switch.');
        if (args.access && !Object.keys(args.access).length) throw new Error('access must contain at least one change.');
        if (args.action === 'create') return ok({ group: await client.createWorkspaceGroup(args.name!) });

        // Read through the workspace-scoped endpoint before every mutation; never act on a guessed id.
        const group = await client.getWorkspaceGroup(args.group_id!);
        if (group.disabled === true) throw new Error(`Group "${group.name}" is read-only under the current license/plan.`);
        const permissionAction = ['update_permissions', 'create_access', 'update_access', 'delete_access'].includes(args.action);
        if (group.type !== 'custom' && args.action !== 'duplicate' && !(permissionAction && group.name !== 'admin')) {
          throw new Error('Only custom groups can be changed with this tool.');
        }
        if (args.action === 'duplicate') {
          const copy = args.copy!;
          if (!Object.values(copy).some(value => value === true)) throw new Error('Select at least one category to duplicate.');
          return ok({ group: await client.duplicateWorkspaceGroup(group.id, { addPermission: copy.permissions ?? false,
            addUsers: copy.members ?? false, addApps: copy.apps ?? false, addModules: copy.modules ?? false,
            addWorkflows: copy.workflows ?? false, addDataSource: copy.data_sources ?? false }) });
        }
        if (args.action === 'update_permissions') {
          await client.updateWorkspaceGroupPermissions(group.id, args.permissions as Record<string, boolean>, args.allow_role_change);
          return ok({ group: await client.getWorkspaceGroup(group.id), updated: true });
        }
        if (['create_access', 'update_access', 'delete_access'].includes(args.action)) {
          const rules = await client.listWorkspaceGroupAccess(group.id);
          const rule = args.rule_id ? rules.find(item => item.id === args.rule_id) : undefined;
          if (args.rule_id && !rule) throw new Error('Access rule not found in this group. Read include_permissions:true again.');
          if (rule?.read_only) throw new Error(rule.read_only_reason || 'This access rule is read-only under the current license/plan.');
          if (rule && args.resource_type && args.resource_type !== rule.type) throw new Error('resource_type does not match this access rule.');
          const type = (rule?.type ?? args.resource_type)!;
          if (args.action === 'delete_access') {
            await client.writeWorkspaceGroupAccess('DELETE', group.id, type, rule!.id);
            return ok({ group_id: group.id, name: group.name, rule_id: rule!.id, rule_name: rule!.name, deleted: true });
          }
          const access = args.access!;
          const creating = args.action === 'create_access';
          if (creating && (!access.name || access.is_all === undefined || !access.actions)) {
            throw new Error('create_access requires access.name, is_all and actions.');
          }
          const actionKeys = workspaceAccessKeys(type);
          if (access.actions && (!Object.keys(access.actions).length || Object.keys(access.actions).some(key => !actionKeys.includes(key)))) {
            throw new Error(`Invalid actions for ${type}. Use ${actionKeys.join(', ')}.`);
          }
          const all = access.is_all ?? rule!.is_all;
          const selected = access.resource_ids ?? (all ? [] : rule?.resources.map(item => item.id) ?? []);
          if (new Set(selected).size !== selected.length || (all && selected.length) || (!all && !selected.length)) {
            throw new Error('Use unique resource_ids for a selected-resource rule; omit them or use [] for is_all:true.');
          }
          if (access.resource_ids || creating || (rule?.is_all && !all)) {
            const available = await client.listWorkspaceGroupResources(type);
            if (selected.some(id => !available.some(item => item.id === id))) throw new Error('Resource not found in this workspace/resource type.');
          }
          const resourceKey = type === 'data_source' ? 'dataSourceId' : 'appId';
          const actions = { ...(creating ? Object.fromEntries(actionKeys.map(key => [key, false])) : rule!.actions), ...access.actions };
          const [primary, secondary] = type === 'data_source' ? ['canConfigure', 'canUse'] : ['canEdit', 'canView'];
          if (access.actions?.[primary] === true && access.actions?.[secondary] === undefined) actions[secondary] = false;
          if (access.actions?.[secondary] === true && access.actions?.[primary] === undefined) actions[primary] = false;
          if (actions[primary] && actions[secondary]) throw new Error(`${primary} and ${secondary} cannot both be enabled.`);
          if (creating) {
            await client.writeWorkspaceGroupAccess('POST', group.id, type, undefined, { name: access.name, type,
              groupId: group.id, isAll: all, createResourcePermissionObject: {
                ...(type === 'data_source' ? { action: actions } : actions),
                resourcesToAdd: selected.map(id => ({ [resourceKey]: id })),
              } });
          } else {
            const current = rule!.resources;
            await client.writeWorkspaceGroupAccess('PUT', group.id, type, rule!.id, {
              ...(access.name !== undefined ? { name: access.name } : {}), isAll: all, actions,
              resourcesToAdd: selected.filter(id => !current.some(item => item.id === id)).map(id => ({ [resourceKey]: id })),
              resourcesToDelete: current.filter(item => !selected.includes(item.id)).map(item => ({ id: item.membership_id })),
              allowRoleChange: args.allow_role_change ?? false,
            });
          }
          return ok({ group_id: group.id, name: group.name, access_rules: await client.listWorkspaceGroupAccess(group.id) });
        }
        if (args.action === 'rename') {
          await client.renameWorkspaceGroup(group.id, args.name!);
          return ok({ group_id: group.id, name: args.name, renamed: true });
        }
        if (args.action === 'delete') {
          await client.deleteWorkspaceGroup(group.id);
          return ok({ group_id: group.id, name: group.name, deleted: true });
        }
        const members = await client.listWorkspaceGroupMembers(group.id);
        if (!members.some((member) => member.group_user_id === args.group_user_id)) {
          throw new Error('Membership not found in this group. Use list_workspace_groups with group_id for current member ids.');
        }
        await client.removeWorkspaceGroupMember(args.group_user_id!);
        return ok({ group_id: group.id, group_user_id: args.group_user_id, removed: true });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
