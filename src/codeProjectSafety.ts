/*
  What keeps a Code mode project's files inside the project, and its installs on the registry.

  A project's package.json and lockfile come from ToolJet's stored code, which any editor of the app can change. A
  `file:` dependency there made the install link frontend/node_modules/<name> to any folder on the host (another
  workspace's project, /), and a lexical path check let code_app_read_files read through that link. So:

  - every read and write resolves real paths and stays inside the project's real folder, and no part of a path the
    tools touch may be a symbolic link (a link inside node_modules is never followed);
  - nothing may be written under a node_modules folder or a dot folder in the source: esbuild resolves a bare import
    from the nearest node_modules, while the security scan and the stored code skip both, so such a package shipped
    unscanned and invisible;
  - before any install, every dependency spec must be a registry version or range (no file:, link:, git, URL, GitHub
    shorthand, alias or workspace), and every lockfile entry must resolve from the configured registry over https (or
    the configured registry's own origin);
  - after an install, no link in node_modules may lead out of the project.

  The server and the CLI apply the same dependency rule on their side; this is the MCP's own check, before it asks
  the CLI to install anything.
*/
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

const DEFAULT_REGISTRY = 'https://registry.npmjs.org/';

/** The real path of `target` (or of its nearest existing ancestor, joined with the rest), without following a link in the rest. */
function realOrNearest(target: string): string {
  let at = target;
  const rest: string[] = [];
  for (;;) {
    try {
      return join(realpathSync(at), ...rest.reverse());
    } catch {
      const parent = dirname(at);
      if (parent === at) return target;
      rest.push(at.slice(parent.length).replace(/^[\\/]+/, ''));
      at = parent;
    }
  }
}

const isInside = (base: string, target: string): boolean => {
  const rel = relative(base, target);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
};

/**
 * The full path of `path` in the project at `dir`, when it is inside the project's real folder and no existing part of
 * it below the project is a symbolic link; throws otherwise. `label` is how the refusal names the path.
 */
export function insideProject(dir: string, path: string, label = path): string {
  const full = resolve(dir, path);
  if (!isInside(resolve(dir), full)) throw new Error(`"${label}" is outside the project`);
  const parts = relative(resolve(dir), full).split(sep).filter(Boolean);
  let at = resolve(dir);
  for (const part of parts) {
    at = join(at, part);
    let linked = false;
    try {
      linked = lstatSync(at).isSymbolicLink();
    } catch {
      break; // the rest does not exist yet
    }
    if (linked) throw new Error(`"${label}" goes through a link (${relative(dir, at).split(sep).join('/')}), which these tools never follow`);
  }
  if (!isInside(realOrNearest(resolve(dir)), realOrNearest(full))) throw new Error(`"${label}" is outside the project`);
  return full;
}

/** Path segments a written file may not have below frontend/: node_modules (shadow packages) and dot folders or files. */
export function unstoredSegment(rel: string): string | undefined {
  return rel.split('/').find((part) => part === 'node_modules' || part.startsWith('.'));
}

/**
 * Entries under frontend/src and frontend/styles that the stored code and the security scan skip but the bundler
 * would include: node_modules folders and dot entries. Relative to the project, '/' separators.
 */
export function unstoredSourceEntries(dir: string): string[] {
  const found: string[] = [];
  const walk = (at: string): void => {
    if (!existsSync(at)) return;
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const full = join(at, entry.name);
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) found.push(relative(dir, full).split(sep).join('/'));
      else if (entry.isDirectory()) walk(full);
    }
  };
  walk(join(dir, 'frontend', 'src'));
  walk(join(dir, 'frontend', 'styles'));
  return found.sort();
}

/** Remove what unstoredSourceEntries found: it is never stored or scanned, so it is nobody's saved work. */
export function removeUnstoredSource(dir: string): string[] {
  const found = unstoredSourceEntries(dir);
  for (const rel of found) rmSync(join(dir, rel), { recursive: true, force: true });
  return found;
}

/* npm-package-arg's own tests for a spec that is not a registry one: a path (., /, ~/, a drive letter), a tarball
   file name, or anything with a protocol, a slash (GitHub shorthand, URLs) or a hash (git committish). */
const PATH_SPEC = /^(?:\.|~[\\/]|[\\/]|[a-zA-Z]:)/;
const TARBALL = /\.(?:tgz|tar\.gz|tar)$/i;
const REGISTRY_SPEC = /^[A-Za-z0-9.^~<>=*|+ -]*$/;

