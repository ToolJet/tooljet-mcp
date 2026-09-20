// Import-free on purpose: the server entry reads this file before deciding whether to load the CLI.

/** First arguments that mean "this is the command-line tool, not the MCP server". */
export const CLI_WORDS = new Set(['cli', 'auth', 'agents', 'install', 'uninstall', 'doctor', 'help', '--help', '-h', 'version', '--version']);

/** The oldest Node the `tj` CLI runs on (its prompt library needs it). The server itself needs less. */
export const CLI_MIN_NODE = [20, 12] as const;
