/* Expose shipped packs and published workspace libraries as Lib_<pack>_<Component> catalog types.
   The editor stores shipped components by server pack ID and workspace components by library identity. */
import type { ComponentSchema } from './catalog.js';
import { registerComponentSchemas } from './catalog.js';
import { registerPackDefinitions } from './packDefaults.js';
import { registerLibraryPacks, type LibraryPack } from './libraryPack.js';
import { describePackSlots, packSlotsFromManifest } from './packSlots.js';

interface ManifestProp {
  name: string;
  type: string;
  default?: unknown;
  label?: string;
  enumValues?: string[];
  description?: string;
  min?: number;
  max?: number;
  /** 'hidden': kept off the editor's inspector. */
  inspector?: string;
}
interface ManifestComponent {
  displayName?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  props?: ManifestProp[];
  styles?: ManifestProp[];
  events?: Array<{ name: string; displayName?: string }>;
  actions?: Array<{ name: string; displayName?: string; params?: Array<{ handle: string; displayName?: string }> }>;
  validation?: string;
  slots?: Array<{ name: string; kind: string }>;
  role?: string;
  usage?: string;
  fit?: boolean;
  /** 'upper': the component writes its label in capitals (MUI's Button). */
  labelCase?: string;
  roleProps?: Record<string, string>;
  roleEvents?: Record<string, string>;
  roleActions?: Record<string, string>;
  roleValues?: Record<string, Record<string, string>>;
}
export interface InstalledLibrary {
  id: string;
  name: string;
  correlationId: string;
  codeMode?: boolean;
  manifest: { manifestVersion?: number; pack?: string; surface?: Record<string, unknown>; themeMode?: string; components?: Record<string, ManifestComponent> } | null;
  revisions?: Array<{ version: string }>;
}

const words = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
const eventLabel = (s: string) => words(s).replace(/ (\w)/g, (_, c: string) => ` ${c.toLowerCase()}`);
const VALUE_TYPE: Record<string, string> = { string: 'string', number: 'number', boolean: 'boolean', array: 'array', object: 'object', enumeration: 'string' };
// The definition value a manifest default is stored as (the editor's drop stamping, libraryComponentDefaults.ts).
const stamp = (p: ManifestProp): string => {
  if (p.default === undefined) return p.type === 'boolean' ? '{{false}}' : '';
  if (p.type === 'boolean') return `{{${p.default}}}`;
  if (p.type === 'enumeration' || p.type === 'string') return String(p.default);
  return `{{${JSON.stringify(p.default)}}}`;
};
// Descriptive props whose palette sample an AI-built component should not show when the plan leaves them out.
const SAMPLE_TEXT = /^(eyebrow|subtitle|description|meta|actionLabel|secondaryActionLabel|asideValue|asideLabel|changeLabel|change)$/;
// Display text whose literal palette value is a sample (packDefaults.ts PACK_SAMPLE_TEXT: a Select labelled "Department").
const SAMPLE_LABELS = new Set(['label', 'title', 'resourceTitle', 'subTitle', 'message']);
// Neutral text the pack draws by default, not a sample: an Empty that says nothing, ListView rows without their action.
const NEUTRAL_TEXT = new Set(['Empty.description', 'ListView.actionLabel']);
/** The blank an agent-built component is saved with in place of a palette sample, or undefined to keep the default. */
const sampleBlank = (component: string, p: ManifestProp): '' | '{{[]}}' | undefined => {
  if (p.type === 'boolean' || NEUTRAL_TEXT.has(`${component}.${p.name}`)) return undefined;
  if (SAMPLE_TEXT.test(p.name)) return p.type === 'array' ? '{{[]}}' : '';
  const literal = typeof p.default === 'string' && p.default !== '' && !p.default.trim().startsWith('{{');
  return SAMPLE_LABELS.has(p.name) && literal ? '' : undefined;
};

