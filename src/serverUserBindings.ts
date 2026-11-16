/**
 * Who the signed-in user is, inside a query of a Code mode app.
 *
 * `{{globals.currentUser.email}}` in a query's options is resolved in the viewer's browser and sent with the run, so a
 * viewer can send another user's email and read or write as them (roles test, 2026-11-04: an employee listed a
 * manager's requests by sending the manager's email). `{{globals.server.currentUser.email}}` is resolved by ToolJet on
 * the server from the session, so it cannot be spoofed. A Code mode app's queries take the server form; Visual apps are
 * left as they are.
 */

/** `globals.currentUser` inside a `{{ }}` binding; `globals.server.currentUser` does not match. */
const BROWSER_USER = /\{\{[^}]*?\bglobals\s*\.\s*currentUser\b/;

/** The option paths (`where_filters.0.value`) whose binding reads the browser's currentUser. */
export function browserUserBindings(options: unknown, path: string[] = []): string[] {
  if (typeof options === 'string') return BROWSER_USER.test(options) ? [path.join('.') || 'options'] : [];
  if (Array.isArray(options)) return options.flatMap((value, index) => browserUserBindings(value, [...path, String(index)]));
  if (options && typeof options === 'object') {
    return Object.entries(options as Record<string, unknown>).flatMap(([key, value]) => browserUserBindings(value, [...path, key]));
  }
  return [];
}

/** What to tell the caller about one query whose options read the browser's currentUser. */
export function browserUserMessage(queryName: string, paths: string[]): string {
  return (
    `Query "${queryName}": ${paths.join(', ')} ${paths.length > 1 ? 'read' : 'reads'} {{globals.currentUser.*}}, which the ` +
    "viewer's browser resolves and sends with the run, so anyone can send another user's email. In a Code mode app use " +
    '{{globals.server.currentUser.*}} (email, id, firstName, groups), which ToolJet resolves on the server, for own-row ' +
    'filters and every "who" column (requester, approver, actor).'
  );
}

const CODE_PAGE_TRUE = new Set<unknown>([true, 'true', '{{true}}']);

/**
 * Whether a raw app (GET /api/apps/:id) is a Code mode app: `build_mode` code, or a page holding a Code mode root
 * component (an AI build's app reads visual until its code is first saved).
 */
export function isCodeModeApp(app: any): boolean {
  if (app?.build_mode === 'code' || app?.buildMode === 'code') return true;
  for (const page of Array.isArray(app?.pages) ? app.pages : []) {
    for (const entry of Object.values((page?.components ?? {}) as Record<string, any>)) {
      if (CODE_PAGE_TRUE.has(entry?.component?.definition?.properties?.codePage?.value)) return true;
    }
  }
  return false;
}

/** The queries of a raw app whose options read the browser's currentUser, as check lines. */
export function browserUserQueryProblems(app: any): string[] {
  const queries = Array.isArray(app?.data_queries) ? app.data_queries : [];
  return queries.flatMap((query: any) => {
    const paths = browserUserBindings(query?.options ?? {});
    return paths.length ? [browserUserMessage(String(query?.name ?? query?.id ?? 'query'), paths)] : [];
  });
}
