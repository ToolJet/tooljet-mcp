import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { componentInputSchema, prepareComponentBatch, type ComponentInput } from '../componentBatch.js';
import { fail, ok, type ToolDef } from './types.js';

const pageBatchSchema = z.object({
  page_id: z.string(),
  components: z.array(componentInputSchema).min(1),
});

export function addComponentBatchesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_component_batches',
    title: 'Add Component Batches',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    description:
      'Place complete component batches on 2–20 pages concurrently. MCP normalizes and lints every page before any write, ' +
      'then sends one atomic ToolJet component request per page in parallel. Use add_components for one page. Cross-page ' +
      'creation is not transactional because ToolJet has no multi-page component endpoint; an upstream partial failure names ' +
      'the completed and failed pages so it can be repaired in place.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      pages: z.array(pageBatchSchema).min(2).max(20),
    },
    async handler(args: {
      app_id: string;
      version_id: string;
      pages: Array<{ page_id: string; components: ComponentInput[] }>;
    }) {
      const pageIds = args.pages.map((page) => page.page_id);
      if (new Set(pageIds).size !== pageIds.length) {
        return fail(new Error('add_component_batches page_id values must be unique.'));
      }
      const prepared = args.pages.map((page) => ({ ...page, prepared: prepareComponentBatch(page.components) }));
      const errors = prepared.flatMap((page) =>
        page.prepared.errors.map((error) => `Page ${page.page_id}: ${error}`)
      );
      if (errors.length) return fail(new Error(errors.join(' ')));

      const settled = await Promise.allSettled(prepared.map(async (page) => ({
        page_id: page.page_id,
        components: await client.createComponents({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: page.page_id,
          components: page.prepared.components,
        }),
        warnings: page.prepared.warnings,
      })));
      const completed = settled.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
      const failures = settled.flatMap((result, index) => result.status === 'rejected'
        ? [`${prepared[index]!.page_id}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`]
        : []);
      if (failures.length) {
        return fail(new Error(
          `add_component_batches partially failed. Completed pages: ${completed.map((page) => page.page_id).join(', ') || 'none'}. ` +
            `Failed: ${failures.join(' | ')}. Existing components were not deleted automatically.`
        ));
      }
      return ok({
        pages: completed,
        components_created: completed.reduce((total, page) => total + page.components.length, 0),
        warnings: completed.flatMap((page) => page.warnings.map((warning) => `Page ${page.page_id}: ${warning}`)),
      });
    },
  };
}
