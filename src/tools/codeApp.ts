import { z } from 'zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
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
                          the version pin; with publish, tooljet app publish: a published revision the version can be
                          saved and released with

  The code reads data with useAppQuery('<query>') from frontend/src/tooljet.gen.ts and writes by running a query with
  parameters (`await useAppQuery('update').run({ id, status })`); queries themselves are created with add_queries.

  Environment: TOOLJET_CODE_APP_ROOT (where projects live, default ~/tooljet-code-apps), TOOLJET_CLI (the CLI entry
  point, default `tooljet`), TOOLJET_SDK_SPEC (an npm spec for @tooljet/custom-component-sdk, for an unreleased SDK).
  The CLI reaches ToolJet with this server's TOOLJET_URL and TOOLJET_PAT.
*/

const run = promisify(execFile);
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

export function codeAppScaffoldTool(client?: Pick<ToolJetClient, 'renameApp'>): ToolDef {
  return {
    name: 'code_app_scaffold',
    title: 'Scaffold Code Mode App',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description:
      'Create the Code mode project for an app you created with create_app: app.json (the app and its routes, its screens) and ' +
      'frontend/ (React + TypeScript on shadcn + Tailwind, react-router through AppRouter). Create the app\'s queries with add_queries ' +
      'BEFORE this, so the typed hooks it writes (frontend/src/tooljet.gen.ts: useAppQuery, row types, ROUTES, routePath, PAGES) list them. ' +
      'Returns the files and the generated hooks.',
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
async function syncEditorEdits(dir: string): Promise<{ editor_edits?: string; sync_warning?: string }> {
  const pull = await cli(dir, ['app', 'source-pull'], 60_000);
  if (pull.code !== 0) return { sync_warning: `Could not check the ToolJet editor for edits: ${pull.output.trim().slice(0, 300)}` };
  return /Pulled revision/.test(pull.output) ? { editor_edits: pull.output.trim() } : {};
}

export function codeAppReadFilesTool(): ToolDef {
  return {
    name: 'code_app_read_files',
    title: 'Read Code Mode Files',
    annotations: { readOnlyHint: true, openWorldHint: true },
    description:
      'Read a Code mode project. Without paths, lists its files; with paths, returns their contents (app.json, frontend/...). ' +
      'Edits saved in the ToolJet Code panel since the last install are brought into the project first.',
    inputSchema: { app_id: APP_ID, name: PROJECT_NAME, paths: z.array(z.string()).optional() },
    async handler(args: { app_id?: string; name?: string; paths?: string[] }) {
      try {
        const dir = locateProject(args);
        const sync = await syncEditorEdits(dir);
        if (!args.paths?.length) return ok({ project_dir: dir, ...sync, files: listFiles(dir) });
        const files = Object.fromEntries(
          args.paths.map((p) => {
            const full = resolve(dir, p);
            if (relative(dir, full).startsWith('..')) throw new Error(`"${p}" is outside the project`);
            return [p, readFileSync(full, 'utf8')];
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
      'Write whole files into a Code mode project: app.json (name, codePage, routes [{id, path, title}]), frontend/styles/theme.css (tokens), frontend/styles/global.css (page-wide rules and library overrides) and anything under frontend/src/. ' +
      'Read data with useAppQuery from ../tooljet.gen; write by awaiting a query\'s run({ ...parameters }); route with AppRouter, ' +
      'react-router <Routes>/<Route> whose paths are exactly app.json\'s, and routePath(id, params). Then code_app_build.',
    inputSchema: {
      app_id: APP_ID,
      name: PROJECT_NAME,
      files: z.array(z.object({ path: z.string(), content: z.string() })).min(1).max(40),
    },
    async handler(args: { app_id?: string; name?: string; files: { path: string; content: string }[] }) {
      try {
        const dir = locateProject(args);
        const written: string[] = [];
        for (const file of args.files) {
          const full = editable(dir, file.path);
          mkdirSync(dirname(full), { recursive: true });
          writeFileSync(full, file.content);
          written.push(file.path);
        }
        return ok({ project_dir: dir, written });
      } catch (err) {
        return fail(err);
      }
    },
  };
}

export function codeAppBuildTool(): ToolDef {
  return {
    name: 'code_app_build',
    title: 'Build Code Mode App',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description:
      "Refresh the typed hooks from the app's current queries (tooljet app pull), build the app's code (TypeScript, Tailwind, " +
      'manifest), and check it against the app (tooljet app check: every useAppQuery name, route, link and page must exist). ' +
      'Returns ok and every error to fix. Repeat write and build until ok, then code_app_install.',
    inputSchema: { app_id: APP_ID, name: PROJECT_NAME },
    async handler(args: { app_id?: string; name?: string }) {
      try {
        const dir = locateProject(args);
        const started = Date.now();
        const pull = await cli(dir, ['app', 'pull']);
        const build = await cli(join(dir, 'frontend'), ['library', 'build']);
        const tsErrors = Number(/TypeScript compiled \((\d+) errors\)/.exec(build.output)?.[1] ?? (build.code === 0 ? 0 : 1));
        const check = await cli(dir, ['app', 'check', '--offline']);
        const okBuild = pull.code === 0 && build.code === 0 && tsErrors === 0 && check.code === 0;
        return ok({
          ok: okBuild,
          build_ms: Date.now() - started,
          pull: pull.code === 0 ? 'typed hooks refreshed' : pull.output.trim(),
          typescript_errors: tsErrors,
          build_output: build.code === 0 && tsErrors === 0 ? build.output.trim().split('\n').slice(-6).join('\n') : build.output.trim().slice(0, 12_000),
          check: check.output.trim().slice(0, 6000),
          // jsx-a11y recommended rules, warnings only (tooljet app check); fix them when they are cheap to fix.
          a11y_warnings: Number(/(\d+) accessibility warnings?/.exec(check.output)?.[1] ?? 0),
        });
      } catch (err) {
        return fail(err);
      }
    },
  };
}

/** Where a project remembers the last revision it published (beside the CLI's own config). */
const publishedFile = (dir: string): string => join(dir, 'frontend', '.tooljet', 'published.json');

/** 1.0.0, then the next patch after the last one published from this project. */
export const nextRevision = (last?: string): string => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(last ?? '');
  return m ? `${m[1]}.${m[2]}.${Number(m[3]) + 1}` : '1.0.0';
};

/**
 * tooljet app publish with the next free X.Y.Z: the app's code becomes a published revision, the editing version is
 * pinned to it and the source is stored on ToolJet. A dev-track install leaves the version pinned to a developer
 * preview, which cannot be saved or released, and the agent then told the user to run `tooljet app publish` on the
 * server (UX review, 2026-11-02). A version the library already has is skipped.
 */
export async function publishProject(dir: string, attempts = 25): Promise<{ version: string; output: string }> {
  let last: string | undefined;
  try {
    last = JSON.parse(readFileSync(publishedFile(dir), 'utf8')).version;
  } catch {
    last = undefined;
  }
  let version = nextRevision(last);
  for (let i = 0; i < attempts; i++) {
    const result = await cli(dir, ['app', 'publish', '-v', version, '-m', 'Published by the AI builder', '--source', 'platform'], 600_000);
    if (result.code === 0) {
      mkdirSync(dirname(publishedFile(dir)), { recursive: true });
      writeFileSync(publishedFile(dir), JSON.stringify({ version, publishedAt: new Date().toISOString() }, null, 2) + '\n');
      return { version, output: result.output.trim() };
    }
    if (!/already exists/i.test(result.output)) throw new Error(result.output.trim());
    version = nextRevision(version);
  }
  throw new Error(`no free revision number after ${attempts} tries (last tried ${version})`);
}

export function codeAppInstallTool(): ToolDef {
  return {
    name: 'code_app_install',
    title: 'Install Code Mode App',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description:
      "Upload the app's code (tooljet app dev --once --source platform): it creates or updates the app's Code mode page, one hidden page per route " +
      "(set each route's page permissions on it), the page's root component, pins the app version to this build, and stores the source on " +
      'ToolJet so the Code panel can edit it. Build first. Returns the editor URL. If it says the source was edited in the ToolJet editor, ' +
      'call code_app_read_files to bring those edits down, reapply your change, and install again. ' +
      'With publish: true it publishes the code instead (tooljet app publish, run here, never by the user): a new published revision ' +
      'that the app version is pinned to, so the version can be saved and released. Publish once, as the last install of a build or edit.',
    inputSchema: {
      app_id: APP_ID,
      name: PROJECT_NAME,
      publish: z.boolean().optional().describe('Publish the code as a new revision and pin the version to it (the last install of a build or edit)'),
    },
    async handler(args: { app_id?: string; name?: string; publish?: boolean }) {
      try {
        const dir = locateProject(args);
        if (args.publish) {
          const published = await publishProject(dir);
          return ok({ linked: true, published: true, revision: published.version, output: published.output });
        }
        // Agent-built apps keep their source on ToolJet (owner platform) unless a repository owns it; the CLI refuses
        // to take a repository-owned source over and to overwrite editor edits it has not pulled.
        const result = await cli(dir, ['app', 'dev', '--once', '--source', 'platform']);
        if (result.code !== 0) throw new Error(result.output.trim());
        return ok({ linked: true, editor_url: /Open: (\S+)/.exec(result.output)?.[1] ?? null, output: result.output.trim() });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
