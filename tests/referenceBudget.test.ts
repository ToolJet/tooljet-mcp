import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guards how much of each skill reference actually reaches the model.
 *
 * `read_reference` returns a file WHOLE only while it fits the agent's per-reference budget. Past
 * that it silently switches to section scoring: the model gets an outline plus whichever sections
 * matched its query, and anything that did not match is simply absent. Nothing in either repo says
 * this happened, which is the point of these tests — a reference has already been lost this way.
 * `ui-layout.md` crossed the budget, went to the scored path, and was then dropped entirely by a
 * batch cap, so a form-heavy build ran with none of the layout guidance while every tool call
 * reported success.
 *
 * The number below mirrors MCP_AGENT_REFERENCE_MAX_CHARS in tooljet-agent
 * (mcp_agent/langgraph_agent.py). It lives in the other repo, so it cannot be imported; when it
 * changes there, change it here. Grep either name to find both sides.
 */
const REFERENCE_MAX_CHARS = 25_000;

/**
 * How each reference is MEANT to arrive. `whole` files must stay inside the budget. `scored` files
 * are knowingly larger and rely on their query matching the right sections, which is a real cost:
 * a miss returns an outline and nothing else. Moving a file between these is a deliberate decision
 * about how the model reads it, so it belongs in a diff rather than in a file's growth.
 */
const DELIVERY: Record<string, 'whole' | 'scored'> = {
  components: 'whole',
  datasources: 'whole',
  events: 'whole',
  forms: 'whole',
  qa: 'whole',
  security: 'whole',
  tables: 'whole',
  themes: 'whole',
  'ui-layout': 'whole',
  workflows: 'scored',
};

/**
 * A `whole` file this close to the budget is one edit away from silently becoming a `scored` one.
 * Failing on the approach rather than the crossing is the whole value here: crossing produces no
 * error, no warning and no failing tool call, so without this the first symptom is a build that
 * quietly ignored a reference.
 */
const HEADROOM_FLOOR = 0.9;

const referenceDir = resolve(__dirname, '..', 'skill', 'references');

function referenceNames(): string[] {
  return readdirSync(referenceDir)
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => entry.replace(/\.md$/, ''))
    .sort();
}

function sizeOf(name: string): number {
  return readFileSync(resolve(referenceDir, `${name}.md`), 'utf8').length;
}

describe('skill reference delivery budget', () => {
  it('records a delivery mode for every reference on disk', () => {
    // A new reference added without a mode is the gap this closes: it would otherwise inherit
    // whatever its size happens to imply, with nobody having decided.
    expect(referenceNames()).toEqual(Object.keys(DELIVERY).sort());
  });

  it('keeps every `whole` reference inside the budget it is delivered under', () => {
    const over = referenceNames()
      .filter((name) => DELIVERY[name] === 'whole')
      .map((name) => ({ name, chars: sizeOf(name) }))
      .filter((entry) => entry.chars > REFERENCE_MAX_CHARS)
      .map((entry) => `${entry.name}.md is ${entry.chars} chars, over the ${REFERENCE_MAX_CHARS} budget`);

    expect(
      over,
      'These are marked `whole` but will be section-scored instead, so parts of them stop reaching ' +
        'the model with nothing reporting it. Trim the file, or move it to `scored` deliberately.'
    ).toEqual([]);
  });

  it('leaves every `whole` reference room to grow before it changes delivery mode', () => {
    const ceiling = Math.floor(REFERENCE_MAX_CHARS * HEADROOM_FLOOR);
    const tight = referenceNames()
      .filter((name) => DELIVERY[name] === 'whole')
      .map((name) => ({ name, chars: sizeOf(name) }))
      .filter((entry) => entry.chars > ceiling)
      .map(
        (entry) =>
          `${entry.name}.md is ${entry.chars} chars, only ${REFERENCE_MAX_CHARS - entry.chars} ` +
          `from the ${REFERENCE_MAX_CHARS} budget`
      );

    expect(
      tight,
      'Crossing the budget is silent, so this fails on the approach instead. Trim the file, or move ' +
        'it to `scored` if being section-scored is actually what you want for it.'
    ).toEqual([]);
  });

  it('gives every `scored` reference enough sections for scoring to have a choice', () => {
    // Section scoring can only return whole `##` blocks. A very large file with few headings
    // returns huge chunks and blows the budget on one section, which defeats the mechanism.
    const thin = referenceNames()
      .filter((name) => DELIVERY[name] === 'scored')
      .map((name) => {
        const headings = readFileSync(resolve(referenceDir, `${name}.md`), 'utf8').match(/^##\s+/gm) ?? [];
        return { name, headings: headings.length, chars: sizeOf(name) };
      })
      .filter((entry) => entry.headings < Math.ceil(entry.chars / REFERENCE_MAX_CHARS) * 4)
      .map((entry) => `${entry.name}.md has ${entry.chars} chars across only ${entry.headings} sections`);

    expect(
      thin,
      'A scored reference needs sections small enough that a query can select usefully among them.'
    ).toEqual([]);
  });
});
