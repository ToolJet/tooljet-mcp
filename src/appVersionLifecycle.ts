import type { Auth } from './auth.js';

interface Version {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  environmentId?: string;
}
interface Environment { id: string; name: string; priority: number; enabled: boolean }

/** App lifecycle actions use the caller's existing session and never call the release endpoint. */
export function createAppVersionLifecycle(auth: Auth, getApp: (id: string) => Promise<any>) {
  const enc = encodeURIComponent;
  async function request(path: string, method = 'GET', body?: unknown) {
    const response = await auth.authedFetch(path, method === 'GET' ? undefined : {
      method, headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new Error(`App version ${method} failed (${response.status}): ${await response.text()}`);
    return response;
  }
  function normalize(raw: Record<string, unknown>): Version {
    if (typeof raw.id !== 'string' || typeof raw.name !== 'string') throw new Error('Invalid version metadata.');
    const environmentId = raw.current_environment_id ?? raw.currentEnvironmentId;
    return { id: raw.id, name: raw.name,
      ...(typeof raw.description === 'string' || raw.description === null ? { description: raw.description } : {}),
      ...(typeof raw.status === 'string' ? { status: raw.status } : {}),
      ...(typeof environmentId === 'string' ? { environmentId } : {}) };
  }
  async function versions(appId: string): Promise<Version[]> {
    const data = await (await request(`/api/apps/${enc(appId)}/versions`)).json();
    if (!Array.isArray(data.versions)) throw new Error('Missing app version inventory.');
    return data.versions.map(normalize);
  }
  async function version(appId: string, versionId: string) {
    const found = (await versions(appId)).find(v => v.id === versionId);
    if (!found) throw new Error(`Version ${versionId} does not belong to app ${appId}.`);
    return found;
  }
  async function environments(appId: string): Promise<Environment[]> {
    const data = await (await request(`/api/app-environments?app_id=${enc(appId)}`)).json();
    if (!Array.isArray(data.environments)) throw new Error('Missing environment inventory.');
    return data.environments.map((e: Record<string, unknown>) => {
      if (typeof e.id !== 'string' || typeof e.name !== 'string' || typeof e.priority !== 'number') {
        throw new Error('Cannot verify environment promotion order.');
      }
      return { id: e.id, name: e.name, priority: e.priority, enabled: e.enabled !== false };
    }).sort((a: Environment, b: Environment) => a.priority - b.priority);
  }
  function environment(envs: Environment[], name: string) {
    const matches = envs.filter(e => e.name.toLowerCase() === name.trim().toLowerCase());
    if (matches.length !== 1) throw new Error(`Unknown or ambiguous environment: ${name}. Inspect list_app_versions.`);
    if (!matches[0].enabled) throw new Error(`Environment ${name} is not enabled for this workspace.`);
    return matches[0];
  }
  function selection(appId: string, v: Version, environmentId = v.environmentId) {
    return { app_id: appId, version_id: v.id, version_name: v.name, selected: true as const,
      ...(v.status ? { status: v.status } : {}),
      ...(environmentId ? { current_environment_id: environmentId } : {}) };
  }
  async function available(appId: string, v: Version, env: Environment) {
    const data = await (await request(`/api/app-environments/${enc(env.id)}/versions?app_id=${enc(appId)}`)).json();
    const rows = data.appVersions ?? data.app_versions;
    if (!Array.isArray(rows) || !rows.some((row: Record<string, unknown>) => row.id === v.id)) {
      throw new Error(`Version ${v.name} is not available in ${env.name}. No promotion or release was performed.`);
    }
  }
  async function list(appId: string) {
    const vs = await versions(appId);
    const envs = await environments(appId);
    return { app_id: appId, versions: vs.map(v => ({ ...selection(appId, v), selected: undefined, description: v.description })), environments: envs };
  }
  async function switchEnvironment(appId: string, versionId: string, environmentName: string) {
    const v = await version(appId, versionId);
    const env = environment(await environments(appId), environmentName);
    await available(appId, v, env);
    return { ...selection(appId, v, env.id), environment_name: env.name };
  }
  async function promote(appId: string, versionId: string, environmentName: string) {
    let v = await version(appId, versionId);
    const envs = await environments(appId);
    const target = environment(envs, environmentName);
    const start = envs.find(e => e.id === v.environmentId);
    if (!start || envs.some((e, i) => i > 0 && e.priority === envs[i - 1].priority)) {
      throw new Error('Cannot verify current environment and promotion order.');
    }
    if (target.priority < start.priority) throw new Error('Promotion cannot move a version backwards; use switch_app_environment to view an earlier environment.');
    if (target.id === start.id) return { ...selection(appId, v), environment_name: target.name, promoted_to_environments: [] };
    const steps = envs.filter(e => e.priority > start.priority && e.priority <= target.priority);
    let published = false;
    let canViewPromotedEnvironment = true;
    const promoted: string[] = [];
    try {
      if (v.status?.toUpperCase() === 'DRAFT') {
        await request(`/api/v2/apps/${enc(appId)}/versions/${enc(versionId)}`, 'PUT', { status: 'PUBLISHED' });
        published = true;
      }
      for (const next of steps) {
        const response = await request(`/api/v2/apps/${enc(appId)}/versions/${enc(versionId)}/promote`, 'PUT', { currentEnvironmentId: v.environmentId });
        const body = await response.text();
        const result = body ? JSON.parse(body) : {};
        canViewPromotedEnvironment = (result.hasAccessToPromotedEnvironment ?? result.has_access_to_promoted_environment) !== false;
        v = await version(appId, versionId);
        if (v.environmentId !== next.id) throw new Error('Promotion readback did not match the next expected environment.');
        promoted.push(next.name);
      }
    } catch (err) {
      // Do not undo a partially completed promotion or repeat it against another target.
      throw new Error(`${String(err)} Draft saved: ${published}; verified promotions: ${promoted.join(', ') || 'none'}. Inspect this exact version before retrying. No release was requested.`);
    }
    const selected = selection(appId, v);
    // Promotion permission does not necessarily include permission to view the destination.
    if (!canViewPromotedEnvironment) delete selected.current_environment_id;
    return { ...selected, environment_name: target.name, promoted_environment_id: v.environmentId,
      has_access_to_promoted_environment: canViewPromotedEnvironment,
      published_for_promotion: published, promoted_to_environments: promoted };
  }
  async function update(appId: string, versionId: string, changes: { name?: string; description?: string }) {
    const before = await version(appId, versionId);
    if (changes.name === undefined && changes.description === undefined) throw new Error('Provide a version name or description.');
    const patch = { ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
      ...(changes.description !== undefined ? { description: changes.description } : {}) };
    if (patch.name !== undefined && (!patch.name || patch.name.length > 50)) throw new Error('Version name must contain 1–50 characters.');
    // Name is retained for the server rename event when changing only the description.
    await request(`/api/v2/apps/${enc(appId)}/versions/${enc(versionId)}`, 'PUT', { name: before.name, ...patch });
    const saved = await version(appId, versionId);
    if ((patch.name !== undefined && saved.name !== patch.name) ||
        (patch.description !== undefined && saved.description !== patch.description)) throw new Error('Version metadata update could not be verified; inspect the version before retrying.');
    // A rename must not move the editor from its viewing environment to the highest promoted one.
    return { app_id: appId, version_id: saved.id, version_name: saved.name,
      description: saved.description, updated: true };
  }
  async function remove(appId: string, versionId: string, fallbackVersionId: string) {
    const all = await versions(appId);
    const v = all.find(v => v.id === versionId);
    const fallback = all.find(v => v.id === fallbackVersionId);
    if (!v || !fallback || v.id === fallback.id) throw new Error('Delete requires an existing target and a different remaining version in the same app.');
    const app = await getApp(appId);
    if ((app.current_version_id ?? app.currentVersionId) === versionId) throw new Error('Cannot delete the released version.');
    await request(`/api/apps/${enc(appId)}/versions/${enc(versionId)}`, 'DELETE');
    const remaining = await versions(appId);
    if (remaining.some(v => v.id === versionId)) throw new Error('Version deletion could not be verified.');
    const selected = remaining.find(v => v.id === fallbackVersionId);
    if (!selected) throw new Error('Version was deleted but the requested remaining version disappeared. Refresh the editor.');
    return { ...selection(appId, selected), deleted_version_id: versionId, deleted: true };
  }
  return { list, switchEnvironment, promote, update, remove };
}
