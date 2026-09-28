import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CATALOG_RESOURCES } from '../src/catalogResources.js';
import { TOOLJET_MCP_VERSION } from '../src/runtimeFreshness.js';

const dataFile = (file: string) => readFileSync(resolve(__dirname, '../data', file));
const version = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex').slice(0, 12);

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
      expect(listed!._meta).toEqual({ data_version: version(dataFile(resource.file)) });
    }
  });

  it('read back as { mcp_version, data_version, data } with data equal to the data file', async () => {
    for (const resource of CATALOG_RESOURCES) {
      const { contents } = await client.readResource({ uri: resource.uri });
      expect(contents).toHaveLength(1);
      expect(contents[0]!.uri).toBe(resource.uri);
      expect(contents[0]!.mimeType).toBe('application/json');
      const payload = JSON.parse(String(contents[0]!.text));
      const bytes = dataFile(resource.file);
      expect(Object.keys(payload)).toEqual(['mcp_version', 'data_version', 'data']);
      expect(payload.mcp_version).toBe(TOOLJET_MCP_VERSION);
      expect(payload.data_version).toBe(version(bytes));
      expect(payload.data).toEqual(JSON.parse(bytes.toString('utf8')));
    }
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
