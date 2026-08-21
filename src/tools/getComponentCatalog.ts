import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import type { ComponentSchema } from '../catalog.js';
import { getCatalog, getComponentSchema, getLegacyComponentReplacement } from '../catalog.js';
import { ok, fail, type ToolDef } from './types.js';

const CATALOG_SECTIONS = [
  'overview',
  'properties',
  'styles',
  'events',
  'actions',
  'exposedVariables',
  'defaultChildren',
  'renderingHints',
  'authoringHints',
] as const;

type CatalogSection = (typeof CATALOG_SECTIONS)[number];
type CatalogDetail = 'compact' | 'full';

// Typed catalog reads are often the largest fresh MCP result in an agent turn. Keep the
// default useful for authoring while leaving secondary style/exposed/default-child branches
// available through an explicit sections request.
const DEFAULT_TYPED_SECTIONS: CatalogSection[] = [
  'overview',
  'properties',
  'events',
  'actions',
];

interface CatalogArgs {
  type?: string;
  types?: string[];
  requests?: Array<{
    type: string;
    detail?: CatalogDetail;
    sections?: CatalogSection[];
    property_keys?: string[];
    style_keys?: string[];
  }>;
  detail?: CatalogDetail;
  sections?: CatalogSection[];
  property_keys?: string[];
  style_keys?: string[];
}

const CATALOG_TYPE_ALIASES = new Map([
  ['gridview', {
    type: 'Listview',
    note: 'ToolJet grid view is Listview with mode:"grid" (properties.mode.value); use type:"Listview" when creating it.',
  }],
]);

function resolveCatalogType(requestedType: string): {
  type: string;
  alias?: { requested_type: string; note: string };
} {
  const alias = CATALOG_TYPE_ALIASES.get(requestedType.replace(/[\s_-]+/g, '').toLowerCase());
  return alias
    ? { type: alias.type, alias: { requested_type: requestedType, note: alias.note } }
    : { type: requestedType };
}

function selectEntries(
  entries: ComponentSchema['properties'],
  keys: string[] | undefined,
  detail: CatalogDetail
): ComponentSchema['properties'] {
  const selected = keys?.length
    ? entries.filter((entry) => keys.includes(entry.key))
    : entries;
  if (detail === 'full' || keys?.length) return selected;
  return selected.map(({ key, valueType, allowedValues, requires, mutuallyExclusiveWith }) => ({
    key,
    ...(valueType !== undefined ? { valueType } : {}),
    ...(allowedValues !== undefined ? { allowedValues } : {}),
    ...(requires !== undefined ? { requires } : {}),
    ...(mutuallyExclusiveWith !== undefined ? { mutuallyExclusiveWith } : {}),
  }));
}

function selectSchema(schema: ComponentSchema, args: CatalogArgs): Record<string, unknown> {
  const detail = args.detail ?? 'compact';
  const sections = new Set(args.sections ?? DEFAULT_TYPED_SECTIONS);
  const result: Record<string, unknown> = { type: schema.type };
  if (sections.has('overview')) {
    if (schema.name !== undefined) result.name = schema.name;
    if (schema.description !== undefined) result.description = schema.description;
    if (schema.defaultSize !== undefined) result.defaultSize = schema.defaultSize;
  }
  if (sections.has('properties')) {
    result.properties = selectEntries(schema.properties, args.property_keys, detail);
  }
  if (sections.has('styles')) {
    result.styles = selectEntries(schema.styles, args.style_keys, detail);
  }
  if (sections.has('events') && schema.events !== undefined) result.events = schema.events;
  if (sections.has('actions') && schema.actions !== undefined) result.actions = schema.actions;
  if (sections.has('exposedVariables') && schema.exposedVariables !== undefined) {
    result.exposedVariables = schema.exposedVariables;
  }
  if (sections.has('defaultChildren') && schema.defaultChildren !== undefined) {
    result.defaultChildren = schema.defaultChildren;
  }
  if (sections.has('renderingHints') && schema.renderingHints !== undefined) {
    result.renderingHints = schema.renderingHints;
  }
  if (sections.has('authoringHints') && schema.authoringHints !== undefined) {
    result.authoringHints = schema.authoringHints;
  }
  return result;
}

function legacyNotice(type: string): Record<string, unknown> {
  const replacement = getLegacyComponentReplacement(type);
  return replacement
    ? {
        deprecated: true,
        replacement,
        deprecation_note:
          `"${type}" remains available only for inspecting or repairing existing apps. ` +
          `Use "${replacement}" for new components.`,
      }
    : {};
}

