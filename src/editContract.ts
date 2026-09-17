import { z } from 'zod';
import { getComponentSchema } from './catalog.js';

const name = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).refine(v => !['__proto__', 'prototype', 'constructor'].includes(v));
export const editContractSchema = z.object({
  source_query: name.describe('Already-loaded bounded raw row-array query; never a display projection.'),
  table_component: name,
  id_field: name.default('id'),
  prefix: name.describe('Unique prefix for generated snapshot/draft variables and RunJS query names.'),
  fields: z.array(z.object({
    field: name,
    component: name,
    type: z.enum(['text', 'number', 'date_only', 'boolean']),
    required: z.boolean().default(false),
    nullable: z.boolean().default(false).describe('Opt in to clearing to null; a user change event is also required.'),
    trim: z.boolean().default(false),
    choices: z.union([
      z.array(z.object({label:z.string(),value:z.union([z.string(),z.number().finite()])}).strict()).min(1).max(100),
      z.object({query:name,value_field:name,label_field:name}).strict(),
    ]).optional().describe('Opt-in DropdownV2 for text/number fields: literal label/value options or an already-loaded bounded raw option query. Values must match the declared field type.'),
  })).min(1).max(40),
}).strict();
export type EditContractInput = z.input<typeof editContractSchema>;

// This function is emitted into RunJS, not executed against customer records by MCP.
function canonical(value: unknown, field: { field: string; type: string; required: boolean; nullable: boolean; trim: boolean }): unknown {
  if (value === undefined) throw new Error(`Missing input: ${field.field}`);
  if (value === null || value === '') {
    if (field.required) throw new Error(`Required field: ${field.field}`);
    if (value === null && !field.nullable) throw new Error(`Null not allowed: ${field.field}`);
    return value;
  }
  if (field.type === 'text') {
    if (typeof value !== 'string') throw new Error(`Expected text: ${field.field}`);
    if (field.required && !value.trim()) throw new Error(`Required field: ${field.field}`);
    return field.trim ? value.trim() : value;
  }
  if (field.type === 'boolean') {
    if (typeof value !== 'boolean') throw new Error(`Expected boolean: ${field.field}`);
    return value;
  }
  if (field.type === 'number') {
    if ((typeof value !== 'number' && typeof value !== 'string') ||
        (typeof value === 'string' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) ||
        !Number.isFinite(Number(value))) throw new Error(`Expected finite number: ${field.field}`);
    return Number(value);
  }
  // Date-only fields are explicitly declared, never inferred from an arbitrary timestamp.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) {
    throw new Error(`Expected ISO date: ${field.field}`);
  }
  const day = value.slice(0, 10);
  const parsed = new Date(day + 'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day || !Number.isFinite(Date.parse(value))) {
    throw new Error(`Invalid date: ${field.field}`);
  }
  return day;
}

