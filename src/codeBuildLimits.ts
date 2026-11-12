import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/*
  Builds and installs on one host, across every MCP process: each conversation has its own process, so a limit kept in
  memory multiplies with them. A slot is a file made with O_EXCL under <root>/.slots, naming the process that holds it.
  One left by a process that died, or older than any CLI call may run, is taken over.
*/
const positive = (name: string, fallback: number): number => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};
const MAX_SLOT_AGE_MS = 10 * 60_000;
const POLL_MS = 250;

const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
};

const stale = (file: string): boolean => {
  try {
    if (Date.now() - statSync(file).mtimeMs > MAX_SLOT_AGE_MS) return true;
    return !alive(Number(readFileSync(file, 'utf8')));
  } catch {
    return false; // being released right now: it is not ours to take yet
  }
};

/** One slot of `prefix`-0 ... -(limit-1), or undefined when all are held. */
const take = (dir: string, prefix: string, limit: number): string | undefined => {
  for (let i = 0; i < limit; i++) {
    const file = join(dir, `${prefix}-${i}`);
    if (existsSync(file) && stale(file)) rmSync(file, { force: true });
    try {
      const fd = openSync(file, 'wx');
      writeFileSync(fd, String(process.pid));
      closeSync(fd);
      return file;
    } catch {
      /* held */
    }
  }
  return undefined;
};

export class BuildCapacityError extends Error {}

/** Runs `work` holding a global slot and one of the workspace's, waiting for them up to MCP_CODE_BUILD_WAIT_MS. */
export async function withBuildSlot<T>(root: string, workspaceId: string, work: () => Promise<T>): Promise<T> {
  const dir = join(root, '.slots');
  mkdirSync(dir, { recursive: true });
  const globalLimit = positive('MCP_CODE_BUILD_MAX_GLOBAL', 6);
  const workspaceLimit = positive('MCP_CODE_BUILD_MAX_WORKSPACE', 3);
  const deadline = Date.now() + positive('MCP_CODE_BUILD_WAIT_MS', 180_000);
  const release: string[] = [];
  try {
    for (;;) {
      const mine = take(dir, `ws-${workspaceId}`, workspaceLimit);
      const shared = mine && take(dir, 'global', globalLimit);
      if (mine && shared) {
        release.push(mine, shared);
        break;
      }
      if (mine) rmSync(mine, { force: true });
      if (Date.now() >= deadline) throw new BuildCapacityError('Too many builds are running on this server right now. Try again in a minute.');
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
    return await work();
  } finally {
    for (const file of release) rmSync(file, { force: true });
  }
}

const LAST_USED = '.tooljet-last-used';
const CLEAN_MARKER = '.last-cleanup';
const HOME_PREFIX = 'tj-code-home-';

/** Marks a project in use: cleanup goes by this, since a build can leave every file it reads untouched. */
export function touchProject(dir: string): void {
  const file = join(dir, LAST_USED);
  const now = new Date();
  try {
    utimesSync(file, now, now);
  } catch {
    try {
      writeFileSync(file, '');
    } catch {
      /* a project that cannot be marked is only cleaned up sooner; ToolJet stores its code */
    }
  }
}

const lastUsed = (dir: string): number => {
  for (const name of [LAST_USED, 'app.json']) {
    try {
      return statSync(join(dir, name)).mtimeMs;
    } catch {
      /* try the next */
    }
  }
  return statSync(dir).mtimeMs;
};

/**
 * Removes project folders no build has used for MCP_CODE_PROJECT_TTL_DAYS (default 14; 0 turns this off), at most once an
 * hour, and CLI home folders of past processes. ToolJet stores the code: the next edit scaffolds and pulls it again.
 */
export function cleanOldProjects(root: string): void {
  const days = Number(process.env.MCP_CODE_PROJECT_TTL_DAYS ?? 14);
  if (!(days > 0) || !existsSync(root)) return;
  const marker = join(root, CLEAN_MARKER);
  try {
    if (Date.now() - statSync(marker).mtimeMs < 3_600_000) return;
  } catch {
    /* never ran */
  }
  writeFileSync(marker, '');
  const oldest = Date.now() - days * 86_400_000;
  const isProject = (dir: string) => existsSync(join(dir, 'app.json'));
  // Projects sit at <root>/d_<deployment>/<workspace>/<name>, or at the older <root>/<workspace>/<name> and <root>/<name>.
  const projects = (dir: string, depth: number): string[] => {
    if (isProject(dir)) return [dir];
    if (depth === 0) return [];
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .flatMap((e) => projects(join(dir, e.name), depth - 1));
  };
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const dir = join(root, entry.name);
    for (const project of projects(dir, entry.name.startsWith('d_') ? 2 : 1)) {
      if (lastUsed(project) < oldest) rmSync(project, { recursive: true, force: true });
    }
  }
  for (const entry of readdirSync(tmpdir(), { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith(HOME_PREFIX)) continue;
    const dir = join(tmpdir(), entry.name);
    if (Date.now() - statSync(dir).mtimeMs > 86_400_000) rmSync(dir, { recursive: true, force: true });
  }
}

export const CLI_HOME_PREFIX = HOME_PREFIX;
