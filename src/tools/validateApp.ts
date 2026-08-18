import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { validateAppStructure } from '../lint.js';
import { ok, fail, type ToolDef } from './types.js';

export function validateAppTool(client: ToolJetClient): ToolDef {
  return {
    name: 'validate_app',
    description:
      'Structurally validate a built app WITHOUT a browser. Returns { ok, errors, warnings }. Catches: ' +
      'dangling event references (event on a deleted component/query, run-query pointing at a missing query), ' +
      'ambiguous duplicate component/query names, bindings to non-existent queries/components ' +
      '({{queries.X}} / {{components.X}} with no such X), and per-component render traps (Table bound without ' +
      'rawJson, Chart left with its clipping default title, bad headerCasing). Run it before you call the app ' +
      'done (then still do the one browser pass). `errors` are broken references you should fix; `warnings` ' +
      'are likely render problems worth checking.',
    inputSchema: {
      app_id: z.string(),
    },
    async handler(args: { app_id: string }) {
      try {
        const summary = await client.getAppSummary(args.app_id);
        const { errors, warnings } = validateAppStructure(summary);
        return ok({ ok: errors.length === 0, errors, warnings });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
