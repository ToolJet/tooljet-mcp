import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getComponentSchema } from '../src/catalog.js';
import { lintComponentStateBindings } from '../src/componentStateBindings.js';
import { validateAppStructure } from '../src/lint.js';
import { validateEvents } from '../src/eventValidation.js';
import { getComponentCatalogTool } from '../src/tools/getComponentCatalog.js';
import type { AppSummary } from '../src/tooljetClient.js';

const component = { id: 'stage', name: 'stageFilter', type: 'MultiselectV2' };
const components = [component];
const aliasErrors = (errors: string[]) => errors.filter(e => e.includes('MultiselectV2 "stageFilter" does not expose value.'));
// A personal filter over a multiselect, with no trace dependency or query execution.
const filter = '{{ (queries.deals.data || []).filter(r => { const chosen = components.stageFilter?.value || ["Proposal","Negotiation"]; return chosen.includes("All stages") || chosen.includes(r.stage); }) }}';

describe('MultiselectV2 typed selection reads', () => {
  it.each([
    '{{ components.stageFilter.value }}',
    '{{ components.stageFilter?.value }}',
    '{{ components?.stageFilter?.value ?? [] }}',
    '{{ components["stageFilter"]["value"] }}',
    '{{ components?.["stageFilter"]?.["value"] || [] }}',
    filter,
  ])('rejects a proven singular read, including fallback masking: %s', value => {
    const errors = lintComponentStateBindings(value, components, 'Component "deals".data');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Component "deals".data: MultiselectV2 "stageFilter" does not expose value.');
    expect(errors[0]).toContain('components.stageFilter.values');
    expect(errors[0]).toContain('fallback');
  });

  it('reports the exact Table binding through app validation without changing the plan', () => {
    const app: AppSummary = {
      app_id: 'offline', pages: [{ id: 'p', components: [component,
        { id: 't', name: 'deals', type: 'Table', properties: { data: { value: filter } } },
      ] }], queries: [{ id: 'q', name: 'deals' }], events: [],
    };
    const before = JSON.stringify(app);
    expect(aliasErrors(validateAppStructure(app).errors)).toEqual([
      expect.stringContaining('Component "deals".p.data.value:'),
    ]);
    expect(JSON.stringify(app)).toBe(before);
    const corrected = JSON.parse(before.replace('stageFilter?.value', 'stageFilter?.values')) as AppSummary;
    expect(aliasErrors(validateAppStructure(corrected).errors)).toEqual([]);
  });

  it('covers query bindings, RunJS, and event actions through their existing validators', () => {
    const app: AppSummary = {
      app_id: 'offline', pages: [{ id: 'p', components }], events: [],
      queries: [{ id: 'q', name: 'filtered', options: {
        code: 'return components.stageFilter?.value ?? [];',
        query: '{{ components.stageFilter.value }}',
      } }],
    };
    expect(aliasErrors(validateAppStructure(app).errors)).toHaveLength(2);
    const event = { sourceType: 'component' as const, sourceId: 'stage', trigger: 'onSelect',
      action: { actionId: 'set-custom-variable', key: 'stages', value: '{{ components.stageFilter?.value ?? [] }}' } };
    const before = JSON.stringify(event);
    expect(aliasErrors(validateEvents(app, [event]).errors)).toHaveLength(1);
    expect(JSON.stringify(event)).toBe(before);
    event.action.value = '{{ components.stageFilter?.values ?? [] }}';
    expect(validateEvents(app, [event]).errors).toEqual([]);
  });

  it('deduplicates repeated reads within a binding but retains separate source paths', () => {
    const value = '{{ components.stageFilter.value || components.stageFilter?.value }}';
    expect(lintComponentStateBindings(value, components, 'x')).toHaveLength(1);
    expect(lintComponentStateBindings({ first: value, second: [value] }, components, 'x'))
      .toEqual([expect.stringContaining('x.first:'), expect.stringContaining('x.second[0]:')]);
  });

  it.each([
    '{{ components.stageFilter.values }}',
    '{{ components.stageFilter?.["values"] ?? [] }}',
    '{{ components.stageFilter.selectedOptions.map(option => option.value) }}',
    '{{ components.stageFilter.options[0].value }}',
    '{{ components.stageFilter.values[0].value }}',
    '{{ queries.deals.data[0].value }}',
    '{{ components.stageFilter.futureField }}',
    '{{ components[variables.componentName].value }}',
    '{{ components.stageFilter[variables.propertyName] }}',
    '{{ "components.stageFilter.value" }}',
    '{{ /* components.stageFilter.value */ [] }}',
    '{{ ((components) => components.stageFilter.value)({}) }}',
    '{{ (({ components }) => components.stageFilter.value)({}) }}',
    '{{ (() => { const components = {}; return components.stageFilter.value; })() }}',
    '{{ (() => { try { throw {}; } catch (components) { return components.stageFilter.value; } })() }}',
    'Example: components.stageFilter.value',
    '{{ invalid syntax',
  ])('preserves valid, nested, shadowed or unknown reads: %s', value => {
    expect(lintComponentStateBindings(value, components, 'x')).toEqual([]);
  });

  it.each(['DropdownV2', 'TextInput', 'RadioButtonV2', 'DatePickerV2', 'CustomComponent', undefined])(
    'does not impose the plural property on %s', type => {
      expect(lintComponentStateBindings('{{ components.stageFilter.value }}', [{ name: 'stageFilter', type }], 'x')).toEqual([]);
    });

  it('preserves unknown components and shadowed scripts, not a global property allowlist', () => {
    expect(lintComponentStateBindings('{{ components.missing.value }}', components, 'x')).toEqual([]);
    expect(lintComponentStateBindings({ code: 'const components = {}; return components.stageFilter.value;' }, components, 'q')).toEqual([]);
    expect(lintComponentStateBindings({ code: 'return components.stageFilter.values;' }, components, 'q')).toEqual([]);
  });
});

