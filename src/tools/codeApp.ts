import { z } from 'zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { ok, fail, type ToolDef } from './types.js';
import type { ToolJetClient } from '../tooljetClient.js';

/*
  Code pages: a ToolJet app page whose whole UI is React code, kept in an app project (app.json + frontend/) and built
  with the ToolJet CLI (`tooljet app ...`). These tools give an agent the developer's loop:

    code_app_scaffold     tooljet app init, linked to an app the agent created (create_app), then typed hooks (pull)
    code_app_read_files   read app.json and frontend/src
    code_app_write_files  write app.json, frontend/src and frontend/styles/{theme,global}.css
    code_app_build        refresh typed hooks from the app's queries, build, and check the code against the app
    code_app_install      tooljet app dev --once: upload to the dev track and link the code page, its route pages and
                          the version pin. Refuses while the security scan has critical or high findings. Saving the
                          app version freezes its code (one version line, as for visual apps; no separate publish).
    code_app_add_dependency  tooljet app vet (malware, known vulnerabilities, versions under 7 days old, licence,
                          blocklist) and only then add the packages to frontend/package.json and install them

  Security: tooljet app check runs @tooljet/app-scanner (code rules, secrets, dependencies) and prints it with --json;
  build reports the offline scan, install runs the full one first, and the server scans again when a version is saved.

  The code reads data with useAppQuery('<query>') from frontend/src/tooljet.gen.ts and writes by running a query with
  parameters (`await useAppQuery('update').run({ id, status })`); queries themselves are created with add_queries.

  Environment: TOOLJET_CODE_APP_ROOT (where projects live, default ~/tooljet-code-apps), TOOLJET_CLI (the CLI entry
  point, default `tooljet`), TOOLJET_SDK_SPEC (an npm spec for @tooljet/custom-component-sdk, for an unreleased SDK).
  The CLI reaches ToolJet with this server's TOOLJET_URL and TOOLJET_PAT.
*/

const run = promisify(execFile);

/**
 * The words these tools' results may be repeated in to the user. The model echoed the descriptions' internals into the
 * chat ("the app's code bundle needs its own published revision", "pinned to a developer build"; UX review T39,
 * 2026-11-02), so every Code mode tool description ends with this rule.
 */
export const USER_WORDS =
  " Talk to the user about \"the app's code\" and its versions (v1, v2): one version line, as for any app. Never say code " +
  'version, revision, publishing code, bundle, library, manifest, root component, dev track or pin, and never show internal names, ids or paths.';
const root = (): string => resolve(process.env.TOOLJET_CODE_APP_ROOT || join(homedir(), 'tooljet-code-apps'));
const NAME = /^[a-z][a-z0-9-]{1,40}$/;

const projectDir = (name: string): string => {
  if (!NAME.test(name)) throw new Error(`name must match ${NAME} (lowercase letters, digits, hyphens)`);
  return join(root(), name);
};

const appIdOf = (dir: string): string | undefined => {
  try {
    return JSON.parse(readFileSync(join(dir, 'app.json'), 'utf8')).appId;
  } catch {
    return undefined;
  }
};

/** The projects for an app, newest app.json first (older ones are leftovers of an earlier scaffold). */
export const projectsForApp = (appId: string): string[] => {
  if (!existsSync(root())) return [];
  return readdirSync(root(), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && NAME.test(entry.name) && appIdOf(join(root(), entry.name)) === appId)
    .map((entry) => entry.name)
    .sort((a, b) => statSync(join(root(), b, 'app.json')).mtimeMs - statSync(join(root(), a, 'app.json')).mtimeMs);
};

const APP_ID = z.string().uuid().optional().describe("The app's id: finds its project, so you never have to know the folder name");
const PROJECT_NAME = z.string().regex(NAME).optional().describe('The project folder, when you know it; app_id is enough');

/** A tool's project: by app_id (preferred), else by name. */
const locateProject = (args: { name?: string; app_id?: string }): string => {
  if (args.app_id) {
    const [found] = projectsForApp(args.app_id);
    if (!found) throw new Error(`no Code mode project for app ${args.app_id} under ${root()}; call code_app_scaffold with this app_id`);
    if (args.name && args.name !== found) throw new Error(`app ${args.app_id}'s project is "${found}", not "${args.name}"`);
    return join(root(), found);
  }
  if (!args.name) throw new Error('give app_id (or the project name)');
  return requireProject(args.name);
};

