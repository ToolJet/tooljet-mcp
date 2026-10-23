/* Experiment (exp/packs-adapter): a published custom-component library, exposed to the agent as ordinary types
   (`Lib_<pack>_<Component>`, data/library-pack.json, from scripts/generate-library-pack.mjs). ToolJet stores every
   library component as one type, LibraryComponent, with the library and component named in its properties, and an
   app renders it only while its version pins the library (globalSettings.customComponentLibraries, keyed by the
   library's correlation id without dashes). This file is the translation between the two. */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface LibraryPack {
  pack: string;
  prefix: string;
  libraryId: string;
  correlationId: string;
  libraryName: string;
  version: string;
  components: Record<string, { type: string; props: string[]; events: string[] }>;
}

let cached: LibraryPack | null | undefined;

export function libraryPack(): LibraryPack | null {
  if (cached === undefined) {
    try {
      const path = resolve(dirname(fileURLToPath(import.meta.url)), '../data/library-pack.json');
      cached = JSON.parse(readFileSync(path, 'utf8')) as LibraryPack;
    } catch {
      cached = null;
    }
  }
  return cached;
}

export const isLibraryPackType = (type: unknown): type is string => {
  const pack = libraryPack();
  return !!pack && typeof type === 'string' && type.startsWith(pack.prefix);
};

/** The globalSettings entry that pins the library for an app version. */
export function libraryPins(): Record<string, string> | undefined {
  const pack = libraryPack();
  return pack ? { [pack.correlationId.replace(/-/g, '')]: pack.version } : undefined;
}

type Section = Record<string, unknown>;

/** A `Lib_*` component as ToolJet stores it: LibraryComponent, the library identity in its properties. */
export function toLibraryComponent<T extends { type: string; properties?: Section }>(spec: T): T {
  const pack = libraryPack();
  if (!pack || !isLibraryPackType(spec.type)) return spec;
  const componentName = spec.type.slice(pack.prefix.length);
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

/** The `Lib_*` type of a stored LibraryComponent of this library, for reads (summaries, lint of the saved app). */
export function libraryTypeOf(component: { type?: string; properties?: Section }): string | undefined {
  const pack = libraryPack();
  if (!pack || component.type !== 'LibraryComponent') return undefined;
  const value = (key: string) => {
    const entry = component.properties?.[key] as { value?: unknown } | unknown;
    return entry && typeof entry === 'object' && 'value' in (entry as object) ? (entry as { value?: unknown }).value : entry;
  };
  if (value('correlationId') !== pack.correlationId) return undefined;
  const name = value('componentName');
  return typeof name === 'string' && pack.components[name] ? `${pack.prefix}${name}` : undefined;
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
