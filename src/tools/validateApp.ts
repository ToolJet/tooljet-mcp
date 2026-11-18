import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { libraryPinErrors, validatePersistedAppSummary } from '../appValidation.js';
import { ok, fail, type ToolDef } from './types.js';
import { verifyLibrarySelection } from '../componentLibrary.js';
import { literalCanvasColor } from '../appSettings.js';

export function validateAppTool(client: ToolJetClient): ToolDef {
  return {
    name: 'validate_app',
    title: 'Validate App',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
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
      expected_library_selection: z.string().optional().describe("Verify that the target version and newly authored widgets use this component library."),
      existing_component_ids: z.array(z.string()).optional().describe("Required with expected_library_selection. Pass the component IDs present before the build, or [] for an initially empty app."),
    },
    async handler(args: { app_id: string; version_id?: string; expected_library_selection?: string; existing_component_ids?: string[] }) {
      try {
        const summary = args.version_id
          ? await client.getAppSummary(args.app_id, args.version_id)
          : await client.getAppSummary(args.app_id);
        const validation = validatePersistedAppSummary(summary, { canvasColor: await literalCanvasColor(client, args.app_id, summary.version_id) });
        for (const query of summary.queries.filter(query => query.kind === 'workflows')) {
          try { await client.assertWorkflowQueryTarget(query.options as Record<string, unknown>, summary.version_id); }
          catch (error) { validation.errors.push(`Query "${query.name ?? query.id}": workflow target could not be verified. ${String(error)}`); }
        }
        validation.checked.push('workflow target identity, workspace and explicit version ownership');
        // Read only when something could need a pin, so an app with no library components costs no extra call.
        if (summary.version_id && libraryPinErrors(summary, {}).length) {
          try {
            const { global_settings: settings } = await client.getAppSettings(args.app_id, summary.version_id);
            const pins = settings.customComponentLibraries;
            validation.errors.push(...libraryPinErrors(summary, pins && typeof pins === 'object' ? pins as Record<string, unknown> : {}));
            validation.checked.push('library pins');
          } catch {
            validation.not_checked.push('library pins (the version settings could not be read)');
          }
        }
        if (args.expected_library_selection) {
          if (!args.existing_component_ids) throw new Error('Pass existing_component_ids from before the build, or [] if the app started empty.');
          const errors = verifyLibrarySelection(summary.component_library, summary.pages, args.expected_library_selection, args.existing_component_ids);
          validation.errors.push(...errors);
          validation.checked.push('selected library and newly authored component types');
          return ok({ ...validation, ok: validation.errors.length === 0, component_library_ok: errors.length === 0 });
        }
        validation.ok = validation.errors.length === 0;
        return ok(validation);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
