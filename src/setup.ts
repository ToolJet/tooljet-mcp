import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { homeDir, installedBundlePath } from './profiles/paths.js';
import type { Launch } from './cli/agents/shared.js';
import { TOOLJET_MCP_VERSION } from './runtimeFreshness.js';
import { newerVersion } from './profiles/version.js';

const versionPath = (): string => join(homeDir(), 'bundle', 'version');

export const REPO_URL = 'https://github.com/ToolJet/tooljet-mcp.git';

const SHIM_MARKER = 'tooljet-mcp shim';

/** The bundle this process is running from (…/bundle/index.js), or undefined under `tsx`/dist. */
export function runningBundle(): string | undefined {
  try {
    const self = realpathSync(process.argv[1] ?? '');
    return /[\\/]bundle[\\/]index\.js$/.test(self) && existsSync(resolve(dirname(self), '..', 'data')) ? self : undefined;
  } catch {
    return undefined;
  }
}

export function shimPath(): string {
  const dir = process.env.TOOLJET_MCP_BIN_DIR?.trim();
  if (dir) return join(dir, process.platform === 'win32' ? 'tj.cmd' : 'tj');
  return process.platform === 'win32'
    ? join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'tooljet-mcp', 'bin', 'tj.cmd')
    : join(homedir(), '.local', 'bin', 'tj');
}

export function shimOnPath(): boolean {
  const dir = dirname(shimPath());
  return (process.env.PATH ?? '').split(delimiter).some((p) => p && resolve(p) === resolve(dir));
}

export type ShimState = 'ours' | 'foreign' | 'absent';

export function shimState(): ShimState {
  const path = shimPath();
  if (!existsSync(path)) return 'absent';
  try {
    return readFileSync(path, 'utf8').includes(SHIM_MARKER) ? 'ours' : 'foreign';
  } catch {
    return 'foreign';
  }
}

/** Copy then rename, so a server starting right now never reads half a file. */
function copyFile(from: string, to: string): void {
  mkdirSync(dirname(to), { recursive: true, mode: 0o700 });
  cpSync(from, `${to}.${process.pid}.tmp`);
  renameSync(`${to}.${process.pid}.tmp`, to);
}

/** Copy the server to a fixed path. Plugin paths carry a version, so configs pointing at them break on update. */
export function installBundle(): { from: string; to: string } {
  const from = runningBundle();
  const to = installedBundlePath();
  if (!from) {
    throw new Error('This command must run from a built bundle (bundle/index.js). From a source checkout run: npm run build:plugin');
  }
  if (resolve(from) === resolve(to)) return { from, to };
  // The CLI first, the server entry last: a half-done copy still starts the old server.
  copyFile(join(dirname(from), 'cli', 'index.js'), join(dirname(to), 'cli', 'index.js'));
  copyFile(from, to);
  cpSync(resolve(dirname(from), '..', 'data'), join(homeDir(), 'data'), { recursive: true });
  // Node 20 only treats the copy as an ES module when a package.json beside it says so.
  writeFileSync(join(homeDir(), 'package.json'), '{ "type": "module" }\n');
  writeFileSync(versionPath(), TOOLJET_MCP_VERSION);
  return { from, to };
}

export function writeShim(): string {
  const path = shimPath();
  mkdirSync(dirname(path), { recursive: true });
  const node = process.execPath;
  const bundle = installedBundlePath();
  // Prefer the terminal's own `node`; fall back to the one that wrote this file.
  if (process.platform === 'win32') {
    writeFileSync(path, `@echo off\r\nrem ${SHIM_MARKER}\r\nwhere node >nul 2>nul && (node "${bundle}" cli %*) || ("${node}" "${bundle}" cli %*)\r\n`);
  } else {
    writeFileSync(path, `#!/bin/sh\n# ${SHIM_MARKER}\nif command -v node >/dev/null 2>&1; then exec node "${bundle}" cli "$@"; fi\nexec "${node}" "${bundle}" cli "$@"\n`);
    chmodSync(path, 0o755);
  }
  return path;
}

/** Delete the `tj` command; never another program with the same name. */
export function removeShim(): boolean {
  if (shimState() !== 'ours') return false;
  rmSync(shimPath(), { force: true });
  return true;
}

/** Remove the server copy but keep profiles.json and everything else in the home folder. */
export function removeInstalled(): void {
  rmSync(join(homeDir(), 'bundle'), { recursive: true, force: true });
  rmSync(join(homeDir(), 'data'), { recursive: true, force: true });
  rmSync(join(homeDir(), 'package.json'), { force: true });
}

export const removeHome = (): void => rmSync(homeDir(), { recursive: true, force: true });

/** How to invoke this tool right now: `tj` once our shim is on PATH, the full command until then. */
export function selfCommand(): string {
  if (shimState() === 'ours' && shimOnPath()) return 'tj';
  return `"${process.execPath}" "${runningBundle() ?? installedBundlePath()}" cli`;
}

export const isInstalled = (): boolean => existsSync(installedBundlePath());

/** What every agent is told to run. */
export function launch(): Launch {
  return { command: process.execPath, args: [installedBundlePath()] };
}

/** One switch for everything a server start may write: the fixed copy, the `tj` command, and keeping an env token as a profile. */
export function startupWritesAllowed(): boolean {
  return !/^(1|true|yes)$/i.test(process.env.TOOLJET_MCP_NO_AUTO_SETUP ?? '');
}

/**
 * First server start sets up the fixed copy and the `tj` command, so "add the MCP" is the whole install.
 * Best effort and silent: never throws, never prints, never replaces another program called tj.
 */
export function autoSetup(): void {
  try {
    if (!startupWritesAllowed()) return;
    // An overridden home means an isolated run; only touch a bin dir that was overridden too.
    if (process.env.TOOLJET_MCP_HOME?.trim() && !process.env.TOOLJET_MCP_BIN_DIR?.trim()) return;
    if (!runningBundle()) return;
    let installed = '';
    try {
      installed = readFileSync(versionPath(), 'utf8').trim();
    } catch {
      // not installed yet
    }
    const complete = existsSync(join(homeDir(), 'package.json')) && existsSync(join(homeDir(), 'bundle', 'cli', 'index.js'));
    if (!isInstalled() || !complete || newerVersion(TOOLJET_MCP_VERSION, installed)) installBundle();
    if (shimState() === 'absent') writeShim();
  } catch {
    // Setup is a convenience; the server must start regardless.
  }
}
