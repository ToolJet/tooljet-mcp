import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

export function listWorkspaceGroupsTool(client: ToolJetClient): ToolDef {
  const schema = z.object({ group_id: z.string().uuid().optional() }).strict();
  return {
    name: 'list_workspace_groups',
    title: 'List Workspace Groups',
    annotations: { readOnlyHint: true, openWorldHint: true },
    description:
      'List groups in the current PAT-pinned workspace. Supply group_id to list its non-archived members ' +
      'with group_user_id (membership id, distinct from user_id and organization_user_id). ' +
      'Use exact returned ids for group changes. Requires ToolJet admin permissions.',
    inputSchema: schema.shape,
    async handler(input) {
      try {
        const args = schema.parse(input);
        if (!args.group_id) return ok({ groups: await client.listWorkspaceGroups() });
        const group = await client.getWorkspaceGroup(args.group_id);
        return ok({ group, members: await client.listWorkspaceGroupMembers(args.group_id) });
      } catch (error) {
        return fail(error);
      }
    },
  };
}

export function manageWorkspaceGroupsTool(client: ToolJetClient): ToolDef {
  const schema = z.object({
    action: z.enum(['create', 'rename', 'delete', 'remove_member']),
    group_id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(50).optional(),
    group_user_id: z.string().uuid().optional(),
    confirm: z.boolean().optional(),
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
      'removes its memberships and permissions. Default role groups cannot be changed here. ' +
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
        if (args.action === 'create') return ok({ group: await client.createWorkspaceGroup(args.name!) });

        // Read through the workspace-scoped endpoint before every mutation; never act on a guessed id.
        const group = await client.getWorkspaceGroup(args.group_id!);
        if (group.type !== 'custom') throw new Error('Only custom groups can be changed with this tool.');
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
