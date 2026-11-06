import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Code tool tests use fake CLIs, which answer no server-mode check and read these settings.
    env: { MCP_CODE_CLI_HANDSHAKE: '0', MCP_CODE_CLI_ENV_PASS: 'FAKE_CLI_LOG,FAKE_CLI_REPLIES,FAKE_STORE,FAKE_STORED,FAKE_PULL,FAKE_STATUS,FAKE_FAIL,FAKE_TAKEN,FAKE_INSTALL_LINK' },
  },
});
