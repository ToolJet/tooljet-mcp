/** Query-option schemas generated from ToolJet's first-party plugin operation definitions. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export interface DatasourceQuerySchema {
  kind: string;
  name: string;
  type?: string;
  description?: string;
  defaults: Record<string, unknown>;
  operations: string[];
  properties: Record<string, unknown>;
  paginationStrategies?: string[];
}

const dataPath = resolve(dirname(fileURLToPath(import.meta.url)), '../data/datasource-schemas.json');
let cache: Record<string, DatasourceQuerySchema> | null = null;

function load(): Record<string, DatasourceQuerySchema> {
  if (!cache) cache = JSON.parse(readFileSync(dataPath, 'utf8')) as Record<string, DatasourceQuerySchema>;
  return cache;
}

export function getDatasourceCatalog(): Array<Pick<DatasourceQuerySchema, 'kind' | 'name' | 'type' | 'operations'>> {
  return Object.values(load()).map(({ kind, name, type, operations }) => ({ kind, name, type, operations }));
}

export function getDatasourceQuerySchema(kind: string): DatasourceQuerySchema | null {
  return load()[kind] ?? null;
}
