import { deploymentKey, type CodeContext } from '../src/tools/codeApp.js';

/** A caller of the Code tools: workspace ws-1, every app its own, its code readable and editable, unless the test says otherwise. */
export const WORKSPACE = 'ws-1';
export const API_URL = 'http://tooljet.test';
/** The app's editing version, which the source API check names. */
export const VERSION = '99999999-9999-4999-8999-999999999999';
export const codeContext = (overrides: Partial<CodeContext> = {}): CodeContext => ({
  workspaceId: async () => WORKSPACE,
  credential: { pat: 'test-token' },
  apiUrl: API_URL,
  appUrl: API_URL,
  ...overrides,
  client: { getApp: async () => ({ organizationId: WORKSPACE, editing_version: { id: VERSION } }), codeSourceAccess: async () => ({ read: true, write: true }), renameApp: async () => undefined, ...overrides.client } as CodeContext['client'],
});

/** The folder under the Code root that holds this backend's workspaces. */
export const DEPLOYMENT = deploymentKey(API_URL);
