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
      const names = Object.keys(registered);
      // Robust to added tools: assert the core surface is present rather than an exact count.
      for (const required of [
        'create_app',
        'get_app',
        'get_app_summary',
        'get_component',
        'add_component',
        'add_components',
        'add_query',
        'add_events',
        'list_datasources',
        'get_datasource_query_schema',
        'inspect_datasource_schema',
        'add_table_column',
        'drop_table_column',
        'drop_table',
        'generate_form_schema',
        'run_queries',
      ]) {
        expect(names).toContain(required);
      }
    }
  });
});
