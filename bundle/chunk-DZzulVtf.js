import { createRequire } from "node:module";
import { p as paintsDarkCanvasInLightMode, T as ToolJetHttpError, W as WORKSPACE_ACCESS_KEYS, a as WORKSPACE_PERMISSION_KEYS, w as workspaceAccessKeys } from "./chunk-0-6sjmM9.js";
import { o as ok, f as fail, i as exposeActions } from "./chunk-4n_covov.js";
import { z as libraryPins, A as defaultPack, B as savedComponentLibrary, C as COMPONENT_PACK_DESCRIPTION } from "./chunk-23CIdoFG.js";
import { ax as external_exports } from "./chunk-DtQIWAeP.js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { j as union, A as string, V as number, a7 as looseObject, U as object, a8 as literal, i as unknown, ax as _enum, aU as array, ai as intersection, K as record, aQ as boolean, N as preprocess, T as optional, ae as iso_exports, aD as discriminatedUnion, aI as custom, Y as _null2 } from "./chunk-CAiG5_Js.js";
import { e7 as __toESM, e5 as __commonJS } from "./chunk-BJ6ur0AF.js";
import { g as getDatasourceQuerySchema, s as singleSpecRef, b as SPEC_DISCOVERY_METHODS, c as hubspotSpecs, e as extractSpec, l as loadKindSpec, d as listEndpoints, f as specHost, r as rankEndpoints, i as endpointTagCounts, j as endpointParameters } from "./chunk-nEOjGGpO.js";
createRequire(import.meta.url);
var colorPair = external_exports.object({
  light: external_exports.string().trim().min(1).max(100).describe("Color used in light mode; hex is recommended."),
  dark: external_exports.string().trim().min(1).max(100).describe("Color used in dark mode; hex is recommended.")
}).strict();
var themeDefinition = external_exports.object({
  brand: external_exports.object({
    colors: external_exports.object({
      primary: colorPair,
      secondary: colorPair.optional(),
      tertiary: colorPair.optional()
    }).strict()
  }).strict(),
  text: external_exports.object({
    font: external_exports.string().trim().min(1).max(200),
    colors: external_exports.object({
      primary: colorPair,
      placeholder: colorPair.optional(),
      disabled: colorPair.optional()
    }).strict()
  }).strict(),
  border: external_exports.object({
    radius: external_exports.object({
      default: external_exports.number().nonnegative(),
      small: external_exports.number().nonnegative(),
      large: external_exports.number().nonnegative()
    }).strict(),
    colors: external_exports.object({
      default: colorPair,
      weak: colorPair.optional(),
      disabled: colorPair.optional()
    }).strict()
  }).strict(),
  systemStatus: external_exports.object({
    colors: external_exports.object({
      success: colorPair,
      error: colorPair.optional(),
      warning: colorPair.optional()
    }).strict()
  }).strict(),
  surface: external_exports.object({
    colors: external_exports.object({
      appBackground: colorPair,
      surface1: colorPair,
      surface2: colorPair,
      surface3: colorPair
    }).strict()
  }).strict()
}).strict();
var ACCENT_MENU = [
  { name: "Indigo", hex: "#4F46E5", fits: "software, analytics, internal tools" },
  { name: "Violet", hex: "#7C3AED", fits: "creative, education, product teams" },
  { name: "Fuchsia", hex: "#C026D3", fits: "consumer, beauty, events" },
  { name: "Rose", hex: "#E11D48", fits: "hospitality, retail, food" },
  { name: "Coral", hex: "#EA580C", fits: "logistics, field service, sports" },
  { name: "Amber", hex: "#B45309", fits: "manufacturing, construction, real estate" },
  { name: "Emerald", hex: "#059669", fits: "finance, sustainability, health" },
  { name: "Teal", hex: "#0D9488", fits: "healthcare, travel, operations" },
  { name: "Sky", hex: "#0284C7", fits: "support, IT, aviation, marine" }
];
var MENU_TEXT = ACCENT_MENU.map((a) => `${a.name} ${a.hex} (${a.fits})`).join(", ");
var hsl = (hex2) => {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex2.trim());
  if (!m)
    return null;
  const full = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0)
    return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? (g - b) / d % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
};
var accentWarning = (definition) => {
  const light = definition?.brand?.colors?.primary?.light;
  if (typeof light !== "string")
    return null;
  const c = hsl(light);
  if (!c)
    return null;
  const kind = c.l < 0.22 ? "near-black" : c.s < 0.2 ? "grey" : c.h >= 212 && c.h <= 226 && c.s > 0.75 && c.l >= 0.45 && c.l <= 0.66 ? "the stock blue" : null;
  if (!kind)
    return null;
  return `The theme's primary ${light} is ${kind}, which reads plain. Unless the request names this colour or the brand uses it, pick an accent from the menu by the request's brand, industry or mood: ${MENU_TEXT}. Keep the canvas and neutrals light and lightly tinted toward it.`;
};
var STANDARD_PRIMARY = { brand: { colors: { primary: { light: "#2563EB" } } } };
var here = dirname(fileURLToPath(import.meta.url));
var standardThemeCandidates = [
  resolve(here, "../../data/default-theme.json"),
  resolve(here, "../data/default-theme.json")
];
var standardThemeCache;
function loadStandardTheme() {
  if (!standardThemeCache) {
    const path = standardThemeCandidates.find((candidate) => existsSync(candidate));
    if (!path) {
      throw new Error(`standard theme file not found (looked in ${standardThemeCandidates.join(", ")})`);
    }
    standardThemeCache = JSON.parse(readFileSync(path, "utf8"));
  }
  return standardThemeCache;
}
var derivedThemeSchema = external_exports.object({
  name: external_exports.string().trim().min(5).max(100),
  definition: themeDefinition
}).strict();
async function resolveTheme(client, choice) {
  const themes2 = await client.listAppThemes();
  if (process.env.MCP_AGENT_PACK_LOOK === "own" && (choice === "standard" || choice === "workspace_default")) {
    const basic = themes2.find((theme) => theme.isBasic && !theme.isDisabled);
    if (basic)
      return basic;
  }
  const wanted = choice === "standard" ? loadStandardTheme() : typeof choice === "object" ? choice : void 0;
  if (wanted) {
    const existing = themes2.find((theme) => theme.name === wanted.name && !theme.isDisabled);
    if (existing)
      return existing;
    return client.createAppTheme({ name: wanted.name, definition: wanted.definition, isDefault: false });
  }
  const named = themes2.find((theme) => theme.name === choice || theme.id === choice);
  if (!named)
    throw new Error(`Theme "${String(choice)}" is not available in the active workspace.`);
  if (named.isDisabled)
    throw new Error(`Theme "${named.name}" is disabled and cannot be selected.`);
  return named;
}
function createAppTool(client) {
  return {
    name: "create_app",
    title: "Create App",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false
    },
    description: 'Create a new ToolJet app with a first version and home page. Returns app_id, version_id, home_page_id, editor_url, viewer_url, datasources_url, app_url (a backward-compatible alias for editor_url), and the theme that was applied. Honor explicit or selected themes first. Otherwise derive a theme from a brand, industry or customer type (see references/themes.md) and pass theme:{name, definition}; include complete brand, text, border, systemStatus and surface tokens with light/dark values, not a font-only or partial definition. It is created once per workspace by name and applied. Otherwise the app gets the standard theme ("ToolJet Modern": neutral greys, hairline borders, 8/6/12 radii, blue primary). Pass theme:"workspace_default" to leave the app on the workspace default, or an existing theme name/id to reuse one. No theme is ever set as the workspace default. If a theme cannot be created (for example a licence gate) the app is still created and the result carries a theme warning. New apps are built in ToolJet UI 2.0 (component_library "ui2": types starting with Shad, laid out in FlexContainers); pass component_library "ui1" only when the user asks for the classic ToolJet widgets.',
    inputSchema: {
      name: external_exports.string().min(1),
      theme: external_exports.union([external_exports.string().min(1), derivedThemeSchema]).optional(),
      app_mode: external_exports.enum(["light", "dark"]).optional().describe("Open the app in this mode. Pass 'dark' when the request asks for a dark app, so the theme's dark values paint every surface; never paint dark backgrounds by hand on a light-mode app."),
      component_library: external_exports.enum(["ui1", "ui2"]).optional().describe('The component library the app is built in, saved on the app (the components panel lists it). Default "ui2", ToolJet UI 2.0; "ui1" (ToolJet UI 1.0, the native widgets) only when the user asks for it.'),
      component_pack: external_exports.string().regex(/^[a-z0-9]+$/i).optional().describe(COMPONENT_PACK_DESCRIPTION)
    },
    async handler(args) {
      try {
        if (typeof args.theme === "object")
          derivedThemeSchema.parse(args.theme);
        const created = await client.createApp(args.name);
        const componentLibrary = args.component_library ?? "ui2";
        const choice = args.theme ?? "standard";
        const pins = libraryPins();
        const pinned = pins ? { customComponentLibraries: pins } : {};
        const result = {
          ...created,
          component_library: componentLibrary,
          ...componentLibrary === "ui2" && (args.component_pack || defaultPack()) ? { component_pack: (args.component_pack || defaultPack()).toLowerCase() } : {},
          theme: { mode: "workspace_default" }
        };
        const savedLibrary = savedComponentLibrary(componentLibrary, args.component_pack);
        const saveLibrary = () => Promise.resolve().then(() => client.updateAppSettings({
          appId: created.app_id,
          versionId: created.version_id,
          globalSettings: { componentLibrary: savedLibrary, ...pinned }
        })).catch((libraryErr) => {
          result.component_library_warning = `Could not save component_library "${componentLibrary}": ${libraryErr instanceof Error ? libraryErr.message : String(libraryErr)}. Build in it anyway.`;
        });
        if (choice === "workspace_default") {
          await saveLibrary();
          return ok(result);
        }
        const label = typeof choice === "object" ? choice.name : choice;
        try {
          const theme = await resolveTheme(client, choice);
          const appMode = args.app_mode ?? (typeof choice === "object" && paintsDarkCanvasInLightMode(choice.definition) ? "dark" : void 0);
          await client.updateAppSettings({
            appId: created.app_id,
            versionId: created.version_id,
            globalSettings: { theme, componentLibrary: savedLibrary, ...pinned, ...appMode ? { appMode } : {} }
          });
          const mode = choice === "standard" ? "standard" : typeof choice === "object" ? "derived" : "named";
          const accentNote = mode === "standard" ? accentWarning(STANDARD_PRIMARY) : mode === "derived" ? accentWarning(choice.definition) : null;
          result.theme = { mode, id: theme.id, name: theme.name, ...appMode ? { app_mode: appMode } : {}, ...accentNote ? { accent_note: accentNote } : {} };
        } catch (themeErr) {
          await saveLibrary();
          result.theme = {
            mode: "workspace_default",
            warning: `Could not apply theme "${label}": ${themeErr instanceof Error ? themeErr.message : String(themeErr)}. The app was created on the workspace default theme.`
          };
        }
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    }
  };
}
var THEME_LICENCE_USER_MESSAGE = "Custom themes are not included in your current ToolJet plan, so this app uses the workspace default theme. Upgrading your plan enables branded themes; the app can be re-themed in one request afterwards.";
async function applyToApp(client, theme, args, definition) {
  if (!args.app_id || !args.version_id)
    return void 0;
  const mode = args.app_mode ?? (paintsDarkCanvasInLightMode(definition) ? "dark" : void 0);
  await client.updateAppSettings({
    appId: args.app_id,
    versionId: args.version_id,
    globalSettings: { theme, ...mode ? { appMode: mode } : {} }
  });
  return { app_id: args.app_id, version_id: args.version_id, ...mode ? { app_mode: mode } : {} };
}
var hex = (h, s, l) => {
  const channel = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
};
function definitionFromChoices(args) {
  const accent = args.primary ? hsl(args.primary) : null;
  if (!args.primary || !accent)
    return void 0;
  const { h, s: sat, l } = accent;
  const pair = (light, dark, hue = h) => ({ light: hex(hue, light[0], light[1]), dark: hex(hue, dark[0], dark[1]) });
  const base = loadStandardTheme().definition;
  const radius = args.radius ?? base.border.radius.default;
  return {
    brand: {
      colors: {
        primary: { light: args.primary, dark: hex(h, sat, Math.max(l, 0.62)) },
        secondary: pair([0.45, 0.22], [0.4, 0.78]),
        tertiary: pair([0.65, 0.42], [0.65, 0.68], (h + 35) % 360)
      }
    },
    text: {
      font: args.font ?? base.text.font,
      colors: { primary: pair([0.28, 0.13], [0.18, 0.94]), placeholder: pair([0.12, 0.45], [0.1, 0.65]), disabled: pair([0.1, 0.68], [0.08, 0.45]) }
    },
    border: {
      radius: { default: radius, small: Math.max(radius - 2, 0), large: radius + 4 },
      colors: { default: pair([0.22, 0.86], [0.12, 0.24]), weak: pair([0.24, 0.91], [0.12, 0.19]), disabled: pair([0.16, 0.82], [0.1, 0.28]) }
    },
    systemStatus: base.systemStatus,
    surface: {
      colors: {
        appBackground: pair([0.3, 0.965], [0.16, 0.075]),
        surface1: { light: "#ffffff", dark: hex(h, 0.14, 0.11) },
        surface2: pair([0.28, 0.94], [0.13, 0.145]),
        surface3: pair([0.24, 0.9], [0.12, 0.19])
      }
    }
  };
}
function requireValue(value, label) {
  if (value === void 0)
    throw new Error(`manage_theme requires ${label} for this action.`);
  return value;
}
async function readTheme(client, themeId) {
  const theme = (await client.listAppThemes()).find((candidate) => candidate.id === themeId);
  if (!theme)
    throw new Error(`Theme "${themeId}" is not available in the active workspace.`);
  return theme;
}
function manageThemeTool(client) {
  return {
    name: "manage_theme",
    title: "Manage Workspace Theme",
    // list/create/rename are safe, but the same tool also deletes a theme, so the hint covers its widest action.
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false
    },
    description: "Manage workspace theme objects through ToolJet's typed theme API. Actions: list, create, set_default, update_definition, rename, delete. Definitions contain brand, text, border, systemStatus, and surface tokens with light/dark values. create with app_id and version_id also applies the theme to that app (in app_mode, else in dark mode when its light-mode canvas is dark), so a new app needs no update_app_settings call; create reuses a theme of the same name, so there is no need to list themes first. Delete requires confirm:true after exact-target approval. list returns id, name and flags only; pass include_definitions:true (or theme_id) to get a definition.",
    inputSchema: {
      action: external_exports.enum(["list", "create", "set_default", "update_definition", "rename", "delete"]),
      theme_id: external_exports.string().uuid().optional(),
      name: external_exports.string().trim().min(1).max(100).optional(),
      primary: external_exports.string().regex(/^#[0-9a-fA-F]{6}$/).optional().describe("create: the accent colour as a hex. With font and radius, this is all a theme needs; the rest is derived from its hue"),
      font: external_exports.string().trim().min(1).max(100).optional().describe("create, with primary: one font family name"),
      radius: external_exports.number().min(0).max(32).optional().describe("create, with primary: corner radius in px"),
      definition: themeDefinition.optional(),
      is_default: external_exports.boolean().optional(),
      confirm: external_exports.boolean().optional(),
      include_definitions: external_exports.boolean().optional(),
      app_id: external_exports.string().uuid().optional().describe("create only: apply the theme to this app as well"),
      version_id: external_exports.string().uuid().optional().describe("create only, with app_id: the app version to apply it to"),
      app_mode: external_exports.enum(["light", "dark"]).optional().describe("create only, with app_id: open the app in this mode. Pass 'dark' when the request asks for a dark app: the theme's dark values then paint every surface, and ToolJet's own parts (tables, inputs) draw for them. Never paint dark backgrounds by hand on a light-mode app.")
    },
    async handler(args) {
      try {
        if (args.action === "list") {
          const themes2 = await client.listAppThemes();
          if (args.include_definitions)
            return ok({ themes: themes2 });
          if (args.theme_id) {
            const one = themes2.find((theme) => theme.id === args.theme_id);
            return one ? ok({ themes: [one] }) : fail(new Error(`Theme "${args.theme_id}" not found.`));
          }
          return ok({
            themes: themes2.map(({ id, name, isDefault, isBasic, isDisabled }) => ({ id, name, isDefault, isBasic, isDisabled })),
            note: "Definitions omitted; pass include_definitions:true or theme_id to read one."
          });
        }
        if (args.action === "create") {
          const missing = [
            ...args.name === void 0 ? ['name (at least 5 characters, the brand or app, e.g. "Harbor Ledger")'] : [],
            ...args.definition === void 0 && !definitionFromChoices(args) ? ['primary (the accent as a hex colour, e.g. "#0f766e"; font and radius are optional)'] : []
          ];
          if (missing.length)
            throw new Error(`manage_theme create needs ${missing.join(" and ")}. Send them together in one call.`);
          const name = requireValue(args.name, "name");
          if (name.length < 5)
            throw new Error("Theme name must contain at least 5 characters.");
          if (name === "ToolJet")
            throw new Error('The reserved theme name "ToolJet" cannot be used.');
          const existing = (await client.listAppThemes()).find((theme) => theme.name === name && !theme.isDisabled);
          if (existing) {
            const applied = await applyToApp(client, existing, args, existing.definition ?? args.definition);
            return ok({
              theme: existing,
              reused: true,
              ...applied ? { applied } : {},
              warnings: [
                `Theme "${name}" already exists in this workspace; returned it instead of creating a duplicate. ` + (applied ? "It is applied to the app." : "Apply it with update_app_settings, or use update_definition to change it.")
              ]
            });
          }
          try {
            const definition = requireValue(args.definition ?? definitionFromChoices(args), "primary (a hex colour; font and radius are optional)");
            const created = await client.createAppTheme({
              name,
              definition,
              isDefault: args.is_default ?? false
            });
            const applied = await applyToApp(client, created, args, definition);
            const accent = accentWarning(definition);
            return ok({ theme: created, ...applied ? { applied } : {}, ...accent ? { warnings: [accent] } : {} });
          } catch (error) {
            if (error instanceof ToolJetHttpError && error.status === 451) {
              return ok({
                theme: null,
                licensed: false,
                user_message: THEME_LICENCE_USER_MESSAGE,
                warnings: [
                  "Custom themes are not included in this ToolJet plan (HTTP 451). The app keeps the workspace default theme. Do not retry theme creation or guess a theme id; build the app on the default theme and repeat `user_message` to the user in the closing handoff."
                ]
              });
            }
            throw error;
          }
        }
        const themeId = requireValue(args.theme_id, "theme_id");
        await readTheme(client, themeId);
        if (args.action === "set_default") {
          await client.setDefaultAppTheme(themeId, args.is_default ?? true);
          return ok({ theme: await readTheme(client, themeId) });
        }
        if (args.action === "update_definition") {
          await client.updateAppThemeDefinition(themeId, requireValue(args.definition, "definition"));
          const accent = accentWarning(args.definition);
          return ok({ theme: await readTheme(client, themeId), ...accent ? { warnings: [accent] } : {} });
        }
        if (args.action === "rename") {
          await client.renameAppTheme(themeId, requireValue(args.name, "name"));
          return ok({ theme: await readTheme(client, themeId) });
        }
        if (args.confirm !== true) {
          throw new Error(`Deleting theme "${themeId}" requires confirm:true after exact-target user approval.`);
        }
        await client.deleteAppTheme(themeId);
        return ok({ deleted: true, theme_id: themeId });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
var themes = [
  {
    action: "list",
    name: "list_workspace_themes",
    title: "List Workspace Theme Definitions",
    description: "Read workspace themes with id, name, and flags. Unlike list_app_themes, this also supports include_definitions:true for all definitions or theme_id for one full definition. Does not change themes.",
    required: [],
    optional: ["theme_id", "include_definitions"],
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  },
  {
    action: "create",
    name: "create_workspace_theme",
    title: "Create Workspace Theme",
    description: "Create a custom workspace theme, or reuse an existing active theme of the same name. Supply a name of at least five characters and either a full definition or primary (a hex accent), with optional font and radius, for a new theme. is_default can replace the workspace default. With both app_id and version_id, applies it to that app and selects dark mode for a dark light-mode canvas. License gates apply.",
    required: ["name"],
    optional: ["definition", "primary", "font", "radius", "is_default", "app_id", "version_id", "app_mode"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "set_default",
    name: "set_default_workspace_theme",
    title: "Set Default Workspace Theme",
    description: "Change whether an existing workspace theme is the default. is_default defaults to true; false removes its default status. Changes the workspace default used by apps.",
    required: ["theme_id"],
    optional: ["is_default"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "update_definition",
    name: "update_workspace_theme_definition",
    title: "Update Workspace Theme Definition",
    description: "Replace the full token definition of an existing workspace theme, affecting apps using it. Definitions require brand, text, border, systemStatus, and surface tokens with light/dark colors. License gates apply.",
    required: ["theme_id", "definition"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "rename",
    name: "rename_workspace_theme",
    title: "Rename Workspace Theme",
    description: "Replace the name of an existing workspace theme. Requires a theme_id from the active workspace; ToolJet permissions and license gates apply.",
    required: ["theme_id", "name"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "delete",
    name: "delete_workspace_theme",
    title: "Delete Workspace Theme",
    description: "Delete an existing workspace theme only after explicit approval of that exact theme. Requires confirm:true. ToolJet permissions and license gates apply.",
    required: ["theme_id", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  }
];
function themeActionTools(source) {
  return exposeActions(source, themes);
}
createRequire(import.meta.url);
var CODE_PAGE_TRUE = /* @__PURE__ */ new Set([true, "true", "{{true}}"]);
function codeScreens(summary) {
  const pageIds = new Set(summary.pages.map((page) => page.id));
  const screens = [];
  for (const page of summary.pages) {
    for (const component of page.components) {
      const props = component.properties ?? {};
      if (component.parent || !CODE_PAGE_TRUE.has(props.codePage?.value))
        continue;
      let routes = props.routes?.value;
      if (typeof routes === "string") {
        try {
          routes = JSON.parse(routes);
        } catch {
          routes = [];
        }
      }
      if (!Array.isArray(routes))
        continue;
      for (const route of routes) {
        if (typeof route?.id !== "string" || typeof route?.path !== "string")
          continue;
        if (typeof route.pageId !== "string" || !pageIds.has(route.pageId))
          continue;
        screens.push({
          route_id: route.id,
          path: route.path,
          ...typeof route.title === "string" ? { title: route.title } : {},
          page_id: route.pageId,
          code_page_id: page.id
        });
      }
    }
  }
  return screens;
}
function findScreen(summary, route) {
  const screens = codeScreens(summary);
  const screen = screens.find((s) => s.route_id === route) ?? screens.find((s) => s.path === route);
  if (screen)
    return screen;
  throw new Error(`No Code mode screen "${route}" in app "${summary.app_id}". ` + (screens.length ? `Its screens: ${screens.map((s) => `${s.route_id} (${s.path})`).join(", ")}.` : "The app has no Code mode screens."));
}
function findQuery(summary, ref) {
  const lower = ref.toLowerCase();
  return summary.queries.find((q) => q.id === ref) ?? summary.queries.find((q) => q.name === ref) ?? summary.queries.find((q) => q.name?.toLowerCase() === lower);
}
function isCodeApp(summary) {
  return summary.pages.some((page) => page.components.some((component) => {
    const props = component.properties ?? {};
    return !component.parent && CODE_PAGE_TRUE.has(props.codePage?.value);
  }));
}
function findResource(summary, resourceType, resourceId) {
  if (resourceType === "page") {
    const page = summary.pages.find((candidate) => candidate.id === resourceId) ?? summary.pages.find((candidate) => candidate.name === resourceId);
    if (page)
      return { type: resourceType, id: page.id, name: page.name };
  } else if (resourceType === "query") {
    const query = findQuery(summary, resourceId);
    if (query)
      return { type: resourceType, id: query.id, name: query.name };
  } else {
    for (const page of summary.pages) {
      const component = page.components.find((candidate) => candidate.id === resourceId);
      if (component) {
        return {
          type: resourceType,
          id: component.id,
          name: component.name,
          component_type: component.type,
          page_id: page.id,
          page_name: page.name
        };
      }
    }
  }
  throw new Error(`${resourceType} "${resourceId}" does not belong to app "${summary.app_id}". Use get_app_summary and do not guess resource ids.`);
}
function normalizePermission(permissions) {
  const permission = permissions[0];
  if (!permission)
    return { access: "all", permission_id: null };
  if (permission.type === "SINGLE") {
    return {
      access: "users",
      permission_id: permission.id,
      users: (Array.isArray(permission.users) ? permission.users : []).map((entry) => entry?.user).filter(Boolean).map((user) => ({
        id: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || void 0,
        email: user.email
      }))
    };
  }
  if (permission.type === "GROUP") {
    return {
      access: "groups",
      permission_id: permission.id,
      groups: (Array.isArray(permission.groups) ? permission.groups : []).map((entry) => entry?.permissionGroup).filter(Boolean).map((group) => ({ id: group.id, name: group.name }))
    };
  }
  return { access: String(permission.type ?? "unknown").toLowerCase(), permission_id: permission.id };
}
function planLimits(features) {
  if (!features)
    return void 0;
  const known = Object.entries({
    query_limits: features.appPermissionQuery,
    screen_limits: features.appPermissionPages,
    server_side_current_user: features.serverSideGlobalResolve
  }).filter(([, value]) => typeof value === "boolean");
  return known.length ? Object.fromEntries(known) : void 0;
}
async function subjectGroups(client, open) {
  const openIds = new Map(open.map((group) => [group.id, group]));
  let workspace;
  try {
    workspace = await client.listWorkspaceGroups();
  } catch {
    workspace = void 0;
  }
  if (!workspace) {
    return {
      groups: open.map((group) => ({ ...group, can_open_app: true })),
      complete: false
    };
  }
  const groups = workspace.map((group) => ({
    id: group.id,
    name: group.name,
    type: group.type,
    ...typeof openIds.get(group.id)?.count === "number" ? { count: openIds.get(group.id).count } : {},
    can_open_app: openIds.has(group.id),
    ...group.disabled ? { disabled: true } : {}
  }));
  for (const group of open)
    if (!groups.some((known) => known.id === group.id))
      groups.push({ ...group, can_open_app: true });
  return { groups, complete: true };
}
function viewRule(appId, appName, groupId) {
  return {
    name: `${(appName || "App").slice(0, 40)} (view)`,
    type: "app",
    groupId,
    isAll: false,
    createResourcePermissionObject: {
      canEdit: false,
      canView: true,
      hideFromDashboard: false,
      canAccessDevelopment: false,
      canAccessStaging: false,
      canAccessProduction: false,
      canAccessReleased: true,
      resourcesToAdd: [{ appId }]
    }
  };
}
async function groupDirectory(client, appId) {
  const subjects = await client.listAppPermissionSubjects(appId);
  const { groups, complete } = await subjectGroups(client, subjects.groups);
  return { groups, complete, openIds: new Set(subjects.groups.map((group) => group.id)) };
}
function resolveGroups(directory, refs) {
  const ids = [];
  const unknown2 = [];
  for (const ref of refs) {
    const lower = ref.toLowerCase();
    const group = directory.groups.find((g) => g.id === ref) ?? directory.groups.find((g) => g.name === ref) ?? directory.groups.find((g) => g.name?.toLowerCase() === lower);
    if (group)
      ids.push(group.id);
    else if (!directory.complete && UUID.test(ref))
      ids.push(ref);
    else
      unknown2.push(ref);
  }
  return { ids: [...new Set(ids)], unknown: unknown2 };
}
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function groupsToGrant(directory, groupIds, grant) {
  const missing = groupIds.filter((id) => !directory.openIds.has(id));
  if (!missing.length)
    return [];
  const byId = new Map(directory.groups.map((group) => [group.id, group]));
  const names = missing.map((id) => byId.get(id)?.name ?? id);
  if (!grant) {
    throw new Error(`${names.join(", ")} cannot open this app yet, so a limit to ${missing.length > 1 ? "them" : "it"} would leave ${missing.length > 1 ? "their" : "its"} members without the screen or query. Pass grant_app_access: true to give each of them view access to this app only (the released app), or give them access in Workspace settings > Groups. Nothing was changed.`);
  }
  const disabled = missing.filter((id) => byId.get(id)?.disabled);
  if (disabled.length) {
    throw new Error(`${disabled.map((id) => byId.get(id)?.name ?? id).join(", ")} cannot be changed under the current plan, so it cannot be given access to this app. Nothing was changed.`);
  }
  return missing;
}
async function removeGrants(client, appId, granted) {
  const left = [];
  for (const grant of granted) {
    try {
      const rules = await client.listWorkspaceGroupAccess(grant.group_id);
      const added = rules.filter((rule) => rule.id && rule.name === grant.rule_name && rule.resources.some((r) => r.id === appId));
      for (const rule of added)
        await client.writeWorkspaceGroupAccess("DELETE", grant.group_id, "app", rule.id);
    } catch {
      left.push(grant.name ?? grant.group_id);
    }
  }
  return left;
}
async function grantGroups(client, appId, appName, directory, missing) {
  const byId = new Map(directory.groups.map((group) => [group.id, group]));
  const granted = [];
  const undo = async (reason) => {
    const left = await removeGrants(client, appId, granted);
    throw new Error(`${reason} The access rules added here were removed${left.length ? `, except for ${left.join(", ")} (remove it in Workspace settings > Groups)` : ""}.`);
  };
  for (const id of missing) {
    const rule = viewRule(appId, appName, id);
    try {
      await client.writeWorkspaceGroupAccess("POST", id, "app", void 0, rule);
    } catch (error) {
      await undo(`${byId.get(id)?.name ?? id} could not be given access to this app: ${error.message}.`);
    }
    granted.push({ group_id: id, ...byId.get(id)?.name ? { name: byId.get(id).name } : {}, rule_name: rule.name });
  }
  const after = new Set((await client.listAppPermissionSubjects(appId)).groups.map((group) => group.id));
  const still = missing.filter((id) => !after.has(id));
  if (still.length) {
    await undo(`ToolJet did not confirm that ${still.map((id) => byId.get(id)?.name ?? id).join(", ")} can open this app after the access rule was added.`);
  }
  return granted;
}
function resolveTargets(args, summary, problems) {
  const targets = [];
  const routes = [...args.route !== void 0 ? [args.route] : [], ...args.routes ?? []];
  const queries = [...args.query !== void 0 ? [args.query] : [], ...args.queries ?? []];
  const type = args.resource_type === "screen" ? "page" : args.resource_type;
  if (routes.length && type && type !== "page") {
    problems.push(`route names a Code mode screen (a page permission), so resource_type "${args.resource_type}" does not fit: leave resource_type out.`);
  }
  if (queries.length && type && type !== "query") {
    problems.push(`query names a query, so resource_type "${args.resource_type}" does not fit: leave resource_type out.`);
  }
  for (const route of [...new Set(routes)]) {
    try {
      const screen = findScreen(summary, route);
      targets.push({
        resourceType: "page",
        resourceId: screen.page_id,
        resource: {
          ...findResource(summary, "page", screen.page_id),
          screen: { route_id: screen.route_id, path: screen.path, title: screen.title }
        }
      });
    } catch (error) {
      problems.push(error.message);
    }
  }
  const unknownQueries = [];
  for (const ref of [...new Set(queries)]) {
    const query = findQuery(summary, ref);
    if (!query)
      unknownQueries.push(ref);
    else
      targets.push({ resourceType: "query", resourceId: query.id, resource: { type: "query", id: query.id, name: query.name } });
  }
  if (unknownQueries.length) {
    const names = summary.queries.map((q) => q.name ?? q.id);
    problems.push(`No query ${unknownQueries.map((q) => `"${q}"`).join(", ")} in this app. ` + (names.length ? `Its queries: ${names.join(", ")}.` : "The app has no queries."));
  }
  if (args.resource_id !== void 0) {
    const kinds = type ? [type] : ["query", "page", "component"];
    let found;
    for (const kind of kinds) {
      try {
        found = { resourceType: kind, resourceId: "", resource: findResource(summary, kind, args.resource_id) };
        found.resourceId = String(found.resource.id);
        break;
      } catch {
      }
    }
    if (found)
      targets.push(found);
    else
      problems.push(`resource_id "${args.resource_id}" is no ${type ?? "page, query or component"} of this app. Pass a query by its name with query, or a screen with route.`);
  }
  if (!routes.length && !queries.length && args.resource_id === void 0) {
    const screens = codeScreens(summary);
    problems.push("Name what to limit: route (or routes) for screens, query (or queries) for queries, by name or id." + (screens.length ? ` Screens: ${screens.map((s) => s.path).join(", ")}.` : "") + (summary.queries.length ? ` Queries: ${summary.queries.map((q) => q.name ?? q.id).join(", ")}.` : "") + // A build sent set with groups and grant_app_access but nothing to limit, four times over (2026-11-09).
    (args.grant_app_access || args.groups?.length || args.group_ids?.length ? " There is no app-wide grant: a group gets into this app with the first screen or query limited to it (grant_app_access does that part). Everyone who can open the app already sees what is not limited, so when no screen or query should be limited, there is nothing to set." + (isCodeApp(summary) && !screens.length ? " Screens are listed here after code_app_install has saved the routes." : "") : ""));
  }
  const seen = /* @__PURE__ */ new Set();
  return targets.filter((target) => {
    const key = `${target.resourceType}:${target.resourceId}`;
    if (seen.has(key))
      return false;
    seen.add(key);
    return true;
  });
}
function exampleCall(args, summary, codeApp) {
  const example = { action: args.action === "get" ? "get" : args.action, app_id: args.app_id };
  const screens = summary ? codeScreens(summary) : [];
  if (args.routes?.length)
    example.routes = args.routes;
  else if (args.route)
    example.route = args.route;
  else if (args.queries?.length)
    example.queries = args.queries;
  else if (args.query)
    example.query = args.query;
  else if (screens.length)
    example.route = screens[screens.length - 1].path;
  else if (summary?.queries.length)
    example.query = summary.queries[0].name ?? summary.queries[0].id;
  else
    example.route = "/finance";
  if (args.action === "set") {
    if (args.users?.length || args.user_ids?.length)
      example.users = args.users ?? args.user_ids;
    else
      example.groups = args.groups ?? args.group_ids ?? ["Finance"];
    if (!codeApp)
      example.confirm = true;
  }
  if (args.action === "clear")
    example.confirm = true;
  return JSON.stringify(example);
}
function manageAppPermissionsTool(client) {
  return {
    name: "manage_app_permissions",
    title: "Manage App Permissions",
    // get/list_subjects only read, but set overwrites an access rule and clear broadens access to
    // every user who can reach the app, so the hint covers its widest action.
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false
    },
    description: `Server-enforced access to an app's screens and queries: who can open a Code mode screen (route) or run a query. Example: {"action":"set","app_id":"<id>","route":"/finance","groups":["Finance"]}; for queries "query":"finance_queue" (name or id), and "routes" or "queries" take several at once with the same groups. groups take names or ids, users take emails or ids; access_type and resource_type are inferred. In a Code mode app, set needs no confirm, and a named group that cannot open the app first gets view access to this app only (grant_app_access defaults to true; false refuses instead). In other apps set needs confirm:true after the user approves the exact rule. clear (back to everyone who can open the app) always needs confirm:true. list_subjects: every workspace group with can_open_app, and plan (whether this plan enforces query and screen limits and resolves {{globals.server.currentUser}} on the server). list_screens: each route with its access. list_queries: each query of the app with its access. A screen limit hides the screen; the data it shows is protected only by limiting the queries that return it. Visual pages and components: resource_id (resource_type is optional). License gates apply.`,
    inputSchema: {
      action: external_exports.enum(["list_subjects", "list_screens", "list_queries", "get", "set", "clear"]),
      app_id: external_exports.string().uuid(),
      route: external_exports.string().min(1).max(200).optional().describe("A Code mode screen by route path or id (app.json routes)."),
      routes: external_exports.array(external_exports.string().min(1).max(200)).min(1).max(50).optional().describe("Several screens at once."),
      query: external_exports.string().min(1).max(200).optional().describe("A query by name or id."),
      queries: external_exports.array(external_exports.string().min(1).max(200)).min(1).max(100).optional().describe("Several queries at once."),
      groups: external_exports.array(external_exports.string().min(1).max(200)).min(1).max(100).optional().describe("Group names or ids."),
      users: external_exports.array(external_exports.string().min(1).max(320)).min(1).max(100).optional().describe("User emails or ids."),
      resource_type: external_exports.enum(["page", "query", "component", "screen"]).optional().describe("Inferred; only needed with resource_id."),
      resource_id: external_exports.string().min(1).max(200).optional(),
      access_type: external_exports.enum(["users", "groups"]).optional().describe("Inferred from groups or users."),
      user_ids: external_exports.array(external_exports.string().min(1)).min(1).max(100).optional(),
      group_ids: external_exports.array(external_exports.string().min(1)).min(1).max(100).optional(),
      confirm: external_exports.boolean().optional(),
      grant_app_access: external_exports.boolean().optional().describe("set with groups: give a group that cannot open the app view access to this app only first (default true in a Code mode app)")
    },
    async handler(args) {
      try {
        if (args.action === "list_subjects") {
          const [subjects, features] = await Promise.all([
            client.listAppPermissionSubjects(args.app_id),
            client.getLicenseFeatureAccess().catch(() => void 0)
          ]);
          const { groups, complete } = await subjectGroups(client, subjects.groups);
          const plan = planLimits(features);
          return ok({
            app_id: args.app_id,
            users: subjects.users,
            groups,
            ...plan ? { plan } : {},
            note: complete ? "A group with can_open_app false cannot open the app: a set naming it gives it view access to this app only first (in a Code mode app by default, elsewhere with grant_app_access:true)." : "Only the groups that can open the app are listed: the workspace group list could not be read."
          });
        }
        if (args.action === "list_screens") {
          const summary2 = await client.getAppSummary(args.app_id);
          const screens = await Promise.all(codeScreens(summary2).map(async (screen) => ({
            ...screen,
            ...normalizePermission(await client.getAppPermission(args.app_id, "page", screen.page_id))
          })));
          return ok({ app_id: args.app_id, screens });
        }
        if (args.action === "list_queries") {
          const summary2 = await client.getAppSummary(args.app_id);
          const queries = await Promise.all(summary2.queries.map(async (q) => ({
            query_id: q.id,
            name: q.name,
            ...normalizePermission(await client.getAppPermission(args.app_id, "query", q.id))
          })));
          return ok({ app_id: args.app_id, queries, limited: queries.filter((q) => q.access !== "all").length });
        }
        const summary = await client.getAppSummary(args.app_id);
        const codeApp = isCodeApp(summary);
        const problems = [];
        const targets = resolveTargets(args, summary, problems);
        let accessType;
        let subjectIds = [];
        let directory;
        if (args.action === "set") {
          const groupRefs = [...args.groups ?? [], ...args.group_ids ?? []];
          const userRefs = [...args.users ?? [], ...args.user_ids ?? []];
          if (groupRefs.length && userRefs.length) {
            problems.push("Pass groups or users, not both: one limit is to groups or to named users.");
          } else if (!groupRefs.length && !userRefs.length) {
            problems.push("Name who keeps access: groups (names or ids) or users (emails or ids).");
          } else {
            accessType = groupRefs.length ? "groups" : "users";
            if (args.access_type && args.access_type !== accessType) {
              problems.push(`access_type "${args.access_type}" does not match the ${accessType} passed: leave access_type out.`);
            }
          }
          if (accessType === "groups") {
            directory = await groupDirectory(client, args.app_id);
            const { ids, unknown: unknown2 } = resolveGroups(directory, groupRefs);
            if (unknown2.length) {
              problems.push(`${unknown2.map((g) => `"${g}"`).join(", ")} ${unknown2.length > 1 ? "are not groups" : "is not a group"} of this workspace. Its groups: ${directory.groups.map((g) => g.name ?? g.id).join(", ")}.`);
            }
            subjectIds = ids;
          } else if (accessType === "users") {
            const users = (await client.listAppPermissionSubjects(args.app_id)).users;
            const unknown2 = [];
            for (const ref of userRefs) {
              const lower = ref.toLowerCase();
              const user = users.find((u) => u.id === ref) ?? users.find((u) => u.email?.toLowerCase() === lower);
              if (user)
                subjectIds.push(user.id);
              else
                unknown2.push(ref);
            }
            if (unknown2.length) {
              problems.push(`${unknown2.map((u) => `"${u}"`).join(", ")} cannot open this app or is not a user of this workspace (users must already have access to the app; list_subjects lists them).`);
            }
            subjectIds = [...new Set(subjectIds)];
            if (args.grant_app_access === true) {
              problems.push("grant_app_access applies only to a limit to groups: leave it out with users.");
            }
          }
          if (!codeApp && args.confirm !== true) {
            problems.push("set on this app needs confirm:true after the user explicitly approves the exact access rule.");
          }
        }
        if (args.action === "clear" && args.confirm !== true) {
          problems.push("clear opens the resource to everyone who can open the app, so it needs confirm:true after the user approves it.");
        }
        if (problems.length) {
          throw new Error(`manage_app_permissions ${args.action} was refused and nothing was changed:
` + problems.map((problem) => `- ${problem}`).join("\n") + `
A call that works: ${exampleCall(args, summary, codeApp)}`);
        }
        const one = targets.length === 1;
        if (args.action === "get") {
          const results2 = await Promise.all(targets.map(async (t) => ({ resource: t.resource, ...normalizePermission(await client.getAppPermission(args.app_id, t.resourceType, t.resourceId)) })));
          return ok(one ? { app_id: args.app_id, ...results2[0] } : { app_id: args.app_id, results: results2 });
        }
        if (args.action === "clear") {
          for (const t of targets)
            await client.clearAppPermission(args.app_id, t.resourceType, t.resourceId);
          const results2 = targets.map((t) => ({ resource: t.resource, access: "all", permission_id: null }));
          return ok(one ? { app_id: args.app_id, ...results2[0] } : { app_id: args.app_id, results: results2 });
        }
        const grant = args.grant_app_access ?? codeApp;
        const toGrant = accessType === "groups" ? groupsToGrant(directory, subjectIds, grant) : [];
        const results = [];
        for (const t of targets) {
          try {
            const permissions = await client.setAppPermission({
              appId: args.app_id,
              resourceType: t.resourceType,
              resourceId: t.resourceId,
              accessType,
              subjectIds
            });
            results.push({ resource: t.resource, ...normalizePermission(permissions) });
          } catch (error) {
            results.push({ resource: t.resource, error: error.message });
          }
        }
        const failed = results.filter((r) => r.error);
        const failures = failed.map((r) => `${r.resource.name ?? r.resource.id}: ${r.error}`).join("; ");
        if (failed.length === results.length) {
          throw new Error(failures + (toGrant.length ? " No access to the app was given." : ""));
        }
        if (failed.length) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: `${failed.length} of ${results.length} limits were not set: ${failures}.` + (toGrant.length ? " No access to the app was given." : "") + " Set the failed ones again; the others are in place.",
                app_id: args.app_id,
                applied: results.filter((r) => !r.error),
                failed
              })
            }],
            isError: true
          };
        }
        let granted = [];
        if (toGrant.length) {
          try {
            granted = await grantGroups(client, args.app_id, summary.name, directory, toGrant);
          } catch (error) {
            throw new Error(`The limits were set, but their groups cannot open this app, so their members cannot use those screens or queries yet: ${error.message} Give the groups access in Workspace settings > Groups, or run this again.`);
          }
        }
        const grantNote = granted.length ? `${granted.map((g) => g.name ?? g.group_id).join(", ")} could not open this app, so ${granted.length > 1 ? "each now has" : "it now has"} view access to this app only (released app, rule "${granted[0].rule_name}").` : void 0;
        const body = {
          app_id: args.app_id,
          ...one ? results[0] : { results },
          ...granted.length ? { granted_app_access: granted, note: grantNote } : {}
        };
        return ok(body);
      } catch (error) {
        return fail(error);
      }
    }
  };
}
var appPermissions = [
  {
    action: "list_subjects",
    name: "list_app_permission_subjects",
    title: "List App Permission Subjects",
    description: "List users and groups eligible for resource access rules in one app. Subjects must already have app access. ToolJet permissions and license gates apply.",
    required: ["app_id"],
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  },
  {
    action: "get",
    name: "get_app_resource_permission",
    title: "Get App Resource Permission",
    description: "Read server-enforced access for one page, query, or component belonging to the selected app. Use exact resource IDs from get_app_summary.",
    required: ["app_id", "resource_type", "resource_id"],
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  },
  {
    action: "set",
    name: "set_app_resource_permission",
    title: "Set App Resource Permission",
    description: "Replace access to one app page, query, or component with selected users or groups. Supply user_ids for access_type users or group_ids for groups, never both. Requires confirm:true after explicit approval of the exact rule; existing app access and license gates still apply.",
    required: ["app_id", "resource_type", "resource_id", "access_type", "confirm"],
    optional: ["user_ids", "group_ids"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "clear",
    name: "clear_app_resource_permission",
    title: "Clear App Resource Permission",
    description: "Remove a resource access restriction, broadening access to every user who can access the app. Requires confirm:true after explicit approval of this exact page, query, or component.",
    required: ["app_id", "resource_type", "resource_id", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  }
];
function appPermissionActionTools(source) {
  return exposeActions(source, appPermissions);
}
createRequire(import.meta.url);
var LATEST_PROTOCOL_VERSION = "2025-11-25";
var DEFAULT_NEGOTIATED_PROTOCOL_VERSION = "2025-03-26";
var SUPPORTED_PROTOCOL_VERSIONS = [LATEST_PROTOCOL_VERSION, "2025-06-18", "2025-03-26", "2024-11-05", "2024-10-07"];
var RELATED_TASK_META_KEY = "io.modelcontextprotocol/related-task";
var JSONRPC_VERSION = "2.0";
var AssertObjectSchema = custom((v) => v !== null && (typeof v === "object" || typeof v === "function"));
var ProgressTokenSchema = union([string(), number().int()]);
var CursorSchema = string();
looseObject({
  /**
   * Requested duration in milliseconds to retain task from creation.
   */
  ttl: number().optional(),
  /**
   * Time in milliseconds to wait between task status requests.
   */
  pollInterval: number().optional()
});
var TaskMetadataSchema = object({
  ttl: number().optional()
});
var RelatedTaskMetadataSchema = object({
  taskId: string()
});
var RequestMetaSchema = looseObject({
  /**
   * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
   */
  progressToken: ProgressTokenSchema.optional(),
  /**
   * If specified, this request is related to the provided task.
   */
  [RELATED_TASK_META_KEY]: RelatedTaskMetadataSchema.optional()
});
var BaseRequestParamsSchema = object({
  /**
   * See [General fields: `_meta`](/specification/draft/basic/index#meta) for notes on `_meta` usage.
   */
  _meta: RequestMetaSchema.optional()
});
var TaskAugmentedRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * If specified, the caller is requesting task-augmented execution for this request.
   * The request will return a CreateTaskResult immediately, and the actual result can be
   * retrieved later via tasks/result.
   *
   * Task augmentation is subject to capability negotiation - receivers MUST declare support
   * for task augmentation of specific request types in their capabilities.
   */
  task: TaskMetadataSchema.optional()
});
var isTaskAugmentedRequestParams = (value) => TaskAugmentedRequestParamsSchema.safeParse(value).success;
var RequestSchema = object({
  method: string(),
  params: BaseRequestParamsSchema.loose().optional()
});
var NotificationsParamsSchema = object({
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: RequestMetaSchema.optional()
});
var NotificationSchema = object({
  method: string(),
  params: NotificationsParamsSchema.loose().optional()
});
var ResultSchema = looseObject({
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: RequestMetaSchema.optional()
});
var RequestIdSchema = union([string(), number().int()]);
var JSONRPCRequestSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  ...RequestSchema.shape
}).strict();
var isJSONRPCRequest = (value) => JSONRPCRequestSchema.safeParse(value).success;
var JSONRPCNotificationSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  ...NotificationSchema.shape
}).strict();
var isJSONRPCNotification = (value) => JSONRPCNotificationSchema.safeParse(value).success;
var JSONRPCResultResponseSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  result: ResultSchema
}).strict();
var isJSONRPCResultResponse = (value) => JSONRPCResultResponseSchema.safeParse(value).success;
var ErrorCode;
(function(ErrorCode2) {
  ErrorCode2[ErrorCode2["ConnectionClosed"] = -32e3] = "ConnectionClosed";
  ErrorCode2[ErrorCode2["RequestTimeout"] = -32001] = "RequestTimeout";
  ErrorCode2[ErrorCode2["ParseError"] = -32700] = "ParseError";
  ErrorCode2[ErrorCode2["InvalidRequest"] = -32600] = "InvalidRequest";
  ErrorCode2[ErrorCode2["MethodNotFound"] = -32601] = "MethodNotFound";
  ErrorCode2[ErrorCode2["InvalidParams"] = -32602] = "InvalidParams";
  ErrorCode2[ErrorCode2["InternalError"] = -32603] = "InternalError";
  ErrorCode2[ErrorCode2["UrlElicitationRequired"] = -32042] = "UrlElicitationRequired";
})(ErrorCode || (ErrorCode = {}));
var JSONRPCErrorResponseSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema.optional(),
  error: object({
    /**
     * The error type that occurred.
     */
    code: number().int(),
    /**
     * A short description of the error. The message SHOULD be limited to a concise single sentence.
     */
    message: string(),
    /**
     * Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).
     */
    data: unknown().optional()
  })
}).strict();
var isJSONRPCErrorResponse = (value) => JSONRPCErrorResponseSchema.safeParse(value).success;
var JSONRPCMessageSchema = union([
  JSONRPCRequestSchema,
  JSONRPCNotificationSchema,
  JSONRPCResultResponseSchema,
  JSONRPCErrorResponseSchema
]);
union([JSONRPCResultResponseSchema, JSONRPCErrorResponseSchema]);
var EmptyResultSchema = ResultSchema.strict();
var CancelledNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The ID of the request to cancel.
   *
   * This MUST correspond to the ID of a request previously issued in the same direction.
   */
  requestId: RequestIdSchema.optional(),
  /**
   * An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
   */
  reason: string().optional()
});
var CancelledNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/cancelled"),
  params: CancelledNotificationParamsSchema
});
var IconSchema = object({
  /**
   * URL or data URI for the icon.
   */
  src: string(),
  /**
   * Optional MIME type for the icon.
   */
  mimeType: string().optional(),
  /**
   * Optional array of strings that specify sizes at which the icon can be used.
   * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
   *
   * If not provided, the client should assume that the icon can be used at any size.
   */
  sizes: array(string()).optional(),
  /**
   * Optional specifier for the theme this icon is designed for. `light` indicates
   * the icon is designed to be used with a light background, and `dark` indicates
   * the icon is designed to be used with a dark background.
   *
   * If not provided, the client should assume the icon can be used with any theme.
   */
  theme: _enum(["light", "dark"]).optional()
});
var IconsSchema = object({
  /**
   * Optional set of sized icons that the client can display in a user interface.
   *
   * Clients that support rendering icons MUST support at least the following MIME types:
   * - `image/png` - PNG images (safe, universal compatibility)
   * - `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)
   *
   * Clients that support rendering icons SHOULD also support:
   * - `image/svg+xml` - SVG images (scalable but requires security precautions)
   * - `image/webp` - WebP images (modern, efficient format)
   */
  icons: array(IconSchema).optional()
});
var BaseMetadataSchema = object({
  /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
  name: string(),
  /**
   * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
   * even by those unfamiliar with domain-specific terminology.
   *
   * If not provided, the name should be used for display (except for Tool,
   * where `annotations.title` should be given precedence over using `name`,
   * if present).
   */
  title: string().optional()
});
var ImplementationSchema = BaseMetadataSchema.extend({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  version: string(),
  /**
   * An optional URL of the website for this implementation.
   */
  websiteUrl: string().optional(),
  /**
   * An optional human-readable description of what this implementation does.
   *
   * This can be used by clients or servers to provide context about their purpose
   * and capabilities. For example, a server might describe the types of resources
   * or tools it provides, while a client might describe its intended use case.
   */
  description: string().optional()
});
var FormElicitationCapabilitySchema = intersection(object({
  applyDefaults: boolean().optional()
}), record(string(), unknown()));
var ElicitationCapabilitySchema = preprocess((value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (Object.keys(value).length === 0) {
      return { form: {} };
    }
  }
  return value;
}, intersection(object({
  form: FormElicitationCapabilitySchema.optional(),
  url: AssertObjectSchema.optional()
}), record(string(), unknown()).optional()));
var ClientTasksCapabilitySchema = looseObject({
  /**
   * Present if the client supports listing tasks.
   */
  list: AssertObjectSchema.optional(),
  /**
   * Present if the client supports cancelling tasks.
   */
  cancel: AssertObjectSchema.optional(),
  /**
   * Capabilities for task creation on specific request types.
   */
  requests: looseObject({
    /**
     * Task support for sampling requests.
     */
    sampling: looseObject({
      createMessage: AssertObjectSchema.optional()
    }).optional(),
    /**
     * Task support for elicitation requests.
     */
    elicitation: looseObject({
      create: AssertObjectSchema.optional()
    }).optional()
  }).optional()
});
var ServerTasksCapabilitySchema = looseObject({
  /**
   * Present if the server supports listing tasks.
   */
  list: AssertObjectSchema.optional(),
  /**
   * Present if the server supports cancelling tasks.
   */
  cancel: AssertObjectSchema.optional(),
  /**
   * Capabilities for task creation on specific request types.
   */
  requests: looseObject({
    /**
     * Task support for tool requests.
     */
    tools: looseObject({
      call: AssertObjectSchema.optional()
    }).optional()
  }).optional()
});
var ClientCapabilitiesSchema = object({
  /**
   * Experimental, non-standard capabilities that the client supports.
   */
  experimental: record(string(), AssertObjectSchema).optional(),
  /**
   * Present if the client supports sampling from an LLM.
   */
  sampling: object({
    /**
     * Present if the client supports context inclusion via includeContext parameter.
     * If not declared, servers SHOULD only use `includeContext: "none"` (or omit it).
     */
    context: AssertObjectSchema.optional(),
    /**
     * Present if the client supports tool use via tools and toolChoice parameters.
     */
    tools: AssertObjectSchema.optional()
  }).optional(),
  /**
   * Present if the client supports eliciting user input.
   */
  elicitation: ElicitationCapabilitySchema.optional(),
  /**
   * Present if the client supports listing roots.
   */
  roots: object({
    /**
     * Whether the client supports issuing notifications for changes to the roots list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the client supports task creation.
   */
  tasks: ClientTasksCapabilitySchema.optional(),
  /**
   * Extensions that the client supports. Keys are extension identifiers (vendor-prefix/extension-name).
   */
  extensions: record(string(), AssertObjectSchema).optional()
});
var InitializeRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
   */
  protocolVersion: string(),
  capabilities: ClientCapabilitiesSchema,
  clientInfo: ImplementationSchema
});
var InitializeRequestSchema = RequestSchema.extend({
  method: literal("initialize"),
  params: InitializeRequestParamsSchema
});
var isInitializeRequest = (value) => InitializeRequestSchema.safeParse(value).success;
var ServerCapabilitiesSchema = object({
  /**
   * Experimental, non-standard capabilities that the server supports.
   */
  experimental: record(string(), AssertObjectSchema).optional(),
  /**
   * Present if the server supports sending log messages to the client.
   */
  logging: AssertObjectSchema.optional(),
  /**
   * Present if the server supports sending completions to the client.
   */
  completions: AssertObjectSchema.optional(),
  /**
   * Present if the server offers any prompt templates.
   */
  prompts: object({
    /**
     * Whether this server supports issuing notifications for changes to the prompt list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the server offers any resources to read.
   */
  resources: object({
    /**
     * Whether this server supports clients subscribing to resource updates.
     */
    subscribe: boolean().optional(),
    /**
     * Whether this server supports issuing notifications for changes to the resource list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the server offers any tools to call.
   */
  tools: object({
    /**
     * Whether this server supports issuing notifications for changes to the tool list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the server supports task creation.
   */
  tasks: ServerTasksCapabilitySchema.optional(),
  /**
   * Extensions that the server supports. Keys are extension identifiers (vendor-prefix/extension-name).
   */
  extensions: record(string(), AssertObjectSchema).optional()
});
var InitializeResultSchema = ResultSchema.extend({
  /**
   * The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
   */
  protocolVersion: string(),
  capabilities: ServerCapabilitiesSchema,
  serverInfo: ImplementationSchema,
  /**
   * Instructions describing how to use the server and its features.
   *
   * This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.
   */
  instructions: string().optional()
});
var InitializedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/initialized"),
  params: NotificationsParamsSchema.optional()
});
var PingRequestSchema = RequestSchema.extend({
  method: literal("ping"),
  params: BaseRequestParamsSchema.optional()
});
var ProgressSchema = object({
  /**
   * The progress thus far. This should increase every time progress is made, even if the total is unknown.
   */
  progress: number(),
  /**
   * Total number of items to process (or total progress required), if known.
   */
  total: optional(number()),
  /**
   * An optional message describing the current progress.
   */
  message: optional(string())
});
var ProgressNotificationParamsSchema = object({
  ...NotificationsParamsSchema.shape,
  ...ProgressSchema.shape,
  /**
   * The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
   */
  progressToken: ProgressTokenSchema
});
var ProgressNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/progress"),
  params: ProgressNotificationParamsSchema
});
var PaginatedRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * An opaque token representing the current pagination position.
   * If provided, the server should return results starting after this cursor.
   */
  cursor: CursorSchema.optional()
});
var PaginatedRequestSchema = RequestSchema.extend({
  params: PaginatedRequestParamsSchema.optional()
});
var PaginatedResultSchema = ResultSchema.extend({
  /**
   * An opaque token representing the pagination position after the last returned result.
   * If present, there may be more results available.
   */
  nextCursor: CursorSchema.optional()
});
var TaskStatusSchema = _enum(["working", "input_required", "completed", "failed", "cancelled"]);
var TaskSchema = object({
  taskId: string(),
  status: TaskStatusSchema,
  /**
   * Time in milliseconds to keep task results available after completion.
   * If null, the task has unlimited lifetime until manually cleaned up.
   */
  ttl: union([number(), _null2()]),
  /**
   * ISO 8601 timestamp when the task was created.
   */
  createdAt: string(),
  /**
   * ISO 8601 timestamp when the task was last updated.
   */
  lastUpdatedAt: string(),
  pollInterval: optional(number()),
  /**
   * Optional diagnostic message for failed tasks or other status information.
   */
  statusMessage: optional(string())
});
var CreateTaskResultSchema = ResultSchema.extend({
  task: TaskSchema
});
var TaskStatusNotificationParamsSchema = NotificationsParamsSchema.merge(TaskSchema);
var TaskStatusNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/tasks/status"),
  params: TaskStatusNotificationParamsSchema
});
var GetTaskRequestSchema = RequestSchema.extend({
  method: literal("tasks/get"),
  params: BaseRequestParamsSchema.extend({
    taskId: string()
  })
});
var GetTaskResultSchema = ResultSchema.merge(TaskSchema);
var GetTaskPayloadRequestSchema = RequestSchema.extend({
  method: literal("tasks/result"),
  params: BaseRequestParamsSchema.extend({
    taskId: string()
  })
});
ResultSchema.loose();
var ListTasksRequestSchema = PaginatedRequestSchema.extend({
  method: literal("tasks/list")
});
var ListTasksResultSchema = PaginatedResultSchema.extend({
  tasks: array(TaskSchema)
});
var CancelTaskRequestSchema = RequestSchema.extend({
  method: literal("tasks/cancel"),
  params: BaseRequestParamsSchema.extend({
    taskId: string()
  })
});
var CancelTaskResultSchema = ResultSchema.merge(TaskSchema);
var ResourceContentsSchema = object({
  /**
   * The URI of this resource.
   */
  uri: string(),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: optional(string()),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var TextResourceContentsSchema = ResourceContentsSchema.extend({
  /**
   * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
   */
  text: string()
});
var Base64Schema = string().refine((val) => {
  try {
    atob(val);
    return true;
  } catch {
    return false;
  }
}, { message: "Invalid Base64 string" });
var BlobResourceContentsSchema = ResourceContentsSchema.extend({
  /**
   * A base64-encoded string representing the binary data of the item.
   */
  blob: Base64Schema
});
var RoleSchema = _enum(["user", "assistant"]);
var AnnotationsSchema = object({
  /**
   * Intended audience(s) for the resource.
   */
  audience: array(RoleSchema).optional(),
  /**
   * Importance hint for the resource, from 0 (least) to 1 (most).
   */
  priority: number().min(0).max(1).optional(),
  /**
   * ISO 8601 timestamp for the most recent modification.
   */
  lastModified: iso_exports.datetime({ offset: true }).optional()
});
var ResourceSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * The URI of this resource.
   */
  uri: string(),
  /**
   * A description of what this resource represents.
   *
   * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
   */
  description: optional(string()),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: optional(string()),
  /**
   * The size of the raw resource content, in bytes (i.e., before base64 encoding or any tokenization), if known.
   *
   * This can be used by Hosts to display file sizes and estimate context window usage.
   */
  size: optional(number()),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: optional(looseObject({}))
});
var ResourceTemplateSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * A URI template (according to RFC 6570) that can be used to construct resource URIs.
   */
  uriTemplate: string(),
  /**
   * A description of what this template is for.
   *
   * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
   */
  description: optional(string()),
  /**
   * The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
   */
  mimeType: optional(string()),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: optional(looseObject({}))
});
var ListResourcesRequestSchema = PaginatedRequestSchema.extend({
  method: literal("resources/list")
});
var ListResourcesResultSchema = PaginatedResultSchema.extend({
  resources: array(ResourceSchema)
});
var ListResourceTemplatesRequestSchema = PaginatedRequestSchema.extend({
  method: literal("resources/templates/list")
});
var ListResourceTemplatesResultSchema = PaginatedResultSchema.extend({
  resourceTemplates: array(ResourceTemplateSchema)
});
var ResourceRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The URI of the resource to read. The URI can use any protocol; it is up to the server how to interpret it.
   *
   * @format uri
   */
  uri: string()
});
var ReadResourceRequestParamsSchema = ResourceRequestParamsSchema;
var ReadResourceRequestSchema = RequestSchema.extend({
  method: literal("resources/read"),
  params: ReadResourceRequestParamsSchema
});
var ReadResourceResultSchema = ResultSchema.extend({
  contents: array(union([TextResourceContentsSchema, BlobResourceContentsSchema]))
});
var ResourceListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/resources/list_changed"),
  params: NotificationsParamsSchema.optional()
});
var SubscribeRequestParamsSchema = ResourceRequestParamsSchema;
var SubscribeRequestSchema = RequestSchema.extend({
  method: literal("resources/subscribe"),
  params: SubscribeRequestParamsSchema
});
var UnsubscribeRequestParamsSchema = ResourceRequestParamsSchema;
var UnsubscribeRequestSchema = RequestSchema.extend({
  method: literal("resources/unsubscribe"),
  params: UnsubscribeRequestParamsSchema
});
var ResourceUpdatedNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
   */
  uri: string()
});
var ResourceUpdatedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/resources/updated"),
  params: ResourceUpdatedNotificationParamsSchema
});
var PromptArgumentSchema = object({
  /**
   * The name of the argument.
   */
  name: string(),
  /**
   * A human-readable description of the argument.
   */
  description: optional(string()),
  /**
   * Whether this argument must be provided.
   */
  required: optional(boolean())
});
var PromptSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * An optional description of what this prompt provides
   */
  description: optional(string()),
  /**
   * A list of arguments to use for templating the prompt.
   */
  arguments: optional(array(PromptArgumentSchema)),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: optional(looseObject({}))
});
var ListPromptsRequestSchema = PaginatedRequestSchema.extend({
  method: literal("prompts/list")
});
var ListPromptsResultSchema = PaginatedResultSchema.extend({
  prompts: array(PromptSchema)
});
var GetPromptRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The name of the prompt or prompt template.
   */
  name: string(),
  /**
   * Arguments to use for templating the prompt.
   */
  arguments: record(string(), string()).optional()
});
var GetPromptRequestSchema = RequestSchema.extend({
  method: literal("prompts/get"),
  params: GetPromptRequestParamsSchema
});
var TextContentSchema = object({
  type: literal("text"),
  /**
   * The text content of the message.
   */
  text: string(),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ImageContentSchema = object({
  type: literal("image"),
  /**
   * The base64-encoded image data.
   */
  data: Base64Schema,
  /**
   * The MIME type of the image. Different providers may support different image types.
   */
  mimeType: string(),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var AudioContentSchema = object({
  type: literal("audio"),
  /**
   * The base64-encoded audio data.
   */
  data: Base64Schema,
  /**
   * The MIME type of the audio. Different providers may support different audio types.
   */
  mimeType: string(),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ToolUseContentSchema = object({
  type: literal("tool_use"),
  /**
   * The name of the tool to invoke.
   * Must match a tool name from the request's tools array.
   */
  name: string(),
  /**
   * Unique identifier for this tool call.
   * Used to correlate with ToolResultContent in subsequent messages.
   */
  id: string(),
  /**
   * Arguments to pass to the tool.
   * Must conform to the tool's inputSchema.
   */
  input: record(string(), unknown()),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var EmbeddedResourceSchema = object({
  type: literal("resource"),
  resource: union([TextResourceContentsSchema, BlobResourceContentsSchema]),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ResourceLinkSchema = ResourceSchema.extend({
  type: literal("resource_link")
});
var ContentBlockSchema = union([
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema,
  ResourceLinkSchema,
  EmbeddedResourceSchema
]);
var PromptMessageSchema = object({
  role: RoleSchema,
  content: ContentBlockSchema
});
var GetPromptResultSchema = ResultSchema.extend({
  /**
   * An optional description for the prompt.
   */
  description: string().optional(),
  messages: array(PromptMessageSchema)
});
var PromptListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/prompts/list_changed"),
  params: NotificationsParamsSchema.optional()
});
var ToolAnnotationsSchema = object({
  /**
   * A human-readable title for the tool.
   */
  title: string().optional(),
  /**
   * If true, the tool does not modify its environment.
   *
   * Default: false
   */
  readOnlyHint: boolean().optional(),
  /**
   * If true, the tool may perform destructive updates to its environment.
   * If false, the tool performs only additive updates.
   *
   * (This property is meaningful only when `readOnlyHint == false`)
   *
   * Default: true
   */
  destructiveHint: boolean().optional(),
  /**
   * If true, calling the tool repeatedly with the same arguments
   * will have no additional effect on the its environment.
   *
   * (This property is meaningful only when `readOnlyHint == false`)
   *
   * Default: false
   */
  idempotentHint: boolean().optional(),
  /**
   * If true, this tool may interact with an "open world" of external
   * entities. If false, the tool's domain of interaction is closed.
   * For example, the world of a web search tool is open, whereas that
   * of a memory tool is not.
   *
   * Default: true
   */
  openWorldHint: boolean().optional()
});
var ToolExecutionSchema = object({
  /**
   * Indicates the tool's preference for task-augmented execution.
   * - "required": Clients MUST invoke the tool as a task
   * - "optional": Clients MAY invoke the tool as a task or normal request
   * - "forbidden": Clients MUST NOT attempt to invoke the tool as a task
   *
   * If not present, defaults to "forbidden".
   */
  taskSupport: _enum(["required", "optional", "forbidden"]).optional()
});
var ToolSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * A human-readable description of the tool.
   */
  description: string().optional(),
  /**
   * A JSON Schema 2020-12 object defining the expected parameters for the tool.
   * Must have type: 'object' at the root level per MCP spec.
   */
  inputSchema: object({
    type: literal("object"),
    properties: record(string(), AssertObjectSchema).optional(),
    required: array(string()).optional()
  }).catchall(unknown()),
  /**
   * An optional JSON Schema 2020-12 object defining the structure of the tool's output
   * returned in the structuredContent field of a CallToolResult.
   * Must have type: 'object' at the root level per MCP spec.
   */
  outputSchema: object({
    type: literal("object"),
    properties: record(string(), AssertObjectSchema).optional(),
    required: array(string()).optional()
  }).catchall(unknown()).optional(),
  /**
   * Optional additional tool information.
   */
  annotations: ToolAnnotationsSchema.optional(),
  /**
   * Execution-related properties for this tool.
   */
  execution: ToolExecutionSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ListToolsRequestSchema = PaginatedRequestSchema.extend({
  method: literal("tools/list")
});
var ListToolsResultSchema = PaginatedResultSchema.extend({
  tools: array(ToolSchema)
});
var CallToolResultSchema = ResultSchema.extend({
  /**
   * A list of content objects that represent the result of the tool call.
   *
   * If the Tool does not define an outputSchema, this field MUST be present in the result.
   * For backwards compatibility, this field is always present, but it may be empty.
   */
  content: array(ContentBlockSchema).default([]),
  /**
   * An object containing structured tool output.
   *
   * If the Tool defines an outputSchema, this field MUST be present in the result, and contain a JSON object that matches the schema.
   */
  structuredContent: record(string(), unknown()).optional(),
  /**
   * Whether the tool call ended in an error.
   *
   * If not set, this is assumed to be false (the call was successful).
   *
   * Any errors that originate from the tool SHOULD be reported inside the result
   * object, with `isError` set to true, _not_ as an MCP protocol-level error
   * response. Otherwise, the LLM would not be able to see that an error occurred
   * and self-correct.
   *
   * However, any errors in _finding_ the tool, an error indicating that the
   * server does not support tool calls, or any other exceptional conditions,
   * should be reported as an MCP error response.
   */
  isError: boolean().optional()
});
CallToolResultSchema.or(ResultSchema.extend({
  toolResult: unknown()
}));
var CallToolRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  /**
   * The name of the tool to call.
   */
  name: string(),
  /**
   * Arguments to pass to the tool.
   */
  arguments: record(string(), unknown()).optional()
});
var CallToolRequestSchema = RequestSchema.extend({
  method: literal("tools/call"),
  params: CallToolRequestParamsSchema
});
var ToolListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/tools/list_changed"),
  params: NotificationsParamsSchema.optional()
});
object({
  /**
   * If true, the list will be refreshed automatically when a list changed notification is received.
   * The callback will be called with the updated list.
   *
   * If false, the callback will be called with null items, allowing manual refresh.
   *
   * @default true
   */
  autoRefresh: boolean().default(true),
  /**
   * Debounce time in milliseconds for list changed notification processing.
   *
   * Multiple notifications received within this timeframe will only trigger one refresh.
   * Set to 0 to disable debouncing.
   *
   * @default 300
   */
  debounceMs: number().int().nonnegative().default(300)
});
var LoggingLevelSchema = _enum(["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"]);
var SetLevelRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/logging/message.
   */
  level: LoggingLevelSchema
});
var SetLevelRequestSchema = RequestSchema.extend({
  method: literal("logging/setLevel"),
  params: SetLevelRequestParamsSchema
});
var LoggingMessageNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The severity of this log message.
   */
  level: LoggingLevelSchema,
  /**
   * An optional name of the logger issuing this message.
   */
  logger: string().optional(),
  /**
   * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
   */
  data: unknown()
});
var LoggingMessageNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/message"),
  params: LoggingMessageNotificationParamsSchema
});
var ModelHintSchema = object({
  /**
   * A hint for a model name.
   */
  name: string().optional()
});
var ModelPreferencesSchema = object({
  /**
   * Optional hints to use for model selection.
   */
  hints: array(ModelHintSchema).optional(),
  /**
   * How much to prioritize cost when selecting a model.
   */
  costPriority: number().min(0).max(1).optional(),
  /**
   * How much to prioritize sampling speed (latency) when selecting a model.
   */
  speedPriority: number().min(0).max(1).optional(),
  /**
   * How much to prioritize intelligence and capabilities when selecting a model.
   */
  intelligencePriority: number().min(0).max(1).optional()
});
var ToolChoiceSchema = object({
  /**
   * Controls when tools are used:
   * - "auto": Model decides whether to use tools (default)
   * - "required": Model MUST use at least one tool before completing
   * - "none": Model MUST NOT use any tools
   */
  mode: _enum(["auto", "required", "none"]).optional()
});
var ToolResultContentSchema = object({
  type: literal("tool_result"),
  toolUseId: string().describe("The unique identifier for the corresponding tool call."),
  content: array(ContentBlockSchema).default([]),
  structuredContent: object({}).loose().optional(),
  isError: boolean().optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var SamplingContentSchema = discriminatedUnion("type", [TextContentSchema, ImageContentSchema, AudioContentSchema]);
var SamplingMessageContentBlockSchema = discriminatedUnion("type", [
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema,
  ToolUseContentSchema,
  ToolResultContentSchema
]);
var SamplingMessageSchema = object({
  role: RoleSchema,
  content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)]),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var CreateMessageRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  messages: array(SamplingMessageSchema),
  /**
   * The server's preferences for which model to select. The client MAY modify or omit this request.
   */
  modelPreferences: ModelPreferencesSchema.optional(),
  /**
   * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
   */
  systemPrompt: string().optional(),
  /**
   * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt.
   * The client MAY ignore this request.
   *
   * Default is "none". Values "thisServer" and "allServers" are soft-deprecated. Servers SHOULD only use these values if the client
   * declares ClientCapabilities.sampling.context. These values may be removed in future spec releases.
   */
  includeContext: _enum(["none", "thisServer", "allServers"]).optional(),
  temperature: number().optional(),
  /**
   * The requested maximum number of tokens to sample (to prevent runaway completions).
   *
   * The client MAY choose to sample fewer tokens than the requested maximum.
   */
  maxTokens: number().int(),
  stopSequences: array(string()).optional(),
  /**
   * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
   */
  metadata: AssertObjectSchema.optional(),
  /**
   * Tools that the model may use during generation.
   * The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.
   */
  tools: array(ToolSchema).optional(),
  /**
   * Controls how the model uses tools.
   * The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.
   * Default is `{ mode: "auto" }`.
   */
  toolChoice: ToolChoiceSchema.optional()
});
var CreateMessageRequestSchema = RequestSchema.extend({
  method: literal("sampling/createMessage"),
  params: CreateMessageRequestParamsSchema
});
var CreateMessageResultSchema = ResultSchema.extend({
  /**
   * The name of the model that generated the message.
   */
  model: string(),
  /**
   * The reason why sampling stopped, if known.
   *
   * Standard values:
   * - "endTurn": Natural end of the assistant's turn
   * - "stopSequence": A stop sequence was encountered
   * - "maxTokens": Maximum token limit was reached
   *
   * This field is an open string to allow for provider-specific stop reasons.
   */
  stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens"]).or(string())),
  role: RoleSchema,
  /**
   * Response content. Single content block (text, image, or audio).
   */
  content: SamplingContentSchema
});
var CreateMessageResultWithToolsSchema = ResultSchema.extend({
  /**
   * The name of the model that generated the message.
   */
  model: string(),
  /**
   * The reason why sampling stopped, if known.
   *
   * Standard values:
   * - "endTurn": Natural end of the assistant's turn
   * - "stopSequence": A stop sequence was encountered
   * - "maxTokens": Maximum token limit was reached
   * - "toolUse": The model wants to use one or more tools
   *
   * This field is an open string to allow for provider-specific stop reasons.
   */
  stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens", "toolUse"]).or(string())),
  role: RoleSchema,
  /**
   * Response content. May be a single block or array. May include ToolUseContent if stopReason is "toolUse".
   */
  content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)])
});
var BooleanSchemaSchema = object({
  type: literal("boolean"),
  title: string().optional(),
  description: string().optional(),
  default: boolean().optional()
});
var StringSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  minLength: number().optional(),
  maxLength: number().optional(),
  format: _enum(["email", "uri", "date", "date-time"]).optional(),
  default: string().optional()
});
var NumberSchemaSchema = object({
  type: _enum(["number", "integer"]),
  title: string().optional(),
  description: string().optional(),
  minimum: number().optional(),
  maximum: number().optional(),
  default: number().optional()
});
var UntitledSingleSelectEnumSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  enum: array(string()),
  default: string().optional()
});
var TitledSingleSelectEnumSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  oneOf: array(object({
    const: string(),
    title: string()
  })),
  default: string().optional()
});
var LegacyTitledEnumSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  enum: array(string()),
  enumNames: array(string()).optional(),
  default: string().optional()
});
var SingleSelectEnumSchemaSchema = union([UntitledSingleSelectEnumSchemaSchema, TitledSingleSelectEnumSchemaSchema]);
var UntitledMultiSelectEnumSchemaSchema = object({
  type: literal("array"),
  title: string().optional(),
  description: string().optional(),
  minItems: number().optional(),
  maxItems: number().optional(),
  items: object({
    type: literal("string"),
    enum: array(string())
  }),
  default: array(string()).optional()
});
var TitledMultiSelectEnumSchemaSchema = object({
  type: literal("array"),
  title: string().optional(),
  description: string().optional(),
  minItems: number().optional(),
  maxItems: number().optional(),
  items: object({
    anyOf: array(object({
      const: string(),
      title: string()
    }))
  }),
  default: array(string()).optional()
});
var MultiSelectEnumSchemaSchema = union([UntitledMultiSelectEnumSchemaSchema, TitledMultiSelectEnumSchemaSchema]);
var EnumSchemaSchema = union([LegacyTitledEnumSchemaSchema, SingleSelectEnumSchemaSchema, MultiSelectEnumSchemaSchema]);
var PrimitiveSchemaDefinitionSchema = union([EnumSchemaSchema, BooleanSchemaSchema, StringSchemaSchema, NumberSchemaSchema]);
var ElicitRequestFormParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  /**
   * The elicitation mode.
   *
   * Optional for backward compatibility. Clients MUST treat missing mode as "form".
   */
  mode: literal("form").optional(),
  /**
   * The message to present to the user describing what information is being requested.
   */
  message: string(),
  /**
   * A restricted subset of JSON Schema.
   * Only top-level properties are allowed, without nesting.
   */
  requestedSchema: object({
    type: literal("object"),
    properties: record(string(), PrimitiveSchemaDefinitionSchema),
    required: array(string()).optional()
  })
});
var ElicitRequestURLParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  /**
   * The elicitation mode.
   */
  mode: literal("url"),
  /**
   * The message to present to the user explaining why the interaction is needed.
   */
  message: string(),
  /**
   * The ID of the elicitation, which must be unique within the context of the server.
   * The client MUST treat this ID as an opaque value.
   */
  elicitationId: string(),
  /**
   * The URL that the user should navigate to.
   */
  url: string().url()
});
var ElicitRequestParamsSchema = union([ElicitRequestFormParamsSchema, ElicitRequestURLParamsSchema]);
var ElicitRequestSchema = RequestSchema.extend({
  method: literal("elicitation/create"),
  params: ElicitRequestParamsSchema
});
var ElicitationCompleteNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The ID of the elicitation that completed.
   */
  elicitationId: string()
});
var ElicitationCompleteNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/elicitation/complete"),
  params: ElicitationCompleteNotificationParamsSchema
});
var ElicitResultSchema = ResultSchema.extend({
  /**
   * The user action in response to the elicitation.
   * - "accept": User submitted the form/confirmed the action
   * - "decline": User explicitly decline the action
   * - "cancel": User dismissed without making an explicit choice
   */
  action: _enum(["accept", "decline", "cancel"]),
  /**
   * The submitted form data, only present when action is "accept".
   * Contains values matching the requested schema.
   * Per MCP spec, content is "typically omitted" for decline/cancel actions.
   * We normalize null to undefined for leniency while maintaining type compatibility.
   */
  content: preprocess((val) => val === null ? void 0 : val, record(string(), union([string(), number(), boolean(), array(string())])).optional())
});
var ResourceTemplateReferenceSchema = object({
  type: literal("ref/resource"),
  /**
   * The URI or URI template of the resource.
   */
  uri: string()
});
var PromptReferenceSchema = object({
  type: literal("ref/prompt"),
  /**
   * The name of the prompt or prompt template
   */
  name: string()
});
var CompleteRequestParamsSchema = BaseRequestParamsSchema.extend({
  ref: union([PromptReferenceSchema, ResourceTemplateReferenceSchema]),
  /**
   * The argument's information
   */
  argument: object({
    /**
     * The name of the argument
     */
    name: string(),
    /**
     * The value of the argument to use for completion matching.
     */
    value: string()
  }),
  context: object({
    /**
     * Previously-resolved variables in a URI template or prompt.
     */
    arguments: record(string(), string()).optional()
  }).optional()
});
var CompleteRequestSchema = RequestSchema.extend({
  method: literal("completion/complete"),
  params: CompleteRequestParamsSchema
});
function assertCompleteRequestPrompt(request) {
  if (request.params.ref.type !== "ref/prompt") {
    throw new TypeError(`Expected CompleteRequestPrompt, but got ${request.params.ref.type}`);
  }
}
function assertCompleteRequestResourceTemplate(request) {
  if (request.params.ref.type !== "ref/resource") {
    throw new TypeError(`Expected CompleteRequestResourceTemplate, but got ${request.params.ref.type}`);
  }
}
var CompleteResultSchema = ResultSchema.extend({
  completion: looseObject({
    /**
     * An array of completion values. Must not exceed 100 items.
     */
    values: array(string()).max(100),
    /**
     * The total number of completion options available. This can exceed the number of values actually sent in the response.
     */
    total: optional(number().int()),
    /**
     * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
     */
    hasMore: optional(boolean())
  })
});
var RootSchema = object({
  /**
   * The URI identifying the root. This *must* start with file:// for now.
   */
  uri: string().startsWith("file://"),
  /**
   * An optional name for the root.
   */
  name: string().optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ListRootsRequestSchema = RequestSchema.extend({
  method: literal("roots/list"),
  params: BaseRequestParamsSchema.optional()
});
var ListRootsResultSchema = ResultSchema.extend({
  roots: array(RootSchema)
});
var RootsListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/roots/list_changed"),
  params: NotificationsParamsSchema.optional()
});
union([
  PingRequestSchema,
  InitializeRequestSchema,
  CompleteRequestSchema,
  SetLevelRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema
]);
union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  InitializedNotificationSchema,
  RootsListChangedNotificationSchema,
  TaskStatusNotificationSchema
]);
union([
  EmptyResultSchema,
  CreateMessageResultSchema,
  CreateMessageResultWithToolsSchema,
  ElicitResultSchema,
  ListRootsResultSchema,
  GetTaskResultSchema,
  ListTasksResultSchema,
  CreateTaskResultSchema
]);
union([
  PingRequestSchema,
  CreateMessageRequestSchema,
  ElicitRequestSchema,
  ListRootsRequestSchema,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema
]);
union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  LoggingMessageNotificationSchema,
  ResourceUpdatedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ToolListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
  TaskStatusNotificationSchema,
  ElicitationCompleteNotificationSchema
]);
union([
  EmptyResultSchema,
  InitializeResultSchema,
  CompleteResultSchema,
  GetPromptResultSchema,
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ReadResourceResultSchema,
  CallToolResultSchema,
  ListToolsResultSchema,
  GetTaskResultSchema,
  ListTasksResultSchema,
  CreateTaskResultSchema
]);
var McpError = class _McpError extends Error {
  constructor(code, message, data) {
    super(`MCP error ${code}: ${message}`);
    this.code = code;
    this.data = data;
    this.name = "McpError";
  }
  /**
   * Factory method to create the appropriate error type based on the error code and data
   */
  static fromError(code, message, data) {
    if (code === ErrorCode.UrlElicitationRequired && data) {
      const errorData = data;
      if (errorData.elicitations) {
        return new UrlElicitationRequiredError(errorData.elicitations, message);
      }
    }
    return new _McpError(code, message, data);
  }
};
var UrlElicitationRequiredError = class extends McpError {
  constructor(elicitations, message = `URL elicitation${elicitations.length > 1 ? "s" : ""} required`) {
    super(ErrorCode.UrlElicitationRequired, message, {
      elicitations
    });
  }
  get elicitations() {
    return this.data?.elicitations ?? [];
  }
};
createRequire(import.meta.url);
var require_content_type = __commonJS({
  "node_modules/content-type/index.js"(exports) {
    var PARAM_REGEXP = /; *([!#$%&'*+.^_`|~0-9A-Za-z-]+) *= *("(?:[\u000b\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u000b\u0020-\u00ff])*"|[!#$%&'*+.^_`|~0-9A-Za-z-]+) */g;
    var TEXT_REGEXP = /^[\u000b\u0020-\u007e\u0080-\u00ff]+$/;
    var TOKEN_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
    var QESC_REGEXP = /\\([\u000b\u0020-\u00ff])/g;
    var QUOTE_REGEXP = /([\\"])/g;
    var TYPE_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
    exports.format = format;
    exports.parse = parse;
    function format(obj) {
      if (!obj || typeof obj !== "object") {
        throw new TypeError("argument obj is required");
      }
      var parameters = obj.parameters;
      var type = obj.type;
      if (!type || !TYPE_REGEXP.test(type)) {
        throw new TypeError("invalid type");
      }
      var string2 = type;
      if (parameters && typeof parameters === "object") {
        var param;
        var params = Object.keys(parameters).sort();
        for (var i = 0; i < params.length; i++) {
          param = params[i];
          if (!TOKEN_REGEXP.test(param)) {
            throw new TypeError("invalid parameter name");
          }
          string2 += "; " + param + "=" + qstring(parameters[param]);
        }
      }
      return string2;
    }
    function parse(string2) {
      if (!string2) {
        throw new TypeError("argument string is required");
      }
      var header = typeof string2 === "object" ? getcontenttype(string2) : string2;
      if (typeof header !== "string") {
        throw new TypeError("argument string is required to be a string");
      }
      var index = header.indexOf(";");
      var type = index !== -1 ? header.slice(0, index).trim() : header.trim();
      if (!TYPE_REGEXP.test(type)) {
        throw new TypeError("invalid media type");
      }
      var obj = new ContentType(type.toLowerCase());
      if (index !== -1) {
        var key;
        var match;
        var value;
        PARAM_REGEXP.lastIndex = index;
        while (match = PARAM_REGEXP.exec(header)) {
          if (match.index !== index) {
            throw new TypeError("invalid parameter format");
          }
          index += match[0].length;
          key = match[1].toLowerCase();
          value = match[2];
          if (value.charCodeAt(0) === 34) {
            value = value.slice(1, -1);
            if (value.indexOf("\\") !== -1) {
              value = value.replace(QESC_REGEXP, "$1");
            }
          }
          obj.parameters[key] = value;
        }
        if (index !== header.length) {
          throw new TypeError("invalid parameter format");
        }
      }
      return obj;
    }
    function getcontenttype(obj) {
      var header;
      if (typeof obj.getHeader === "function") {
        header = obj.getHeader("content-type");
      } else if (typeof obj.headers === "object") {
        header = obj.headers && obj.headers["content-type"];
      }
      if (typeof header !== "string") {
        throw new TypeError("content-type header is missing from object");
      }
      return header;
    }
    function qstring(val) {
      var str = String(val);
      if (TOKEN_REGEXP.test(str)) {
        return str;
      }
      if (str.length > 0 && !TEXT_REGEXP.test(str)) {
        throw new TypeError("invalid parameter value");
      }
      return '"' + str.replace(QUOTE_REGEXP, "\\$1") + '"';
    }
    function ContentType(type) {
      this.parameters = /* @__PURE__ */ Object.create(null);
      this.type = type;
    }
  }
});
var import_content_type = __toESM(require_content_type(), 1);
function mediaTypeEssence(header) {
  if (!header) {
    return void 0;
  }
  try {
    return import_content_type.default.parse(header).type;
  } catch {
    const essence = (header.split(";", 1)[0] ?? "").trim().toLowerCase();
    if (essence === "" || header.slice(essence.length).includes(",")) {
      return void 0;
    }
    return essence;
  }
}
function isJsonContentType(header) {
  if (header === "application/json") {
    return true;
  }
  return mediaTypeEssence(header) === "application/json";
}
var DEFAULT_SSE_KEEP_ALIVE_MS = 15e3;
var MAX_TIMER_DELAY_MS = 2 ** 31 - 1;
function armSseKeepAlive(intervalMs, onTick) {
  if (!Number.isFinite(intervalMs) || intervalMs < 1) {
    return void 0;
  }
  const timer = setInterval(onTick, Math.min(intervalMs, MAX_TIMER_DELAY_MS));
  timer.unref?.();
  return timer;
}
var WebStandardStreamableHTTPServerTransport = class {
  constructor(options = {}) {
    this._started = false;
    this._hasHandledRequest = false;
    this._streamMapping = /* @__PURE__ */ new Map();
    this._requestToStreamMapping = /* @__PURE__ */ new Map();
    this._resumableStreams = /* @__PURE__ */ new Set();
    this._requestResponseMap = /* @__PURE__ */ new Map();
    this._initialized = false;
    this._enableJsonResponse = false;
    this._standaloneSseStreamId = "_GET_stream";
    this._closed = false;
    this.sessionIdGenerator = options.sessionIdGenerator;
    this._enableJsonResponse = options.enableJsonResponse ?? false;
    this._eventStore = options.eventStore;
    this._onsessioninitialized = options.onsessioninitialized;
    this._onsessionclosed = options.onsessionclosed;
    this._allowedHosts = options.allowedHosts;
    this._allowedOrigins = options.allowedOrigins;
    this._enableDnsRebindingProtection = options.enableDnsRebindingProtection ?? false;
    this._retryInterval = options.retryInterval;
    this._keepAliveMs = options.keepAliveMs ?? DEFAULT_SSE_KEEP_ALIVE_MS;
  }
  /**
   * Arms a keep-alive interval for an SSE stream that periodically writes an SSE
   * comment frame so intermediaries and idle timeouts don't kill the connection.
   * The returned timer is owned by the stream it was armed for: the stream's
   * cancel/cleanup callbacks must clear it. The interval clears itself if a
   * write fails (stream already closed/cancelled).
   */
  startKeepAlive(controller, encoder) {
    if (this._closed)
      return void 0;
    const timer = armSseKeepAlive(this._keepAliveMs, () => {
      try {
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      } catch {
        if (timer !== void 0)
          clearInterval(timer);
      }
    });
    return timer;
  }
  /**
   * Starts the transport. This is required by the Transport interface but is a no-op
   * for the Streamable HTTP transport as connections are managed per-request.
   */
  async start() {
    if (this._started) {
      throw new Error("Transport already started");
    }
    this._started = true;
  }
  /**
   * Helper to create a JSON error response
   */
  createJsonErrorResponse(status, code, message, options) {
    const error = { code, message };
    if (options?.data !== void 0) {
      error.data = options.data;
    }
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      error,
      id: null
    }), {
      status,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Validates request headers for DNS rebinding protection.
   * @returns Error response if validation fails, undefined if validation passes.
   */
  validateRequestHeaders(req) {
    if (!this._enableDnsRebindingProtection) {
      return void 0;
    }
    if (this._allowedHosts && this._allowedHosts.length > 0) {
      const hostHeader = req.headers.get("host");
      if (!hostHeader || !this._allowedHosts.includes(hostHeader)) {
        const error = `Invalid Host header: ${hostHeader}`;
        this.onerror?.(new Error(error));
        return this.createJsonErrorResponse(403, -32e3, error);
      }
    }
    if (this._allowedOrigins && this._allowedOrigins.length > 0) {
      const originHeader = req.headers.get("origin");
      if (originHeader && !this._allowedOrigins.includes(originHeader)) {
        const error = `Invalid Origin header: ${originHeader}`;
        this.onerror?.(new Error(error));
        return this.createJsonErrorResponse(403, -32e3, error);
      }
    }
    return void 0;
  }
  /**
   * Handles an incoming HTTP request, whether GET, POST, or DELETE
   * Returns a Response object (Web Standard)
   */
  async handleRequest(req, options) {
    if (this._closed) {
      return this.createJsonErrorResponse(404, -32001, "Session not found");
    }
    if (!this.sessionIdGenerator && this._hasHandledRequest) {
      throw new Error("Stateless transport cannot be reused across requests. Create a new transport per request.");
    }
    this._hasHandledRequest = true;
    const validationError = this.validateRequestHeaders(req);
    if (validationError) {
      return validationError;
    }
    switch (req.method) {
      case "POST":
        return this.handlePostRequest(req, options);
      case "GET":
        return this.handleGetRequest(req);
      case "DELETE":
        return this.handleDeleteRequest(req);
      default:
        return this.handleUnsupportedRequest();
    }
  }
  /**
   * Writes a priming event to establish resumption capability.
   * Only sends if eventStore is configured (opt-in for resumability) and
   * the client's protocol version supports empty SSE data (>= 2025-11-25).
   */
  async writePrimingEvent(controller, encoder, streamId, protocolVersion) {
    if (!this._eventStore) {
      return;
    }
    if (protocolVersion < "2025-11-25") {
      return;
    }
    const primingEventId = await this._eventStore.storeEvent(streamId, {});
    let primingEvent = `id: ${primingEventId}
data: 

`;
    if (this._retryInterval !== void 0) {
      primingEvent = `id: ${primingEventId}
retry: ${this._retryInterval}
data: 

`;
    }
    controller.enqueue(encoder.encode(primingEvent));
    this._resumableStreams.add(streamId);
  }
  /**
   * Handles GET requests for SSE stream
   */
  async handleGetRequest(req) {
    const acceptHeader = req.headers.get("accept");
    if (!acceptHeader?.includes("text/event-stream")) {
      this.onerror?.(new Error("Not Acceptable: Client must accept text/event-stream"));
      return this.createJsonErrorResponse(406, -32e3, "Not Acceptable: Client must accept text/event-stream");
    }
    const sessionError = this.validateSession(req);
    if (sessionError) {
      return sessionError;
    }
    const protocolError = this.validateProtocolVersion(req);
    if (protocolError) {
      return protocolError;
    }
    if (this._eventStore) {
      const lastEventId = req.headers.get("last-event-id");
      if (lastEventId) {
        return this.replayEvents(lastEventId);
      }
    }
    if (this._streamMapping.get(this._standaloneSseStreamId) !== void 0) {
      this.onerror?.(new Error("Conflict: Only one SSE stream is allowed per session"));
      return this.createJsonErrorResponse(409, -32e3, "Conflict: Only one SSE stream is allowed per session");
    }
    const encoder = new TextEncoder();
    let streamController;
    let keepAliveTimer = void 0;
    const readable = new ReadableStream({
      start: (controller) => {
        streamController = controller;
      },
      cancel: () => {
        if (keepAliveTimer !== void 0) {
          clearInterval(keepAliveTimer);
        }
        if (this._streamMapping.get(this._standaloneSseStreamId)?.controller === streamController) {
          this._streamMapping.delete(this._standaloneSseStreamId);
        }
      }
    });
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    };
    if (this.sessionId !== void 0) {
      headers["mcp-session-id"] = this.sessionId;
    }
    this._streamMapping.set(this._standaloneSseStreamId, {
      controller: streamController,
      encoder,
      cleanup: () => {
        if (keepAliveTimer !== void 0) {
          clearInterval(keepAliveTimer);
        }
        this._streamMapping.delete(this._standaloneSseStreamId);
        try {
          streamController.close();
        } catch {
        }
      }
    });
    keepAliveTimer = this.startKeepAlive(streamController, encoder);
    return new Response(readable, { headers });
  }
  /**
   * Replays events that would have been sent after the specified event ID
   * Only used when resumability is enabled
   */
  async replayEvents(lastEventId) {
    if (!this._eventStore) {
      this.onerror?.(new Error("Event store not configured"));
      return this.createJsonErrorResponse(400, -32e3, "Event store not configured");
    }
    try {
      let streamId;
      if (this._eventStore.getStreamIdForEventId) {
        streamId = await this._eventStore.getStreamIdForEventId(lastEventId);
        if (!streamId) {
          this.onerror?.(new Error("Invalid event ID format"));
          return this.createJsonErrorResponse(400, -32e3, "Invalid event ID format");
        }
        if (this._streamMapping.get(streamId) !== void 0) {
          this.onerror?.(new Error("Conflict: Stream already has an active connection"));
          return this.createJsonErrorResponse(409, -32e3, "Conflict: Stream already has an active connection");
        }
      }
      const headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      };
      if (this.sessionId !== void 0) {
        headers["mcp-session-id"] = this.sessionId;
      }
      const encoder = new TextEncoder();
      let streamController;
      let keepAliveTimer = void 0;
      let replayedStreamId = void 0;
      let cancelled = false;
      const readable = new ReadableStream({
        start: (controller) => {
          streamController = controller;
        },
        cancel: () => {
          cancelled = true;
          if (keepAliveTimer !== void 0) {
            clearInterval(keepAliveTimer);
          }
          if (replayedStreamId !== void 0 && this._streamMapping.get(replayedStreamId)?.controller === streamController) {
            this._streamMapping.delete(replayedStreamId);
          }
        }
      });
      const replayedEventIds = /* @__PURE__ */ new Set();
      replayedStreamId = await this._eventStore.replayEventsAfter(lastEventId, {
        send: async (eventId, message) => {
          const success = this.writeSSEEvent(streamController, encoder, message, eventId);
          if (!success) {
            this.onerror?.(new Error("Failed replay events"));
            try {
              streamController.close();
            } catch {
            }
          } else {
            replayedEventIds.add(eventId);
          }
        }
      });
      if (this._closed || cancelled) {
        try {
          streamController.close();
        } catch {
        }
        return this.createJsonErrorResponse(404, -32001, "Session not found");
      }
      this._streamMapping.get(replayedStreamId)?.cleanup();
      this._streamMapping.set(replayedStreamId, {
        controller: streamController,
        encoder,
        replayedEventIds,
        cleanup: () => {
          if (keepAliveTimer !== void 0) {
            clearInterval(keepAliveTimer);
          }
          this._streamMapping.delete(replayedStreamId);
          try {
            streamController.close();
          } catch {
          }
        }
      });
      this._resumableStreams.add(replayedStreamId);
      keepAliveTimer = this.startKeepAlive(streamController, encoder);
      return new Response(readable, { headers });
    } catch (error) {
      this.onerror?.(error);
      return this.createJsonErrorResponse(500, -32e3, "Error replaying events");
    }
  }
  /**
   * Writes an event to an SSE stream via controller with proper formatting
   */
  writeSSEEvent(controller, encoder, message, eventId) {
    try {
      let eventData = `event: message
`;
      if (eventId) {
        eventData += `id: ${eventId}
`;
      }
      eventData += `data: ${JSON.stringify(message)}

`;
      controller.enqueue(encoder.encode(eventData));
      return true;
    } catch (error) {
      this.onerror?.(error);
      return false;
    }
  }
  /**
   * Handles unsupported requests (PUT, PATCH, etc.)
   */
  handleUnsupportedRequest() {
    this.onerror?.(new Error("Method not allowed."));
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32e3,
        message: "Method not allowed."
      },
      id: null
    }), {
      status: 405,
      headers: {
        Allow: "GET, POST, DELETE",
        "Content-Type": "application/json"
      }
    });
  }
  /**
   * Handles POST requests containing JSON-RPC messages
   */
  async handlePostRequest(req, options) {
    try {
      const acceptHeader = req.headers.get("accept");
      if (!acceptHeader?.includes("application/json") || !acceptHeader.includes("text/event-stream")) {
        this.onerror?.(new Error("Not Acceptable: Client must accept both application/json and text/event-stream"));
        return this.createJsonErrorResponse(406, -32e3, "Not Acceptable: Client must accept both application/json and text/event-stream");
      }
      const ct = req.headers.get("content-type");
      if (!isJsonContentType(ct)) {
        this.onerror?.(new Error("Unsupported Media Type: Content-Type must be application/json"));
        return this.createJsonErrorResponse(415, -32e3, "Unsupported Media Type: Content-Type must be application/json");
      }
      const requestInfo = {
        headers: Object.fromEntries(req.headers.entries()),
        url: new URL(req.url)
      };
      let rawMessage;
      if (options?.parsedBody !== void 0) {
        rawMessage = options.parsedBody;
      } else {
        try {
          rawMessage = await req.json();
        } catch {
          this.onerror?.(new Error("Parse error: Invalid JSON"));
          return this.createJsonErrorResponse(400, -32700, "Parse error: Invalid JSON");
        }
      }
      let messages;
      try {
        if (Array.isArray(rawMessage)) {
          messages = rawMessage.map((msg) => JSONRPCMessageSchema.parse(msg));
        } else {
          messages = [JSONRPCMessageSchema.parse(rawMessage)];
        }
      } catch {
        this.onerror?.(new Error("Parse error: Invalid JSON-RPC message"));
        return this.createJsonErrorResponse(400, -32700, "Parse error: Invalid JSON-RPC message");
      }
      if (this._closed) {
        return this.createJsonErrorResponse(404, -32001, "Session not found");
      }
      const isInitializationRequest = messages.some(isInitializeRequest);
      if (isInitializationRequest) {
        if (this._initialized && this.sessionId !== void 0) {
          this.onerror?.(new Error("Invalid Request: Server already initialized"));
          return this.createJsonErrorResponse(400, -32600, "Invalid Request: Server already initialized");
        }
        if (messages.length > 1) {
          this.onerror?.(new Error("Invalid Request: Only one initialization request is allowed"));
          return this.createJsonErrorResponse(400, -32600, "Invalid Request: Only one initialization request is allowed");
        }
        this.sessionId = this.sessionIdGenerator?.();
        this._initialized = true;
        if (this.sessionId && this._onsessioninitialized) {
          await Promise.resolve(this._onsessioninitialized(this.sessionId));
        }
      }
      if (!isInitializationRequest) {
        const sessionError = this.validateSession(req);
        if (sessionError) {
          return sessionError;
        }
        const protocolError = this.validateProtocolVersion(req);
        if (protocolError) {
          return protocolError;
        }
      }
      if (this._closed) {
        return this.createJsonErrorResponse(404, -32001, "Session not found");
      }
      const hasRequests = messages.some(isJSONRPCRequest);
      if (!hasRequests) {
        for (const message of messages) {
          this.onmessage?.(message, { authInfo: options?.authInfo, requestInfo });
        }
        return new Response(null, { status: 202 });
      }
      const streamId = crypto.randomUUID();
      const initRequest = messages.find((m) => isInitializeRequest(m));
      const clientProtocolVersion = initRequest ? initRequest.params.protocolVersion : req.headers.get("mcp-protocol-version") ?? DEFAULT_NEGOTIATED_PROTOCOL_VERSION;
      if (this._enableJsonResponse) {
        return new Promise((resolve2) => {
          this._streamMapping.set(streamId, {
            resolveJson: resolve2,
            cleanup: () => {
              this._streamMapping.delete(streamId);
            }
          });
          for (const message of messages) {
            if (isJSONRPCRequest(message)) {
              this._requestToStreamMapping.set(message.id, streamId);
            }
          }
          for (const message of messages) {
            this.onmessage?.(message, { authInfo: options?.authInfo, requestInfo });
          }
        });
      }
      const encoder = new TextEncoder();
      let streamController;
      let keepAliveTimer = void 0;
      const readable = new ReadableStream({
        start: (controller) => {
          streamController = controller;
        },
        cancel: () => {
          if (keepAliveTimer !== void 0) {
            clearInterval(keepAliveTimer);
          }
          if (this._streamMapping.get(streamId)?.controller === streamController) {
            this._streamMapping.delete(streamId);
          }
        }
      });
      const headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      };
      if (this.sessionId !== void 0) {
        headers["mcp-session-id"] = this.sessionId;
      }
      for (const message of messages) {
        if (isJSONRPCRequest(message)) {
          this._streamMapping.set(streamId, {
            controller: streamController,
            encoder,
            cleanup: () => {
              if (keepAliveTimer !== void 0) {
                clearInterval(keepAliveTimer);
              }
              this._streamMapping.delete(streamId);
              try {
                streamController.close();
              } catch {
              }
            }
          });
          this._requestToStreamMapping.set(message.id, streamId);
        }
      }
      try {
        await this.writePrimingEvent(streamController, encoder, streamId, clientProtocolVersion);
        for (const message of messages) {
          let closeSSEStream;
          let closeStandaloneSSEStream;
          if (isJSONRPCRequest(message) && this._eventStore && clientProtocolVersion >= "2025-11-25") {
            closeSSEStream = () => {
              this.closeSSEStream(message.id);
            };
            closeStandaloneSSEStream = () => {
              this.closeStandaloneSSEStream();
            };
          }
          this.onmessage?.(message, { authInfo: options?.authInfo, requestInfo, closeSSEStream, closeStandaloneSSEStream });
        }
      } catch (error) {
        this._streamMapping.get(streamId)?.cleanup();
        this._resumableStreams.delete(streamId);
        for (const message of messages) {
          if (isJSONRPCRequest(message)) {
            this._requestToStreamMapping.delete(message.id);
          }
        }
        throw error;
      }
      if (this._streamMapping.get(streamId)?.controller === streamController) {
        keepAliveTimer = this.startKeepAlive(streamController, encoder);
      }
      return new Response(readable, { status: 200, headers });
    } catch (error) {
      this.onerror?.(error);
      return this.createJsonErrorResponse(400, -32700, "Parse error", { data: String(error) });
    }
  }
  /**
   * Handles DELETE requests to terminate sessions
   */
  async handleDeleteRequest(req) {
    const sessionError = this.validateSession(req);
    if (sessionError) {
      return sessionError;
    }
    const protocolError = this.validateProtocolVersion(req);
    if (protocolError) {
      return protocolError;
    }
    try {
      await Promise.resolve(this._onsessionclosed?.(this.sessionId));
      return new Response(null, { status: 200 });
    } finally {
      await this.close();
    }
  }
  /**
   * Validates session ID for non-initialization requests.
   * Returns Response error if invalid, undefined otherwise
   */
  validateSession(req) {
    if (this.sessionIdGenerator === void 0) {
      return void 0;
    }
    if (!this._initialized) {
      this.onerror?.(new Error("Bad Request: Server not initialized"));
      return this.createJsonErrorResponse(400, -32e3, "Bad Request: Server not initialized");
    }
    const sessionId = req.headers.get("mcp-session-id");
    if (!sessionId) {
      this.onerror?.(new Error("Bad Request: Mcp-Session-Id header is required"));
      return this.createJsonErrorResponse(400, -32e3, "Bad Request: Mcp-Session-Id header is required");
    }
    if (sessionId !== this.sessionId) {
      this.onerror?.(new Error("Session not found"));
      return this.createJsonErrorResponse(404, -32001, "Session not found");
    }
    return void 0;
  }
  /**
   * Validates the MCP-Protocol-Version header on incoming requests.
   *
   * For initialization: Version negotiation handles unknown versions gracefully
   * (server responds with its supported version).
   *
   * For subsequent requests with MCP-Protocol-Version header:
   * - Accept if in supported list
   * - 400 if unsupported
   *
   * For HTTP requests without the MCP-Protocol-Version header:
   * - Accept and default to the version negotiated at initialization
   */
  validateProtocolVersion(req) {
    const protocolVersion = req.headers.get("mcp-protocol-version");
    if (protocolVersion !== null && !SUPPORTED_PROTOCOL_VERSIONS.includes(protocolVersion)) {
      this.onerror?.(new Error(`Bad Request: Unsupported protocol version: ${protocolVersion} (supported versions: ${SUPPORTED_PROTOCOL_VERSIONS.join(", ")})`));
      return this.createJsonErrorResponse(400, -32e3, `Bad Request: Unsupported protocol version: ${protocolVersion} (supported versions: ${SUPPORTED_PROTOCOL_VERSIONS.join(", ")})`);
    }
    return void 0;
  }
  async close() {
    if (this._closed) {
      return;
    }
    this._closed = true;
    this._streamMapping.forEach(({ cleanup }) => {
      cleanup();
    });
    this._streamMapping.clear();
    this._requestResponseMap.clear();
    this._resumableStreams.clear();
    this.onclose?.();
  }
  /**
   * Close an SSE stream for a specific request, triggering client reconnection.
   * Use this to implement polling behavior during long-running operations -
   * client will reconnect after the retry interval specified in the priming event.
   */
  closeSSEStream(requestId) {
    const streamId = this._requestToStreamMapping.get(requestId);
    if (!streamId)
      return;
    const stream = this._streamMapping.get(streamId);
    if (stream) {
      stream.cleanup();
    }
  }
  /**
   * Close the standalone GET SSE stream, triggering client reconnection.
   * Use this to implement polling behavior for server-initiated notifications.
   */
  closeStandaloneSSEStream() {
    const stream = this._streamMapping.get(this._standaloneSseStreamId);
    if (stream) {
      stream.cleanup();
    }
  }
  async send(message, options) {
    let requestId = options?.relatedRequestId;
    if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) {
      requestId = message.id;
    }
    if (requestId === void 0) {
      if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) {
        throw new Error("Cannot send a response on a standalone SSE stream unless resuming a previous client request");
      }
      let eventId;
      if (this._eventStore) {
        eventId = await this._eventStore.storeEvent(this._standaloneSseStreamId, message);
      }
      const standaloneSse = this._streamMapping.get(this._standaloneSseStreamId);
      if (standaloneSse === void 0) {
        return;
      }
      if (standaloneSse.controller && standaloneSse.encoder && (eventId === void 0 || !standaloneSse.replayedEventIds?.has(eventId))) {
        this.writeSSEEvent(standaloneSse.controller, standaloneSse.encoder, message, eventId);
      }
      return;
    }
    const streamId = this._requestToStreamMapping.get(requestId);
    if (!streamId) {
      throw new Error(`No connection established for request ID: ${String(requestId)}`);
    }
    let stream = this._streamMapping.get(streamId);
    if (!this._enableJsonResponse) {
      let eventId;
      if (this._eventStore) {
        eventId = await this._eventStore.storeEvent(streamId, message);
        stream = this._streamMapping.get(streamId);
      }
      if (stream?.controller && stream?.encoder && (eventId === void 0 || !stream.replayedEventIds?.has(eventId))) {
        const written = this.writeSSEEvent(stream.controller, stream.encoder, message, eventId);
        if (written && eventId !== void 0) {
          this._resumableStreams.add(streamId);
        }
      }
    }
    if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) {
      this._requestResponseMap.set(requestId, message);
      const relatedIds = Array.from(this._requestToStreamMapping.entries()).filter(([_, sid]) => sid === streamId).map(([id]) => id);
      const allResponsesReady = relatedIds.every((id) => this._requestResponseMap.has(id));
      if (allResponsesReady) {
        if (!stream) {
          if (this._closed) {
            for (const id of relatedIds) {
              this._requestResponseMap.delete(id);
              this._requestToStreamMapping.delete(id);
            }
            return;
          }
          if (!this._enableJsonResponse && this._eventStore && this._resumableStreams.has(streamId)) {
            for (const id of relatedIds) {
              this._requestResponseMap.delete(id);
              this._requestToStreamMapping.delete(id);
            }
            this._resumableStreams.delete(streamId);
            return;
          }
          for (const id of relatedIds) {
            this._requestResponseMap.delete(id);
            this._requestToStreamMapping.delete(id);
          }
          throw new Error(`No connection established for request ID: ${String(requestId)}`);
        }
        if (this._enableJsonResponse && stream.resolveJson) {
          const headers = {
            "Content-Type": "application/json"
          };
          if (this.sessionId !== void 0) {
            headers["mcp-session-id"] = this.sessionId;
          }
          const responses = relatedIds.map((id) => this._requestResponseMap.get(id));
          if (responses.length === 1) {
            stream.resolveJson(new Response(JSON.stringify(responses[0]), { status: 200, headers }));
          } else {
            stream.resolveJson(new Response(JSON.stringify(responses), { status: 200, headers }));
          }
        } else {
          stream.cleanup();
        }
        for (const id of relatedIds) {
          this._requestResponseMap.delete(id);
          this._requestToStreamMapping.delete(id);
        }
        this._resumableStreams.delete(streamId);
      }
    }
  }
};
createRequire(import.meta.url);
var listWorkspaceGroupsInput = external_exports.object({
  group_id: external_exports.string().uuid().optional(),
  include_permissions: external_exports.boolean().optional(),
  resource_type: external_exports.enum(["app", "module", "workflow", "data_source"]).optional()
}).strict();
function listWorkspaceGroupsTool(client) {
  return {
    name: "list_workspace_groups",
    title: "List Workspace Groups",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    description: "List groups in the workspace pinned to the current connection. OAuth connections require the workspace_users scope. Supply group_id to list its non-archived members with group_user_id (membership id, distinct from user_id and organization_user_id). Use include_permissions:true with group_id to read permission switches and granular access rules. Use resource_type (app/module/workflow/data_source) to discover selectable resources and their names/IDs. Use exact returned ids for group changes. Requires ToolJet admin permissions.",
    inputSchema: listWorkspaceGroupsInput.shape,
    async handler(input) {
      try {
        const args = listWorkspaceGroupsInput.parse(input);
        if (args.include_permissions && !args.group_id)
          throw new Error("group_id is required with include_permissions.");
        const resources = args.resource_type ? { resources: await client.listWorkspaceGroupResources(args.resource_type) } : {};
        if (!args.group_id)
          return ok({ ...args.resource_type ? {} : { groups: await client.listWorkspaceGroups() }, ...resources });
        const group = await client.getWorkspaceGroup(args.group_id);
        return ok({
          group,
          members: await client.listWorkspaceGroupMembers(args.group_id),
          ...resources,
          ...args.include_permissions ? { access_rules: await client.listWorkspaceGroupAccess(args.group_id) } : {}
        });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
var manageWorkspaceGroupsInput = external_exports.object({
  action: external_exports.enum(["create", "rename", "delete", "remove_member", "duplicate", "update_permissions", "create_access", "update_access", "delete_access"]),
  group_id: external_exports.string().uuid().optional(),
  name: external_exports.string().trim().min(1).max(50).optional(),
  group_user_id: external_exports.string().uuid().optional(),
  confirm: external_exports.boolean().optional(),
  permissions: external_exports.object(Object.fromEntries(WORKSPACE_PERMISSION_KEYS.map((key) => [key, external_exports.boolean().optional()]))).strict().optional(),
  copy: external_exports.object({
    permissions: external_exports.boolean().optional(),
    members: external_exports.boolean().optional(),
    apps: external_exports.boolean().optional(),
    modules: external_exports.boolean().optional(),
    workflows: external_exports.boolean().optional(),
    data_sources: external_exports.boolean().optional()
  }).strict().optional(),
  rule_id: external_exports.string().uuid().optional(),
  resource_type: external_exports.enum(["app", "module", "workflow", "data_source"]).optional(),
  access: external_exports.object({
    name: external_exports.string().trim().min(1).max(255).optional(),
    is_all: external_exports.boolean().optional(),
    actions: external_exports.object(Object.fromEntries(WORKSPACE_ACCESS_KEYS.map((key) => [key, external_exports.boolean().optional()]))).strict().optional(),
    resource_ids: external_exports.array(external_exports.string().uuid()).max(1e3).optional(),
    add_resource_ids: external_exports.array(external_exports.string().uuid()).min(1).max(1e3).optional(),
    remove_resource_ids: external_exports.array(external_exports.string().uuid()).min(1).max(1e3).optional()
  }).strict().optional(),
  allow_role_change: external_exports.boolean().optional()
}).strict();
function manageWorkspaceGroupsTool(client) {
  return {
    name: "manage_workspace_groups",
    title: "Manage Workspace Groups",
    strictInput: true,
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    description: "Create, rename, delete custom groups or remove a member in the workspace pinned to the current connection. OAuth connections require the workspace_users scope. All actions require confirm:true after reviewing the exact change. create needs name; rename needs group_id and name; delete needs group_id; remove_member needs group_id and group_user_id from list_workspace_groups. Removing membership does not delete the workspace user. Deleting a group removes its memberships and permissions. duplicate needs group_id and at least one true copy flag (permissions/members/apps/modules/workflows/data_sources; omitted flags false); ToolJet assigns the copy name. update_permissions needs group_id and permissions (only supplied switches change). create_access needs group_id, resource_type and access {name,is_all,actions,resource_ids}; update_access needs group_id, rule_id and access (only supplied fields change); delete_access needs group_id and rule_id. For update/delete access, optional resource_type must match the existing rule. Read include_permissions:true first to resolve rule IDs; resource_type discovers selectable resource IDs. On update_access, use access.add_resource_ids/remove_resource_ids to change only those resources and preserve the rest. access.resource_ids is only for an explicitly requested replacement of the entire rule selection; do not combine it with add/remove_resource_ids. Resource additions/removals require a selected-resource rule; is_all:true applies to ALL current and future resources of its type. On create_access, omitted action switches are disabled. App actions: canEdit/canView/hideFromDashboard/canAccessDevelopment/canAccessStaging/canAccessProduction/canAccessReleased. Module actions: canEdit/canView/hideFromDashboard. Workflow actions: canEdit/canView. Data source actions: canConfigure/canUse. canEdit/canView and canConfigure/canUse are exclusive pairs: enabling one disables the other, including on partial updates. Disabled groups and read_only rules are not editable under the current license/plan. allow_role_change is only for permission updates and access updates, and only with explicit consent to change affected member roles. Admin permissions cannot be changed; default group names/memberships cannot be changed here. To add members use manage_workspace_users with group_ids. ToolJet admin and license checks apply.",
    inputSchema: manageWorkspaceGroupsInput.shape,
    async handler(input) {
      try {
        const args = manageWorkspaceGroupsInput.parse(input);
        if (args.confirm !== true)
          throw new Error(`${args.action} requires confirm:true after reviewing the exact change.`);
        const needsName = args.action === "create" || args.action === "rename";
        if (needsName !== (args.name !== void 0))
          throw new Error(needsName ? "name is required." : "name must be omitted.");
        if (args.action !== "create" !== (args.group_id !== void 0)) {
          throw new Error(args.action === "create" ? "group_id must be omitted for create." : "group_id is required.");
        }
        if (args.action === "remove_member" !== (args.group_user_id !== void 0)) {
          throw new Error(args.action === "remove_member" ? "group_user_id is required." : "group_user_id must be omitted.");
        }
        const expected = {
          duplicate: ["copy"],
          update_permissions: ["permissions", "allow_role_change"],
          create_access: ["resource_type", "access"],
          update_access: ["rule_id", "access", "allow_role_change", "resource_type"],
          delete_access: ["rule_id", "resource_type"]
        };
        for (const key of ["copy", "permissions", "resource_type", "access", "rule_id", "allow_role_change"]) {
          if (args[key] !== void 0 && !expected[args.action]?.includes(key))
            throw new Error(`${key} must be omitted for ${args.action}.`);
        }
        for (const key of expected[args.action] ?? []) {
          if (key !== "allow_role_change" && !(key === "resource_type" && args.action !== "create_access") && args[key] === void 0)
            throw new Error(`${key} is required.`);
        }
        if (args.permissions && !Object.keys(args.permissions).length)
          throw new Error("permissions must contain at least one switch.");
        if (args.access && !Object.keys(args.access).length)
          throw new Error("access must contain at least one change.");
        if (args.action === "create")
          return ok({ group: await client.createWorkspaceGroup(args.name) });
        const group = await client.getWorkspaceGroup(args.group_id);
        if (group.disabled === true)
          throw new Error(`Group "${group.name}" is read-only under the current license/plan.`);
        const permissionAction = ["update_permissions", "create_access", "update_access", "delete_access"].includes(args.action);
        if (group.type !== "custom" && args.action !== "duplicate" && !(permissionAction && group.name !== "admin")) {
          throw new Error("Only custom groups can be changed with this tool.");
        }
        if (args.action === "duplicate") {
          const copy = args.copy;
          if (!Object.values(copy).some((value) => value === true))
            throw new Error("Select at least one category to duplicate.");
          return ok({ group: await client.duplicateWorkspaceGroup(group.id, {
            addPermission: copy.permissions ?? false,
            addUsers: copy.members ?? false,
            addApps: copy.apps ?? false,
            addModules: copy.modules ?? false,
            addWorkflows: copy.workflows ?? false,
            addDataSource: copy.data_sources ?? false
          }) });
        }
        if (args.action === "update_permissions") {
          await client.updateWorkspaceGroupPermissions(group.id, args.permissions, args.allow_role_change);
          return ok({ group: await client.getWorkspaceGroup(group.id), updated: true });
        }
        if (["create_access", "update_access", "delete_access"].includes(args.action)) {
          const rules = await client.listWorkspaceGroupAccess(group.id);
          const rule = args.rule_id ? rules.find((item) => item.id === args.rule_id) : void 0;
          if (args.rule_id && !rule)
            throw new Error("Access rule not found in this group. Read include_permissions:true again.");
          if (rule?.read_only)
            throw new Error(rule.read_only_reason || "This access rule is read-only under the current license/plan.");
          if (rule && args.resource_type && args.resource_type !== rule.type)
            throw new Error("resource_type does not match this access rule.");
          const type = rule?.type ?? args.resource_type;
          if (args.action === "delete_access") {
            await client.writeWorkspaceGroupAccess("DELETE", group.id, type, rule.id);
            return ok({ group_id: group.id, name: group.name, rule_id: rule.id, rule_name: rule.name, deleted: true });
          }
          const access = args.access;
          const creating = args.action === "create_access";
          const delta = access.add_resource_ids !== void 0 || access.remove_resource_ids !== void 0;
          if (delta && (creating || access.resource_ids !== void 0 || access.is_all !== void 0)) {
            throw new Error("Resource additions/removals only update an existing selected-resource rule; do not combine them with resource_ids or is_all.");
          }
          if (creating && (!access.name || access.is_all === void 0 || !access.actions)) {
            throw new Error("create_access requires access.name, is_all and actions.");
          }
          const actionKeys = workspaceAccessKeys(type);
          if (access.actions && (!Object.keys(access.actions).length || Object.keys(access.actions).some((key) => !actionKeys.includes(key)))) {
            throw new Error(`Invalid actions for ${type}. Use ${actionKeys.join(", ")}.`);
          }
          const all = access.is_all ?? rule.is_all;
          const currentIds = rule?.resources.map((item) => item.id) ?? [];
          if (delta && all)
            throw new Error("An all-resource rule cannot add/remove individual resources. Explicitly choose a replacement selected-resource scope instead.");
          if (delta && (new Set(access.add_resource_ids).size !== (access.add_resource_ids?.length ?? 0) || new Set(access.remove_resource_ids).size !== (access.remove_resource_ids?.length ?? 0) || access.add_resource_ids?.some((id) => access.remove_resource_ids?.includes(id)) || access.remove_resource_ids?.some((id) => !currentIds.includes(id)))) {
            throw new Error("Use unique, non-overlapping resource additions/removals; removed resources must belong to this rule.");
          }
          const selected = delta ? [.../* @__PURE__ */ new Set([...currentIds.filter((id) => !access.remove_resource_ids?.includes(id)), ...access.add_resource_ids ?? []])] : access.resource_ids ?? (all ? [] : currentIds);
          if (new Set(selected).size !== selected.length || all && selected.length || !all && !selected.length) {
            throw new Error("Use unique resource_ids for a selected-resource rule; omit them or use [] for is_all:true.");
          }
          if (access.resource_ids || access.add_resource_ids || creating || rule?.is_all && !all) {
            const available = await client.listWorkspaceGroupResources(type);
            if (selected.some((id) => !available.some((item) => item.id === id)))
              throw new Error("Resource not found in this workspace/resource type.");
          }
          const resourceKey = type === "data_source" ? "dataSourceId" : "appId";
          const actions = { ...creating ? Object.fromEntries(actionKeys.map((key) => [key, false])) : rule.actions, ...access.actions };
          const [primary, secondary] = type === "data_source" ? ["canConfigure", "canUse"] : ["canEdit", "canView"];
          if (access.actions?.[primary] === true && access.actions?.[secondary] === void 0)
            actions[secondary] = false;
          if (access.actions?.[secondary] === true && access.actions?.[primary] === void 0)
            actions[primary] = false;
          if (actions[primary] && actions[secondary])
            throw new Error(`${primary} and ${secondary} cannot both be enabled.`);
          if (creating) {
            await client.writeWorkspaceGroupAccess("POST", group.id, type, void 0, {
              name: access.name,
              type,
              groupId: group.id,
              isAll: all,
              createResourcePermissionObject: {
                ...type === "data_source" ? { action: actions } : actions,
                resourcesToAdd: selected.map((id) => ({ [resourceKey]: id }))
              }
            });
          } else {
            const current = rule.resources;
            await client.writeWorkspaceGroupAccess("PUT", group.id, type, rule.id, {
              ...access.name !== void 0 ? { name: access.name } : {},
              isAll: all,
              actions,
              resourcesToAdd: selected.filter((id) => !current.some((item) => item.id === id)).map((id) => ({ [resourceKey]: id })),
              resourcesToDelete: current.filter((item) => !selected.includes(item.id)).map((item) => ({ id: item.membership_id })),
              allowRoleChange: args.allow_role_change ?? false
            });
          }
          return ok({ group_id: group.id, name: group.name, access_rules: await client.listWorkspaceGroupAccess(group.id) });
        }
        if (args.action === "rename") {
          await client.renameWorkspaceGroup(group.id, args.name);
          return ok({ group_id: group.id, name: args.name, renamed: true });
        }
        if (args.action === "delete") {
          await client.deleteWorkspaceGroup(group.id);
          return ok({ group_id: group.id, name: group.name, deleted: true });
        }
        const members = await client.listWorkspaceGroupMembers(group.id);
        if (!members.some((member) => member.group_user_id === args.group_user_id)) {
          throw new Error("Membership not found in this group. Use list_workspace_groups with group_id for current member ids.");
        }
        await client.removeWorkspaceGroupMember(args.group_user_id);
        return ok({ group_id: group.id, group_user_id: args.group_user_id, removed: true });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
var groupBoundary = " Requires confirm:true for the exact change, workspace_users OAuth scope, and ToolJet admin permissions. License restrictions apply.";
var accessBehavior = " App actions: canEdit/canView/hideFromDashboard/canAccessDevelopment/canAccessStaging/canAccessProduction/canAccessReleased; module: canEdit/canView/hideFromDashboard; workflow: canEdit/canView; data_source: canConfigure/canUse. canEdit/canView and canConfigure/canUse are exclusive pairs; enabling one disables the other. is_all:true includes current and future resources.";
var workspaceGroups = [
  {
    action: "create",
    name: "create_workspace_group",
    title: "Create Workspace Group",
    description: "Create an empty custom group in the pinned workspace." + groupBoundary,
    required: ["name", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
  },
  {
    action: "rename",
    name: "rename_workspace_group",
    title: "Rename Workspace Group",
    description: "Rename an existing custom group. Default group names cannot be changed." + groupBoundary,
    required: ["group_id", "name", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "delete",
    name: "delete_workspace_group",
    title: "Delete Workspace Group",
    description: "Delete an existing custom group, including its memberships and permissions. Cannot delete default groups." + groupBoundary,
    required: ["group_id", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "remove_member",
    name: "remove_workspace_group_member",
    title: "Remove Workspace Group Member",
    description: "Remove one membership from a custom group without deleting the workspace user. group_user_id is the membership ID returned by list_workspace_groups, not a user ID; membership must belong to this group." + groupBoundary,
    required: ["group_id", "group_user_id", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "duplicate",
    name: "duplicate_workspace_group",
    title: "Duplicate Workspace Group",
    description: "Duplicate a group with selected categories: permissions, members, apps, modules, workflows, or data_sources. At least one copy flag must be true; omitted flags are false. ToolJet assigns the copy name. Copying members and permissions can grant access through the new group." + groupBoundary,
    required: ["group_id", "copy", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
  },
  {
    action: "update_permissions",
    name: "update_workspace_group_permissions",
    title: "Update Workspace Group Permissions",
    description: "Update only supplied permission switches on a group. Admin permissions cannot be changed. allow_role_change requires explicit consent to change affected member roles." + groupBoundary,
    required: ["group_id", "permissions", "confirm"],
    optional: ["allow_role_change"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "create_access",
    name: "create_workspace_group_access",
    title: "Create Workspace Group Access Rule",
    description: "Create a granular group access rule for the selected resource type. access requires name, is_all, and actions; selected-resource rules also need resource_ids from list_workspace_groups. Omitted action switches are disabled." + accessBehavior + groupBoundary,
    required: ["group_id", "resource_type", "access", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
  },
  {
    action: "update_access",
    name: "update_workspace_group_access",
    title: "Update Workspace Group Access Rule",
    description: "Update an existing rule belonging to this group; read IDs with list_workspace_groups include_permissions:true. Only supplied fields change. add_resource_ids/remove_resource_ids preserve other selections and require a selected-resource rule; do not combine with resource_ids or is_all. resource_ids replaces the entire selection. Optional resource_type must match the rule. allow_role_change needs explicit role-change consent." + accessBehavior + groupBoundary,
    required: ["group_id", "rule_id", "access", "confirm"],
    optional: ["resource_type", "allow_role_change"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "delete_access",
    name: "delete_workspace_group_access",
    title: "Delete Workspace Group Access Rule",
    description: "Delete a granular access rule belonging to this group. Read rule IDs with list_workspace_groups include_permissions:true. Optional resource_type must match. Read-only rules cannot be deleted." + groupBoundary,
    required: ["group_id", "rule_id", "confirm"],
    optional: ["resource_type"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  }
];
function workspaceGroupActionTools(source) {
  return exposeActions(source, workspaceGroups);
}
createRequire(import.meta.url);
var requestSchema = external_exports.object({
  method: external_exports.string().min(1),
  schema: external_exports.string().optional(),
  table: external_exports.string().optional(),
  search: external_exports.string().optional(),
  page: external_exports.number().int().positive().optional(),
  limit: external_exports.number().int().positive().max(1e3).optional(),
  args: external_exports.record(external_exports.string(), external_exports.any()).optional()
});
function datasourceMetadataTools(source) {
  const methods = [
    ["listDatasets", "list_datasource_datasets", "List Datasource Datasets", "List dataset names in a connected datasource."],
    ["listTables", "list_datasource_tables", "List Datasource Tables", "List tables or API endpoint paths from a connected datasource; for HubSpot, an omitted schema lists spec groups."],
    ["listColumns", "list_datasource_columns", "List Datasource Columns", "Read column definitions for one datasource table."],
    ["getSheets", "list_datasource_sheets", "List Datasource Sheets", "List sheets in a connected spreadsheet datasource."],
    ["getSpreadsheets", "list_datasource_spreadsheets", "List Datasource Spreadsheets", "List spreadsheets available to a connected datasource."],
    ["getEndpointSchema", "get_datasource_endpoint_schema", "Get Datasource Endpoint Schema", "Read the request contract for one API endpoint from its specification; never send the endpoint request."],
    ["listCollections", "list_datasource_collections", "List Datasource Collections", "List collection names in a connected document datasource."],
    ["listSchemas", "list_datasource_schemas", "List Datasource Schemas", "List database schema names in a connected datasource."],
    ["getTenants", "list_datasource_tenants", "List Datasource Tenants", "List tenant metadata available through a connected datasource."]
  ];
  return exposeActions(source, methods.map(([action, name, title, description]) => ({
    action,
    name,
    title,
    description: `${description} Uses the fixed ${action} metadata method, only when the datasource advertises it. Does not execute saved queries, author resources, or invoke the API endpoints described by a returned schema. schema/table/search/page/limit are selectors; args supplies datasource-specific selectors such as spreadsheet ID or endpoint HTTP method.`,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    required: ["version_id", "datasource_id"],
    optional: ["schema", "table", "search", "page", "limit", "args"]
  })), "method");
}
function invokeArgs(request) {
  const customValues = request.args?.values && typeof request.args.values === "object" && !Array.isArray(request.args.values) ? request.args.values : {};
  const values = {
    ...customValues,
    ...request.schema !== void 0 ? { schema: request.schema } : {},
    ...request.table !== void 0 ? { table: request.table } : {}
  };
  return {
    ...request.args ?? {},
    ...Object.keys(values).length ? { values } : {},
    ...request.search !== void 0 ? { search: request.search } : {},
    ...request.page !== void 0 ? { page: request.page } : {},
    ...request.limit !== void 0 ? { limit: request.limit } : {}
  };
}
var specCache = /* @__PURE__ */ new Map();
function specText(entry) {
  const raw = entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
  return typeof raw === "string" ? raw : void 0;
}
function parseSpecCached(options) {
  const key = specText(options.spec) ?? specText(options.definition);
  if (key === void 0)
    return extractSpec(options);
  const hit = specCache.get(key);
  if (hit)
    return hit;
  const parsed = extractSpec(options);
  if (parsed) {
    if (specCache.size > 8)
      specCache.clear();
    specCache.set(key, parsed);
  }
  return parsed;
}
function openapiIntrospection(spec, request) {
  if (request.method === "listTables") {
    const endpoints = listEndpoints(spec);
    const host2 = specHost(spec);
    const header = { total: endpoints.length, ...host2 ? { host: host2 } : {} };
    if (request.search) {
      const ranked = rankEndpoints(spec, endpoints, request.search);
      const limit2 = request.limit ?? 25;
      return {
        ...header,
        search: request.search,
        matched: ranked.length,
        ...ranked.length > limit2 ? { returned: limit2 } : {},
        // Ordered by relevance, not spec order: the caller should read from the top.
        endpoints: ranked.slice(0, limit2).map(({ score, ...endpoint }) => endpoint),
        ...ranked.length ? {} : { hint: "No endpoint matched. Retry with a broader term, or omit `search` to see the spec's tags." }
      };
    }
    const limit = request.limit ?? 200;
    if (endpoints.length > limit) {
      return {
        ...header,
        tags: endpointTagCounts(spec, endpoints),
        returned: limit,
        truncated: true,
        next_step: `This spec has ${endpoints.length} endpoints. Call listTables again with \`search\` describing what you need (a phrase is fine, it is ranked by relevance), or with a tag name from \`tags\`.`,
        endpoints: endpoints.slice(0, limit)
      };
    }
    return { ...header, endpoints };
  }
  const path = request.table ?? (typeof request.args?.path === "string" ? request.args.path : void 0);
  const method = ["operation", "method", "httpMethod", "http_method", "verb"].map((key) => request.args?.[key]).find((value) => typeof value === "string" && !!value);
  if (!path || !method) {
    throw new Error('getEndpointSchema needs the endpoint path and HTTP method: pass the path as `table` and the method as `args.operation` (for example table:"/pets/{petId}", args:{operation:"get"}); `args.httpMethod` and `args.method` are accepted too.');
  }
  const result = endpointParameters(spec, path, method);
  if (!result.found) {
    throw new Error(`The spec has no ${method.toLowerCase()} operation on path "${path}". Call listTables first.`);
  }
  const buckets = {};
  for (const parameter of result.parameters) {
    const bucket = parameter.in === "header" ? "params.header" : parameter.in === "path" ? "params.path" : parameter.in === "query" ? "params.query" : `unsupported:${parameter.in}`;
    (buckets[bucket] ??= []).push(parameter.name);
  }
  if (result.requestBody)
    buckets["params.request"] = ["<request body>"];
  const operation = method.toLowerCase();
  const host = specHost(spec);
  return {
    path,
    operation,
    /* A runnable skeleton, not just a description: copy it and fill the buckets.
       All four buckets are present even when empty because the plugin destructures every one of
       them and calls Object.entries(params.path) unguarded — omitting a bucket fails the query with
       "Cannot convert undefined or null to object" before the request is ever built. */
    query_options: {
      ...host ? { host } : {},
      path,
      operation,
      params: { request: {}, query: {}, header: {}, path: {} }
    },
    // Which query-option bucket each parameter belongs in, so the caller does not have to infer it.
    buckets,
    parameters: result.parameters,
    ...result.response ? { response: result.response } : {},
    ...result.requestBody ? { requestBody: result.requestBody } : {},
    ...host ? {} : { host_warning: 'This spec declares no server URL. The query needs an explicit `host`, or the request fails with "Invalid URL".' }
  };
}
function inspectDatasourceSchemaTool(client) {
  return {
    name: "inspect_datasource_schema",
    title: "Inspect Datasource Schema",
    // Invokes only plugin-advertised read-only metadata methods.
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true
    },
    description: 'Invoke one read-only metadata method advertised by a connected datasource plugin (for example listSchemas, listTables, listColumns, or listCollections). This avoids creating/running ad-hoc information_schema queries. HubSpot: call listTables without schema to list spec groups, then pass schema for endpoint discovery. Use get_datasource_query_schema with sections:["introspection"] to discover exact methods. Common schema/table/search/page/limit inputs are converted to ToolJet selector args; `args` adds plugin-specific fields. Only the requested metadata method is called. Use requests (up to 20) to batch independent table/column lookups after the schema/table names are known; every method is validated before any invocation.',
    inputSchema: {
      version_id: external_exports.string(),
      datasource_id: external_exports.string(),
      method: external_exports.string().min(1).optional(),
      schema: external_exports.string().optional(),
      table: external_exports.string().optional(),
      search: external_exports.string().optional(),
      page: external_exports.number().int().positive().optional(),
      limit: external_exports.number().int().positive().max(1e3).optional(),
      args: external_exports.record(external_exports.string(), external_exports.any()).optional(),
      requests: external_exports.array(requestSchema).min(1).max(20).optional()
    },
    async handler(args) {
      try {
        const datasource = (await client.listDatasources(args.version_id)).find((candidate) => candidate.id === args.datasource_id);
        if (!datasource) {
          return fail(new Error(`Datasource "${args.datasource_id}" is not available on version "${args.version_id}".`));
        }
        const contract = getDatasourceQuerySchema(datasource.kind);
        const kindSpec = singleSpecRef(datasource.kind);
        const methods = [.../* @__PURE__ */ new Set([...contract?.introspectionMethods ?? [], ...kindSpec ? SPEC_DISCOVERY_METHODS : []])];
        const topLevel = args.method ? [{
          method: args.method,
          schema: args.schema,
          table: args.table,
          search: args.search,
          page: args.page,
          limit: args.limit,
          args: args.args
        }] : [];
        const seenRequests = /* @__PURE__ */ new Set();
        const requests = [...args.requests ?? [], ...topLevel].filter((request) => {
          if (!request.method)
            return false;
          const key = JSON.stringify([request.method, request.schema ?? null, request.table ?? null, request.search ?? null]);
          if (seenRequests.has(key))
            return false;
          seenRequests.add(key);
          return true;
        });
        if (!requests.length) {
          return fail(new Error("Provide a `method` or a `requests` batch."));
        }
        const asBatch = !!args.requests?.length || requests.length > 1;
        const unsupported = [...new Set(requests.map((request) => request.method).filter((method) => !methods.includes(method)))];
        if (unsupported.length) {
          return fail(new Error(`Datasource kind "${datasource.kind}" does not advertise introspection method(s) ${unsupported.map((method) => `"${method}"`).join(", ")}. Available methods: ${methods.length ? methods.join(", ") : "none"}.`));
        }
        let openapiSpec;
        if (datasource.kind === "openapi") {
          const details = await client.getDatasourceConnectionDetails(args.datasource_id);
          openapiSpec = parseSpecCached(details.options);
          if (!openapiSpec) {
            return fail(new Error("This OpenAPI datasource has no readable spec stored in its options, so its endpoints cannot be listed. Re-save the datasource with a valid OpenAPI/Swagger (JSON or YAML) document."));
          }
        }
        const hubspotDocuments = /* @__PURE__ */ new Map();
        let kindSpecDocument;
        const results = await Promise.all(requests.map(async (request) => {
          if (datasource.kind === "hubspot") {
            const specs = hubspotSpecs();
            const selector = request.schema ?? request.args?.specType;
            if (!selector && request.method === "listTables") {
              return { method: request.method, result: {
                specs,
                next_step: "Choose a spec using schema (name, label or specType), then call listTables to find paths or getEndpointSchema to get query_options. Properties and Pipelines describe endpoints for discovering account-specific fields and stages."
              } };
            }
            const selected = specs.find((spec) => [spec.name, spec.label, spec.specType].includes(String(selector)));
            if (!selected)
              throw new Error("HubSpot discovery requires a known schema. Call listTables without schema to list installed spec groups.");
            if (!hubspotDocuments.has(selected.name)) {
              hubspotDocuments.set(selected.name, client.getPluginSpec("hubspot", selected.name).then((text) => {
                const spec = extractSpec({ spec: text });
                if (!spec)
                  throw new Error(`HubSpot spec "${selected.name}" is unavailable or invalid. Reinstall/update the plugin; do not invent its endpoints.`);
                return spec;
              }));
            }
            const document = await hubspotDocuments.get(selected.name);
            const result2 = openapiIntrospection(document, request);
            if (result2.query_options) {
              delete result2.query_options.host;
              delete result2.query_options.params.header;
              delete result2.host_warning;
              result2.query_options.specType = selected.specType;
              if (result2.buckets?.["params.header"])
                result2.unsupported_headers = result2.buckets["params.header"];
              result2.notes = "HubSpot fixes the API host and authentication in the plugin. The spec describes API shapes; read Properties/Pipelines endpoints to verify account-specific fields and valid stage IDs. Do not guess them.";
            }
            return { method: request.method, schema: selected.name, specType: selected.specType, result: result2 };
          }
          if (kindSpec && SPEC_DISCOVERY_METHODS.includes(request.method)) {
            kindSpecDocument ??= loadKindSpec(client, datasource.kind, kindSpec);
            const result2 = openapiIntrospection(await kindSpecDocument, request);
            if (result2.query_options) {
              delete result2.query_options.host;
              delete result2.query_options.params?.header;
              delete result2.host_warning;
              if (result2.buckets?.["params.header"])
                result2.unsupported_headers = result2.buckets["params.header"];
              result2.notes = `The ${datasource.kind} plugin fixes the API host and authentication. Copy query_options as they are; put IDs in params.path and filters in params.query, each value flat (created[gte], expand[0]): the plugin cannot send a list or an object.`;
            }
            return { method: request.method, ...request.table ? { table: request.table } : {}, result: result2 };
          }
          if (openapiSpec) {
            const result2 = openapiIntrospection(openapiSpec, request);
            return { method: request.method, ...request.table ? { table: request.table } : {}, result: result2 };
          }
          const converted = invokeArgs(request);
          const result = await client.invokeDatasourceMethod({
            dataSourceId: args.datasource_id,
            method: request.method,
            ...Object.keys(converted).length ? { args: converted } : {}
          });
          return {
            method: request.method,
            ...request.schema ? { schema: request.schema } : {},
            ...request.table ? { table: request.table } : {},
            result
          };
        }));
        const header = { datasource: { id: datasource.id, name: datasource.name, kind: datasource.kind } };
        return asBatch ? ok({ ...header, results }) : ok({ ...header, method: results[0].method, result: results[0].result });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
export {
  JSONRPCMessageSchema as $,
  CreateMessageResultWithToolsSchema as A,
  CreateMessageResultSchema as B,
  CancelledNotificationSchema as C,
  ElicitResultSchema as D,
  ErrorCode as E,
  ListRootsResultSchema as F,
  GetTaskRequestSchema as G,
  SUPPORTED_PROTOCOL_VERSIONS as H,
  InitializeRequestSchema as I,
  CallToolResultSchema as J,
  manageAppPermissionsTool as K,
  ListTasksRequestSchema as L,
  McpError as M,
  listWorkspaceGroupsTool as N,
  manageWorkspaceGroupsTool as O,
  ProgressNotificationSchema as P,
  createAppTool as Q,
  RELATED_TASK_META_KEY as R,
  SetLevelRequestSchema as S,
  TaskStatusNotificationSchema as T,
  inspectDatasourceSchemaTool as U,
  manageThemeTool as V,
  datasourceMetadataTools as W,
  WebStandardStreamableHTTPServerTransport as X,
  themeActionTools as Y,
  workspaceGroupActionTools as Z,
  appPermissionActionTools as _,
  PingRequestSchema as a,
  GetTaskPayloadRequestSchema as b,
  CancelTaskRequestSchema as c,
  isJSONRPCErrorResponse as d,
  isJSONRPCRequest as e,
  isJSONRPCNotification as f,
  isTaskAugmentedRequestParams as g,
  CreateTaskResultSchema as h,
  isJSONRPCResultResponse as i,
  GetTaskResultSchema as j,
  ListTasksResultSchema as k,
  CancelTaskResultSchema as l,
  ListToolsRequestSchema as m,
  CallToolRequestSchema as n,
  CompleteRequestSchema as o,
  assertCompleteRequestResourceTemplate as p,
  assertCompleteRequestPrompt as q,
  ListResourcesRequestSchema as r,
  ListResourceTemplatesRequestSchema as s,
  ReadResourceRequestSchema as t,
  ListPromptsRequestSchema as u,
  GetPromptRequestSchema as v,
  LoggingLevelSchema as w,
  InitializedNotificationSchema as x,
  LATEST_PROTOCOL_VERSION as y,
  EmptyResultSchema as z
};
