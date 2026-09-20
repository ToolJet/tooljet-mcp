import * as cmd from './commands.js';
import { menu } from './menu.js';
import * as ui from './ui.js';
import { TOOLJET_MCP_VERSION } from '../runtimeFreshness.js';

export { CLI_WORDS } from './words.js';

const HELP = `${ui.bold('tj')} — manage the ToolJet servers your coding agents work with

  tj                                   guided menu

  tj auth add                          add a server (asks for URL and token)
  tj auth add <name> --url <URL> --pat-stdin     same, for scripts; token on standard input
  tj auth list                         saved servers
  tj auth status [name] [--offline]    check that each token still works
  tj auth switch [name]                choose what NEW chats start on
  tj auth switch [name] --agent <id>   …for one agent only (--reset to follow the shared default again)
  tj auth set <name> url|api-url <v>   change an address
  tj auth remove <name>

  tj agents                            which coding agents are installed / connected
  tj agents connect <id…> | --all      connect them (no token is written to their config)
  tj agents disconnect <id>
  tj agents snippet                    setup for any other agent: clone the repo, add one entry

  tj install [--force]                 put the server in its fixed home and install this command
  tj uninstall [--profiles]            remove tj and the server copy (saved servers stay unless --profiles)
  tj doctor                            check the whole setup

Inside a chat, ask:  "switch to <name>"  — only that chat moves.
`;

export async function runCli(argv: string[]): Promise<void> {
  try {
    const { values: flags, positionals } = cmd.parseFlags(argv[0] === 'cli' ? argv.slice(1) : argv);
    const [group, sub, ...rest] = positionals;
    if (flags.help || group === 'help') return void console.log(HELP);
    if (flags.version || group === 'version') return void console.log(TOOLJET_MCP_VERSION);
    if (!group) {
      if (!ui.interactive()) return void console.log(HELP);
      return await menu();
    }
    if (group === 'install') return await cmd.install(flags);
    if (group === 'uninstall') return await cmd.uninstall(flags);
    if (group === 'doctor') return await cmd.doctor();
    if (group === 'auth') {
      if (sub === 'add' || sub === 'login') return await cmd.authAdd(rest, flags);
      if (sub === 'list' || sub === 'ls') return await cmd.authList();
      if (sub === 'status' || !sub) return await cmd.authStatus(rest, flags);
      if (sub === 'switch' || sub === 'use') return await cmd.authSwitch(rest, flags);
      if (sub === 'remove' || sub === 'rm' || sub === 'logout') return await cmd.authRemove(rest);
      if (sub === 'set') return await cmd.authSet(rest);
      throw new cmd.CliError(`Unknown command 'tj auth ${sub}'. Try: tj help`);
    }
    if (group === 'agents') {
      if (!sub || sub === 'list') return await cmd.agentsList();
      if (sub === 'connect') return await cmd.agentsConnect(rest, flags);
      if (sub === 'disconnect') return await cmd.agentsDisconnect(rest);
      if (sub === 'snippet') return await cmd.agentsSnippet();
      throw new cmd.CliError(`Unknown command 'tj agents ${sub}'. Try: tj help`);
    }
    throw new cmd.CliError(`Unknown command 'tj ${group}'. Try: tj help`);
  } catch (err) {
    // Node's parser appends a long hint about "--"; the first sentence is the useful part.
    console.error(`${ui.bad('error')} ${(err as Error).message.split('. To specify')[0]}`);
    process.exitCode = 1;
  }
}
