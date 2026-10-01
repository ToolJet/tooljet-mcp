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
 * being confined to that ONE app.
 *
 * NOT read-only, despite how this used to be described. PatScopeInterceptor bars non-GET requests
 * but exempts BOTH data-query run routes without inspecting what the query does, so loading a page
 * executes its page-load queries for real — writes included. Nothing on the client can prevent that;
 * the fix is a server-side render execution policy. Until it exists, treat opening an app with this
 * session as capable of side effects. It is
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
      // call mints a fresh session rather than replacing one.
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    description:
      'Mint a short-lived browser session scoped to one app, for loading it in a headless browser ' +
      'to check how it rendered. Returns { token, url, expires_at } — `expires_at` is the expiry ' +
      'ToolJet stamped on the session, not a requested one, and is absent on older ToolJets. ' +
      'Set `token` as the tj_auth_token cookie and ' +
      'navigate to `url`. The token is scoped to this app alone and may only issue GET requests, ' +
      'apart from running the app\'s own queries — which DO execute for real, including any that ' +
      'write. Requires this server to ' +
      'be running on a personal access token; if it is on a pre-minted session the call fails and ' +
      'the caller should skip its render check rather than treat the app as broken. Not a ' +
      'general-purpose credential: do not persist it.',
    inputSchema: {
      app_id: z.string(),
    },
    // No expiry parameter: the bound is the server's to set, and it reports what it chose.
    async handler(args: { app_id: string }) {
      try {
        const result = await client.createAppScopedSession(args.app_id);
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
