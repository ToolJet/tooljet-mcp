import { createAuth, type PatLogin } from '../auth.js';
import type { Config } from '../config.js';
import { startupWritesAllowed } from '../setup.js';
import { createClient, type ToolJetClient } from '../tooljetClient.js';
import { createSwitchableClient } from '../switchableClient.js';
import { defaultFor, hasServer, hostOf, importCredential, loadStore } from './store.js';
import { identifyAgent } from './agentId.js';
import { installedBundlePath } from './paths.js';
import { NoProfileError, PROFILE_PIN_VAR, resolveProfile, resolveStartup } from './resolve.js';
import { getActiveScope, setActiveScope, type ActiveScope } from './scope.js';

export interface ProfileSummary {
  name: string;
  host: string;
  /** What a NEW chat in this agent would start on. */
  active_on_disk: boolean;
  /** What THIS chat is acting on right now. */
  used_by_this_chat: boolean;
}

export interface ProfileSession {
  client: ToolJetClient;
  list(): ProfileSummary[];
  use(name: string): ActiveScope;
  /** Called once the client has introduced itself: move to that agent's own default, if it has one. */
  onClient(clientName?: string): void;
  current(): ActiveScope | undefined;
}

/** How to reach the CLI; a plugin install has no `tj` on PATH. */
export function cliHint(): string {
  return `tj   (if your terminal cannot find it: node "${installedBundlePath()}" cli)`;
}

/**
 * Backward compatibility: keep an old env-var token as a profile, once it has actually logged in
 * (no extra request, and a dead token is never saved). Only for a server that is not saved yet,
 * so a renewed token never piles up as cloud-2.
 */
function keepAsProfile(config: Config): (login: PatLogin) => void {
  let done = false;
  return (login) => {
    if (done || !config.pat || !startupWritesAllowed()) return;
    done = true;
    try {
      if (!hasServer(config.appUrl)) importCredential({ url: config.appUrl, apiUrl: config.apiUrl, pat: config.pat, ...login });
    } catch {
      // Keeping the profile is a convenience; the chat works without it.
    }
  };
}

/** Credential state of one chat. With no profile it still serves; tools fail with the setup step until use() succeeds. */
export function createProfileSession(): ProfileSession {
  let pinned = false;
  let overridable = true;
  let agent: string | undefined;
  let initial: ToolJetClient | undefined;
  let inUse: Config | undefined;
  let emptyReason = '';

  try {
    const resolved = resolveStartup();
    pinned = resolved.pinned;
    overridable = resolved.source === 'default';
    inUse = resolved.config;
    const onLogin = resolved.source === 'environment' ? keepAsProfile(resolved.config) : undefined;
    initial = createClient(createAuth(resolved.config, fetch, onLogin), resolved.config);
    setActiveScope(resolved.scope);
  } catch (err) {
    setActiveScope(undefined);
    const message = err instanceof Error ? err.message : String(err);
    emptyReason = err instanceof NoProfileError
      ? `${message} If the terminal cannot find tj, use: node "${installedBundlePath()}" cli`
      : message;
    console.error(`tooljet-mcp: ${emptyReason}`);
  }

  const switchable = createSwitchableClient(initial, emptyReason);

  return {
    client: switchable.client,
    current: getActiveScope,
    list() {
      const store = loadStore();
      const startsOn = defaultFor(store, agent);
      return Object.entries(store.profiles).map(([name, profile]) => ({
        name,
        host: hostOf(profile),
        active_on_disk: name === startsOn,
        // By credential, not name: a chat started from an env token is on that token's profile too.
        used_by_this_chat: profile.pat === inUse?.pat && (profile.apiUrl ?? profile.url) === inUse?.apiUrl,
      }));
    },
    onClient(clientName) {
      agent = identifyAgent(clientName);
      if (!agent || !overridable) return;
      overridable = false;
      try {
        const own = loadStore().agentDefaults[agent];
        if (own && own !== getActiveScope()?.name) this.use(own);
      } catch {
        // Stay on the shared default.
      }
    },
    use(name) {
      const now = getActiveScope();
      if (pinned && now && name !== now.name) {
        throw new Error(
          `This session is pinned to the "${now.name}" profile by ${PROFILE_PIN_VAR} and cannot switch. ` +
            'Remove that variable from this project\'s MCP config to allow switching.'
        );
      }
      const { config, scope } = resolveProfile(name);
      // Build first, so a failure leaves the chat where it was.
      const next = createClient(createAuth(config), config);
      switchable.set(next);
      inUse = config;
      setActiveScope(scope);
      return scope;
    },
  };
}
