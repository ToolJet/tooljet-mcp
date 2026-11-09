import { z } from 'zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { ok, fail, type ToolDef } from './types.js';
import type { ToolJetClient } from '../tooljetClient.js';
import { CLI_HOME_PREFIX, cleanOldProjects, touchProject, withBuildSlot } from '../codeBuildLimits.js';
import { browserUserQueryProblems } from '../serverUserBindings.js';
import { buildSummary, formatProblems, fromChecked, parseBuildProblems, type CheckedProblem } from '../codeTypeErrors.js';
import { buildInService, buildServiceUrl } from '../codeBuildService.js';
import {
  beforePullCopies,
  clearAgentWrites,
  dependencyRefusal,
  hasAgentWrites,
  insideProject,
  lockfileProblems,
  manifestProblems,
  markAgentWrites,
  nonRegistrySpec,
  pruneBeforePull,
  removeEscapingLinks,
  removeUnstoredSource,
  unstoredSegment,
  withProjectLock,
} from '../codeProjectSafety.js';

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
  point, default `tooljet`), TOOLJET_SDK_SPEC (an npm spec for @tooljet/custom-component-sdk, for an unreleased SDK),
  npm_config_registry (the registry installs use; a project's .npmrc is never read), MCP_CODE_APP_AUTH_TTL_MS (how long
  ToolJet's answer on an app is kept, default 30 s), MCP_CODE_LEGACY_DEPLOYMENT_URL (the backend that folders from
  before deployment folders belong to, default TOOLJET_URL).

  Isolation: the CLI runs in server mode, so no project code runs, with an
  allowlisted environment and the request's own credential (CodeContext), never this process's. Projects live under
  <root>/d_<deployment>/<workspace id>/, where the deployment is the ToolJet backend the request's credential is sent to
  (two backends can hold the same workspace and app ids). Every tool checks with ToolJet that the app belongs to the
  caller before it touches one, and every tool that writes to the project, installs or builds also needs ToolJet to say
  the caller may edit the app. Reading a project needs ToolJet's source API to say the caller may read the app's code
  (an end user who can only use the app may not), on every call, whatever the project caches hold.

  Paths and packages (codeProjectSafety.ts): every file read and write resolves real paths inside the project and
  follows no link; nothing is written under a node_modules or dot folder; installs take registry packages only, from
  the configured registry, and no link out of the project survives one. Tool calls on one project take turns, and the
  first pull of a build forces ToolJet's code over the local copy only while no build has uninstalled writes there.
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

/** Who a Code tool acts for: built per request on HTTP, once per process on stdio (server.ts). */
export interface CodeContext {
  client: Pick<ToolJetClient, 'getApp' | 'codeSourceAccess' | 'renameApp'> & Partial<Pick<ToolJetClient, 'getAppSummary'>>;
  workspaceId(): Promise<string>;
  /** The caller's own credential. On a hosted server, one configured on the process does not count. */
  credential?: { sessionToken?: string; pat?: string };
  apiUrl: string;
  appUrl: string;
}

/** Callers that name no identity get tools that refuse: there is nothing to fall back on. */
export const noCodeIdentity = (client: CodeContext['client']): CodeContext => ({
  client,
  workspaceId: async () => '',
  apiUrl: '',
  appUrl: '',
});

interface CodeScope extends CodeContext {
  workspace: string;
  /** The folder name of the ToolJet backend this request is authenticated against (deploymentKey). */
  deployment: string;
  authorized: Map<string, Grant>;
}

// Per call, so concurrent requests on one HTTP server never see each other's identity (and never through process.env).
const scope = new AsyncLocalStorage<CodeScope>();
const current = (): CodeScope => {
  const active = scope.getStore();
  if (!active) throw new Error('Code tools need a request identity');
  return active;
};

const SAFE_WORKSPACE = /^[A-Za-z0-9-]{1,64}$/;

