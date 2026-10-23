/* Component packs installed in the workspace, read at start-up: every custom-component library whose latest revision
   has a v2 manifest (manifestVersion 2, written by ToolJet's packages/pack-tools) is a pack, and each of its components
   becomes a catalogue type `Lib_<pack>_<Component>` with its properties, styles, events, actions, exposed values and
   usage, a default definition, and the identity libraryPack.ts stores it with. Libraries without a v2 manifest
   (one-off custom components) stay out of the catalogue. scripts/generate-library-pack.mjs is the offline version. */
import type { ComponentSchema } from './catalog.js';
import { registerComponentSchemas } from './catalog.js';
import { registerPackDefinitions } from './packDefaults.js';
import { registerLibraryPacks, type LibraryPack } from './libraryPack.js';

interface ManifestProp {
  name: string;
  type: string;
  default?: unknown;
  label?: string;
  enumValues?: string[];
  description?: string;
  min?: number;
  max?: number;
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
  roleProps?: Record<string, string>;
  roleEvents?: Record<string, string>;
  roleActions?: Record<string, string>;
  roleValues?: Record<string, Record<string, string>>;
}
export interface InstalledLibrary {
  id: string;
  name: string;
  correlationId: string;
  manifest: { manifestVersion?: number; pack?: string; surface?: Record<string, unknown>; components?: Record<string, ManifestComponent> } | null;
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

export function packFromLibrary(lib: InstalledLibrary): { pack: LibraryPack; schemas: Record<string, ComponentSchema>; definitions: Record<string, unknown> } | null {
  const manifest = lib.manifest;
  if (!manifest || manifest.manifestVersion !== 2 || !manifest.components) return null;
  const packId = (manifest.pack || lib.name).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const prefix = `Lib_${packId}_`;
  const version = lib.revisions?.[0]?.version ?? '';
  const schemas: Record<string, ComponentSchema> = {};
  const definitions: Record<string, unknown> = {};
  const components: LibraryPack['components'] = {};
  for (const [name, entry] of Object.entries(manifest.components)) {
    const type = `${prefix}${name}`;
    const props = entry.props ?? [];
    const fits = entry.fit === true;
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
        slots: entry.slots ?? [],
        ...(manifest.surface ? { surface: manifest.surface } : {}),
      },
      description: [
        `${entry.displayName ?? words(name)} from the ${lib.name} pack.`,
        entry.usage,
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
        ...props.map((p) => ({ name: p.name, ...(p.default !== undefined ? { default: p.default } : {}) })),
        { name: 'isVisible', default: true },
        { name: 'isLoading', default: false },
        { name: 'isDisabled', default: false },
        ...(entry.validation ? [{ name: 'isValid', default: true }, { name: 'isMandatory', default: false }] : []),
      ],
    } as unknown as ComponentSchema;
    definitions[type] = {
      properties: {
        ...Object.fromEntries(props.map((p) => [p.name, { value: SAMPLE_TEXT.test(p.name) && p.type !== 'boolean' ? (p.type === 'array' ? '{{[]}}' : '') : stamp(p) }])),
        visibility: { value: '{{true}}' },
        loadingState: { value: '{{false}}' },
        disabledState: { value: '{{false}}' },
        dynamicHeight: { value: fits ? '{{true}}' : '{{false}}' },
      },
      styles: { boxShadow: { value: '0px 0px 0px 0px #00000040' } },
      others: { showOnDesktop: { value: '{{true}}' }, showOnMobile: { value: '{{false}}' } },
    };
  }
  return {
    pack: { pack: packId, prefix, libraryId: lib.id, correlationId: lib.correlationId, libraryName: lib.name, version, components },
    schemas,
    definitions,
  };
}

/** Reads the workspace's packs and registers them; returns their ids. A failure leaves the offline catalogue. */
export async function loadInstalledPacks(listLibraries: () => Promise<InstalledLibrary[]>): Promise<string[]> {
  const libraries = await listLibraries();
  const packs = libraries.map(packFromLibrary).filter((p): p is NonNullable<typeof p> => !!p);
  if (!packs.length) return [];
  registerComponentSchemas(Object.assign({}, ...packs.map((p) => p.schemas)));
  registerPackDefinitions(Object.assign({}, ...packs.map((p) => p.definitions)));
  registerLibraryPacks(packs.map((p) => p.pack));
  return packs.map((p) => `${p.pack.libraryName} ${p.pack.version}`);
}
