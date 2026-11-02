import { z } from 'zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { ok, fail, type ToolDef } from './types.js';

/*
  Code pages: a ToolJet app page whose whole UI is React code, kept in an app project (app.json + frontend/) and built
  with the ToolJet CLI (`tooljet app ...`). These tools give an agent the developer's loop:

    code_app_scaffold     tooljet app init, linked to an app the agent created (create_app), then typed hooks (pull)
    code_app_read_files   read app.json and frontend/src
    code_app_write_files  write app.json and frontend/src
    code_app_build        refresh typed hooks from the app's queries, build, and check the code against the app
    code_app_install      tooljet app dev --once: upload to the dev track and link the code page, its route pages and
                          the version pin

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

const requireProject = (name: string): string => {
  const dir = projectDir(name);
  if (!existsSync(join(dir, 'app.json'))) throw new Error(`no app project "${name}" under ${root()}; call code_app_scaffold first`);
  return dir;
};

/** What an agent may write: app.json and the frontend's source. */
const editable = (dir: string, path: string): string => {
  const full = resolve(dir, path);
  const rel = relative(dir, full).split(sep).join('/');
  if (rel === 'app.json' || (rel.startsWith('frontend/src/') && !rel.endsWith('tooljet.gen.ts'))) return full;
  throw new Error(`"${path}" is not editable: write app.json or files under frontend/src/ (tooljet.gen.ts is generated)`);
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

export function codeAppScaffoldTool(): ToolDef {
  return {
    name: 'code_app_scaffold',
    title: 'Scaffold Code Page',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description:
      'Create an app project for a code page of an app you created with create_app: app.json (the code page and its routes) and ' +
      'frontend/ (React + TypeScript on shadcn + Tailwind, react-router through AppRouter). Create the app\'s queries with add_queries ' +
      'BEFORE this, so the typed hooks it writes (frontend/src/tooljet.gen.ts: useAppQuery, row types, ROUTES, routePath, PAGES) list them. ' +
      'Returns the files and the generated hooks.',
    inputSchema: {
      name: z.string().regex(NAME).describe('Project folder: lowercase letters, digits and hyphens, e.g. inventory-console'),
      display_name: z.string().min(1).max(100).describe("The app's name"),
      app_id: z.string().uuid().describe('The app from create_app'),
    },
    async handler(args: { name: string; display_name: string; app_id: string }) {
      try {
        const dir = projectDir(args.name);
        if (!existsSync(join(dir, 'app.json'))) {
          mkdirSync(root(), { recursive: true });
          const init = await cli(root(), ['app', 'init', args.name, '--name', args.display_name]);
          if (init.code !== 0) throw new Error(`tooljet app init failed: ${init.output}`);
          const appFile = join(dir, 'app.json');
          writeFileSync(appFile, JSON.stringify({ ...JSON.parse(readFileSync(appFile, 'utf8')), appId: args.app_id }, null, 2) + '\n');
          if (process.env.TOOLJET_SDK_SPEC) {
            const pkgFile = join(dir, 'frontend', 'package.json');
            const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));
            pkg.dependencies['@tooljet/custom-component-sdk'] = process.env.TOOLJET_SDK_SPEC;
            writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
          }
          await run('npm', ['install', '--no-audit', '--no-fund'], { cwd: join(dir, 'frontend'), timeout: 300_000, maxBuffer: 16 * 1024 * 1024 });
        }
        const pull = await cli(dir, ['app', 'pull']);
        if (pull.code !== 0) throw new Error(`tooljet app pull failed: ${pull.output}`);
        return ok({
          project_dir: dir,
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

export function codeAppReadFilesTool(): ToolDef {
  return {
    name: 'code_app_read_files',
    title: 'Read Code Page Files',
    annotations: { readOnlyHint: true, openWorldHint: false },
    description: 'Read a code page project. Without paths, lists its files; with paths, returns their contents (app.json, frontend/...).',
    inputSchema: { name: z.string().regex(NAME), paths: z.array(z.string()).optional() },
    async handler(args: { name: string; paths?: string[] }) {
      try {
        const dir = requireProject(args.name);
        if (!args.paths?.length) return ok({ project_dir: dir, files: listFiles(dir) });
        const files = Object.fromEntries(
          args.paths.map((p) => {
            const full = resolve(dir, p);
            if (relative(dir, full).startsWith('..')) throw new Error(`"${p}" is outside the project`);
            return [p, readFileSync(full, 'utf8')];
          })
        );
        return ok({ project_dir: dir, files });
      } catch (err) {
        return fail(err);
      }
    },
  };
}

export function codeAppWriteFilesTool(): ToolDef {
  return {
    name: 'code_app_write_files',
    title: 'Write Code Page Files',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    description:
      'Write whole files into a code page project: app.json (name, codePage, routes [{id, path, title}]) and anything under frontend/src/. ' +
      'Read data with useAppQuery from ../tooljet.gen; write by awaiting a query\'s run({ ...parameters }); route with AppRouter, ' +
      'react-router <Routes>/<Route> whose paths are exactly app.json\'s, and routePath(id, params). Then code_app_build.',
    inputSchema: {
      name: z.string().regex(NAME),
      files: z.array(z.object({ path: z.string(), content: z.string() })).min(1).max(40),
    },
    async handler(args: { name: string; files: { path: string; content: string }[] }) {
      try {
        const dir = requireProject(args.name);
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
    title: 'Build Code Page',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description:
      "Refresh the typed hooks from the app's current queries (tooljet app pull), build the code page (TypeScript, Tailwind, " +
      'manifest), and check it against the app (tooljet app check: every useAppQuery name, route, link and page must exist). ' +
      'Returns ok and every error to fix. Repeat write and build until ok, then code_app_install.',
    inputSchema: { name: z.string().regex(NAME) },
    async handler(args: { name: string }) {
      try {
        const dir = requireProject(args.name);
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
    title: 'Install Code Page',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description:
      "Upload the code page to the app (tooljet app dev --once): it creates or updates the code page, one hidden page per route " +
      "(set each route's page permissions on it), the page's root component, and pins the app version to this build. Build first. " +
      'Returns the editor URL.',
    inputSchema: { name: z.string().regex(NAME) },
    async handler(args: { name: string }) {
      try {
        const dir = requireProject(args.name);
        const result = await cli(dir, ['app', 'dev', '--once']);
        if (result.code !== 0) throw new Error(result.output.trim());
        return ok({ linked: true, editor_url: /Open: (\S+)/.exec(result.output)?.[1] ?? null, output: result.output.trim() });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
