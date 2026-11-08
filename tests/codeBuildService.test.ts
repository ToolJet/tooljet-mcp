import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildInService, buildServiceUrl, packProject } from '../src/codeBuildService.js';

/*
  ToolJet cloud builds Code mode apps in the build service's sandbox: the project goes there as a job, this polls it and
  writes back dist/. A failed or unreachable service never falls back to building here.
*/

let dir: string;
const env = { ...process.env };

const bundle = (): string => {
  const src = mkdtempSync(join(tmpdir(), 'tj-bundle-src-'));
  writeFileSync(join(src, 'index.js'), 'built in the sandbox');
  writeFileSync(join(src, 'manifest.json'), '{"components":[]}');
  const out = execFileSync('tar', ['-czf', '-', '-C', src, '.']);
  rmSync(src, { recursive: true, force: true });
  return out.toString('base64');
};

/** A build service that answers from a script of job states, recording what it was sent. */
function service(states: object[]) {
  const calls: { method: string; url: string; auth: string | null; body?: Buffer }[] = [];
  let polls = 0;
  const impl = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const auth = new Headers(init?.headers).get('authorization');
    calls.push({ method, url, auth, body: init?.body ? Buffer.from(init.body as Uint8Array) : undefined });
    if (method === 'POST') return new Response(JSON.stringify({ id: 'job-1', status: 'queued' }), { status: 202 });
    if (method === 'DELETE') return Response.json({ deleted: true });
    return Response.json(states[Math.min(polls++, states.length - 1)]);
  }) as typeof fetch;
  return { impl, calls };
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tj-service-'));
  writeFileSync(join(dir, 'app.json'), '{"appId":"a"}');
  mkdirSync(join(dir, 'frontend', 'src'), { recursive: true });
  mkdirSync(join(dir, 'frontend', 'node_modules', 'left-pad'), { recursive: true });
  mkdirSync(join(dir, 'frontend', 'dist'), { recursive: true });
  mkdirSync(join(dir, '.tooljet'), { recursive: true });
  writeFileSync(join(dir, 'frontend', 'src', 'App.tsx'), 'export default 1;');
  writeFileSync(join(dir, 'frontend', 'node_modules', 'left-pad', 'index.js'), 'x');
  writeFileSync(join(dir, 'frontend', 'dist', 'index.js'), 'old local build');
  writeFileSync(join(dir, '.tooljet', 'snapshot.json'), '{"secret":"never sent"}');
  process.env.MCP_CODE_BUILD_WORKER_URL = 'https://builds.example/';
  process.env.MCP_CODE_BUILD_WORKER_TOKEN = 't0ken';
  process.env.MCP_CODE_BUILD_WORKER_POLL_MS = '1';
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  process.env = { ...env };
});

describe('the build service', () => {
  it('is used only when its URL is set', () => {
    expect(buildServiceUrl()).toBe('https://builds.example');
    delete process.env.MCP_CODE_BUILD_WORKER_URL;
    expect(buildServiceUrl()).toBeUndefined();
  });

  it('gets app.json and frontend/ only: no node_modules, no dist, no ToolJet snapshot', async () => {
    const listing = execFileSync('tar', ['-tzf', '-'], { input: await packProject(dir) }).toString();
    expect(listing).toContain('app.json');
    expect(listing).toContain('frontend/src/App.tsx');
    expect(listing).not.toContain('node_modules');
    expect(listing).not.toContain('dist');
    expect(listing).not.toContain('snapshot');
  });

  it('builds as a job, polls it, and replaces dist/ with the sandbox bundle', async () => {
    const { impl, calls } = service([
      { status: 'running' },
      { status: 'done', exitCode: 0, output: '\x1b[1;32m✓\x1b[0m TypeScript compiled (0 errors)', location: { CLOUDFLARE_REGION: 'EEUR', CLOUDFLARE_LOCATION: 'waw02' }, bundleTgzBase64: bundle() },
    ]);
    const result = await buildInService(dir, 'development', impl);
    expect(result).toMatchObject({ code: 0, output: '✓ TypeScript compiled (0 errors)', location: 'EEUR waw02' });
    expect(readFileSync(join(dir, 'frontend', 'dist', 'index.js'), 'utf8')).toBe('built in the sandbox');
    expect(calls[0]).toMatchObject({ method: 'POST', url: 'https://builds.example/jobs?env=development', auth: 'Bearer t0ken' });
    expect(calls.filter((c) => c.method === 'GET')).toHaveLength(2);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(calls.at(-1)).toMatchObject({ method: 'DELETE', url: 'https://builds.example/jobs/job-1' });
  });

  it('reports a failed build with its output and keeps the old dist/', async () => {
    const { impl } = service([{ status: 'failed', exitCode: 1, output: 'src/App.tsx:1:1 - error TS2322: nope', error: 'install failed' }]);
    const result = await buildInService(dir, 'production', impl);
    expect(result.code).toBe(1);
    expect(result.output).toContain('error TS2322');
    expect(result.output).toContain('install failed');
    expect(readFileSync(join(dir, 'frontend', 'dist', 'index.js'), 'utf8')).toBe('old local build');
  });

  it('fails closed when the service cannot be reached: nothing is built here', async () => {
    const down = (async () => {
      throw new Error('connect ECONNREFUSED');
    }) as typeof fetch;
    const result = await buildInService(dir, 'production', down);
    expect(result.code).toBe(1);
    expect(result.output).toContain('The build service could not build this app (connect ECONNREFUSED)');
    expect(existsSync(join(dir, 'frontend', 'dist', 'index.js'))).toBe(true);
  });

  it('fails closed on a refused job', async () => {
    const refused = (async () => new Response('unauthorized\n', { status: 401 })) as typeof fetch;
    const result = await buildInService(dir, 'production', refused);
    expect(result).toMatchObject({ code: 1 });
    expect(result.output).toContain('HTTP 401 unauthorized');
  });
});
