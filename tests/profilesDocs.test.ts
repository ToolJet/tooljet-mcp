import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ADAPTERS } from '../src/cli/agents/index.js';
import { CLI_MIN_NODE } from '../src/cli/words.js';
import { profilesPath } from '../src/profiles/paths.js';
import { loadStore } from '../src/profiles/store.js';

/* Docs are never run, so nothing notices when they stop being true. Like pluginManifest.test.ts,
   this reads the committed files: the first draft showed a fixed release number and an example
   that pointed an agent at a profile it never defined. */
const root = resolve(__dirname, '..');
const doc = readFileSync(join(root, 'docs/profiles.md'), 'utf8');
const readme = readFileSync(join(root, 'README.md'), 'utf8');
const example = JSON.parse(doc.match(/```json\n([\s\S]*?)```/)![1]);

let home: string;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'tj-docs-'));
  process.env.TOOLJET_MCP_HOME = join(home, 'h');
});
afterEach(() => {
  delete process.env.TOOLJET_MCP_HOME;
  rmSync(home, { recursive: true, force: true });
});

describe('docs/profiles.md and the README stay true', () => {
  it('shows an example file the real loader accepts without dropping anything', () => {
    mkdirSync(process.env.TOOLJET_MCP_HOME!, { recursive: true, mode: 0o700 });
    writeFileSync(profilesPath(), JSON.stringify(example), { mode: 0o600 });
    const store = loadStore();
    expect(store.active).toBe(example.active);
    expect(store.agentDefaults).toEqual(example.agentDefaults);
    expect(Object.keys(store.profiles)).toEqual(Object.keys(example.profiles));
  });

  it('uses a placeholder for the version, which changes with every release', () => {
    expect(example.version).not.toMatch(/^\d+\.\d+\.\d+$/);
    expect(doc).not.toMatch(/"version": "\d+\.\d+\.\d+"/);
  });

  it('only points at files that exist', () => {
    const paths = [...doc.matchAll(/`((?:src|scripts|skills|tests|docs|bundle)\/[^`\s]+)`/g)].map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(5);
    for (const path of paths) expect(existsSync(join(root, path)), path).toBe(true);
  });

  it('names every agent tj connects', () => {
    for (const agent of ADAPTERS) {
      expect(readme, agent.name).toContain(agent.name);
      expect(doc, agent.name).toContain(agent.name.replace(/ \(.*\)$/, ''));
    }
  });

  it('states the Node version the tj command really needs', () => {
    const version = CLI_MIN_NODE.join('.');
    expect(readme).toContain(version);
    expect(doc).toContain(version);
  });
});
