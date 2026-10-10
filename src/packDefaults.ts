import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Section = Record<string, unknown>;
type PackDefinition = { properties?: Section; styles?: Section; others?: Section };

let cached: Record<string, PackDefinition> | undefined;

/** The default definition of a component-pack widget (data/pack-default-definitions.json, generated from the
 *  frontend's pack configs), or undefined for any other type. The server merges no defaults over pack types, so a
 *  pack component is stored with these filled in, as the editor's drag and drop does. */
export function packDefaultDefinition(type: string): PackDefinition | undefined {
  if (!cached) {
    try {
      const path = resolve(dirname(fileURLToPath(import.meta.url)), '../data/pack-default-definitions.json');
      cached = (JSON.parse(readFileSync(path, 'utf8')) as { definitions: Record<string, PackDefinition> }).definitions ?? {};
    } catch {
      cached = {};
    }
  }
  return cached[type];
}
