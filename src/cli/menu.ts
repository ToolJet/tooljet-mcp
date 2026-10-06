import { detectedAgents, type AgentAdapter } from './agents/index.js';
import * as cmd from './commands.js';
import { shimState } from '../setup.js';
import * as ui from './ui.js';
import { checkLogin } from '../profiles/checkLogin.js';
import { homeDir } from '../profiles/paths.js';
import { hostOf, loadStore } from '../profiles/store.js';

type Action = 'add' | 'switch' | 'check' | 'agents' | 'remove' | 'command' | 'quit';

const ok = (text: string) => `${ui.good('✓')} ${text}`;

/** Guided menu for `tj`. Runs on the alternate screen, so closing it leaves the terminal as it was —
    plus a one-line-per-change summary, and nothing at all when nothing changed. */
export async function menu(): Promise<void> {
  const done: string[] = [];
  await ui.onAltScreen(() => loop(done));
  if (done.length) console.log(done.join('\n'));
}

async function loop(done: string[]): Promise<void> {
  let startsOn = 'no server saved yet';
  try {
    const store = loadStore();
    if (store.active) startsOn = `default: ${store.active} · ${hostOf(store.profiles[store.active])}`;
    else if (Object.keys(store.profiles).length) startsOn = 'no default server chosen yet';
  } catch {
    // The loop below surfaces the read error.
  }
  ui.logo([startsOn, ui.shortPath(homeDir())]);

  // First run: go straight to adding a server.
  if (!Object.keys(loadStore().profiles).length) {
    ui.log.message('No ToolJet server saved yet — let\'s add one.');
    const added = await addFlow(done);
    if (added && detectedAgents().some((a) => a.status().connected === 'no')) await agentsFlow(done);
  }

  for (;;) {
    const store = loadStore();
    const names = Object.keys(store.profiles);
    const agents = detectedAgents();
    const connected = agents.filter((a) => a.status().connected !== 'no').length;
    const choice = await ui.select<Action>('What would you like to do?', [
      { value: 'add', label: 'Add a ToolJet server' },
      ...(names.length > 1 ? [{ value: 'switch' as Action, label: 'Switch default server', hint: `now: ${store.active || '—'}` }] : []),
      ...(names.length ? [{ value: 'check' as Action, label: 'Check connections', hint: `${names.length} saved` }] : []),
      { value: 'agents', label: 'Connect coding agents', hint: agents.length ? `${connected} of ${agents.length} connected` : 'none detected' },
      ...(names.length ? [{ value: 'remove' as Action, label: 'Remove a server' }] : []),
      ...(shimState() !== 'ours' ? [{ value: 'command' as Action, label: 'Install the `tj` command', hint: 'so you can run this from any terminal' }] : []),
      { value: 'quit', label: 'Quit' },
    ], undefined, 'quit');
    if (ui.isCancel(choice) || choice === 'quit') break;
    try {
      if (choice === 'add') await addFlow(done);
      if (choice === 'switch') await switchFlow(done);
      if (choice === 'check') await checkFlow(done);
      if (choice === 'agents') await agentsFlow(done);
      if (choice === 'remove') await removeFlow(done);
      if (choice === 'command') await installFlow(done);
    } catch (err) {
      const message = (err as Error).message;
      ui.log.error(message);
      done.push(`${ui.bad('✗')} ${message}`);
    }
  }
}

async function addFlow(done: string[]): Promise<string | undefined> {
  const name = await cmd.addWizard();
  if (name) {
    const profile = loadStore().profiles[name];
    done.push(ok(`Added '${name}'${profile ? ` · ${hostOf(profile)}` : ''}`));
  }
  return name;
}

async function switchFlow(done: string[]): Promise<void> {
  const changed = await cmd.pickDefault();
  if (!changed) return;
  ui.log.success(`${changed} Open chats are not affected.`);
  done.push(ok(`${changed} Open chats keep their server; to move one, ask it: "switch to <name>".`));
}

async function checkFlow(done: string[]): Promise<void> {
  const store = loadStore();
  let failing = 0;
  const names = Object.keys(store.profiles);
  for (const [name, profile] of Object.entries(store.profiles)) {
    const spin = ui.spinner();
    spin.start(`${name}  ${ui.dim(hostOf(profile))}`);
    const check = await checkLogin(profile);
    if (check.ok) spin.stop(`${name}  ${ui.dim(check.message)}`);
    else {
      spin.error(`${name}  ${check.message}`);
      failing++;
    }
  }
  done.push(failing
    ? `${ui.warn('!')} ${failing} of ${names.length} tokens failing — details: tj auth status`
    : ok(`${names.length} server${names.length === 1 ? '' : 's'} checked — all tokens work`));
}