/** A pack that ships with ToolJet (GET /api/builtin-packs). */
export interface BuiltinPackInfo {
  pack: string;
  displayName: string;
  version: string;
  hash: string;
  hasCss?: boolean;
}

type PackManifest = NonNullable<InstalledLibrary['manifest']>;
type PackResult = { pack: LibraryPack; schemas: Record<string, ComponentSchema>; definitions: Record<string, unknown> };

function legacyPackId(lib: InstalledLibrary): string {
  const name = lib.manifest?.manifestVersion === 2 ? lib.manifest.pack || lib.name : '';
  return typeof name === 'string' ? name.toLowerCase().replace(/[^a-z0-9]+/g, '') : '';
}

export function packFromLibrary(lib: InstalledLibrary, occupied: ReadonlySet<string> = new Set()): PackResult | null {
  const manifest = lib.manifest;
  if (lib.codeMode || !lib.revisions?.[0]?.version || !manifest?.components || !Object.keys(manifest.components).length) return null;
  if (manifest.manifestVersion !== undefined && manifest.manifestVersion !== 2) return null;
  // Preserve legacy pack prefixes when unique. Public CLI libraries use a stable ID even after renaming.
  const legacy = legacyPackId(lib);
  const packId = legacy && !occupied.has(legacy) ? legacy : `lib${lib.id.replace(/-/g, '')}`;
  return packFromManifest(packId, lib.name, lib.revisions[0].version, manifest, {
    kind: 'library',
    libraryId: lib.id,
    correlationId: lib.correlationId,
  });
}

/** A shipped pack: its manifest has no manifestVersion; the pack id is the server's folder name. */
export function packFromBuiltin(info: BuiltinPackInfo, manifest: PackManifest | null): PackResult | null {
  if (!manifest?.components) return null;
  // The Lib_* type keeps letters and digits only; the stored `pack` property must be the id the server serves the
  // files under (its folder name, hyphens and all), or the canvas finds no such pack.
  const packId = info.pack.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return packFromManifest(packId, info.displayName || info.pack, info.version ?? '', manifest, {
    kind: 'builtin',
    libraryId: '',
    correlationId: '',
    serverPack: info.pack,
  });
}

