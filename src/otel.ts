import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { diag, DiagLogLevel, propagation, type Context, type DiagLogger } from '@opentelemetry/api';
import { CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator } from '@opentelemetry/core';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor, type Span, type SpanProcessor, type ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { defaultResource, detectResources, envDetector, resourceFromAttributes } from '@opentelemetry/resources';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { TOOLJET_MCP_VERSION } from './runtimeFreshness.js';
import { USER_AGENT } from './tracing.js';

// stdout is the stdio MCP channel: every OTel log line goes to stderr.
const toStderr = (...args: unknown[]): void => {
  process.stderr.write(`tooljet-mcp otel: ${args.map(String).join(' ')}\n`);
};
const stderrLogger: DiagLogger = { error: toStderr, warn: toStderr, info: toStderr, debug: toStderr, verbose: toStderr };

const CONVERSATION_ID_MAX = 128;

// Same allowlist as the ToolJet server: origin is exactly 'ai'; conversation id is a metrics label, so capped.
export class BaggageAttributeProcessor implements SpanProcessor {
  onStart(span: Span, parentContext: Context): void {
    const baggage = propagation.getBaggage(parentContext);
    const origin = baggage?.getEntry('tooljet.origin')?.value;
    if (origin === 'ai') span.setAttribute('tooljet.origin', origin);
    const conversationId = baggage?.getEntry('gen_ai.conversation.id')?.value;
    if (conversationId) span.setAttribute('gen_ai.conversation.id', conversationId.slice(0, CONVERSATION_ID_MAX));
  }
  onEnd(_span: ReadableSpan): void {}
  forceFlush(): Promise<void> { return Promise.resolve(); }
  shutdown(): Promise<void> { return Promise.resolve(); }
}

let provider: NodeTracerProvider | undefined;

export function startOtel(): void {
  const level = process.env.OTEL_LOG_LEVEL?.toUpperCase();
  if (level) diag.setLogger(stderrLogger, DiagLogLevel[level as keyof typeof DiagLogLevel] ?? DiagLogLevel.INFO);

  provider = new NodeTracerProvider({
    // env (OTEL_SERVICE_NAME, OTEL_RESOURCE_ATTRIBUTES) wins over the defaults.
    resource: defaultResource()
      .merge(resourceFromAttributes({
        'service.name': 'tooljet-mcp',
        'service.version': TOOLJET_MCP_VERSION,
        'service.instance.id': randomUUID(),
      }))
      .merge(detectResources({ detectors: [envDetector] })),
    spanProcessors: [
      new BaggageAttributeProcessor(),
      new BatchSpanProcessor(new OTLPTraceExporter()),
    ],
  });
  provider.register({
    propagator: new CompositePropagator({ propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()] }),
  });
  registerInstrumentations({
    instrumentations: [
      // Context only to callers that name us (ToolJet API); never to third-party URLs.
      new UndiciInstrumentation({ ignoreRequestHook: (request) => !String(request.headers).includes(USER_AGENT) }),
      new HttpInstrumentation({ disableOutgoingRequestInstrumentation: true }),
    ],
  });
  // RITM patches http on the next require; the bundle's ESM `import 'node:http'` never triggers it.
  createRequire(import.meta.url)('node:http');
}

/** Flush and stop. Bounded: a dead collector must not hold the process open. */
export async function shutdownOtel(timeoutMs = 1000): Promise<void> {
  const current = provider;
  provider = undefined;
  if (!current) return;
  let timer: NodeJS.Timeout | undefined;
  await Promise.race([
    current.shutdown().catch(() => {}),
    new Promise<void>((resolve) => { timer = setTimeout(resolve, timeoutMs); }),
  ]);
  clearTimeout(timer);
}
