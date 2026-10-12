/* A plan's datasource_name, matched to one source in the version. The exact name wins (a case mismatch is refused: a
   loose match could wire a query to the wrong source); else a name that means ToolJet's built-in database ("ToolJet Database", "ToolJet DB", "tooljetdb") takes the version's
   one tooljetdb source, whose stored name is "tooljetdbdefault" (2026-10-12: a pets build tried both readable names,
   found 0 sources each time and stopped without building). A note says which name was used. */
interface Source {
  id: string;
  name: string;
  kind?: string;
}

const BUILT_IN_DB = /^tool\s*jet\s*(db|data\s*base)$/i;

export function matchDatasourceByName(sources: Source[], name: string | undefined): { id: string; note: string | null } | null {
  if (!name) return null;
  const exact = sources.filter((s) => s.name === name);
  if (exact.length === 1) return { id: exact[0]!.id, note: null };
  if (BUILT_IN_DB.test(name.trim())) {
    const db = sources.filter((s) => s.kind === 'tooljetdb');
    if (db.length === 1) return { id: db[0]!.id, note: `datasource_name "${name}" is ToolJet's built-in database, "${db[0]!.name}" in this version.` };
  }
  return null;
}
