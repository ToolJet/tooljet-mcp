import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

export function releaseAppTool(client: ToolJetClient): ToolDef {
  return {
    name: 'release_app',
    title: 'Release App',
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
    description:
      'Release a specific ToolJet app version so it becomes the app\'s live released version. ' +
      'Use only when the user explicitly asked to release or publish the app, and pass confirm:true. ' +
      'The operation publishes a draft when necessary and promotes it one environment at a time until it reaches ' +
      'production when the workspace requires it, then releases only that exact version. It is safe to retry after a ' +
      'transient preparation failure. Returns a verified current_version_id after reading the app back.',
    inputSchema: {
      app_id: z.string().uuid(),
      version_id: z.string().uuid(),
      confirm: z.literal(true),
    },
    strictInput: true,
    async handler(args: { app_id: string; version_id: string; confirm: true }) {
      try {
        return ok(await client.releaseApp(args.app_id, args.version_id));
      } catch (err) {
        return fail(err);
      }
    },
  };
}
