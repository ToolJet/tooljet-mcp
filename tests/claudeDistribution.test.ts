import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';

const workflow = parse(readFileSync(resolve(__dirname, '../.github/workflows/publish-claude-plugin.yml'), 'utf8'));
const publishScript = workflow.jobs.publish.steps.find((step: { run?: string }) => step.run).run;
const branch = 'chore/claude-plugin-dist';
const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })));

describe('Claude distribution publication', () => {
  it('publishes only the artifact at the branch root, updates without rewriting history, and skips stale CI', () => {
    const temp = mkdtempSync(join(tmpdir(), 'claude distribution '));
    temporary.push(temp);
    const remote = join(temp, 'origin.git');
    const checkout = join(temp, 'source');
    const output = join(checkout, 'plugins/tooljet-claude');
    const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    const write = (path: string, value: string) => writeFileSync(join(checkout, path), value);
    mkdirSync(remote);
    mkdirSync(checkout);
    git(remote, 'init', '--bare');
    git(checkout, 'init', '-b', 'main');
    git(checkout, 'config', 'user.name', 'Synthetic Publisher');
    git(checkout, 'config', 'user.email', 'publisher@example.test');
    git(checkout, 'remote', 'add', 'origin', remote);
    write('.gitignore', 'plugins/\n');
    write('package.json', '{"name":"synthetic-source-only"}\n');
    const advanceMain = (message: string) => {
      write('README.md', message);
      git(checkout, 'add', '.');
      git(checkout, 'commit', '-m', message);
      git(checkout, 'push', 'origin', 'main');
      return git(checkout, 'rev-parse', 'HEAD');
    };
    let source = advanceMain('Initial source');
    for (const path of ['.claude-plugin', 'bundle', 'skills/studio']) mkdirSync(join(output, path), { recursive: true });
    write('plugins/tooljet-claude/.claude-plugin/plugin.json', '{"name":"synthetic-studio","version":"1.0.0"}\n');
    write('plugins/tooljet-claude/bundle/index.mjs', 'export const build = 1;\n');
    write('plugins/tooljet-claude/skills/studio/SKILL.md', 'Synthetic studio guidance.\n');
    write('plugins/tooljet-claude/bundle/obsolete.mjs', 'export {};\n');
    const publish = () => {
      const runnerTemp = mkdtempSync(join(temp, 'runner '));
      execFileSync('bash', ['-c', publishScript], {
        cwd: checkout, stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, SOURCE_COMMIT: source, GITHUB_WORKSPACE: checkout, RUNNER_TEMP: runnerTemp, GITHUB_STEP_SUMMARY: join(runnerTemp, 'summary') },
      });
      return git(remote, 'rev-parse', branch);
    };

    const first = publish();
    expect(git(remote, 'ls-tree', '--name-only', branch).split('\n')).toEqual(['.claude-plugin', 'bundle', 'skills']);
    expect(git(remote, 'rev-list', '--count', branch)).toBe('1');
    expect(git(remote, 'show', `${branch}:skills/studio/SKILL.md`)).toBe('Synthetic studio guidance.');
    expect(publish()).toBe(first); // Identical artifacts do not create empty commits.

    source = advanceMain('Updated source');
    rmSync(join(output, 'bundle/obsolete.mjs'));
    write('plugins/tooljet-claude/bundle/index.mjs', 'export const build = 2;\n');
    const second = publish();
    expect(second).not.toBe(first);
    expect(git(remote, 'rev-parse', `${branch}^`)).toBe(first);
    expect(git(remote, 'ls-tree', '-r', '--name-only', branch)).not.toContain('obsolete.mjs');
    expect(git(remote, 'show', `${branch}:bundle/index.mjs`)).toBe('export const build = 2;');
    expect(git(remote, 'rev-parse', 'main')).toBe(source);

    advanceMain('Newer main awaits CI');
    write('plugins/tooljet-claude/bundle/index.mjs', 'export const build = 3;\n');
    expect(publish()).toBe(second); // Late completion of an older CI run cannot overwrite the release.
  }, 30_000);
});
