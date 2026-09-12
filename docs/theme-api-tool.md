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

**Licence gate.** Custom themes are a licensed feature. When `manage_theme` create returns `licensed: false`
(the instance answered HTTP 451), the app stays on the workspace default theme: do not retry under another name
or guess a theme id, build on the default, and repeat the result's `user_message` to the user in the closing
handoff so they know their plan does not include custom themes and that upgrading enables them.

## Derive a theme from the request (do this before `create_app`)

The user does not have to ask for a theme. If the request says who the app is for, the customer has an expectation
about how it should look, and the standard theme is only the answer when nothing in the request points anywhere.
Read the request for cues, in this order of strength, and derive a theme when any of them is present:

1. **A named brand or pasted design system** — use its real colours (a supplied design file, a well-known brand
   palette, a logo colour the user quotes). Name the theme after the brand.
2. **A colour, plant, material or place in the name** — Aloe, Sage, Olive, Indigo, Coral, Amber, Saffron, Slate,
   Ocean, Terra, Rose: the customer chose that word, so the primary comes from it (a deep, contrast-safe shade of
   that colour: Aloe or Sage → a muted green such as `#3F6B4A`; Indigo → `#3730A3`; Amber or Saffron → a dark
   `#B45309`), and the industry row below supplies only the neutrals, radii and accent logic. Never let a row's
   sample hex override a colour the name already states.
3. **An industry or business type** — pick one palette from the menu below. Its "leans toward" column is a
   hint, not a lookup: the customer's name, industry and wording steer the choice, and similar prompts should
   not land on the same row by reflex. Name the theme after the customer ("Bernal Fire Pizza", "Northline Clinic").
4. **An audience or scale word** — "enterprise", "bank", "government", "startup", "kids" — shifts the archetype
   toward conservative or playful.

Nothing in the request → standard theme. Do not ask the user which they prefer; derive, apply, and say in the
handoff which cue you used so they can redirect in one line.

**Then read who uses it.** Industry sets the palette; the use case sets how much of the archetype to apply.
Decide one of three before building the definition:

- **Staff tool** (back office, front desk, kitchen, warehouse, ops, admin, "internal tool" with no customer in
  the room): keep the standard **8 / 6 / 12 radii** and density, take the archetype's primary, accent and canvas
  tint, and shift the neutrals to the primary's temperature (below). Dense screens need contrast and speed more
  than atmosphere, so the neutrals move a little, not the radii.
- **Customer-facing** (booking, ordering, portal, kiosk, anything a guest or shopper sees): apply the full row,
  including its radii, and derive the whole palette: neutrals, second surface and status colours (below).
- **Executive reporting** (board pack, KPI review, investor view): use the enterprise row's neutrals and radii
  with the industry's accent for charts.

When the request does not say, an "operations", "management" or "tracking" app is a staff tool.

**How to derive.** A theme is a palette, not a primary swap. A rose primary on the standard grey borders, black
text and white cards reads as the standard theme with one button recoloured; the neutrals are what make a page
feel designed for its customer. Derive all of these from the primary:

- `brand.primary` from the row; the **accent** as described below; `secondary` = the ink colour; `tertiary` =
  the muted text colour.
- **Neutrals follow the primary's temperature.** Ink, muted text, borders, canvas and the surfaces are tinted
  toward the primary's hue at very low saturation, never the standard pure greys next to a warm or cool primary.
  Worked sets to start from (light values; dark values are the standard dark scale unless the row says otherwise):

  | Temperature | Ink `text.primary` | Muted `text.placeholder` | Border default / weak | Canvas `appBackground` | Surface1 / Surface2 |
  | --- | --- | --- | --- | --- | --- |
  | Warm (rose, plum, brick, terracotta, bronze, brown) | `#2B1E22` | `#8A737A` | `#E3D4CE` / `#EEE4DF` | `#F7F1ED` | `#FFFCFA` / `#F1E6E1` |
  | Cool (navy, royal, teal, steel, indigo, forest) | `#0F172A` | `#64748B` | `#E2E8F0` / `#F1F5F9` | `#F8FAFC` | `#FFFFFF` / `#F1F5F9` |
  | Neutral (charcoal, standard blue) | `#111827` | `#6B7280` | `#E5E7EB` / `#F3F4F6` | `#F9FAFB` | `#FFFFFF` / `#F3F4F6` |

  Shift each set toward the actual primary (a plum primary lifts the warm set toward violet; a teal one cools the
  cool set toward green). `surface2` is the tinted panel surface for side rails, notes and highlighted rows.
- **Status colours desaturate on premium rows** (beauty, hospitality, luxury, restaurant): success `#47705A`,
  warning `#9A6A32`, error `#A13D4E`, so a status column does not shout on a soft page. Everywhere else they stay
  standard, except the shifts in the notes column.
- The primary must keep white text readable (contrast ≥ 4.5:1), must not collide with the status colours (no pure
  red, amber or green primaries), and the dark-mode primary is a lighter tint of the same hue.