const requireProject = (name: string): string => {
  const dir = projectDir(name);
  if (!existsSync(join(dir, 'app.json'))) throw new Error(`no app project "${name}" under ${root()}; call code_app_scaffold first`);
  return dir;
};

/** What an agent may write: app.json, the frontend's source, and the two style files (theme.css, global.css). */
const STYLE_FILES = new Set(['frontend/styles/theme.css', 'frontend/styles/global.css']);
export const editable = (dir: string, path: string): string => {
  const full = resolve(dir, path);
  const rel = relative(dir, full).split(sep).join('/');
  if (rel === 'app.json' || STYLE_FILES.has(rel) || (rel.startsWith('frontend/src/') && !rel.endsWith('tooljet.gen.ts'))) return full;
  throw new Error(
    `"${path}" is not editable: write app.json, frontend/styles/theme.css, frontend/styles/global.css or files under frontend/src/ (tooljet.gen.ts is generated)`
  );
};

const TEXT = /\.(tsx?|jsx?|json|css|md)$/i;
const listFiles = (dir: string, base = dir, out: string[] = []): string[] => {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist'].includes(entry.name) || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, base, out);
    else if (TEXT.test(entry.name) && entry.name !== 'package-lock.json') out.push(relative(base, full).split(sep).join('/'));
  }
  return out.sort();
};

const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

const cliEnv = () => ({
  ...process.env,
  FORCE_COLOR: '0',
  // The CLI is oclif: under NODE_ENV=development it loads its TypeScript sources instead of the build and fails
  // ("Unexpected token ':'"). A ToolJet server running in development passes that on to this MCP server.
  NODE_ENV: 'production',
  TOOLJET_URL: process.env.TOOLJET_URL ?? '',
  TOOLJET_PAT: process.env.TOOLJET_PAT ?? '',
  TOOLJET_APP_URL: process.env.TOOLJET_DEPLOYMENT_URL ?? process.env.TOOLJET_APP_URL ?? '',
});

async function cli(cwd: string, args: string[], timeoutMs = 300_000): Promise<{ code: number; output: string }> {
  const [cmd, pre] = process.env.TOOLJET_CLI ? ['node', [process.env.TOOLJET_CLI]] : ['tooljet', []];
  try {
    const { stdout, stderr } = await run(cmd, [...pre, ...args], { cwd, timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, env: cliEnv() });
    return { code: 0, output: strip(stdout + stderr) };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number; message?: string };
    return { code: typeof e.code === 'number' ? e.code : 1, output: strip((e.stdout ?? '') + (e.stderr ?? e.message ?? '')) };
  }
}

const PLACEHOLDER_NAME = /^Untitled App\b/;

/**
 * Give an app still named "Untitled App: ..." (the dashboard's placeholder) its real name, as apply_app_phase does
 * for a visual build. Names are unique per workspace: a taken one gets a short suffix. Returns the name it got.
 */
async function nameApp(
  client: Pick<ToolJetClient, 'renameApp'> | undefined,
  dir: string,
  name: string
): Promise<{ renamed_to?: string; rename_warning?: string }> {
  let snapshot: { appId?: string; appName?: string; versionId?: string };
  try {
    snapshot = JSON.parse(readFileSync(join(dir, '.tooljet', 'snapshot.json'), 'utf8'));
  } catch {
    return {};
  }
  if (!client || !snapshot.appId || !snapshot.versionId || !PLACEHOLDER_NAME.test(snapshot.appName ?? '')) return {};
  try {
    await client.renameApp(snapshot.appId, snapshot.versionId, name);
    return { renamed_to: name };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/exist|unique|duplicate|taken|conflict|409|422/i.test(message)) return { rename_warning: `Could not name the app: ${message}` };
    const fallback = `${name} ${Math.random().toString(36).slice(2, 5)}`;
    await client.renameApp(snapshot.appId, snapshot.versionId, fallback);
    return { renamed_to: fallback, rename_warning: `App name "${name}" is already used in this workspace; the app was named "${fallback}" instead.` };
  }
}

