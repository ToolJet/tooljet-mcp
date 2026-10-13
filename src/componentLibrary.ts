/* The component library an app is built in: ToolJet UI 1.0 (the native widgets) or ToolJet UI 2.0 (the Shad* types,
   composed in FlexContainers). ToolJet saves it per app version in globalSettings.componentLibrary and the components
   panel lists that library. New apps are created on 'ui2'; an app from before the setting has none, so its library is
   inferred: 'ui2' when it already holds a Shad* widget, else 'ui1' (the same rule as the ToolJet frontend's
   RightSideBar/ComponentManagerTab/componentLibrary.js). */

export type ComponentLibrary = 'ui1' | 'ui2';
export interface ResolvedComponentLibrary {
  library: ComponentLibrary;
  /** "saved": the app's own setting; "inferred": no setting, read from the widgets the app holds. */
  source: 'saved' | 'inferred';
}

export const COMPONENT_LIBRARY_NAMES: Record<ComponentLibrary, string> = {
  ui1: 'ToolJet UI 1.0',
  ui2: 'ToolJet UI 2.0',
};

export const isUi2Type = (type: unknown): boolean => typeof type === 'string' && /^Shad[A-Z]/.test(type);

export function resolveComponentLibrary(
  globalSettings: unknown,
  componentTypes: Iterable<unknown>,
): ResolvedComponentLibrary {
  // GET /api/apps/:id snake-cases free-form settings keys; the version endpoint keeps them camelCase.
  const settings = globalSettings as { componentLibrary?: unknown; component_library?: unknown } | undefined;
  const saved = settings?.componentLibrary ?? settings?.component_library;
  if (saved === 'ui1' || saved === 'ui2') return { library: saved, source: 'saved' };
  for (const type of componentTypes) if (isUi2Type(type)) return { library: 'ui2', source: 'inferred' };
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
      const mismatch = library.library === 'ui1' ? isUi2Type(type) : !isUi2Type(type) && !nativeFitsUi2(component);
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
  const fix = library.library === 'ui1'
    ? 'Build with the native ToolJet types instead (Table, Chart, TextInput, DropdownV2, ModalV2, Container, ...).'
    : 'Build with the UI 2.0 types instead: types whose names start with Shad, laid out in FlexContainers; ShadDialog for ' +
      'dialogs and side sheets; for tables ToolJet\'s Table (styles.tableLook "shadcn").';
  return [
    `This app is built in ${appName} (${how}), and the plan adds widgets from the other library: ${listed}. ${fix} ` +
      'If the user asked for the other library in this request, keep the plan and put their words in component_library_request.',
  ];
}
