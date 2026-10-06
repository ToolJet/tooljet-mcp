/** The server this process (one chat) acts on. Lets minted state, like plan tokens, detect a profile switch. */
export interface ActiveScope {
  /** Profile name, or 'environment' for a TOOLJET_PAT start. */
  name: string;
  host: string;
}

let current: ActiveScope | undefined;

export function setActiveScope(scope: ActiveScope | undefined): void {
  current = scope;
}

export function getActiveScope(): ActiveScope | undefined {
  return current;
}

/** Stable key for binding minted state to an instance. */
export function scopeKey(): string {
  return current ? `${current.name}@${current.host}` : '';
}
