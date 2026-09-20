import { existsSync } from 'node:fs';
import {
  appConfig, credentialFromEnv, editJson, entryHoldsToken, home, isMac, jsonFileAdapter, readJson, readText, run, which,
  SERVER_NAME, type AgentAdapter, type Launch,
} from './shared.js';

export type { AgentAdapter, AgentStatus, Launch, StoredCredential } from './shared.js';

const macApp = (name: string): boolean => isMac && existsSync(`/Applications/${name}.app`);
const PLUGIN_KEY = 'tooljet-app-builder@';


// Claude Code and Codex rewrite their config while running: register through their own CLI, only read their files.
const claudeCode: AgentAdapter = {
  id: 'claude-code',
  name: 'Claude Code',
  reload: 'New chats pick it up. In an open CLI session run /mcp; in the desktop app, start a new chat.',
  detect: () => Boolean(which('claude')) || existsSync(home('.claude.json')),
  status() {
    const settings = readJson(home('.claude', 'settings.json')) ?? {};
    // enabledPlugins is what Claude Code acts on: a plugin that is installed but switched off provides nothing.
    const viaPlugin = Object.entries(settings.enabledPlugins ?? {}).some(([k, on]) => k.startsWith(PLUGIN_KEY) && on === true);
    const viaUser = Boolean(readJson(home('.claude.json'))?.mcpServers?.[SERVER_NAME]);
    return {
      connected: viaPlugin ? 'plugin' : viaUser ? 'yes' : 'no',
      storedToken: entryHoldsToken({ env: settings.env ?? {} }),
      detail: viaPlugin ? 'through the ToolJet plugin' : undefined,
    };
  },
  async connect(launch) {
    if (this.status().connected === 'plugin') return 'already provided by the ToolJet plugin — nothing to add';
    const bin = which('claude');
    if (!bin) throw new Error('The `claude` command is not on your PATH. Install Claude Code, or add the entry by hand ("Other agent").');
    const json = JSON.stringify({ type: 'stdio', command: launch.command, args: launch.args, ...(launch.env ? { env: launch.env } : {}) });
    const res = await run(bin, ['mcp', 'add-json', '--scope', 'user', SERVER_NAME, json]);
    if (!res.ok) throw new Error(`claude mcp add-json failed: ${res.out}`);
    return '~/.claude.json (user scope)';
  },
  async disconnect() {
    if (this.status().connected === 'plugin') throw new Error('ToolJet comes from the plugin here. Disable it in Claude Code with /plugin.');
    const bin = which('claude');
    if (!bin) throw new Error('The `claude` command is not on your PATH.');
    const res = await run(bin, ['mcp', 'remove', '--scope', 'user', SERVER_NAME]);
    if (!res.ok) throw new Error(`claude mcp remove failed: ${res.out}`);
    return '~/.claude.json (user scope)';
  },
  storedCredential: () => credentialFromEnv(readJson(home('.claude', 'settings.json'))?.env),
  scrubToken() {
    const file = home('.claude', 'settings.json');
    editJson(file, (doc) => {
      for (const k of Object.keys(doc.env ?? {})) if (/^TOOLJET_/.test(k)) delete doc.env[k];
    });
    return file;
  },
};

function codexBinary(): string | undefined {
  return which('codex') ?? (isMac && existsSync('/Applications/ChatGPT.app/Contents/Resources/codex')
    ? '/Applications/ChatGPT.app/Contents/Resources/codex'
    : undefined);
}

