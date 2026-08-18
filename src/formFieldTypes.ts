export const FORM_SCHEMA_FIELD_TYPES = [
  'textinput',
  'textarea',
  'dropdown',
  'multiselect',
  'number',
  'emailinput',
  'password',
  'datepicker',
  'checkbox',
  'radio',
  'toggle',
  'starrating',
  'filepicker',
] as const;

export const FORM_SCHEMA_FIELD_TYPE_SET = new Set<string>(FORM_SCHEMA_FIELD_TYPES);

/** Generated Form fields whose current FormUtils adapters render predictably enough to ship.
 * Any other supported type should be authored as a standalone component so alignment, label,
 * height, and validation remain controllable. */
export const SAFE_GENERATED_FORM_FIELD_TYPES = [
  'textinput',
  'number',
  'emailinput',
  'password',
  'datepicker',
  'checkbox',
] as const;

export const SAFE_GENERATED_FORM_FIELD_TYPE_SET = new Set<string>(SAFE_GENERATED_FORM_FIELD_TYPES);
