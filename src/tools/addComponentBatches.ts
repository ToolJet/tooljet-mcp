import { mapKeyRefusal } from '../mapKeyGuard.js';
import { z } from 'zod';
import type { AppSummary, ToolJetClient } from '../tooljetClient.js';
import { componentInputSchema, prepareComponentBatch, type ComponentInput } from '../componentBatch.js';
import { resolveParentRef } from '../componentParent.js';
import { fail, ok, type ToolDef } from './types.js';
import { normalizePlanBindingAliases } from '../planBindingAliases.js';
import { literalCanvasColor } from '../appSettings.js';
import { COMPONENT_FX_GUIDANCE } from '../componentFxGuidance.js';

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
      'bindings may use unique client_ref aliases declared in this batch; existing runtime names take precedence. Cross-page ' +
      'creation is not transactional because ToolJet has no multi-page component endpoint; an upstream partial failure names ' +
      'the completed and failed pages so it can be repaired in place. ' + COMPONENT_FX_GUIDANCE,
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
      const pages = structuredClone(args.pages);
      const aliasWarnings: string[] = [];
      const needsAliases = pages.some(page => page.components.some(c => c.client_ref && c.client_ref !== c.name));
      // A child added under an existing parent may be going into a FlexContainer, whose children are not grid items.
      const targetsExistingParent = pages.some(page => page.components.some(c => c.parent));
      let summary: AppSummary | undefined;
      if (needsAliases || targetsExistingParent) {
        try {
          summary = await client.getAppSummary(args.app_id);
          if (summary.version_id && summary.version_id !== args.version_id) {
            return fail(new Error('Cannot normalize this write against a different editing version. Refresh the app version.'));
          }
          if (needsAliases) aliasWarnings.push(...normalizePlanBindingAliases({ pages }, summary));
        } catch {
          if (needsAliases) aliasWarnings.push('Batch component aliases were not normalized because existing names could not be read. Use exact runtime names.');
        }
      }
      const pageComponentsOf = (pageId: string) => summary?.pages.find((page) => page.id === pageId)?.components;
      // A parent named by its component name is stored as that component's id; one matching nothing on the page is
      // refused rather than stored detached (add_components does the same).
      const parentErrors: string[] = [];
      for (const page of pages) {
        const existing = pageComponentsOf(page.page_id);
        if (!existing) continue;
        for (const component of page.components as Array<{ parent?: string; name?: string }>) {
          if (typeof component.parent !== 'string' || !component.parent) continue;
          const resolved = resolveParentRef(existing, component.parent);
          if (resolved.ok) component.parent = resolved.parent;
          else parentErrors.push(`Page ${page.page_id}: Component "${component.name ?? '?'}": ${resolved.error}`);
        }
      }
      if (parentErrors.length) return fail(new Error(`${parentErrors.join(' ')} (Nothing was saved: refused before any write.)`));
      const canvasColor = await literalCanvasColor(client, args.app_id, args.version_id);
      const prepared = pages.map((page) => ({
        ...page,
        prepared: prepareComponentBatch(page.components, {
          canvasColor,
          flexContainerIds: (pageComponentsOf(page.page_id) ?? []).filter((c) => c.type === 'FlexContainer').map((c) => c.id),
        }),
      }));
      const errors = prepared.flatMap((page) =>
        page.prepared.errors.map((error) => `Page ${page.page_id}: ${error}`)
      );
      const mapRefusal = await mapKeyRefusal(client, pages.flatMap((page) => page.components.map((c: { type?: unknown }) => String(c.type))));
      if (mapRefusal) errors.push(mapRefusal);
      if (errors.length) return fail(new Error(`${errors.join(' ')} (Nothing was saved: refused before any write.)`));

      const settled = await Promise.allSettled(prepared.map(async (page) => ({
        page_id: page.page_id,
        components: await client.createComponents({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: page.page_id,
          components: page.prepared.components,
          pageComponents: pageComponentsOf(page.page_id),
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
        warnings: [...aliasWarnings, ...completed.flatMap((page) => page.warnings.map((warning) => `Page ${page.page_id}: ${warning}`))],
      });
    },
  };
}
