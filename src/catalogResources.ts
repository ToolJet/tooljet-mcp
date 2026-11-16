import { allComponentSchemas } from './catalog.js';
/**
 * Read-only MCP resources carrying the catalog data this server validates plans against, for clients that
 * validate or build plans locally and must agree with the server they talk to (a client pinned to one catalog
 * would otherwise drift from an older or newer server).
 *
 * Each resource is one data file, served whole as application/json:
 *
 *   { "mcp_version": "<this server's version>", "catalog_version": "<12 hex chars>",
 *     "data_version": "<12 hex chars>", "data": <the file's JSON> }
 *
 * `data` is the file exactly as this server reads it; `data_version` is the first 12 hex characters of the
 * SHA-256 of the file's bytes, so it changes whenever the data does and not otherwise. `catalog_version` is the
 * same kind of hash over every part (each file's name and bytes, in resource order) and is identical in all of
 * them: a client that reads the parts separately (possibly from different servers during a rolling deployment)
 * uses it to confirm they form one coherent catalog. The resource list carries both in each entry's `_meta`, so a
 * client that cached a version can skip the read.
 */
import { createHash } from 'node:crypto';
import { readCatalogBytes } from '../lib/catalogFiles.js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TOOLJET_MCP_VERSION } from './runtimeFreshness.js';
import { activePackSet, type PackSet } from './packScope.js';

export interface CatalogResource {
  /** Resource name in resources/list. */
  name: string;
  uri: string;
  /** The data file under data/. */
  file: string;
  title: string;
  description: string;
}

const PREFACE = 'Read-only catalog data, for clients that validate or build plans locally. ';

export const CATALOG_RESOURCES: readonly CatalogResource[] = [
  {
    name: 'catalog-components',
    uri: 'tooljet://catalog/components',
    file: 'component-schemas.json',
    title: 'Component catalog',
    description: `${PREFACE}Every component type by name: properties, styles, events, actions, default size and authoring hints.`,
  },
  {
    name: 'catalog-component-compatibility',
    uri: 'tooljet://catalog/component-compatibility',
    file: 'component-compatibility.json',
    title: 'Component compatibility',
    description: `${PREFACE}Legacy component types and the modern type that replaces each.`,
  },
  {
    name: 'catalog-datasources',
    uri: 'tooljet://catalog/datasources',
    file: 'datasource-schemas.json',
    title: 'Datasource query catalog',
    description: `${PREFACE}The query contract of every datasource kind: operations, options and their shapes.`,
  },
  {
    name: 'catalog-page-icons',
    uri: 'tooljet://catalog/page-icons',
    file: 'page-icons.json',
    title: 'Page icons',
    description: `${PREFACE}The icon package, its version and every icon name a page may use.`,
  },
];

// Resolves to <repo>/data/... whether running from src (tsx), dist (built) or bundle (esbuild).
const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), '../data');

/** The data files do not change under a running server, so what is read from them is kept: per process while no
 *  component packs are registered, else per pack set (packScope.ts), since the components part then holds that
 *  workspace's packs and must never be served to another. The version is cheap (one hash) and computed when the
 *  resources are registered; the payload only on a read. */
interface ResourceCache {
  versions: Map<string, string>;
  payloads: Map<string, string>;
  catalogVersion?: string;
}
const newCache = (): ResourceCache => ({ versions: new Map(), payloads: new Map() });
const baseCache = newCache();
const cache = (): ResourceCache => {
  const set = activePackSet();
  if (!set.schemas) return baseCache;
  let own = set.derived.get('resources') as ResourceCache | undefined;
  if (!own) set.derived.set('resources', (own = newCache()));
  return own;
};

