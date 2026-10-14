import { context, propagation, trace, SpanKind, SpanStatusCode, type Attributes, type Link } from '@opentelemetry/api';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { ToolResult } from './tools/types.js';
import { TOOLJET_MCP_VERSION } from './runtimeFreshness.js';

// Semconv names (GenAI/MCP, Development status). Keep here so renames are one edit.
export const USER_AGENT = `tooljet-mcp/${TOOLJET_MCP_VERSION}`;
export const BAGGAGE_ATTRIBUTE_KEYS: ReadonlySet<string> = new Set(['tooljet.origin', 'gen_ai.conversation.id']);
const STATUS_MESSAGE_MAX = 256;

export type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

const tracer = trace.getTracer('tooljet-mcp', TOOLJET_MCP_VERSION);

// fail() writes "Error: <message>"; anything else is a result payload and stays off the span.
function toolErrorMessage(result: ToolResult): string | undefined {
  const text = result.content?.[0]?.text ?? '';
  return text.startsWith('Error: ') ? text.slice(7, 7 + STATUS_MESSAGE_MAX) : undefined;
}

/** `tools/call {tool}` SERVER span. Parent: `_meta` context; ambient (HTTP) span becomes a link. */
export function withToolSpan(tool: string, extra: ToolExtra | undefined, run: () => Promise<ToolResult>): Promise<ToolResult> {
  const ambient = context.active();
  const ambientSpan = trace.getSpanContext(ambient);
  // SEP-414: unprefixed traceparent/tracestate/baggage in params._meta. Bad values are ignored by the W3C extractors.
  let parent = ambient;
  try {
    parent = propagation.extract(ambient, extra?._meta ?? {});
  } catch {
    // malformed propagation fields must never fail the tool call
  }
  const parentSpan = trace.getSpanContext(parent);
  const links: Link[] = ambientSpan && parentSpan !== ambientSpan ? [{ context: ambientSpan }] : [];

  const headers = extra?.requestInfo?.headers;
  const protocolVersion = headers?.['mcp-protocol-version'];
  const attributes: Attributes = {
    'mcp.method.name': 'tools/call',
    'gen_ai.tool.name': tool,
    'gen_ai.operation.name': 'execute_tool',
    'network.transport': headers ? 'tcp' : 'pipe',
  };
  if (extra?.requestId !== undefined && extra.requestId !== null) attributes['jsonrpc.request.id'] = String(extra.requestId);
  if (extra?.sessionId) attributes['mcp.session.id'] = extra.sessionId;
  if (typeof protocolVersion === 'string') attributes['mcp.protocol.version'] = protocolVersion;

  return tracer.startActiveSpan(`tools/call ${tool}`, { kind: SpanKind.SERVER, attributes, links }, parent, async (span) => {
    try {
      const result = await run();
      if (result.isError) {
        span.setAttribute('error.type', 'tool_error');
        span.setStatus({ code: SpanStatusCode.ERROR, message: toolErrorMessage(result) });
      }
      return result;
    } catch (err) {
      span.setAttribute('error.type', err instanceof Error ? err.constructor.name : 'Error');
      span.setStatus({ code: SpanStatusCode.ERROR, message: (err instanceof Error ? err.message : String(err)).slice(0, STATUS_MESSAGE_MAX) });
      throw err;
    } finally {
      span.end();
    }
  });
}