function packFromManifest(
  packId: string,
  libraryName: string,
  version: string,
  manifest: PackManifest,
  identity: { kind: 'builtin' | 'library'; libraryId: string; correlationId: string; serverPack?: string },
): PackResult | null {
  const { serverPack, ...packIdentity } = identity;
  if (!manifest.components) return null;
  const lib = { name: libraryName };
  const prefix = `Lib_${packId}_`;
  const schemas: Record<string, ComponentSchema> = {};
  const definitions: Record<string, unknown> = {};
  const components: LibraryPack['components'] = {};
  const manifestListsSlots = Object.values(manifest.components).some((entry) => entry.slots !== undefined);
  for (const [name, entry] of Object.entries(manifest.components)) {
    const type = `${prefix}${name}`;
    const allProps = entry.props ?? [];
    // An input's hidden `value` is what the user typed, which the widget sets itself: it starts from defaultValue.
    // Offered as a setting, a build "cleared" a money field's default there and the field still opened at 1 (codex
    // staging audit UI-05, 2026-10-26). It stays readable as an exposed value.
    const runtimeValue = (p: ManifestProp) =>
      p.name === 'value' && p.inspector === 'hidden' && allProps.some((q) => q.name === 'defaultValue');
    const props = allProps.filter((p) => !runtimeValue(p));
    const fits = entry.fit === true;
    // Where its child components go: fixed slots and one per item (packSlots.ts).
    // A manifest that lists slots for its containers leaves them out for widgets that draw none (a Button), so there an
    // absent list is an empty one; a manifest that lists none anywhere says nothing, and its children stay unchecked.
    const slotInfo = packSlotsFromManifest(entry.slots ?? (manifestListsSlots ? [] : undefined), allProps);
    components[name] = {
      type,
      props: props.map((p) => p.name),
      events: (entry.events ?? []).map((e) => e.name),
      styles: (entry.styles ?? []).map((s) => s.name),
      actions: (entry.actions ?? []).map((a) => a.name),
      fit: fits,
      ...(entry.role ? { role: entry.role } : {}),
      ...(entry.roleProps ? { roleProps: entry.roleProps } : {}),
      ...(entry.roleEvents ? { roleEvents: entry.roleEvents } : {}),
      ...(entry.roleActions ? { roleActions: entry.roleActions } : {}),
      // Preserve whether this manifest supplies slot metadata, including explicit empty lists.
      slotsKnown: manifestListsSlots,
      // The canvases a child may go on (lint.ts lintPackItemSlots), as the offline catalog lists them.
      ...(entry.slots?.length ? { slots: entry.slots } : {}),
    };
    schemas[type] = {
      type,
      name: type,
      // Read by the AI compiler, which plans in roles and resolves a role to this pack's component (libSwap.ts).
      pack: {
        id: packId,
        component: name,
        ...(entry.role ? { role: entry.role } : {}),
        ...(entry.roleProps ? { roleProps: entry.roleProps } : {}),
        ...(entry.roleEvents ? { roleEvents: entry.roleEvents } : {}),
        ...(entry.roleActions ? { roleActions: entry.roleActions } : {}),
        ...(entry.roleValues ? { roleValues: entry.roleValues } : {}),
        ...(entry.labelCase ? { labelCase: entry.labelCase } : {}),
        slots: entry.slots ?? [],
        ...(slotInfo ? { slotInfo } : {}),
        ...(manifest.surface ? { surface: manifest.surface } : {}),
        ...(manifest.themeMode ? { themeMode: manifest.themeMode } : {}),
      },
      description: [
        `${entry.displayName ?? words(name)} from the ${lib.name} pack.`,
        entry.usage,
        describePackSlots(slotInfo),
        fits ? 'Sizes to its content in the app (Dynamic height on).' : 'Drawn at the height you give it.',
      ].filter(Boolean).join(' '),
      defaultSize: { width: entry.defaultWidth ?? 6, height: (entry.defaultHeight ?? 4) * 10 },
      properties: [
        ...props.map((p) => ({
          key: p.name,
          label: p.label ?? words(p.name),
          valueType: VALUE_TYPE[p.type] ?? 'string',
          ...(p.default !== undefined ? { default: stamp(p) } : {}),
          ...(p.enumValues ? { allowedValues: p.enumValues } : {}),
          ...(p.description ? { description: p.description } : {}),
        })),
        { key: 'visibility', label: 'Visibility', valueType: 'boolean', default: '{{true}}' },
        // ToolJet's PackComponent saves it on every pack component; the host frees a hidden one's space with it.
        { key: 'collapseWhenHidden', label: 'Collapse when hidden', valueType: 'boolean', default: '{{false}}' },
        { key: 'loadingState', label: 'Loading state', valueType: 'boolean', default: '{{false}}' },
        { key: 'disabledState', label: 'Disable', valueType: 'boolean', default: '{{false}}' },
        { key: 'dynamicHeight', label: 'Dynamic height', valueType: 'boolean', default: fits ? '{{true}}' : '{{false}}' },
      ],
      styles: [
        ...(entry.styles ?? []).map((s) => ({ key: s.name, label: s.label ?? words(s.name), valueType: VALUE_TYPE[s.type] ?? 'string' })),
        { key: 'boxShadow', label: 'Box shadow', valueType: 'string' },
      ],
      events: (entry.events ?? []).map((e) => ({ id: e.name, label: e.displayName ?? eventLabel(e.name) })),
      actions: [
        ...(entry.actions ?? []).map((a) => ({
          handle: a.name,
          displayName: a.displayName ?? words(a.name),
          ...(a.params?.length ? { params: a.params.map((p) => ({ handle: p.handle, displayName: p.displayName ?? words(p.handle) })) } : {}),
        })),
        { handle: 'setVisibility', displayName: 'Set visibility', params: [{ handle: 'visibility', displayName: 'Value', defaultValue: '{{false}}' }] },
        { handle: 'setLoading', displayName: 'Set loading', params: [{ handle: 'loading', displayName: 'Value', defaultValue: '{{false}}' }] },
        { handle: 'setDisable', displayName: 'Set disable', params: [{ handle: 'disable', displayName: 'Value', defaultValue: '{{false}}' }] },
      ],
      exposedVariables: [
        // The default an agent-built component starts with: a blanked sample is advertised blank, as it is saved.
        ...allProps.map((p) => {
          const blank = p.default !== undefined ? sampleBlank(name, p) : undefined;
          const advertised = blank === undefined ? p.default : blank === '{{[]}}' ? [] : '';
          return { name: p.name, ...(advertised !== undefined ? { default: advertised } : {}) };
        }),
        { name: 'isVisible', default: true },
        { name: 'isLoading', default: false },
        { name: 'isDisabled', default: false },
        ...(entry.validation ? [{ name: 'isValid', default: true }, { name: 'isMandatory', default: false }] : []),
      ],
    } as unknown as ComponentSchema;
    definitions[type] = {
      properties: {
        ...Object.fromEntries(props.map((p) => [p.name, { value: sampleBlank(name, p) ?? stamp(p) }])),
        visibility: { value: '{{true}}' },
        collapseWhenHidden: { value: '{{false}}' },
        loadingState: { value: '{{false}}' },
        disabledState: { value: '{{false}}' },
        dynamicHeight: { value: fits ? '{{true}}' : '{{false}}' },
      },
      styles: { boxShadow: { value: '0px 0px 0px 0px #00000040' } },
      others: { showOnDesktop: { value: '{{true}}' }, showOnMobile: { value: '{{false}}' } },
    };
  }
  return {
    pack: { pack: serverPack ?? packId, prefix, ...packIdentity, libraryName, version, components },
    schemas,
    definitions,
  };
}