/** Why a dependency spec is not a plain registry version, range or tag, or undefined when it is one. */
export function nonRegistrySpec(spec: unknown): string | undefined {
  if (typeof spec !== 'string') return 'it is not a version';
  const value = spec.trim();
  if (PATH_SPEC.test(value)) return 'it is a local path';
  if (TARBALL.test(value)) return 'it is a tarball file';
  if (/[:/\\#@]/.test(value)) return 'it is not a registry version (file:, link:, git, URL, GitHub, alias or workspace specs are refused)';
  if (!REGISTRY_SPEC.test(value)) return 'it is not a registry version or range';
  return undefined;
}

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'] as const;

/** The configured registry: npm_config_registry, else the public npm registry. Always ends in '/'. */
export function configuredRegistry(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.npm_config_registry || env.NPM_CONFIG_REGISTRY || DEFAULT_REGISTRY;
  return raw.endsWith('/') ? raw : `${raw}/`;
}

/** Why a lockfile `resolved` URL does not point at the configured registry, or undefined when it does. */
export function foreignResolved(resolved: unknown, registry = configuredRegistry()): string | undefined {
  if (typeof resolved !== 'string') return 'it has no download URL';
  let url: URL;
  let reg: URL;
  try {
    url = new URL(resolved);
    reg = new URL(registry);
  } catch {
    return `it downloads from "${resolved.slice(0, 120)}", which is not a URL`;
  }
  if (url.username || url.password) return 'its download URL carries credentials';
  // The registry's own origin and path; https unless the configured registry itself is plain http (a local mirror).
  // npm fetches registry.npmjs.org URLs from the configured registry (replace-registry-host), so those pass too.
  const sameRegistry = url.origin === reg.origin && url.pathname.startsWith(reg.pathname);
  const publicRegistry = url.protocol === 'https:' && url.host === 'registry.npmjs.org';
  if (!sameRegistry && !publicRegistry) return `it downloads from ${url.origin}, not the configured registry (${reg.origin})`;
  if (publicRegistry) return undefined;
  if (url.protocol !== 'https:' && reg.protocol !== url.protocol) return 'it downloads over plain http';
  return undefined;
}

type Lock = {
  packages?: Record<string, { resolved?: unknown; link?: unknown; version?: unknown; dependencies?: Record<string, unknown> }>;
  dependencies?: Record<string, { resolved?: unknown; version?: unknown; dependencies?: Lock['dependencies'] }>;
};

/**
 * Why frontend/package.json or its lockfile may not be installed, one line each; empty when both are plain registry
 * dependencies from the configured registry. Read with insideProject, so a linked manifest is refused too.
 */
export function dependencyProblems(dir: string, registry = configuredRegistry()): string[] {
  return [...manifestProblems(dir), ...lockfileProblems(dir, registry)];
}

/** dependencyProblems for frontend/package.json alone. */
export function manifestProblems(dir: string): string[] {
  const problems: string[] = [];
  const manifest = insideProject(dir, 'frontend/package.json');
  if (!existsSync(manifest)) return problems;
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(readFileSync(manifest, 'utf8'));
  } catch {
    return ['frontend/package.json is not valid JSON'];
  }
  for (const field of DEPENDENCY_FIELDS) {
    const deps = pkg[field];
    if (!deps || typeof deps !== 'object') continue;
    for (const [name, spec] of Object.entries(deps as Record<string, unknown>)) {
      const why = nonRegistrySpec(spec);
      if (why) problems.push(`frontend/package.json ${field} "${name}": "${String(spec).slice(0, 120)}": ${why}`);
    }
  }
  if (pkg.workspaces !== undefined) problems.push('frontend/package.json declares workspaces, which install other folders');
  for (const field of ['overrides', 'resolutions']) {
    const walk = (value: unknown, at: string): void => {
      if (typeof value === 'string') {
        const why = value.startsWith('$') ? undefined : nonRegistrySpec(value);
        if (why) problems.push(`frontend/package.json ${field} ${at}: "${value.slice(0, 120)}": ${why}`);
      } else if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) walk(child, at ? `${at} > ${key}` : key);
      }
    };
    walk(pkg[field], '');
  }
  return problems;
}

