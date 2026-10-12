import { describe, expect, it } from 'vitest';
import { seedPictureWarnings } from '../src/seedPictureLint.js';

// A Sol recipe build seeded every row with the same drawn SVG plate (data:image/svg+xml), which a blind reviewer read
// as placeholder art (2026-10-12): seeds of pictures say so when rows share a picture or carry a drawing.
const photo = (n: number) => `https://images.unsplash.com/photo-${n}?w=800`;
const table = (rows: Array<Record<string, unknown>>) => [{ table_name: 'recipes', rows }];

describe('seedPictureWarnings', () => {
  it('names a column of drawn data: images', () => {
    const svg = 'data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E';
    const warnings = seedPictureWarnings(table([{ name: 'a', cover_image: svg }, { name: 'b', cover_image: svg }]));
    expect(warnings.join(' ')).toMatch(/recipes\.cover_image/);
    expect(warnings.join(' ')).toMatch(/authoringHints\.photos/);
  });

  it('names a column where most rows share a few photos', () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ name: `r${i}`, photo: photo(i % 2) }));
    expect(seedPictureWarnings(table(rows)).join(' ')).toMatch(/12 rows share 2 pictures/);
  });

  it('is quiet when photos vary, or a reuse is small', () => {
    expect(seedPictureWarnings(table(Array.from({ length: 8 }, (_, i) => ({ photo: photo(i) }))))).toEqual([]);
    expect(seedPictureWarnings(table(Array.from({ length: 8 }, (_, i) => ({ photo: photo(i % 6) }))))).toEqual([]);
    expect(seedPictureWarnings(table([{ photo: photo(1) }, { photo: photo(1) }]))).toEqual([]);
  });

  it('ignores columns that are not pictures', () => {
    const rows = Array.from({ length: 10 }, () => ({ status: 'open', site: 'https://example.com/docs' }));
    expect(seedPictureWarnings(table(rows))).toEqual([]);
  });
});

describe('insert_rows_batch', () => {
  it('returns the picture warnings with the inserted rows', async () => {
    const { insertRowsBatchTool } = await import('../src/tools/insertRowsBatch.js');
    const client = { insertRowsBatch: async () => [{ table_name: 'recipes', processed_rows: 4 }] };
    const tool = insertRowsBatchTool(client as never);
    const rows = Array.from({ length: 4 }, (_, i) => ({ name: `r${i}`, cover_image: photo(7) }));
    const result = await tool.handler({ tables: [{ table_name: 'recipes', rows }] });
    const body = JSON.parse((result as { content: Array<{ text: string }> }).content[0].text);
    expect(body.processed_rows).toBe(4);
    expect(body.warnings.join(' ')).toMatch(/4 rows share 1 picture;/);
  });
});
