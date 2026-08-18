import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { validateAppStructure } from '../lint.js';
import { issueMessages, validateQueryOptions } from '../queryValidation.js';
import { persistedEventSpecs, validateEvents } from '../eventValidation.js';
import { ok, fail, type ToolDef } from './types.js';

export function validateAppTool(client: ToolJetClient): ToolDef {
  return {
    name: 'validate_app',
    description:
      'Validate persisted app structure and saved query contracts WITHOUT executing queries or opening a browser. ' +
      'Returns an explicit checked/not_checked scope plus { ok, errors, warnings }. Catches: ' +
      'dangling event references (event on a deleted component/query, run-query pointing at a missing query), ' +
      'ambiguous duplicate component/query names, bindings to non-existent queries/components ' +
      '({{queries.X}} / {{components.X}} with no such X), and per-component render traps (Table bound without ' +
      'rawJson, Chart left with its clipping default title, bad headerCasing). Run it before you call the app ' +
      'done (then still do the one browser pass). `errors` are broken references you should fix; `warnings` ' +
      'are likely render problems worth checking. A clean result does NOT prove external APIs, mutations, event ' +
      'delivery, or visual rendering work; run explicitly selected safe reads and browser-test primary flows.',
    inputSchema: {
      app_id: z.string(),
    },
    async handler(args: { app_id: string }) {
      try {
        const summary = await client.getAppSummary(args.app_id);
        const structural = validateAppStructure(summary);
        const errors = [...structural.errors];
        const warnings = [...structural.warnings];
        const eventValidation = validateEvents(summary, persistedEventSpecs(summary));
        errors.push(...eventValidation.errors);
        warnings.push(...eventValidation.warnings);
        for (const query of summary.queries) {
          const label = `Query "${query.name ?? query.id}"`;
          if (!query.kind || !query.options || typeof query.options !== 'object' || Array.isArray(query.options)) {
            warnings.push(`${label}: kind/options are unavailable, so its datasource contract was not validated.`);
            continue;
          }
          const validation = validateQueryOptions(query.kind, query.options as Record<string, unknown>);
          errors.push(...issueMessages(validation.errors, label));
          warnings.push(...issueMessages(validation.warnings, label));
        }
        return ok({
          ok: errors.length === 0,
          scope: 'structural_and_contract',
          checked: [
            'persisted references and bindings',
            'component render traps',
            'event source/trigger compatibility',
            'saved datasource option contracts',
          ],
          not_checked: [
            'query execution or external API success',
            'mutating/billable query behavior',
            'browser event delivery',
            'visual rendering',
          ],
          errors: [...new Set(errors)],
          warnings: [...new Set(warnings)],
        });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
