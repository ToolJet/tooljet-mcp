import { AsyncLocalStorage } from 'node:async_hooks';

// HTTP is stateless; stdio can run calls concurrently. Never store a selected branch on a client.
const branchContext = new AsyncLocalStorage<string | undefined>();
export const withBranchContext = <T>(branchId: string | undefined, fn: () => T): T => branchContext.run(branchId, fn);
export const currentBranchId = (): string | undefined => branchContext.getStore();

export function branchIdFor(config: { branchId?: string }): string | undefined {
  const requested = branchContext.getStore();
  if (config.branchId && requested && config.branchId !== requested) {
    throw new Error('This build is pinned to another branch. Start a build from the intended branch.');
  }
  return config.branchId ?? requested;
}
