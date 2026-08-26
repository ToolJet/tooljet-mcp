# ToolJet MCP — Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local Node/TypeScript MCP server (+ bundled skill) that lets Codex build a ToolJet app end-to-end — create app → add a ToolJet-DB query → add a Table bound to it — through ToolJet's own governed endpoints, so a seeded `tickets` table renders from a single Codex prompt.

**Architecture:** Thin governed proxy. Each MCP tool maps to authenticated HTTP call(s) against the local ToolJet backend's internal `versions` / `data-queries` / `data-sources` / `apps` endpoints. The server logs in once (session cookie) and reuses it. No DB writes, no duplicated business logic. Codex supplies the intelligence/orchestration; the server exposes primitives.

**Tech Stack:** Node 22, TypeScript, `@modelcontextprotocol/sdk` (stdio transport), `zod` (tool input schemas), `undici`/global `fetch` (HTTP + cookie handling), `vitest` (tests).

**Spec:** `docs/specs/2026-06-26-tooljet-mcp-slice1-design.md`

### ⚠️ Commit policy (repo owner's standing rule)
The repo owner requires **explicit approval before any `git commit` or `git push`**. Every "Commit" step below means: `git add` the listed files, show the diff/summary, and **PAUSE for the owner's OK before running `git commit`**. `git init` (local, no commit) is fine without asking.

### Repo note
This is a **standalone repo** (not a worktree of ToolJet). For the original local slice, the ToolJet stack runs with backend :3000, frontend :8082, Postgres, and PostgREST.

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json`, `tsconfig.json`, `vitest.config.ts` | Project + TS + test config |
| `.env.example`, `.gitignore`, `README.md` | Config template, ignores, install/run docs |
| `docs/contracts.md` | Confirmed ToolJet endpoint contracts (output of Task 1) |
| `src/config.ts` | Load + validate env (`TOOLJET_URL`, `TOOLJET_APP_URL`, `TOOLJET_EMAIL`, `TOOLJET_PASSWORD`) |
| `src/auth.ts` | Login, hold session cookie, `authedFetch()` with one 401-retry |
| `src/tooljetClient.ts` | Typed methods: `login`, `listDatasources`, `createApp`, `getApp`, `createQuery`, `createComponent`, `updateComponent` |
| `src/catalog.ts` | Static component catalog (Table, Text) for `get_component_catalog` |
| `src/tools/index.ts` | Register all tools with the MCP server |
| `src/tools/listDatasources.ts` … `addComponent.ts` | One file per tool: zod schema → client call → MCP result/error |
| `src/server.ts` | Build MCP server, attach tools, connect stdio transport |
| `src/index.ts` | Entry point (`#!/usr/bin/env node`) |
| `scripts/seed-tickets.md` | Documented one-time seed procedure (ToolJet-DB path) |
| `skill/SKILL.md` | Knowledge shipped to Codex |
| `tests/*.test.ts` | Unit tests (mocked `fetch`/client) per module |

Tools all follow **one pattern** (zod input → `tooljetClient` method → `{ content: [{type:'text', text: JSON}] }` result, errors mapped to MCP errors). Task 6 implements one fully as the template, then the rest by the same shape.

---

## Task 0: Scaffold the repo

**Files:** Create `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.env.example`

- [ ] **Step 1: Init repo + Node project**

```bash
cd /path/to/tooljet-mcp
git init
npm init -y
```

- [ ] **Step 2: Install deps**

```bash
npm i @modelcontextprotocol/sdk zod
npm i -D typescript tsx vitest @types/node
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": false
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['tests/**/*.test.ts'] } });
```

- [ ] **Step 5: Write `.gitignore` and `.env.example`**

`.gitignore`:
```
node_modules
dist
.env
```
`.env.example`:
```
TOOLJET_URL=http://localhost:3000
TOOLJET_APP_URL=http://localhost:8082
TOOLJET_EMAIL=developer@example.com
TOOLJET_PASSWORD=change-me
```

