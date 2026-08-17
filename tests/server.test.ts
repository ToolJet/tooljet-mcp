import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.TOOLJET_EMAIL = 'x@y.com';
  process.env.TOOLJET_PASSWORD = 'pw';
});

describe('buildServer', () => {
  it('builds without throwing and registers all tools', async () => {
    const { buildServer } = await import('../src/server.js');

    let server: any;
    expect(() => {
      server = buildServer();
    }).not.toThrow();

    expect(server).toBeTruthy();

    const registered = (server as any)._registeredTools;
    if (registered) {
      expect(Object.keys(registered)).toHaveLength(14);
    }
  });
});
