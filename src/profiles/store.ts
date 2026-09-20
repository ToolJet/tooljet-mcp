import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { homeDir, profilesPath } from './paths.js';
import { newerVersion } from './version.js';
import { TOOLJET_MCP_VERSION } from '../runtimeFreshness.js';

/** A saved ToolJet server. Token-only: the server cannot log in with a password. */
export interface Profile {
  /** Instance URL; also the API origin unless `apiUrl` is set. */
  url: string;
  /** Only when the API is on a different origin. */
  apiUrl?: string;
  pat: string;
  /** Fields from a newer version are kept on save. */
  [extra: string]: unknown;
}

export interface ProfileStore {
  /** Newest tooljet-mcp that has written this file. Only ever moves up. */
  version: string;
  /** What NEW chats start on. Open chats never follow it. */
  active: string;
  /** Per-agent override of `active`, keyed by agent id (claude-code, codex, …). */
  agentDefaults: Record<string, string>;
  profiles: Record<string, Profile>;
  [extra: string]: unknown;
}

const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export function assertProfileName(name: string): void {
  if (!NAME_PATTERN.test(name)) {
    throw new Error(
      `"${name}" is not a usable profile name. Use letters, digits, dot, dash or underscore, starting with a letter or digit.`
    );
  }
}

/** Normalize a typed URL. http is allowed (localhost); credentials, query and hash are not. */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('A ToolJet URL is required.');
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new Error(`"${raw}" is not a valid URL.`);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('A ToolJet URL must start with https:// or http://.');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('A ToolJet URL must not carry credentials, a query, or a fragment.');
  }
  const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
  return parsed.origin + path;
}

/** A pasted workspace URL and a SUB_PATH install look alike, so try the URL as given, then its origin. */
export function urlCandidates(raw: string): string[] {
  const url = normalizeUrl(raw);
  const origin = new URL(url).origin;
  return url === origin ? [url] : [url, origin];
}

function isPosix(): boolean {
  return process.platform !== 'win32';
}

/** Refuse a store other users can read: it holds live tokens. Windows relies on the private user profile. */
function assertPrivate(path: string): void {
  if (!isPosix()) return;
  const link = lstatSync(path);
  if (link.isSymbolicLink()) {
    throw new Error(`${path} is a symbolic link. Refusing to read tokens through it — replace it with a real file.`);
  }
  const mode = statSync(path).mode & 0o777;
  if (mode & 0o077) {
    throw new Error(
      `${path} is readable by other users (mode ${mode.toString(8)}). Run: chmod 600 "${path}" — then try again.`
    );
  }
}

function emptyStore(): ProfileStore {
  return { version: TOOLJET_MCP_VERSION, active: '', agentDefaults: {}, profiles: {} };
}

/** Validate what we know; keep what we do not, so an older version never deletes a newer one's fields. */
function sanitize(input: unknown): ProfileStore {
  if (!input || typeof input !== 'object') return emptyStore();
  const raw = input as Record<string, unknown>;
  const store: ProfileStore = { ...raw, ...emptyStore() };
  // Keep a newer writer's version: an older server saving must not push it back down.
  if (typeof raw.version === 'string' && newerVersion(raw.version, TOOLJET_MCP_VERSION)) store.version = raw.version;
  if (raw.profiles && typeof raw.profiles === 'object') {
    for (const [name, value] of Object.entries(raw.profiles as Record<string, unknown>)) {
      if (!NAME_PATTERN.test(name) || !value || typeof value !== 'object') continue;
      const p = value as Record<string, unknown>;
      if (typeof p.url !== 'string' || typeof p.pat !== 'string' || !p.pat) continue;
      try {
        const profile: Profile = { ...p, url: normalizeUrl(p.url), pat: p.pat };
        if (typeof p.apiUrl === 'string' && p.apiUrl.trim()) profile.apiUrl = normalizeUrl(p.apiUrl);
        else delete profile.apiUrl;
        store.profiles[name] = profile;
      } catch {
        // Skip a bad entry rather than lose every other profile.
      }
    }
  }
  if (typeof raw.active === 'string' && store.profiles[raw.active]) store.active = raw.active;
  if (raw.agentDefaults && typeof raw.agentDefaults === 'object') {
    for (const [agent, name] of Object.entries(raw.agentDefaults as Record<string, unknown>)) {
      if (typeof name === 'string' && store.profiles[name]) store.agentDefaults[agent] = name;
    }
  }
  return store;
}

