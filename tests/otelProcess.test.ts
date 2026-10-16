import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Runs the real stdio entrypoint: stdout must stay pure JSON-RPC and spans must flush on exit.
const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
const TRACEPARENT = `00-${TRACE_ID}-00f067aa0ba902b7-01`;

let collector: Server;
let collectorUrl: string;
const received: string[] = [];

beforeAll(async () => {
  collector = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      received.push(Buffer.concat(chunks).toString('utf8'));
      res.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
    });
  });
  await new Promise<void>((resolve) => collector.listen(0, '127.0.0.1', resolve));
  collectorUrl = `http://127.0.0.1:${(collector.address() as AddressInfo).port}`;
});
afterAll(() => new Promise((resolve) => collector.close(resolve)));

const messages = [
  { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } },
  { jsonrpc: '2.0', method: 'notifications/initialized' },
  { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'get_runtime_info', arguments: {}, _meta: { traceparent: TRACEPARENT } } },
];

async function runStdio(env: Record<string, string>, end: 'stdin' | 'SIGTERM' = 'stdin', settleMs = 0) {
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    env: { ...process.env, MCP_TRANSPORT: 'stdio', TOOLJET_URL: 'http://127.0.0.1:9', TOOLJET_PAT: 'unused', OTEL_LOG_LEVEL: 'all', ...env },
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.stdin.write(messages.map((m) => JSON.stringify(m)).join('\n') + '\n');
  const started = Date.now();
  while (!stdout.includes('"id":2')) {
    if (Date.now() - started > 15_000) throw new Error(`no tools/call reply. stderr: ${stderr}`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  await new Promise((resolve) => setTimeout(resolve, settleMs));
  const ended = Date.now();
  if (end === 'stdin') child.stdin.end();
  else child.kill('SIGTERM');
  const [code] = await once(child, 'exit');
  return { stdout, stderr, code, exitMs: Date.now() - ended };
}

const stdoutIsJsonRpc = (stdout: string) =>
  stdout.trim().split('\n').every((line) => JSON.parse(line).jsonrpc === '2.0');

describe('stdio process with ENABLE_OTEL', () => {
  it('keeps stdout pure JSON-RPC and flushes the tool span when stdin closes', async () => {
    received.length = 0;
    const run = await runStdio({ ENABLE_OTEL: 'true', OTEL_EXPORTER_OTLP_ENDPOINT: collectorUrl });
    expect(stdoutIsJsonRpc(run.stdout)).toBe(true);
    expect(run.stderr).toContain('tooljet-mcp otel:');
    expect(run.code).toBe(0);
    const spans = received.join('');
    expect(spans).toContain('tools/call get_runtime_info');
    expect(spans).toContain(TRACE_ID);
  }, 30_000);

  it('flushes on SIGTERM', async () => {
    received.length = 0;
    const run = await runStdio({ ENABLE_OTEL: 'true', OTEL_EXPORTER_OTLP_ENDPOINT: collectorUrl }, 'SIGTERM');
    expect(run.code).toBe(143);
    expect(received.join('')).toContain('tools/call get_runtime_info');
  }, 30_000);

  it('still answers and exits within the flush bound when the collector is down', async () => {
    const run = await runStdio({ ENABLE_OTEL: 'true', OTEL_EXPORTER_OTLP_ENDPOINT: 'http://127.0.0.1:9' });
    expect(stdoutIsJsonRpc(run.stdout)).toBe(true);
    expect(run.code).toBe(0);
    expect(run.exitMs).toBeLessThan(3000);
  }, 30_000);

  it('exits within the flush bound after stdin closes while an export is stuck in flight', async () => {
    // Unroutable: the export connects until its own timeout, which keeps beforeExit from ever firing.
    const run = await runStdio({ ENABLE_OTEL: 'true', OTEL_EXPORTER_OTLP_ENDPOINT: 'http://10.255.255.1:4318', OTEL_BSP_SCHEDULE_DELAY: '50' }, 'stdin', 500);
    expect(run.code).toBe(0);
    expect(run.exitMs).toBeLessThan(3000);
  }, 30_000);

  it('answers an in-flight tool call when the client half-closes stdin', async () => {
    const slowApi = createServer((_req, res) => {
      setTimeout(() => res.writeHead(401, { 'Content-Type': 'application/json' }).end('{"message":"nope"}'), 2000);
    });
    await new Promise<void>((resolve) => slowApi.listen(0, '127.0.0.1', resolve));
    try {
      const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
        env: {
          ...process.env, MCP_TRANSPORT: 'stdio', TOOLJET_PAT: 'unused', ENABLE_OTEL: 'true',
          TOOLJET_URL: `http://127.0.0.1:${(slowApi.address() as AddressInfo).port}`,
          OTEL_EXPORTER_OTLP_ENDPOINT: 'http://10.255.255.1:4318', OTEL_BSP_SCHEDULE_DELAY: '50',
        },
      });
      let stdout = '';
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.resume();
      const call = { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'list_workspaces', arguments: {} } };
      const started = Date.now();
      child.stdin.end([messages[0], messages[1], call].map((m) => JSON.stringify(m)).join('\n') + '\n');
      const [code] = await once(child, 'exit');
      expect(code).toBe(0);
      expect(stdoutIsJsonRpc(stdout)).toBe(true);
      expect(stdout).toContain('"id":2');
      expect(Date.now() - started).toBeLessThan(30_000);
    } finally {
      await new Promise((resolve) => slowApi.close(resolve));
    }
  }, 45_000);

  it('sends nothing and still works when ENABLE_OTEL is unset', async () => {
    received.length = 0;
    const run = await runStdio({ ENABLE_OTEL: '', OTEL_EXPORTER_OTLP_ENDPOINT: collectorUrl });
    expect(stdoutIsJsonRpc(run.stdout)).toBe(true);
    expect(run.stderr).not.toContain('tooljet-mcp otel:');
    expect(received).toEqual([]);
  }, 30_000);
});
