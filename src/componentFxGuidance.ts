export const COMPONENT_FX_GUIDANCE =
  'For properties/styles/validation with an FX toggle, use `{ value: <expression>, fxActive: true }` only for bindings/conditions/calculations ' +
  'the normal control cannot express. Keep defaults and panel-editable constants (including `{{true}}`/`{{false}}`, numbers, selections, colors) out of FX. ' +
  'For nested Table columns/buttons/options and KeyValuePair fields, add the property key (e.g. `columnVisibility`, `disableButton`, ' +
  '`fieldVisibility`, `isEditable`) to that object\'s `fxActiveFields`, preserving other entries. ';

export const COMPONENT_FX_UPDATE_GUIDANCE = COMPONENT_FX_GUIDANCE +
  'Updates must include both `value` and `fxActive`; revert with `{ value: <constant>, fxActive: false }`. ' +
  'For nested Table fields, remove only reverted property keys from `fxActiveFields`. KeyValuePair arrays merge by index; ' +
  'verify flag removals and report retained flags. ';
