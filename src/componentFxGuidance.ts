export const COMPONENT_FX_GUIDANCE =
  'For properties/styles with an FX toggle, use `{ value: <expression>, fxActive: true }` for bindings/conditions/calculations ' +
  'the normal control cannot represent (e.g. visibility, disable, loading). Table column/button expressions instead add ' +
  'the field name to that object\'s `fxActiveFields`. Keep built-in defaults and static panel-editable values (including ' +
  '`{{true}}`/`{{false}}`, numbers, selections, colors) out of FX. When reverting to a constant, explicitly set ' +
  '`fxActive: false` or remove that field from `fxActiveFields`; preserve other flags. ';
