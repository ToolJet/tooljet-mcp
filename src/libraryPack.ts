/* Experiment (exp/packs-adapter): a published custom-component library, exposed to the agent as ordinary types
   (`Lib_<pack>_<Component>`, data/library-pack.json, from scripts/generate-library-pack.mjs). ToolJet stores every
   library component as one type, LibraryComponent, with the library and component named in its properties, and an
   app renders it only while its version pins the library (globalSettings.customComponentLibraries, keyed by the
   library's correlation id without dashes). This file is the translation between the two.
   A ToolJet that ships its packs (the builtin-packs module, PR #18746) stores a pack component as PackComponent with
   only { pack, componentName } in its properties: no library identity and no version pin. A pack read from that
   endpoint has kind 'builtin' and is written that way. */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface LibraryPack {
  pack: string;
  prefix: string;
  /** 'builtin': shipped with ToolJet (GET /api/builtin-packs), stored as PackComponent. Absent or 'library': an
   *  installed custom-component library, stored as LibraryComponent with its identity and a version pin. */
  kind?: 'builtin' | 'library';
  libraryId: string;
  correlationId: string;
  libraryName: string;
  version: string;
  components: Record<string, { type: string; props: string[]; events: string[]; [key: string]: unknown }>;
}

let discovered: LibraryPack[] | null = null;
let offline: LibraryPack | null | undefined;

/** The packs this server knows: those discovered in the workspace at start-up (packCatalog.ts), else the offline
 *  data/library-pack.json. */
export function libraryPacksAll(): LibraryPack[] {
  if (discovered) return discovered;
  if (offline === undefined) {
    try {
      const path = resolve(dirname(fileURLToPath(import.meta.url)), '../data/library-pack.json');
      offline = JSON.parse(readFileSync(path, 'utf8')) as LibraryPack;
    } catch {
      offline = null;
    }
  }
  return offline ? [offline] : [];
}

export function registerLibraryPacks(packs: LibraryPack[]): void {
  discovered = packs;
}

/** The packs the ToolJet server announced at start-up (none offline or in tests). */
export const serverLibraryPacks = (): LibraryPack[] => discovered ?? [];

/** The first known pack (callers that need any pack at all). */
export function libraryPack(): LibraryPack | null {
  return libraryPacksAll()[0] ?? null;
}

const isBuiltin = (pack: LibraryPack): boolean => pack.kind === 'builtin';

const packOfType = (type: unknown): LibraryPack | undefined =>
  typeof type === 'string' ? libraryPacksAll().find((p) => type.startsWith(p.prefix)) : undefined;

export const isLibraryPackType = (type: unknown): type is string => !!packOfType(type);

/** The globalSettings entry that pins every known pack for an app version. */
export function libraryPins(): Record<string, string> | undefined {
  // A shipped pack (PackComponent) needs no pin: it always draws the build the release ships.
  const packs = libraryPacksAll().filter((p) => !isBuiltin(p));
  return packs.length ? Object.fromEntries(packs.map((p) => [p.correlationId.replace(/-/g, ''), p.version])) : undefined;
}

type Section = Record<string, unknown>;

/** A `Lib_*` component as ToolJet stores it: PackComponent naming its pack and component for a shipped pack, else
 *  LibraryComponent with the library identity in its properties. */
export function toLibraryComponent<T extends { type: string; properties?: Section }>(spec: T): T {
  const pack = packOfType(spec.type);
  if (!pack) return spec;
  const componentName = spec.type.slice(pack.prefix.length);
  if (isBuiltin(pack)) {
    return {
      ...spec,
      type: 'PackComponent',
      properties: {
        ...(spec.properties ?? {}),
        pack: { value: pack.pack },
        componentName: { value: componentName },
      },
    };
  }
  return {
    ...spec,
    type: 'LibraryComponent',
    properties: {
      ...(spec.properties ?? {}),
      libraryId: { value: pack.libraryId },
      correlationId: { value: pack.correlationId },
      libraryName: { value: pack.libraryName },
      componentName: { value: componentName },
    },
  };
}

/** The `Lib_*` type of a stored PackComponent or LibraryComponent of a known pack, for reads (summaries, lint of the
 *  saved app). */
export function libraryTypeOf(component: { type?: string; properties?: Section }): string | undefined {
  if (component.type !== 'LibraryComponent' && component.type !== 'PackComponent') return undefined;
  const value = (key: string) => {
    const entry = component.properties?.[key] as { value?: unknown } | unknown;
    return entry && typeof entry === 'object' && 'value' in (entry as object) ? (entry as { value?: unknown }).value : entry;
  };
  if (component.type === 'PackComponent') {
    const id = value('pack');
    const name = value('componentName');
    if (typeof id !== 'string' || typeof name !== 'string') return undefined;
    const known = libraryPacksAll().find((p) => p.pack === id);
    // A pack this server has not read still reads back as its Lib_* type, so the agent sees what is on the page.
    return !known || known.components[name] ? `Lib_${id}_${name}` : undefined;
  }
  const pack = libraryPacksAll().find((p) => p.correlationId === value('correlationId'));
  const name = value('componentName');
  return pack && typeof name === 'string' && pack.components[name] ? `${pack.prefix}${name}` : undefined;
}

// The FlexContainer of a ToolJet without UI 2.0's layout (the team branch): its schema has no stretch or baseline
// alignment and no space-between, and refuses the save of a page that uses them. The MCP's own flex polish adds
// stretch to rows of cards, so the downgrade runs at the write, after every pass.
const FLEX_DOWNGRADE: Record<string, Record<string, string>> = {
  alignItems: { stretch: 'flex-start', 'last baseline': 'flex-start' },
  justifyContent: { 'space-between': 'flex-start' },
};

export function downgradeFlexForLibrary<T extends { type: string; properties?: Section }>(spec: T): T {
  // Only for a ToolJet without UI 2.0's layout (TOOLJET_FLEX_V1=1, the team branch before the core port).
  if (process.env.TOOLJET_FLEX_V1 !== '1' || !libraryPack() || spec.type !== 'FlexContainer' || !spec.properties) return spec;
  const properties = { ...spec.properties };
  for (const [key, map] of Object.entries(FLEX_DOWNGRADE)) {
    const entry = properties[key] as { value?: unknown } | undefined;
    const value = entry && typeof entry === 'object' ? entry.value : entry;
    if (typeof value === 'string' && map[value]) properties[key] = { value: map[value] };
  }
  return { ...spec, properties };
}
