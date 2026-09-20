import type { ProfileSession } from '../profiles/session.js';
import { cliHint } from '../profiles/session.js';
import { ok, fail, type ToolDef } from './types.js';

export function listProfilesTool(session: ProfileSession): ToolDef {
  return {
    name: 'list_profiles',
    title: 'List ToolJet Profiles',
    // Reads one local file. Returns names and hosts — never a token, and never the API override.
    annotations: { readOnlyHint: true, openWorldHint: false },
    description:
      'List the ToolJet servers saved on this machine: [{ name, host, active_on_disk, used_by_this_chat }]. ' +
      '`used_by_this_chat` is what every other tool in this conversation acts on; `active_on_disk` is only what a NEW ' +
      'conversation would start on, and may differ. Tokens are never returned. Profiles are created by the person in a ' +
      'terminal, never through chat — if none exist, tell them to run the command in `setup_command`.',
    inputSchema: {},
    async handler() {
      try {
        const profiles = session.list();
        return ok(profiles.length ? { profiles } : { profiles, setup_command: cliHint() });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
