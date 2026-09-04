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

## The standard theme (applied by default)

`create_app` applies the skill's standard theme, **"ToolJet Modern"**, to every new app unless told otherwise. It is
created once per workspace (matched by name, from `data/default-theme.json`) and is never set as the workspace
default, so hand-built apps are unaffected. The result of `create_app` reports `theme.mode` and any `theme.warning`;
if the theme could not be created (for example a licence gate on custom themes) the app is on the workspace default
and the handoff should say so.

- Pass `create_app({ theme: "workspace_default" })` when the user wants the workspace default, or an existing theme
  name/id to reuse one, or `theme: { name, definition }` to create (once, by name) and apply a derived theme.
- Never call `set_default`, rename, or delete a theme unless the user asks for exactly that.

## When theming applies

Theming is part of building an app from scratch, and of nothing else.

- **New app** (you call `create_app`, or a host hands you an empty shell with a single blank page): derive and
  apply the theme as described below. For an empty shell there is no `create_app` call, so create the theme with
  `manage_theme` (by name, reusing one of that name if it exists) and apply it with `update_app_settings` before
  the first phase.
- **Design request on an existing app** (the message is about theme, colours, palette, branding, fonts, corner
  radius, "make it look like a spa", "match our brand"): change the theme and styling as asked, and nothing else.
- **Any other change to an existing app** (pages, components, queries, data, behaviour, text, defects): do not
  create, change or apply a theme, do not touch app settings, and style what you add to match what is already
  there. The app's current theme is the user's decision, not yours.

## Derive a theme from the request (do this before `create_app`)

The user does not have to ask for a theme. If the request says who the app is for, the customer has an expectation
about how it should look, and the standard theme is only the answer when nothing in the request points anywhere.
Read the request for cues, in this order of strength, and derive a theme when any of them is present:

1. **A named brand or pasted design system** — use its real colours (a supplied design file, a well-known brand
   palette, a logo colour the user quotes). Name the theme after the brand.
2. **An industry or business type** — pick the archetype below. Name the theme after the customer
   ("Bernal Fire Pizza", "Northline Clinic").
3. **An audience or scale word** — "enterprise", "bank", "government", "startup", "kids" — shifts the archetype
   toward conservative or playful.

Nothing in the request → standard theme. Do not ask the user which they prefer; derive, apply, and say in the
handoff which cue you used so they can redirect in one line.

**Then read who uses it.** Industry sets the palette; the use case sets how much of the archetype to apply.
Decide one of three before building the definition:

- **Staff tool** (back office, front desk, kitchen, warehouse, ops, admin, "internal tool" with no customer in
  the room): keep the standard theme's grey scale, borders, surfaces and **8 / 6 / 12 radii**. Take only the
  archetype's primary, accent and canvas tint. Dense screens need contrast and speed more than atmosphere.
- **Customer-facing** (booking, ordering, portal, kiosk, anything a guest or shopper sees): apply the full row,
  including its radii and any warm ink.
- **Executive reporting** (board pack, KPI review, investor view): use the enterprise row's neutrals and radii
  with the industry's accent for charts.

When the request does not say, an "operations", "management" or "tracking" app is a staff tool.

**How to derive.** Change as little as possible from the standard theme. Keep its grey scale, border weights,
status colours and surfaces unless the row says otherwise; swap `brand.primary`, pick the **accent**, and only
for customer-facing apps also take the canvas tint and radius scale. The primary must keep white text readable
(contrast ≥ 4.5:1), must not collide with the status colours (no pure red, amber or green primaries), and the
dark-mode primary is a lighter tint of the same hue. Compute `secondary` as the ink colour and `tertiary` as the
muted text colour.

**The accent is not a theme token; it is the colour the build uses wherever the skill's visual defaults say
"the theme accent"**: chart series, the informational state in status columns (Booked, Confirmed, New, In
progress), links, and the highlighted figure in a KPI card. Buttons and inputs take the primary from the theme.
For blue primaries the accent is the primary. For a near-black, brown or grey primary the accent is what gives
the app a colour at all, so never leave it as the standard blue.

