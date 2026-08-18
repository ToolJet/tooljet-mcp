import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import type { ComponentSchema } from '../catalog.js';
import { getCatalog, getComponentSchema } from '../catalog.js';
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

interface CatalogArgs {
  type?: string;
  types?: string[];
  sections?: CatalogSection[];
  property_keys?: string[];
  style_keys?: string[];
}

function selectSchema(schema: ComponentSchema, args: CatalogArgs): Record<string, unknown> {
  const sections = new Set(args.sections ?? CATALOG_SECTIONS);
  const result: Record<string, unknown> = { type: schema.type };
  if (sections.has('overview')) {
    if (schema.name !== undefined) result.name = schema.name;
    if (schema.description !== undefined) result.description = schema.description;
    if (schema.defaultSize !== undefined) result.defaultSize = schema.defaultSize;
  }
  if (sections.has('properties')) {
    result.properties = args.property_keys?.length
      ? schema.properties.filter((property) => args.property_keys!.includes(property.key))
      : schema.properties;
  }
  if (sections.has('styles')) {
    result.styles = args.style_keys?.length
      ? schema.styles.filter((style) => args.style_keys!.includes(style.key))
      : schema.styles;
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

export function getComponentCatalogTool(_client: ToolJetClient): ToolDef {
  return {
    name: 'get_component_catalog',
    description:
      'Discover ToolJet components. With no type(s), returns the lightweight palette. Use type for one ' +
      'component or types for a batch needed in the current page/phase. sections selects only overview, ' +
      'properties, styles, events, actions, exposedVariables, defaultChildren, renderingHints, and/or authoringHints; ' +
      'property_keys/style_keys narrow those arrays further. A batch returns {components,unknown_types}. ' +
      'authoringHints covers nested contracts such as Table row-action Button columns. Fetch complex/unfamiliar ' +
      'contracts once and reuse them; never guess property/event/action ids.',
    inputSchema: {
      type: z.string().optional(),
      types: z.array(z.string()).min(1).max(25).optional(),
      sections: z.array(z.enum(CATALOG_SECTIONS)).min(1).optional(),
      property_keys: z.array(z.string()).min(1).optional(),
      style_keys: z.array(z.string()).min(1).optional(),
    },
    async handler(args: CatalogArgs) {
      try {
        if (args?.type && args.types?.length) {
          return fail(new Error('Pass either `type` or `types`, not both.'));
        }
        if (!args?.type && !args.types?.length) {
          if (args.sections || args.property_keys || args.style_keys) {
            return fail(new Error('Catalog sections/key filters require `type` or `types`.'));
          }
          return ok(getCatalog());
        }

        if (args.type) {
          const schema = getComponentSchema(args.type);
          if (!schema) {
            return ok({ error: `Unknown component type "${args.type}". Call with no argument to list valid types.` });
          }
          return ok(selectSchema(schema, args));
        }

        const requestedTypes = [...new Set(args.types)];
        const components: Record<string, unknown>[] = [];
        const unknownTypes: string[] = [];
        for (const type of requestedTypes) {
          const schema = getComponentSchema(type);
          if (schema) components.push(selectSchema(schema, args));
          else unknownTypes.push(type);
        }
        return ok({ components, unknown_types: unknownTypes });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
