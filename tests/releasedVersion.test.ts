import { describe, expect, it, vi } from 'vitest';
import { releasedVersionGuard } from '../src/releasedVersion.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

function clientWith(opts: { released: boolean; versions: Array<{ version_id: string; version_name: string; status?: string }> }) {
  const createAppVersion = vi.fn(async (p: { versionName: string; versionFromId: string }) => ({
    app_id: 'app', version_id: 'draft-id', version_name: p.versionName, source_version_id: p.versionFromId,
  }));
  const client = {
    getAppSummary: vi.fn(async () => ({
      app_id: 'app', version_id: 'v1-id', pages: [], queries: [], events: [],
      ...(opts.released ? { version_released: true } : {}),
    })),
    appVersions: { list: vi.fn(async () => ({ app_id: 'app', versions: opts.versions, environments: [] })) },
    createAppVersion,
  } as unknown as ToolJetClient;
  return { client, createAppVersion };
}

describe('releasedVersionGuard', () => {
  it('lets writes to an unreleased version through', async () => {
    const { client, createAppVersion } = clientWith({ released: false, versions: [] });
    expect(await releasedVersionGuard(client, { app_id: 'app', version_id: 'v1-id' })).toBeUndefined();
    expect(createAppVersion).not.toHaveBeenCalled();
  });

  it('creates a draft from the released version and refuses the write', async () => {
    const { client, createAppVersion } = clientWith({
      released: true,
      versions: [{ version_id: 'v1-id', version_name: 'v1', status: 'DRAFT' }, { version_id: 'old', version_name: 'v1_1', status: 'PUBLISHED' }],
    });
    const result = await releasedVersionGuard(client, { app_id: 'app', version_id: 'v1-id' });
    expect(createAppVersion).toHaveBeenCalledWith({ appId: 'app', versionName: 'v1_2', versionFromId: 'v1-id' });
    expect(result?.isError).toBe(true);
    expect(result?.content[0].text).toContain('draft-id');
  });

  it('does not create another draft when one already exists', async () => {
    const { client, createAppVersion } = clientWith({
      released: true,
      versions: [{ version_id: 'v1-id', version_name: 'v1', status: 'DRAFT' }, { version_id: 'v2-id', version_name: 'v2', status: 'DRAFT' }],
    });
    const result = await releasedVersionGuard(client, { app_id: 'app', version_id: 'v1-id' });
    expect(createAppVersion).not.toHaveBeenCalled();
    expect(result?.content[0].text).toContain('v2-id');
  });
});
