import { z } from 'zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import type { ToolJetClient } from '../tooljetClient.js';
import { loadInstalledPacks, type BuiltinPackInfo } from '../packCatalog.js';
import { refreshCatalogResources } from '../catalogResources.js';
import { ok, fail, type ToolDef } from './types.js';

/*
  Code apps: an app whose whole UI is one React component from a component pack, on a single ToolJet page. These
  tools give an agent the loop a developer has with the CLI: scaffold a project, read and write its files, build it
  (TypeScript errors, bundle sizes and the manifest come back), and install the build so the pack's component can
  be placed with add_components as `Lib_<pack>_<Component>`.

  Environment:
    TOOLJET_CODE_APP_ROOT       folder that holds the projects (default ~/tooljet-code-apps)
    TOOLJET_CLI                 the ToolJet CLI entry point (default: `tooljet` on PATH)
    TOOLJET_BUILTIN_PACKS_DIR   the server's builtin-packs folder, for installs on an instance whose licence has no
                                custom component libraries; without it code_app_install explains the publish path
    TOOLJET_BACKEND_RESTART_CMD a command that restarts the ToolJet server and returns once it answers (the server
                                reads builtin-packs once per process)
*/

const run = promisify(execFile);

const root = (): string => resolve(process.env.TOOLJET_CODE_APP_ROOT || join(homedir(), 'tooljet-code-apps'));
const cli = (): string => process.env.TOOLJET_CLI || 'tooljet';
const NAME = /^[a-z][a-z0-9-]{1,40}$/;

const projectDir = (name: string): string => {
  if (!NAME.test(name)) throw new Error(`name must match ${NAME} (lowercase letters, digits, hyphens)`);
  return join(root(), name);
};

const insideProject = (dir: string, path: string): string => {
  const full = resolve(dir, path);
  const rel = relative(dir, full);
  if (!rel || rel.startsWith('..') || rel.split(sep)[0] === 'node_modules' || rel.split(sep)[0] === 'dist' || rel.startsWith('.tooljet')) {
    throw new Error(`path "${path}" is outside the editable part of the project (src/, configs, package.json)`);
  }
  return full;
};

const TEXT = /\.(tsx?|jsx?|mjs|cjs|json|css|scss|md|txt|svg|html)$/i;
const listFiles = (dir: string, base = dir, out: string[] = []): string[] => {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, base, out);
    else if (TEXT.test(entry.name)) out.push(relative(base, full).split(sep).join('/'));
  }
  return out.sort();
};

const manifestSummary = (dir: string) => {
  const file = join(dir, 'dist', 'manifest.json');
  if (!existsSync(file)) return null;
  const manifest = JSON.parse(readFileSync(file, 'utf8')) as {
    components?: Record<string, { props?: { name: string; type: string }[]; events?: { name: string }[]; actions?: { name: string }[] }>;
  };
  return Object.fromEntries(
    Object.entries(manifest.components ?? {}).map(([name, c]) => [
      name,
      {
        props: (c.props ?? []).map((p) => `${p.name}: ${p.type}`),
        events: (c.events ?? []).map((e) => e.name),
        actions: (c.actions ?? []).map((a) => a.name),
      },
    ]),
  );
};

async function runCli(dir: string, args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await run(cli(), args, { cwd: dir, timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, FORCE_COLOR: '0' } });
    return { stdout, stderr, code: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number; message?: string };
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? e.message ?? '', code: typeof e.code === 'number' ? e.code : 1 };
  }
}

const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

