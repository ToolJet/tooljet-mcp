import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { context, propagation, trace } from '@opentelemetry/api';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuth } from '../src/auth.js';
import { createClient } from '../src/tooljetClient.js';
import { registerTools } from '../src/tools/index.js';
import { BaggageAttributeProcessor, shutdownOtel, startOtel } from '../src/otel.js';
import { TOOLJET_MCP_VERSION } from '../src/runtimeFreshness.js';
import { USER_AGENT } from '../src/tracing.js';

const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
const TRACEPARENT = `00-${TRACE_ID}-00f067aa0ba902b7-01`;
const BAGGAGE = 'tooljet.origin=ai,gen_ai.conversation.id=thread-1,user.email=a%40b.c';

type OtlpAttr = { key: string; value: { stringValue?: string } };
type OtlpSpan = { name: string; traceId: string; spanId: string; parentSpanId?: string; attributes: OtlpAttr[] };

// One local server plays both the OTLP collector and the ToolJet API.
const exported: { resource: OtlpAttr[]; spans: OtlpSpan[] }[] = [];
const apiRequests: { url: string; headers: IncomingHttpHeaders }[] = [];
let server: Server;
let base: string;
let other: string;
let otherServer: Server;
const otherRequests: IncomingHttpHeaders[] = [];

const attrs = (list: OtlpAttr[]) => Object.fromEntries(list.map((a) => [a.key, a.value.stringValue]));
const allSpans = () => exported.flatMap((batch) => batch.spans);

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      if (req.url === '/v1/traces') {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        for (const rs of body.resourceSpans) {
          exported.push({ resource: rs.resource.attributes, spans: rs.scopeSpans.flatMap((s: { spans: OtlpSpan[] }) => s.spans) });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
        return;
      }
      if (req.url === '/redirect') { res.writeHead(302, { Location: `${other}/landed` }).end(); return; }
      apiRequests.push({ url: req.url ?? '', headers: req.headers });
      res.writeHead(201, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ authToken: 'TOKEN', organizationId: 'org1', organizationSlug: 'acme' }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  otherServer = createServer((req, res) => { otherRequests.push(req.headers); res.end('{}'); });
  await new Promise<void>((resolve) => otherServer.listen(0, '127.0.0.1', resolve));
  other = `http://localhost:${(otherServer.address() as AddressInfo).port}`;
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT = base;
  process.env.OTEL_RESOURCE_ATTRIBUTES = 'deployment.environment.name=development';
  startOtel(base);
});

afterAll(async () => {
  await shutdownOtel();
  delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  delete process.env.OTEL_RESOURCE_ATTRIBUTES;
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => otherServer.close(resolve));
});

describe('OpenTelemetry bootstrap', () => {
  it('carries the agent trace from _meta through the tool span to the ToolJet request', async () => {
    const config = { apiUrl: base, appUrl: base, pat: 'tj_pat_test' };
    const mcpServer = new McpServer({ name: 'otel-test', version: '1.0.0' });
    registerTools(mcpServer, createClient(createAuth(config), config));
    const client = new Client({ name: 'otel-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await mcpServer.connect(serverTransport);
    await client.connect(clientTransport);
    const result = await client.callTool({ name: 'list_workspaces', arguments: {}, _meta: { traceparent: TRACEPARENT, baggage: BAGGAGE } });
    await client.close();
    await mcpServer.close();

    // Outbound ToolJet call: same trace, baggage forwarded, caller named.
    expect(result.isError).not.toBe(true);
    const login = apiRequests.find((r) => r.url === '/api/personal-access-tokens/session')!;
    expect(login.headers.traceparent).toMatch(new RegExp(`^00-${TRACE_ID}-[0-9a-f]{16}-01$`));
    expect(login.headers.baggage).toContain('tooljet.origin=ai');
    expect(login.headers['user-agent']).toBe(`tooljet-mcp/${TOOLJET_MCP_VERSION}`);

    // A request that does not name us (third-party URL) gets no context and no span.
    const parent = trace.getTracer('test').startSpan('parent');
    await context.with(trace.setSpan(context.active(), parent), () => fetch(`${base}/third-party`));
    parent.end();
    const thirdParty = apiRequests.find((r) => r.url === '/third-party')!.headers;
    expect(thirdParty.traceparent).toBeUndefined();
    expect(thirdParty.baggage).toBeUndefined();

    // A redirect off the ToolJet origin re-sends our UA but must not carry context.
    const hop = trace.getTracer('test').startSpan('hop');
    const hopCtx = propagation.setBaggage(trace.setSpan(context.active(), hop), propagation.createBaggage({ 'tooljet.origin': { value: 'ai' } }));
    await context.with(hopCtx, () => fetch(`${base}/redirect`, { headers: { 'User-Agent': USER_AGENT } }));
    hop.end();
    expect(otherRequests).toHaveLength(1);
    expect(otherRequests[0].traceparent).toBeUndefined();
    expect(otherRequests[0].baggage).toBeUndefined();

    await shutdownOtel(5000);

    const [batch] = exported;
    expect(attrs(batch.resource)).toMatchObject({
      'service.name': 'tooljet-mcp',
      'service.version': TOOLJET_MCP_VERSION,
      'deployment.environment.name': 'development',
    });
    // No CLIENT span for the third-party request.
    expect(allSpans().some((s) => attrs(s.attributes)['url.full']?.includes('/third-party'))).toBe(false);
    const toolSpan = allSpans().find((s) => s.name === 'tools/call list_workspaces')!;
    expect(toolSpan.traceId).toBe(TRACE_ID);
    // Allowlisted baggage only.
    expect(attrs(toolSpan.attributes)).toMatchObject({ 'tooljet.origin': 'ai', 'gen_ai.conversation.id': 'thread-1' });
    expect(attrs(toolSpan.attributes)['user.email']).toBeUndefined();
    // The fetch span is the tool span's child and the parent of the ToolJet request.
    const fetchSpan = allSpans().find((s) => s.parentSpanId === toolSpan.spanId)!;
    expect(login.headers.traceparent).toBe(`00-${TRACE_ID}-${fetchSpan.spanId}-01`);
  });
});

describe('BaggageAttributeProcessor', () => {
  const run = (entries: Record<string, string>) => {
    const set: Record<string, string> = {};
    const bag = propagation.createBaggage(Object.fromEntries(Object.entries(entries).map(([k, value]) => [k, { value }])));
    new BaggageAttributeProcessor().onStart(
      { setAttribute: (k: string, v: string) => { set[k] = v; } } as never,
      propagation.setBaggage(context.active(), bag),
    );
    return set;
  };
  it('drops origins other than ai', () => {
    expect(run({ 'tooljet.origin': 'evil' })).toEqual({});
    expect(run({ 'tooljet.origin': 'ai' })).toEqual({ 'tooljet.origin': 'ai' });
  });
  it('caps conversation id at 128 chars', () => {
    expect(run({ 'gen_ai.conversation.id': 'x'.repeat(300) })['gen_ai.conversation.id']).toHaveLength(128);
  });
});
