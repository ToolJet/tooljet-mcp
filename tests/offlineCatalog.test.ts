import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { getComponentCatalogTool } from '../src/tools/getComponentCatalog.js';
const root = resolve(import.meta.dirname, '..');
const read = (host: string, file: string) => JSON.parse(readFileSync(resolve(root, host, 'references/catalog', file), 'utf8'));

describe('offline skill contracts', () => {
  it('matches the full local MCP contracts in both host packages, including render hints and children', async () => {
    const tool = getComponentCatalogTool(undefined as any);
    const files = readdirSync(resolve(root, 'skill/references/catalog')).filter((f) => f !== '_index.json' && f.endsWith('.json'));
    let withHints = 0, withChildren = 0;
    for (const file of files) {
      const result = await tool.handler({ types: [file.slice(0, -5)], detail: 'full',
        sections: ['overview', 'properties', 'styles', 'events', 'actions', 'exposedVariables', 'defaultChildren', 'renderingHints', 'authoringHints'] });
      const expected = JSON.parse(result.content[0].text);
      expect(read('skill', file)).toEqual(expected);
      expect(read('skills/tooljet-app-builder', file)).toEqual(expected);
      if (expected.components[0].renderingHints) withHints++;
      if (expected.components[0].defaultChildren) withChildren++;
    }
    expect(files.length).toBeGreaterThan(50);
    expect(withHints).toBeGreaterThan(0);
    expect(withChildren).toBeGreaterThan(0);
  });
});