export function codeAppScaffoldTool(): ToolDef {
  return {
    name: 'code_app_scaffold',
    title: 'Scaffold Code App',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    description:
      'Create a code-app project: a React + TypeScript component pack on shadcn + Tailwind with react-router, whose one exported ' +
      'component is the whole app on a single ToolJet page. Returns the project files. Then edit with code_app_write_files, ' +
      'build with code_app_build, install with code_app_install, and place the component with add_components as Lib_<pack>_App ' +
      'with its props bound to queries and its events wired to queries. The sample app reads items from the `items` prop, ' +
      'exposes `pending` {id,status} and fires onUpdate and onRefresh.',
    inputSchema: {
      name: z.string().regex(NAME).describe('Project and pack id: lowercase letters, digits and hyphens, e.g. inventory-console'),
      display_name: z.string().min(1).max(100).describe('Human name shown in the builder'),
    },
    async handler(args: { name: string; display_name: string }) {
      try {
        const dir = projectDir(args.name);
        if (existsSync(dir)) return ok({ project_dir: dir, existed: true, files: listFiles(dir) });
        mkdirSync(root(), { recursive: true });
        const init = await runCli(root(), ['library', 'init', args.name, '--template', 'code-app', '--display-name', args.display_name, '--local'], 120_000);
        if (init.code !== 0) throw new Error(`scaffold failed: ${strip(init.stderr || init.stdout)}`);
        const install = await run('npm', ['install', '--no-audit', '--no-fund'], { cwd: dir, timeout: 300_000, maxBuffer: 16 * 1024 * 1024 });
        return ok({ project_dir: dir, existed: false, files: listFiles(dir), npm: strip(install.stdout).trim().split('\n').pop() });
      } catch (err) {
        return fail(err);
      }
    },
  };
}

