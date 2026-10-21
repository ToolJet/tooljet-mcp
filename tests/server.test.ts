import { describe, it, expect, beforeAll, afterEach } from 'vitest';

beforeAll(() => {
  process.env.TOOLJET_PAT = 'tj_pat_test';
});

afterEach(() => {
  delete process.env.TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS;
  delete process.env.TOOLJET_ENABLE_RENDER_SESSION;
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
        'get_runtime_info',
        'create_app',
        'get_app_settings',
        'list_app_themes',
        'update_app_settings',
        'get_app',
        'get_app_summary',
        'get_component',
        'add_components',
        'add_component_batches',
        'apply_app_phase',
        'add_queries',
        'add_events',
        'update_pages',
        'delete_page',
        'list_datasources',
        'get_datasource_query_schema',
        'inspect_datasource_schema',
        'prepare_sql_discovery_queries',
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

  it('hides create_render_session by default: its result is a live session token', async () => {
    const { buildServer } = await import('../src/server.js');
    const names = Object.keys((buildServer() as any)._registeredTools ?? {});

    expect(names).not.toContain('create_render_session');
  });

  it('exposes create_render_session when the ToolJet agent opts in', async () => {
    process.env.TOOLJET_ENABLE_RENDER_SESSION = '1';
    const { buildServer } = await import('../src/server.js');
    const names = Object.keys((buildServer() as any)._registeredTools ?? {});

    expect(names).toContain('create_render_session');
  });
});