describe('Multiselect catalog and generated skill contracts', () => {
  it('serves the contract through selective catalog requests without a live client', async () => {
    const result = await getComponentCatalogTool(undefined as any).handler({
      types: ['MultiselectV2'], sections: ['properties', 'exposedVariables'], property_keys: ['values', 'schema', 'value'],
    });
    expect(result.isError).not.toBe(true);
    const contract = JSON.parse(result.content[0].text).components[0];
    expect(contract.properties.map((p: any) => p.key).sort()).toEqual(['schema', 'value', 'values']);
    expect(contract.properties.find((p: any) => p.key === 'values').description).toContain('advanced=false');
    expect(contract.exposedVariables.map((v: any) => v.name)).toContain('values');
    expect(contract.exposedVariables.map((v: any) => v.name)).not.toContain('value');
  });

  it('advertises the runtime fields without a singular exposed alias', () => {
    const schema = getComponentSchema('MultiselectV2')!;
    const exposed = schema.exposedVariables!;
    expect(exposed.filter(v => v.name === 'values')).toEqual([
      expect.objectContaining({ name: 'values', valueType: 'array', semantics: expect.stringContaining('before onSelect') }),
    ]);
    expect(exposed.map(v => v.name)).toEqual(expect.arrayContaining(['values', 'selectedOptions', 'options', 'searchText']));
    expect(exposed.map(v => v.name)).not.toContain('value');
    expect(schema.properties.find(p => p.key === 'values')?.description).toMatch(/static.*advanced=false.*array/i);
    expect(schema.properties.find(p => p.key === 'schema')?.description).toMatch(/advanced=true.*visible.*default/i);
    expect(schema.properties.find(p => p.key === 'value')?.description).toMatch(/not.*runtime.*values/i);
  });

  it.each(['skill', 'skills/tooljet-app-builder'])('corrects only the per-type guidance in %s', host => {
    const read = (name: string) => readFileSync(new URL(`../${host}/references/${name}`, import.meta.url), 'utf8');
    const rules = JSON.parse(readFileSync(new URL('../data/component-binding-rules.json', import.meta.url), 'utf8'));
    const rule = rules.MultiselectV2;
    expect(rule).toContain('.values');
    expect(rule).toContain('.selectedOptions');
    expect(rule).not.toContain('there is no `.values`');
    const specific = read('components.md').split('### MultiselectV2\n')[1].split('\n### ')[0];
    expect(specific).toContain(rule);
    for (const file of ['forms.md', 'ui-layout.md', 'workflows.md']) {
      const doc = read(file);
      expect(doc).toContain('MultiselectV2');
      expect(doc).toContain('?.values');
      expect(doc).not.toContain('reference every filter as `components.<filter>?.value`');
      expect(doc).not.toContain('Read values from `components.<name>.value`');
    }
    // Generated Form option schema and scalar controls retain their distinct contracts.
    expect(read('forms.md')).toContain('Dropdown and multiselect fields use `values` plus `displayValues`');
    expect(read('components.md')).toContain('CURRENT SELECTION is `.value`');
  });
});

// Main-approved adjacent correction: only the stale RadioButtonV2 guidance, not its runtime/linter/catalog.
// RadioButtonV2.jsx:88–95 publishes value; :124 and :163–165 expose label as the field caption.
describe('RadioButtonV2 guidance agrees with the existing typed contract', () => {
  it.each(['skill', 'skills/tooljet-app-builder'])('publishes the corrected maintained rule in %s', host => {
    const rules = JSON.parse(readFileSync(new URL('../data/component-binding-rules.json', import.meta.url), 'utf8'));
    const rule = rules.RadioButtonV2;
    expect(rule).toContain('components.<name>?.value');
    expect(rule).toContain('caption');
    expect(rule).not.toContain('NO `.value`');
    const doc = readFileSync(new URL(`../${host}/references/components.md`, import.meta.url), 'utf8');
    expect(doc.split('### RadioButtonV2\n')[1].split('\n### ')[0]).toContain(rule);
    expect(getComponentSchema('RadioButtonV2')!.exposedVariables!.map(v => v.name)).toContain('value');
    const radios = [{ name: 'choice', type: 'RadioButtonV2' }];
    expect(lintComponentStateBindings('{{ components.choice?.value }}', radios, 'x')).toEqual([]);
    expect(lintComponentStateBindings('{{ components.choice?.label }}', radios, 'x'))
      .toEqual([expect.stringContaining('caption')]);
  });
});