/*
  The deployment a request acts on is the ToolJet backend its credential is sent to: apiUrl, which the HTTP layer
  accepts only from MCP_ALLOWED_API_ORIGINS or a Gateway check, and stdio takes from its own configuration. ToolJet at
  that address is what authorizes every app id, so a backend that copies another's workspace and app ids still gets a
  folder of its own. The folder name is a hash: it cannot be a workspace id (no underscore) or a project name.
*/
export const deploymentKey = (apiUrl: string): string => {
  let url: URL;
  try {
    url = new URL(apiUrl);
  } catch {
    throw new Error('This request names no valid ToolJet backend.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('This request names no valid ToolJet backend.');
  const canonical = `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, '')}`;
  return `d_${createHash('sha256').update(canonical).digest('hex').slice(0, 24)}`;
};

/** Every Code tool's handler runs here: no credential or no workspace, no work. */
const inScope = <A, R>(context: CodeContext, handler: (args: A) => Promise<R>) => async (args: A): Promise<R | ReturnType<typeof fail>> => {
  try {
    if (!context.credential?.sessionToken && !context.credential?.pat)
      throw new Error('Code tools act for a signed-in user, and this request names none.');
    const deployment = deploymentKey(context.apiUrl);
    const workspace = await context.workspaceId();
    if (!SAFE_WORKSPACE.test(workspace)) throw new Error('This request has no valid workspace.');
    return await scope.run({ ...context, workspace, deployment, authorized: authorizedFor(context) }, () => handler(args));
  } catch (err) {
    return fail(err);
  }
};

export const inCodeScopeForTests = <R>(context: CodeContext, work: () => Promise<R>) => inScope(context, work)(undefined as never);

/** What ToolJet last said about the caller and an app's code, and when. */
interface Grant {
  /** ToolJet's source API serves this caller the app's code (editors, and builders who can view the app). */
  read: boolean;
  /** ToolJet's source API lets this caller write the app's code. */
  edit: boolean;
  at: number;
}
/** read: the project's files reach the caller; edit: the project is changed, built or installed. */
type Need = 'read' | 'edit';

/*
  A context lives for one HTTP request, or for a whole stdio process (one build), and is one caller: its grants are kept
  per context, by backend, workspace and app. ToolJet's answer is kept for MCP_CODE_APP_AUTH_TTL_MS (default 30 s), so
  a build's many writes do not each ask twice, and a permission taken away mid-build stops the next tool call after
  that. 0 asks on every call. The project caches below (freshProjects, lastSynced, ...) hold data only, never a grant:
  every tool call asks this caller's grant first, however fresh the files are.
*/
const grantTtlMs = (): number => {
  const ttl = Number(process.env.MCP_CODE_APP_AUTH_TTL_MS ?? 30_000);
  return Number.isFinite(ttl) && ttl >= 0 ? ttl : 30_000;
};
const authorizations = new WeakMap<CodeContext, Map<string, Grant>>();
const authorizedFor = (context: CodeContext): Map<string, Grant> => {
  const known = authorizations.get(context) ?? new Map<string, Grant>();
  authorizations.set(context, known);
  return known;
};

/**
 * ToolJet's answers, under the caller's own credential: the app is in the caller's workspace (GET /api/apps/:id), and
 * ToolJet's Code source API, which checks public apps like private ones, would serve (read) or accept (edit) this
 * caller's source. App view is not enough: an end user can view an app whose code ToolJet never serves them, and on a
 * public app the apps module's edit check passes for any member. A refusal stops the tool before it touches the project.
 */
const authorizeApp = async (appId: string, need: Need): Promise<void> => {
  const active = current();
  const key = `${active.deployment}\0${active.workspace}\0${appId}`;
  const known = active.authorized.get(key);
  if (known && Date.now() - known.at < grantTtlMs() && known[need]) return;
  active.authorized.delete(key);
  let app: { organizationId?: string; organization_id?: string; editing_version?: { id?: string }; editingVersion?: { id?: string } };
  try {
    app = await active.client.getApp(appId);
  } catch {
    throw new Error(`App ${appId} was not found in this workspace.`);
  }
  const owner = app?.organizationId ?? app?.organization_id;
  if (!owner || owner !== active.workspace) throw new Error(`App ${appId} was not found in this workspace.`);
  const versionId = app?.editing_version?.id ?? app?.editingVersion?.id;
  let access: { read: boolean; write: boolean };
  try {
    if (!versionId) throw new Error('no version');
    access = await active.client.codeSourceAccess(appId, versionId);
  } catch {
    throw new Error(
      need === 'edit'
        ? `ToolJet could not confirm that you can edit app ${appId}, so nothing was changed.`
        : `ToolJet could not confirm that you can read app ${appId}'s code, so nothing was read.`
    );
  }
  const grant: Grant = { read: access.read, edit: access.read && access.write, at: Date.now() };
  active.authorized.set(key, grant);
  if (need === 'edit' && !grant.edit) {
    throw new Error(
      grant.read
        ? `You can view app ${appId} but not edit it, so its code cannot be changed, built or installed here.`
        : `You can view app ${appId} but not edit it or read its code, so its code cannot be changed, built or installed here.`
    );
  }
  if (need === 'read' && !grant.read) throw new Error(`You can use app ${appId} but ToolJet does not let you read its code.`);
};

const baseRoot = (): string => resolve(process.env.TOOLJET_CODE_APP_ROOT || join(homedir(), 'tooljet-code-apps'));
const root = (): string => join(baseRoot(), current().deployment, current().workspace);

/*
  Folders from before deployment namespaces: <root>/<workspace id>/ and, older still, <root>/ itself. They carry no
  deployment, so they belong to one: MCP_CODE_LEGACY_DEPLOYMENT_URL when set, else this process's configured TOOLJET_URL
  (what every request used before a request could name its own backend). Only a request authenticated against that
  backend, for an app ToolJet says is the caller's, moves one into its namespaced folder.
*/
const legacyFolders = (): string[] => {
  const owner = process.env.MCP_CODE_LEGACY_DEPLOYMENT_URL || process.env.TOOLJET_URL || process.env.TOOLJET_DEPLOYMENT_URL ||
    process.env.TOOLJET_APP_URL || 'http://localhost:3000';
  try {
    if (deploymentKey(owner) !== current().deployment) return [];
  } catch {
    return [];
  }
  return [join(baseRoot(), current().workspace), baseRoot()];
};
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

const projectsIn = (folder: string, appId: string): string[] => {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && NAME.test(entry.name) && appIdOf(join(folder, entry.name)) === appId)
    .map((entry) => entry.name)
    .sort((a, b) => statSync(join(folder, b, 'app.json')).mtimeMs - statSync(join(folder, a, 'app.json')).mtimeMs);
};

/** The projects for an app in the caller's workspace, newest app.json first (older ones are leftovers of an earlier scaffold). */
export const projectsForApp = (appId: string): string[] => {
  // A project from before the namespaced folders moves in, once ToolJet has said the app is the caller's.
  for (const folder of legacyFolders()) {
    for (const name of projectsIn(folder, appId)) {
      mkdirSync(root(), { recursive: true });
      if (!existsSync(join(root(), name))) renameSync(join(folder, name), join(root(), name));
    }
  }
  return projectsIn(root(), appId);
};

const APP_ID = z.string().uuid().optional().describe("The app's id: finds its project, so you never have to know the folder name");
const PROJECT_NAME = z.string().regex(NAME).optional().describe('The project folder, when you know it; app_id is enough');

/**
 * A tool's project: by app_id (preferred), else by name. Either way, only one whose code the caller may read, and for
 * a tool that changes the project (need: 'edit'), only one whose app the caller may edit.
 */
const locateProject = async (args: { name?: string; app_id?: string }, need: Need): Promise<string> => {
  let dir: string;
  if (args.app_id) {
    await authorizeApp(args.app_id, need);
    const [found] = projectsForApp(args.app_id);
    if (!found) throw new Error(`no Code mode project for app ${args.app_id}; call code_app_scaffold with this app_id`);
    // The app id names the project; a different name beside it is a slip, not another project (3 install refusals in
    // 20 builds, 2026-11-04, each costing a call to resend without it).
    dir = join(root(), found);
  } else {
    if (!args.name) throw new Error('give app_id (or the project name)');
    dir = projectDir(args.name);
    const legacy = existsSync(join(dir, 'app.json'))
      ? undefined
      : legacyFolders().map((folder) => join(folder, args.name!)).find((candidate) => existsSync(join(candidate, 'app.json')));
    const owner = appIdOf(legacy ?? dir);
    if (!owner) throw new Error(`no app project "${args.name}"; call code_app_scaffold first`);
    await authorizeApp(owner, need);
    if (legacy) {
      mkdirSync(root(), { recursive: true });
      renameSync(legacy, dir);
    }
  }
  touchProject(dir);
  return dir;
};

/** The lock that makes tool calls on one project take turns, across processes (codeProjectSafety.ts). */
const projectLockPath = (dir: string): string =>
  join(baseRoot(), '.locks', `${current().deployment}.${current().workspace}.${basename(dir)}`);
const onProject = <T>(dir: string, work: () => Promise<T>): Promise<T> => withProjectLock(projectLockPath(dir), work);

/** What an agent may write: app.json, the frontend's source, and the two style files (theme.css, global.css). */
const STYLE_FILES = new Set(['frontend/styles/theme.css', 'frontend/styles/global.css']);
export const editable = (dir: string, path: string): string => {
  const full = resolve(dir, path);
  const rel = relative(dir, full).split(sep).join('/');
  if (!(rel === 'app.json' || STYLE_FILES.has(rel) || (rel.startsWith('frontend/src/') && !rel.endsWith('tooljet.gen.ts')))) {
    throw new Error(
      `"${path}" is not editable: write app.json, frontend/styles/theme.css, frontend/styles/global.css or files under frontend/src/ (tooljet.gen.ts is generated)`
    );
  }
  // A package under frontend/src/node_modules is bundled but never stored or scanned; a dot file is never stored.
  const unstored = unstoredSegment(rel.slice('frontend/'.length));
  if (rel.startsWith('frontend/') && unstored) {
    throw new Error(
      unstored === 'node_modules'
        ? `"${path}" is not editable: nothing may be written under a node_modules folder (add packages with code_app_add_dependency)`
        : `"${path}" is not editable: files and folders whose names start with a dot are never stored with the app`
    );
  }
  // Real paths: a link anywhere below the project, or a path that resolves out of it, is refused.
  return insideProject(dir, rel, path);
};

const TEXT = /\.(tsx?|jsx?|json|css|md)$/i;
const listFiles = (dir: string, base = dir, out: string[] = []): string[] => {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist'].includes(entry.name) || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, base, out);
    else if (entry.isFile() && TEXT.test(entry.name) && entry.name !== 'package-lock.json') out.push(relative(base, full).split(sep).join('/'));
  }
  return out.sort();
};

const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

/** Non-secret settings the CLI and npm need from the host: network, certificates, locale. Nothing else crosses. */
const HOST_ENV = ['PATH', 'TMPDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL', 'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'no_proxy',
  'NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE', 'SSL_CERT_DIR', 'TOOLJET_SDK_SPEC', 'TOOLJET_APP_SCANNER_BIN'];
const SECRET_NAME = /TOKEN|SECRET|PASSWORD|PASSWD|KEY|PAT$|CREDENTIAL|COOKIE/i;
/** More names an operator lets through (a corporate setting), never one that looks like a secret. */
const operatorEnv = (): string[] =>
  (process.env.MCP_CODE_CLI_ENV_PASS ?? '').split(',').map((name) => name.trim()).filter((name) => name && !SECRET_NAME.test(name));

// A home per process: nothing the CLI or npm keeps there (a stored login, an npm auth line) reaches another build.
let cliHome: string | undefined;
const buildHome = (): string => (cliHome ??= mkdtempSync(join(tmpdir(), CLI_HOME_PREFIX)));
process.once('exit', () => {
  if (cliHome) rmSync(cliHome, { recursive: true, force: true });
});

export const cliEnv = (): NodeJS.ProcessEnv => {
  const active = current();
  const env: NodeJS.ProcessEnv = {};
  for (const name of [...HOST_ENV, ...operatorEnv()]) if (process.env[name] !== undefined) env[name] = process.env[name];
  const { sessionToken, pat } = active.credential ?? {};
  return {
    ...env,
    HOME: buildHome(),
    USERPROFILE: buildHome(),
    FORCE_COLOR: '0',
    // The CLI is oclif: under NODE_ENV=development it loads its TypeScript sources instead of the build and fails
    // ("Unexpected token ':'"). A ToolJet server running in development passes that on to this MCP server.
    NODE_ENV: 'production',
    TOOLJET_CLI_SERVER_MODE: '1',
    TOOLJET_URL: active.apiUrl,
    TOOLJET_APP_URL: process.env.TOOLJET_DEPLOYMENT_URL ?? active.appUrl,
    ...(sessionToken ? { TOOLJET_SESSION_TOKEN: sessionToken, TOOLJET_WORKSPACE_ID: active.workspace } : { TOOLJET_PAT: pat }),
    // npm's cache is by content hash, so projects can share it; a home per process alone would download everything each build.
    npm_config_cache: process.env.MCP_CODE_NPM_CACHE ?? join(baseRoot(), '.npm-cache'),
    ...(registry() ? { npm_config_registry: registry() } : {}),
  };
};
const registry = (): string | undefined => process.env.npm_config_registry ?? process.env.NPM_CONFIG_REGISTRY;