const codex: AgentAdapter = {
  id: 'codex',
  name: 'Codex',
  reload: 'Restart the ChatGPT/Codex app, or start a new `codex` session.',
  detect: () => Boolean(codexBinary()) || existsSync(home('.codex')),
  status() {
    const toml = readText(home('.codex', 'config.toml'));
    const viaPlugin = /\[plugins\."tooljet-app-builder@[^"]*"\]\s*\r?\n\s*enabled\s*=\s*true/.test(toml);
    const viaUser = /^\[mcp_servers\.tooljet\]/m.test(toml);
    const block = toml.split(/^\[mcp_servers\.tooljet\.env\]/m)[1]?.split(/^\[/m)[0] ?? '';
    return {
      connected: viaPlugin ? 'plugin' : viaUser ? 'yes' : 'no',
      storedToken: /^\s*TOOLJET_(PAT|PASSWORD)\s*=\s*"[^"$]/m.test(block),
      detail: viaPlugin ? 'through the ToolJet plugin' : undefined,
    };
  },
  storedCredential() {
    const block = readText(home('.codex', 'config.toml')).split(/^\[mcp_servers\.tooljet\.env\]/m)[1]?.split(/^\[/m)[0] ?? '';
    const envMap = Object.fromEntries([...block.matchAll(/^\s*(TOOLJET_[A-Z_]+)\s*=\s*"([^"]*)"/gm)].map((m) => [m[1], m[2]]));
    return credentialFromEnv(envMap);
  },
  async connect(launch) {
    if (this.status().connected === 'plugin') return 'already provided by the ToolJet plugin — nothing to add';
    const bin = codexBinary();
    if (!bin) throw new Error('Could not find the `codex` command. Add the entry by hand ("Other agent").');
    if (this.status().connected === 'yes') await run(bin, ['mcp', 'remove', SERVER_NAME]);
    const envArgs = Object.entries(launch.env ?? {}).flatMap(([k, v]) => ['--env', `${k}=${v}`]);
    const res = await run(bin, ['mcp', 'add', SERVER_NAME, ...envArgs, '--', launch.command, ...launch.args]);
    if (!res.ok) throw new Error(`codex mcp add failed: ${res.out}`);
    return '~/.codex/config.toml';
  },
  async disconnect() {
    if (this.status().connected === 'plugin') throw new Error('ToolJet comes from the plugin here. Disable it from Codex → Plugins.');
    const bin = codexBinary();
    if (!bin) throw new Error('Could not find the `codex` command.');
    const res = await run(bin, ['mcp', 'remove', SERVER_NAME]);
    if (!res.ok) throw new Error(`codex mcp remove failed: ${res.out}`);
    return '~/.codex/config.toml';
  },
};

const vscodeUserMcp = (): string => appConfig('Code', 'User', 'mcp.json');

const vscode: AgentAdapter = {
  ...jsonFileAdapter({
    id: 'vscode',
    name: 'VS Code (Copilot)',
    detect: () => Boolean(which('code')) || macApp('Visual Studio Code') || existsSync(appConfig('Code', 'User')),
    file: vscodeUserMcp,
    key: 'servers',
    entry: (l: Launch) => ({ type: 'stdio', command: l.command, args: l.args }),
    reload: 'VS Code starts it on your next chat message and asks once whether you trust it.',
  }),
  async connect(launch) {
    // Prefer VS Code's own flag; edit the file only when `code` is missing.
    const bin = which('code');
    if (bin) {
      const json = JSON.stringify({ name: SERVER_NAME, type: 'stdio', command: launch.command, args: launch.args, ...(launch.env ? { env: launch.env } : {}) });
      const res = await run(bin, ['--add-mcp', json]);
      if (res.ok) return 'your VS Code user profile';
    }
    editJson(vscodeUserMcp(), (doc) => {
      doc.servers = { ...(doc.servers ?? {}), [SERVER_NAME]: { type: 'stdio', command: launch.command, args: launch.args, ...(launch.env ? { env: launch.env } : {}) } };
    });
    return vscodeUserMcp();
  },
};


export const ADAPTERS: AgentAdapter[] = [
  claudeCode,
  codex,
  jsonFileAdapter({
    id: 'antigravity',
    name: 'Antigravity',
    detect: () => macApp('Antigravity') || existsSync(home('.gemini', 'config')),
    file: () => home('.gemini', 'config', 'mcp_config.json'),
    reload: 'In Antigravity open MCP Servers → Manage and press Refresh (or restart the app).',
  }),
  jsonFileAdapter({
    id: 'cursor',
    name: 'Cursor',
    detect: () => macApp('Cursor') || existsSync(home('.cursor')) || Boolean(which('cursor')),
    file: () => home('.cursor', 'mcp.json'),
    entry: (l: Launch) => ({ type: 'stdio', command: l.command, args: l.args }),
    reload: 'Restart Cursor, then enable "tooljet" under Settings → MCP if it is off.',
  }),
  vscode,
  jsonFileAdapter({
    id: 'claude-desktop',
    name: 'Claude Desktop',
    detect: () => macApp('Claude') || existsSync(appConfig('Claude', 'claude_desktop_config.json')),
    file: () => appConfig('Claude', 'claude_desktop_config.json'),
    reload: 'Quit Claude Desktop completely and open it again.',
  }),
  jsonFileAdapter({
    id: 'gemini-cli',
    name: 'Gemini CLI',
    detect: () => Boolean(which('gemini')) || existsSync(home('.gemini', 'settings.json')),
    file: () => home('.gemini', 'settings.json'),
    reload: 'Run /mcp refresh in an open session, or start a new one.',
  }),
  jsonFileAdapter({
    id: 'windsurf',
    name: 'Windsurf',
    detect: () => macApp('Windsurf') || existsSync(home('.codeium', 'windsurf')),
    file: () => home('.codeium', 'windsurf', 'mcp_config.json'),
    reload: 'Restart Windsurf.',
  }),
  jsonFileAdapter({
    id: 'kiro',
    name: 'Kiro',
    detect: () => macApp('Kiro') || existsSync(home('.kiro')),
    file: () => home('.kiro', 'settings', 'mcp.json'),
    reload: 'Kiro reloads the file on save.',
  }),
];

export const detectedAgents = (): AgentAdapter[] => ADAPTERS.filter((a) => a.detect());

export interface ManualSetup {
  cloneCommand: string;
  name: string;
  command: string;
  /** A placeholder path, never a real one: the same screen for every user. */
  argument: string;
  /** The part of `argument` the person replaces. */
  placeholder: string;
  json: string;
  /** How to find the real path, how to find node, and any OS-specific catch. */
  notes: string[];
}

/**
 * Setup for an agent `tj` cannot connect itself: clone the repo, then add one entry.
 * Only the OS changes the text — it never uses this machine's paths or user name.
 */
export function manualSetup(repoUrl: string, platform: NodeJS.Platform = process.platform): ManualSetup {
  const windows = platform === 'win32';
  // Forward slashes on Windows too: Node accepts them, and in JSON a backslash must be doubled.
  const placeholder = `${windows ? 'C:' : ''}/path/to`;
  const argument = `${placeholder}/tooljet-mcp/bundle/index.js`;
  const json = JSON.stringify({ mcpServers: { [SERVER_NAME]: { command: 'node', args: [argument] } } }, null, 2)
    .replace(/\[\s+("(?:[^"\\]|\\.)*")\s+\]/, '[$1]');
  return {
    cloneCommand: `git clone ${repoUrl}`,
    name: SERVER_NAME,
    command: 'node',
    argument,
    placeholder,
    json,
    notes: [
      'Already have the repo? Skip step 1.',
      windows
        ? "Not sure of the full path? Copy it from File Explorer's address bar."
        : 'Not sure of the full path? Run pwd inside the tooljet-mcp folder.',
      ...(windows ? ['In JSON, keep the forward slashes, or double every backslash.'] : []),
      `If the agent cannot find node, use its full path (run: ${windows ? 'where' : 'which'} node).`,
      'To update later, run git pull inside the tooljet-mcp folder.',
    ],
  };
}

/** The same setup as plain text. No colour, border or gutter: every line must survive a copy and paste. */
export function manualText(setup: ManualSetup): string {
  const indent = (block: string, by: string) => block.split('\n').map((line) => (line ? by + line : '')).join('\n');
  return indent([
    'Any agent that supports MCP servers can use ToolJet.',
    '',
    '1. Clone the ToolJet MCP repo into any folder, such as your Desktop:',
    '',
    indent(setup.cloneCommand, '   '),
    '',
    "2. Add a server in your agent's MCP settings.",
    `   Replace ${setup.placeholder} with the folder you cloned into.`,
    '',
    `   Name       ${setup.name}`,
    `   Command    ${setup.command}`,
    `   Argument   ${setup.argument}`,
    '',
    '   Most agents take it as JSON, often in a file named mcp.json:',
    '',
    indent(setup.json, '   '),
    '',
    '3. Restart the agent. No token goes in its config — use tj for servers.',
    '',
    ...setup.notes,
  ].join('\n'), '   ');
}
