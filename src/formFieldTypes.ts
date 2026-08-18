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

