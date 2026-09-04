import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { registerTools } from '../src/tools/index.js';

/**
 * A ratchet on the context every request pays for, whether or not the model uses any of it.
 *
 * Tool titles and descriptions are re-sent on every turn, and SKILL.md is always loaded, so growth
 * here is a per-turn tax across every build on every provider. It is also invisible: nobody adds
 * "and 900 more characters to every request" to a PR description, and no existing test notices.
 *
 * These numbers are deliberately checked in. Raising one is fine and will happen often; doing it in
 * the same commit as the growth is the point, so the cost shows up in review as a number rather
 * than as a slow drift nobody is watching.
 */

interface Registered {
  name: string;
  title?: string;
  description?: string;
}

function registeredTools(): Registered[] {
  const previous = process.env.TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS;
  process.env.TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS = 'true';
  try {
    const captured: Registered[] = [];
    const server = {
      registerTool(name: string, config: Omit<Registered, 'name'>) {
        captured.push({ name, ...config });
      },
    } as unknown as McpServer;
    registerTools(server, {} as ToolJetClient);
    return captured;
  } finally {
    if (previous === undefined) delete process.env.TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS;
    else process.env.TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS = previous;
  }
}

/** Prose the model reads on every turn: what each tool is called and what it says it does. */
function toolProseChars(): number {
  return registeredTools().reduce(
    (total, tool) => total + (tool.title?.length ?? 0) + (tool.description?.length ?? 0),
    0
  );
}

function skillChars(): number {
  return readFileSync(resolve(__dirname, '..', 'skill', 'SKILL.md'), 'utf8').length;
}

/**
 * Committed baselines. Update deliberately, in the commit that causes the growth, with a note on
 * what bought the increase.
 */
const BASELINE = {
  // 55 registered tools, including the legacy singular aliases.
  toolProseChars: 31_442,
  skillChars: 6_471,
};

/** How far past a baseline a change may drift before it has to be acknowledged. */
const TOLERANCE = 0.02;

function assertWithinBaseline(label: string, actual: number, baseline: number) {
  const ceiling = Math.ceil(baseline * (1 + TOLERANCE));
  expect(
    actual,
    `${label} is ${actual}, over the ${ceiling} ceiling (baseline ${baseline}). This is context every ` +
      `request pays for. If the growth is worth it, raise the baseline in this commit and say what ` +
      `bought it; if it is not, trim instead.`
  ).toBeLessThanOrEqual(ceiling);
}

describe('per-request context budget', () => {
  it('keeps tool titles and descriptions within the committed baseline', () => {
    assertWithinBaseline('Tool title+description prose', toolProseChars(), BASELINE.toolProseChars);
  });

  it('keeps the always-loaded skill within the committed baseline', () => {
    assertWithinBaseline('SKILL.md', skillChars(), BASELINE.skillChars);
  });

  it('reports the current cost so a baseline bump is an informed one', () => {
    // Not an assertion. Printed so whoever raises a baseline can see both numbers together and
    // what share of the always-on cost each represents.
    const tools = toolProseChars();
    const skill = skillChars();
    const total = tools + skill;
    console.log(
      `\n  per-request context: ${total} chars` +
        `\n    tool title+description  ${tools} (${Math.round((tools / total) * 100)}%) across ${registeredTools().length} tools` +
        `\n    SKILL.md                ${skill} (${Math.round((skill / total) * 100)}%)\n`
    );
    expect(total).toBeGreaterThan(0);
  });
});
