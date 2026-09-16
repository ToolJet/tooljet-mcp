import { editContractSchema, generateEditContract } from '../editContract.js';
import { ok, fail, type ToolDef } from './types.js';

export function generateEditContractTool(): ToolDef {
  return {
    name: 'generate_edit_contract', title: 'Generate Safe Edit Contract',
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    description: 'Generate opt-in raw-record snapshot, native field defaults/change events, and changed-field-only RunJS payload preparation for an edit workflow. Preserves untouched fields; explicitly nullable fields can be cleared. No API calls, writes, layout choices or inferred business rules. Supply existing query/component names and merge returned artifacts into a linted phase; wire the datasource mutation separately using the returned guarded ID/patch contract.',
    inputSchema: editContractSchema.shape,
    async handler(args) {
      try { return ok(generateEditContract(args)); } catch (error) { return fail(error); }
    },
  };
}
