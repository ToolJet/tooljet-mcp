import { execFile, execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

/*
  Code mode builds in a sandbox (ToolJet cloud). With MCP_CODE_BUILD_WORKER_URL set, a build of an app's code (its
  dependency install and the bundler, which loads the project's build config and so runs code the app's authors wrote)
  never runs on this server: the project goes to the build service, which builds it in a fresh microVM with no secrets
  and no network but the npm registry, and sends back dist/. Unset (self-hosted), builds run here as before.

  The service takes a job and answers at once; this polls it, so no request is held open for a build's length.
  Nothing from ToolJet crosses: no credential, no snapshot, only app.json and frontend/ without node_modules or dist.
*/

export type BuildEnv = 'production' | 'development';

export interface ServiceBuild {
  code: number;
  output: string;
  /** Where the job ran, for the build result. */
  location?: string;
  ms: number;
}

interface Job {
  status: 'queued' | 'running' | 'done' | 'failed';
  exitCode?: number;
  output?: string;
  error?: string;
  cliVersion?: string;
  location?: { CLOUDFLARE_LOCATION?: string; CLOUDFLARE_REGION?: string };
  bundleTgzBase64?: string;
}

export const buildServiceUrl = (): string | undefined => process.env.MCP_CODE_BUILD_WORKER_URL?.trim().replace(/\/+$/, '') || undefined;

const POLL_MS = Number(process.env.MCP_CODE_BUILD_WORKER_POLL_MS ?? 1500);
const DEADLINE_MS = Number(process.env.MCP_CODE_BUILD_WORKER_TIMEOUT_MS ?? 10 * 60_000);

const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

/** The project as the service builds it: app.json and frontend/, never node_modules, dist or anything else. */
export async function packProject(dir: string): Promise<Buffer> {
  const { stdout } = await run(
    'tar',
    ['-czf', '-', '--exclude=node_modules', '--exclude=frontend/dist', '-C', dir, 'app.json', 'frontend'],
    { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024, env: { PATH: process.env.PATH ?? '/usr/bin:/bin', COPYFILE_DISABLE: '1' } }
  );
  return stdout as unknown as Buffer;
}

/**
 * Builds the project in the sandbox: `tooljet app install --frozen`, then `tooljet library build --env <env>`. On
 * success dist/ is replaced with the sandbox's. The result reads like a local `library build` (its output, exit code).
 */
export async function buildInService(dir: string, env: BuildEnv, fetchImpl: typeof fetch = fetch): Promise<ServiceBuild> {
  const base = buildServiceUrl();
  if (!base) throw new Error('MCP_CODE_BUILD_WORKER_URL is not set');
  const token = process.env.MCP_CODE_BUILD_WORKER_TOKEN ?? '';
  const headers = { authorization: `Bearer ${token}` };
  const started = Date.now();
  const unreachable = (detail: string): ServiceBuild => ({
    code: 1,
    ms: Date.now() - started,
    output: `The build service could not build this app (${detail}). Nothing was built here: try the build again in a minute.`,
  });

  let id: string;
  try {
    const body = await packProject(dir);
    const res = await fetchImpl(`${base}/jobs?env=${env}`, { method: 'POST', headers: { ...headers, 'content-type': 'application/gzip' }, body: new Uint8Array(body) });
    if (res.status !== 202) return unreachable(`HTTP ${res.status} ${(await res.text()).trim().slice(0, 200)}`);
    id = ((await res.json()) as { id: string }).id;
  } catch (error) {
    return unreachable(error instanceof Error ? error.message : String(error));
  }

  let job: Job | undefined;
  try {
    for (;;) {
      const res = await fetchImpl(`${base}/jobs/${id}`, { headers });
      if (!res.ok) return unreachable(`HTTP ${res.status} reading build ${id}`);
      job = (await res.json()) as Job;
      if (job.status === 'done' || job.status === 'failed') break;
      if (Date.now() - started > DEADLINE_MS) return unreachable(`build ${id} did not finish in ${Math.round(DEADLINE_MS / 60_000)} minutes`);
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  } catch (error) {
    return unreachable(error instanceof Error ? error.message : String(error));
  } finally {
    // The service drops an unread result after 10 minutes anyway.
    void fetchImpl(`${base}/jobs/${id}`, { method: 'DELETE', headers }).catch(() => undefined);
  }

  const output = strip([job.output ?? '', job.error ? `\n${job.error}` : ''].join('')).trim();
  const location = [job.location?.CLOUDFLARE_REGION, job.location?.CLOUDFLARE_LOCATION].filter(Boolean).join(' ') || undefined;
  if (job.status === 'done' && job.bundleTgzBase64) {
    writeDist(join(dir, 'frontend', 'dist'), Buffer.from(job.bundleTgzBase64, 'base64'));
  }
  return { code: job.status === 'done' ? 0 : (job.exitCode && job.exitCode > 0 ? job.exitCode : 1), output, location, ms: Date.now() - started };
}

/** Replaces dist/ with the sandbox's bundle. tar refuses absolute names and `..`; the folder is emptied first. */
function writeDist(dist: string, tgz: Buffer): void {
  const scratch = mkdtempSync(join(tmpdir(), 'tj-dist-'));
  try {
    const file = join(scratch, 'bundle.tgz');
    writeFileSync(file, tgz);
    rmSync(dist, { recursive: true, force: true });
    mkdirSync(dist, { recursive: true });
    execFileSync('tar', ['-xzf', file, '-C', dist, '--no-same-owner'], { stdio: 'pipe' });
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