// The components part is the live catalogue: the data file plus the workspace's component packs (packCatalog.ts),
// which are read before the first request, so the compiler plans with the packs this workspace has.
// While the packs add nothing the file lacks it is the data file as it is, so the versions stay the file's.
const readPart = (file: string): Buffer => {
  const bytes = readCatalogBytes(resolve(dataDir, file));
  if (file !== 'component-schemas.json') return bytes;
  const live = JSON.stringify(allComponentSchemas());
  return live === JSON.stringify(JSON.parse(bytes.toString('utf8'))) ? bytes : Buffer.from(live);
};

function readData(resource: CatalogResource): { bytes: Buffer; dataVersion: string } {
  const bytes = readPart(resource.file);
  const dataVersion = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  cache().versions.set(resource.file, dataVersion);
  return { bytes, dataVersion };
}

/** One version for the whole set of parts: SHA-256 over each part's file name, byte length and bytes, in order, so
 *  no change to any part (and no shuffling of bytes between parts) keeps it. First 12 hex characters. */
export function catalogVersionOf(parts: ReadonlyArray<{ file: string; bytes: Buffer }>): string {
  const hash = createHash('sha256');
  for (const part of parts) {
    hash.update(`${part.file}\n${part.bytes.length}\n`);
    hash.update(part.bytes);
  }
  return hash.digest('hex').slice(0, 12);
}

/** This server's catalog_version. Throws when a part cannot be read: no part is served under a version that does not
 *  describe the whole catalog. */
function catalogVersion(): string {
  const own = cache();
  own.catalogVersion ??= catalogVersionOf(CATALOG_RESOURCES.map((resource) => ({
    file: resource.file, bytes: readPart(resource.file),
  })));
  return own.catalogVersion;
}

function listedCatalogVersion(): string | undefined {
  try {
    return catalogVersion();
  } catch {
    return undefined;
  }
}

/** The `data_version` a list entry advertises; undefined when the file cannot be read (a read then says why). */
function listedVersion(resource: CatalogResource): string | undefined {
  try {
    return cache().versions.get(resource.file) ?? readData(resource).dataVersion;
  } catch {
    return undefined;
  }
}

function payload(resource: CatalogResource): string {
  const payloads = cache().payloads;
  let text = payloads.get(resource.file);
  if (text === undefined) {
    const { bytes, dataVersion } = readData(resource);
    const data = JSON.parse(bytes.toString('utf8')) as unknown;
    text = JSON.stringify({ mcp_version: TOOLJET_MCP_VERSION, catalog_version: catalogVersion(), data_version: dataVersion, data });
    payloads.set(resource.file, text);
  }
  return text;
}

const metadataOf = (resource: CatalogResource, catalog: string | undefined) => {
  const dataVersion = listedVersion(resource);
  return {
    title: resource.title,
    description: resource.description,
    mimeType: 'application/json',
    ...(dataVersion ? { _meta: { data_version: dataVersion, ...(catalog ? { catalog_version: catalog } : {}) } } : {}),
  };
};
type Registered = Array<{ resource: CatalogResource; handle: { update: (u: { metadata: Record<string, unknown> }) => void } }>;
/** Each server's resource handles, by the pack set it was registered in: a refresh re-lists that server's only. */
const registered = new WeakMap<PackSet, Registered>();

/** The packs joined the components part after registration: drop the set's cached versions and payloads and re-list. */
export function refreshCatalogResources(): void {
  const set = activePackSet();
  set.derived.delete('resources');
  const catalog = listedCatalogVersion();
  for (const { resource, handle } of registered.get(set) ?? []) handle.update({ metadata: metadataOf(resource, catalog) });
}

export function registerCatalogResources(server: McpServer): void {
  const set = activePackSet();
  const handles: Registered = registered.get(set) ?? [];
  registered.set(set, handles);
  const catalog = listedCatalogVersion();
  for (const resource of CATALOG_RESOURCES) {
    const handle = server.registerResource(
      resource.name,
      resource.uri,
      metadataOf(resource, catalog),
      async () => ({
        contents: [{ uri: resource.uri, mimeType: 'application/json', text: payload(resource) }],
      })
    );
    handles.push({ resource, handle });
  }
}
