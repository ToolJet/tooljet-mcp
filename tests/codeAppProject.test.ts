import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { codeAppBuildTool, codeAppReadFilesTool, codeAppScaffoldTool, projectsForApp } from '../src/tools/codeApp.js';

const APP = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

describe('Code mode projects are found by app id', () => {
  let dir: string;
  const env = { ...process.env };
  const project = (name: string, appId: string, ageSeconds = 0) => {
    const p = join(dir, 'apps', name);
    mkdirSync(join(p, 'frontend', 'src'), { recursive: true });
    writeFileSync(join(p, 'app.json'), JSON.stringify({ name, appId }));
    writeFileSync(join(p, 'frontend', 'src', 'tooljet.gen.ts'), '// hooks');
    const t = Date.now() / 1000 - ageSeconds;
    utimesSync(join(p, 'app.json'), t, t);
  };
  const result = (r: any) => JSON.parse(r.content[0].text);
  const text = (r: any) => r.content[0].text as string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tj-mcp-project-'));
    writeFileSync(join(dir, 'cli.js'), "console.log('ok')");
    process.env.TOOLJET_CLI = join(dir, 'cli.js');
    process.env.TOOLJET_CODE_APP_ROOT = join(dir, 'apps');
    project('today-tasks', APP, 600);
    project('todo-tasks', APP);
    project('expenses', OTHER);
  });
  afterEach(() => {
    process.env = { ...env };
    rmSync(dir, { recursive: true, force: true });
  });

  it('lists an app\'s projects, newest first', () => {
    expect(projectsForApp(APP)).toEqual(['todo-tasks', 'today-tasks']);
    expect(projectsForApp('33333333-3333-4333-8333-333333333333')).toEqual([]);
  });

  it('reads the app\'s project without a name', async () => {
    const read = result(await codeAppReadFilesTool().handler({ app_id: APP } as any));
    expect(read.project_dir).toBe(join(dir, 'apps', 'todo-tasks'));
  });

  it('says where to look instead of guessing', async () => {
    const missing = text(await codeAppBuildTool().handler({ app_id: '33333333-3333-4333-8333-333333333333' } as any));
    expect(missing).toMatch(/call code_app_scaffold with this app_id/);
    const wrong = text(await codeAppBuildTool().handler({ app_id: APP, name: 'expenses' } as any));
    expect(wrong).toMatch(/project is "todo-tasks"/);
  });

  it('scaffolding an app that has a project returns that project, never a second one', async () => {
    const out = result(await codeAppScaffoldTool().handler({ name: 'task-list', display_name: 'Tasks', app_id: APP } as any));
    expect(out.existing_project).toBe('todo-tasks');
    expect(projectsForApp(APP)).toHaveLength(2);
  });

  it("refuses to scaffold into another app's project", async () => {
    const out = text(await codeAppScaffoldTool().handler({ name: 'expenses', display_name: 'X', app_id: '33333333-3333-4333-8333-333333333333' } as any));
    expect(out).toMatch(/belongs to app/);
  });
});
