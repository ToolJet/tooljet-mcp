/* Seeds of pictures, checked as they are inserted. A Sol recipe build seeded every row with the same drawn SVG plate
   (data:image/svg+xml), which a blind reviewer read as placeholder art (2026-10-12). The insert still runs; the
   warnings tell the agent to give each row its own real photo. */

const PICTURE_COLUMN = /image|photo|picture|cover|avatar|thumbnail|thumb|img|logo/i;
const PICTURE_URL = /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i;
const PICTURE_HOST = /(^|\.)(images\.unsplash\.com|images\.pexels\.com|cdn\.pixabay\.com)$/i;

const isPicture = (column: string, value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (/^data:image\//i.test(v)) return true;
  if (!/^https?:\/\//i.test(v)) return false;
  try {
    const url = new URL(v);
    return PICTURE_HOST.test(url.hostname) || PICTURE_URL.test(url.pathname) || PICTURE_COLUMN.test(column);
  } catch {
    return false;
  }
};

export function seedPictureWarnings(tables: Array<{ table_name: string; rows: Array<Record<string, unknown>> }>): string[] {
  const warnings: string[] = [];
  for (const { table_name: table, rows } of tables) {
    const columns = new Set(rows.flatMap((row) => Object.keys(row ?? {})));
    for (const column of columns) {
      const pictures = rows.map((row) => row?.[column]).filter((value) => isPicture(column, value)) as string[];
      if (!pictures.length) continue;
      if (pictures.some((p) => /^data:image\//i.test(p.trim()))) {
        warnings.push(
          `${table}.${column} holds drawn data: images, which read as placeholder art; use the records' own picture ` +
            'URLs, or leave the picture out.'
        );
        continue;
      }
      const distinct = new Set(pictures.map((p) => p.trim())).size;
      if (pictures.length >= 4 && distinct * 3 <= pictures.length) {
        warnings.push(
          `${table}.${column}: ${pictures.length} rows share ${distinct} picture${distinct === 1 ? '' : 's'}; ` +
            'a picture repeated across records reads as placeholder art: give each row its own, or leave the picture out.'
        );
      }
    }
  }
  return warnings;
}
