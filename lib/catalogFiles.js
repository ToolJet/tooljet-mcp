import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

const FORMAT = 'tooljet-catalog-parts-v1';
const PART_BYTES = 240 * 1024;
const json = (value) => JSON.stringify(value, null, 2) + '\n';

/** Read a catalog transparently, including catalogs stored in reviewable JSON parts. */
export function readCatalog(file) {
  const index = JSON.parse(readFileSync(file, 'utf8'));
  if (index.format !== FORMAT) return index;
  const result = {};
  for (const part of index.parts) {
    // References are generated beside the index and must never escape that directory.
    if (!/^[\w-]+\/part-\d+\.json$/.test(part)) throw new Error(`Invalid catalog part: ${part}`);
    const data = JSON.parse(readFileSync(resolve(dirname(file), part), 'utf8'));
    for (const [key, value] of Object.entries(data)) {
      if (Object.hasOwn(result, key)) throw new Error(`Duplicate catalog key: ${key}`);
      Object.defineProperty(result, key, { value, enumerable: true, writable: true, configurable: true });
    }
  }
  return result;
}

/** Preserve the original JSON bytes and resource hashes when a catalog is split on disk. */
export function readCatalogBytes(file) {
  const bytes = readFileSync(file);
  const value = JSON.parse(bytes.toString('utf8'));
  return value.format === FORMAT ? Buffer.from(json(readCatalog(file))) : bytes;
}

/** Keep whole top-level entries together: each part is readable, standalone JSON. */
export function writeCatalog(file, catalog) {
  const partName = basename(file, '.json');
  const partDir = resolve(dirname(file), partName);
  const parts = [];
  let current = {};
  for (const [key, value] of Object.entries(catalog)) {
    const entry = { [key]: value };
    if (Buffer.byteLength(json(entry)) > PART_BYTES) {
      throw new Error(`Catalog entry ${key} exceeds ${PART_BYTES} bytes; split its source contract.`);
    }
    const next = { ...current, ...entry };
    if (Buffer.byteLength(json(next)) > PART_BYTES) {
      parts.push(current);
      current = entry;
    } else current = next;
  }
  if (Object.keys(current).length) parts.push(current);
  // Validate every entry before replacing generated output.
  rmSync(partDir, { recursive: true, force: true });
  mkdirSync(partDir, { recursive: true });
  const names = parts.map((part, i) => {
    const name = `${partName}/part-${String(i + 1).padStart(3, '0')}.json`;
    writeFileSync(resolve(dirname(file), name), json(part));
    return name;
  });
  writeFileSync(file, json({ format: FORMAT, parts: names }));
}
