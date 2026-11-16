/* The component library an app is built in: ToolJet UI 1.0 (the native widgets) or ToolJet UI 2.0 (the Shad* types,
   composed in FlexContainers). ToolJet saves it per app version in globalSettings.componentLibrary and the components
   panel lists that library. New apps are created on 'ui2'; an app from before the setting has none, so its library is
   inferred: 'ui2' when it already holds a Shad* widget, else 'ui1' (the same rule as the ToolJet frontend's
   RightSideBar/ComponentManagerTab/componentLibrary.js). */
import { libraryPacksAll, serverLibraryPacks } from './libraryPack.js';

export type ComponentLibrary = 'ui1' | 'ui2';
export interface ResolvedComponentLibrary {
  library: ComponentLibrary;
  /** "saved": the app's own setting; "inferred": no setting, read from the widgets the app holds. */
  source: 'saved' | 'inferred';
  /** The component pack the app is built with (saved as "pack:<id>", picked in the components panel): its UI 2.0
   *  widgets draw as that pack's components. */
  pack?: string;
}

/** The pack a new UI 2.0 app is built with: the agent's default (MCP_AGENT_PACK), until the user picks another. Unset,
 *  it is Rocket 2.0 (shadcn): ToolJet UI 2.0's own Shad* widgets do not ship on this branch, so a UI 2.0 plan always
 *  draws in a pack. MCP_AGENT_PACK="" builds with no pack. */
export const defaultPack = (): string | undefined => {
  const raw = process.env.MCP_AGENT_PACK;
  return (raw === undefined ? 'shadcn' : raw).trim().toLowerCase() || undefined;
};

/** The globalSettings.componentLibrary an app saves: a pack's "pack:<id>" for UI 2.0, the pack asked for (create_app or
 *  update_app_settings component_pack) or else the default one. */
export const savedComponentLibrary = (library: ComponentLibrary, pack?: string): string => {
  const chosen = pack?.trim().toLowerCase() || defaultPack();
  return library === 'ui2' && chosen ? `pack:${chosen}` : library;
};

/** component_pack on create_app and update_app_settings: a shipped pack's id (shadcn is Rocket 2.0, antd Ant Design,
 *  mui Material UI), whose Lib_<pack>_* widgets the app is then built with. */
export const COMPONENT_PACK_DESCRIPTION =
  'The component pack a UI 2.0 app is built with, saved on the app (the components panel lists it): "shadcn" (Rocket ' +
  '2.0, ToolJet\'s own look), "antd" (Ant Design) or "mui" (Material UI). Pass it when the user names a design system; ' +
  'then build with that pack\'s Lib_<pack>_* widgets. Omitted, the default pack.';

export const COMPONENT_LIBRARY_NAMES: Record<ComponentLibrary, string> = {
  ui1: 'ToolJet UI 1.0',
  ui2: 'ToolJet UI 2.0',
};

export const isUi2Type = (type: unknown): boolean => typeof type === 'string' && /^Shad[A-Z]/.test(type);
/** A component pack's widget (Lib_<pack>_<Component>): a UI 2.0 widget drawn in the pack's look. */
const isPackType = (type: unknown): boolean => typeof type === 'string' && /^Lib_[a-z0-9]+_/i.test(type);

export function resolveComponentLibrary(
  globalSettings: unknown,
  componentTypes: Iterable<unknown>,
): ResolvedComponentLibrary {
  // GET /api/apps/:id snake-cases free-form settings keys; the version endpoint keeps them camelCase.
  const settings = globalSettings as { componentLibrary?: unknown; component_library?: unknown } | undefined;
  const saved = settings?.componentLibrary ?? settings?.component_library;
  if (saved === 'ui1' || saved === 'ui2') return { library: saved, source: 'saved' };
  // Picked in the components panel: a component pack draws the UI 2.0 widgets; another custom library (lib:<id>) is
  // not one the AI builds with, so the app is built in UI 1.0.
  if (typeof saved === 'string' && saved.startsWith('pack:') && saved.length > 5)
    return { library: 'ui2', source: 'saved', pack: saved.slice(5) };
  if (typeof saved === 'string' && saved.startsWith('lib:')) return { library: 'ui1', source: 'saved' };
  for (const type of componentTypes) if (isUi2Type(type) || isPackType(type)) return { library: 'ui2', source: 'inferred' };
  return { library: 'ui1', source: 'inferred' };
}