**The accent is not a theme token; it is the colour the build uses wherever the skill's visual defaults say
"the theme accent"**: chart series, the informational state in status columns (Booked, Confirmed, New, In
progress), links, and the highlighted figure in a KPI card. Buttons and inputs take the primary from the theme.
For blue primaries the accent is the primary. For a near-black, brown or grey primary the accent is what gives
the app a colour at all, so never leave it as the standard blue.

| Palette | Primary (light / dark) | Accent | Canvas | Radius | Leans toward |
| --- | --- | --- | --- | --- | --- |
| Ink | `#111827` / `#F9FAFB` | `#B45309` amber | `#FAFAF9` warm | 6 / 4 / 10 | Operations, manufacturing, logistics, field work, dense internal tools |
| Slate | `#334155` / `#CBD5E1` | `#0369A1` sky | `#F8FAFC` cool | 6 / 4 / 10 | Real estate, architecture, professional services, reporting |
| Navy | `#1E3A8A` / `#60A5FA` | `#2563EB` | `#F8FAFC` cool | 6 / 4 / 10 | Banks, insurers, government, legal, large enterprise |
| Blue | `#2563EB` / `#3B82F6` | `#2563EB` | `#F9FAFB` | 8 / 6 / 12 | SaaS, developer tools, startups; the standard theme already fits |
| Indigo | `#4F46E5` / `#818CF8` | `#6366F1` | `#FAFAFF` | 10 / 6 / 14 | Education, community, product and design teams, nonprofits |
| Emerald | `#047857` / `#34D399` | `#047857` | `#F7FAF8` | 8 / 6 / 12 | Healthcare, wellness, sustainability, agriculture; success stays green |
| Graphite | `#292524` / `#E7E5E4` | `#C2410C` terracotta | `#FAF8F5` warm | 10 / 6 / 14 | Food, hospitality, retail, crafts, boutique brands: warm without being loud |