/** dependencyProblems for the lockfiles alone. */
export function lockfileProblems(dir: string, registry = configuredRegistry()): string[] {
  const problems: string[] = [];
  for (const name of ['package-lock.json', 'npm-shrinkwrap.json']) {
    const file = insideProject(dir, `frontend/${name}`);
    if (!existsSync(file)) continue;
    let lock: Lock;
    try {
      lock = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      problems.push(`frontend/${name} is not valid JSON`);
      continue;
    }
    for (const [key, entry] of Object.entries(lock.packages ?? {})) {
      if (key === '') continue;
      if (!/^node_modules\/(?:@[^/]+\/)?[^/]+(?:\/node_modules\/(?:@[^/]+\/)?[^/]+)*$/.test(key)) {
        problems.push(`frontend/${name} entry "${key.slice(0, 120)}" is not an installed package (a linked folder)`);
        continue;
      }
      if (entry?.link) {
        problems.push(`frontend/${name} entry "${key.slice(0, 120)}" is a link to a folder`);
        continue;
      }
      const why = entry?.resolved === undefined ? undefined : foreignResolved(entry.resolved, registry);
      if (why) problems.push(`frontend/${name} entry "${key.slice(0, 120)}": ${why}`);
    }
    const walkV1 = (deps: Lock['dependencies'], at: string): void => {
      for (const [dep, entry] of Object.entries(deps ?? {})) {
        const where = at ? `${at} > ${dep}` : dep;
        const version = typeof entry?.version === 'string' ? entry.version : '';
        if (/^(file|link|git|github|http|https):|^\.|\//.test(version)) problems.push(`frontend/${name} dependency "${where}" is "${version.slice(0, 120)}", not a registry package`);
        else if (entry?.resolved !== undefined) {
          const why = foreignResolved(entry.resolved, registry);
          if (why) problems.push(`frontend/${name} dependency "${where}": ${why}`);
        }
        walkV1(entry?.dependencies, where);
      }
    };
    if (!lock.packages) walkV1(lock.dependencies, '');
  }
  return [...new Set(problems)];
}

/** The refusal for dependencyProblems, or undefined when there are none. */
export function dependencyRefusal(dir: string, what: string): Error | undefined {
  const problems = dependencyProblems(dir);
  if (!problems.length) return undefined;
  return new Error(
    `${what} was refused: the app's dependencies must all be registry packages from the configured registry.\n` +
      problems.slice(0, 20).map((p) => `- ${p}`).join('\n') +
      (problems.length > 20 ? `\n- and ${problems.length - 20} more` : '') +
      '\nRemove these packages with code_app_add_dependency (remove), or pin each to a registry version.'
  );
}

/**
 * Links in frontend/node_modules (top level and scoped) that lead out of the project, relative to the project. The
 * SDK the server configures (TOOLJET_SDK_SPEC as a file: path) is the one link allowed out, for CLIs that still link it.
 */
export function escapingLinks(dir: string): string[] {
  const modules = join(dir, 'frontend', 'node_modules');
  if (!existsSync(modules)) return [];
  let base: string;
  try {
    base = realpathSync(dir);
  } catch {
    return [];
  }
  const sdk = (process.env.TOOLJET_SDK_SPEC ?? '').replace(/^file:/, '');
  let sdkReal: string | undefined;
  try {
    sdkReal = sdk ? realpathSync(sdk) : undefined;
  } catch {
    sdkReal = undefined;
  }
  const out: string[] = [];
  const check = (full: string): void => {
    let link = false;
    try {
      link = lstatSync(full).isSymbolicLink();
    } catch {
      return;
    }
    if (!link) return;
    let target: string;
    try {
      target = realpathSync(full);
    } catch {
      return; // a dangling link reads as nothing
    }
    if (isInside(base, target) || (sdkReal && target === sdkReal)) return;
    out.push(relative(dir, full).split(sep).join('/'));
  };
  for (const entry of readdirSync(modules, { withFileTypes: true })) {
    const full = join(modules, entry.name);
    if (entry.name.startsWith('@') && entry.isDirectory()) {
      for (const child of readdirSync(full)) check(join(full, child));
    } else {
      check(full);
    }
  }
  return out.sort();
}

/** After an install: remove links out of the project and say so, or undefined when there were none. */
export function removeEscapingLinks(dir: string): Error | undefined {
  const links = escapingLinks(dir);
  if (!links.length) return undefined;
  for (const rel of links) rmSync(join(dir, rel), { force: true });
  return new Error(
    `The install linked ${links.join(', ')} to a folder outside the project; ${links.length > 1 ? 'those links were' : 'that link was'} removed. ` +
      'Only registry packages may be installed.'
  );
}

/*
  The marker a build leaves while it has written to the project and not yet installed: the first pull of a build
  takes ToolJet's code over the local copy only when no such marker exists, so a retry after a failed pull, a second
  build on the same app or a restart of this server never replaces writes nobody has stored yet. In .tooljet/, which
  is never stored, scanned or bundled.
*/
const WRITES_MARKER = join('.tooljet', 'agent-writes.json');

export function markAgentWrites(dir: string): void {
  try {
    mkdirSync(join(dir, '.tooljet'), { recursive: true });
    writeFileSync(join(dir, WRITES_MARKER), JSON.stringify({ at: new Date().toISOString(), pid: process.pid }) + '\n');
  } catch {
    /* a project that cannot be marked: the in-process record still stands */
  }
}

/**
 * Whether a build wrote to the project and has not installed since. Writes left uninstalled for longer than
 * MCP_CODE_WRITES_MARKER_TTL_MS (default 6 hours) count as an abandoned build: the next first pull may replace them, and
 * the CLI keeps a copy in .tooljet/before-pull.
 */
export const hasAgentWrites = (dir: string): boolean => {
  const ttl = Number(process.env.MCP_CODE_WRITES_MARKER_TTL_MS ?? 6 * 3_600_000);
  const at = statSync(join(dir, WRITES_MARKER), { throwIfNoEntry: false })?.mtimeMs;
  return at !== undefined && (!(ttl > 0) || Date.now() - at < ttl);
};

export function clearAgentWrites(dir: string): void {
  rmSync(join(dir, WRITES_MARKER), { force: true });
}

/** The copies the CLI keeps of files a forced pull replaced (.tooljet/before-pull), newest first. */
export function beforePullCopies(dir: string): string[] {
  const folder = join(dir, '.tooljet', 'before-pull');
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ name: entry.name, at: statSync(join(folder, entry.name)).mtimeMs }))
    .sort((a, b) => b.at - a.at || (a.name < b.name ? 1 : -1))
    .map((entry) => `.tooljet/before-pull/${entry.name}`);
}

