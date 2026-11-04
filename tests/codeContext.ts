import type { CodeContext } from '../src/tools/codeApp.js';

/** A caller of the Code tools: workspace ws-1, every app its own, unless the test says otherwise. */
export const WORKSPACE = 'ws-1';
export const codeContext = (overrides: Partial<CodeContext> = {}): CodeContext => ({
  workspaceId: async () => WORKSPACE,
  credential: { pat: 'test-token' },
  apiUrl: 'http://tooljet.test',
  appUrl: 'http://tooljet.test',
  ...overrides,
  client: { getApp: async () => ({ organizationId: WORKSPACE }), renameApp: async () => undefined, ...overrides.client } as CodeContext['client'],
});
