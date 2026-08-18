import type { SchemaColumn } from './tooljetClient.js';
import { FORM_SCHEMA_FIELD_TYPE_SET } from './formFieldTypes.js';

export type FormMode = 'create' | 'edit';

export interface FormSchemaOptions {
  tableName: string;
  mode: FormMode;
  title?: string;
  submitLabel?: string;
  include?: string[];
  exclude?: string[];
  fieldOverrides?: Record<string, Record<string, unknown>>;
  /** ToolJet expression without {{ }}, e.g. components.ordersTable.selectedRow or variables.selectedOrder. */
  initialValuesBinding?: string;
}

const humanize = (name: string): string =>
  name
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function configuredChoices(column: SchemaColumn): unknown[] | undefined {
  for (const key of ['allowedValues', 'enumValues', 'values']) {
    const value = column.configurations?.[key];
    if (Array.isArray(value) && value.length > 0) return value;
  }
  return undefined;
}

function formType(column: SchemaColumn): string {
  const type = column.type.toLowerCase();
  const name = column.name.toLowerCase();
  if (configuredChoices(column)) return 'dropdown';
  if (type.includes('bool')) return 'checkbox';
  if (type.includes('timestamp') || type.includes('date')) return 'datepicker';
  if (type.includes('int') || type.includes('numeric') || type.includes('decimal') || type.includes('double')) {
    return 'number';
  }
  if (name.includes('email')) return 'emailinput';
  if (name.includes('password')) return 'password';
  if (type.includes('json') || type === 'text' || /(description|notes?|comments?|justification|details?|summary|message)/.test(name)) {
    return 'textarea';
  }
  return 'textinput';
}