export function getComponentCatalogTool(_client: ToolJetClient): ToolDef {
  return {
    name: 'get_component_catalog',
    description:
      'Discover ToolJet components. With no type(s), returns the lightweight palette. Use type for one ' +
      'component or types for a batch needed in the current page/phase. Typed reads default to detail:"compact" ' +
      'and the overview/properties/events/actions sections; compact ' +
      'property/style lists omit labels and defaults. Use detail:"full" or exact property_keys/style_keys only when ' +
      'those values are needed. Request renderingHints/authoringHints for layout-sensitive or nested components. ' +
      'Use requests when different types need different sections/keys in one call. ' +
      'sections selects only overview, ' +
      'properties, styles, events, actions, exposedVariables, defaultChildren, renderingHints, and/or authoringHints; ' +
      'property_keys/style_keys narrow those arrays further. A batch returns {components,unknown_types}. ' +
      'GridView is a lookup alias for Listview mode:"grid"; component writes must still use type:"Listview". ' +
      'authoringHints covers nested contracts such as ModalV2 native slots, Table row-action Button columns, and Form JSON-schema field types. Fetch complex/unfamiliar ' +
      'contracts once and reuse them; never guess property/event/action ids.',
    inputSchema: {
      type: z.string().optional(),
      types: z.array(z.string()).min(1).max(25).optional(),
      requests: z.array(z.object({
        type: z.string(),
        detail: z.enum(['compact', 'full']).optional(),
        sections: z.array(z.enum(CATALOG_SECTIONS)).min(1).optional(),
        property_keys: z.array(z.string()).min(1).optional(),
        style_keys: z.array(z.string()).min(1).optional(),
      })).min(1).max(25).optional(),
      detail: z.enum(['compact', 'full']).optional(),
      sections: z.array(z.enum(CATALOG_SECTIONS)).min(1).optional(),
      property_keys: z.array(z.string()).min(1).optional(),
      style_keys: z.array(z.string()).min(1).optional(),
    },
    async handler(args: CatalogArgs) {
      try {
        const selectors = Number(Boolean(args?.type)) + Number(Boolean(args?.types?.length)) + Number(Boolean(args?.requests?.length));
        if (selectors > 1) {
          return fail(new Error('Pass exactly one of `type`, `types`, or `requests`.'));
        }
        if (!selectors) {
          if (args.detail || args.sections || args.property_keys || args.style_keys) {
            return fail(new Error('Catalog detail/sections/key filters require `type`, `types`, or `requests`.'));
          }
          return ok(getCatalog());
        }

        if (args.type) {
          const resolved = resolveCatalogType(args.type);
          const schema = getComponentSchema(resolved.type);
          if (!schema) {
            return ok({ error: `Unknown component type "${args.type}". Call with no argument to list valid types.` });
          }
          return ok({
            ...selectSchema(schema, args),
            ...legacyNotice(schema.type),
            ...(resolved.alias ? { alias: resolved.alias } : {}),
          });
        }

        if (args.requests?.length) {
          const components: Record<string, unknown>[] = [];
          const unknownTypes: string[] = [];
          for (const request of args.requests) {
            const resolved = resolveCatalogType(request.type);
            const schema = getComponentSchema(resolved.type);
            if (!schema) {
              unknownTypes.push(request.type);
              continue;
            }
            components.push({
              ...selectSchema(schema, request),
              ...legacyNotice(schema.type),
              ...(resolved.alias ? { alias: resolved.alias } : {}),
            });
          }
          return ok({ components, unknown_types: unknownTypes });
        }

        const requestedTypes = [...new Set(args.types ?? [])];
        const components: Record<string, unknown>[] = [];
        const unknownTypes: string[] = [];
        const byResolvedType = new Map<string, { schema: ComponentSchema; aliases: string[] }>();
        for (const type of requestedTypes) {
          const resolved = resolveCatalogType(type);
          const schema = getComponentSchema(resolved.type);
          if (!schema) {
            unknownTypes.push(type);
            continue;
          }
          const current = byResolvedType.get(resolved.type) ?? { schema, aliases: [] };
          if (resolved.alias) current.aliases.push(type);
          byResolvedType.set(resolved.type, current);
        }
        for (const { schema, aliases } of byResolvedType.values()) {
          components.push({
            ...selectSchema(schema, args),
            ...legacyNotice(schema.type),
            ...(aliases.length ? { requested_aliases: aliases } : {}),
          });
        }
        return ok({ components, unknown_types: unknownTypes });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
