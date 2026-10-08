import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

export function switchAppVersionTool(client: ToolJetClient): ToolDef {
  return {
    name: 'switch_app_version',
    title: 'Switch App Version',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description:
      'Select an existing ToolJet app version as the version the current editor should open and subsequent ' +
      'agent edits should target. Use only when the user explicitly asks to switch, select, open, or work on ' +
      'that version. This does not publish or release the version. Returns verified version and environment ' +
      'metadata that the ToolJet client uses to switch the editor.',
    inputSchema: { app_id: z.string().uuid(), version_id: z.string().uuid() },
    strictInput: true,
    async handler(args: { app_id: string; version_id: string }) {
      try {
        return ok(await client.switchAppVersion(args.app_id, args.version_id));
      } catch (err) {
        return fail(err);
      }
    },
  };
}