export function codeAppReadFilesTool(): ToolDef {
  return {
    name: 'code_app_read_files',
    title: 'Read Code App Files',
    annotations: { readOnlyHint: true, openWorldHint: false },
    description: 'Read files of a code-app project. Without paths, lists every source file; with paths, returns their contents.',
    inputSchema: {
      name: z.string().regex(NAME),
      paths: z.array(z.string()).optional().describe('Project-relative paths, e.g. src/App/index.tsx'),
    },
    async handler(args: { name: string; paths?: string[] }) {
      try {
        const dir = projectDir(args.name);
        if (!existsSync(dir)) throw new Error(`no project "${args.name}" under ${root()}; call code_app_scaffold first`);
        if (!args.paths?.length) return ok({ project_dir: dir, files: listFiles(dir) });
        const files = Object.fromEntries(args.paths.map((p) => [p, readFileSync(insideProject(dir, p), 'utf8')]));
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
    title: 'Write Code App Files',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    description:
      'Write whole files into a code-app project (src/, configs, package.json). Keep every ToolJet.* hook at the top of the ' +
      'exported component in src/App/index.tsx so the manifest sees it; call code_app_build after writing.',
    inputSchema: {
      name: z.string().regex(NAME),
      files: z.array(z.object({ path: z.string(), content: z.string() })).min(1).max(40),
    },
    async handler(args: { name: string; files: { path: string; content: string }[] }) {
      try {
        const dir = projectDir(args.name);
        if (!existsSync(dir)) throw new Error(`no project "${args.name}" under ${root()}; call code_app_scaffold first`);
        const written: string[] = [];
        for (const file of args.files) {
          const full = insideProject(dir, file.path);
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
    title: 'Build Code App',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    description:
      'Build a code-app project with the ToolJet CLI (esbuild, Tailwind through PostCSS, manifest generation). Returns ok, the ' +
      'TypeScript errors and warnings to fix, bundle sizes and the manifest summary (props, events, actions per component). ' +
      'Repeat write and build until ok is true, then code_app_install.',
    inputSchema: { name: z.string().regex(NAME) },
    async handler(args: { name: string }) {
      try {
        const dir = projectDir(args.name);
        if (!existsSync(dir)) throw new Error(`no project "${args.name}" under ${root()}; call code_app_scaffold first`);
        const started = Date.now();
        const result = await runCli(dir, ['library', 'build'], 300_000);
        const output = strip(result.stdout + result.stderr);
        const tsErrors = /TypeScript compiled \((\d+) errors\)/.exec(output);
        const errorCount = tsErrors ? Number(tsErrors[1]) : result.code === 0 ? 0 : 1;
        const sizeOf = (file: string) => (existsSync(join(dir, 'dist', file)) ? Math.round(statSync(join(dir, 'dist', file)).size / 1024) : 0);
        const okBuild = result.code === 0 && errorCount === 0;
        return ok({
          ok: okBuild,
          build_ms: Date.now() - started,
          typescript_errors: errorCount,
          // The CLI prints the error report after the counts; keep everything past the first error line.
          errors: errorCount ? output.slice(output.indexOf('error')).trim().slice(0, 12_000) : '',
          warnings: output.split('\n').filter((line) => /warning|⚠/i.test(line)).map((line) => line.trim()),
          bundle_kb: sizeOf('index.js'),
          css_kb: sizeOf('index.css'),
          manifest: manifestSummary(dir),
          output: output.trim().slice(0, 4000),
        });
      } catch (err) {
        return fail(err);
      }
    },
  };
}

export function codeAppInstallTool(client: ToolJetClient): ToolDef {
  return {
    name: 'code_app_install',
    title: 'Install Code App',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description:
      'Install the last build of a code-app project on the ToolJet server as a builtin pack (restarting the server when ' +
      'TOOLJET_BACKEND_RESTART_CMD is set) and refresh this catalogue. Returns the pack id and the component types to use ' +
      'with add_components (Lib_<pack>_<Component>). Build first with code_app_build.',
    inputSchema: {
      name: z.string().regex(NAME),
      version: z.string().regex(/^\d+(\.\d+){0,2}$/).optional().describe('Pack version label, default 1.0.0'),
    },
    async handler(args: { name: string; version?: string }) {
      try {
        const dir = projectDir(args.name);
        const dist = join(dir, 'dist');
        if (!existsSync(join(dist, 'index.js')) || !existsSync(join(dist, 'manifest.json'))) {
          throw new Error(`no build in ${dist}; call code_app_build first`);
        }
        const packsDir = process.env.TOOLJET_BUILTIN_PACKS_DIR;
        if (!packsDir) {
          throw new Error(
            'TOOLJET_BUILTIN_PACKS_DIR is not set. On an instance with custom component libraries, publish with ' +
              '`tooljet library publish --version <v>` from the project folder instead; on this instance set the variable ' +
              "to the server's builtin-packs folder.",
          );
        }
        const target = join(packsDir, args.name);
        mkdirSync(target, { recursive: true });
        for (const file of ['index.js', 'index.css', 'manifest.json']) {
          if (existsSync(join(dist, file))) copyFileSync(join(dist, file), join(target, file));
        }
        const config = JSON.parse(readFileSync(join(dir, '.tooljet', 'config.json'), 'utf8')) as { libraryName?: string };
        writeFileSync(
          join(target, 'builtin.json'),
          JSON.stringify({ pack: args.name, displayName: config.libraryName || args.name, version: args.version || '1.0.0' }, null, 2) + '\n',
        );
        let restart = 'not restarted: TOOLJET_BACKEND_RESTART_CMD is not set; the server reads builtin-packs once per process';
        if (process.env.TOOLJET_BACKEND_RESTART_CMD) {
          const { stdout, stderr } = await run('/bin/zsh', ['-lc', process.env.TOOLJET_BACKEND_RESTART_CMD], { timeout: 180_000 });
          restart = strip(stdout + stderr).trim().split('\n').pop() ?? 'restarted';
        }
        const packs = await loadInstalledPacks(() => client.listComponentLibraries(), () => client.listBuiltinPacks());
        if (packs.length) refreshCatalogResources();
        const listed = (await client.listBuiltinPacks())?.find((p: { info: BuiltinPackInfo }) => p.info.pack === args.name);
        const prefix = `Lib_${args.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}_`;
        const components = Object.keys(manifestSummary(dir) ?? {});
        return ok({
          pack: args.name,
          hash: listed?.info.hash ?? null,
          served: !!listed,
          restart,
          component_types: components.map((c) => `${prefix}${c}`),
          catalogue: packs,
          next: `add_components with type ${prefix}${components[0] ?? 'App'}, name "app", layout {top:0,left:0,width:43,height:900}, props bound to {{queries.<name>.data}}; then add_events for each event; open the editor with ?mode=code.`,
        });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