const styleValue = (styles: unknown, key: string): unknown => {
  const entry = (styles as Record<string, unknown> | undefined)?.[key];
  return entry && typeof entry === 'object' && 'value' in entry ? (entry as { value?: unknown }).value : entry;
};

/** Native types a UI 2.0 page composes with: FlexContainer lays it out, the Table draws in the UI 2.0 look
 *  (styles.tableLook "shadcn", set for it among UI 2.0 widgets), and the Map takes the same frame. */
function nativeFitsUi2(component: { type?: unknown; styles?: unknown }): boolean {
  if (component.type === 'FlexContainer' || component.type === 'Map') return true;
  return component.type === 'Table' && styleValue(component.styles, 'tableLook') !== 'default';
}

/** The pack a UI 2.0 app's widgets draw as: its saved pack, else on a server that ships packs (which has no Shad*
 *  widgets, lint.ts refuses them) the pack a new app is created with. Undefined on a server without packs. */
function buildPack(library: { source: string; pack?: string }): string | undefined {
  if (library.pack) return library.pack;
  return serverLibraryPacks().length ? defaultPack() : undefined;
}

/** The UI 2.0 advice for an app built with a pack: its Lib_<pack>_* types, and the dialog and side sheet it has. */
function packFix(pack: string): string {
  const components = libraryPacksAll().find((p) => p.pack === pack)?.components ?? {};
  const first = (...names: string[]) => names.find((name) => components[name]);
  const dialog = first('Dialog', 'Modal');
  const sheet = first('Drawer', 'Sheet');
  return (
    `Build with the app's component pack instead: types whose names start with Lib_${pack}_ (get_component_catalog ` +
    'lists them), laid out in FlexContainers; ' +
    (dialog ? `Lib_${pack}_${dialog} for dialogs; ` : '') +
    (sheet ? `Lib_${pack}_${sheet} for side sheets; ` : '') +
    'for tables ToolJet\'s Table (styles.tableLook "shadcn").'
  );
}

interface PlannedComponent {
  name?: string;
  type?: unknown;
  styles?: unknown;
}

/**
 * Warnings for a plan that adds widgets from the other library: UI 2.0 widgets to a UI 1.0 app, or native widgets
 * (other than FlexContainer, the Table and the Map) to a UI 2.0 app. A plan that quotes the user's request for the other
 * library (component_library_request) is not warned.
 */
export function componentLibraryWarnings(
  /** source "new": a plan linted without app_id, taken to be for a new app (created on UI 2.0). */
  library: ResolvedComponentLibrary | { library: ComponentLibrary; source: 'new' },
  pages: Array<{ name?: string; components?: PlannedComponent[] }> | undefined,
  request?: string,
): string[] {
  if (request?.trim()) return [];
  const off = new Map<string, string[]>();
  for (const page of pages ?? []) {
    for (const component of page.components ?? []) {
      const type = String(component.type ?? '');
      // A pack widget is a UI 2.0 widget in the pack's look: in a UI 2.0 app it is not from the other library (warned,
      // a pack app's every lint said so; Together round, 2026-10-24).
      const ui2Side = isUi2Type(type) || isPackType(type);
      const mismatch = library.library === 'ui1' ? ui2Side : !ui2Side && !nativeFitsUi2(component);
      if (!mismatch) continue;
      off.set(type, [...(off.get(type) ?? []), component.name ?? type]);
    }
  }
  if (!off.size) return [];
  const listed = [...off].map(([type, names]) => `${type} (${names.slice(0, 3).join(', ')}${names.length > 3 ? ', ...' : ''})`).join('; ');
  const how = library.source === 'saved' ? 'its saved library'
    : library.source === 'inferred' ? 'the library its widgets imply'
    : 'new apps are; pass app_id to check the plan against an existing app';
  const appName = COMPONENT_LIBRARY_NAMES[library.library];
  const pack = library.library === 'ui2' ? buildPack(library) : undefined;
  const fix = library.library === 'ui1'
    ? 'Build with the native ToolJet types instead (Table, Chart, TextInput, DropdownV2, ModalV2, Container, ...).'
    : pack
      ? packFix(pack)
      : 'Build with the UI 2.0 types instead: types whose names start with Shad, laid out in FlexContainers; ShadDialog for ' +
        'dialogs and side sheets; for tables ToolJet\'s Table (styles.tableLook "shadcn").';
  return [
    `This app is built in ${appName} (${how}), and the plan adds widgets from the other library: ${listed}. ${fix} ` +
      'If the user asked for the other library in this request, keep the plan and put their words in component_library_request.',
  ];
}