- [ ] **Step 6: Add npm scripts** to `package.json`: `"build": "tsc"`, `"dev": "tsx src/index.ts"`, `"test": "vitest run"`, and `"type": "module"`.

- [ ] **Step 7: Commit** (per commit policy — pause for approval)

```bash
git add -A && git commit -m "chore: scaffold tooljet-mcp project"
```

---

## Task 1: Confirm ToolJet endpoint contracts (investigation)

No code — read the ToolJet source and record exact paths, request bodies, and response shapes into `docs/contracts.md`. This de-risks every later task.

**Files:** Create `docs/contracts.md`

- [ ] **Step 1: Login contract** — read `server/src/modules/auth/controller.ts` + the DTO for `POST /api/authenticate`. Record: request body fields, the response (does it set `Set-Cookie: tj_auth_token=...`? what org/workspace fields are in the body?).

- [ ] **Step 2: Datasource list contract** — find the endpoint that lists global datasources (grep `data-sources` controllers). Record path + how to identify the ToolJet-DB datasource (its `kind`, e.g. `tooljetdb`) and its `id`.

- [ ] **Step 3: App create/get contract** — read the `apps` controller. Record the create endpoint (does it auto-create a first version + home page? what does it return — `id`, `versionId`, page ids?) and the get endpoint used to retrieve version/page ids if not returned by create.

- [ ] **Step 4: Query create contract** — read `server/src/modules/data-queries/controller.ts` + `CreateDataQueryDto`. Record: path (`POST /api/data-queries`?), body (`kind`, `name`, `options`, `app_version_id`, `data_source_id`?), and the exact ToolJet-DB `options` shape for "list rows" (operation + table name). Cross-check with `server/ee/data-queries` if EE overrides.

- [ ] **Step 5: Component create/update contract** — read `server/src/modules/versions/controllers/components.controller.ts` + `CreateComponentDto` / `UpdateComponentDto` / `LayoutUpdateDto`. Record: the `:id` and `:versionId` path params, the component body (type, properties, styles, general, parent), and how layout (top/left/width/height per resolution) is sent (inline vs `/layout`).

- [ ] **Step 6: Table + Text component shape** — from the ToolJet frontend widget definitions (or an exported sample app), record the exact `properties` keys for `Table` (esp. the `data` property that takes `{{queries.X.data}}`) and `Text`. Record a known-good minimal Table definition.

- [ ] **Step 7: Write `docs/contracts.md`** capturing all of the above as concrete request/response examples. This file is the source of truth for Tasks 3–6.

- [ ] **Step 8: Commit** (pause for approval) — `docs: record confirmed ToolJet endpoint contracts`

---

## Task 2: `src/config.ts`

**Files:** Create `src/config.ts`, `tests/config.test.ts`

