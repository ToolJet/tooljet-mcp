import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ToolResult } from './tools/types.js';

export const TOOLJET_MCP_VERSION = '0.2.0';

interface RuntimeSnapshot {
  buildId: string;
  modifiedMs: number;
  size: number;
}

export interface RuntimeStatus {
  version: string;
  state: 'fresh' | 'stale';
  build_id: string;
  disk_build_id: string;
  process_started_at: string;
  restart_required: boolean;
}

function snapshot(path: string): RuntimeSnapshot {
  try {
    const stat = statSync(path);
    const source = `${Math.round(stat.mtimeMs * 1000)}:${stat.size}`;
    return {
      buildId: createHash('sha256').update(source).digest('hex').slice(0, 12),
      modifiedMs: stat.mtimeMs,
      size: stat.size,
    };
  } catch {
    return { buildId: 'missing', modifiedMs: -1, size: -1 };
  }
}

/**
 * A Node process keeps already-imported MCP code after dist/bundle files are rebuilt.
 * Capture this module's emitted artifact at startup and compare it before every tool call.
 * In a bundled plugin import.meta.url is the bundle itself; under dist it is this emitted module.
 */
export class RuntimeFreshnessMonitor {
  private readonly loaded: RuntimeSnapshot;
  private readonly startedAt = new Date().toISOString();

  constructor(private readonly artifactPath: string = fileURLToPath(import.meta.url)) {
    this.loaded = snapshot(artifactPath);
  }

  status(): RuntimeStatus {
    const current = snapshot(this.artifactPath);
    const stale = current.modifiedMs !== this.loaded.modifiedMs || current.size !== this.loaded.size;
    return {
      version: TOOLJET_MCP_VERSION,
      state: stale ? 'stale' : 'fresh',
      build_id: this.loaded.buildId,
      disk_build_id: current.buildId,
      process_started_at: this.startedAt,
      restart_required: stale,
    };
  }
}

export const runtimeFreshness = new RuntimeFreshnessMonitor();

export function staleRuntimeResult(status: RuntimeStatus): ToolResult {
  return {
    isError: true,
    content: [{
      type: 'text',
      text:
        `Error: MCP_RUNTIME_STALE: the ToolJet MCP files changed after this process started ` +
        `(loaded ${status.build_id}, disk ${status.disk_build_id}). Restart or reload the MCP/plugin host, ` +
        'then retry. No ToolJet request was attempted.',
    }],
    _meta: { tooljet_runtime: status },
  };
}

export function withRuntimeStatus(result: ToolResult, status: RuntimeStatus): ToolResult {
  return { ...result, _meta: { ...(result._meta ?? {}), tooljet_runtime: status } };
}
