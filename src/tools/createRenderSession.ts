import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

/* A browser-usable credential for ONE app.
 *
 * The session this server builds with is PAT-derived (isPATLogin), and PatScopeInterceptor bars such
 * sessions from /api/authorize — the SPA's boot call — so the page redirects to login and the app
 * never renders.
 *
 * An APP-PINNED session is the exception: POST /api/personal-access-tokens/session {appId} returns
 * a session that reaches /api/authorize and the handful of modules the editor needs to paint, while
 * being confined to that ONE app and read-only apart from running the app's own queries. It is
 * minted from the workspace PAT this server already holds, so it carries no authority the server
 * did not already have, and it cannot be widened by asking for a different app.
 *
 * Note this is NOT the embed exemption. A session that merely names an app used to skip the PAT
 * capability limit entirely; that hole is closed — the interceptor now branches on the token's own
 * kind, and an app-pinned workspace session gets the narrow render list instead.
 */
export function createRenderSessionTool(client: ToolJetClient): ToolDef {
  return {
    name: 'create_render_session',
    title: 'Create Render Session',
    annotations: {
      // Not read-only: it creates a session row server-side. It destroys nothing, though, and each
      // call mints a fresh short-lived session rather than replacing one.
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    description:
      'Mint a SHORT-LIVED browser session scoped to one app, for loading it in a headless browser to ' +
      'check how it rendered. Returns { token, expires_in_minutes, url } — set `token` as the ' +
      'tj_auth_token cookie (or header) and navigate to `url`. The token is read-only, scoped to ' +
      'this app alone, and cannot be used to read or write anything else. Requires this server to ' +
      'be running on a personal access token; if it is on a pre-minted session the call fails and ' +
      'the caller should skip its render check rather than treat the app as broken. Not a ' +
      'general-purpose credential: do not persist it.',
    inputSchema: {
      app_id: z.string(),
      email: z
        .string()
        .optional()
        .describe(
          'Ignored. The session is minted from this server\'s own token, so it already belongs to ' +
            'that user — there is nobody to name. Kept so existing callers do not break.'
        ),
      expiry_minutes: z.number().int().min(1).max(60).optional(),
    },
    async handler(args: { app_id: string; email?: string; expiry_minutes?: number }) {
      try {
        const result = await client.createAppScopedSession(args.app_id, args.email ?? '', args.expiry_minutes ?? 15);
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