/** Registers both shipped packs and published workspace libraries, returning their names and versions. A
 *  failure leaves the offline catalogue. `listBuiltin` resolves null on a server without the builtin-packs module. */
export async function loadInstalledPacks(
  listLibraries: () => Promise<InstalledLibrary[]>,
  listBuiltin?: () => Promise<Array<{ info: BuiltinPackInfo; manifest: PackManifest | null }> | null>,
): Promise<string[]> {
  const [builtin, libraries] = await Promise.all([
    listBuiltin?.().catch(() => null),
    listLibraries().catch(() => []),
  ]);
  const packs = (builtin ?? []).map(b => packFromBuiltin(b.info, b.manifest)).filter((p): p is PackResult => !!p);
  const occupied = new Set(packs.map(p => p.pack.prefix.slice(4, -1)));
  // Stable IDs disambiguate names that normalize to the same catalog prefix.
  const nameCounts = new Map<string, number>();
  for (const lib of libraries) {
    occupied.add(`lib${lib.id.replace(/-/g, '')}`);
    if (lib.codeMode || !lib.revisions?.[0]?.version) continue;
    const name = legacyPackId(lib);
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }
  for (const [name, count] of nameCounts) if (count > 1) occupied.add(name);
  for (const lib of libraries) {
    try {
      const built = packFromLibrary(lib, occupied);
      if (built) packs.push(built);
    } catch {
      // A malformed published manifest must not hide the other libraries in this workspace.
      console.error(`tooljet-mcp: skipped invalid component manifest for library ${lib.id}`);
    }
  }
  if (!packs.length) return [];
  registerComponentSchemas(Object.assign({}, ...packs.map((p) => p.schemas)));
  registerPackDefinitions(Object.assign({}, ...packs.map((p) => p.definitions)));
  registerLibraryPacks(packs.map((p) => p.pack));
  return packs.map((p) => `${p.pack.libraryName} ${p.pack.version}`);
}
