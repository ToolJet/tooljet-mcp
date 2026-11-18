/*
  Which component packs a request sees.

  A workspace's packs (packCatalog.ts) join the catalogue at run time. They were kept in module state, so on the shared
  HTTP server, which builds one server per request, tenant A's libraries stayed in the catalogue for tenant B: B's
  get_component_catalog and catalog resources listed them, and B's agent could store components pointing at them.

  Now each server instance has its own PackSet, its tool and resource handlers run inside it (AsyncLocalStorage, so
  concurrent requests never see each other's), and the catalogue reads only the active set. Code that runs outside any
  server (scripts, unit tests that call loadInstalledPacks directly) uses one process set, as before.
*/
import { AsyncLocalStorage } from 'node:async_hooks';
import type { ComponentSchema } from './catalog.js';
import type { LibraryPack } from './libraryPack.js';

export interface PackSet {
  /** The packs' catalogue types, or null when none were registered (the data file's catalogue stands). */
  schemas: Record<string, ComponentSchema> | null;
  /** The packs' default definitions. */
  definitions: Record<string, unknown>;
  /** The packs, or null when none were registered (the offline pack data stands). */
  packs: LibraryPack[] | null;
  /** Caches derived from this set (the merged catalogue, resource payloads). */
  derived: Map<string, unknown>;
}

export const newPackSet = (): PackSet => ({ schemas: null, definitions: {}, packs: null, derived: new Map() });

const processSet = newPackSet();
const store = new AsyncLocalStorage<PackSet>();

/** The pack set of the request being served, else the process set. */
export const activePackSet = (): PackSet => store.getStore() ?? processSet;

/** Run `work` (and everything it awaits or schedules) with `set` as the active pack set. */
export const inPackSet = <R>(set: PackSet, work: () => R): R => store.run(set, work);
