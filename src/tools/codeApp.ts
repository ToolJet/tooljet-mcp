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
    code_app_write_files  write app.json, frontend/src and frontend/styles/{theme,global}.css
    code_app_build        refresh typed hooks from the app's queries, build, and check the code against the app
    code_app_install      tooljet app dev --once: upload to the dev track and link the code page, its route pages and
                          the version pin. Refuses while the security scan has critical or high findings.
    code_app_add_dependency  tooljet app vet (malware, known vulnerabilities, versions under 7 days old, licence,
                          blocklist) and only then add the packages to frontend/package.json and install them

  Security: tooljet app check runs @tooljet/app-scanner (code rules, secrets, dependencies) and prints it with --json;
  build reports the offline scan, install runs the full one first, and the server scans again at publish.

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

/** An npm spec an agent may add: a registry name (optionally scoped) with an optional version, range or tag. */
export const PACKAGE_SPEC = /^(@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*(@[A-Za-z0-9.^~<>=*| -]+)?$/;

export function codeAppScaffoldTool(): ToolDef {
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
      display_name: z.string().min(1).max(100).describe("The app's name"),
      app_id: z.string().uuid().describe('The app from create_app'),
    },
    async handler(args: { name: string; display_name: string; app_id: string }) {
      try {
        const dir = projectDir(args.name);
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
    title: 'Read Code Mode Files',
    annotations: { readOnlyHint: true, openWorldHint: false },
    description: 'Read a Code mode project. Without paths, lists its files; with paths, returns their contents (app.json, frontend/...).',
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
    title: 'Write Code Mode Files',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    description:
      'Write whole files into a Code mode project: app.json (name, codePage, routes [{id, path, title}]), frontend/styles/theme.css (tokens), frontend/styles/global.css (page-wide rules and library overrides) and anything under frontend/src/. ' +
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
    title: 'Build Code Mode App',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description:
      "Refresh the typed hooks from the app's current queries (tooljet app pull), build the app's code (TypeScript, Tailwind, " +
      'manifest), and check it against the app (tooljet app check: every useAppQuery name, route, link and page must exist) ' +
      'and the security scan (code rules such as external fetch, eval and token storage; secrets; vendored code). ' +
      'Returns ok and every error and security finding to fix. Repeat write and build until ok, then code_app_install.',
    inputSchema: { name: z.string().regex(NAME) },
    async handler(args: { name: string }) {
      try {
        const dir = requireProject(args.name);
        const started = Date.now();
        const pull = await cli(dir, ['app', 'pull']);
        const build = await cli(join(dir, 'frontend'), ['library', 'build']);
        const tsErrors = Number(/TypeScript compiled \((\d+) errors\)/.exec(build.output)?.[1] ?? (build.code === 0 ? 0 : 1));
        const check = await cli(dir, ['app', 'check', '--offline', '--json']);
        const report = parseReport<{ problems?: { file: string; line: number; message: string }[]; accessibility?: unknown[]; security?: SecurityReport }>(check.output);
        const okBuild = pull.code === 0 && build.code === 0 && tsErrors === 0 && check.code === 0;
        return ok({
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
      "Upload the app's code (tooljet app dev --once): it creates or updates the app's Code mode page, one hidden page per route " +
      "(set each route's page permissions on it), the page's root component, and pins the app version to this build. Build first. " +
      'Runs the full security scan first and refuses while it has critical or high findings, listing them. Returns the editor URL.',
    inputSchema: { name: z.string().regex(NAME) },
    async handler(args: { name: string }) {
      try {
        const dir = requireProject(args.name);
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
        const result = await cli(dir, ['app', 'dev', '--once']);
        if (result.code !== 0) throw new Error(result.output.trim());
        return ok({
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
      'to the exact version vetted and installed without install scripts. Prefer what the template already has (shadcn, Tailwind, lucide-react).',
    inputSchema: {
      name: z.string().regex(NAME),
      packages: z.array(z.string().regex(PACKAGE_SPEC)).min(1).max(10).describe('name, name@version or name@range, e.g. date-fns@4'),
    },
    async handler(args: { name: string; packages: string[] }) {
      try {
        const dir = requireProject(args.name);
        const vet = await cli(dir, ['app', 'vet', ...args.packages, '--json']);
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
        writeFileSync(pkgFile, JSON.stringify(withDependencies(JSON.parse(before), report.packages), null, 2) + '\n');
        const install = await cli(dir, ['app', 'install']);
        if (install.code !== 0) {
          writeFileSync(pkgFile, before);
          if (lockBefore !== null) writeFileSync(lockFile, lockBefore);
          throw new Error(`tooljet app install failed, package.json restored: ${install.output.trim().slice(0, 4000)}`);
        }
        return ok({
          added: report.packages.map((p) => `${p.name}@${p.version}`),
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
