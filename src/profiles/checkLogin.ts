import { requestPatSession } from '../auth.js';
import type { Profile } from './store.js';

export interface LoginCheck {
  ok: boolean;
  workspaceSlug?: string;
  /** Actionable, and never contains the token. */
  message: string;
}

/** Check a profile with the server's own login call; a ping would pass for a revoked token. */
export async function checkLogin(profile: Pick<Profile, 'url' | 'apiUrl' | 'pat'>, fetchImpl: typeof fetch = fetch): Promise<LoginCheck> {
  const base = profile.apiUrl ?? profile.url;
  const withTimeout: typeof fetch = (input, init) => fetchImpl(input, { ...init, signal: AbortSignal.timeout(10_000) });
  let res: Response;
  try {
    res = await requestPatSession(base, profile.pat, withTimeout);
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'TimeoutError';
    return { ok: false, message: timedOut ? `No answer from ${base} within 10 seconds.` : `Cannot reach ${base}.` };
  }
  if (res.ok) {
    const body = (await res.json().catch(() => ({}))) as { organizationSlug?: string | null; organizationName?: string | null };
    const workspaceSlug = body.organizationSlug ?? body.organizationName ?? undefined;
    return { ok: true, workspaceSlug, message: workspaceSlug ? `Token accepted — workspace ${workspaceSlug}.` : 'Token accepted.' };
  }
  if (res.status === 401 || res.status === 403) return { ok: false, message: 'Token rejected. It may be expired, revoked, or copied incompletely.' };
  if (res.status === 404) return { ok: false, message: `${base} has no access-token login. It may be an older ToolJet, or not the API address.` };
  return { ok: false, message: `${base} answered HTTP ${res.status}.` };
}
