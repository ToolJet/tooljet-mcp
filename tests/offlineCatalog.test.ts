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

// 2026-10-14: the UI 2.0 pack widened these schemas to unions; the catalog said only "union" and hid the members.
describe('union property types', () => {
  it('lists the member types in the compact catalog', async () => {
    const result = await getComponentCatalogTool(undefined as any).handler({ types: ['ShadCardGrid', 'ShadAreaChart', 'ShadSchedule'], sections: ['properties'] });
    const props = Object.fromEntries(JSON.parse(result.content[0].text).components.map((c: any) => [c.type, c.properties]));
    const prop = (type: string, key: string) => props[type].find((p: any) => p.key === key);
    expect(prop('ShadCardGrid', 'metaFields')).toMatchObject({ valueType: 'union', valueTypes: ['array', 'string'] });
    expect(prop('ShadAreaChart', 'seriesLabels')).toMatchObject({ valueType: 'union', valueTypes: ['object', 'array'] });
    expect(prop('ShadSchedule', 'dayStart')).toMatchObject({ valueType: 'union', valueTypes: ['number', 'string'] });
  });
});
