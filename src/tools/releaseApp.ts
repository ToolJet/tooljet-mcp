import { z } from 'zod';
import { ReleaseScanTimeout, type ToolJetClient } from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

export function releaseAppTool(client: ToolJetClient): ToolDef {
  return {
    name: 'release_app',
    title: 'Release App',
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false,
    },
    description:
      'Release a specific ToolJet app version so it becomes the app\'s live released version. ' +
      'Use only when the user explicitly asked to release or publish the app, and pass confirm:true. ' +
      'Checks permissions and applicable review and security policies before saving or promoting. Promotes the selected version one environment at a time to ' +
      'production when the workspace requires it, then releases only that exact version. On failure it preserves completed steps and reports the verified state. ' +
      'Returns a verified current_version_id after reading the app back.',
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
        if (err instanceof ReleaseScanTimeout) {
          return { ...ok({ error: {
            code: 'release_scan_timeout', app_id: args.app_id, version_id: args.version_id,
            environment: err.environment, message: err.message,
          } }), isError: true };
        }
        return fail(err);
      }
    },
  };
}
