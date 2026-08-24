/**
 * Shared id-or-name resolution for tools that address existing resources.
 *
 * Models routinely pass a NAME where a tool declares an id: the name is the handle they authored, it
 * is what every binding uses (`{{components.userTable.selectedRow}}`), and most sibling tools accept
 * names (get_app_summary's component_names/page_names/query_names, apply_app_phase's refs, every
 * ToolJet-DB tool's table_name). When a tool matches on id alone and answers "does not exist", that
 * message is FALSE — the resource is right there — so the model re-reads, sees it, retries the same
 * call, and loops. One such case burned >1M tokens on a single build before it was caught.
 *
 * Resolving an unambiguous name (and, when nothing matches, saying what IS available) turns that
 * infinite loop into a one-turn correction. Ids remain the contract: a name match emits a warning.
 */

export interface ResolvableRef {
  id: string;
  name?: string;
}

export type RefResolution<T extends ResolvableRef> =
  | { ok: true; target: T; warning?: string }
  | { ok: false; error: string };

/**
 * Resolve `ref` against `candidates` by id first, then by unique name.
 *
 * @param kind    Human label used in messages ("Component", "Page", "Query", …).
 * @param scope   Where the lookup happened, for the message ('on page "p1"', 'in app "a1"').
 * @param describe Optional renderer for the available-list entries; defaults to `name=id`.
 */
export function resolveRef<T extends ResolvableRef>(
  candidates: readonly T[],
  ref: string,
  kind: string,
  scope: string,
  describe: (candidate: T) => string = (candidate) => `${candidate.name ?? '(unnamed)'}=${candidate.id}`
): RefResolution<T> {
  const byId = candidates.find((candidate) => candidate.id === ref);
  if (byId) return { ok: true, target: byId };

  const byName = candidates.filter((candidate) => candidate.name === ref);
  if (byName.length === 1) {
    return {
      ok: true,
      target: byName[0],
      warning:
        `${kind} "${ref}" was matched by name to id "${byName[0].id}". ` +
        'Pass the id (from get_app_summary) to avoid ambiguity.',
    };
  }
  if (byName.length > 1) {
    return {
      ok: false,
      error:
        `${kind} name "${ref}" is ambiguous ${scope} (${byName.length} share it). ` +
        `Pass the id instead: ${byName.map((candidate) => candidate.id).join(', ')}.`,
    };
  }

  const available = candidates.map(describe).join(', ');
  return {
    ok: false,
    // The "do not re-read" clause matters: the previous phrasing ("does not exist") invited exactly
    // the re-read that caused the loop.
    error:
      `No ${kind.toLowerCase()} with id or name "${ref}" ${scope}. ` +
      `Do not re-read — it currently holds: ${available || '(none)'}.`,
  };
}
