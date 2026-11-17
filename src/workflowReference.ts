import type { Auth } from './auth.js';
import { assertWorkflowQueryOptions, normalizeWorkflowQueryOptions } from './workflowQueryOptions.js';

/** Ask the backend's execution resolver; never guess which branch a moving reference names. */
export async function resolveWorkflowReference(auth: Auth, raw: Record<string, unknown>, consumerVersionId?: string) {
  const options = normalizeWorkflowQueryOptions(raw);
  assertWorkflowQueryOptions(options);
  const search = new URLSearchParams();
  if (typeof options.workflowVersionId === 'string') search.set('pin', options.workflowVersionId);
  if (consumerVersionId) search.set('consumer_version_id', consumerVersionId);
  const response = await auth.authedFetch(
    `/api/workflows/${encodeURIComponent(String(options.workflowId))}/resolve-version?${search}`,
  );
  if (!response.ok)
    throw new Error(
      `Cannot resolve workflow reference (HTTP ${response.status}). The server must support workflow reference resolution; no query was executed.`,
    );
  const result = (await response.json()) as { workflow_id: string; version_id: string | null; pin: string | null };
  if (
    typeof result.workflow_id !== 'string' ||
    !(result.version_id === null || typeof result.version_id === 'string') ||
    !(result.pin === null || typeof result.pin === 'string')
  )
    throw new Error('Invalid workflow reference resolution response.');
  return { ...result, options: { ...options, workflowId: result.workflow_id, workflowVersionId: result.pin } };
}
