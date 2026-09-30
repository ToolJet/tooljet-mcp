import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { validatePersistedAppSummary } from '../appValidation.js';
import { ok, fail, type ToolDef } from './types.js';

export function validateAppTool(client: ToolJetClient): ToolDef {
  return {
    name: 'validate_app',
    title: 'Validate App',
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
    description:
      'Validate persisted app structure and saved query contracts WITHOUT executing queries or opening a browser. ' +
      'Pass version_id after create_app_version to validate that exact version. ' +
      'Returns an explicit checked/not_checked scope plus { ok, errors, warnings }. Catches: ' +
      'dangling event references (event on a deleted component/query, run-query pointing at a missing query), ' +
      'ambiguous duplicate component/query names, bindings to non-existent queries/components ' +
      '({{queries.X}} / {{components.X}} with no such X), and per-component render traps (Table bound without ' +
      'rawJson, malformed DropdownV2 options, invalid static Chart JSON, Chart left with its clipping default ' +
      'title, bad headerCasing). Run it before you call the app done (then still do the one browser pass). ' +
      '`errors` are broken references or invalid persisted contracts you should fix; `warnings` ' +
      'are likely render problems worth checking. A clean result does NOT prove external APIs, mutations, event ' +
      'delivery, or visual rendering work; run explicitly selected safe reads and browser-test primary flows.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string().min(1).optional(),
    },
    async handler(args: { app_id: string; version_id?: string }) {
      try {
        const summary = args.version_id
          ? await client.getAppSummary(args.app_id, args.version_id)
          : await client.getAppSummary(args.app_id);
        return ok(validatePersistedAppSummary(summary));
      } catch (err) {
        return fail(err);
      }
    },
  };
}
