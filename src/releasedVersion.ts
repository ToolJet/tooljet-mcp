import type { ToolJetClient } from './tooljetClient.js';
import type { ToolResult } from './tools/types.js';

/** Tools that write to an app version. ToolJet refuses these on a released version. */
export const VERSION_WRITE_TOOLS = new Set([
  'lint_app_spec', 'apply_app_phase',
  'add_page', 'add_pages', 'update_pages', 'delete_page',
  'add_query', 'add_queries', 'update_query', 'delete_query',
  'add_component', 'add_components', 'add_component_batches', 'update_components', 'delete_components',
  'update_layout',
  'add_events', 'add_query_lifecycles', 'update_events', 'delete_event',
  'update_app_settings', 'manage_theme',
]);

const MAX_VERSION_NAME = 25;

function draftName(base: string, taken: Set<string>): string {
  for (let n = 1; ; n++) {
    const suffix = `_${n}`;
    const name = base.slice(0, MAX_VERSION_NAME - suffix.length) + suffix;
    if (!taken.has(name)) return name;
  }
}

/**
 * Edits never land on a released version: a write aimed at one is stopped, a draft is cloned from it,
 * and the agent is told to re-read the draft (cloned pages, components and queries get new ids).
 */
export async function releasedVersionGuard(
  client: ToolJetClient,
  args: { app_id?: unknown; version_id?: unknown }
): Promise<ToolResult | undefined> {
  if (typeof args.app_id !== 'string') return undefined;
  const appId = args.app_id;
  const summary = await client.getAppSummary(appId);
  const targetId = typeof args.version_id === 'string' ? args.version_id : summary.version_id;
  if (!targetId) return undefined;

  const target = targetId === summary.version_id ? summary : await client.getAppSummary(appId, targetId);
  if (!target.version_released) return undefined;

  const { versions } = await client.appVersions.list(appId);
  const released = versions.find((v) => v.version_id === targetId);
  const drafts = versions.filter((v) => v.version_id !== targetId && v.status?.toUpperCase() === 'DRAFT');
  const refuse = (text: string): ToolResult => ({ content: [{ type: 'text', text: `Not executed: ${text}` }], isError: true });

  if (drafts.length) {
    return refuse(
      `version "${released?.version_name ?? targetId}" is released and cannot be edited. Nothing was changed. ` +
        `Draft version(s) already exist: ${drafts.map((d) => `"${d.version_name}" (${d.version_id})`).join(', ')}. ` +
        'Ask the user whether to continue in one of them (they open it in the ToolJet editor) or to create a new ' +
        'draft from the released version with create_app_version. Do not retry this write on the released version.'
    );
  }

  const created = await client.createAppVersion({
    appId,
    versionName: draftName(released?.version_name ?? 'v1', new Set(versions.map((v) => v.version_name))),
    versionFromId: targetId,
  });
  return refuse(
    `version "${released?.version_name ?? targetId}" is released and cannot be edited, so nothing was written to it. ` +
      `A new draft version "${created.version_name}" (version_id ${created.version_id}) was created from it and is ` +
      'now the editing version. Its pages, components, queries and events have new ids: call get_app_summary with ' +
      `version_id ${created.version_id}, then redo this change against the draft using those ids. Tell the user the ` +
      'changes are in the new draft and the released version is unchanged until they release the draft.'
  );
}
