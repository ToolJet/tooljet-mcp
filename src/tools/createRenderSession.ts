import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

/* A browser-usable credential for ONE app.
 *
 * The session this server builds with is PAT-derived (isPATLogin), and PatScopeInterceptor bars such
 * sessions from the endpoints the frontend needs to boot: /api/session answers 403 and the page
 * redirects to login. An APP-scoped PAT is the documented exception — its session carries
 * scope:"App" + appId, which becomes user.patAppId, and the interceptor lets those straight through
 * because "the embed viewer legitimately needs far more surface than an automation client".
 *
 * Minting lives HERE rather than in the calling agent because it needs EXTERNAL_API_ACCESS_TOKEN —
 * an instance-wide secret that can mint a token for any user and any app. That belongs in the
 * deployment that already owns it, next to ToolJet, not in a hosted agent's environment. The caller
 * receives only the narrow result: a short-lived JWT for one app.
 */
export function createRenderSessionTool(client: ToolJetClient): ToolDef {
  return {
    name: 'create_render_session',
    title: 'Create Render Session',
    annotations: {
      readOnlyHint: false,
      openWorldHint: true,
    },
    description:
      'Mint a SHORT-LIVED browser session scoped to one app, for loading it in a headless browser to ' +
      'check how it rendered. Returns { token, expires_in_minutes, url } — set `token` as the ' +
      'tj_auth_token cookie (or header) and navigate to `url`. The token is scoped to this app alone ' +
      'and cannot be used to read or write anything else. Requires EXTERNAL_API_ACCESS_TOKEN to be ' +
      'configured on this server; without it the call fails and the caller should skip its render ' +
      'check rather than treat the app as broken. Not a general-purpose credential: do not persist it.',
    inputSchema: {
      app_id: z.string(),
      email: z.string().describe('The user the session belongs to; the render is seen as they would see it.'),
      expiry_minutes: z.number().int().min(1).max(60).optional(),
    },
    async handler(args: { app_id: string; email: string; expiry_minutes?: number }) {
      try {
        const result = await client.createAppScopedSession(args.app_id, args.email, args.expiry_minutes ?? 15);
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
