import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { componentInputSchema, prepareComponentBatch, type ComponentInput } from '../componentBatch.js';
import { ok, fail, type ToolDef } from './types.js';

export function addComponentsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_components',
    description:
      'Place MANY components on one page in a single call (all share app_id/version_id/page_id). ' +
      'Prefer this over repeated add_component when building an app — it is one request. Returns ' +
      '[{ component_id, name }]. Note: the batch is atomic — if one component is invalid (e.g. missing ' +
      'name), the whole call fails; fix that component and retry. ' +
      'Property/style/validation/general/general_styles/other leaves may be supplied as concise raw values or canonical ' +
      '`{ value: ... }` envelopes; MCP persists the canonical ToolJet shape. ' +
      'IMPORTANT: put native styling (textSize, fontWeight, textColor, backgroundColor, borderRadius, …) ' +
      'in each component’s top-level `styles` object, NOT under `properties` — ToolJet silently ignores ' +
      'styles nested in properties (and this tool will reject them). Provide either `layout` (one rectangle ' +
      'for both resolutions) or `layouts:{desktop,mobile}`. To create a modal/container and its children ' +
      'atomically, give the parent a unique `client_ref` and each child the matching `parent_ref`; child ' +
      'coordinates are relative to that parent. For ModalV2/Form/Container native regions, set child ' +
      '`slot_name` to `header`, `body`, or `footer`; body is the default. For a Tabs parent, set `tab_id` ' +
      'to the tab\'s persisted string id (not its title); this works with same-batch `parent_ref`. ' +
      'A Kanban with no explicit child automatically gets its ' +
      'catalog card children so cards are not blank; supplying a child with its `parent_ref` suppresses ' +
      'those defaults (use Html for wrapped multi-line card content).',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      page_id: z.string(),
      components: z.array(componentInputSchema).min(1),
    },
    async handler(args: {
      app_id: string;
      version_id: string;
      page_id: string;
      components: ComponentInput[];
    }) {
      const prepared = prepareComponentBatch(args.components);
      if (prepared.errors.length) return fail(new Error(prepared.errors.join(' ')));
      try {
        const result = await client.createComponents({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          components: prepared.components,
        });
        return ok({
          components: result,
          warnings: prepared.warnings,
        });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
