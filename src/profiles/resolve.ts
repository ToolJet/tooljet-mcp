import { configFromProfile, env, hasEnvCredential, loadConfig, type Config } from '../config.js';
import { hostOf, hostOfUrl, loadStore } from './store.js';
import type { ActiveScope } from './scope.js';

export const PROFILE_PIN_VAR = 'TOOLJET_PROFILE';

export interface Resolved {
  config: Config;
  scope: ActiveScope;
  /** Pinned by TOOLJET_PROFILE: switching is refused. */
  pinned: boolean;
  /** Only a 'default' start may be overridden by the agent's own default. */
  source: 'environment' | 'pin' | 'default';
}

export class NoProfileError extends Error {}

export function resolveProfile(name: string): { config: Config; scope: ActiveScope } {
  const store = loadStore();
  const profile = store.profiles[name];
  if (!profile) {
    const known = Object.keys(store.profiles);
    throw new Error(
      known.length
        ? `No saved ToolJet profile named "${name}". Saved profiles: ${known.join(', ')}.`
        : `No saved ToolJet profile named "${name}" — none are saved yet. Run: tj`
    );
  }
  return { config: configFromProfile(profile), scope: { name, host: hostOf(profile) } };
}

/** Start-up order: environment token → TOOLJET_PROFILE (pins) → saved default. Reads only; the agent's own default is applied after the handshake. */
export function resolveStartup(): Resolved {
  if (hasEnvCredential()) {
    const config = loadConfig();
    return { config, scope: { name: 'environment', host: hostOfUrl(config.appUrl) }, pinned: false, source: 'environment' };
  }
  const pin = env(PROFILE_PIN_VAR);
  if (pin) return { ...resolveProfile(pin), pinned: true, source: 'pin' };

  const store = loadStore();
  if (!store.active) {
    throw new NoProfileError(
      Object.keys(store.profiles).length
        ? 'No ToolJet profile is active. In a terminal run: tj auth switch — or ask this chat to use one of the saved profiles.'
        : 'No ToolJet server is set up yet. In a terminal run: tj — it takes about a minute. Then ask this chat to use that profile; no restart is needed.'
    );
  }
  return { ...resolveProfile(store.active), pinned: false, source: 'default' };
}
