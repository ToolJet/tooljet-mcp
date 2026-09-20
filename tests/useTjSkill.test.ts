import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CLI_WORDS } from '../src/cli/index.js';

const skill = readFileSync(resolve(__dirname, '../skills/use-tj/SKILL.md'), 'utf8');

describe('use-tj skill', () => {
  it('has the frontmatter hosts need to discover it', () => {
    expect(skill).toMatch(/^---\nname: use-tj\ndescription: ".+"\n---/);
  });

  it('never teaches an agent to handle a token', () => {
    expect(skill).toContain('Never ask for, accept, echo or write a ToolJet token');
    expect(skill).not.toMatch(/--pat-stdin|tj_pat_/);
  });

  it('only names commands the CLI actually has', () => {
    const used = [...skill.matchAll(/`tj (auth|agents|install|doctor)\b/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(5);
    for (const word of used) expect(CLI_WORDS.has(word)).toBe(true);
  });
});