| Cue in the request | Primary (light / dark) | Accent | Canvas | Radius | Notes |
| --- | --- | --- | --- | --- | --- |
| Large enterprise, bank, insurer, government, legal | `#1E40AF` / `#60A5FA` navy | `#1D4ED8` | `#F8FAFC` cool | 6 / 4 / 10 | Conservative, denser; nothing warm |
| SaaS, developer tools, startup | `#2563EB` / `#3B82F6` (standard) | `#2563EB` | `#F9FAFB` | 8 / 6 / 12 | The standard theme already fits |
| Healthcare, clinic, dental, pharmacy | `#0F766E` / `#2DD4BF` teal | `#0D9488` | `#F7FAFA` | 8 / 6 / 12 | Calm, clinical; success stays green |
| Beauty, spa, salon, wellness, boutique | `#BE185D` / `#F472B6` rose or `#7C3AED` plum | `#DB2777` (rose) or `#8B5CF6` (plum) | `#FBF7F5` warm ivory | 12 / 8 / 16 | Softer corners, warm neutrals `#1F1A1C` ink |
| Restaurant, pizza, bakery, café, bar | `#B91C1C` brick or `#C2410C` terracotta / `#F87171` | `#C2410C` | `#FAF7F2` warm | 10 / 6 / 14 | Warm ink `#1C1917`; keep error red darker `#991B1B` to stay distinct |
| Consumer brand, soda, snacks, apparel, retail | The brand's own hue at full saturation, e.g. `#DC2626`→ use `#C81E1E` / `#F87171` | the same hue | `#FFFFFF` | 12 / 8 / 16 | Bolder primary is expected here; still one accent only |
| Outdoors, sports, cycling, fitness | `#15803D` forest or `#0369A1` deep sky / lighter tints | `#0369A1` (with forest) or `#15803D` (with sky) | `#F8FAF8` | 8 / 6 / 12 | Success shifts to `#22C55E` so it differs from a green primary |
| Logistics, manufacturing, field ops, energy | `#EA580C` safety orange or `#0E7490` steel / lighter tints | `#0E7490` (with orange) or `#EA580C` (with steel) | `#F8FAFC` | 6 / 4 / 10 | Warning shifts to `#B45309` if the primary is orange |
| Finance, fintech, accounting | `#1D4ED8` royal or `#065F46` money green / lighter tints | `#1D4ED8` | `#F8FAFC` | 6 / 4 / 10 | Dense tables; keep borders `#E5E7EB` |
| Education, kids, nonprofit, community | `#4F46E5` indigo or `#0891B2` cyan / lighter tints | `#0891B2` (with indigo) or `#4F46E5` (with cyan) | `#FAFAFF` | 12 / 8 / 16 | Friendlier corners; never garish |
| Real estate, hospitality, luxury | `#1F2937` charcoal or `#78350F` bronze / `#D6D3D1` | `#B45309` bronze | `#FAF9F7` | 4 / 4 / 8 | Near-black primary is the one case where it reads as intended; the accent carries charts and states |

Build the definition from the standard theme in `data/default-theme.json`, override the rows above according to
the use case, and pass it as `create_app({ name, theme: { name: "<Customer> theme", definition } })`. For the
app itself, follow the same visual defaults as always with the accent substituted wherever they name it; the
success, warning and error colours and the muted grey stay standard unless the primary is one of those hues, in
which case pick the shifted status colour from the notes column. Say in the handoff which row and which use case
you applied, in one line.

The standard theme's tokens, for reference when choosing literal colours that must match it:

| Role | Light | Dark |
| --- | --- | --- |
| Primary (`--cc-primary-brand`) | `#2563EB` | `#3B82F6` |
| Text (`--cc-primary-text`) | `#111827` | `#F9FAFB` |
| Muted text (`--cc-placeholder-text`) | `#6B7280` | `#9CA3AF` |
| Border (`--cc-default-border`) | `#E5E7EB` | `#374151` |
| App background | `#F9FAFB` | `#111827` |
| Surface 1 (cards, modals) | `#FFFFFF` | `#1F2937` |
| Success / warning / error | `#16A34A` / `#D97706` / `#DC2626` | `#4ADE80` / `#FBBF24` / `#F87171` |
| Radius default / small / large | 8 / 6 / 12 | |

The theme's `text.font` is advisory: ToolJet instances render their configured UI font regardless.

## Styling components with a selected theme

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