const COUNTED_COMMANDS = new Set(['library build', 'app dev', 'app install', 'app check']);

const runCli = async (cwd: string, args: string[], timeoutMs: number): Promise<{ code: number; output: string }> => {
  const [cmd, pre] = process.env.TOOLJET_CLI ? ['node', [process.env.TOOLJET_CLI]] : ['tooljet', []];
  try {
    const { stdout, stderr } = await run(cmd, [...pre, ...args], { cwd, timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, env: cliEnv() });
    return { code: 0, output: strip(stdout + stderr) };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number; message?: string };
    return { code: typeof e.code === 'number' ? e.code : 1, output: strip((e.stdout ?? '') + (e.stderr ?? e.message ?? '')) };
  }
};

/*
  A CLI that does not know server mode would run project code and say nothing, and the CLI and this server deploy
  separately. So the first call asks it, and nothing runs on a no.
*/
let serverModeChecked: Promise<void> | undefined;
const requireServerModeCli = (): Promise<void> => {
  if (process.env.MCP_CODE_CLI_HANDSHAKE === '0') return Promise.resolve();
  serverModeChecked ??= runCli(baseRoot(), ['app', 'server-mode'], 60_000).then((answer) => {
    if (!answer.output.includes('tooljet-server-mode:1')) {
      serverModeChecked = undefined;
      throw new Error('This server\'s ToolJet CLI does not support server mode, so Code builds are off here. Update the CLI.');
    }
  });
  return serverModeChecked;
};

async function cli(cwd: string, args: string[], timeoutMs = 300_000): Promise<{ code: number; output: string }> {
  mkdirSync(baseRoot(), { recursive: true });
  await requireServerModeCli();
  const command = args.filter((a) => !a.startsWith('-')).slice(0, 2).join(' ');
  if (!COUNTED_COMMANDS.has(command)) return runCli(cwd, args, timeoutMs);
  return withBuildSlot(baseRoot(), `${current().deployment}.${current().workspace}`, () => runCli(cwd, args, timeoutMs));
}

const PLACEHOLDER_NAME = /^Untitled App\b/;

/**
 * Give an app still named "Untitled App: ..." (the dashboard's placeholder) its real name, as apply_app_phase does
 * for a visual build. Names are unique per workspace: a taken one gets a short suffix. Returns the name it got.
 */