function booleanDefault(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const match = value.trim().match(/^['"]?(true|false)['"]?(?:::[a-z\s]+)?$/i);
  return match ? match[1].toLowerCase() === 'true' : undefined;
}

function mergeField(base: Record<string, unknown>, override: Record<string, unknown> | undefined) {
  if (!override) return base;
  const merged = { ...base, ...override };
  for (const key of ['validation', 'styles']) {
    if (base[key] && override[key] && typeof base[key] === 'object' && typeof override[key] === 'object') {
      merged[key] = { ...(base[key] as Record<string, unknown>), ...(override[key] as Record<string, unknown>) };
    }
  }
  return merged;
}

function bindingValue(prefix: string, column: SchemaColumn): string {
  const access = `${prefix}[${JSON.stringify(column.name)}]`;
  return column.type.toLowerCase().includes('json') ? `{{JSON.stringify(${access})}}` : `{{${access}}}`;
}

export function generateFormSchema(columns: SchemaColumn[], options: FormSchemaOptions) {
  const exclude = new Set(options.exclude ?? []);
  const omitted: Array<{ name: string; reason: string }> = [];
  const byName = new Map(columns.map((column) => [column.name, column]));
  const seen = new Set<string>();
  const ordered = options.include
    ? options.include.flatMap((name) => {
        if (seen.has(name)) return [];
        seen.add(name);
        const column = byName.get(name);
        if (!column) omitted.push({ name, reason: 'requested include field not found in table schema' });
        return column ? [column] : [];
      })
    : columns;
  const selected = ordered.filter((column) => {
    if (exclude.has(column.name)) return false;
    if (options.mode === 'create' && column.type.toLowerCase() === 'serial') {
      omitted.push({ name: column.name, reason: 'generated serial column omitted from create form' });
      return false;
    }
    return true;
  });

  const fields = Object.fromEntries(
    selected.map((column) => {
      const type = formType(column);
      let field: Record<string, unknown> = { type, label: humanize(column.name) };
      const choices = configuredChoices(column);
      if (choices) Object.assign(field, { values: choices, displayValues: choices.map(String) });
      if (type === 'datepicker') Object.assign(field, { enableDate: true, enableTime: true });
      if (options.mode === 'edit' && column.isPrimaryKey) field.styles = { disabled: true };
      if (options.initialValuesBinding) {
        field.value = bindingValue(options.initialValuesBinding, column);
      } else if (options.mode === 'create' && column.defaultValue !== undefined) {
        if (column.type.toLowerCase().includes('json')) field.value = JSON.stringify(column.defaultValue);
        else if (type === 'checkbox' && booleanDefault(column.defaultValue) !== undefined) {
          field.value = `{{${String(booleanDefault(column.defaultValue))}}}`;
        } else if (column.defaultValue === 0) field.value = '{{0}}';
        else field.value = column.defaultValue;
      } else if (options.mode === 'create' && type === 'datepicker') {
        // ToolJet's generated Datepicker falls back to its demo date when the value is omitted/null.
        // An explicit binding keeps a new-form date field visually empty until the user selects one.
        field.value = '{{null}}';
      }
      field = mergeField(field, options.fieldOverrides?.[column.name]);
      const finalType = field.type;
      if (typeof finalType !== 'string' || !FORM_SCHEMA_FIELD_TYPE_SET.has(finalType)) {
        throw new Error(`Form field "${column.name}" has unsupported type "${String(finalType)}".`);
      }
      if (finalType === 'filepicker') {
        throw new Error(
          `Form field "${column.name}" cannot use type "filepicker": ToolJet crashes the entire Form. ` +
            'Use a standalone FilePicker component and read components.<picker>.file instead.'
        );
      }
      if (['dropdown', 'multiselect'].includes(finalType) && 'options' in field) {
        throw new Error(
          `Form field "${column.name}" uses "options", but Form dropdowns use "values" and "displayValues".`
        );
      }
      return [column.name, field];
    })
  );

  const schema = {
    title: options.title ?? `${options.mode === 'create' ? 'Create' : 'Edit'} ${humanize(options.tableName)}`,
    properties: fields,
    submitButton: { value: options.submitLabel ?? (options.mode === 'create' ? 'Create' : 'Save changes') },
  };

  // Generated Form fields render as stacked label/control rows. Returning the sizing estimate
  // with the schema prevents callers from guessing a Form height that clips the final field or
  // submit button, especially when the Form is nested in a ModalV2 scroll canvas.
  const recommendedCanvasHeight = Math.max(300, selected.length * 70);
  const recommendedFormHeight = recommendedCanvasHeight + 130;

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
      generated_type: (fields[column.name] as Record<string, unknown>).type,
      overridden: !!options.fieldOverrides?.[column.name],
    })),
    omitted_fields: omitted,
    layout_guidance: {
      field_count: selected.length,
      recommended_canvas_height_px: recommendedCanvasHeight,
      recommended_form_height_px: recommendedFormHeight,
      recommended_modal_height_px: recommendedFormHeight + 80,
      assumptions: 'Stacked fields at roughly 70px per row, 60px Form header/footer, 10px border slack, and modal padding/error slack.',
    },
    notes: [
      'Pass `properties` directly to add_component(s) for a Form.',
      'ToolJet generated-form schemas do not automatically enforce database NOT NULL/UNIQUE constraints; add supported client validation and keep database constraints authoritative.',
      'Replace foreign-key fields with dropdown values/displayValues backed by a lookup query when users should select related rows.',
      'The include array controls output field order. Use field_overrides for explicit textarea/dropdown/enum/label/validation tuning; Form dropdowns use values/displayValues, not options.',
      'Never place type:filepicker inside a generated Form; use a standalone FilePicker and read components.<picker>.file.',
      'FormUtils label rendering differs for TextArea and Dropdown fields; browser-check for a literal "Label" or duplicate labels and use standalone inputs when needed.',
      'When nesting this Form in ModalV2, use layout_guidance instead of guessing the Form/modal height; browser-check that the final field and submit button remain visible at maximum scroll.',
    ],
  };
}
