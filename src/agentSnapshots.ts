// Snapshots for agent edits: before a coding agent's first write to an app version, ToolJet keeps a copy of the
// version, so the builder can see what the agent changed (and undo it) in the compare view, as the in-app AI chat does
// before every turn. Compare is an EE feature on trial and Pro and above; elsewhere the write goes ahead without a
// snapshot and the agent is told once, so it can mention the upgrade in its handoff.
import { peekAppPlan } from './appPlanStore.js';
import type { ToolJetClient, VersionSnapshotResult } from './tooljetClient.js';
import type { ToolResult } from './tools/types.js';

/** Tools that change an app version's pages, components, queries, events or settings. */
export const SNAPSHOT_WRITE_TOOLS = new Set([
  'apply_app_phase',
  'add_page',
  'add_pages',
  'update_pages',
  'delete_page',
  'add_query',
  'add_queries',
  'update_query',
  'delete_query',
  'add_component',
  'add_components',
  'add_component_batches',
  'update_components',
  'delete_components',
  'update_layout',
  'add_events',
  'add_query_lifecycles',
  'update_events',
  'delete_event',
  'update_app_settings',
]);

/** A pause this long between writes starts a new change, so the next write takes a new snapshot. */
export const SNAPSHOT_IDLE_MS = 30 * 60 * 1000;
const MAX_TRACKED = 500;

interface Tracked {
  lastWriteAt: number;
  snapshotId?: string;
  seeChangesUrl?: string;
  planNoted?: boolean;
}

// Module level: the gateway builds a server per request, so per-server state would forget every call.
// Keyed by app and version ids, which are unique across workspaces.
const tracked = new Map<string, Tracked>();

export function clearAgentSnapshotsForTests(): void {
  tracked.clear();
}

export type SnapshotNote =
  | { status: 'taken'; id: string; reused: boolean; see_changes_url: string; note: string }
  | { status: 'not_in_plan'; feature: string; upgrade_url: string; note: string };

function versionOf(toolName: string, args: Record<string, unknown>): string | undefined {
  if (typeof args.version_id === 'string' && args.version_id) return args.version_id;
  if (toolName === 'apply_app_phase' && typeof args.plan_token === 'string') {
    const planVersion = peekAppPlan(args.plan_token)?.spec.version_id;
    return typeof planVersion === 'string' && planVersion ? planVersion : undefined;
  }
  return undefined;
}

function remember(key: string, entry: Tracked): void {
  tracked.delete(key);
  tracked.set(key, entry);
  if (tracked.size > MAX_TRACKED) tracked.delete(tracked.keys().next().value as string);
}

/**
 * Takes a snapshot before the first write of a change to an app version. Never throws and never blocks the write:
 * a refusal or a failure only means there is no snapshot. Returns what the agent should know, or undefined.
 */
export async function snapshotBeforeWrite(
  client: ToolJetClient,
  toolName: string,
  args: unknown,
  now: () => number = Date.now
): Promise<SnapshotNote | undefined> {
  if (!SNAPSHOT_WRITE_TOOLS.has(toolName) || !client.createVersionSnapshot) return undefined;
  const input = (args && typeof args === 'object' ? args : {}) as Record<string, unknown>;
  const appId = typeof input.app_id === 'string' ? input.app_id : undefined;
  const versionId = appId ? versionOf(toolName, input) : undefined;
  if (!appId || !versionId) return undefined;

  const key = `${appId}:${versionId}`;
  const previous = tracked.get(key);
  const at = now();
  if (previous && at - previous.lastWriteAt < SNAPSHOT_IDLE_MS) {
    remember(key, { ...previous, lastWriteAt: at });
    return undefined;
  }

  let result: VersionSnapshotResult;
  try {
    result = await client.createVersionSnapshot(appId, versionId, 'Before agent edits');
  } catch {
    remember(key, { ...previous, lastWriteAt: at });
    return undefined;
  }
  if (result.ok) {
    remember(key, { lastWriteAt: at, snapshotId: result.id, seeChangesUrl: result.seeChangesUrl, planNoted: previous?.planNoted });
    // The version is unchanged since the AI chat's own copy for this turn: the chat already offers See what changed.
    if (result.reused && result.reason === 'ai_turn') return undefined;
    return {
      status: 'taken',
      id: result.id,
      reused: result.reused,
      see_changes_url: result.seeChangesUrl,
      note: 'ToolJet kept a copy of this version before your edits. When the change is done, give the user see_changes_url: it opens the compare view on what you changed, with undo.',
    };
  }
  remember(key, { ...previous, lastWriteAt: at, planNoted: true });
  if (result.reason !== 'not_in_plan' || previous?.planNoted) return undefined;
  return {
    status: 'not_in_plan',
    feature: 'Compare versions and undo changes',
    upgrade_url: result.upgradeUrl,
    note: 'This workspace\'s plan has no version compare, so there is no "see what changed" view or undo for these edits. Carry on with the change; in your final handoff only, add one line that on Pro every change gets a see-what-changed view and one-click undo, with upgrade_url.',
  };
}

/** Adds the snapshot note to a tool result: into its JSON body when it has one, else as a second text item. */
export function withSnapshotNote(result: ToolResult, note: SnapshotNote | undefined): ToolResult {
  if (!note || result.isError) return result;
  const first = result.content?.[0];
  if (first?.type === 'text') {
    try {
      const body = JSON.parse(first.text);
      if (body && typeof body === 'object' && !Array.isArray(body) && !('snapshot' in body)) {
        return { ...result, content: [{ ...first, text: JSON.stringify({ ...body, snapshot: note }) }, ...result.content.slice(1)] };
      }
    } catch {
      // Not JSON: fall through to a separate item.
    }
  }
  return { ...result, content: [...(result.content ?? []), { type: 'text', text: JSON.stringify({ snapshot: note }) }] };
}
