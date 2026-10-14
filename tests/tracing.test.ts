import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { context, propagation, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator } from '@opentelemetry/core';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from '../src/tools/index.js';
import { withToolSpan, type ToolExtra } from '../src/tracing.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
const PARENT_ID = '00f067aa0ba902b7';
const TRACEPARENT = `00-${TRACE_ID}-${PARENT_ID}-01`;

const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });

beforeAll(() => {
  provider.register({
    propagator: new CompositePropagator({ propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()] }),
  });
});
afterEach(() => exporter.reset());
afterAll(async () => {
  await provider.shutdown();
  trace.disable();
  context.disable();
  propagation.disable();
});

async function callTool(name: string, client: Partial<ToolJetClient>, meta?: Record<string, unknown>) {
  const server = new McpServer({ name: 'tracing-test', version: '1.0.0' });
  registerTools(server, client as ToolJetClient);
  const mcp = new Client({ name: 'tracing-client', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await mcp.connect(clientTransport);
  try {
    return await mcp.callTool({ name, arguments: {}, ...(meta ? { _meta: meta } : {}) });
  } finally {
    await mcp.close();
    await server.close();
  }
}

const toolSpans = () => exporter.getFinishedSpans().filter((span) => span.name.startsWith('tools/call '));

describe('propagator tolerance', () => {
  const restore = () => {
    propagation.disable();
    propagation.setGlobalPropagator(new CompositePropagator({ propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()] }));
  };
  afterEach(restore);

  it('survives non-string baggage with a bare W3CBaggagePropagator', async () => {
    propagation.disable();
    propagation.setGlobalPropagator(new W3CBaggagePropagator());
    const result = await callTool('get_runtime_info', {}, { baggage: 42 });
    expect(result.isError).not.toBe(true);
    expect(toolSpans()).toHaveLength(1);
  });

  it('falls back to the ambient context when the propagator throws', async () => {
    propagation.disable();
    propagation.setGlobalPropagator({ inject: () => {}, fields: () => [], extract: () => { throw new Error('boom'); } });
    const result = await callTool('get_runtime_info', {}, { baggage: 42 });
    expect(result.isError).not.toBe(true);
    expect(toolSpans()).toHaveLength(1);
  });
});

describe('tools/call server span', () => {
  it('parents the span on params._meta.traceparent and records MCP attributes', async () => {
    await callTool('get_runtime_info', {}, { traceparent: TRACEPARENT });

    const [span] = toolSpans();
    expect(span.name).toBe('tools/call get_runtime_info');
    expect(span.kind).toBe(SpanKind.SERVER);
    expect(span.spanContext().traceId).toBe(TRACE_ID);
    expect(span.parentSpanContext?.spanId).toBe(PARENT_ID);
    expect(span.attributes).toMatchObject({
      'mcp.method.name': 'tools/call',
      'gen_ai.tool.name': 'get_runtime_info',
      'gen_ai.operation.name': 'execute_tool',
      'network.transport': 'pipe',
    });
    expect(typeof span.attributes['jsonrpc.request.id']).toBe('string');
    expect(span.status.code).toBe(SpanStatusCode.UNSET);
  });

  it('starts a root span when _meta carries no context', async () => {
    await callTool('get_runtime_info', {});
    const [span] = toolSpans();
    expect(span.parentSpanContext).toBeUndefined();
  });

  it('ignores malformed or non-string propagation fields instead of failing the call', async () => {
    const result = await callTool('get_runtime_info', {}, { traceparent: 'not-a-traceparent', baggage: 42, tracestate: {} });
    expect(result.isError).not.toBe(true);
    const [span] = toolSpans();
    expect(span.parentSpanContext).toBeUndefined();
  });

  it('marks an isError result as tool_error with the error message only', async () => {
    await callTool('list_workspaces', { listWorkspaces: () => Promise.reject(new Error('PAT expired')) });
    const [span] = toolSpans();
    expect(span.attributes['error.type']).toBe('tool_error');
    expect(span.status).toEqual({ code: SpanStatusCode.ERROR, message: 'PAT expired' });
  });

  it('keeps result payloads off the span when an isError result is not an error message', async () => {
    await withToolSpan('apply_workflow_spec', undefined, async () => ({
      content: [{ type: 'text', text: '{"rows":[{"secret":"x"}]}' }],
      isError: true,
    }));
    const [span] = toolSpans();
    expect(span.status).toEqual({ code: SpanStatusCode.ERROR, message: undefined });
  });

  it('records a thrown error by class and rethrows it', async () => {
    class ToolJetApiError extends Error {}
    await expect(withToolSpan('get_app', undefined, () => Promise.reject(new ToolJetApiError('Not Found')))).rejects.toThrow('Not Found');
    const [span] = toolSpans();
    expect(span.attributes['error.type']).toBe('ToolJetApiError');
    expect(span.status).toEqual({ code: SpanStatusCode.ERROR, message: 'Not Found' });
  });

  it('links the ambient HTTP span and reads HTTP-only attributes', async () => {
    const tracer = trace.getTracer('test');
    const httpSpan = tracer.startSpan('POST /mcp', { kind: SpanKind.SERVER });
    const extra = {
      _meta: { traceparent: TRACEPARENT },
      requestId: 7,
      sessionId: 'session-1',
      requestInfo: { headers: { 'mcp-protocol-version': '2025-06-18' } },
    } as unknown as ToolExtra;
    await context.with(trace.setSpan(context.active(), httpSpan), () =>
      withToolSpan('get_app', extra, async () => ({ content: [{ type: 'text', text: '{}' }] })));
    httpSpan.end();

    const [span] = toolSpans();
    expect(span.parentSpanContext?.spanId).toBe(PARENT_ID);
    expect(span.links.map((link) => link.context.spanId)).toEqual([httpSpan.spanContext().spanId]);
    expect(span.attributes).toMatchObject({
      'jsonrpc.request.id': '7',
      'mcp.session.id': 'session-1',
      'mcp.protocol.version': '2025-06-18',
      'network.transport': 'tcp',
    });
  });
});