async function nameApp(
  client: Pick<ToolJetClient, 'renameApp'> | undefined,
  dir: string,
  name: string,
  replaceName?: string
): Promise<{ renamed_to?: string; rename_warning?: string }> {
  let snapshot: { appId?: string; appName?: string; versionId?: string };
  try {
    snapshot = JSON.parse(readFileSync(join(dir, '.tooljet', 'snapshot.json'), 'utf8'));
  } catch {
    return {};
  }
  // replaceName: the name the dashboard gave a new Code mode app from the prompt's first words ("I run procurement at",
  // 2026-11-05), which the agent passes on; the app keeps any other name someone chose.
  const standIn = PLACEHOLDER_NAME.test(snapshot.appName ?? '') || (!!replaceName && snapshot.appName === replaceName);
  if (!client || !snapshot.appId || !snapshot.versionId || !standIn || snapshot.appName === name) return {};
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

export function codeAppScaffoldTool(context: CodeContext): ToolDef {
  return {
    name: 'code_app_scaffold',
    title: 'Scaffold Code Mode App',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description:
      'Create the Code mode project for an app you created with create_app: app.json (the app and its routes, its screens) and ' +
      'frontend/ (React + TypeScript on shadcn + Tailwind, react-router through AppRouter). Create the app\'s queries (code_app_data) ' +
      'BEFORE this, so the typed hooks it writes (frontend/src/tooljet.gen.ts: useAppQuery, row types, ROUTES, routePath, PAGES) list them. ' +
      'Returns the files and the generated hooks.' + USER_WORDS,
    inputSchema: {
      name: z.string().regex(NAME).describe('Project folder: lowercase letters, digits and hyphens, e.g. inventory-console'),
      display_name: z.string().min(1).max(100).describe("The app's name; an app still called \"Untitled App\" is renamed to it"),
      app_id: z.string().uuid().describe('The app from create_app'),
      rename_from: z.string().max(100).optional().describe('Set by ToolJet; leave it out'),
    },
    handler: inScope(context, async (args: { name: string; display_name: string; app_id: string; rename_from?: string }) => {
      try {
        // Before anything is created or installed: a stranger's app id, or one the caller can only view, costs no disk
        // and no install.
        await authorizeApp(args.app_id, 'edit');
        cleanOldProjects(baseRoot());
        // One project per app: an app that already has one gets it back, whatever name is asked for.
        const [existing] = projectsForApp(args.app_id);
        const dir = existing ? join(root(), existing) : projectDir(args.name);
        return await onProject(dir, async () => {
          const owner = appIdOf(dir);
          if (!existing && owner && owner !== args.app_id)
            throw new Error(`project "${args.name}" belongs to app ${owner}; choose another name`);
          const created = !existsSync(join(dir, 'app.json'));
          if (created) {
            mkdirSync(root(), { recursive: true });
            const init = await cli(root(), ['app', 'init', args.name, '--name', args.display_name, '--no-install']);
            if (init.code !== 0) throw new Error(`tooljet app init failed: ${init.output}`);
            const appFile = join(dir, 'app.json');
            writeFileSync(appFile, JSON.stringify({ ...JSON.parse(readFileSync(appFile, 'utf8')), appId: args.app_id }, null, 2) + '\n');
            // The CLI's install: never runs a package's install scripts (npm/pnpm/yarn with --ignore-scripts). It takes the SDK
            // from TOOLJET_SDK_SPEC without recording that path in the project, so it never reaches ToolJet's stored code.
            const install = await installDependencies(dir, 'Installing the template');
            if (install.code !== 0) throw new Error(`tooljet app install failed: ${install.output}`);
          }
          const pull = await cli(dir, ['app', 'pull']);
          if (pull.code !== 0) throw new Error(`tooljet app pull failed: ${pull.output}`);
          const restored = created ? await restoreStoredCode(dir) : {};
          const naming = await nameApp(context.client, dir, args.display_name, args.rename_from);
          if (!existing && !restored.stored_code) rememberScaffold(dir);
          return ok({
            project_dir: dir,
            ...naming,
            ...restored,
            ...(existing ? { existing_project: existing, note: `This app already has a project, "${existing}"; it is used as is.` } : {}),
            files: listFiles(dir),
            app_json: JSON.parse(readFileSync(join(dir, 'app.json'), 'utf8')),
            generated_hooks: readFileSync(join(dir, 'frontend', 'src', 'tooljet.gen.ts'), 'utf8'),
            next: 'Set the routes in app.json, write the screens under frontend/src/App/, then code_app_install with verify: true.',
          });
        });
      } catch (err) {
        return fail(err);
      }
    }),
  };
}

/*
  A new project folder for an app that already has code on ToolJet (its folder was cleaned up, or this host never had
  one): the folder starts as the template, with a new library id, so a plain source-pull refused to overwrite it and the
  agent rebuilt the app from scratch over the stored code, then could not install it ("a library named ... already
  exists"). The template holds nothing of anyone's, so ToolJet's
  code replaces it here, its .tooljet/config.json naming the app's library, and the install step runs again when the
  stored package.json differs from the template's.
*/
async function restoreStoredCode(dir: string): Promise<{ stored_code?: string; sync_warning?: string }> {
  const manifest = join(dir, 'frontend', 'package.json');
  const before = existsSync(manifest) ? readFileSync(manifest, 'utf8') : '';
  const pull = await cli(dir, ['app', 'source-pull', '--force'], 60_000);
  if (pull.code !== 0 && /\b(401|403)\b|unauthori[sz]ed|forbidden/i.test(pull.output)) throw new Error('ToolJet refused access to this app\'s stored code.');
  if (pull.code !== 0) return { sync_warning: `Could not bring the app's stored code into the new project: ${pull.output.trim().slice(0, 300)}` };
  if (/No source is stored/i.test(pull.output)) {
    // Just checked: the first touch of this build need not ask again.
    nothingStored.add(dir);
    freshProjects.add(dir);
    lastSynced.set(dir, Date.now());
    return {};
  }
  if (!/Pulled revision|Already at revision/.test(pull.output)) return {};
  if ((existsSync(manifest) ? readFileSync(manifest, 'utf8') : '') !== before) {
    const install = await installDependencies(dir, "Installing the app's stored dependencies");
    if (install.code !== 0) throw new Error(`tooljet app install failed after bringing the app's code down: ${install.output}`);
  }
  freshProjects.add(dir);
  lastSynced.set(dir, Date.now());
  return {
    stored_code:
      "This app already has code on ToolJet: the project now holds it, not the template. Read the files you change before writing them, and keep the app's existing screens.",
  };
}

/**
 * `tooljet app install`, only for registry dependencies (codeProjectSafety.ts): the package.json and lockfile come from
 * the stored code, which any editor can change, and a file: or link: dependency linked node_modules to any folder on
 * this host. After the install no link may lead out of the project.
 */
async function installDependencies(dir: string, what: string, timeoutMs?: number): Promise<{ code: number; output: string }> {
  const refusal = dependencyRefusal(dir, what);
  if (refusal) throw refusal;
  const install = await cli(dir, ['app', 'install'], timeoutMs);
  const escaped = removeEscapingLinks(dir);
  if (escaped) throw escaped;
  return install;
}

type SyncResult = { editor_edits?: string; sync_warning?: string; before_pull_copy?: string };

/** `tooljet app source-pull`: what it reports when it brought editor edits down, or a warning when it could not run. */
async function syncEditorEdits(dir: string, { force = false } = {}): Promise<SyncResult> {
  // Nothing to bring down until the first install stores the code: a pull on every write was 29 s of a first build
  // (2026-11-03). Only the check that found no stored code counts, so a project that has code still pulls every time.
  if (!force && nothingStored.has(dir)) return {};
  if (force) forgetSourceRevision(dir);
  let pull = await cli(dir, ['app', 'source-pull'], 60_000);
  /*
    The first pull of a build, before this build has written anything: files that differ here are only this server's
    copy, never anyone's work, so ToolJet's code replaces them (the CLI keeps a copy in .tooljet/before-pull). A plain
    pull refused when the copy was behind a new draft holding the user's Code panel edit, so the agent could neither read
    the edit nor install over it (2026-11-05: a hand edit that did not build, which the agent was asked to fix).
  */
  let copy: string | undefined;
  if (force && pull.code !== 0 && /Not pulled\. These files differ/i.test(pull.output)) {
    const copies = new Set(beforePullCopies(dir));
    pull = await cli(dir, ['app', 'source-pull', '--force'], 60_000);
    // The CLI keeps a copy of what it replaced, a new folder each time: the newest three are kept, and the result says where.
    copy = pruneBeforePull(dir).find((kept) => !copies.has(kept));
  }
  // A refusal is an answer about who is asking, so nothing goes on from a local copy. Anything else may be a passing fault.
  if (pull.code !== 0 && /\b(401|403)\b|unauthori[sz]ed|forbidden/i.test(pull.output)) throw new Error('ToolJet refused access to this app\'s stored code.');
  if (pull.code !== 0) return { sync_warning: `Could not check the ToolJet editor for edits: ${pull.output.trim().slice(0, 300)}` };
  if (/No source is stored/i.test(pull.output)) nothingStored.add(dir);
  else nothingStored.delete(dir);
  lastSynced.set(dir, Date.now());
  // What the agent read stays recorded: a write compares it with the file as the pull left it, so only a file the pull
  // changed needs reading again.
  return {
    ...(/Pulled revision/.test(pull.output) ? { editor_edits: pull.output.trim() } : {}),
    ...(copy ? { before_pull_copy: `The files this pull replaced are kept in ${copy} (the last 3 copies are kept).` } : {}),
  };
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
const nothingStored = new Set<string>();
/** The files as scaffolded, by project and path: replacing the template's own file is not a rewrite of anyone's work. */
const scaffoldHashes = new Map<string, string>();
const readHashes = new Map<string, string>();
/** The files as this build last wrote them: replacing the build's own file whole is not a rewrite of anyone's work. */
const ownWrites = new Map<string, string>();
/*
  When each project last checked the stored code. Every read ran `tooljet app source-pull` (a CLI process and a request,
  1.6 to 2 s), and an edit reads 7 files on average, several in one turn (2026-11-02 traces). A read within
  readSyncWindowMs() of the last check reuses it. Writes always check: a file edited in the editor since it was read
  is still refused, because the write's check brings the edit down and its hash no longer matches the read.
*/
const lastSynced = new Map<string, number>();
const readSyncWindowMs = (): number => Number(process.env.MCP_CODE_APP_READ_SYNC_MS ?? 20_000);
const syncedRecently = (dir: string): boolean => Date.now() - (lastSynced.get(dir) ?? -Infinity) < readSyncWindowMs();
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

function rememberScaffold(dir: string): void {
  for (const rel of listFiles(dir)) {
    const full = join(dir, rel);
    if (existsSync(full)) scaffoldHashes.set(readKey(dir, rel), sha(readFileSync(full, 'utf8')));
  }
}

/** Projects this process has written to (code_app_write_files, code_app_add_dependency). */
const wroteHere = new Set<string>();

/** The build has written to the project and not installed since: in this process, or by the marker any process left. */
const unstoredWrites = (dir: string): boolean => wroteHere.has(dir) || hasAgentWrites(dir);

/** Record a write before it happens, so no later first pull of any build replaces it until an install stores it. */
function noteWrite(dir: string): void {
  wroteHere.add(dir);
  markAgentWrites(dir);
}

/*
  The stored code, once per build per project (the MCP process lives for one build). The first pull takes ToolJet's code
  over the local copy only while no build has written to the project since its last install: a retry after a failed
  pull, a second build on the same app, or a restart of this server would otherwise replace writes nobody has stored
  yet (the install then reported success without them). With writes pending, it is a plain pull, which refuses to
  overwrite them and says so.
*/
async function ensureFresh(dir: string): Promise<SyncResult> {
  if (freshProjects.has(dir)) return {};
  const sync = await syncEditorEdits(dir, { force: !unstoredWrites(dir) });
  if (!sync.sync_warning) freshProjects.add(dir);
  return sync;
}

/*
  The full security scan an install runs (`tooljet app check --json`, network checks included) took 3.7 s of the
  install's time on a finished project (2026-11-03), and the model spends the turn after a passing build writing the
  install call. So a passing build starts that same scan in the background, and the install uses it only when no file
  of the project has changed since: the hash of every file the scanner reads (it skips node_modules, dist and .tooljet,
  where the check itself rewrites the app snapshot), taken before and after the scan, must equal the hash at install time. Any change, a scan that did not run, or one older than scanReuseMs()
  means the install scans again as before. MCP_CODE_APP_SCAN_PREFETCH=0 turns it off.
*/
const prefetchedScans = new Map<string, { hash: string; at: number; result: Promise<{ code: number; output: string } | null> }>();
const scanReuseMs = (): number => Number(process.env.MCP_CODE_APP_SCAN_REUSE_MS ?? 600_000);

/*
  Install reuse (speed A/B, MCP_CODE_INSTALL_REUSE=1, off by default). A checked install built the app twice and scanned it
  three times: code_app_build's production build and offline check, the install's full scan, then `app dev --once`, which
  built a development bundle and scanned again for the Security panel. With reuse on, code_app_build makes the development
  bundle (the one the canvas loads, with the Inspector's source tags), and an install of exactly those files uploads it
  with --prebuilt and leaves the panel to the server's own check of the stored code, which runs on every save.
  The install's full scan still gates it. Any change since the build, or a pulled edit, builds again as before.
*/
const installReuse = (): boolean => process.env.MCP_CODE_INSTALL_REUSE === '1' && !buildServiceUrl();
const devBuilt = new Map<string, string>();

/** A hash of the project's files outside node_modules, dist and .tooljet (paths and contents). */
export function projectHash(dir: string): string {
  const hash = createHash('sha256');
  const walk = (at: string): void => {
    for (const entry of readdirSync(at, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      if (entry.isDirectory() && ['node_modules', 'dist', '.tooljet'].includes(entry.name)) continue;
      const full = join(at, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) hash.update(relative(dir, full)).update('\0').update(readFileSync(full)).update('\0');
    }
  };
  walk(dir);
  return hash.digest('hex');
}

function prefetchFullScan(dir: string): void {
  if (process.env.MCP_CODE_APP_SCAN_PREFETCH === '0') return;
  const hash = projectHash(dir);
  const result = cli(dir, ['app', 'check', '--json']).then((check) => {
    try {
      return projectHash(dir) === hash ? check : null;
    } catch {
      return null;
    }
  });
  prefetchedScans.set(dir, { hash, at: Date.now(), result });
}

/** The install's full scan: the one a passing build started, when nothing changed since, else a new one. */
async function fullScan(dir: string): Promise<{ code: number; output: string; reused: boolean }> {
  const prefetched = prefetchedScans.get(dir);
  prefetchedScans.delete(dir);
  if (prefetched && Date.now() - prefetched.at < scanReuseMs() && projectHash(dir) === prefetched.hash) {
    const check = await prefetched.result;
    const security = check && parseReport<{ security?: SecurityReport }>(check.output)?.security;
    if (check && security && !security.error && projectHash(dir) === prefetched.hash) return { ...check, reused: true };
  }
  return { ...(await cli(dir, ['app', 'check', '--json'])), reused: false };
}

/** Tests: wait for the scan a build started in the background. */
export async function prefetchedScanForTests(dir: string): Promise<unknown> {
  return prefetchedScans.get(dir)?.result;
}

/** Tests: a new build (a new MCP process) starts with nothing pulled or read. */
export function resetCodeSessionForTests(): void {
  freshProjects.clear();
  nothingStored.clear();
  scaffoldHashes.clear();
  readHashes.clear();
  ownWrites.clear();
  wroteHere.clear();
  lastSynced.clear();
  prefetchedScans.clear();
  sdkCopied.clear();
}

/** Projects whose linked SDK this process has asked the CLI to copy in: once each, since an older CLI links it again. */
const sdkCopied = new Set<string>();

/**
 * A project installed while the CLI linked a file: SDK (until 2026-11-04) has the SDK as a link out of the project,
 * which a server-mode build may not read: TS2307 on every `ToolJet` import and `any` from every hook. `tooljet app
 * install` copies it in.
 */
async function copySdkIn(dir: string): Promise<void> {
  let linked = false;
  try {
    linked = lstatSync(join(dir, 'frontend', 'node_modules', '@tooljet', 'custom-component-sdk')).isSymbolicLink();
  } catch {
    return;
  }
  if (!linked || sdkCopied.has(dir)) return;
  sdkCopied.add(dir);
  await installDependencies(dir, 'Copying the SDK into the project', 180_000);
}

const TYPE_CHECKED = /^frontend\/(src\/.*\.tsx?|.*\.css)$/;

/**
 * The type check after a write (`tooljet library typecheck`, incremental), so the next write fixes what this one broke
 * before code_app_build is called. On with MCP_CODE_WRITE_TYPECHECK=1, off by default until an A/B says it pays: on a
 * 5,000-line app it adds 0.85 s to a write (1.8 s the first time), and a build makes about 13 writes that touch code,
 * so about 11 s a build, against about 0.4 failed build rounds a build left to save once the SDK's types are readable
 * (2026-11-04). Nothing when the CLI has no such command or the check could not run: the build checks everything anyway.
 */
async function typeCheckAfterWrite(dir: string, written: string[]): Promise<Record<string, unknown> | undefined> {
  if (process.env.MCP_CODE_WRITE_TYPECHECK !== '1' || !written.some((rel) => TYPE_CHECKED.test(rel))) return undefined;
  await copySdkIn(dir);
  const result = await cli(join(dir, 'frontend'), ['library', 'typecheck', '--json'], 30_000);
  const report = parseReport<{ problems?: CheckedProblem[] }>(result.output);
  if (!Array.isArray(report?.problems)) return undefined;
  if (!report.problems.length) return { errors: 0 };
  const problems = report.problems.map(fromChecked);
  const unwritten = problems.filter((p) => p.code === 'TS2307' && /Cannot find module '\.{1,2}\//.test(p.message));
  const rest = problems.filter((p) => !unwritten.includes(p));
  return {
    errors: problems.length,
    ...(rest.length ? { fix: formatProblems(rest, 25) } : {}),
    ...(unwritten.length
      ? { not_written_yet: [...new Set(unwritten.map((p) => `${/'([^']+)'/.exec(p.message)?.[1]} (imported at ${p.at})`))] }
      : {}),
    note: 'Fix these in this round of writes, before code_app_build. An import of a file you have not written yet clears once you write it.',
  };
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

const clip = (line: string): string => (line.trim().length > 100 ? `${line.trim().slice(0, 100)}...` : line.trim());
const lineAt = (text: string, index: number): number => text.slice(0, index).split('\n').length;

/**
 * Where an edit's find text is, for its refusal, so the next try can be right without another read: every match with
 * the line before it (a find that occurs several times needs a neighbouring line added), or, for a find that is not in
 * the file, the lines that come closest. In the purchase approvals build and edits (2026-11-02) 16 of 38 write calls were refused
 * this way, and the repair turns cost 52 s and 23k output tokens.
 */
export function findHint(content: string, find: string): string {
  const lines = content.split('\n');
  const at: number[] = [];
  for (let i = content.indexOf(find); i >= 0 && at.length < 6; i = content.indexOf(find, i + 1)) at.push(lineAt(content, i));
  if (at.length > 1) {
    const shown = at.slice(0, 5).map((n) => `line ${n}${n > 1 ? ` (after "${clip(lines[n - 2])}")` : ''}`);
    return ` It is at ${shown.join('; ')}${at.length > 5 ? '; and more' : ''}. Add a neighbouring line to the find so it matches one place.`;
  }
  if (at.length === 1) return '';
  // Indentation or trailing spaces: the same lines once each is trimmed.
  const wanted = find.split('\n').map((l) => l.trim());
  const trimmed = lines.map((l) => l.trim());
  const starts = trimmed.flatMap((l, i) => (wanted.every((w, k) => trimmed[i + k] === w) ? [i + 1] : []));
  if (starts.length === 1)
    return ` The same lines are at line ${starts[0]} with different indentation or spacing; copy them exactly as the file has them.`;
  // Otherwise the lines sharing the most words with the find's longest line.
  const words = (l: string) => new Set(l.match(/[A-Za-z_$][\w$]*|\d+/g) ?? []);
  const key = wanted.reduce((a, b) => (b.length > a.length ? b : a), '');
  const target = words(key);
  if (!target.size) return '';
  const scored = lines
    .map((l, i) => {
      const w = words(l);
      const shared = [...target].filter((t) => w.has(t)).length;
      return { n: i + 1, l, score: shared / Math.max(target.size, w.size) };
    })
    .filter((x) => x.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  return scored.length ? ` Closest: ${scored.map((x) => `line ${x.n}: "${clip(x.l)}"`).join('; ')}.` : '';
}

/** A whole-file write that replaces this much of an existing file is a rewrite, and needs rewrite: true. */
export const isRewrite = (before: string, after: string): boolean => {
  const changed = changedLines(before, after);
  const size = Math.max(before.split('\n').length, after.split('\n').length);
  return changed > 20 && changed > 0.4 * size;
};

export function codeAppReadFilesTool(context: CodeContext): ToolDef {
  return {
    name: 'code_app_read_files',
    title: 'Read Code Mode Files',
    annotations: { readOnlyHint: true, openWorldHint: true },
    description:
      'Read a Code mode project. Without paths, lists its files; with paths, returns their contents (app.json, frontend/...). ' +
      'Edits saved in the ToolJet Code panel since the last install are brought into the project first.' + USER_WORDS,
    inputSchema: { app_id: APP_ID, name: PROJECT_NAME, paths: z.array(z.string()).optional() },
    handler: inScope(context, async (args: { app_id?: string; name?: string; paths?: string[] }) => {
      try {
        const dir = await locateProject(args, 'read');
        return await onProject(dir, async () => {
          if (!freshProjects.has(dir)) await followDraft(dir);
          const sync = !freshProjects.has(dir) ? await ensureFresh(dir) : syncedRecently(dir) ? {} : await syncEditorEdits(dir);
          if (!args.paths?.length) return ok({ project_dir: dir, ...sync, files: listFiles(dir) });
          const files = Object.fromEntries(
            args.paths.map((p) => {
              // Real paths, and no link followed: an installed file: dependency linked node_modules/<name> to any folder.
              const full = insideProject(dir, p);
              const rel = relative(dir, full).split(sep).join('/');
              const content = readFileSync(full, 'utf8');
              readHashes.set(readKey(dir, rel), sha(content));
              return [p, content];
            })
          );
          return ok({ project_dir: dir, ...sync, files });
        });
      } catch (err) {
        return fail(err);
      }
    }),
  };
}

export function codeAppWriteFilesTool(context: CodeContext): ToolDef {
  return {
    name: 'code_app_write_files',
    title: 'Write Code Mode Files',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    description:
      'Write into a Code mode project: app.json (name, codePage, routes [{id, path, title}]), frontend/styles/theme.css (tokens), frontend/styles/global.css (page-wide rules and library overrides) and anything under frontend/src/. ' +
      'To change an existing file, read it first (code_app_read_files) and pass edits: [{ path, find, replace }] with the exact text to change; ' +
      'a file you wrote in this build needs no read first, and before the first install may be sent whole again. ' +
      'files: [{ path, content }] is for new files and for replacing a file still as the template left it, or for a rewrite the request needs (then rewrite: true, as well as the files). A write to a file that changed ' +
      'in the ToolJet editor since you read it is refused: read it again and apply your change to what is there. ' +
      'Read data with useAppQuery from ../tooljet.gen; write by awaiting a query\'s run({ ...parameters }); route with AppRouter, ' +
      'react-router <Routes>/<Route> whose paths are exactly app.json\'s, and routePath(id, params). ' +
      'A type_check in the result lists the project\'s type errors after this write: fix them before code_app_build. Then code_app_build.' + USER_WORDS,
    inputSchema: {
      app_id: APP_ID,
      name: PROJECT_NAME,
      files: z.array(z.object({ path: z.string(), content: z.string() })).max(40).optional(),
      edits: z.array(z.object({ path: z.string(), find: z.string().min(1), replace: z.string() })).max(60).optional()
        .describe('Targeted changes to existing files: each find must appear exactly once in the file as it is now'),
      rewrite: z.boolean().optional().describe('Allow files to replace most of an existing file (only when the request needs it)'),
    },
    handler: inScope(context, async (args: { app_id?: string; name?: string; files?: { path: string; content: string }[]; edits?: { path: string; find: string; replace: string }[]; rewrite?: boolean }) => {
      try {
        const dir = await locateProject(args, 'edit');
        return await onProject(dir, async () => {
          if (!args.files?.length && !args.edits?.length)
            throw new Error(
              `Nothing was written: this call had no files and no edits, so it sent no code${args.rewrite ? ' (rewrite: true only allows a rewrite, it carries none)' : ''}. ` +
                'Send the code in this call: files: [{ path, content }] with the whole file, or edits: [{ path, find, replace }].'
            );
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
            const stillTemplate = before !== undefined && scaffoldHashes.get(readKey(dir, rel)) === sha(before);
            // Until the first install stores the code, a file this build wrote may be sent whole again: 20 builds had 11
            // whole-file writes of their own files refused (2026-11-04), 10 of them before the first install, and 7 were
            // resent as rewrite: true with no files at all. After it, the guard against regenerating a file stands.
            const ownFile = before !== undefined && nothingStored.has(dir) && ownWrites.get(readKey(dir, rel)) === sha(before);
            if (!why && before !== undefined && !args.rewrite && !stillTemplate && !ownFile && isRewrite(before, file.content))
              refusals.push(`${rel}: this replaces most of the file; change only what the request needs with edits (find/replace), or, if the request really is a rewrite, send these files again with rewrite: true in the same call`);
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
            if (found !== 1) { refusals.push(`${rel}: the find text appears ${found} times; it must match exactly once (copy it from the file as it is now).${findHint(before, edit.find)}`); continue; }
            next.set(rel, { full, content: before.replace(edit.find, () => edit.replace) });
          }
          if (refusals.length) return fail(new Error('Not written:\n' + refusals.map((r) => `- ${r}`).join('\n')));
          // Before the first byte: no later first pull of any build may replace these writes until an install stores them.
          noteWrite(dir);
          const written: string[] = [];
          for (const [rel, { full, content }] of next) {
            mkdirSync(dirname(full), { recursive: true });
            writeFileSync(full, content);
            readHashes.set(readKey(dir, rel), sha(content)); // the agent knows what it just wrote
            ownWrites.set(readKey(dir, rel), sha(content));
            written.push(rel);
          }
          const types = await typeCheckAfterWrite(dir, written).catch(() => undefined);
          return ok({ project_dir: dir, ...sync, written, ...(types ? { type_check: types } : {}) });
        });
      } catch (err) {
        return fail(err);
      }
    }),
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

/** The stylesheet the app's entry imports: Tailwind and, through it, the theme tokens and page-wide rules. */
const STYLESHEET = 'frontend/src/styles/globals.css';
const IMPORT_RE = /(?:^|[\s;])import\s+(?:[^'"]*?from\s+)?['"]([^'"]+\.css)['"]/gm;

/**
 * Why the app would render without its styles, or undefined: no file under frontend/src imports
 * src/styles/globals.css. Purchase Approvals B1 (2026-11-02) rewrote App/index.tsx without the import and shipped
 * unstyled; the build, the scan and the render check all passed, since an unstyled page neither overflows nor fails
 * contrast.
 */
/** Native selects in the app's own screens, when the kit has a Select: graders marked them down on 3 of 10 apps (2026-11-04). */
export function nativeSelects(dir: string): string[] {
  const src = join(dir, 'frontend', 'src');
  if (!existsSync(join(src, 'components', 'ui', 'select.tsx'))) return [];
  return listFiles(src).filter((rel) => rel.endsWith('.tsx') && !rel.startsWith('components/')).flatMap((rel) =>
    readFileSync(join(src, rel), 'utf8').split('\n').flatMap((line, i) => (/<select[\s>]/.test(line) ? [`frontend/src/${rel}:${i + 1}`] : [])));
}

/** Route ids the install would refuse: each becomes a page handle. `new_lead` passed the build, then failed the install after the scan (2026-11-04). */
export function badRouteHandles(dir: string): string[] {
  const file = join(dir, 'app.json');
  if (!existsSync(file)) return [];
  const routes = (JSON.parse(readFileSync(file, 'utf8')) as { routes?: { id?: unknown }[] }).routes ?? [];
  return routes.map((route) => String(route.id)).filter((id) => !/^[a-z0-9][a-z0-9-]*$/.test(id)).map(
    (id) => `app.json: route id "${id}" is not a valid handle: use lowercase letters, numbers and hyphens, such as "${id.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+/, '') || 'page'}"`);
}

const SDK_DECLARED = /declare\s+module\s+['"]@tooljet\/custom-component-sdk['"]/;

/**
 * Files that declare the SDK module themselves. While a server-mode build could not read the SDK's types (2026-11-04),
 * 15 builds wrote one to get past TS2307, with guessed types: `error: string`, so `{rows.error}` compiled and would
 * throw in React the first time a query failed. The declaration hides the real types, so the build is not ok with one.
 */
export function sdkRedeclared(dir: string): string[] {
  const src = join(dir, 'frontend', 'src');
  if (!existsSync(src)) return [];
  return listFiles(src)
    .filter((rel) => /\.tsx?$/.test(rel) && rel !== 'tooljet.gen.ts' && SDK_DECLARED.test(readFileSync(join(src, rel), 'utf8')))
    .map((rel) => `frontend/src/${rel}: declares @tooljet/custom-component-sdk itself, which hides the SDK's real types; write the file without that declaration (the SDK has its own types), then fix what the build reports`);
}

export function missingStylesheet(dir: string): string | undefined {
  const sheet = join(dir, STYLESHEET);
  if (!existsSync(sheet)) return undefined; // not this template: nothing to hold the project to
  const src = join(dir, 'frontend', 'src');
  for (const rel of listFiles(src)) {
    if (!/\.(tsx?|jsx?)$/.test(rel) || rel.startsWith('components/')) continue;
    const file = join(src, rel);
    const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const m of code.matchAll(IMPORT_RE)) {
      if (resolve(dirname(file), m[1]!) === sheet) return undefined;
    }
  }
  return (
    "frontend/src/App/index.tsx: the app's stylesheet is not imported, so every screen renders unstyled (no Tailwind, " +
    "no theme colours). Add `import '../styles/globals.css';` back with the other imports at the top of App/index.tsx."
  );
}

/**
 * The app's queries that read the signed-in user in the browser ({{globals.currentUser.*}}): a viewer can send another
 * user's email with the run. Part of the build check, so the build is not ok until they read
 * {{globals.server.currentUser.*}}. A read that fails leaves the check to the other parts.
 */
async function browserUserQueries(appId: string | undefined): Promise<string[]> {
  if (!appId) return [];
  try {
    // The summary, not getApp: getApp is the authorization read, and its answer is kept for the TTL.
    const summary = await current().client.getAppSummary?.(appId);
    return summary ? browserUserQueryProblems({ data_queries: summary.queries }).map((line) => `query check: ${line}`) : [];
  } catch {
    return [];
  }
}

export function codeAppBuildTool(context: CodeContext): ToolDef {
  return {
    name: 'code_app_build',
    title: 'Build Code Mode App',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description:
      "Refresh the typed hooks from the app's current queries (tooljet app pull), build the app's code (TypeScript, Tailwind, " +
      'manifest), and check it against the app (tooljet app check: every useAppQuery name, route, link and page must exist) ' +
      'and the security scan (code rules such as external fetch, eval and token storage; secrets; vendored code). ' +
      'Returns ok and every error (errors: one line each, with the code and often the fix), native control and security finding to fix; ' +
      'fix every one in one round of writes. Repeat write and build until ok, then code_app_install.' + USER_WORDS,
    inputSchema: { app_id: APP_ID, name: PROJECT_NAME },
    handler: inScope(context, async (args: { app_id?: string; name?: string }) => {
      try {
        const dir = await locateProject(args, 'edit');
        return await onProject(dir, async () => ok(await buildProject(dir, args.app_id)));
      } catch (err) {
        return fail(err);
      }
    }),
  };
}

/** code_app_build's work and report, also the first step of code_app_install with verify. */
async function buildProject(dir: string, appId: string | undefined): Promise<Record<string, unknown> & { ok: boolean }> {
  const followed = await followDraft(dir);
  const sync = await ensureFresh(dir);
  // What the bundler would include but the stored code and the scan skip (a package under frontend/src/node_modules,
  // dot files): never stored, so nobody's work, and removed so the scan sees exactly what is bundled.
  const unstored = removeUnstoredSource(dir);
  await copySdkIn(dir);
  const escaped = removeEscapingLinks(dir);
  const started = Date.now();
  const pull = await cli(dir, ['app', 'pull']);
  // ToolJet cloud builds in the build service's sandbox (codeBuildService.ts); self-hosted builds here.
  devBuilt.delete(dir);
  const build = buildServiceUrl()
    ? await buildInService(dir, 'production')
    : await cli(join(dir, 'frontend'), ['library', 'build', ...(installReuse() ? ['--env', 'development'] : [])]);
  const tsErrors = Number(/TypeScript compiled \((\d+) errors\)/.exec(build.output)?.[1] ?? (build.code === 0 ? 0 : 1));
  const problems = build.code === 0 && tsErrors === 0 ? [] : parseBuildProblems(build.output);
  const check = await cli(dir, ['app', 'check', '--offline', '--json']);
  const report = parseReport<{ problems?: { file: string; line: number; message: string }[]; accessibility?: unknown[]; security?: SecurityReport }>(check.output);
  const unstyled = missingStylesheet(dir);
  const selects = nativeSelects(dir);
  const handles = badRouteHandles(dir);
  const serverUser = await browserUserQueries(appId ?? appIdOf(dir));
  const extra = [...handles, ...(unstyled ? [unstyled] : []), ...sdkRedeclared(dir), ...serverUser, ...(escaped ? [escaped.message] : [])];
  const okBuild = pull.code === 0 && build.code === 0 && tsErrors === 0 && check.code === 0 && !extra.length;
  if (okBuild) prefetchFullScan(dir);
  if (okBuild && installReuse()) devBuilt.set(dir, projectHash(dir));
  return {
    ...(followed ? { draft: followed } : {}),
    ...(sync.before_pull_copy ? { before_pull_copy: sync.before_pull_copy } : {}),
    ...(unstored.length ? { removed_unstored: { files: unstored, note: 'Removed: never stored with the app or scanned. Put code under frontend/src without node_modules or dot names, and add packages with code_app_add_dependency.' } } : {}),
    ok: okBuild,
    build_ms: Date.now() - started,
    pull: pull.code === 0 ? 'typed hooks refreshed' : pull.output.trim(),
    typescript_errors: tsErrors,
    // Every error on one line, with the code it is on and, for the mistakes that recur, the fix (codeTypeErrors.ts);
    // the raw output only when it holds no error this can read.
    ...(problems.length ? { errors: formatProblems(problems) } : {}),
    build_output:
      build.code === 0 && tsErrors === 0
        ? build.output.trim().split('\n').slice(-6).join('\n')
        : problems.length
          ? buildSummary(build.output)
          : build.output.trim().slice(0, 12_000),
    check: report?.problems
      ? [...extra, ...report.problems.map((p) => `${p.file}:${p.line}  ${p.message}`)]
      : extra.length ? [...extra, check.output.trim().slice(0, 6000)] : check.output.trim().slice(0, 6000),
    ...(selects.length ? { native_controls: { fix: 'Use Select from components/ui/select instead of a native <select>.', at: selects } } : {}),
    // jsx-a11y recommended rules, warnings only (tooljet app check); fix them when they are cheap to fix.
    a11y_warnings: report?.accessibility?.length ?? Number(/(\d+) accessibility warnings?/.exec(check.output)?.[1] ?? 0),
    // The offline scan (no dependency network checks): fix critical and high before code_app_install.
    security: securitySummary(report?.security),
  };
}

/** One route's render check (verify_page_render's handler), injected so this file needs no browser. */
export type RenderRoute = (args: { app_id: string; route: string; viewport_width?: number }) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

/** A route path as the render check opens it: each `:param` becomes 1, the first seeded row's usual id. */
export const concreteRoute = (path: string): string => path.replace(/:[A-Za-z_][\w]*/g, '1');

/** The routes app.json declares, as paths to open (each once), the home route first. */
export function routesToCheck(dir: string): string[] {
  let routes: { path?: unknown }[] = [];
  try {
    routes = (JSON.parse(readFileSync(join(dir, 'app.json'), 'utf8')) as { routes?: { path?: unknown }[] }).routes ?? [];
  } catch {
    routes = [];
  }
  const paths = routes.map((route) => (typeof route.path === 'string' && route.path.startsWith('/') ? concreteRoute(route.path) : undefined))
    .filter((path): path is string => Boolean(path));
  return [...new Set(paths.length ? paths : ['/'])].sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : 0));
}

/*
  code_app_install with verify (2026-11-04): after the first install, a Code build spent 166 s in its fix loop, and only
  13 s of it was type errors. The rest was separate code_app_build, code_app_install and verify_page_render calls, a
  model call for each, each re-reading a 130k-token context. One call now builds, installs when the build is clean and
  render-checks every route of app.json once, returning one report.
*/
async function renderRoutes(render: RenderRoute, appId: string, routes: string[], widths: number[], concurrency: number): Promise<Record<string, unknown>[]> {
  const jobs = routes.flatMap((route) => widths.map((width) => ({ route, width })));
  const out: Record<string, unknown>[] = new Array(jobs.length);
  // At most the render pool's default size (2) at a time, one when each check needs its own approval (renderAuditGrant).
  let next = 0;
  const worker = async (): Promise<void> => {
    for (let index = next++; index < jobs.length; index = next++) {
      const { route, width } = jobs[index]!;
      const result = await render({ app_id: appId, route, ...(width !== 1280 ? { viewport_width: width } : {}) });
      const text = result.content?.[0]?.text ?? '';
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
      out[index] = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? { route, width, ...(parsed as Record<string, unknown>) }
        : { route, width, ok: false, error: text.replace(/^Error:\s*/, '').slice(0, 500) };
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, jobs.length)) }, worker));
  return out;
}

export interface InstallOptions {
  /** The render check of one route (verify_page_render's handler); without it, verify builds and installs only. */
  render?: RenderRoute;
  /** How many routes render at once: 1 when every check needs its own approval. */
  renderConcurrency?: number;
}

export function codeAppInstallTool(context: CodeContext, options: InstallOptions = {}): ToolDef {
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
      'verify: true makes it one check round: the build (as code_app_build; on any error it stops there, not installed, listing every error), ' +
      'the install, then the render check of every route in app.json (each once, at 1280 px unless widths says otherwise), in one report: ' +
      'build, install, render [{ route, width, ok, pages: [{ findings, accessibility }] }]. ' +
      'This is the last step of a build or edit: saving the app version (release_app saves a draft first) freezes the code.' + USER_WORDS,
    inputSchema: {
      app_id: APP_ID,
      name: PROJECT_NAME,
      verify: z.boolean().optional().describe('Build, install and render-check every route, in this one call'),
      widths: z.array(z.number().int().min(320).max(2560)).min(1).max(3).optional()
        .describe('verify: the widths to check, default [1280]; add 375 and 768 only when phones or tablets were asked for'),
      routes: z.array(z.string().regex(/^\/[A-Za-z0-9_\-\/.]*$/)).min(1).max(12).optional()
        .describe('verify: the paths to open, default every route in app.json with each :param as 1 (e.g. only the routes that failed)'),
    },
    handler: inScope(context, async (args: { app_id?: string; name?: string; verify?: boolean; widths?: number[]; routes?: string[] }) => {
      try {
        const dir = await locateProject(args, 'edit');
        return await onProject(dir, async () => {
          if (!args.verify) {
            const installed = await installProject(dir);
            return installed instanceof Error ? fail(installed) : ok(installed);
          }
          const built = await buildProject(dir, args.app_id);
          if (!built.ok) {
            return ok({
              ...built,
              installed: false,
              next: 'Not installed: the build has errors. Fix every one in one round of writes, then code_app_install with verify: true again.',
            });
          }
          const installed = await installProject(dir);
          if (installed instanceof Error) return fail(installed);
          const appId = args.app_id ?? appIdOf(dir);
          const build = {
            ok: true,
            build_ms: built.build_ms,
            typescript_errors: 0,
            a11y_warnings: built.a11y_warnings,
            ...(built.native_controls ? { native_controls: built.native_controls } : {}),
          };
          if (!options.render || !appId) return ok({ ...installed, installed: true, build, render: 'not available here: rendering is unverified' });
          const routes = args.routes?.length ? [...new Set(args.routes)] : routesToCheck(dir);
          const widths = args.widths?.length ? [...new Set(args.widths)] : [1280];
          const render = await renderRoutes(options.render, appId, routes, widths, options.renderConcurrency ?? 2);
          const failing = render.filter((entry) => entry.ok !== true).map((entry) => `${entry.route} at ${entry.width} px`);
          return ok({
            ...installed,
            installed: true,
            build,
            render_ok: failing.length === 0,
            render,
            next: failing.length
              ? `Fix what the render check found on ${failing.join(', ')} in one round of writes, then code_app_install with verify: true and routes set to those paths.`
              : 'Built, installed, and every route renders cleanly.',
          });
        });
      } catch (err) {
        return fail(err);
      }
    }),
  };
}

/** The install itself: its result, or the refusal (an Error) to report. Throws when the scan or the CLI fails. */
async function installProject(dir: string): Promise<Record<string, unknown> | Error> {
  // Speed A/B (2026-11-09): where an install's time goes, in the result when MCP_CODE_INSTALL_TIMINGS=1.
  const t0 = Date.now();
  const lap: Record<string, number> = {};
  const followed = await followDraft(dir);
  const sync = await ensureFresh(dir);
  lap.sync_ms = Date.now() - t0;
  nothingStored.delete(dir);
  // Only registry dependencies reach the stored code, and the scan sees exactly what is bundled.
  const dependencies = dependencyRefusal(dir, 'The install');
  if (dependencies) return new Error(`Not installed: ${dependencies.message}`);
  const unstored = removeUnstoredSource(dir);
  const unstyled = missingStylesheet(dir);
  if (unstyled) return new Error(`Not installed: ${unstyled} Then code_app_build and install again.`);
  // The full scan, dependency checks included, before anything reaches the app.
  const check = await fullScan(dir);
  lap.scan_ms = Date.now() - t0 - lap.sync_ms;
  lap.scan_reused = check.reused ? 1 : 0;
  const security = parseReport<{ security?: SecurityReport }>(check.output)?.security;
  if (!security || security.error)
    throw new Error(`The security scan did not run, so nothing was installed: ${security?.error ?? check.output.trim().slice(0, 2000)}`);
  const blocking = mustFix(security);
  if (blocking.length)
    return new Error(
      `Not installed: the security scan has ${blocking.length} critical or high finding${blocking.length > 1 ? 's' : ''}. ` +
        'Fix them in the code (or remove the package), code_app_build, then install again:\n' +
        blocking.map((f) => `${f.severity.toUpperCase()} ${f.ruleId} ${f.package ?? f.location}: ${f.message}`).join('\n')
    );
  // Agent-built apps keep their source on ToolJet (owner platform) unless a repository owns it; the CLI refuses
  // to take a repository-owned source over and to overwrite editor edits it has not pulled.
  // In the sandbox when the build service is set: the CLI here then only uploads the bundle it sent back and links it.
  let prebuilt: string[] = [];
  if (buildServiceUrl()) {
    const built = await buildInService(dir, 'development');
    if (built.code !== 0) throw new Error(built.output.trim());
    prebuilt = ['--prebuilt', join(dir, 'frontend', 'dist')];
  } else if (installReuse() && devBuilt.get(dir) === projectHash(dir) && existsSync(join(dir, 'frontend', 'dist', 'manifest.json'))) {
    prebuilt = ['--prebuilt', join(dir, 'frontend', 'dist'), '--no-scan'];
  }
  devBuilt.delete(dir);
  const devStarted = Date.now();
  const result = await cli(dir, ['app', 'dev', '--once', '--source', 'platform', ...prebuilt]);
  lap.dev_ms = Date.now() - devStarted;
  lap.prebuilt = prebuilt.length ? 1 : 0;
  if (result.code !== 0) throw new Error(result.output.trim());
  // Stored: the next build's first pull may take ToolJet's code over this copy again.
  clearAgentWrites(dir);
  const copies = beforePullCopies(dir);
  return {
    ...(followed ? { draft: followed } : {}),
    ...(sync.editor_edits ? { editor_edits: sync.editor_edits } : {}),
    ...(sync.sync_warning ? { sync_warning: sync.sync_warning } : {}),
    ...(unstored.length ? { removed_unstored: unstored } : {}),
    ...(copies.length
      ? { before_pull_copies: { kept: copies, note: 'Copies of local files a pull of ToolJet\'s code replaced (newest first, the last 3 kept); read one with code_app_read_files to recover a change.' } }
      : {}),
    linked: true,
    ...(process.env.MCP_CODE_INSTALL_TIMINGS === '1' ? { timings: { ...lap, total_ms: Date.now() - t0 } } : {}),
    editor_url: /Open: (\S+)/.exec(result.output)?.[1] ?? null,
    output: result.output.trim(),
    security: securitySummary(security),
  };
}

export function codeAppAddDependencyTool(context: CodeContext): ToolDef {
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
    handler: inScope(context, async (args: { app_id?: string; name?: string; packages: string[]; remove?: string[] }) => {
      try {
        const dir = await locateProject(args, 'edit');
        return await onProject(dir, async () => {
          if (!args.packages.length && !args.remove?.length) throw new Error('Pass packages to add, or names to remove.');
          // Registry versions only: a spec npm reads as a path, a tarball, git or a URL is refused before the vet.
          const local = args.packages.flatMap((spec) => {
            const at = spec.indexOf('@', 1);
            const why = at > 0 ? nonRegistrySpec(spec.slice(at + 1)) : undefined;
            return why ? [`${spec}: ${why}`] : [];
          });
          if (local.length) throw new Error(`Not added: ${local.join('; ')}. Pass a registry version or range, such as date-fns@4.`);
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
          const vetted = report.packages.flatMap((p) => (nonRegistrySpec(p.version) ? [`${p.name}@${p.version}`] : []));
          if (vetted.length) throw new Error(`Not added: the package check named ${vetted.join(', ')}, which is not a registry version.`);
          const pkgFile = insideProject(dir, 'frontend/package.json');
          const lockFile = insideProject(dir, 'frontend/package-lock.json');
          const before = readFileSync(pkgFile, 'utf8');
          const lockBefore = existsSync(lockFile) ? readFileSync(lockFile, 'utf8') : null;
          const restore = () => {
            writeFileSync(pkgFile, before);
            if (lockBefore !== null) writeFileSync(lockFile, lockBefore);
          };
          noteWrite(dir);
          writeFileSync(pkgFile, JSON.stringify(withDependencies(withoutDependencies(JSON.parse(before), args.remove ?? []), report.packages), null, 2) + '\n');
          // A lockfile that installs from elsewhere while package.json now names registry packages only (a removed
          // file: dependency): the install writes a new one from the registry, and the full scan vets it at install.
          const regenerated = !manifestProblems(dir).length && lockfileProblems(dir).length > 0;
          if (regenerated) rmSync(lockFile, { force: true });
          let install: { code: number; output: string };
          try {
            install = await installDependencies(dir, 'Adding the packages');
          } catch (error) {
            restore();
            throw new Error(`${error instanceof Error ? error.message : String(error)}\nNothing was added; package.json restored.`);
          }
          if (install.code !== 0) {
            restore();
            throw new Error(`tooljet app install failed, package.json restored: ${install.output.trim().slice(0, 4000)}`);
          }
          return ok({
            added: report.packages.map((p) => `${p.name}@${p.version}`),
            ...(regenerated ? { lockfile: 'The lockfile named packages from outside the registry, so it was written again from the registry.' } : {}),
            ...(args.remove?.length ? { removed: args.remove } : {}),
            not_run: (report.notRun ?? []).map((n) => `${n.id}${n.reason ? `: ${n.reason}` : ''}`),
            // Transitive packages come with the install; code_app_build and code_app_install scan the whole lockfile.
            next: 'Import the package in frontend/src, then code_app_build.',
          });
        });
      } catch (err) {
        return fail(err);
      }
    }),
  };
}
