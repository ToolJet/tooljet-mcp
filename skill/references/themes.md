# ToolJet theme API

Use `manage_theme` to manage workspace theme objects. The available actions are `list`, `create`, `set_default`,
`update_definition`, `rename`, and `delete`. Theme deletion requires `confirm:true` after the user approves the
exact theme. ToolJet still enforces the active workspace, permissions, validation, and license gates.

Creating a workspace theme does not apply it to an app. After creating or selecting a theme, call
`update_app_settings({ app_id, version_id, theme_id })` to apply it to that app's current editing version.

## Theme definition

A theme definition uses literal values and follows this structure:

```text
brand.colors
  primary:   { light, dark }
  secondary: { light, dark }  # optional
  tertiary:  { light, dark }  # optional

text
  font
  colors.primary:     { light, dark }
  colors.placeholder: { light, dark }  # optional
  colors.disabled:    { light, dark }  # optional

border
  radius: { default, small, large }
  colors.default:  { light, dark }
  colors.weak:     { light, dark }  # optional
  colors.disabled: { light, dark }  # optional

systemStatus.colors
  success: { light, dark }
  error:   { light, dark }  # optional
  warning: { light, dark }  # optional

surface.colors
  appBackground: { light, dark }
  surface1:      { light, dark }
  surface2:      { light, dark }
  surface3:      { light, dark }
```

Theme colors are normally hex values. The saved definition generates ToolJet's semantic `--cc-*` variables at
runtime; do not put CSS variable references inside the theme definition itself.

## Styling components with a selected theme

Themes are optional. Do not create a theme, change the workspace default, or replace an app's selected theme unless
the user asks for it.

When an app has a selected theme, preserve token-backed component defaults and use existing semantic variables for
repeated visual roles. Common tokens include:

- `var(--cc-primary-brand)`
- `var(--cc-primary-text)`
- `var(--cc-placeholder-text)`
- `var(--cc-default-border)`
- `var(--cc-weak-border)`
- `var(--cc-error-systemStatus)`
- `var(--cc-appBackground-surface)`
- `var(--cc-surface1-surface)`

Pass these as raw style values, for example
`styles.backgroundColor.value = "var(--cc-surface1-surface)"`; do not wrap them in `{{...}}` and do not invent
token names. Literal hex or RGB values remain appropriate for deliberate one-off accents, chart series, or contrast
corrections when no semantic token fits. Repeated foundational colors should remain token-backed so theme and
light/dark changes continue to propagate.

