# Profiles and the `tj` CLI

The server owns its credentials. Agents only know how to launch it.

```text
tj (terminal) ──writes──▶ ~/.tooljet-mcp/profiles.json   tokens live only here (0600)
                                   ▲ read at start, and on use_profile
agent ──launches──▶ tooljet-mcp ───┘                     one process per chat
```

## Why

- A process reads its environment once, so switching servers meant editing an agent's config and restarting it.
- Every chat on the machine was forced onto the same server.
- Codex passes an unset `${TOOLJET_PAT}` through as literal text, so the server got that string as its token. `env()` in `src/config.ts` now treats it as unset; the plugin manifests are unchanged.

## Rules

| Rule | Where |
|---|---|
| Start-up order: environment token → `TOOLJET_PROFILE` (pins, no switching) → the agent's own default → the shared default → none (still starts; tools answer with the setup command). | `src/profiles/resolve.ts` |
| A chat keeps its server. `tj auth switch` only affects new chats. A chat moves only through `use_profile`, which never writes the file. | `src/profiles/session.ts` |
| A switch replaces the whole client behind a proxy, dropping its token and cached ids. | `src/switchableClient.ts` |
| A `plan_token` is refused after a switch, without being consumed. | `src/appPlanStore.ts` |
| Every result names its server in `_meta.tooljet_profile`. | `src/tools/index.ts` |
| Tokens never appear in tool input, output, errors or telemetry, and are never accepted in argv. | masked prompt or `--pat-stdin` |
| `use_profile` is marked destructive so clients ask first, and is used only on the person's own request. | `src/tools/useProfile.ts` |

## The file

```json
{
  "version": "0.x.x",
  "active": "cloud",
  "agentDefaults": { "codex": "staging" },
  "profiles": {
    "cloud": { "url": "https://app.tooljet.ai", "pat": "tj_pat_…" },
    "staging": { "url": "https://tooljet.your-company.com", "pat": "tj_pat_…" }
  }
}
```

- A profile holds the same three details as the `.env` setup, and nothing else:

  | Profile field | `.env` variable | Needed |
  |---|---|---|
  | `url` | `TOOLJET_DEPLOYMENT_URL` | always — where you open ToolJet; also used for the API |
  | `pat` | `TOOLJET_PAT` | always — the token decides the workspace |
  | `apiUrl` | `TOOLJET_URL` | only when the API is at a different address than `url` |
- `active` is what new chats start on. `agentDefaults` overrides it per agent, so Codex's default never moves Claude.
- The server learns the agent from the `TOOLJET_AGENT` label `tj` writes into an entry, else from the MCP client's name in the handshake (`src/profiles/agentId.ts`). The switch happens before the first tool call.
- An environment token or a `TOOLJET_PROFILE` pin is never overridden.
- `version` is written by the tool: the newest tooljet-mcp that has saved the file. It only moves up, so an older plugin in another agent never lowers it.
- Format changes only add fields. Unknown fields are kept on save, so an older version never deletes a newer one's data.

## Existing setups keep working

| Case | What happens |
|---|---|
| Server started with `TOOLJET_PAT` in its environment | Still wins. Start-up writes nothing; once that token has logged in, it is kept as a profile named after the server (`cloud`, `local`, `staging`…) — only if that server is not saved yet, so a renewed token never adds a copy. |
| `tj agents connect` finds a token in an agent's config | Saved as a profile first, then the token is removed from that config. |
| That profile is not the shared default | It becomes that agent's own default, so the agent starts where it always did and can still switch. |

The first profile saved becomes the shared default; later ones never take it over.

## Layout

| Path | Job |
|---|---|
| `src/profiles/` | store, start-up resolution, scope, login check, per-chat session |
| `src/tools/listProfiles.ts`, `useProfile.ts` | the two tools (stdio only) |
| `src/setup.ts` | the fixed copy, the `tj` command, first-start setup (used by the server and by `tj`) |
| `src/cli/` | `tj`: commands, guided menu, UI |
| `src/cli/agents/` | one adapter per agent: detect, status, connect, disconnect |
| `skills/use-tj/` | skill that lets an agent find, install and run `tj`; never handles a token |

`node bundle/index.js <cli|auth|agents|install|doctor|help|version>` runs the CLI; anything else starts the server. The CLI is its own file, `bundle/cli/index.js`, loaded only then: its prompt library needs Node 20.12, the server does not.

## Menu rules

- Enter acts on the highlighted row. No checkbox lists, and nothing is pre-selected, so nothing changes unless it is picked.
- A menu erases itself when left. Only results stay on screen.
- `tj` runs on the alternate screen: closing it restores the terminal, leaving one summary line per change — and nothing at all when nothing changed.
- Anything a person copies (a command, a config entry) prints with no border or gutter.
- No quizzes. "My agent is not listed" shows the two steps; it does not ask which format the agent uses.
- Instructions are the same for every user: placeholder paths (`/path/to/…`), plain `node`. They never use this machine's folders, user name or Node path, and never guess whether the repo is already cloned. Only the OS changes the text (`C:/path/to` on Windows, how to find a path, the Windows note on slashes in JSON).

## Fixed home and automatic setup

On its first start the server copies `bundle/` and `data/` to `~/.tooljet-mcp/` and writes the `tj` command (`~/.local/bin/tj`), so adding the MCP is the whole install. Agent configs point at the fixed copy, so they survive plugin updates.

- Silent and best effort: it never blocks start-up, never prints, and never replaces another program called `tj`.
- The copy is refreshed when a newer version starts. `tj install` does the same by hand.
- `TOOLJET_MCP_NO_AUTO_SETUP=1` turns off everything a server start may write: this setup, and keeping an env token as a profile.
- `TOOLJET_MCP_HOME` moves the home, and skips the `tj` command unless `TOOLJET_MCP_BIN_DIR` is set too.

`tj uninstall` undoes it: it removes the `tj` command, the copy, and the ToolJet entry from connected agents, after showing what it will touch. Saved servers are kept unless you also confirm deleting them (or pass `--profiles`) — they are shared, so deleting removes them for **all** coding agents. Remove the plugin from your agents first, or its next chat installs everything again; `tj uninstall` warns when it sees the plugin still connected. Scripts: `tj uninstall --yes [--profiles]`.

## Agents

| Agent | How it is connected |
|---|---|
| Claude Code, Codex | their own `mcp add` command; their files are only read, because they rewrite them while running |
| Antigravity, Cursor, VS Code, Claude Desktop, Gemini CLI, Windsurf, Kiro | edit of one JSON file: backup (`.tj.bak`), atomic write, files with comments refused |
| anything else | by hand: clone the repo, then add one entry that runs `bundle/index.js`. `tj agents snippet` prints both steps, the same for everyone, and changes nothing. |

Connecting replaces the whole entry, which also removes a token left in an old `env` or `headers` block.
