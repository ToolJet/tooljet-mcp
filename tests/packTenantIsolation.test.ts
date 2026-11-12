import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../src/server.js';

/*
  The shared HTTP server builds one MCP server per request. The component pack catalogue was module state, so tenant
  A's libraries stayed in it for tenant B's requests: B's get_component_catalog and the catalogue resource listed A's
  pack, with its usage text and props. Each server now has its own pack set.
*/
const LIBRARY_A = {
  id: 'aaaaaaaa-0000-4000-8000-00000000000a',
  name: 'AcmeConfidential',
  correlationId: 'c',
  revisions: [{ version: '1.0.0' }],
  manifest: {
    manifestVersion: 2,
    pack: 'acmeconfidential',
    components: {
      PayrollGrid: { displayName: 'Payroll Grid', usage: 'Internal payroll of Acme Corp', props: [{ name: 'apiBase', type: 'string', default: 'https://payroll.acme.internal' }] },
    },
  },
};
const LIBRARY_C = { ...LIBRARY_A, id: 'cccccccc-0000-4000-8000-00000000000c', name: 'Globex', manifest: { ...LIBRARY_A.manifest, pack: 'globex', components: { Ledger: { usage: 'Globex ledger' } } } };

const backend = (libraries: unknown[], workspace: string, delayMs = 0) =>
  createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url === '/api/personal-access-tokens/session') return res.end(JSON.stringify({ authToken: 'jwt', organizationId: workspace }));
    if (req.url === '/api/builtin-packs') {
      res.statusCode = 404;
      return res.end('{}');
    }
    if (req.url === '/api/custom-component-libraries') return void setTimeout(() => res.end(JSON.stringify(libraries)), delayMs);
    res.end('{}');
  });

const servers: Server[] = [];
const urls: Record<string, string> = {};
const listen = async (name: string, server: Server) => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  urls[name] = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
};

beforeAll(async () => {
  await listen('A', backend([LIBRARY_A], 'ws-A'));
  await listen('B', backend([], 'ws-B'));
  await listen('C', backend([LIBRARY_C], 'ws-C', 40));
});
afterAll(() => {
  for (const server of servers) server.close();
});

async function connect(tenant: string) {
  const mcp = buildServer({ pat: `pat-${tenant}`, apiUrl: urls[tenant] }, { hosted: true });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await mcp.connect(serverTransport);
  const client = new Client({ name: tenant, version: '1' });
  await client.connect(clientTransport);
  return client;
}
const catalogText = async (client: Client, args: Record<string, unknown> = {}) =>
  ((await client.callTool({ name: 'get_component_catalog', arguments: args })).content as Array<{ text: string }>)[0]!.text;
const componentsResource = async (client: Client) =>
  ((await client.readResource({ uri: 'tooljet://catalog/components' })).contents[0] as { text: string }).text;

describe('component packs are per workspace on a shared server', () => {
  it('tenant B, served after tenant A in the same process, never sees A\'s pack', async () => {
    const a = await connect('A');
    expect(await catalogText(a)).toMatch(/Lib_acmeconfidential_PayrollGrid/);
    const b = await connect('B');
    const text = await catalogText(b);
    expect(text).not.toMatch(/acmeconfidential|PayrollGrid|Acme Corp/);
    expect(await catalogText(b, { types: ['Lib_acmeconfidential_PayrollGrid'] })).not.toMatch(/payroll\.acme\.internal|Internal payroll/);
    expect(await componentsResource(b)).not.toMatch(/acmeconfidential/);
    // A still has its own after B's request.
    expect(await componentsResource(a)).toMatch(/Lib_acmeconfidential_PayrollGrid/);
  });

  it('concurrent requests of two workspaces with packs each see only their own', async () => {
    const [a, c] = await Promise.all([connect('A'), connect('C')]);
    const [textA, textC] = await Promise.all([catalogText(a), catalogText(c)]);
    expect(textA).toMatch(/Lib_acmeconfidential_PayrollGrid/);
    expect(textA).not.toMatch(/Lib_globex_/);
    expect(textC).toMatch(/Lib_globex_Ledger/);
    expect(textC).not.toMatch(/acmeconfidential/);
  });
});
