import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readCatalog, readCatalogBytes, writeCatalog } from '../lib/catalogFiles.js';

const directories: string[] = [];
const fixture = () => {
  const dir = mkdtempSync(join(tmpdir(), 'catalog-parts-'));
  directories.push(dir);
  return join(dir, 'catalog.json');
};
afterEach(() => { for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe('reviewable catalog files', () => {
  it('splits whole entries and preserves exact public resource bytes', () => {
    const file = fixture();
    const data = { alpha: { text: 'a'.repeat(150 * 1024) }, beta: { text: 'b'.repeat(150 * 1024) }, gamma: { values: [1, 2] } };
    const original = Buffer.from(JSON.stringify(data, null, 2) + '\n');
    writeCatalog(file, data);
    const { parts } = JSON.parse(readFileSync(file, 'utf8'));
    expect(parts).toHaveLength(2);
    for (const part of parts) {
      const bytes = readFileSync(join(file, '..', part));
      expect(bytes.length).toBeLessThan(256 * 1024);
      expect(() => JSON.parse(bytes.toString())).not.toThrow();
    }
    expect(readCatalog(file)).toEqual(data);
    expect(readCatalogBytes(file)).toEqual(original);
    writeCatalog(file, { small: true });
    expect(readdirSync(join(file, '..', 'catalog'))).toEqual(['part-001.json']);
  });

  it('keeps existing output if one entry cannot fit', () => {
    const file = fixture();
    writeCatalog(file, { valid: true });
    expect(() => writeCatalog(file, { huge: 'x'.repeat(256 * 1024) })).toThrow(/exceeds/);
    expect(readCatalog(file)).toEqual({ valid: true });
  });

  it('supports unsplit and empty catalogs and refuses corrupt part references', () => {
    const file = fixture();
    writeFileSync(file, '{"original":true}');
    expect(readCatalogBytes(file).toString()).toBe('{"original":true}');
    writeCatalog(file, {});
    expect(readCatalog(file)).toEqual({});
    writeFileSync(file, JSON.stringify({ format: 'tooljet-catalog-parts-v1', parts: ['../outside.json'] }));
    expect(() => readCatalog(file)).toThrow(/Invalid catalog part/);
    writeCatalog(file, { duplicate: true });
    const index = JSON.parse(readFileSync(file, 'utf8'));
    index.parts.push(index.parts[0]);
    writeFileSync(file, JSON.stringify(index));
    expect(() => readCatalog(file)).toThrow(/Duplicate catalog key/);
  });
});
