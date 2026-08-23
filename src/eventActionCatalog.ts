import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface EventActionSchema {
  id: string;
  name: string;
  group?: string;
  required: string[];
  optional?: string[];
  allowedValues?: Record<string, unknown[]>;
  target?: 'query' | 'page' | 'component' | 'modal' | 'table';
  note?: string;
}

const dataPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../data/event-action-schemas.json'
);

let cache: Record<string, EventActionSchema> | null = null;

function load(): Record<string, EventActionSchema> {
  if (!cache) {
    cache = JSON.parse(readFileSync(dataPath, 'utf8')) as Record<string, EventActionSchema>;
  }
  return cache;
}

export function getEventActionCatalog(): EventActionSchema[] {
  return Object.values(load()).sort((left, right) => left.id.localeCompare(right.id));
}

export function getEventActionSchema(actionId: string): EventActionSchema | null {
  return load()[actionId] ?? null;
}

export function getEventActionIds(): Set<string> {
  return new Set(Object.keys(load()));
}
