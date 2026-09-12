import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { componentInputSchema, prepareComponentBatch, type ComponentInput } from '../componentBatch.js';
import { ok, fail, type ToolDef } from './types.js';
import { lintRenderedGeometryBlocking, lintRenderedGeometryAdvisory, type LintComponent } from '../lint.js';
import { introducedLintFindings } from '../lint.js';

export function addComponentsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_components',
    title: 'Add Components',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    description:
      'Place MANY components on one page in a single call (all share app_id/version_id/page_id). ' +
      'Prefer this over repeated add_component when building an app — it is one request. Returns ' +
      '[{ component_id, name }]. Note: the batch is atomic — if one component is invalid (e.g. missing ' +
      'name), the whole call fails; fix that component and retry. ' +
      'Property/style/validation/other leaves may be supplied as concise raw values or canonical ' +
      '`{ value: ... }` envelopes; MCP persists the canonical ToolJet shape. ' +
      'IMPORTANT: put native styling (textSize, fontWeight, textColor, backgroundColor, borderRadius, …) ' +
      'in each component’s top-level `styles` object, NOT under `properties` — ToolJet silently ignores ' +
      'styles nested in properties (and this tool will reject them). Provide either `layout` (one rectangle ' +
      'for both resolutions) or `layouts:{desktop,mobile}`. To create a modal/container and its children ' +
      'atomically, give the parent a unique `client_ref` and each child the matching `parent_ref`; child ' +
      'coordinates are relative to that parent. For ModalV2/Form/Container native regions, set child ' +
      '`slot_name` to `header`, `body`, or `footer`; body is the default. A Kanban with no explicit child automatically gets its ' +
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
      // Geometry against the page as it already is, not the batch alone: a targeted add that lands on top
      // of an existing table (a modal's buttons placed at root, a caption over a register) passed here
      // unremarked in the 2026-09-12 review because only the new components were checked together.
      const pageWarnings: string[] = [];
      try {
        const summary = await client.getAppSummary(args.app_id);
        const page = summary.pages.find((candidate) => candidate.id === args.page_id);
        if (page) {
          const existing = page.components as LintComponent[];
          const combined = [...existing, ...(prepared.components as LintComponent[])];
          const introducedErrors = introducedLintFindings(
            lintRenderedGeometryBlocking(existing),
            lintRenderedGeometryBlocking(combined)
          );
          if (introducedErrors.length) {
            // A component landing on another is not written; the model moves it and calls again.
            return fail(new Error('The batch would land on components already on the page: ' + introducedErrors.join(' ')));
          }
          pageWarnings.push(...introducedLintFindings(lintRenderedGeometryAdvisory(existing), lintRenderedGeometryAdvisory(combined)));
        }
      } catch {
        // The write does not depend on this read; a summary failure only costs the page-level check.
      }
      try {
        const result = await client.createComponents({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          components: prepared.components,
        });
        return ok({
          components: result,
          warnings: [...prepared.warnings, ...pageWarnings],
        });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
