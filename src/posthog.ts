import { createHash, randomUUID } from 'node:crypto';
import { TOOLJET_MCP_VERSION } from './runtimeFreshness.js';
import type { ToolTelemetryMetrics } from './telemetry.js';

const BATCH_SIZE = 20;
const MAX_QUEUE_SIZE = 1000;
const FLUSH_INTERVAL_MS = 5000;
const REQUEST_TIMEOUT_MS = 2000;
const MAX_ATTEMPTS = 3;
const WARNING_INTERVAL_MS = 10 * 60_000;

type Event = {
  uuid: string;
  event: 'mcp_client_initialized' | 'mcp_tool_completed';
  distinct_id: string;
  timestamp: string;
  properties: Record<string, string | number | boolean>;
};
type PendingEvent = { event: Event; attempts: number };
export interface AnalyticsIdentity {
  connectionId: string;
  workspaceId: string;
}

/** Hash only server-verified identifiers; never derive analytics identity from credentials. */
export function analyticsIdentity(issuer: string, grantId: string, workspaceId: string): AnalyticsIdentity {
  const hash = (kind: string, value: string) =>
    createHash('sha256').update(JSON.stringify([issuer, kind, value])).digest('hex');
  return {
    connectionId: `mcp_connection_${hash('grant', grantId)}`,
    workspaceId: `mcp_workspace_${hash('workspace', workspaceId)}`,
  };
}

/** Client metadata is caller supplied. Send only recognized categories, never the raw name. */
function clientFamily(name: string): string {
  for (const family of ['claude', 'codex', 'cursor', 'grok', 'windsurf']) {
    if (new RegExp(`\\b${family}\\b`, 'i').test(name)) return family;
  }
  if (/\b(vscode|visual studio code)\b/i.test(name)) return 'vscode';
  return 'other';
}

/** Best-effort, bounded ingestion. No request waits for PostHog, and nothing is persisted to disk. */
export class PostHogAnalytics {
  private queue: PendingEvent[] = [];
  private timer?: NodeJS.Timeout;
  private inFlight?: Promise<void>;
  private shutdownPromise?: Promise<void>;
  private shutdownDeadline?: number;
  private readonly warningTimes = new Map<string, number>();
  private retryAt = 0;
  private consecutiveFailures = 0;

  constructor(
    private readonly token: string,
    private readonly host: string,
    private readonly environment: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private capture(identity: AnalyticsIdentity, event: Event['event'], properties: Event['properties']): void {
    if (this.shutdownPromise) return;
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      this.warn('queue full');
      return;
    }
    this.queue.push({
      attempts: 0,
      event: {
        uuid: randomUUID(),
        event,
        distinct_id: identity.connectionId,
        timestamp: new Date().toISOString(),
        properties: {
          ...properties,
          workspace_id: identity.workspaceId,
          environment: this.environment,
          transport: 'oauth_http',
          mcp_version: TOOLJET_MCP_VERSION,
          $process_person_profile: false,
          $geoip_disable: true,
        },
      },
    });
    if (this.queue.length >= BATCH_SIZE) void this.flush();
    else this.schedule();
  }

  initialized(identity: AnalyticsIdentity, clientName: string): void {
    this.capture(identity, 'mcp_client_initialized', { client_family: clientFamily(clientName) });
  }

  toolCompleted(identity: AnalyticsIdentity, metrics: ToolTelemetryMetrics): void {
    // Explicit allowlist: inputs, outputs, error text and credentials never reach the queue.
    this.capture(identity, 'mcp_tool_completed', {
      tool_name: metrics.tool,
      duration_ms: metrics.duration_ms,
      http_requests: metrics.http_requests,
      upstream_response_bytes: metrics.upstream_response_bytes,
      result_bytes: metrics.result_bytes,
      warnings: metrics.warnings,
      error: metrics.error,
    });
  }

  private warn(category: string): void {
    const now = Date.now();
    const previous = this.warningTimes.get(category);
    if (previous !== undefined && now - previous < WARNING_INTERVAL_MS) return;
    this.warningTimes.set(category, now);
    console.error(`tooljet-mcp: some PostHog events could not be delivered (${category}); MCP requests are unaffected.`);
  }