/** Keep the newest `keep` copies; returns the ones kept. */
export function pruneBeforePull(dir: string, keep = 3): string[] {
  const copies = beforePullCopies(dir);
  for (const old of copies.slice(keep)) rmSync(join(dir, old), { recursive: true, force: true });
  return copies.slice(0, keep);
}

/*
  One tool call at a time per project, across processes: two builds on one app share its folder (a slot allows 3 per
  workspace), and one build's pull or install must not run in the middle of the other's write. A mkdir lock beside the
  projects, released when the call ends; a lock whose process is gone, or older than MCP_CODE_PROJECT_LOCK_STALE_MS
  (default 30 minutes), is taken over.
*/
const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
};

export class ProjectBusyError extends Error {}

export async function withProjectLock<T>(lock: string, work: () => Promise<T>, { waitMs, pollMs = 100 }: { waitMs?: number; pollMs?: number } = {}): Promise<T> {
  const wait = waitMs ?? Number(process.env.MCP_CODE_PROJECT_LOCK_WAIT_MS ?? 600_000);
  const stale = Number(process.env.MCP_CODE_PROJECT_LOCK_STALE_MS ?? 1_800_000);
  const deadline = Date.now() + wait;
  mkdirSync(dirname(lock), { recursive: true });
  const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  for (;;) {
    try {
      mkdirSync(lock);
      writeFileSync(join(lock, 'owner'), JSON.stringify({ pid: process.pid, at: Date.now(), token }));
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      let owner: { pid?: number; at?: number } = {};
      try {
        owner = JSON.parse(readFileSync(join(lock, 'owner'), 'utf8'));
      } catch {
        owner = { at: statSync(lock, { throwIfNoEntry: false })?.mtimeMs };
      }
      const gone = (owner.pid !== undefined && owner.pid !== process.pid && !alive(owner.pid)) ||
        (owner.at !== undefined && Date.now() - owner.at > stale);
      if (gone) {
        rmSync(lock, { recursive: true, force: true });
        continue;
      }
      if (Date.now() >= deadline) {
        throw new ProjectBusyError("Another build is working on this app's code right now, so nothing was done. Try again in a minute.");
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
  }
  try {
    return await work();
  } finally {
    try {
      const owner = JSON.parse(readFileSync(join(lock, 'owner'), 'utf8'));
      if (owner.token === token) rmSync(lock, { recursive: true, force: true });
    } catch {
      /* already taken over or removed */
    }
  }
}