- [ ] **Step 1: Write failing test** (`tests/config.test.ts`)

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  beforeEach(() => { for (const k of ['TOOLJET_URL','TOOLJET_APP_URL','TOOLJET_EMAIL','TOOLJET_PASSWORD']) delete process.env[k]; });

  it('applies defaults for URLs and reads creds', () => {
    process.env.TOOLJET_EMAIL = 'a@b.com';
    process.env.TOOLJET_PASSWORD = 'pw';
    const c = loadConfig();
    expect(c.apiUrl).toBe('http://localhost:3000');
    expect(c.appUrl).toBe('http://localhost:8082');
    expect(c.email).toBe('a@b.com');
  });

  it('throws when creds missing', () => {
    expect(() => loadConfig()).toThrow(/TOOLJET_EMAIL/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** `npx vitest run tests/config.test.ts` (module not found).

- [ ] **Step 3: Implement `src/config.ts`**

```ts
export interface Config { apiUrl: string; appUrl: string; email: string; password: string; }

export function loadConfig(): Config {
  const email = process.env.TOOLJET_EMAIL;
  const password = process.env.TOOLJET_PASSWORD;
  if (!email) throw new Error('TOOLJET_EMAIL is required');
  if (!password) throw new Error('TOOLJET_PASSWORD is required');
  return {
    apiUrl: process.env.TOOLJET_URL ?? 'http://localhost:3000',
    appUrl: process.env.TOOLJET_APP_URL ?? 'http://localhost:8082',
    email,
    password,
  };
}
```

- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** (pause) — `feat: config loader with URL defaults`

---

## Task 3: `src/auth.ts`

Login → capture `tj_auth_token` cookie → `authedFetch()` that attaches it and retries once on 401. Uses the login contract from `docs/contracts.md`.

**Files:** Create `src/auth.ts`, `tests/auth.test.ts`

- [ ] **Step 1: Write failing tests** — with a mocked `fetch`, assert: (a) first `authedFetch` triggers a login POST to `${apiUrl}/api/authenticate` with email/password; (b) the captured cookie is sent on the subsequent request as a `Cookie` header; (c) a 401 response triggers exactly one re-login + retry; (d) a second 401 throws.

```ts
import { describe, it, expect, vi } from 'vitest';
import { createAuth } from '../src/auth.js';

const cfg = { apiUrl: 'http://tj', appUrl: 'http://app', email: 'a@b.com', password: 'pw' };

function res(status: number, body: any, cookie?: string) {
  return { status, ok: status < 400, headers: { get: (h: string) => (h.toLowerCase()==='set-cookie' && cookie) ? cookie : null }, json: async () => body, text: async () => JSON.stringify(body) } as any;
}

it('logs in then attaches cookie', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(res(201, { organization_id: 'org1' }, 'tj_auth_token=TOKEN; Path=/; HttpOnly'))
    .mockResolvedValueOnce(res(200, { ok: true }));
  const auth = createAuth(cfg, fetchMock);
  await auth.authedFetch('/api/apps', { method: 'GET' });
  expect(fetchMock.mock.calls[0][0]).toContain('/api/authenticate');
  const secondInit = fetchMock.mock.calls[1][1];
  expect(secondInit.headers['Cookie']).toContain('tj_auth_token=TOKEN');
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement `src/auth.ts`** — `createAuth(config, fetchImpl = fetch)` returning `{ authedFetch(path, init) }`. Internal `login()` posts creds, parses `Set-Cookie` for `tj_auth_token`, stores it. `authedFetch` ensures logged in, adds `Cookie` header, and on 401 clears the token, re-logs-in once, retries; second 401 throws with the response body text. (Fill exact field names from `docs/contracts.md`.)
  - **⚠️ Cookie capture gotcha:** Node's global `fetch` (undici) does NOT return all `Set-Cookie` values via `headers.get('set-cookie')` — use **`headers.getSetCookie()`** (array) and scan it for `tj_auth_token`. The unit-test mock uses a single-string `headers.get` shim, so it will pass regardless — do NOT rely on it to catch this. Add a real-backend smoke step: after implementing, run a throwaway script that logs in against the live ToolJet and asserts a non-empty `tj_auth_token` was captured.

- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** (pause) — `feat: session auth with cookie reuse and 401 retry`

---

## Task 4: `src/tooljetClient.ts`

Typed methods, one per endpoint, each calling `auth.authedFetch`. Bodies/paths per `docs/contracts.md`.

**Files:** Create `src/tooljetClient.ts`, `tests/tooljetClient.test.ts`

- [ ] **Step 1: Write failing tests** — with a mock `authedFetch`, assert each method calls the right method+path+body and maps the response. Cover `listDatasources`, `createApp`, `createQuery`, `createComponent`. Example:

```ts
it('createApp posts name and returns ids', async () => {
  const authedFetch = vi.fn().mockResolvedValue(res(201, { id: 'app1', editing_version: { id: 'v1' }, pages: [{ id: 'p1', name: 'Home' }] }));
  const client = createClient({ authedFetch } as any, cfg);
  const out = await client.createApp('Tickets');
  expect(authedFetch).toHaveBeenCalledWith(expect.stringContaining('/apps'), expect.objectContaining({ method: 'POST' }));
  expect(out.app_id).toBe('app1'); expect(out.version_id).toBe('v1'); expect(out.home_page_id).toBe('p1');
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement `src/tooljetClient.ts`** — `createClient(auth, config)` exposing the 7 methods. `createApp` also composes `app_url = ${config.appUrl}/apps/${app_id}` (per spec §4 URL rule). Each method uses the exact contract from Task 1. Throw a clear error including response text on non-2xx.
  - **`createApp` home-page id fallback:** Task 1 Step 3 may reveal the app-create response does NOT include the home-page id. If so, `createApp` must make an internal follow-up `getApp(app_id)` call to read `version_id` + `home_page_id` before returning. Implement this fallback (and cover it with a test where create returns no `pages`) so `home_page_id` is always populated.

- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** (pause) — `feat: typed ToolJet client for slice-1 endpoints`

---

## Task 5: `src/catalog.ts`

**Files:** Create `src/catalog.ts`, `tests/catalog.test.ts`

- [ ] **Step 1: Failing test** — `getCatalog()` returns entries for `Table` and `Text`, and the `Table` entry documents the `data` binding property.

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement** — a static array `[{ type: 'Table', description, properties: [{ name: 'data', binds: true, example: '{{queries.<name>.data}}' }, ...] }, { type: 'Text', ... }]`, populated from `docs/contracts.md` Step 6.

- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** (pause) — `feat: static component catalog (Table, Text)`

---

## Task 6: MCP tools

Implement the 6 tools. Do **`createApp` fully as the template**, then the rest to the same shape.

**Files:** Create `src/tools/createApp.ts` (+ `tests/tools.createApp.test.ts`), then `listDatasources.ts`, `getComponentCatalog.ts`, `getApp.ts`, `addQuery.ts`, `addComponent.ts`, and `src/tools/index.ts`.

- [ ] **Step 1: Failing test for `createApp` tool** — given a mock client, calling the tool handler with `{ name: 'Tickets' }` returns an MCP text result containing `app_id`/`version_id`/`app_url`, and a client error is returned as an MCP error (not thrown uncaught).

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement `createApp` tool (template)**

```ts
import { z } from 'zod';
export const createAppTool = (client) => ({
  name: 'create_app',
  description: 'Create a new ToolJet app with a first version and home page. Returns ids needed by other tools and the app URL.',
  inputSchema: { name: z.string().min(1) },
  handler: async ({ name }: { name: string }) => {
    const r = await client.createApp(name);
    return { content: [{ type: 'text', text: JSON.stringify(r) }] };
  },
});
```

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Implement remaining 5 tools** to the same shape, with these schemas:
  - `list_datasources` — no input → `client.listDatasources()`
  - `get_component_catalog` — no input → `getCatalog()`
  - `get_app` — `{ app_id: string }` → `client.getApp(app_id)`
  - `add_query` — `{ app_id, version_id, datasource_id, name, options: z.record(z.any()) }` → `client.createQuery(...)` (defaults `run_on_page_load: true`)
  - `add_component` — `{ app_id, version_id, page_id, type: z.string(), properties: z.record(z.any()), layout: z.object({ top: z.number(), left: z.number(), width: z.number(), height: z.number() }) }` → `client.createComponent(...)`
    - **Binding-at-create check:** confirm during Task 11 that a Table created with `properties.data = "{{queries.<name>.data}}"` actually renders bound data from the create call alone. If ToolJet requires the binding via a separate `PUT …/components` (update) call, add a thin `update_component` tool (the client method already exists) and have the skill call it after `add_component`. Prefer create-only if it works.

- [ ] **Step 6: Write `src/tools/index.ts`** — export `registerTools(server, client)` iterating the tool factories and calling `server.registerTool` (or SDK equivalent) with schema + handler, wrapping handler errors into MCP error results.

- [ ] **Step 7: Add a test per tool** (same pattern as Step 1) and run all — expect PASS.
- [ ] **Step 8: Commit** (pause) — `feat: 6 MCP tools over the ToolJet client`

---

## Task 7: `src/server.ts` + `src/index.ts`

**Files:** Create `src/server.ts`, `src/index.ts`

- [ ] **Step 1: Implement `server.ts`** — `buildServer()` creates an `McpServer`, loads config, builds auth + client, calls `registerTools`. Export it.

- [ ] **Step 2: Implement `src/index.ts`** — `#!/usr/bin/env node`; build server, connect `StdioServerTransport`, `await server.connect(transport)`.

- [ ] **Step 3: Smoke test** — `npm run build` succeeds; `node dist/index.js` starts and stays alive on stdio (manual: send an MCP `initialize`/`tools/list` via the MCP Inspector or a scripted client; expect the 6 tools listed).

- [ ] **Step 4: Commit** (pause) — `feat: MCP stdio server entrypoint`

---

## Task 8: Seed procedure

**Files:** Create `scripts/seed-tickets.md`

- [ ] **Step 1:** Document the exact steps to create a `tickets` ToolJet-DB table (columns: id, subject, priority, status, assignee) via ToolJet's ToolJet-DB creation path (UI or tjdb API, whichever Task 1 confirmed is scriptable) and insert ~10 sample rows. Include a verification query.
- [ ] **Step 2:** Run it once against the local instance; confirm the table + rows exist and the datasource lists it.
- [ ] **Step 3: Commit** (pause) — `docs: tickets seed procedure`

---

## Task 9: `skill/SKILL.md`

**Files:** Create `skill/SKILL.md`

- [ ] **Step 1:** Write the skill per spec §8: frontmatter (`name: tooljet-app-builder`, `description`), the app model, the slice-1 recipe (`list_datasources → create_app → add_query → add_component(Table bound to {{queries.<name>.data}})`), the known-good Table example from `docs/contracts.md`, and the verification instruction (open `app_url`).
- [ ] **Step 2: Commit** (pause) — `feat: bundled Codex skill for ToolJet app building`

---

## Task 10: README + Codex install

**Files:** Create `README.md`

- [ ] **Step 1:** Document: prerequisites (ToolJet running), `.env` setup, `npm i && npm run build`, the Codex MCP config entry (stdio command `node /abs/path/dist/index.js` with env), and how to install the skill for Codex. Include the demo prompt.
- [ ] **Step 2: Commit** (pause) — `docs: README with Codex install + demo`

---

## Task 11: End-to-end verification (the real test)

- [ ] **Step 1:** Ensure ToolJet stack is up and the `tickets` table is seeded (Task 8).
- [ ] **Step 2:** Register the MCP server in Codex; confirm `tools/list` shows the 6 tools and the skill loads.
- [ ] **Step 3:** In Codex, prompt: *"Build me a tickets dashboard on my ToolJet DB."*
- [ ] **Step 4:** Confirm Codex calls `list_datasources → create_app → add_query → add_component` and returns an `app_url`.
- [ ] **Step 5:** Open the `app_url` (`:8082`) — verify the Table renders the seeded `tickets` rows.
- [ ] **Step 6:** Verify governance: the new `apps`/`data_queries`/`components` rows exist in Postgres and were created via the API (not direct SQL) — spot-check timestamps/ownership.
- [ ] **Step 7:** Record the result (and any contract corrections) in `docs/contracts.md`; note follow-ups for slice 2 (browser loop, ServiceNow).
- [ ] **Step 8: Commit** (pause) — `test: end-to-end slice-1 verification notes`

---

## Definition of Done
- `npm run test` green; `npm run build` clean.
- Task 11 reproduces from a clean Codex prompt: seeded rows render in a Codex-built app, all writes through the governed API.
- README documents install; SKILL.md drives Codex; contracts.md records the real endpoint shapes.
