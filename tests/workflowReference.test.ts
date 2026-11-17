import { describe, it, expect, vi } from 'vitest';
import { resolveWorkflowReference } from '../src/workflowReference.js';
const workflowId = '3c15bf3d-70a5-4e2f-a8ec-b3a798c7eab2';
const releaseId = '01543f97-e343-42ac-aa9f-118725876ed9';
const draftId = '7708a7a4-c78e-485e-aa39-85665885dfde';
const featureId = '7caa1a79-ffad-4933-90a7-e1b178490b7b';
function setup() {
  const versions = [
    {
      id: releaseId,
      name: 'v1',
      status: 'PUBLISHED',
      versionType: 'version',
      branchId: 'main',
      branch: { id: 'main', isDefault: true },
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: draftId,
      name: 'v2',
      status: 'DRAFT',
      versionType: 'version',
      branchId: 'main',
      branch: { id: 'main', isDefault: true },
      createdAt: '2026-02-01',
      updatedAt: '2026-02-01',
    },
    {
      id: featureId,
      name: 'branch-internal-id',
      status: 'DRAFT',
      versionType: 'branch',
      branchId: 'feature',
      branch: { id: 'feature', isDefault: false },
      createdAt: '2026-03-01',
      updatedAt: '2026-03-01',
    },
  ];
  const app = { id: workflowId, type: 'workflow', organizationId: 'workspace', currentVersionId: releaseId };
  const auth = {
    getOrganizationId: async () => 'workspace',
    authedFetch: vi.fn(async (path: string) => Response.json(path.includes('/versions?') ? { versions } : app)),
  };
  return {
    auth,
    app,
    versions,
    resolve: (pin?: string, consumer?: any) =>
      resolveWorkflowReference(auth as any, { workflowId, workflowVersionId: pin }, consumer),
  };
}
describe('workflow references on the existing backend', () => {
  it('checks legacy UUID, named and released targets without a resolver endpoint', async () => {
    const { resolve, auth } = setup();
    expect((await resolve(draftId)).options.workflowVersionId).toBe('v2');
    expect((await resolve('v1')).version_id).toBe(releaseId);
    expect((await resolve()).version_id).toBe(releaseId);
    expect(auth.authedFetch.mock.calls.every(([path]) => path.startsWith('/api/apps/'))).toBe(true);
  });
  it('follows exact consumer branches and refuses a missing feature branch', async () => {
    const { resolve } = setup();
    expect((await resolve('__current_branch__', { branch_id: 'feature', status: 'DRAFT' })).version_id).toBe(featureId);
    expect((await resolve('__default_branch_draft__', { branch_id: 'feature', status: 'DRAFT' })).version_id).toBe(
      draftId,
    );
    await expect(resolve('__current_branch__', { branch_id: 'unloaded', status: 'DRAFT' })).rejects.toThrow(
      'cannot be verified',
    );
  });
  it('matches published-consumer fallback and never translates a branch UUID to a named default version', async () => {
    const { resolve } = setup();
    expect((await resolve('__current_branch__', { branch_id: 'feature', status: 'PUBLISHED' })).version_id).toBe(
      releaseId,
    );
    await expect(resolve(featureId)).rejects.toThrow('without changing');
  });
  it('keeps moving pins intact when authoring lacks consumer metadata', async () => {
    const { resolve } = setup();
    expect(await resolve('__current_branch__')).toMatchObject({ version_id: null, pin: '__current_branch__' });
  });
  it('uses the latest updated default version for a never-released workflow', async () => {
    const { resolve, app } = setup();
    app.currentVersionId = null as any;
    expect((await resolve()).version_id).toBe(draftId);
  });
  it('refuses foreign workflow metadata before using any version', async () => {
    const { resolve, app } = setup();
    app.organizationId = 'another-workspace';
    await expect(resolve('v1')).rejects.toThrow('workspace mismatch');
  });
});
