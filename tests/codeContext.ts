import { deploymentKey, type CodeContext } from '../src/tools/codeApp.js';

/** A caller of the Code tools: workspace ws-1, every app its own and editable, unless the test says otherwise. */
export const WORKSPACE = 'ws-1';
export const API_URL = 'http://tooljet.test';
export const codeContext = (overrides: Partial<CodeContext> = {}): CodeContext => ({
  workspaceId: async () => WORKSPACE,
  credential: { pat: 'test-token' },
  apiUrl: API_URL,
  appUrl: API_URL,
  ...overrides,
  client: { getApp: async () => ({ organizationId: WORKSPACE }), canEditApp: async () => true, renameApp: async () => undefined, ...overrides.client } as CodeContext['client'],
});

/** The folder under the Code root that holds this backend's workspaces. */
export const DEPLOYMENT = deploymentKey(API_URL);