Every primary and accent reads as text on white at 4.5:1 or better (the accents also carry figures and links, so they are the 700 steps, not the brighter 500s that fail as text). Every row is a mid-to-deep colour on a near-white canvas: the palettes people see in well-made products in
2026 and that nobody objects to. Nothing neon, pastel, muted teal, steel, purple, rose or brick as a primary;
a bold brand colour enters only through cue 1 (the customer's own brand) or cue 2 (a colour in the name).
The menu is deliberately without teal or steel: a muted teal primary on a large surface reads as dated admin
software, and on 2026-09-12 nine of sixteen generated apps had landed on the same two teals because an
industry lookup handed them out. When two rows fit, prefer the one the customer's own words point to. When nothing points anywhere, the
kind of tool decides, and the answer is not Ink by reflex (seven of ten apps in one round came out Ink):
a warehouse, production, dispatch or field tool is Ink; an admin console, developer or IT tool is Slate;
finance, insurance, legal or public sector is Navy; a CRM, help desk, ticketing or any SaaS-shaped tool is
Blue; education, community or a personal tool such as a to-do list is Indigo; health, wellness, food safety
or agriculture is Emerald; food, hospitality, retail or crafts is Graphite. Never invent a customer name or
brand to justify a colour: a prompt with no customer gets the menu row for its kind of tool, nothing more.

**Beyond the menu: how to build a palette from what the prompt gives.** The menu is the fallback; a prompt that
names a brand colour, a material, a place, a mood or an audience deserves its own palette, built the same way
every row of the menu was built:

1. **Primary**: one hue, mid-to-deep lightness (dark enough to carry white text at 4.5:1 contrast on a filled
   button; roughly Tailwind's 600 to 800 step). Take it from the brand hex if given, from the named thing
   otherwise (Sage → `#4D7C5B`, Cobalt → `#1E40AF`, Coral → `#C2410C` rather than a neon coral, Charcoal →
   `#1F2937`, Forest → `#166534`, Cocoa → `#78350F`). Saturated brights, pastels, neon, muted teal and steel are
   never a primary; if the customer's colour is one of those, keep it for the accent and pick the nearest deep
   hue from the menu as the primary.
2. **Accent**: the one place colour is allowed to be lively. On a dark or neutral primary (ink, slate, graphite,
   charcoal) it is a warm complement (amber, terracotta, sky); on a coloured primary it is the primary itself or a
   step lighter. Never a second unrelated hue.
3. **Canvas and surfaces**: near-white, tinted 2 to 4 percent toward the primary's temperature (warm hues get
   `#FAF8F5`-like canvases, cool hues `#F8FAFC`), cards pure white, a second surface one step darker, borders
   one step darker again. Text is the primary's hue at near-black lightness, muted text the same hue at mid grey.
4. **Status colours stay semantic**: success green, warning amber, error red, at the same lightness as the
   primary so no one of them shouts. A brand whose primary is green or red keeps its status colours anyway and
   shifts them slightly in hue so they stay distinguishable.
5. **Chip tints** for tables: the status hue at very light lightness for the fill (`#DCFCE7`-like) and the
   same hue at deep lightness for the ink (`#166534`-like); a neutral chip is the text hue at those two steps.
6. **Check contrast** before writing the theme: primary on white and white on primary at least 4.5:1, muted text
   on canvas at least 4.5:1, chip ink on chip tint at least 4.5:1, borders at least 1.5:1 against the canvas.
   Never carry meaning by colour alone; a chip also has its label.

Then read the prompt one more time: a mood word ("calm", "premium", "playful", "serious"), an audience
("kids", "bank", "government") or a scale word shifts the primary's lightness and the radii, never the rules
above. Say in the handoff which cue produced the palette so the customer can redirect in one line.

**Colour usage, whichever palette.** The primary appears in the one filled button per view, the active
navigation item, focus rings, link text and the lead figure of a KPI strip. It never fills a KPI tile, a card
background or a header band; every tile is the same white card with a hairline border. A filled statement
band exists only for requests with feel words (the signature section below). Status chips take the tint map,
charts take the accent series, and the rest of the page is neutrals.

Build the definition from the standard theme in `data/default-theme.json`, override it with the row, the neutral
set and the status rule above according to the use case, and pass it as
`create_app({ name, theme: { name: "<Customer> theme", definition } })`. For the app itself, follow the same
visual defaults as always: they read the theme through the `--cc-*` tokens (text, muted, border, surfaces,
status), so a derived theme flows into every Html block and style without further work; only the accent is a
literal colour, substituted wherever the defaults name it. Say in the handoff which row and which use case you
applied, in one line.

#### Signature: what the request's own words add

The archetype sets the palette. How much presence the page gets is set by the wording of the request, so read
it for that too, and let what is absent count as much as what is present:

- **No feel words** ("ops", "tracking", "admin", "internal", a plain list of features), even when a brand or an
  industry is named: the name sets the palette and nothing else. Build the standard skeleton on the derived
  palette with a plain-title or toolbar header and stop. Restraint is the correct reading of a plain request,
  and a named brand is not a request for a hero band.
- **Feel words** ("beautiful", "premium", "luxury", "elegant", "modern", "not like a spreadsheet", "for our
  clients"), a pasted design system, or a customer-facing use case with the customer in the room: the request
  is telling you the page must carry an identity. Add a signature layer on top of the skeleton.

A signature layer is two or three deliberate moves, chosen for this customer and written into the design brief
(`references/ui-layout.md`, Frame the page) with the word in the request that earned each one. Never all of
them, and never the set you used last time: if the brief for a spa reads like the brief for an airline, one of
them is wrong. Each move is display-only `Html` on the theme tokens; everything interactive stays native. The
kinds of move, with the kind of request each fits:

- **A header with presence**: the masthead or the statement band from the header treatments, on the home page
  only. A luxury or consumer brand earns the band; a clinic, a bank or a school earns the masthead.
- **The figure the business runs on emphasised** in the KPI strip: an inverted brand-fill card or a wider
  column for the one number the request says they watch, never the first tile by default.
- **A side rail on `surface2`** with the thing this user looks at next, drawn from their world (a clinic: the
  next appointments; a hotel: today's arrivals; a fleet desk: aircraft on ground) plus a short house note.
- **Section headings as `Html`** with a sub line, when the sections need explaining; plain Text headings
  otherwise.
- **A softer table**: weak borders, generous row height, status in colour only, for a page a guest or client
  sees.
- **A brand element** the request supplies: a monogram or initials, a house colour rule, a tagline in their
  words.

Derive the content of each move from the request and the data, not from this list: the rail shows what that
customer waits for, the emphasised figure is the one they named, the tagline is theirs. If nothing in the
request tells you what that is, leave the move out rather than fill it with filler.

The standard theme's tokens, for reference when choosing literal colours that must match it:

| Role | Light | Dark |
| --- | --- | --- |
| Primary (`--cc-primary-brand`) | `#2563EB` | `#3B82F6` |
| Text (`--cc-primary-text`) | `#111827` | `#F9FAFB` |
| Muted text (`--cc-placeholder-text`) | `#6B7280` | `#9CA3AF` |
| Border (`--cc-default-border`) / weak (`--cc-weak-border`) | `#E5E7EB` / `#F3F4F6` | `#374151` / `#1F2937` |
| App background (`--cc-appBackground-surface`) | `#F9FAFB` | `#111827` |
| Surface 1 (`--cc-surface1-surface`, cards, modals) / Surface 2 (`--cc-surface2-surface`, tinted panels) | `#FFFFFF` / `#F3F4F6` | `#1F2937` / `#111827` |
| Success / warning / error (`--cc-success-systemStatus`, `--cc-error-systemStatus`) | `#16A34A` / `#D97706` / `#DC2626` | `#4ADE80` / `#FBBF24` / `#F87171` |
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

