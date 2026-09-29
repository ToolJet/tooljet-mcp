export const COMPONENT_FX_GUIDANCE =
  'For properties/styles with an FX toggle, use `{ value: <expression>, fxActive: true }` for bindings/conditions/calculations ' +
  'the normal control cannot represent (e.g. visibility, disable, loading). Table column/button and KeyValuePair field expressions instead add ' +
  'the field name to that object\'s `fxActiveFields`. Keep built-in defaults and static panel-editable values (including ' +
  '`{{true}}`/`{{false}}`, numbers, selections, colors) out of FX. On updates, always send both `value` and `fxActive`; use ' +
  '`{ value: <constant>, fxActive: false }` when reverting. For nested Table fields, remove only ' +
  'the reverted field from `fxActiveFields`; preserve other flags. KeyValuePair arrays merge by index; verify flag removals ' +
  'and report any retained flags. ';
