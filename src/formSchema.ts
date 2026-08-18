import type { SchemaColumn } from './tooljetClient.js';

export type FormMode = 'create' | 'edit';

export interface FormSchemaOptions {
  tableName: string;
  mode: FormMode;
  title?: string;
  submitLabel?: string;
  include?: string[];
  exclude?: string[];
  /** ToolJet expression without {{ }}, e.g. components.ordersTable.selectedRow or variables.selectedOrder. */
  initialValuesBinding?: string;
}

const humanize = (name: string): string =>
  name
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function formType(databaseType: string): string {
  const type = databaseType.toLowerCase();
  if (type.includes('bool')) return 'checkbox';
  if (type.includes('timestamp') || type === 'date') return 'datepicker';
  if (type.includes('int') || type.includes('numeric') || type.includes('decimal') || type.includes('double')) {
    return 'number';
  }
  if (type.includes('json')) return 'textarea';
  return 'textinput';
}

function bindingValue(prefix: string, column: SchemaColumn): string {
  const access = `${prefix}[${JSON.stringify(column.name)}]`;
  return column.type.toLowerCase().includes('json') ? `{{JSON.stringify(${access})}}` : `{{${access}}}`;
}

export function generateFormSchema(columns: SchemaColumn[], options: FormSchemaOptions) {
  const include = options.include ? new Set(options.include) : null;
  const exclude = new Set(options.exclude ?? []);
  const omitted: Array<{ name: string; reason: string }> = [];
  const selected = columns.filter((column) => {
    if (include && !include.has(column.name)) return false;
    if (exclude.has(column.name)) return false;
    if (options.mode === 'create' && column.type.toLowerCase() === 'serial') {
      omitted.push({ name: column.name, reason: 'generated serial column omitted from create form' });
      return false;
    }
    return true;
  });

  const fields = Object.fromEntries(
    selected.map((column) => {
      const type = formType(column.type);
      const field: Record<string, unknown> = { type, label: humanize(column.name) };
      if (type === 'datepicker') Object.assign(field, { enableDate: true, enableTime: true });
      if (options.mode === 'edit' && column.isPrimaryKey) field.styles = { disabled: true };
      if (options.initialValuesBinding) {
        field.value = bindingValue(options.initialValuesBinding, column);
      } else if (options.mode === 'create' && column.defaultValue !== undefined) {
        if (column.type.toLowerCase().includes('json')) field.value = JSON.stringify(column.defaultValue);
        else if (column.defaultValue === 0 || column.defaultValue === false) field.value = `{{${JSON.stringify(column.defaultValue)}}}`;
        else field.value = column.defaultValue;
      }
      return [column.name, field];
    })
  );

  const schema = {
    title: options.title ?? `${options.mode === 'create' ? 'Create' : 'Edit'} ${humanize(options.tableName)}`,
    properties: fields,
    submitButton: { value: options.submitLabel ?? (options.mode === 'create' ? 'Create' : 'Save changes') },
  };

  return {
    properties: {
      generateFormFrom: { value: 'jsonSchema' },
      newJsonSchema: { value: schema },
      validateOnSubmit: { value: '{{true}}' },
      // Reset only from the mutation query's onDataQuerySuccess event, so failed writes preserve input.
      resetOnSubmit: { value: '{{false}}' },
      showHeader: { value: '{{true}}' },
      showFooter: { value: '{{true}}' },
    },
    schema,
    field_metadata: selected.map((column) => ({
      name: column.name,
      database_type: column.type,
      required: column.isNotNull,
      unique: column.isUnique,
      primary_key: column.isPrimaryKey,
      default_value: column.defaultValue,
      foreign_keys: column.foreignKeys,
    })),
    omitted_fields: omitted,
    notes: [
      'Pass `properties` directly to add_component(s) for a Form.',
      'ToolJet generated-form schemas do not automatically enforce database NOT NULL/UNIQUE constraints; add supported client validation and keep database constraints authoritative.',
      'Replace foreign-key fields with dropdown schema/options backed by a lookup query when users should select related rows.',
    ],
  };
}
