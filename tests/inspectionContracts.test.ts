import { describe, expect, it, vi } from 'vitest';
import { createClient, type ToolJetClient } from '../src/tooljetClient.js';
import type { Auth } from '../src/auth.js';
import { getComponentCatalogTool } from '../src/tools/getComponentCatalog.js';
import { getAppSummaryTool } from '../src/tools/getAppSummary.js';
import { getComponentTool } from '../src/tools/getComponent.js';

const body = (result: any) => JSON.parse(result.content[0].text);
const validation = { minTime: { value: '{{components.start.value}}' }, customRule: { value: '{{true}}' } };
function fixtureClient() {
  const raw = { id: 'a', editing_version: { id: 'v' }, pages: [{ id: 'p', name: 'Home', components: {
    c: { component: { name: 'end', component: 'TimePicker',
      validation: { schemaOnly: { type: 'code' } },
      definition: { properties: { timeFormat: { value: 'HH:mm' } }, validation } } },
  } }] };
  const fetch = vi.fn().mockImplementation(async () => new Response(JSON.stringify(raw), { status: 200 }));
  const auth = { authedFetch: fetch } as unknown as Auth;
  return { client: createClient(auth, { apiUrl: 'http://localhost:3000', appUrl: 'http://localhost:8082', email: 'fixture@example.invalid', password: 'fixture' }), fetch };
}

describe('runtime inspection contracts from Luna benchmark failures', () => {
  it('delivers Calendar authoring semantics in the selective lookup the model actually used', async () => {
    const result = body(await getComponentCatalogTool({} as ToolJetClient).handler({
      type: 'Calendar', sections: ['properties', 'styles', 'events', 'authoringHints'],
    }));
    expect(result.authoringHints.selection.rule).toMatch(/projected event.*not.*source row/i);
    expect(result.authoringHints.selection.rule).toMatch(/stable.*id/i);
    expect(result.authoringHints.dateParsing.rule).toMatch(/same dateFormat/);
    expect(result).not.toHaveProperty('exposedVariables');
  });

  it('still delivers the default Calendar warning and exact property details', async () => {
    const tool = getComponentCatalogTool({} as ToolJetClient);
    expect(body(await tool.handler({ type: 'Calendar' })).description).toMatch(/projected event/);
    const exact = body(await tool.handler({ type: 'Calendar', sections: ['properties'], property_keys: ['events'] }));
    expect(exact.properties).toHaveLength(1);
    expect(exact.properties[0].description).toMatch(/raw ISO/);
  });

  it('preserves actual validation in single component and full summary, not widget schema', async () => {
    const { client, fetch } = fixtureClient();
    const component = body(await getComponentTool(client).handler({ app_id: 'a', component_id: 'c' }));
    expect(component.validation).toEqual(validation);
    expect(component.validation).not.toHaveProperty('schemaOnly');
    const full = body(await getAppSummaryTool(client).handler({ app_id: 'a', detail: 'full', sections: ['pages'] }));
    expect(full.pages[0].components[0].validation).toEqual(validation);
    expect(fetch.mock.calls.every(([path]) => path === '/api/apps/a')).toBe(true);
  });

  it('supports dotted validation selection while default structure remains compact', async () => {
    const { client } = fixtureClient();
    const tool = getAppSummaryTool(client);
    const result = await tool.handler({ app_id: 'a', component_fields: ['id', 'validation.minTime.value'], sections: ['pages'] });
    expect(result.isError).toBeUndefined();
    expect(body(result).pages[0].components[0]).toEqual({ id: 'c', validation: { minTime: validation.minTime } });
    const compact = body(await tool.handler({ app_id: 'a', sections: ['pages'] }));
    expect(compact.pages[0].components[0]).not.toHaveProperty('validation');
  });
});
