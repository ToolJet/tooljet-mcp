/**
 * Read-only MCP resources carrying the catalog data this server validates plans against, for clients that
 * validate or build plans locally and must agree with the server they talk to (a client pinned to one catalog
 * would otherwise drift from an older or newer server).
 *
 * Each resource is one data file, served whole as application/json:
 *
 *   { "mcp_version": "<this server's version>", "data_version": "<12 hex chars>", "data": <the file's JSON> }
 *
 * `data` is the file exactly as this server reads it; `data_version` is the first 12 hex characters of the
 * SHA-256 of the file's bytes, so it changes whenever the data does and not otherwise. The resource list carries
 * the same `data_version` in each entry's `_meta`, so a client that cached a version can skip the read.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TOOLJET_MCP_VERSION } from './runtimeFreshness.js';

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

/** Per process, like the catalog modules' own caches: the data files do not change under a running server. The
 *  version is cheap (one hash) and computed when the resources are registered; the payload only on a read. */
const versions = new Map<string, string>();
const payloads = new Map<string, string>();

function readData(resource: CatalogResource): { bytes: Buffer; dataVersion: string } {
  const bytes = readFileSync(resolve(dataDir, resource.file));
  const dataVersion = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  versions.set(resource.file, dataVersion);
  return { bytes, dataVersion };
}

/** The `data_version` a list entry advertises; undefined when the file cannot be read (a read then says why). */
function listedVersion(resource: CatalogResource): string | undefined {
  try {
    return versions.get(resource.file) ?? readData(resource).dataVersion;
  } catch {
    return undefined;
  }
}

function payload(resource: CatalogResource): string {
  let text = payloads.get(resource.file);
  if (text === undefined) {
    const { bytes, dataVersion } = readData(resource);
    const data = JSON.parse(bytes.toString('utf8')) as unknown;
    text = JSON.stringify({ mcp_version: TOOLJET_MCP_VERSION, data_version: dataVersion, data });
    payloads.set(resource.file, text);
  }
  return text;
}

export function registerCatalogResources(server: McpServer): void {
  for (const resource of CATALOG_RESOURCES) {
    const dataVersion = listedVersion(resource);
    server.registerResource(
      resource.name,
      resource.uri,
      {
        title: resource.title,
        description: resource.description,
        mimeType: 'application/json',
        ...(dataVersion ? { _meta: { data_version: dataVersion } } : {}),
      },
      async () => ({
        contents: [{ uri: resource.uri, mimeType: 'application/json', text: payload(resource) }],
      })
    );
  }
}
