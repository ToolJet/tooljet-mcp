import { describe, it, expect, beforeAll, afterEach } from 'vitest';

beforeAll(() => {
  process.env.TOOLJET_EMAIL = 'x@y.com';
  process.env.TOOLJET_PASSWORD = 'pw';
});

afterEach(() => {
  delete process.env.TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS;
});

describe('buildServer', () => {
  it('builds with the compact default tool surface', async () => {
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
        'add_components',
        'add_component_batches',
        'apply_app_phase',
        'add_queries',
        'add_events',
        'update_pages',
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

      for (const hiddenByDefault of ['create_table', 'insert_rows', 'add_page', 'add_query', 'add_component']) {
        expect(names).not.toContain(hiddenByDefault);
      }
    }
  });

  it('can restore legacy singular create tools for older clients', async () => {
    process.env.TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS = 'true';
    const { buildServer } = await import('../src/server.js');
    const server = buildServer();
    const names = Object.keys((server as any)._registeredTools ?? {});

    for (const legacy of ['create_table', 'insert_rows', 'add_page', 'add_query', 'add_component']) {
      expect(names).toContain(legacy);
    }
  });
});