/** What a new chat in this agent starts on: its own default, else the shared one. */
export function defaultFor(store: ProfileStore, agent?: string): string {
  return (agent && store.agentDefaults[agent]) || store.active;
}

/** Read the store. A missing or emptied file is an empty store. */
export function loadStore(): ProfileStore {
  const path = profilesPath();
  if (!existsSync(path)) return emptyStore();
  assertPrivate(path);
  let parsed: unknown;
  const text = readFileSync(path, 'utf8');
  // An emptied file means "no profiles", not a broken store.
  if (!text.trim()) return emptyStore();
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${path} is not valid JSON. Fix or delete it, then run: tj`);
  }
  const store = sanitize(parsed);
  // Stamp the file once when this version is newer than the one that last wrote it.
  if (newerVersion(TOOLJET_MCP_VERSION, (parsed as { version?: unknown } | null)?.version)) {
    try {
      saveStore(store);
    } catch {
      // Read-only home: keep working from memory.
    }
  }
  return store;
}

/** Write atomically (temp file + rename) at 0600 inside a 0700 directory. */
export function saveStore(store: ProfileStore): void {
  const path = profilesPath();
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  if (isPosix()) chmodSync(homeDir(), 0o700);
  const tmp = `${path}.${process.pid}.tmp`;
  // Known keys first, in a fixed order; anything from a newer version follows.
  const { version, active, agentDefaults, profiles, ...extra } = store;
  const ordered = { version, active, agentDefaults, profiles, ...extra };
  writeFileSync(tmp, `${JSON.stringify(ordered, null, 2)}\n`, { mode: 0o600 });
  if (isPosix()) chmodSync(tmp, 0o600);
  renameSync(tmp, path);
}

const CLOUD_HOST = /^app\.tooljet\.(ai|com)$/;

export function isCloudUrl(rawUrl: string): boolean {
  try {
    return CLOUD_HOST.test(new URL(normalizeUrl(rawUrl)).hostname);
  } catch {
    return false;
  }
}

/** Name a profile after its server: cloud, local, or the first host label. On a clash, add the workspace, else a number. */
export function suggestName(rawUrl: string, taken: string[], workspaceSlug?: string): string {
  let base = 'tooljet';
  try {
    const host = new URL(normalizeUrl(rawUrl)).hostname;
    base = CLOUD_HOST.test(host) ? 'cloud' : host === 'localhost' || /^[\d.]+$/.test(host) ? 'local' : host.split('.')[0];
  } catch {
    // keep the default
  }
  const clean = (text: string) => text.replace(/[^A-Za-z0-9._-]/g, '-');
  base = clean(base) || 'tooljet';
  if (!taken.includes(base)) return base;
  const named = workspaceSlug ? `${base}-${clean(workspaceSlug)}` : '';
  if (named && !taken.includes(named)) return named;
  for (let i = 2; ; i++) if (!taken.includes(`${base}-${i}`)) return `${base}-${i}`;
}

export interface Credential {
  url: string;
  apiUrl?: string;
  pat: string;
  /** Only used to name the profile when the server's own name is taken. */
  workspaceSlug?: string;
}

export interface Imported {
  name: string;
  created: boolean;
}

/** Keep a credential found in an old setup as a profile. An identical one is reused; the first saved becomes the default. */
export function importCredential(cred: Credential): Imported {
  const store = loadStore();
  const url = normalizeUrl(cred.url);
  const apiUrl = cred.apiUrl && normalizeUrl(cred.apiUrl) !== url ? normalizeUrl(cred.apiUrl) : undefined;
  const same = Object.entries(store.profiles).find(([, p]) => p.url === url && p.pat === cred.pat);
  if (same) return { name: same[0], created: false };
  const name = suggestName(url, Object.keys(store.profiles), cred.workspaceSlug);
  store.profiles[name] = { url, ...(apiUrl ? { apiUrl } : {}), pat: cred.pat };
  if (!store.active) store.active = name;
  saveStore(store);
  return { name, created: true };
}

/** True when a saved profile already points at this server. */
export function hasServer(rawUrl: string): boolean {
  const url = normalizeUrl(rawUrl);
  return Object.values(loadStore().profiles).some((p) => p.url === url);
}

export function hostOfUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export const hostOf = (profile: Profile): string => hostOfUrl(profile.url);