  private schedule(): void {
    if (this.timer || this.shutdownPromise || this.inFlight) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush();
    }, Math.min(2_147_483_647, Math.max(FLUSH_INTERVAL_MS, this.retryAt - Date.now())));
    this.timer.unref();
  }

  /** Exposed for explicit draining and deterministic collector tests. */
  flush(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (this.retryAt > Date.now()) {
      this.schedule();
      return Promise.resolve();
    }
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.queue.length) return Promise.resolve();
    this.inFlight = this.drainFullBatches().finally(() => {
      this.inFlight = undefined;
      if (this.queue.length) this.schedule();
    });
    return this.inFlight;
  }

  private async drainFullBatches(): Promise<void> {
    do {
      // Backlogs should drain at the collector's speed; a failure yields to the retry timer.
      if (!await this.sendBatch()) return;
    } while (this.queue.length >= BATCH_SIZE &&
      (!this.shutdownDeadline || Date.now() < this.shutdownDeadline));
  }

  private async sendBatch(): Promise<boolean> {
    const batch = this.queue.splice(0, BATCH_SIZE);
    let retry = false;
    let retryAfterMs = 0;
    let warning = 'network error';
    try {
      const timeout = this.shutdownDeadline
        ? Math.max(1, Math.min(REQUEST_TIMEOUT_MS, this.shutdownDeadline - Date.now()))
        : REQUEST_TIMEOUT_MS;
      const response = await this.fetchImpl(`${this.host}/batch/`, {
        method: 'POST',
        redirect: 'error',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ api_key: this.token, batch: batch.map(({ event }) => event) }),
        signal: AbortSignal.timeout(timeout),
      });
      // Do not read/log response bodies, which may echo submitted data.
      await response.body?.cancel();
      if (response.ok) {
        this.consecutiveFailures = 0;
        this.retryAt = 0;
        return true;
      }
      warning = `HTTP ${response.status}`;
      retry = response.status === 429 || response.status >= 500;
      const retryAfter = response.headers.get('retry-after')?.trim();
      if (retry && retryAfter) {
        const delay = /^\d+(?:\.\d+)?$/.test(retryAfter)
          ? Number(retryAfter) * 1000
          : Date.parse(retryAfter) - Date.now();
        if (Number.isFinite(delay)) retryAfterMs = Math.max(0, delay);
      }
    } catch {
      retry = true;
    }
    this.warn(warning);
    if (retry) {
      this.consecutiveFailures++;
      const backoff = Math.min(60_000, FLUSH_INTERVAL_MS * 2 ** Math.min(this.consecutiveFailures - 1, 4));
      this.retryAt = Date.now() + Math.max(backoff, retryAfterMs);
    }
    if (retry && (!this.shutdownDeadline || Date.now() < this.shutdownDeadline)) {
      const retryable = batch.filter((item) => ++item.attempts < MAX_ATTEMPTS);
      this.queue.push(...retryable.slice(0, Math.max(0, MAX_QUEUE_SIZE - this.queue.length)));
    }
    return false;
  }

  shutdown(): Promise<void> {
    if (!this.shutdownPromise) {
      this.shutdownDeadline = Date.now() + 5000;
      if (this.timer) clearTimeout(this.timer);
      this.timer = undefined;
      this.shutdownPromise = (async () => {
        await this.inFlight;
        while (this.queue.length && Date.now() < this.shutdownDeadline!) {
          // Never bypass collector backoff during shutdown or wait beyond our drain budget.
          const delay = this.retryAt - Date.now();
          if (delay > 0) {
            if (this.retryAt >= this.shutdownDeadline!) break;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
          await this.flush();
        }
        this.queue = [];
      })();
    }
    return this.shutdownPromise;
  }
}

/** Called only by the hosted OAuth HTTP transport; stdio/PAT plugins never initialize tracking. */
export function postHogFromEnv(): PostHogAnalytics | undefined {
  const token = process.env.POSTHOG_PROJECT_TOKEN?.trim();
  if (!token) return undefined;
  try {
    const host = new URL(process.env.POSTHOG_HOST?.trim() || '');
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(host.hostname);
    if (host.username || host.password || host.search || host.hash ||
        (host.protocol !== 'https:' && !(host.protocol === 'http:' && loopback))) throw new Error();
    return new PostHogAnalytics(
      token,
      host.href.replace(/\/$/, ''),
      process.env.POSTHOG_ENVIRONMENT?.trim() || 'unspecified',
    );
  } catch {
    console.error('tooljet-mcp: PostHog disabled; set POSTHOG_HOST to the project ingestion URL.');
    return undefined;
  }
}
