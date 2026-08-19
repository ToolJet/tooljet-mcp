import { mkdtempSync, writeFileSync, utimesSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuntimeFreshnessMonitor, staleRuntimeResult } from '../src/runtimeFreshness.js';
import { registerTools } from '../src/tools/index.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function runtimeFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'tooljet-runtime-'));
  tempDirs.push(dir);
  const file = join(dir, 'index.js');
  writeFileSync(file, 'first build');
  return file;
}

describe('runtime freshness', () => {
  it('detects an emitted runtime changed after process startup', () => {
    const file = runtimeFile();
    const monitor = new RuntimeFreshnessMonitor(file);
    expect(monitor.status()).toMatchObject({ state: 'fresh', restart_required: false });

    writeFileSync(file, 'second build');
    const future = new Date(Date.now() + 10_000);
    utimesSync(file, future, future);

    const status = monitor.status();
    expect(status).toMatchObject({ state: 'stale', restart_required: true });
    expect(status.disk_build_id).not.toBe(status.build_id);
    expect(staleRuntimeResult(status).content[0]!.text).toMatch(/MCP_RUNTIME_STALE.*No ToolJet request was attempted/i);
  });

  it('blocks ordinary tools while leaving runtime diagnosis available', async () => {
    const file = runtimeFile();
    const monitor = new RuntimeFreshnessMonitor(file);
    const registrations = new Map<string, (args: unknown) => Promise<any>>();
    const server = {
      registerTool: vi.fn((name: string, _definition: unknown, handler: (args: unknown) => Promise<any>) => {
        registrations.set(name, handler);
      }),
    };
    const client = { listWorkspaces: vi.fn() } as unknown as ToolJetClient;
    registerTools(server as any, client, monitor);

    writeFileSync(file, 'changed build');
    const future = new Date(Date.now() + 10_000);
    utimesSync(file, future, future);

    const blocked = await registrations.get('list_workspaces')!({});
    expect(blocked.isError).toBe(true);
    expect(blocked.content[0].text).toMatch(/MCP_RUNTIME_STALE/);
    expect((client.listWorkspaces as any)).not.toHaveBeenCalled();

    const info = await registrations.get('get_runtime_info')!({});
    expect(JSON.parse(info.content[0].text)).toMatchObject({ state: 'stale', restart_required: true });
  });
});
