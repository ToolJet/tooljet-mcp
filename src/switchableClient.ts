import type { ToolJetClient } from './tooljetClient.js';

export interface SwitchableClient {
  /** Pass this to registerTools; only its target changes. */
  client: ToolJetClient;
  set(next: ToolJetClient): void;
}

/**
 * Tools close over one client, so a switch swaps the target behind this proxy.
 * Swapping the whole client also drops its token and cached ids.
 */
export function createSwitchableClient(initial: ToolJetClient | undefined, reasonIfEmpty: string): SwitchableClient {
  let target = initial;

  const client = new Proxy({} as ToolJetClient, {
    get(_obj, prop) {
      if (typeof prop === 'symbol' || prop === 'then') return undefined;
      if (!target) {
        return async () => {
          throw new Error(reasonIfEmpty);
        };
      }
      const value = (target as unknown as Record<string, unknown>)[prop];
      return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(target) : value;
    },
    has(_obj, prop) {
      return target ? prop in (target as object) : false;
    },
  });

  return {
    client,
    set(next) {
      target = next;
    },
  };
}