export interface SecurityFinding {
  ruleId: string;
  severity: string;
  message: string;
  location: string;
  blocking?: boolean;
  package?: string;
}

export interface SecurityReport {
  gate?: 'pass' | 'fail';
  counts?: Record<string, number>;
  notRun?: { id: string; reason?: string }[];
  findings?: SecurityFinding[];
  error?: string;
}

/** The JSON report of `tooljet app check --json` / `tooljet app vet --json`, or null when the output is not one. */
export function parseReport<T = Record<string, unknown>>(output: string): T | null {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(output.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/** Findings an agent must fix before installing: critical and high, whatever the workspace policy blocks. */
export const mustFix = (security: SecurityReport | undefined): SecurityFinding[] =>
  (security?.findings ?? []).filter((f) => f.severity === 'critical' || f.severity === 'high');

/** The scan for a tool result: counts, gate, what did not run, and the findings (most severe first, at most 40). */
export const securitySummary = (security: SecurityReport | undefined) =>
  !security
    ? { error: 'no security report (the CLI predates tooljet app check --json)' }
    : security.error
      ? { error: security.error }
      : {
          gate: security.gate,
          counts: security.counts,
          not_run: (security.notRun ?? []).map((n) => `${n.id}${n.reason ? `: ${n.reason}` : ''}`),
          findings: (security.findings ?? []).slice(0, 40),
          ...((security.findings?.length ?? 0) > 40 ? { more_findings: security.findings!.length - 40 } : {}),
        };

/** package.json with these packages pinned to the exact versions vetted. */
export function withDependencies(
  pkg: { dependencies?: Record<string, string> },
  packages: { name: string; version: string }[]
): { dependencies: Record<string, string> } {
  const dependencies = { ...(pkg.dependencies ?? {}) };
  for (const p of packages) dependencies[p.name] = p.version;
  return { ...pkg, dependencies: Object.fromEntries(Object.entries(dependencies).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) };
}

/** package.json without these packages (dependencies and devDependencies). */
export function withoutDependencies<T extends { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>(
  pkg: T,
  names: string[]
): T {
  const drop = (deps?: Record<string, string>) => deps && Object.fromEntries(Object.entries(deps).filter(([name]) => !names.includes(name)));
  return { ...pkg, ...(pkg.dependencies ? { dependencies: drop(pkg.dependencies) } : {}), ...(pkg.devDependencies ? { devDependencies: drop(pkg.devDependencies) } : {}) };
}

/** A registry package name, optionally scoped, with no version. */
export const PACKAGE_NAME = /^(@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;

/** An npm spec an agent may add: a registry name (optionally scoped) with an optional version, range or tag. */
export const PACKAGE_SPEC = /^(@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*(@[A-Za-z0-9.^~<>=*| -]+)?$/;

export function codeAppScaffoldTool(client?: Pick<ToolJetClient, 'renameApp'>): ToolDef {
  return {
    name: 'code_app_scaffold',
    title: 'Scaffold Code Mode App',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description:
      'Create the Code mode project for an app you created with create_app: app.json (the app and its routes, its screens) and ' +
      'frontend/ (React + TypeScript on shadcn + Tailwind, react-router through AppRouter). Create the app\'s queries with add_queries ' +
      'BEFORE this, so the typed hooks it writes (frontend/src/tooljet.gen.ts: useAppQuery, row types, ROUTES, routePath, PAGES) list them. ' +
      'Returns the files and the generated hooks.' + USER_WORDS,
    inputSchema: {
      name: z.string().regex(NAME).describe('Project folder: lowercase letters, digits and hyphens, e.g. inventory-console'),
      display_name: z.string().min(1).max(100).describe("The app's name; an app still called \"Untitled App\" is renamed to it"),
      app_id: z.string().uuid().describe('The app from create_app'),
    },
    async handler(args: { name: string; display_name: string; app_id: string }) {
      try {
        // One project per app: an app that already has one gets it back, whatever name is asked for.
        const [existing] = projectsForApp(args.app_id);
        const dir = existing ? join(root(), existing) : projectDir(args.name);
        const owner = appIdOf(dir);
        if (!existing && owner && owner !== args.app_id)
          throw new Error(`project "${args.name}" belongs to app ${owner}; choose another name`);
        if (!existsSync(join(dir, 'app.json'))) {
          mkdirSync(root(), { recursive: true });
          const init = await cli(root(), ['app', 'init', args.name, '--name', args.display_name, '--no-install']);
          if (init.code !== 0) throw new Error(`tooljet app init failed: ${init.output}`);
          const appFile = join(dir, 'app.json');
          writeFileSync(appFile, JSON.stringify({ ...JSON.parse(readFileSync(appFile, 'utf8')), appId: args.app_id }, null, 2) + '\n');
          if (process.env.TOOLJET_SDK_SPEC) {
            const pkgFile = join(dir, 'frontend', 'package.json');
            const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));
            pkg.dependencies['@tooljet/custom-component-sdk'] = process.env.TOOLJET_SDK_SPEC;
            writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
          }
          // The CLI's install: never runs a package's install scripts (npm/pnpm/yarn with --ignore-scripts).
          const install = await cli(dir, ['app', 'install']);
          if (install.code !== 0) throw new Error(`tooljet app install failed: ${install.output}`);
        }
        const pull = await cli(dir, ['app', 'pull']);
        if (pull.code !== 0) throw new Error(`tooljet app pull failed: ${pull.output}`);
        const naming = await nameApp(client, dir, args.display_name);
        return ok({
          project_dir: dir,
          ...naming,
          ...(existing ? { existing_project: existing, note: `This app already has a project, "${existing}"; it is used as is.` } : {}),
          files: listFiles(dir),
          app_json: JSON.parse(readFileSync(join(dir, 'app.json'), 'utf8')),
          generated_hooks: readFileSync(join(dir, 'frontend', 'src', 'tooljet.gen.ts'), 'utf8'),
          next: 'Set the routes in app.json, write the screens under frontend/src/App/, then code_app_build until ok, then code_app_install.',
        });
      } catch (err) {
        return fail(err);
      }
    },
  };
}

/** `tooljet app source-pull`: what it reports when it brought editor edits down, or a warning when it could not run. */
async function syncEditorEdits(dir: string, { force = false } = {}): Promise<{ editor_edits?: string; sync_warning?: string }> {
  if (force) forgetSourceRevision(dir);
  const pull = await cli(dir, ['app', 'source-pull'], 60_000);
  if (pull.code !== 0) return { sync_warning: `Could not check the ToolJet editor for edits: ${pull.output.trim().slice(0, 300)}` };
  // What the agent read stays recorded: a write compares it with the file as the pull left it, so only a file the pull
  // changed needs reading again.
  return /Pulled revision/.test(pull.output) ? { editor_edits: pull.output.trim() } : {};
}

/*
  The stored code on ToolJet is the truth, not the project folder. `tooljet app source-pull` skips the pull when the
  project's last revision number equals the stored one, but revision numbers count per version: after a Save version
  the new draft can sit at the same number as the project while holding the user's Style inspector and Code panel edits,
  and the agent then rewrote the files from its old copy (Maintenance request tracker, 2026-11-02: the user's Muted
  header was lost). So the first time a build touches a project it pulls whatever is stored, and a write to an existing
  file needs a read of that file, in this build, after the last pull.
*/
const freshProjects = new Set<string>();
const readHashes = new Map<string, string>();
const sha = (text: string): string => createHash('sha256').update(text).digest('hex');
const readKey = (dir: string, rel: string): string => `${dir}\0${rel}`;

/** Make the next source-pull fetch the stored code whatever revision number the project last saw. */
function forgetSourceRevision(dir: string): void {
  const file = join(dir, '.tooljet', 'source.json');
  if (!existsSync(file)) return;
  try {
    const state = JSON.parse(readFileSync(file, 'utf8'));
    writeFileSync(file, JSON.stringify({ ...state, revision: -1 }, null, 2) + '\n');
  } catch {
    /* an unreadable state file already reads as "never pulled" */
  }
}

/** The stored code, once per build per project (the MCP process lives for one build). */
async function ensureFresh(dir: string): Promise<{ editor_edits?: string; sync_warning?: string }> {
  if (freshProjects.has(dir)) return {};
  const sync = await syncEditorEdits(dir, { force: true });
  if (!sync.sync_warning) freshProjects.add(dir);
  return sync;
}

/** Tests: a new build (a new MCP process) starts with nothing pulled or read. */
export function resetCodeSessionForTests(): void {
  freshProjects.clear();
  readHashes.clear();
}

/** Lines that differ between two versions of a file (a multiset count, enough to tell a small change from a rewrite). */
export function changedLines(before: string, after: string): number {
  const count = (text: string) => text.split('\n').reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map<string, number>());
  const a = count(before);
  const b = count(after);
  let changed = 0;
  for (const [line, n] of a) changed += Math.max(0, n - (b.get(line) ?? 0));
  for (const [line, n] of b) changed += Math.max(0, n - (a.get(line) ?? 0));
  return changed;
}

/** A whole-file write that replaces this much of an existing file is a rewrite, and needs rewrite: true. */
export const isRewrite = (before: string, after: string): boolean => {
  const changed = changedLines(before, after);
  const size = Math.max(before.split('\n').length, after.split('\n').length);
  return changed > 20 && changed > 0.4 * size;
};

export function codeAppReadFilesTool(): ToolDef {
  return {
    name: 'code_app_read_files',
    title: 'Read Code Mode Files',
    annotations: { readOnlyHint: true, openWorldHint: true },
    description:
      'Read a Code mode project. Without paths, lists its files; with paths, returns their contents (app.json, frontend/...). ' +
      'Edits saved in the ToolJet Code panel since the last install are brought into the project first.' + USER_WORDS,
    inputSchema: { app_id: APP_ID, name: PROJECT_NAME, paths: z.array(z.string()).optional() },
    async handler(args: { app_id?: string; name?: string; paths?: string[] }) {
      try {
        const dir = locateProject(args);
        if (!freshProjects.has(dir)) await followDraft(dir);
        const sync = freshProjects.has(dir) ? await syncEditorEdits(dir) : await ensureFresh(dir);
        if (!args.paths?.length) return ok({ project_dir: dir, ...sync, files: listFiles(dir) });
        const files = Object.fromEntries(
          args.paths.map((p) => {
            const full = resolve(dir, p);
            const rel = relative(dir, full).split(sep).join('/');
            if (rel.startsWith('..')) throw new Error(`"${p}" is outside the project`);
            const content = readFileSync(full, 'utf8');
            readHashes.set(readKey(dir, rel), sha(content));
            return [p, content];
          })
        );
        return ok({ project_dir: dir, ...sync, files });
      } catch (err) {
        return fail(err);
      }
    },
  };
}

export function codeAppWriteFilesTool(): ToolDef {
  return {
    name: 'code_app_write_files',
    title: 'Write Code Mode Files',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    description:
      'Write into a Code mode project: app.json (name, codePage, routes [{id, path, title}]), frontend/styles/theme.css (tokens), frontend/styles/global.css (page-wide rules and library overrides) and anything under frontend/src/. ' +
      'To change an existing file, read it first (code_app_read_files) and pass edits: [{ path, find, replace }] with the exact text to change; ' +
      'files: [{ path, content }] is for new files, or for a rewrite the request needs (then rewrite: true). A write to a file that changed ' +
      'in the ToolJet editor since you read it is refused: read it again and apply your change to what is there. ' +
      'Read data with useAppQuery from ../tooljet.gen; write by awaiting a query\'s run({ ...parameters }); route with AppRouter, ' +
      'react-router <Routes>/<Route> whose paths are exactly app.json\'s, and routePath(id, params). Then code_app_build.' + USER_WORDS,
    inputSchema: {
      app_id: APP_ID,
      name: PROJECT_NAME,
      files: z.array(z.object({ path: z.string(), content: z.string() })).max(40).optional(),
      edits: z.array(z.object({ path: z.string(), find: z.string().min(1), replace: z.string() })).max(60).optional()
        .describe('Targeted changes to existing files: each find must appear exactly once in the file as it is now'),
      rewrite: z.boolean().optional().describe('Allow files to replace most of an existing file (only when the request needs it)'),
    },
    async handler(args: { app_id?: string; name?: string; files?: { path: string; content: string }[]; edits?: { path: string; find: string; replace: string }[]; rewrite?: boolean }) {
      try {
        const dir = locateProject(args);
        if (!args.files?.length && !args.edits?.length) throw new Error('Pass files (new files) or edits (changes to existing files).');
        if (!freshProjects.has(dir)) await followDraft(dir);
        const first = await ensureFresh(dir);
        const sync = first.editor_edits || first.sync_warning ? first : await syncEditorEdits(dir);
        // Everything is checked before anything is written, so a refused call changes nothing.
        const next = new Map<string, { full: string; content: string }>();
        const current = (rel: string, full: string): string | undefined => next.get(rel)?.content ?? (existsSync(full) ? readFileSync(full, 'utf8') : undefined);
        const stale = (rel: string, full: string): string | undefined => {
          if (next.has(rel) || !existsSync(full)) return undefined;
          const known = readHashes.get(readKey(dir, rel));
          if (!known) return `${rel} has not been read in this build: read it with code_app_read_files first`;
          if (known !== sha(readFileSync(full, 'utf8'))) return `${rel} changed on ToolJet (an edit in the editor) since you read it: read it again and apply your change to what is there now`;
          return undefined;
        };
        const refusals: string[] = [];
        for (const file of args.files ?? []) {
          const full = editable(dir, file.path);
          const rel = relative(dir, full).split(sep).join('/');
          const why = stale(rel, full);
          if (why) refusals.push(why);
          const before = current(rel, full);
          if (!why && before !== undefined && !args.rewrite && isRewrite(before, file.content))
            refusals.push(`${rel}: this replaces most of the file; change only what the request needs with edits (find/replace), or pass rewrite: true if the request really is a rewrite`);
          next.set(rel, { full, content: file.content });
        }
        for (const edit of args.edits ?? []) {
          const full = editable(dir, edit.path);
          const rel = relative(dir, full).split(sep).join('/');
          const why = stale(rel, full);
          if (why) { refusals.push(why); continue; }
          const before = current(rel, full);
          if (before === undefined) { refusals.push(`${rel} does not exist: create it with files`); continue; }
          const found = before.split(edit.find).length - 1;
          if (found !== 1) { refusals.push(`${rel}: the find text appears ${found} times; it must match exactly once (copy it from the file as it is now)`); continue; }
          next.set(rel, { full, content: before.replace(edit.find, () => edit.replace) });
        }
        if (refusals.length) return fail(new Error('Not written:\n' + refusals.map((r) => `- ${r}`).join('\n')));
        const written: string[] = [];
        for (const [rel, { full, content }] of next) {
          mkdirSync(dirname(full), { recursive: true });
          writeFileSync(full, content);
          readHashes.set(readKey(dir, rel), sha(content)); // the agent knows what it just wrote
          written.push(rel);
        }
        return ok({ project_dir: dir, ...sync, written });
      } catch (err) {
        return fail(err);
      }
    },
  };
}

/**
 * One version line (2026-11-02): each Save version turns the draft into a saved version and ToolJet opens a new draft,
 * which is the editing version. A project that pins a version in app.json (a clone, or `tooljet app checkout`) would go
 * on building into the saved one; when the pinned version is not a draft, the project follows the editing draft again.
 * A pinned draft stays as it is. Returns a note when it moved.
 */
export async function followDraft(dir: string): Promise<string | undefined> {
  let pinned: { id?: string; name?: string } | undefined;
  try {
    pinned = JSON.parse(readFileSync(join(dir, 'app.json'), 'utf8')).version;
  } catch {
    return undefined;
  }
  if (!pinned?.id) return undefined;
  const list = await cli(dir, ['app', 'checkout', '--list'], 60_000);
  const line = list.output.split('\n').find((l) => l.trimStart().startsWith('*') && l.includes(pinned!.id!));
  if (list.code !== 0 || !line || /\bdraft\b/i.test(line)) return undefined;
  const moved = await cli(dir, ['app', 'checkout', '--editing'], 60_000);
  if (moved.code !== 0) throw new Error(`The app's draft could not be opened: ${moved.output.trim().slice(0, 500)}`);
  return `${pinned.name ?? 'The pinned version'} is saved, so the code now goes into the app's draft.`;
}

export function codeAppBuildTool(): ToolDef {
  return {
    name: 'code_app_build',
    title: 'Build Code Mode App',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description:
      "Refresh the typed hooks from the app's current queries (tooljet app pull), build the app's code (TypeScript, Tailwind, " +
      'manifest), and check it against the app (tooljet app check: every useAppQuery name, route, link and page must exist) ' +
      'and the security scan (code rules such as external fetch, eval and token storage; secrets; vendored code). ' +
      'Returns ok and every error and security finding to fix. Repeat write and build until ok, then code_app_install.' + USER_WORDS,
    inputSchema: { app_id: APP_ID, name: PROJECT_NAME },
    async handler(args: { app_id?: string; name?: string }) {
      try {
        const dir = locateProject(args);
        const followed = await followDraft(dir);
        await ensureFresh(dir);
        const started = Date.now();
        const pull = await cli(dir, ['app', 'pull']);
        const build = await cli(join(dir, 'frontend'), ['library', 'build']);
        const tsErrors = Number(/TypeScript compiled \((\d+) errors\)/.exec(build.output)?.[1] ?? (build.code === 0 ? 0 : 1));
        const check = await cli(dir, ['app', 'check', '--offline', '--json']);
        const report = parseReport<{ problems?: { file: string; line: number; message: string }[]; accessibility?: unknown[]; security?: SecurityReport }>(check.output);
        const okBuild = pull.code === 0 && build.code === 0 && tsErrors === 0 && check.code === 0;
        return ok({
          ...(followed ? { draft: followed } : {}),
          ok: okBuild,
          build_ms: Date.now() - started,
          pull: pull.code === 0 ? 'typed hooks refreshed' : pull.output.trim(),
          typescript_errors: tsErrors,
          build_output: build.code === 0 && tsErrors === 0 ? build.output.trim().split('\n').slice(-6).join('\n') : build.output.trim().slice(0, 12_000),
          check: report?.problems
            ? report.problems.map((p) => `${p.file}:${p.line}  ${p.message}`)
            : check.output.trim().slice(0, 6000),
          // jsx-a11y recommended rules, warnings only (tooljet app check); fix them when they are cheap to fix.
          a11y_warnings: report?.accessibility?.length ?? Number(/(\d+) accessibility warnings?/.exec(check.output)?.[1] ?? 0),
          // The offline scan (no dependency network checks): fix critical and high before code_app_install.
          security: securitySummary(report?.security),
        });
      } catch (err) {
        return fail(err);
      }
    },
  };
}

export function codeAppInstallTool(): ToolDef {
  return {
    name: 'code_app_install',
    title: 'Install Code Mode App',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description:
      "Upload the app's code (tooljet app dev --once --source platform): it creates or updates the app's Code mode page, one hidden page per route " +
      "(set each route's page permissions on it) and the component that runs the code, points the app version at this code as a Live preview, and stores the source on " +
      'ToolJet so the Code panel can edit it. Build first. Runs the full security scan first and refuses while it has critical or high findings, listing them. ' +
      'Returns the editor URL. If it says the source was edited in the ToolJet editor, ' +
      'call code_app_read_files to bring those edits down, reapply your change, and install again. ' +
      'This is the last step of a build or edit: saving the app version (release_app saves a draft first) freezes the code.' + USER_WORDS,
    inputSchema: { app_id: APP_ID, name: PROJECT_NAME },
    async handler(args: { app_id?: string; name?: string }) {
      try {
        const dir = locateProject(args);
        const followed = await followDraft(dir);
        await ensureFresh(dir);
        // The full scan, dependency checks included, before anything reaches the app.
        const check = await cli(dir, ['app', 'check', '--json']);
        const security = parseReport<{ security?: SecurityReport }>(check.output)?.security;
        if (!security || security.error)
          throw new Error(`The security scan did not run, so nothing was installed: ${security?.error ?? check.output.trim().slice(0, 2000)}`);
        const blocking = mustFix(security);
        if (blocking.length)
          return fail(
            new Error(
              `Not installed: the security scan has ${blocking.length} critical or high finding${blocking.length > 1 ? 's' : ''}. ` +
                'Fix them in the code (or remove the package), code_app_build, then install again:\n' +
                blocking.map((f) => `${f.severity.toUpperCase()} ${f.ruleId} ${f.package ?? f.location}: ${f.message}`).join('\n')
            )
          );
        // Agent-built apps keep their source on ToolJet (owner platform) unless a repository owns it; the CLI refuses
        // to take a repository-owned source over and to overwrite editor edits it has not pulled.
        const result = await cli(dir, ['app', 'dev', '--once', '--source', 'platform']);
        if (result.code !== 0) throw new Error(result.output.trim());
        return ok({
          ...(followed ? { draft: followed } : {}),
          linked: true,
          editor_url: /Open: (\S+)/.exec(result.output)?.[1] ?? null,
          output: result.output.trim(),
          security: securitySummary(security),
        });
      } catch (err) {
        return fail(err);
      }
    },
  };
}

export function codeAppAddDependencyTool(): ToolDef {
  return {
    name: 'code_app_add_dependency',
    title: 'Add Code Mode Dependency',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description:
      "Add npm packages to a Code mode app (frontend/package.json is not writable otherwise). Each package is vetted first " +
      '(tooljet app vet: malware, known vulnerabilities, versions published in the last 7 days, licence, workspace blocklist); ' +
      'when any fails, nothing is written and the findings say why: pick another version or package. Passing packages are pinned ' +
      'to the exact version vetted and installed without install scripts. Prefer what the template already has (shadcn, Tailwind, lucide-react). ' +
      'To fix a vulnerable package, pass it again at a fixed version (upgrade), or pass its replacement and the old name in remove; ' +
      'the lockfile is refreshed through the same install.' + USER_WORDS,
    inputSchema: {
      app_id: APP_ID,
      name: PROJECT_NAME,
      packages: z.array(z.string().regex(PACKAGE_SPEC)).max(10).describe('name, name@version or name@range, e.g. date-fns@4'),
      remove: z.array(z.string().regex(PACKAGE_NAME)).max(10).optional().describe('package names to take out of frontend/package.json (a replaced package)'),
    },
    async handler(args: { app_id?: string; name?: string; packages: string[]; remove?: string[] }) {
      try {
        const dir = locateProject(args);
        if (!args.packages.length && !args.remove?.length) throw new Error('Pass packages to add, or names to remove.');
        const vet = args.packages.length
          ? await cli(dir, ['app', 'vet', ...args.packages, '--json'])
          : { code: 0, output: '{"ok":true,"packages":[]}' };
        const report = parseReport<SecurityReport & { ok?: boolean; packages?: { name: string; version: string }[] }>(vet.output);
        if (!report?.packages) throw new Error(`The package check did not run, so nothing was added: ${vet.output.trim().slice(0, 2000)}`);
        if (!report.ok)
          return fail(
            new Error(
              `Not added: ${report.packages.map((p) => `${p.name}@${p.version}`).join(', ')} fail${report.packages.length > 1 ? '' : 's'} the package check:\n` +
                (report.findings ?? []).map((f) => `${f.severity.toUpperCase()} ${f.ruleId} ${f.package ?? f.location}: ${f.message}`).join('\n')
            )
          );
        const pkgFile = join(dir, 'frontend', 'package.json');
        const lockFile = join(dir, 'frontend', 'package-lock.json');
        const before = readFileSync(pkgFile, 'utf8');
        const lockBefore = existsSync(lockFile) ? readFileSync(lockFile, 'utf8') : null;
        writeFileSync(pkgFile, JSON.stringify(withDependencies(withoutDependencies(JSON.parse(before), args.remove ?? []), report.packages), null, 2) + '\n');
        const install = await cli(dir, ['app', 'install']);
        if (install.code !== 0) {
          writeFileSync(pkgFile, before);
          if (lockBefore !== null) writeFileSync(lockFile, lockBefore);
          throw new Error(`tooljet app install failed, package.json restored: ${install.output.trim().slice(0, 4000)}`);
        }
        return ok({
          added: report.packages.map((p) => `${p.name}@${p.version}`),
          ...(args.remove?.length ? { removed: args.remove } : {}),
          not_run: (report.notRun ?? []).map((n) => `${n.id}${n.reason ? `: ${n.reason}` : ''}`),
          // Transitive packages come with the install; code_app_build and code_app_install scan the whole lockfile.
          next: 'Import the package in frontend/src, then code_app_build.',
        });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
