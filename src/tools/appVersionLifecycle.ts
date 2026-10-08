import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

const target = { app_id: z.string().uuid(), version_id: z.string().uuid() };
const environment = z.enum(['development', 'staging', 'production']);
export function appVersionLifecycleTools(client: ToolJetClient): ToolDef[] {
  const execute = (action: (args: any) => Promise<unknown>) => async (args: any) => {
    try { return ok(await action(args)); } catch (err) { return fail(err); }
  };
  return [
    { name: 'list_app_versions', title: 'List App Versions',
      description: 'List exact versions and environments for one app. Use returned IDs to resolve named lifecycle targets; never infer IDs.',
      annotations: { readOnlyHint: true }, strictInput: true, inputSchema: { app_id: target.app_id },
      handler: execute(a => client.appVersions.list(a.app_id)) },
    { name: 'promote_app_version', title: 'Promote App Version',
      description: 'Save a draft if necessary and promote the selected version only as far as the explicitly requested environment. Never releases the app. Pass confirm:true only for an explicit promotion request. Returns verified editor selection metadata.',
      annotations: { readOnlyHint: false, destructiveHint: true }, strictInput: true,
      inputSchema: { ...target, environment_name: z.enum(['staging', 'production']), confirm: z.literal(true) },
      handler: execute(a => client.appVersions.promote(a.app_id, a.version_id, a.environment_name)) },
    { name: 'switch_app_environment', title: 'Switch App Environment',
      description: 'Open the same app version in a requested environment without publishing, promoting, or releasing it. Fails if that version is not available there. Use only for an explicit environment-switch request.',
      annotations: { readOnlyHint: false, destructiveHint: false }, strictInput: true,
      inputSchema: { ...target, environment_name: environment },
      handler: execute(a => client.appVersions.switchEnvironment(a.app_id, a.version_id, a.environment_name)) },
    { name: 'update_app_version', title: 'Update App Version',
      description: 'Rename the selected version or edit its description, only when explicitly requested. Does not publish, promote, or release. Backend version permissions and edit restrictions apply.',
      annotations: { readOnlyHint: false, destructiveHint: false }, strictInput: true,
      inputSchema: { ...target, version_name: z.string().trim().min(1).max(50).optional(), version_description: z.string().max(500).optional() },
      handler: execute(a => client.appVersions.update(a.app_id, a.version_id, { name: a.version_name, description: a.version_description })) },
    { name: 'delete_app_version', title: 'Delete App Version',
      description: 'Delete the explicitly selected, unreleased version only on an explicit user deletion request. List versions first and provide a different fallback_version_id in the same app for the editor to open afterward. Never delete the released or only version. Do not retry an uncertain deletion automatically.',
      annotations: { readOnlyHint: false, destructiveHint: true }, strictInput: true,
      inputSchema: { ...target, fallback_version_id: z.string().uuid(), confirm: z.literal(true) },
      handler: execute(a => client.appVersions.remove(a.app_id, a.version_id, a.fallback_version_id)) },
  ];
}
