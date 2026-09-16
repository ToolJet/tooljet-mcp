import { describe, expect, it } from 'vitest';
import { normalizePlanBindingAliases } from '../src/planBindingAliases.js';
import { bindingReferences } from '../src/bindingReferences.js';
import type { AppPlanInput } from '../src/appPlanSchema.js';
import type { AppSummary } from '../src/tooljetClient.js';

function plan(): AppPlanInput {
  return { pages: [{ name: 'Home', icon: 'IconHome2', components: [
    { client_ref: 'project_name', name: 'projectName', type: 'TextInput', properties: { value: "{{queries.project_list.data[0]?.name}}" } },
    { client_ref: 'save', name: 'saveProject', type: 'Button', properties: { disabledState: '{{!components.project_name.value.trim()}}' } },
  ] }], queries: [{ client_ref: 'project_list', name: 'listProjects', kind: 'runjs', options: {
    code: "return `${components.project_name.value} / ${queries?.project_list?.data}`;",
  } }], events: [{ source_ref: 'save', source_type: 'component', trigger: 'onClick', action: {
    actionId: 'run-query', target_ref: 'project_list', runOnlyIf: '{{components["project_name"].value.trim().length > 0}}',
  } }] };
}

describe('explicit plan alias normalization', () => {
  it('resolves bindings and RunJS before persistence, keeping structural refs and names intact', () => {
    const spec = plan();
    const warnings = normalizePlanBindingAliases(spec);
    expect(spec.pages![0]!.components![0]!.properties!.value).toBe('{{queries["listProjects"].data[0]?.name}}');
    expect(spec.pages![0]!.components![1]!.properties!.disabledState).toBe('{{!components["projectName"].value.trim()}}');
    expect(spec.queries![0]!.options.code).toBe('return `${components["projectName"].value} / ${queries?.["listProjects"]?.data}`;');
    expect(spec.events![0]!.action.target_ref).toBe('project_list');
    expect(spec.events![0]!.action.runOnlyIf).toContain('components["projectName"]');
    expect(warnings).toHaveLength(2);
    expect(normalizePlanBindingAliases(spec)).toEqual([]);
  });
  it('preserves runtime names, ambiguous aliases and duplicate target names', () => {
    const spec = plan();
    spec.pages![0]!.components!.push({ client_ref: 'other', name: 'projectName', type: 'TextInput' });
    normalizePlanBindingAliases(spec);
    expect(spec.pages![0]!.components![1]!.properties!.disabledState).toContain('components.project_name');
    const other = plan();
    const existing = { pages: [{ components: [{ name: 'project_name' }] }], queries: [] } as unknown as AppSummary;
    normalizePlanBindingAliases(other, existing);
    expect(other.pages![0]!.components![1]!.properties!.disabledState).toContain('components.project_name');
    const duplicate = plan();
    duplicate.pages![0]!.components!.push({client_ref:'project_name',name:'anotherName',type:'TextInput'});
    normalizePlanBindingAliases(duplicate);
    expect(duplicate.pages![0]!.components![1]!.properties!.disabledState).toContain('components.project_name');
  });
  it('does not reinterpret data, string examples, dynamic lookup, shadowed names, or invalid JS', () => {
    const spec = plan();
    spec.seed_data = [{table_name:'notes',rows:[{note:'{{components.project_name.value}}'}]}];
    spec.queries![0]!.options.code = "// components.project_name\nconst components={project_name:1}; return components.project_name + '{{queries.project_list.data}}';";
    const originalCode = spec.queries![0]!.options.code;
    spec.pages![0]!.components![1]!.properties = { text: "Documentation: components.project_name", disabledState: '{{components[key]?.value}}',
      invalid: '{{components.project_name + }}', example: "{{'components.project_name'}}" };
    normalizePlanBindingAliases(spec);
    expect(spec.queries![0]!.options.code).toBe(originalCode);
    expect(spec.seed_data[0]!.rows[0]!.note).toBe('{{components.project_name.value}}');
    expect(spec.pages![0]!.components![1]!.properties!.invalid).toBe('{{components.project_name + }}');
    expect(spec.pages![0]!.components![1]!.properties!.example).toBe("{{'components.project_name'}}");
  });
  it('uses resolved datasource kind for plain RunJS and handles names with spaces', () => {
    const spec = plan();
    delete spec.queries![0]!.kind;
    spec.queries![0]!.datasource_id = 'js';
    spec.pages![0]!.components![0]!.name = 'Project name';
    normalizePlanBindingAliases(spec, undefined, new Map([['js','runjs']]));
    expect(spec.queries![0]!.options.code).toContain('components["Project name"].value');
  });
});

describe('parse-only binding references', () => {
  it('sees template interpolation but not quoted text, regex examples or local namespaces', () => {
    expect(bindingReferences('{{`Hi ${components.name.value}`}}')).toEqual([{namespace:'components',name:'name'}]);
    expect(bindingReferences('{{/components.fake/.test("x")}}')).toEqual([]);
    expect(bindingReferences('{{((components) => components.local)({local:1})}}')).toEqual([]);
    expect(bindingReferences('{{components[name]}}')).toEqual([]);
    expect(bindingReferences('{{components.fake + }}')).toEqual([]);
  });
});
