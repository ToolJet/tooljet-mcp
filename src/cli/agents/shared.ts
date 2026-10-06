import { execFile } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { isPlaceholder } from '../../config.js';

export const SERVER_NAME = 'tooljet';

/** How an agent starts the server. No env: the server finds its own credentials. */
export interface Launch {
  /** Absolute Node path: desktop apps launch servers with a bare PATH. */
  command: string;
  args: string[];
  /** Only ever the agent's label (TOOLJET_AGENT), never a credential. */
  env?: Record<string, string>;
}

export type Connection = 'no' | 'yes' | 'plugin';

export interface AgentStatus {
  connected: Connection;
  /** A ToolJet token is still stored in this agent's config. */
  storedToken: boolean;
  detail?: string;
}

export interface AgentAdapter {
  id: string;
  name: string;
  detect(): boolean;
  status(): AgentStatus;
  connect(launch: Launch): Promise<string>;
  disconnect(): Promise<string>;
  /** The ToolJet URL and token this agent was set up with, if it still holds them. */
  storedCredential?(): StoredCredential | undefined;
  /** Remove stored tokens; only where the file is safe to edit. */
  scrubToken?(): string;
  /** How the agent picks up the change. */
  reload: string;
}

export interface StoredCredential {
  url: string;
  apiUrl?: string;
  pat: string;
}

/** Read a credential from a TOOLJET_* env map, ignoring blanks and `${VAR}` placeholders. */
export function credentialFromEnv(envMap: unknown): StoredCredential | undefined {
  if (!envMap || typeof envMap !== 'object') return undefined;
  const get = (k: string) => {
    const v = (envMap as Record<string, unknown>)[k];
    return typeof v === 'string' && v.trim() && !isPlaceholder(v) ? v.trim() : undefined;
  };
  const pat = get('TOOLJET_PAT');
  const url = get('TOOLJET_DEPLOYMENT_URL') ?? get('TOOLJET_APP_URL') ?? get('TOOLJET_URL');
  if (!pat || !url) return undefined;
  return { url, apiUrl: get('TOOLJET_URL'), pat };
}

export const home = (...parts: string[]): string => join(homedir(), ...parts);
export const isWin = process.platform === 'win32';
export const isMac = process.platform === 'darwin';

/** Per-user application-config directory, per OS. */
export function appConfig(...parts: string[]): string {
  if (isWin) return join(process.env.APPDATA ?? home('AppData', 'Roaming'), ...parts);
  if (isMac) return home('Library', 'Application Support', ...parts);
  return join(process.env.XDG_CONFIG_HOME ?? home('.config'), ...parts);
}

export function which(bin: string): string | undefined {
  const exts = isWin ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';') : [''];
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      for (const name of new Set([bin + ext.toLowerCase(), bin + ext])) {
        const candidate = join(dir, name);
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  return undefined;
}

/** Run an agent's CLI. Shell on Windows only: their launchers are .cmd files. */
export function run(file: string, args: string[]): Promise<{ ok: boolean; out: string }> {
  return new Promise((resolve) => {
    execFile(file, args, { timeout: 30_000, shell: isWin, windowsHide: true }, (err, stdout, stderr) => {
      resolve({ ok: !err, out: `${stdout}${stderr}`.trim() });
    });
  });
}

export function readJson(path: string): Record<string, any> | undefined {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, any>;
  } catch {
    return undefined;
  }
}

export function readText(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

/** Edit another program's JSON config: keep a backup, write atomically, and refuse files with comments. */
export function editJson(path: string, mutate: (doc: Record<string, any>) => void): void {
  let doc: Record<string, any> = {};
  if (existsSync(path)) {
    const raw = readFileSync(path, 'utf8');
    if (raw.trim()) {
      try {
        doc = JSON.parse(raw) as Record<string, any>;
      } catch {
        throw new Error(`${path} is not plain JSON (it may contain comments), so it was left untouched. Add the entry by hand — choose "Other agent" to see it.`);
      }
    }
    copyFileSync(path, `${path}.tj.bak`);
  } else {
    mkdirSync(dirname(path), { recursive: true });
  }
  mutate(doc);
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(doc, null, 2)}\n`);
  renameSync(tmp, path);
}

const TOKEN_KEY = /^TOOLJET_(PAT|PASSWORD|SESSION_TOKEN)$/;
const TOKEN_HEADER = /^x-tooljet-(pat|session)$/i;

export function entryHoldsToken(entry: any): boolean {
  if (!entry || typeof entry !== 'object') return false;
  const env = entry.env && typeof entry.env === 'object' ? entry.env : {};
  const headers = entry.headers && typeof entry.headers === 'object' ? entry.headers : {};
  return (
    Object.entries(env).some(([k, v]) => TOKEN_KEY.test(k) && typeof v === 'string' && v && !isPlaceholder(v)) ||
    Object.entries(headers).some(([k, v]) => TOKEN_HEADER.test(k) && typeof v === 'string' && v)
  );
}

/** An adapter for agents whose whole MCP config is one plain JSON file. */
export function jsonFileAdapter(opts: {
  id: string;
  name: string;
  detect: () => boolean;
  file: () => string;
  key?: string;
  entry?: (launch: Launch) => Record<string, unknown>;
  reload: string;
}): AgentAdapter {
  const key = opts.key ?? 'mcpServers';
  const base = opts.entry ?? ((l: Launch) => ({ command: l.command, args: l.args }));
  const entry = (l: Launch) => (l.env ? { ...base(l), env: l.env } : base(l));
  return {
    id: opts.id,
    name: opts.name,
    detect: opts.detect,
    reload: opts.reload,
    status() {
      const found = readJson(opts.file())?.[key]?.[SERVER_NAME];
      return { connected: found ? 'yes' : 'no', storedToken: entryHoldsToken(found) };
    },
    storedCredential() {
      return credentialFromEnv(readJson(opts.file())?.[key]?.[SERVER_NAME]?.env);
    },
    async connect(launch) {
      // Replace the whole entry, which also drops an old env/headers token.
      editJson(opts.file(), (doc) => {
        doc[key] = { ...(doc[key] ?? {}), [SERVER_NAME]: entry(launch) };
      });
      return opts.file();
    },
    async disconnect() {
      editJson(opts.file(), (doc) => {
        if (doc[key]) delete doc[key][SERVER_NAME];
      });
      return opts.file();
    },
  };
}