async function removeFlow(done: string[]): Promise<void> {
  const store = loadStore();
  const picked = await ui.select('Remove which server?',
    Object.keys(store.profiles).map((n) => ({ value: n, label: n, hint: hostOf(store.profiles[n]) })));
  if (ui.isCancel(picked)) return;
  const sure = await ui.confirm({ message: `Remove '${String(picked)}' and its token from this machine?`, initialValue: false });
  if (ui.isCancel(sure) || !sure) return;
  await cmd.authRemove([picked as string]);
  done.push(ok(`Removed '${String(picked)}'`));
}

async function installFlow(done: string[]): Promise<void> {
  await cmd.install();
  if (shimState() === 'ours') done.push(ok('tj command installed'));
}

const ALL = '__all__';
const OTHER = '__other__';
const BACK = '__back__';

/** One list, one action per Enter. Nothing is pre-selected, so nothing changes unless it is picked. */
async function agentsFlow(done: string[]): Promise<void> {
  const show = (r: cmd.ConnectResult): void => {
    ui.result(r.ok, r.title, r.details);
    done.push(r.ok ? ok(r.title) : `${ui.bad('✗')} ${r.title}`);
  };
  let focus: string | undefined;
  for (;;) {
    const agents = detectedAgents();
    const pending = agents.filter((a) => a.status().connected === 'no');
    const picked = await ui.select<string>('Connect coding agents', [
      ...agents.map((a) => ({ value: a.id, label: a.name, hint: cmd.describe(a).hint })),
      ...(pending.length > 1 ? [{ value: ALL, label: `Connect all ${pending.length} that are not connected` }] : []),
      { value: OTHER, label: 'My agent is not listed…', hint: 'set it up by hand' },
      { value: BACK, label: 'Back' },
    ], focus ?? pending[0]?.id ?? OTHER);
    if (ui.isCancel(picked) || picked === BACK) return;
    focus = picked as string;

    if (picked === ALL) {
      for (const agent of pending) show(await cmd.connectOne(agent));
    } else if (picked === OTHER) {
      ui.log.step('Set up any other agent by hand');
      ui.copyable(cmd.manualInstructions());
      const note = `${ui.warn('!')} Manual setup steps were shown — print them again with: tj agents snippet`;
      if (!done.includes(note)) done.push(note);
    } else {
      const agent = agents.find((a) => a.id === picked)!;
      if (agent.status().connected === 'no') show(await cmd.connectOne(agent));
      else await connectedFlow(agent, show, done);
    }
  }
}

/** An agent that is already connected: tidy a leftover token, or reconnect / disconnect. */
async function connectedFlow(agent: AgentAdapter, show: (r: cmd.ConnectResult) => void, done: string[]): Promise<void> {
  const status = agent.status();
  if (status.storedToken) {
    const sure = await ui.confirm({ message: `Move ${agent.name}'s ToolJet token into a saved server and remove it from its config? A backup is kept.` });
    if (!ui.isCancel(sure) && sure) show(await cmd.connectOne(agent));
    return;
  }
  if (status.connected === 'plugin') {
    ui.log.info(`${agent.name} gets ToolJet from the plugin. There is nothing to change here.`);
    return;
  }
  const action = await ui.select(`${agent.name} is connected`, [
    { value: 'back', label: 'Back' },
    { value: 'reconnect', label: 'Reconnect', hint: 'rewrite its entry — fixes a moved Node or server path' },
    { value: 'disconnect', label: 'Disconnect' },
  ]);
  if (ui.isCancel(action)) return;
  if (action === 'reconnect') show(await cmd.connectOne(agent));
  if (action === 'disconnect') {
    try {
      ui.result(true, `${agent.name} disconnected`, [ui.shortPath(await agent.disconnect())]);
      done.push(ok(`${agent.name} disconnected`));
    } catch (err) {
      ui.result(false, `${agent.name} was not disconnected`, [(err as Error).message]);
      done.push(`${ui.bad('✗')} ${agent.name} was not disconnected`);
    }
  }
}
