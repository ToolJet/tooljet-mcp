import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { codeAppBuildTool, codeAppReadFilesTool, codeAppScaffoldTool, inCodeScopeForTests, projectsForApp } from '../src/tools/codeApp.js';
import { codeContext, DEPLOYMENT, WORKSPACE } from './codeContext.js';

const APP = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

describe('Code mode projects are found by app id', () => {
  let dir: string;
  const env = { ...process.env };
  const project = (name: string, appId: string, ageSeconds = 0) => {
    const p = join(dir, 'apps', DEPLOYMENT, WORKSPACE, name);
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

  it('lists an app\'s projects, newest first', async () => {
    await inCodeScopeForTests(codeContext(), async () => {
      expect(projectsForApp(APP)).toEqual(['todo-tasks', 'today-tasks']);
      expect(projectsForApp('33333333-3333-4333-8333-333333333333')).toEqual([]);
    });
  });

  it('reads the app\'s project without a name', async () => {
    const read = result(await codeAppReadFilesTool(codeContext()).handler({ app_id: APP } as any));
    expect(read.project_dir).toBe(join(dir, 'apps', DEPLOYMENT, WORKSPACE, 'todo-tasks'));
  });

  it('says where to look instead of guessing', async () => {
    const missing = text(await codeAppBuildTool(codeContext()).handler({ app_id: '33333333-3333-4333-8333-333333333333' } as any));
    expect(missing).toMatch(/call code_app_scaffold with this app_id/);
    // The app id names the project: a different name beside it is ignored, not a refusal to send the call again.
    const named = text(await codeAppBuildTool(codeContext()).handler({ app_id: APP, name: 'expenses' } as any));
    expect(named).not.toMatch(/project is "todo-tasks"/);
  });

  it('scaffolding an app that has a project returns that project, never a second one', async () => {
    const out = result(await codeAppScaffoldTool(codeContext()).handler({ name: 'task-list', display_name: 'Tasks', app_id: APP } as any));
    expect(out.existing_project).toBe('todo-tasks');
    await inCodeScopeForTests(codeContext(), async () => expect(projectsForApp(APP)).toHaveLength(2));
  });

  it("refuses to scaffold into another app's project", async () => {
    const out = text(await codeAppScaffoldTool(codeContext()).handler({ name: 'expenses', display_name: 'X', app_id: '33333333-3333-4333-8333-333333333333' } as any));
    expect(out).toMatch(/belongs to app/);
  });
});

describe('code_app_scaffold names an untitled app', () => {
  let dir: string;
  const env = { ...process.env };
  const setup = (appName: string) => {
    const p = join(dir, 'apps', DEPLOYMENT, WORKSPACE, 'tasks');
    mkdirSync(join(p, 'frontend', 'src'), { recursive: true });
    mkdirSync(join(p, '.tooljet'), { recursive: true });
    writeFileSync(join(p, 'app.json'), JSON.stringify({ name: 'Tasks', appId: APP }));
    writeFileSync(join(p, 'frontend', 'src', 'tooljet.gen.ts'), '// hooks');
    writeFileSync(join(p, '.tooljet', 'snapshot.json'), JSON.stringify({ appId: APP, appName, versionId: 'v1' }));
  };
  const scaffold = (client: any) =>
    codeAppScaffoldTool(codeContext({ client: client as any })).handler({ name: 'tasks', display_name: 'Tasks', app_id: APP } as any).then((r: any) => JSON.parse(r.content[0].text));

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tj-mcp-name-'));
    writeFileSync(join(dir, 'cli.js'), "console.log('ok')");
    process.env.TOOLJET_CLI = join(dir, 'cli.js');
    process.env.TOOLJET_CODE_APP_ROOT = join(dir, 'apps');
  });
  afterEach(() => {
    process.env = { ...env };
    rmSync(dir, { recursive: true, force: true });
  });

  it('renames the placeholder name to the display name', async () => {
    setup('Untitled App: 5f0c2d');
    const calls: string[][] = [];
    const out = await scaffold({ renameApp: async (...a: string[]) => void calls.push(a) });
    expect(calls).toEqual([[APP, 'v1', 'Tasks']]);
    expect(out.renamed_to).toBe('Tasks');
  });

  it('suffixes a taken name', async () => {
    setup('Untitled App: 5f0c2d');
    let first = true;
    const out = await scaffold({
      renameApp: async () => {
        if (first) ((first = false), (() => { throw new Error('App name already exists'); })());
      },
    });
    expect(out.renamed_to).toMatch(/^Tasks \w{3}$/);
    expect(out.rename_warning).toMatch(/already used/);
  });

  it('leaves a name someone chose alone', async () => {
    setup('Team tasks');
    const calls: string[][] = [];
    const out = await scaffold({ renameApp: async (...a: string[]) => void calls.push(a) });
    expect(calls).toEqual([]);
    expect(out).not.toHaveProperty('renamed_to');
  });

  // The dashboard names a new Code mode app from the prompt's first words ("I run procurement at", 2026-11-05); the
  // agent passes that name on, and only that name gives way to the build's.
  it('renames the name the agent says is the dashboard\'s first words, and no other', async () => {
    setup('I run procurement at');
    const calls: string[][] = [];
    const run = (rename_from: string) =>
      codeAppScaffoldTool(codeContext({ client: { renameApp: async (...a: string[]) => void calls.push(a) } as any }))
        .handler({ name: 'tasks', display_name: 'Tasks', app_id: APP, rename_from } as any)
        .then((r: any) => JSON.parse(r.content[0].text));
    expect((await run('Something else')).renamed_to).toBeUndefined();
    expect((await run('I run procurement at')).renamed_to).toBe('Tasks');
    expect(calls).toEqual([[APP, 'v1', 'Tasks']]);
  });
});
