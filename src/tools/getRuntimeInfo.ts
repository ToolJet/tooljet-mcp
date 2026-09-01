import { z } from 'zod';
import type { RuntimeFreshnessMonitor } from '../runtimeFreshness.js';
import { ok, type ToolDef } from './types.js';

export function getRuntimeInfoTool(runtime: RuntimeFreshnessMonitor): ToolDef {
  return {
    name: 'get_runtime_info',
    title: 'Get Runtime Info',
    // Reports this process’s own build identity; touches nothing outside it.
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
    },
    description:
      'Return the loaded ToolJet MCP version/build identity and whether its on-disk runtime changed after process start. ' +
      'If restart_required is true, restart or reload the MCP/plugin host before using any other tool.',
    inputSchema: { refresh: z.boolean().optional().describe('Accepted for discoverability; runtime status is always fresh.') },
    async handler() {
      return ok(runtime.status());
    },
  };
}
