import { execFile, execFileSync } from 'node:child_process';
import { lstatSync, mkdtempSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
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
const deadlineMs = (): number => Number(process.env.MCP_CODE_BUILD_WORKER_TIMEOUT_MS ?? 10 * 60_000);

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
  const deadline = started + deadlineMs();
  // Every request carries the deadline: a request the service never answers is cut off by it, not waited on (review,
  // 2026-11-11: the deadline was checked only after a response came).
  const bounded = (init: RequestInit = {}): RequestInit => ({ ...init, signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())) });
  const late = () => `the build did not finish in ${Math.max(1, Math.round(deadlineMs() / 60_000))} minutes`;
  const reason = (error: unknown) =>
    error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError') ? late() : error instanceof Error ? error.message : String(error);
  const unreachable = (detail: string): ServiceBuild => ({
    code: 1,
    ms: Date.now() - started,
    output: `The build service could not build this app (${detail}). Nothing was built here: try the build again in a minute.`,
  });

  let id: string;
  try {
    const body = await packProject(dir);
    const res = await fetchImpl(`${base}/jobs?env=${env}`, bounded({ method: 'POST', headers: { ...headers, 'content-type': 'application/gzip' }, body: new Uint8Array(body) }));
    if (res.status !== 202) return unreachable(`HTTP ${res.status} ${(await res.text()).trim().slice(0, 200)}`);
    id = ((await res.json()) as { id: string }).id;
  } catch (error) {
    return unreachable(reason(error));
  }

  let job: Job | undefined;
  try {
    for (;;) {
      const res = await fetchImpl(`${base}/jobs/${id}`, bounded({ headers }));
      if (!res.ok) return unreachable(`HTTP ${res.status} reading build ${id}`);
      job = (await res.json()) as Job;
      if (job.status === 'done' || job.status === 'failed') break;
      if (Date.now() + POLL_MS > deadline) return unreachable(`build ${id}: ${late()}`);
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  } catch (error) {
    return unreachable(reason(error));
  } finally {
    // The service drops an unread result after 10 minutes anyway.
    void fetchImpl(`${base}/jobs/${id}`, { method: 'DELETE', headers }).catch(() => undefined);
  }

  const output = strip([job.output ?? '', job.error ? `\n${job.error}` : ''].join('')).trim();
  const location = [job.location?.CLOUDFLARE_REGION, job.location?.CLOUDFLARE_LOCATION].filter(Boolean).join(' ') || undefined;
  const failedCode = job.exitCode && job.exitCode > 0 ? job.exitCode : 1;
  // A build succeeds only with a passing exit status and a bundle that replaced dist/ (review, 2026-11-11: a "done" with
  // no bundle, or a failing status, was reported as built while dist/ still held the previous build).
  if (job.status !== 'done' || (job.exitCode ?? 0) !== 0) return { code: failedCode, output, location, ms: Date.now() - started };
  const refused = job.bundleTgzBase64
    ? writeDist(join(dir, 'frontend'), Buffer.from(job.bundleTgzBase64, 'base64'))
    : 'the build service sent no bundle';
  if (refused) {
    return { code: failedCode, output: `${output}\n${refused}. The previous build was kept; try the build again.`.trim(), location, ms: Date.now() - started };
  }
  return { code: 0, output, location, ms: Date.now() - started };
}

/** What a bundle entry may be: a regular file or a folder, never a link or a device (`tar -tv` type letter). */
const ENTRY = /^[-d]/;

/** Files and folders under `root` that are not plain files or folders: links, devices, sockets. */
function irregularEntries(root: string, at = root): string[] {
  return readdirSync(at, { withFileTypes: true }).flatMap((entry) => {
    const full = join(at, entry.name);
    const stat = lstatSync(full);
    if (stat.isDirectory()) return irregularEntries(root, full);
    return stat.isFile() ? [] : [full.slice(root.length + 1)];
  });
}

/**
 * Replaces frontend/dist/ with the sandbox's bundle, or returns why it would not. The bundle is made by code the app's
 * authors wrote (its build config runs in the sandbox), so it is untrusted: a link in it could make the later upload read
 * a file of this server (review, 2026-11-11). Only plain files and folders are accepted, checked in the archive listing
 * before anything is unpacked and again on disk; tar refuses absolute names and `..`. It is unpacked beside dist/ and
 * swapped in only when it passes, so a refused bundle leaves the previous build in place.
 */
function writeDist(frontend: string, tgz: Buffer): string | undefined {
  const scratch = mkdtempSync(join(tmpdir(), 'tj-dist-'));
  const incoming = mkdtempSync(join(frontend, '.dist-incoming-'));
  try {
    const file = join(scratch, 'bundle.tgz');
    writeFileSync(file, tgz);
    let listing: string;
    try {
      listing = execFileSync('tar', ['-tvzf', file], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }).toString();
    } catch {
      return 'the bundle from the build service could not be read';
    }
    const lines = listing.split('\n').filter(Boolean);
    const bad = lines.filter((line) => !ENTRY.test(line) || / link to | -> /.test(line));
    if (bad.length) return `the bundle from the build service holds ${bad.length} link(s) or special file(s), which are refused (${bad[0]!.trim().slice(0, 160)})`;
    if (!lines.some((line) => line.startsWith('-'))) return 'the bundle from the build service is empty';
    execFileSync('tar', ['-xzf', file, '-C', incoming, '--no-same-owner'], { stdio: 'pipe' });
    const irregular = irregularEntries(incoming);
    if (irregular.length) return `the bundle from the build service holds links or special files (${irregular.slice(0, 3).join(', ')}), which are refused`;
    const dist = join(frontend, 'dist');
    rmSync(dist, { recursive: true, force: true });
    renameSync(incoming, dist);
    return undefined;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
    rmSync(incoming, { recursive: true, force: true });
  }
}
