import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { ADAPTERS, detectedAgents, manualSetup, manualText, type AgentAdapter } from './agents/index.js';
import { REPO_URL, installBundle, isInstalled, launch, removeHome, removeInstalled, removeShim, runningBundle, selfCommand, shimOnPath, shimPath, shimState, writeShim } from '../setup.js';
import * as ui from './ui.js';
import { checkLogin } from '../profiles/checkLogin.js';
import { homeDir, installedBundlePath, profilesPath } from '../profiles/paths.js';
import { assertProfileName, hostOf, importCredential, isCloudUrl, loadStore, normalizeUrl, saveStore, urlCandidates, type Profile } from '../profiles/store.js';
import { AGENT_LABEL_VAR } from '../profiles/agentId.js';
import { TOOLJET_MCP_VERSION } from '../runtimeFreshness.js';

export class CliError extends Error {}

const tick = () => ui.good('✓');
const cross = () => ui.bad('✗');

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8').trim();
}

/** Every flag `tj` accepts, for Node's own parser. Unknown flags are rejected, so a typo never becomes a server name. */
export const FLAGS = {
  url: { type: 'string' },
  'pat-stdin': { type: 'boolean' },
  pat: { type: 'string' },
  token: { type: 'string' },
  offline: { type: 'boolean' },
  agent: { type: 'string' },
  reset: { type: 'boolean' },
  all: { type: 'boolean' },
  force: { type: 'boolean' },
  profiles: { type: 'boolean' },
  yes: { type: 'boolean', short: 'y' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean' },
} as const;

/** Parse once, with Node's own parser; the flag types come from the table above. */
export const parseFlags = (args: string[]) => parseArgs({ args, options: FLAGS, allowPositionals: true, strict: true });
export type Flags = ReturnType<typeof parseFlags>['values'];

/** Try the URL as typed, then its origin. */
async function settleUrl(raw: string, pat: string): Promise<{ profile: Profile; message: string; ok: boolean }> {
  let last = { profile: { url: normalizeUrl(raw), pat } as Profile, message: '', ok: false };
  for (const url of urlCandidates(raw)) {
    const profile: Profile = { url, pat };
    const check = await checkLogin(profile);
    last = { profile, message: check.message, ok: check.ok };
    if (check.ok) return last;
  }
  return last;
}

// auth

export async function authAdd(args: string[], flags: Flags = {}): Promise<void> {
  const url = flags.url;
  const fromStdin = Boolean(flags['pat-stdin']);
  if (flags.pat !== undefined || flags.token !== undefined) {
    // argv is visible to other processes and lands in shell history.
    throw new CliError('Tokens are never accepted as a command-line argument. Use --pat-stdin, or run `tj auth add` and paste it at the prompt.');
  }
  let name = args[0];

  if (url && fromStdin) {
    if (!name) throw new CliError('Usage: tj auth add <name> --url <URL> --pat-stdin   (token on standard input)');
    assertProfileName(name);
    const pat = await readStdin();
    if (!pat) throw new CliError('No token arrived on standard input.');
    const settled = await settleUrl(url, pat);
    saveProfile(name, settled.profile);
    console.log(`${settled.ok ? tick() : ui.warn('!')} saved '${name}' → ${settled.profile.url}${settled.ok ? '' : `  (${settled.message})`}`);
    return;
  }
  if (!ui.interactive()) throw new CliError('Not a terminal. Use: tj auth add <name> --url <URL> --pat-stdin');
  ui.intro('add a ToolJet server');
  await addWizard(name, url);
  ui.outro(ui.dim('Done.'));
}

export async function addWizard(presetName?: string, presetUrl?: string): Promise<string | undefined> {
  const store = loadStore();
  const taken = Object.keys(store.profiles);
  let suggested = 'workspace-1';
  for (let i = 2; taken.includes(suggested); i++) suggested = `workspace-${i}`;
  const nameAnswer = presetName ?? (await ui.textSuggest({
    message: 'Name for this server',
    suggestion: suggested,
    comment: '// press Tab to use this name',
    validate: (v) => {
      if (!v?.trim()) return 'Type a name, or press Tab to use the suggestion.';
      try { assertProfileName(v); return undefined; } catch (e) { return (e as Error).message; }
    },
  }));
  if (ui.isCancel(nameAnswer)) return undefined;
  const name = String(nameAnswer);

  if (store.profiles[name]) {
    const replace = await ui.confirm({ message: `'${name}' already exists. Replace it?`, initialValue: false });
    if (ui.isCancel(replace) || !replace) return undefined;
  }

  const urlAnswer = presetUrl ?? (await ui.textSuggest({
    message: 'ToolJet URL',
    suggestion: 'https://app.tooljet.ai/',
    comment: '// press Tab for ToolJet cloud',
    validate: (v) => {
      if (!v?.trim()) return 'Type a URL, or press Tab for ToolJet cloud.';
      try { normalizeUrl(v); return undefined; } catch (e) { return (e as Error).message; }
    },
  }));
  if (ui.isCancel(urlAnswer)) return undefined;

  // Self-hosted only: the browser can live on another origin. Blank keeps one address for both.
  let uiUrl = '';
  if (!isCloudUrl(String(urlAnswer))) {
    const answer = await ui.text({
      message: 'UI address, if different (optional)',
      placeholder: 'press enter to skip   e.g. https://ui.your-company.com',
      validate: (v) => {
        if (!v?.trim()) return undefined;
        try { normalizeUrl(v); return undefined; } catch (e) { return (e as Error).message; }
      },
    });
    if (ui.isCancel(answer)) return undefined;
    uiUrl = String(answer ?? '').trim();
  }

  ui.log.message(ui.dim('Create a token in ToolJet: Settings → Access tokens, in the workspace you want to work in.'));
  const pat = await ui.secret('Personal access token');
  if (ui.isCancel(pat) || !pat) return undefined;

  const spin = ui.spinner();
  spin.start('Checking the token');
  const settled = await settleUrl(String(urlAnswer), String(pat).trim());
  if (settled.ok) spin.stop(`${settled.message}`);
  else spin.error(settled.message);

  if (!settled.ok) {
    const keep = await ui.confirm({ message: 'Save it anyway?', initialValue: false });
    if (ui.isCancel(keep) || !keep) return undefined;
  }
  // The optional UI address becomes the profile's url; the address the token was checked at stays as the API.
  const browser = uiUrl ? normalizeUrl(uiUrl) : '';
  const profile: Profile = browser && browser !== settled.profile.url
    ? { url: browser, apiUrl: settled.profile.url, pat: settled.profile.pat }
    : settled.profile;
  const becameActive = saveProfile(name, profile);
  ui.log.success(`Saved '${name}' → ${profile.url}${becameActive ? ui.dim('  · now the default for new chats') : ''}`);
  return name;
}

/** True when it also became the default (the first profile always does). */
function saveProfile(name: string, profile: Profile): boolean {
  const store = loadStore();
  store.profiles[name] = profile;
  const becameActive = !store.active;
  if (becameActive) store.active = name;
  saveStore(store);
  return becameActive;
}

function noProfiles(): void {
  console.log(`No ToolJet servers saved yet. Add one with: ${ui.bold(`${selfCommand()} auth add`)}`);
}

export async function authList(): Promise<void> {
  const store = loadStore();
  const names = Object.keys(store.profiles);
  if (!names.length) return noProfiles();
  const agentsOn = (n: string) => Object.entries(store.agentDefaults).filter(([, p]) => p === n).map(([a]) => a);
  console.log(ui.table(names.map((n) => [
    n === store.active ? ui.accent('●') : ' ',
    n === store.active ? ui.bold(n) : n,
    ui.dim(store.profiles[n].url),
    agentsOn(n).length ? ui.dim(`default for ${agentsOn(n).join(', ')}`) : '',
  ])));
  console.log(ui.dim('\n● = what new chats start on, unless that agent has its own default'));
}

export async function authStatus(args: string[], flags: Flags = {}): Promise<void> {
  const offline = Boolean(flags.offline);
  const store = loadStore();
  const names = args[0] ? [args[0]] : Object.keys(store.profiles);
  if (!Object.keys(store.profiles).length) return noProfiles();
  let failed = false;
  for (const name of names) {
    const profile = store.profiles[name];
    if (!profile) throw new CliError(`No saved server named '${name}'. See: tj auth list`);
    const label = `${name === store.active ? ui.bold(name) : name}${name === store.active ? ui.dim(' (default)') : ''}`;
    if (offline) {
      console.log(`  ${ui.dim('·')} ${label}  ${ui.dim(profile.url)}`);
      continue;
    }
    const check = await checkLogin(profile);
    failed ||= !check.ok;
    console.log(`  ${check.ok ? tick() : cross()} ${label}  ${ui.dim(profile.url)}\n      ${check.ok ? ui.dim(check.message) : check.message}`);
  }
  if (failed) process.exitCode = 1;
}

/** Set what new chats start on: for every agent, or (--agent) for one. */
function setDefault(name: string | undefined, agentId?: string): string {
  const store = loadStore();
  if (agentId && !ADAPTERS.some((a) => a.id === agentId)) {
    throw new CliError(`Unknown agent '${agentId}'. Known: ${ADAPTERS.map((a) => a.id).join(', ')}`);
  }
  if (!name) {
    if (!agentId) throw new CliError('Name a server.');
    delete store.agentDefaults[agentId];
    saveStore(store);
    return `${agentId} now follows the shared default ('${store.active || '—'}').`;
  }
  if (!store.profiles[name]) throw new CliError(`No saved server named '${name}'. See: tj auth list`);
  if (agentId) store.agentDefaults[agentId] = name;
  else store.active = name;
  saveStore(store);
  return agentId ? `New ${agentId} chats now start on '${name}'.` : `New chats now start on '${name}'.`;
}

/** Ask what new chats start on: for every agent or one, then which server. Returns what changed, or nothing if cancelled. */
export async function pickDefault(agentId?: string): Promise<string | undefined> {
  const store = loadStore();
  const EVERY = '__every__';
  const FOLLOW = '__follow__';
  let scope: string | undefined = agentId;
  if (!scope) {
    const asked = await ui.select('Change the default for…', [
      { value: EVERY, label: 'All agents', hint: `now: ${store.active || '—'}` },
      ...detectedAgents().map((a) => ({ value: a.id, label: `${a.name} only`, hint: store.agentDefaults[a.id] ? `now: ${store.agentDefaults[a.id]}` : 'follows all agents' })),
    ]);
    if (ui.isCancel(asked)) return undefined;
    scope = asked === EVERY ? undefined : (asked as string);
  }
  const own = scope ? store.agentDefaults[scope] : undefined;
  const picked = await ui.select('Start new chats on', [
    ...Object.keys(store.profiles).map((n) => ({ value: n, label: n, hint: hostOf(store.profiles[n]) })),
    ...(own ? [{ value: FOLLOW, label: 'Follow all agents again' }] : []),
  ], own || store.active);
  if (ui.isCancel(picked)) return undefined;
  return setDefault(picked === FOLLOW ? undefined : (picked as string), scope);
}

export async function authSwitch(args: string[], flags: Flags = {}): Promise<void> {
  const agentId = flags.agent;
  const reset = Boolean(flags.reset);
  const store = loadStore();
  const names = Object.keys(store.profiles);
  if (!names.length) return noProfiles();
  if (reset && !agentId) throw new CliError('Usage: tj auth switch --agent <id> --reset');
  let message: string | undefined;
  if (reset) message = setDefault(undefined, agentId);
  else if (args[0]) message = setDefault(args[0], agentId);
  else if (ui.interactive()) message = await pickDefault(agentId);
  else {
    // Scripts: no name means "the next one".
    const current = (agentId && store.agentDefaults[agentId]) || store.active;
    message = setDefault(names[(names.indexOf(current) + 1) % names.length], agentId);
  }
  if (!message) return;
  console.log(`${tick()} ${message}`);
  console.log(ui.dim('  Chats that are already open keep their server. To move one, ask it: "switch to <name>".'));
}

export async function authRemove(args: string[]): Promise<void> {
  const name = args[0];
  if (!name) throw new CliError('Usage: tj auth remove <name>');
  const store = loadStore();
  if (!store.profiles[name]) throw new CliError(`No saved server named '${name}'.`);
  delete store.profiles[name];
  for (const [agent, p] of Object.entries(store.agentDefaults)) if (p === name) delete store.agentDefaults[agent];
  if (store.active === name) store.active = Object.keys(store.profiles)[0] ?? '';
  saveStore(store);
  console.log(`${tick()} Removed '${name}'.${store.active ? ui.dim(`  New chats now start on '${store.active}'.`) : ''}`);
}

export async function authSet(args: string[]): Promise<void> {
  const [name, field, value] = args;
  if (!name || !field || !value) throw new CliError('Usage: tj auth set <name> url|api-url <value>    (to change a token, run: tj auth add <name>)');
  const store = loadStore();
  const profile = store.profiles[name];
  if (!profile) throw new CliError(`No saved server named '${name}'.`);
  if (field === 'url') profile.url = normalizeUrl(value);
  else if (field === 'api-url') profile.apiUrl = normalizeUrl(value);
  else throw new CliError(`'${field}' cannot be set. Fields: url, api-url. To change a token, run: tj auth add ${name}`);
  saveStore(store);
  console.log(`${tick()} Updated '${name}'.`);
}

// install / agents

async function ensureInstalled(quiet = false): Promise<void> {
  const running = runningBundle();
  if (!running && !isInstalled()) installBundle(); // throws the actionable "build first" message
  if (running) {
    const { to } = installBundle();
    if (!quiet) console.log(`${tick()} Server installed at ${ui.dim(to)}`);
  }
}

export async function install(flags: Flags = {}): Promise<void> {
  const force = Boolean(flags.force);
  await ensureInstalled();
  const state = shimState();
  if (state === 'foreign' && !force) {
    let overwrite = false;
    if (ui.interactive()) {
      const answer = await ui.confirm({ message: `${shimPath()} is another program also called tj. Replace it?`, initialValue: false });
      overwrite = !ui.isCancel(answer) && Boolean(answer);
    }
    if (!overwrite) {
      console.log(`${ui.warn('!')} Left ${shimPath()} alone. Re-run with --force to replace it, or run this tool as:\n    "${process.execPath}" "${installedBundlePath()}" cli`);
      return;
    }
  }
  const path = writeShim();
  console.log(`${tick()} Command installed: ${ui.bold('tj')} ${ui.dim(`(${path})`)}`);
  if (!shimOnPath()) {
    console.log(`${ui.warn('!')} ${path.replace(/[\\/]tj(\.cmd)?$/, '')} is not on your PATH yet. Add it, then open a new terminal.`);
  }
}

/** Undo install: the tj command, the server copy, agent entries — and the saved servers only if asked. */
export async function uninstall(flags: Flags = {}, agents = detectedAgents()): Promise<void> {
  if (!ui.interactive() && !flags.yes) throw new CliError('Not a terminal. Use: tj uninstall --yes [--profiles]');
  const connected = agents.filter((a) => a.status().connected === 'yes');
  const viaPlugin = agents.filter((a) => a.status().connected === 'plugin');
  let saved = -1; // unreadable file: treat it as holding something
  try { saved = Object.keys(loadStore().profiles).length; } catch { /* removed below like any other file */ }
  const hasProfiles = saved !== 0 && existsSync(profilesPath());
  // Nothing saved → the whole folder can go. Otherwise the saved servers go only when asked.
  let wipe = !hasProfiles || Boolean(flags.profiles);

  const planned = [
    ...(shimState() === 'ours' ? [`the tj command  ${ui.shortPath(shimPath())}`] : []),
    ...(isInstalled() ? [`the server copy in ${ui.shortPath(homeDir())}`] : []),
    ...connected.map((a) => `the ToolJet entry in ${a.name}`),
    ...(hasProfiles && wipe ? ['every saved server and its token — ALL coding agents lose them'] : []),
  ];
  if (!planned.length && !hasProfiles) return void console.log('Nothing to remove.');

  if (ui.interactive() && !flags.yes) {
    ui.intro('uninstall');
    if (planned.length) {
      ui.log.message(`This removes:\n${planned.map((l) => `  · ${l}`).join('\n')}`);
      const go = await ui.confirm({ message: 'Continue?', initialValue: false });
      if (ui.isCancel(go) || !go) return void ui.outro(ui.dim('Nothing was changed.'));
    }
    if (hasProfiles && !flags.profiles) {
      const also = await ui.confirm({
        message: `${planned.length ? 'Also delete' : 'Delete'} the saved servers and their tokens? They are shared — ALL coding agents lose them.`,
        initialValue: false,
      });
      if (ui.isCancel(also)) return void ui.outro(ui.dim('Nothing was changed.'));
      wipe = Boolean(also);
    }
  }

  for (const agent of connected) {
    try {
      console.log(`${tick()} ToolJet entry removed from ${agent.name} ${ui.dim(`(${ui.shortPath(await agent.disconnect())})`)}`);
    } catch (err) {
      console.log(`${cross()} ${agent.name}: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  }
  const shim = shimPath();
  if (removeShim()) console.log(`${tick()} tj command removed ${ui.dim(`(${ui.shortPath(shim)})`)}`);
  else if (shimState() === 'foreign') console.log(`${ui.warn('!')} Left ${ui.shortPath(shim)} alone — it is a different program called tj.`);
  if (wipe) {
    removeHome();
    console.log(`${tick()} Removed ${ui.shortPath(homeDir())}${hasProfiles ? ' — the saved servers are gone for every coding agent' : ''}`);
  } else {
    if (isInstalled()) {
      removeInstalled();
      console.log(`${tick()} Server copy removed.`);
    }
    console.log(ui.dim(`  Saved servers kept: ${ui.shortPath(profilesPath())} — a reinstall finds them again.\n  Delete that file to remove them for every coding agent.`));
  }
  if (viaPlugin.length) {
    console.log(`${ui.warn('!')} The ToolJet plugin is still installed in ${viaPlugin.map((a) => a.name).join(', ')} — it reinstalls all this on its next chat. Remove the plugin there too.`);
  }
  if (ui.interactive() && !flags.yes) ui.outro(ui.dim('Done.'));
}

export function describe(agent: AgentAdapter): { connected: boolean; hint: string } {
  const s = agent.status();
  const state = s.connected === 'plugin' ? 'connected through the plugin' : s.connected === 'yes' ? 'connected' : 'not connected';
  return { connected: s.connected !== 'no', hint: s.storedToken ? `${state} · ${ui.warn('token still in its config')}` : state };
}

export async function agentsList(): Promise<void> {
  const found = detectedAgents();
  if (!found.length) {
    console.log('No supported coding agent was found on this machine. See: tj agents snippet');
    return;
  }
  console.log(ui.table(found.map((a) => {
    const d = describe(a);
    return [d.connected ? tick() : ui.dim('○'), a.name, d.connected ? d.hint : ui.dim(d.hint)];
  })));
}

/** Save the credential an agent already holds as a profile, so connecting never moves it to another server. */
async function keepExistingServer(agent: AgentAdapter): Promise<{ name: string; created: boolean; isDefault: boolean } | undefined> {
  const cred = agent.storedCredential?.();
  if (!cred) return undefined;
  // The login tells us the workspace, which names the profile if the server's own name is taken.
  const { workspaceSlug } = await checkLogin(cred);
  const imported = importCredential({ ...cred, workspaceSlug });
  return { ...imported, isDefault: loadStore().active === imported.name };
}

export interface ConnectResult {
  ok: boolean;
  title: string;
  details: string[];
}

/** True when connecting would change something: not connected yet, or a token still sits in its config. */
function needsConnect(agent: AgentAdapter): boolean {
  const s = agent.status();
  return s.connected === 'no' || s.storedToken;
}

export async function connectOne(agent: AgentAdapter): Promise<ConnectResult> {
  try {
    const before = agent.status();
    // Keep the agent on the server it was already set up with, as ITS default.
    const kept = await keepExistingServer(agent);
    if (kept && !kept.isDefault) setDefault(kept.name, agent.id);
    const details: string[] = [];
    let title = `${agent.name} gets ToolJet from the plugin`;
    if (before.connected !== 'plugin') {
      await ensureInstalled(true);
      details.push(ui.shortPath(await agent.connect({ ...launch(), env: { [AGENT_LABEL_VAR]: agent.id } })));
      title = `${agent.name} connected`;
    }
    if (kept) details.push(kept.isDefault ? `Its server is your default, '${kept.name}'.` : `Its server is kept as '${kept.name}', and ${agent.name} starts on it.`);
    if (agent.scrubToken && agent.status().storedToken) details.push(`Token removed from ${ui.shortPath(agent.scrubToken())} (backup beside it).`);
    else if (before.storedToken) details.push('Token removed from its config (backup beside it).');
    if (before.connected !== 'plugin' || before.storedToken) details.push(agent.reload);
    return { ok: true, title, details };
  } catch (err) {
    return { ok: false, title: `${agent.name} was not connected`, details: [(err as Error).message] };
  }
}

function printResult(r: ConnectResult): void {
  console.log(`${r.ok ? tick() : cross()} ${ui.bold(r.title)}`);
  for (const d of r.details) console.log(`    ${ui.dim(d)}`);
  if (!r.ok) process.exitCode = 1;
}

export async function agentsConnect(args: string[], flags: Flags = {}): Promise<void> {
  const all = Boolean(flags.all);
  const chosen = all ? detectedAgents().filter(needsConnect) : args.map((id) => {
    const agent = ADAPTERS.find((a) => a.id === id);
    if (!agent) throw new CliError(`Unknown agent '${id}'. Known: ${ADAPTERS.map((a) => a.id).join(', ')}`);
    return agent;
  });
  if (all && !chosen.length) return void console.log('Every coding agent found on this machine is already connected.');
  if (!chosen.length) throw new CliError(`Usage: tj agents connect <id…> | --all\nKnown: ${ADAPTERS.map((a) => a.id).join(', ')}`);
  for (const agent of chosen) printResult(await connectOne(agent));
}

export async function agentsDisconnect(args: string[]): Promise<void> {
  const agent = ADAPTERS.find((a) => a.id === args[0]);
  if (!agent) throw new CliError(`Usage: tj agents disconnect <id>\nKnown: ${ADAPTERS.map((a) => a.id).join(', ')}`);
  const where = await agent.disconnect();
  console.log(`${tick()} Disconnected ${agent.name} ${ui.dim(`(${where})`)}`);
}

/** Setup steps for an agent that is not in the list. The same for everyone, and it changes nothing. */
export function manualInstructions(): string {
  return manualText(manualSetup(REPO_URL));
}

export async function agentsSnippet(): Promise<void> {
  console.log(`${ui.bold('Set up any other agent by hand')}\n\n${manualInstructions()}`);
}

// doctor

export async function doctor(): Promise<void> {
  const line = (ok: boolean | 'warn', msg: string) => console.log(`  ${ok === 'warn' ? ui.warn('!') : ok ? tick() : cross()} ${msg}`);
  console.log(ui.bold(`tooljet-mcp ${TOOLJET_MCP_VERSION}`) + ui.dim(`  ·  node ${process.version}  ·  ${process.platform}`));
  const major = Number(process.versions.node.split('.')[0]);
  line(major >= 20, `Node ${process.version}${major >= 20 ? '' : ' — version 20 or newer is required'}`);
  line(true, `Home: ${homeDir()}`);
  line(isInstalled() || 'warn', isInstalled() ? `Server: ${installedBundlePath()}` : `Server not installed to the home folder yet — run: ${selfCommand()} install`);
  const shim = shimState();
  line(shim === 'ours' ? (shimOnPath() || 'warn') : 'warn',
    shim === 'ours' ? `Command: ${shimPath()}${shimOnPath() ? '' : ' (its folder is not on PATH)'}` : shim === 'foreign' ? `${shimPath()} is a different program called tj — replace it with: ${selfCommand()} install --force` : `The \`tj\` command is not installed — run: ${selfCommand()} install`);
  try {
    const store = loadStore();
    const n = Object.keys(store.profiles).length;
    line(n > 0 || 'warn', n ? `${n} saved server${n === 1 ? '' : 's'}; new chats start on '${store.active || '—'}'  ${ui.dim(profilesPath())}` : `No saved servers — run: ${selfCommand()} auth add`);
  } catch (err) {
    line(false, (err as Error).message);
  }
  console.log(ui.bold('\nCoding agents'));
  const found = detectedAgents();
  let own: Record<string, string> = {};
  try { own = loadStore().agentDefaults; } catch { /* reported above */ }
  if (!found.length) line('warn', 'none detected');
  for (const a of found) {
    const s = a.status();
    if (s.connected === 'no') console.log(`  ${ui.dim('○')} ${a.name}: ${ui.dim(`not connected — run: ${selfCommand()} agents connect ${a.id}`)}`);
    else line(s.storedToken ? 'warn' : true, `${a.name}: ${describe(a).hint}${own[a.id] ? ui.dim(`  · starts on '${own[a.id]}'`) : ''}`);
  }
}
