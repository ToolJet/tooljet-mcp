import type { Auth } from './auth.js';
import { assertWorkflowQueryOptions, normalizeWorkflowQueryOptions } from './workflowQueryOptions.js';

export type WorkflowConsumer = { branch_id?: string; status?: string };
const record = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {};
const branchId = (version: Record<string, any>) => version.branchId ?? version.branch_id ?? record(version.branch).id;
const versionType = (version: Record<string, any>) => String(version.versionType ?? version.version_type ?? '').toUpperCase();
const moving = new Set(['__current_branch__', '__default_branch_draft__']);

/** Resolve only from existing, authorized app/version metadata. Ambiguous or hidden pins fail closed. */
export async function resolveWorkflowReference(
  auth: Auth,
  raw: Record<string, unknown>,
  consumer?: WorkflowConsumer | string,
) {
  const options = normalizeWorkflowQueryOptions(raw);
  assertWorkflowQueryOptions(options);
  const workflowId = String(options.workflowId);
  async function read(path: string) {
    const response = await auth.authedFetch(path);
    if (!response.ok)
      throw new Error(`Cannot inspect workflow reference (HTTP ${response.status}); no query was executed.`);
    return record(await response.json());
  }
  const app = await read(`/api/apps/${encodeURIComponent(workflowId)}`);
  if (
    app.id !== workflowId ||
    app.type !== 'workflow' ||
    (app.organizationId ?? app.organization_id) !== (await auth.getOrganizationId())
  )
    throw new Error('Workflow identity or workspace mismatch. Use the workflow ID from list_workflows.');
  const listing = await read(`/api/apps/${encodeURIComponent(workflowId)}/versions?includeDefaultBranchVersions=true`);
  if (!Array.isArray(listing.versions)) throw new Error('Workflow versions are unavailable.');
  const versions = listing.versions.map(record).filter((version) => !(version.isStub ?? version.is_stub));
  let pin = typeof options.workflowVersionId === 'string' ? options.workflowVersionId : null;
  const context = typeof consumer === 'object' ? consumer : undefined;
  // Authoring calls may only know the consumer ID. Keep moving pins intact; execution
  // always supplies its saved consumer metadata before checking nested datasources.
  if (context?.status === 'PUBLISHED' && pin && moving.has(pin)) pin = null;
  const defaultVersions = versions.filter(
    (version) => record(version.branch).isDefault === true || record(version.branch).is_default === true,
  );
  const latest = (rows: Record<string, any>[], field: string) =>
    [...rows].sort((a, b) =>
      String(b[field] ?? b[field.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())] ?? '').localeCompare(
        String(a[field] ?? a[field.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())] ?? ''),
      ),
    )[0];
  const named = (name: string) => {
    const candidates = defaultVersions.filter((version) => version.name === name && versionType(version) === 'VERSION');
    return (
      latest(
        candidates.filter((version) => version.status === 'PUBLISHED'),
        'createdAt',
      ) ??
      latest(
        candidates.filter((version) => version.status === 'DRAFT'),
        'createdAt',
      )
    );
  };
  let selected: Record<string, any> | undefined;
  if (pin && moving.has(pin)) {
    if (pin === '__current_branch__' && !context) {
      return { workflow_id: workflowId, version_id: null, pin, options: { ...options, workflowVersionId: pin } };
    }
    const defaultId = branchId(defaultVersions[0] ?? {});
    if (pin === '__current_branch__' && context?.branch_id && context.branch_id !== defaultId) {
      selected = versions.find(
        (version) => branchId(version) === context.branch_id && versionType(version) === 'BRANCH',
      );
    } else
      selected = latest(
        defaultVersions.filter((version) => versionType(version) === 'VERSION' && version.status === 'DRAFT'),
        'createdAt',
      );
  } else if (pin) {
    const legacy = versions.find((version) => version.id === pin);
    if (legacy) {
      selected = named(legacy.name);
      if (selected?.id !== legacy.id)
        throw new Error(
          'Workflow UUID cannot be translated without changing its version. Use a native named version or branch pin.',
        );
      pin = legacy.name;
    } else selected = named(pin);
  } else {
    const releasedId = app.currentVersionId ?? app.current_version_id;
    selected = releasedId
      ? versions.find((version) => version.id === releasedId)
      : latest(
          defaultVersions.filter((version) => versionType(version) === 'VERSION'),
          'updatedAt',
        );
    if (releasedId && !selected) {
      const released = await read(
        `/api/v2/apps/${encodeURIComponent(workflowId)}/versions/${encodeURIComponent(releasedId)}`,
      );
      selected = record(released.editing_version ?? released.editingVersion);
      if (
        released.id !== workflowId ||
        (released.organizationId ?? released.organization_id) !== (await auth.getOrganizationId()) ||
        selected.id !== releasedId
      )
        throw new Error('Released workflow version identity mismatch.');
    }
  }
  if (!selected?.id)
    throw new Error(
      'Workflow version cannot be verified from available metadata. Open the workflow on the intended branch or select a visible named version.',
    );
  return {
    workflow_id: workflowId,
    version_id: String(selected.id),
    pin,
    options: { ...options, workflowVersionId: pin },
  };
}