/** Pure, opt-in wiring compiler. No layout, queries, records or business rules are mutated here. */
export function generateEditContract(input: EditContractInput) {
  const spec = editContractSchema.parse(input);
  for (const key of ['field', 'component'] as const) {
    if (new Set(spec.fields.map(f => f[key])).size !== spec.fields.length) throw new Error(`Duplicate ${key} in edit contract`);
  }
  if (spec.fields.some(f => f.field === spec.id_field)) throw new Error('The stable primary key cannot be edited');
  if (spec.fields.some(f => f.required && f.nullable)) throw new Error('A required field cannot be nullable');
  for (const f of spec.fields) if (f.choices) {
    if (!['text','number'].includes(f.type)) throw new Error('Choices require a text or number field');
    if (Array.isArray(f.choices)) {
      if (f.choices.some(o=>typeof o.value !== (f.type==='text'?'string':'number'))) throw new Error('Choice values must match field type');
      if (new Set(f.choices.map(o=>o.value)).size!==f.choices.length) throw new Error('Duplicate choice value');
    }
  }
  const snapshot = `${spec.prefix}Snapshot`, draft = `${spec.prefix}Draft`;
  const openName = `${spec.prefix}Open`, prepareName = `${spec.prefix}Prepare`;
  const q = JSON.stringify;
  const helpers = `const canonical = ${canonical.toString()};\nconst fields = ${q(spec.fields)};\nconst own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);\n`;
  const openCode = helpers + `await actions.setVariable(${q(snapshot)}, null);
await actions.setVariable(${q(draft)}, null);
const selection = components.${spec.table_component}.selectedRow;
const id = selection && selection[${q(spec.id_field)}];
if ((typeof id !== 'string' && typeof id !== 'number') || id === '' || (typeof id === 'number' && !Number.isFinite(id))) throw new Error('Select a record first');
const rows = queries.${spec.source_query}.data;
if (!Array.isArray(rows)) throw new Error('Raw records are not loaded');
const matches = rows.filter(r => r && own(r, ${q(spec.id_field)}) && r[${q(spec.id_field)}] === id);
if (matches.length !== 1) throw new Error('Expected exactly one raw record for the selected ID');
const values = {};
for (const field of fields) {
  if (!own(matches[0], field.field)) throw new Error('Raw record omits: ' + field.field);
  // Existing incomplete records must be openable for correction. Validate required
  // values on Prepare, not before the user can edit them.
  values[field.field] = canonical(matches[0][field.field], { ...field, required: false, nullable: true });
}
await actions.setVariable(${q(snapshot)}, { id, values });
return { id };`;
  const prepareCode = helpers + `const snapshot = variables.${snapshot};
const draft = variables.${draft};
const selection = components.${spec.table_component}.selectedRow;
if (!snapshot || !selection || selection[${q(spec.id_field)}] !== snapshot.id) throw new Error('Reopen the selected record before saving');
if (draft && draft.id !== snapshot.id) throw new Error('Draft belongs to another record');
const changes = draft ? draft.values : {};
if (!changes || typeof changes !== 'object' || Array.isArray(changes)) throw new Error('Invalid draft');
const patch = {};
for (const key of Object.keys(changes)) if (!fields.some(f => f.field === key)) throw new Error('Unknown draft field: ' + key);
for (const field of fields) {
  if (!own(snapshot.values, field.field)) throw new Error('Incomplete edit snapshot');
  if (!own(changes, field.field)) {
    canonical(snapshot.values[field.field], field);
    continue;
  }
  const raw = changes[field.field];
  let value = canonical(raw, field);
  if (value === '' && field.type !== 'text') value = null;
  if (value === '' || value === null) {
    if (!field.nullable) throw new Error('Clearing is not allowed: ' + field.field);
    value = null;
  }
  if (value !== snapshot.values[field.field]) patch[field.field] = value;
}
return { id: snapshot.id, patch, changed: Object.keys(patch).length > 0 };`;
  const inputs = spec.fields.map(f => {
    const type = f.choices ? 'DropdownV2' : { text: 'TextInput', number: 'NumberInput', date_only: 'DatePickerV2', boolean: 'Checkbox' }[f.type];
    const initialKey = f.choices ? 'schema' : ['date_only', 'boolean'].includes(f.type) ? 'defaultValue' : 'value';
    const exposed = f.type === 'date_only' ? 'selectedDate' : 'value';
    const trigger = f.choices || f.type === 'date_only' ? 'onSelect' : 'onChange';
    const schema = getComponentSchema(type);
    if (!schema?.properties.some(p => p.key === initialKey) || !schema.events?.some(e => e.id === trigger)) throw new Error(`Unsupported edit adapter: ${type}`);
    const initial = `variables.${snapshot} && variables.${snapshot}.values[${q(f.field)}]`;
    let value = `{{${initial} != null ? variables.${snapshot}.values[${q(f.field)}] : ${f.type === 'boolean' ? 'false' : "''"}}}`;
    if (f.choices) {
      const options = Array.isArray(f.choices) ? q(f.choices)
        : `(queries.${f.choices.query}.data || []).map(r=>({label:r[${q(f.choices.label_field)}],value:r[${q(f.choices.value_field)}]}))`;
      value = `{{(${options}).map(option=>({label:option.label,value:option.value,visible:true,default:!!variables.${snapshot} && option.value === variables.${snapshot}.values[${q(f.field)}]}))}}`;
    }
    const exposedValue = `components.${f.component}.${exposed}`;
    const changedValue = f.choices && f.nullable ? `(${exposedValue} == null ? null : ${exposedValue})` : exposedValue;
    const draftValue = `{{({id:variables.${snapshot}.id,values:Object.assign({},variables.${draft} && variables.${draft}.id === variables.${snapshot}.id ? variables.${draft}.values : {},{${q(f.field)}:${changedValue}})})}}`;
    return {
      name: f.component, type,
      properties: { [initialKey]: value, ...(f.choices ? {advanced:'{{true}}',showClearBtn:f.nullable} : {}), ...(f.type === 'date_only' ? {dateFormat: 'YYYY-MM-DD'} : {}) },
      validation: { mandatory: f.required },
      events: [{ source_ref: f.component, source_type: 'component', trigger, action: {
        actionId: 'set-custom-variable', key: draft, value: draftValue,
        runOnlyIf: `{{!!variables.${snapshot}}}`,
      } }],
    };
  });
  return {
    queries: [
      { name: openName, kind: 'runjs', options: { code: openCode } },
      { name: prepareName, kind: 'runjs', options: { code: prepareCode } },
    ],
    inputs,
    mutation_contract: {
      id: `{{queries.${prepareName}.data.id}}`, patch: `{{queries.${prepareName}.data.patch}}`,
      runOnlyIf: `{{queries.${prepareName}.data && queries.${prepareName}.data.changed === true}}`,
    },
    wiring: [
      `Run ${openName} on Edit; open the editor only on its success. Merge the returned input properties and change events into your native layout. Never use display selectedRow fields as defaults.`,
      `Run ${prepareName} on Save; run a datasource-specific PATCH/update ONLY on its success and with mutation_contract.runOnlyIf. No change means no write. Bind the ID and patch from mutation_contract; never expand missing patch keys to null or empty strings.`,
      'Gate Save while open/prepare/write are loading. Preserve the editor on failure. Refresh affected queries and close/reset only after the actual mutation succeeds; refresh actions are not assumed to complete in order.',
    ],
    limitations: [
      'Requires an already-loaded bounded raw row array and a single stable scalar ID. This generates wiring only; it does not create resources or persist data.',
      'Only text, finite number, ISO date-only and boolean fields are covered; text/number fields can opt into dropdown choices. Required/nullable/trim are explicit opt-ins; domain constraints, authorization and optimistic concurrency must be enforced separately.',
      'Dropdown option queries must already return bounded raw arrays with matching ID types and include the current value, including inactive owners when necessary. Missing options are not permission to clear stored relationships. Validate membership/authorization separately; this helper does not create or execute option queries.',
      'Draft tracks native change events, not every displayed input value. Programmatic field changes must update the draft explicitly. Browser-verify that all change events fire, including both checkbox transitions.',
    ],
  };
}
