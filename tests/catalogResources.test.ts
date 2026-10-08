import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CATALOG_RESOURCES, catalogVersionOf } from '../src/catalogResources.js';
import { TOOLJET_MCP_VERSION } from '../src/runtimeFreshness.js';

const dataFile = (file: string) => readFileSync(resolve(__dirname, '../data', file));
const version = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex').slice(0, 12);
/** The whole catalog as the files are on disk: every part, in resource order. */
const allParts = () => CATALOG_RESOURCES.map((r) => ({ file: r.file, bytes: dataFile(r.file) }));

let client: Client;

beforeAll(async () => {
  process.env.TOOLJET_PAT = 'tj_pat_test';
  const { buildServer } = await import('../src/server.js');
  const server = buildServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'catalog-resources-test', version: '1.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
});

afterAll(async () => {
  await client?.close();
});

describe('catalog resources', () => {
  it('cover every catalog data file the server reads', () => {
    expect(CATALOG_RESOURCES.map((r) => r.uri)).toEqual([
      'tooljet://catalog/components',
      'tooljet://catalog/component-compatibility',
      'tooljet://catalog/datasources',
      'tooljet://catalog/page-icons',
    ]);
    expect(CATALOG_RESOURCES.map((r) => r.file)).toEqual([
      'component-schemas.json', 'component-compatibility.json', 'datasource-schemas.json', 'page-icons.json',
    ]);
  });

  it('are advertised in the capabilities and listed as JSON with their data_version', async () => {
    expect(client.getServerCapabilities()?.resources).toBeTruthy();
    const { resources } = await client.listResources();
    for (const resource of CATALOG_RESOURCES) {
      const listed = resources.find((r) => r.uri === resource.uri);
      expect(listed, resource.uri).toBeTruthy();
      expect(listed!.mimeType).toBe('application/json');
      expect(listed!.description).toMatch(/^Read-only catalog data, for clients that validate or build plans locally\./);
      expect(listed!._meta).toEqual({ data_version: version(dataFile(resource.file)), catalog_version: catalogVersionOf(allParts()) });
    }
  });

  it('read back as { mcp_version, catalog_version, data_version, data } with data equal to the data file', async () => {
    for (const resource of CATALOG_RESOURCES) {
      const { contents } = await client.readResource({ uri: resource.uri });
      expect(contents).toHaveLength(1);
      expect(contents[0]!.uri).toBe(resource.uri);
      expect(contents[0]!.mimeType).toBe('application/json');
      const payload = JSON.parse(String(contents[0]!.text));
      const bytes = dataFile(resource.file);
      expect(Object.keys(payload)).toEqual(['mcp_version', 'catalog_version', 'data_version', 'data']);
      expect(payload.mcp_version).toBe(TOOLJET_MCP_VERSION);
      expect(payload.catalog_version).toBe(catalogVersionOf(allParts()));
      expect(payload.data_version).toBe(version(bytes));
      expect(payload.data).toEqual(JSON.parse(bytes.toString('utf8')));
    }
  });

  // A client reads the parts one at a time; during a rolling deployment two reads can reach two servers. One
  // catalog_version over every part lets it tell a coherent set from a mixed one, whatever each part's data_version.
  it('carry one catalog_version, shared by every part, that names the whole set', async () => {
    const payloads = await Promise.all(CATALOG_RESOURCES.map(async (resource) =>
      JSON.parse(String((await client.readResource({ uri: resource.uri })).contents[0]!.text))));
    const versions = new Set(payloads.map((payload) => payload.catalog_version));
    expect(versions.size).toBe(1);
    expect([...versions][0]).toMatch(/^[0-9a-f]{12}$/);
    expect(payloads.map((payload) => payload.catalog_version)).not.toContain(undefined);
    // Distinct from every per-part version: it is not any one file's hash.
    expect(payloads.map((payload) => payload.data_version)).not.toContain([...versions][0]);
  });

  it('change the catalog_version when any one part changes, and only then', () => {
    const parts = allParts();
    const base = catalogVersionOf(parts);
    expect(catalogVersionOf(allParts())).toBe(base);
    parts.forEach((part, index) => {
      const changed = parts.map((p, i) => i === index ? { ...p, bytes: Buffer.concat([p.bytes, Buffer.from(' ')]) } : p);
      expect(catalogVersionOf(changed), part.file).not.toBe(base);
    });
    // The same bytes under another part's name, or moved between parts, are another catalog.
    const [a, b] = parts;
    expect(catalogVersionOf([{ ...a!, bytes: b!.bytes }, { ...b!, bytes: a!.bytes }, ...parts.slice(2)])).not.toBe(base);
    expect(catalogVersionOf([{ file: 'x', bytes: Buffer.from('ab') }, { file: 'y', bytes: Buffer.from('c') }]))
      .not.toBe(catalogVersionOf([{ file: 'x', bytes: Buffer.from('a') }, { file: 'y', bytes: Buffer.from('bc') }]));
  });

  it('are not tools', async () => {
    const { tools } = await client.listTools();
    const names = new Set(tools.map((t) => t.name));
    expect(names.size).toBeGreaterThan(0);
    for (const resource of CATALOG_RESOURCES) {
      expect(names.has(resource.name)).toBe(false);
      expect(tools.some((t) => (t.description ?? '').includes(resource.uri))).toBe(false);
    }
  });

  it('refuse an unknown catalog uri', async () => {
    await expect(client.readResource({ uri: 'tooljet://catalog/unknown' })).rejects.toThrow(/not found/);
  });
});

describe('catalog resources over the HTTP server', () => {
  const headers = { accept: 'application/json, text/event-stream', 'content-type': 'application/json' };
  let baseUrl: URL;
  let server: import('node:http').Server;

  beforeAll(async () => {
    delete process.env.MCP_SHARED_TOKEN; // direct mode: the server's own PAT acts
    const { createGatewayHttpServer } = await import('../src/index.js');
    server = createGatewayHttpServer().server;
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected an IP listener');
    baseUrl = new URL(`http://127.0.0.1:${address.port}/`);
  });

  afterAll(async () => {
    await new Promise((resolve) => server?.close(resolve));
  });

  const post = (message: unknown) => fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(message) });

  it('answers resources/read with one JSON body, never an SSE event (a catalog can exceed 1 MiB)', async () => {
    const res = await post({ jsonrpc: '2.0', id: 7, method: 'resources/read', params: { uri: 'tooljet://catalog/datasources' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/^application\/json/);
    const reply = await res.json() as { id: number; result: { contents: Array<{ text: string }> } };
    expect(reply.id).toBe(7);
    const text = reply.result.contents[0]!.text;
    expect(text.length).toBeGreaterThan(1024 * 1024);
    expect(JSON.parse(text).data).toEqual(JSON.parse(dataFile('datasource-schemas.json').toString('utf8')));
  });

  it('keeps the SSE stream for everything else', async () => {
    const res = await post({ jsonrpc: '2.0', id: 8, method: 'resources/list' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/^text\/event-stream/);
    expect(await res.text()).toContain('tooljet://catalog/components');
  });

  it('answers a body that is not JSON with a parse error', async () => {
    const res = await fetch(baseUrl, { method: 'POST', headers, body: '{"jsonrpc":' });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: number } }).error.code).toBe(-32700);
  });
});
