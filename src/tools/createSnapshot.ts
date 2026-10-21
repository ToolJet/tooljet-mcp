import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

export function createSnapshotTool(client: ToolJetClient): ToolDef {
  return {
    name: 'create_snapshot',
    title: 'Create Snapshot',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    description:
      'Keep a named copy of an app version now, for the compare view ("see what changed") and undo. Edits already ' +
      'take one automatically before the first write of a change, so call this only for an extra checkpoint the ' +
      'user asks for, or before a risky step in a long change. An unchanged version reuses its latest copy. ' +
      'Returns see_changes_url (compare view against this copy). Compare is on trial and Pro and above: on other ' +
      'plans it returns status not_in_plan with upgrade_url and nothing is kept.',
    inputSchema: {
      app_id: z.string().uuid(),
      version_id: z.string().uuid(),
      label: z.string().trim().min(1).max(80).optional().describe('What the copy is before, e.g. "Before the pricing redesign".'),
    },
    strictInput: true,
    async handler(args: { app_id: string; version_id: string; label?: string }) {
      try {
        if (!client.createVersionSnapshot) throw new Error('This ToolJet client cannot create snapshots.');
        const result = await client.createVersionSnapshot(args.app_id, args.version_id, args.label);
        if (result.ok) {
          return ok({ status: 'taken', id: result.id, reused: result.reused, created_at: result.createdAt, see_changes_url: result.seeChangesUrl });
        }
        if (result.reason === 'not_in_plan') {
          return ok({ status: 'not_in_plan', feature: 'Compare versions and undo changes', upgrade_url: result.upgradeUrl });
        }
        if (result.reason === 'no_access') throw new Error(`Only someone who can edit this app can keep a copy of it (${result.status}).`);
        throw new Error(`This ToolJet server does not keep snapshots (${result.status}): ${result.detail}`);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
