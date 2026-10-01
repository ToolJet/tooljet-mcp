/**
 * Text table columns whose RunJS query writes an HTML string into them (a status chip such as
 * `attention: pct < 30 ? '<span ...>Needs attention</span>' : ''`). ToolJet shows such a value as raw
 * markup unless the column is `html`, and no author means that. validate_app reports it, since a query
 * edited after the apply can start returning HTML long after the page was planned.
 */
export interface HtmlFedTable {
  name?: unknown;
  type?: unknown;
  properties?: { data?: { value?: unknown } | unknown; columns?: { value?: unknown } | unknown } | null;
}
export interface HtmlFedQuery {
  name?: unknown;
  kind?: unknown;
  options?: unknown;
}

const valueOf = (prop: unknown): unknown =>
  prop && typeof prop === 'object' && 'value' in (prop as object) ? (prop as { value: unknown }).value : prop;

/** Columns of `table` typed as text whose key the table's RunJS queries assign an HTML string. */
export function htmlFedTextColumns(table: HtmlFedTable, queries: HtmlFedQuery[]): Array<Record<string, unknown>> {
  if (table.type !== 'Table') return [];
  const columns = valueOf(table.properties?.columns);
  if (!Array.isArray(columns)) return [];
  const data = String(valueOf(table.properties?.data) ?? '');
  const read = new Set([...data.matchAll(/queries\.(\w+)/g)].map((m) => m[1]!));
  const code = queries
    .filter((q) => q.kind === 'runjs' && read.has(String(q.name)))
    .map((q) => String((q.options as { code?: unknown } | undefined)?.code ?? ''))
    .join('\n');
  if (!code) return [];
  return (columns as Array<Record<string, unknown>>).filter((col) => {
    if ((col.columnType ?? 'string') !== 'string' || typeof col.key !== 'string' || !col.key) return false;
    const key = col.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${key}\\s*:[^,;{}]*?['"\`]\\s*<[a-zA-Z]`).test(code)) return true;
    // One step of indirection: `attention: note` where `note = ... '<span ...>'`.
    const idents = [...code.matchAll(new RegExp(`\\b${key}\\s*:\\s*([A-Za-z_$][\\w$]*)\\s*[,}]`, 'g'))].map((m) => m[1]!);
    return idents.some((id) => new RegExp(`\\b${id}\\s*=(?!=)[^;]*?['"\`]\\s*<[a-zA-Z]`).test(code));
  });
}
