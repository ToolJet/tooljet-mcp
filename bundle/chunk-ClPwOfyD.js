import { createRequire } from "node:module";
import { i as fail, o as ok, u as assessQueryRead, x as resolvedReadRefusal, y as resolveStaticBindings, z as sqlConnectorPath, G as GUI_LIST_ROWS_KEYS, A as applyResolvedBindings, B as connectorLabel, S as SQL_DIALECT } from "./chunk-sf3XXkm1.js";
import { ax as external_exports } from "./chunk-Dakrk_ob.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, statSync, readdirSync, renameSync, lstatSync, realpathSync, utimesSync, openSync, closeSync, mkdtempSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, relative, sep, dirname, resolve, basename, isAbsolute } from "node:path";
import { createServer, request } from "node:http";
import { Http2ServerRequest, constants } from "node:http2";
import { Readable } from "node:stream";
import { lookup } from "node:dns/promises";
import { BlockList, isIP, connect } from "node:net";
createRequire(import.meta.url);
var positive = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};
var MAX_SLOT_AGE_MS = 10 * 6e4;
var POLL_MS = 250;
var alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === "EPERM";
  }
};
var stale = (file) => {
  try {
    if (Date.now() - statSync(file).mtimeMs > MAX_SLOT_AGE_MS)
      return true;
    return !alive(Number(readFileSync(file, "utf8")));
  } catch {
    return false;
  }
};
var take = (dir, prefix, limit) => {
  for (let i = 0; i < limit; i++) {
    const file = join(dir, `${prefix}-${i}`);
    if (existsSync(file) && stale(file))
      rmSync(file, { force: true });
    try {
      const fd = openSync(file, "wx");
      writeFileSync(fd, String(process.pid));
      closeSync(fd);
      return file;
    } catch {
    }
  }
  return void 0;
};
var BuildCapacityError = class extends Error {
};
async function withBuildSlot(root2, workspaceId, work) {
  const dir = join(root2, ".slots");
  mkdirSync(dir, { recursive: true });
  const globalLimit = positive("MCP_CODE_BUILD_MAX_GLOBAL", 6);
  const workspaceLimit = positive("MCP_CODE_BUILD_MAX_WORKSPACE", 3);
  const deadline = Date.now() + positive("MCP_CODE_BUILD_WAIT_MS", 18e4);
  const release = [];
  try {
    for (; ; ) {
      const mine = take(dir, `ws-${workspaceId}`, workspaceLimit);
      const shared = mine && take(dir, "global", globalLimit);
      if (mine && shared) {
        release.push(mine, shared);
        break;
      }
      if (mine)
        rmSync(mine, { force: true });
      if (Date.now() >= deadline)
        throw new BuildCapacityError("Too many builds are running on this server right now. Try again in a minute.");
      await new Promise((resolve3) => setTimeout(resolve3, POLL_MS));
    }
    return await work();
  } finally {
    for (const file of release)
      rmSync(file, { force: true });
  }
}
var LAST_USED = ".tooljet-last-used";
var CLEAN_MARKER = ".last-cleanup";
var HOME_PREFIX = "tj-code-home-";
function touchProject(dir) {
  const file = join(dir, LAST_USED);
  const now = /* @__PURE__ */ new Date();
  try {
    utimesSync(file, now, now);
  } catch {
    try {
      writeFileSync(file, "");
    } catch {
    }
  }
}
var lastUsed = (dir) => {
  for (const name of [LAST_USED, "app.json"]) {
    try {
      return statSync(join(dir, name)).mtimeMs;
    } catch {
    }
  }
  return statSync(dir).mtimeMs;
};
function cleanOldProjects(root2) {
  const days = Number(process.env.MCP_CODE_PROJECT_TTL_DAYS ?? 14);
  if (!(days > 0) || !existsSync(root2))
    return;
  const marker = join(root2, CLEAN_MARKER);
  try {
    if (Date.now() - statSync(marker).mtimeMs < 36e5)
      return;
  } catch {
  }
  writeFileSync(marker, "");
  const oldest = Date.now() - days * 864e5;
  const isProject = (dir) => existsSync(join(dir, "app.json"));
  const projects = (dir, depth) => {
    if (isProject(dir))
      return [dir];
    if (depth === 0)
      return [];
    return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".")).flatMap((e) => projects(join(dir, e.name), depth - 1));
  };
  for (const entry of readdirSync(root2, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("."))
      continue;
    const dir = join(root2, entry.name);
    for (const project of projects(dir, entry.name.startsWith("d_") ? 2 : 1)) {
      if (lastUsed(project) < oldest)
        rmSync(project, { recursive: true, force: true });
    }
  }
  for (const entry of readdirSync(tmpdir(), { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith(HOME_PREFIX))
      continue;
    const dir = join(tmpdir(), entry.name);
    if (Date.now() - statSync(dir).mtimeMs > 864e5)
      rmSync(dir, { recursive: true, force: true });
  }
}
var CLI_HOME_PREFIX = HOME_PREFIX;
var BROWSER_USER = /\{\{[^}]*?\bglobals\s*\.\s*currentUser\b/;
function browserUserBindings(options, path = []) {
  if (typeof options === "string")
    return BROWSER_USER.test(options) ? [path.join(".") || "options"] : [];
  if (Array.isArray(options))
    return options.flatMap((value, index) => browserUserBindings(value, [...path, String(index)]));
  if (options && typeof options === "object") {
    return Object.entries(options).flatMap(([key, value]) => browserUserBindings(value, [...path, key]));
  }
  return [];
}
function browserUserMessage(queryName, paths) {
  return `Query "${queryName}": ${paths.join(", ")} ${paths.length > 1 ? "read" : "reads"} {{globals.currentUser.*}}, which the viewer's browser resolves and sends with the run, so anyone can send another user's email. In a Code mode app use {{globals.server.currentUser.*}} (email, id, firstName, groups), which ToolJet resolves on the server, for own-row filters and every "who" column (requester, approver, actor).`;
}
var CODE_PAGE_TRUE = /* @__PURE__ */ new Set([true, "true", "{{true}}"]);
function isCodeModeApp(app) {
  if (app?.build_mode === "code" || app?.buildMode === "code")
    return true;
  for (const page of Array.isArray(app?.pages) ? app.pages : []) {
    for (const entry of Object.values(page?.components ?? {})) {
      if (CODE_PAGE_TRUE.has(entry?.component?.definition?.properties?.codePage?.value))
        return true;
    }
  }
  return false;
}
function browserUserQueryProblems(app) {
  const queries = Array.isArray(app?.data_queries) ? app.data_queries : [];
  return queries.flatMap((query) => {
    const paths = browserUserBindings(query?.options ?? {});
    return paths.length ? [browserUserMessage(String(query?.name ?? query?.id ?? "query"), paths)] : [];
  });
}
var TS_LINE = /^(\S+?):(\d+):(\d+) - error (TS\d+): (.*)$/;
var ESBUILD_LINE = /^(\S+?):(\d+):(\d+): ERROR: (.*)$/;
var CSS_IN_PLUGIN = /^\[plugin: [\w-]+\] (?:.*\/frontend\/)?(\S+?\.css):(\d+):(\d+): (.*)$/;
var MAX_MESSAGE = 300;
var clipText = (text, max) => text.length > max ? `${text.slice(0, max)}...` : text;
var inFrontend = (file) => file.startsWith("frontend/") ? file : `frontend/${file}`;
function fixFor(code, message) {
  if (/custom-component-sdk/.test(message) && /Cannot find module|Could not resolve/.test(message))
    return "the SDK's types are missing on this server, not in the code: never declare the module yourself; build again";
  if (/Cannot find module '\.{1,2}\/|Could not resolve "\.{1,2}\//.test(message))
    return "no such file: write it (files: [{ path, content }]) or correct the path";
  if (/Could not resolve "@tooljet\//.test(message))
    return "no such package: the SDK is @tooljet/custom-component-sdk, and data comes from ../tooljet.gen (useAppQuery)";
  if (/has no exported member|No matching export/.test(message))
    return "export that name from the file it is imported from, or import a name the file exports";
  if (code === "TS7006")
    return "give the parameter a type, or type the list it comes from (a Row type from tooljet.gen)";
  if (/'QueryError' is not assignable to type 'ReactNode'/.test(message))
    return "render error.message, not the error";
  if (/LucideIcon/.test(message))
    return "type the icon prop as LucideIcon: import type { LucideIcon } from 'lucide-react'";
  if (/\.data' is possibly 'undefined'/.test(message))
    return "data is undefined until the first run: const rows = q.data ?? []";
  if (code === "TS18047" || /'null' is not assignable/.test(message))
    return "a nullable column is T | null in its Row type: check for null, or use ?? ''";
  if (code === "TS2339" && /on type '\{|Row(\[\])?'/.test(message))
    return "not a field of this row: use only the fields its Row type in tooljet.gen lists";
  if (/has already been declared|Duplicate identifier|Cannot redeclare/.test(message))
    return "remove one of the two declarations";
  if (code === "CSS" && /Unknown word/.test(message))
    return "a stray */ or an unclosed comment or rule";
  return void 0;
}
var routeFix = (p) => !p.fix && p.code === "TS2345" && /routePath\(/.test(p.source ?? "") ? { ...p, fix: "add the route to app.json's routes (the build refreshes ROUTES), or use an id it has" } : p;
function parseBuildProblems(output) {
  const lines = output.split("\n");
  const problems = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const ts = TS_LINE.exec(line);
    if (ts) {
      const message = [ts[5]];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() && !TS_LINE.test(lines[j].trim()) && !/^\d+ /.test(lines[j].trim())) {
        message.push(lines[j].trim());
        j++;
      }
      while (j < lines.length && !lines[j].trim())
        j++;
      const code = new RegExp(`^${ts[2]} (.*)$`).exec(lines[j]?.trim() ?? "");
      problems.push({
        at: `${inFrontend(ts[1])}:${ts[2]}:${ts[3]}`,
        code: ts[4],
        message: clipText(message.slice(0, 3).join(" / "), MAX_MESSAGE),
        ...code ? { source: clipText(code[1].trim(), 160) } : {}
      });
      continue;
    }
    const es = ESBUILD_LINE.exec(line);
    if (es) {
      const css = CSS_IN_PLUGIN.exec(es[4]);
      problems.push(css ? { at: `${inFrontend(css[1])}:${css[2]}:${css[3]}`, code: "CSS", message: clipText(css[4], MAX_MESSAGE) } : { at: `${inFrontend(es[1])}:${es[2]}:${es[3]}`, code: "ESBUILD", message: clipText(es[4], MAX_MESSAGE) });
    }
  }
  return problems.map((p) => routeFix({ ...p, ...fixFor(p.code, p.message) ? { fix: fixFor(p.code, p.message) } : {} }));
}
var fromChecked = (p) => routeFix({
  at: `${inFrontend(p.file)}:${p.line}:${p.column}`,
  code: p.code,
  message: clipText(p.message.split("\n").slice(0, 3).map((l) => l.trim()).join(" / "), MAX_MESSAGE),
  ...p.source ? { source: p.source } : {},
  ...fixFor(p.code, p.message) ? { fix: fixFor(p.code, p.message) } : {}
});
function formatProblems(problems, max = 40) {
  const groups = /* @__PURE__ */ new Map();
  for (const p of problems) {
    const file = p.at.replace(/:\d+:\d+$/, "");
    const key = `${file}\0${p.code}\0${p.message}`;
    const group = groups.get(key);
    if (group)
      group.at.push(p.at.slice(file.length));
    else
      groups.set(key, { first: p, at: [p.at] });
  }
  const lines = [...groups.values()].map(({ first, at }) => [`${at.join(", ")} ${first.code} ${first.message}`, first.source && `code: ${first.source}`, first.fix && `fix: ${first.fix}`].filter(Boolean).join(" | "));
  return lines.length > max ? [...lines.slice(0, max), `... and ${lines.length - max} more`] : lines;
}
function buildSummary(output) {
  const lines = output.split("\n").map((l) => l.trimEnd());
  const keep = lines.filter((l) => /^\s*(✗|✓|⚠)/.test(l) || /Build completed in/.test(l));
  return keep.join("\n");
}
var DEFAULT_REGISTRY = "https://registry.npmjs.org/";
function realOrNearest(target) {
  let at = target;
  const rest = [];
  for (; ; ) {
    try {
      return join(realpathSync(at), ...rest.reverse());
    } catch {
      const parent = dirname(at);
      if (parent === at)
        return target;
      rest.push(at.slice(parent.length).replace(/^[\\/]+/, ""));
      at = parent;
    }
  }
}
var isInside = (base, target) => {
  const rel = relative(base, target);
  return rel === "" || !rel.startsWith("..") && !isAbsolute(rel);
};
function insideProject(dir, path, label = path) {
  const full = resolve(dir, path);
  if (!isInside(resolve(dir), full))
    throw new Error(`"${label}" is outside the project`);
  const parts = relative(resolve(dir), full).split(sep).filter(Boolean);
  let at = resolve(dir);
  for (const part of parts) {
    at = join(at, part);
    let linked = false;
    try {
      linked = lstatSync(at).isSymbolicLink();
    } catch {
      break;
    }
    if (linked)
      throw new Error(`"${label}" goes through a link (${relative(dir, at).split(sep).join("/")}), which these tools never follow`);
  }
  if (!isInside(realOrNearest(resolve(dir)), realOrNearest(full)))
    throw new Error(`"${label}" is outside the project`);
  return full;
}
function unstoredSegment(rel) {
  return rel.split("/").find((part) => part === "node_modules" || part.startsWith("."));
}
function unstoredSourceEntries(dir) {
  const found = [];
  const walk = (at) => {
    if (!existsSync(at))
      return;
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const full = join(at, entry.name);
      if (entry.name === "node_modules" || entry.name.startsWith("."))
        found.push(relative(dir, full).split(sep).join("/"));
      else if (entry.isDirectory())
        walk(full);
    }
  };
  walk(join(dir, "frontend", "src"));
  walk(join(dir, "frontend", "styles"));
  return found.sort();
}
function removeUnstoredSource(dir) {
  const found = unstoredSourceEntries(dir);
  for (const rel of found)
    rmSync(join(dir, rel), { recursive: true, force: true });
  return found;
}
var PATH_SPEC = /^(?:\.|~[\\/]|[\\/]|[a-zA-Z]:)/;
var TARBALL = /\.(?:tgz|tar\.gz|tar)$/i;
var REGISTRY_SPEC = /^[A-Za-z0-9.^~<>=*|+ -]*$/;
function nonRegistrySpec(spec) {
  if (typeof spec !== "string")
    return "it is not a version";
  const value = spec.trim();
  if (PATH_SPEC.test(value))
    return "it is a local path";
  if (TARBALL.test(value))
    return "it is a tarball file";
  if (/[:/\\#@]/.test(value))
    return "it is not a registry version (file:, link:, git, URL, GitHub, alias or workspace specs are refused)";
  if (!REGISTRY_SPEC.test(value))
    return "it is not a registry version or range";
  return void 0;
}
var DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
function configuredRegistry(env = process.env) {
  const raw = env.npm_config_registry || env.NPM_CONFIG_REGISTRY || DEFAULT_REGISTRY;
  return raw.endsWith("/") ? raw : `${raw}/`;
}
function foreignResolved(resolved, registry2 = configuredRegistry()) {
  if (typeof resolved !== "string")
    return "it has no download URL";
  let url;
  let reg;
  try {
    url = new URL(resolved);
    reg = new URL(registry2);
  } catch {
    return `it downloads from "${resolved.slice(0, 120)}", which is not a URL`;
  }
  if (url.username || url.password)
    return "its download URL carries credentials";
  const sameRegistry = url.origin === reg.origin && url.pathname.startsWith(reg.pathname);
  const publicRegistry = url.protocol === "https:" && url.host === "registry.npmjs.org";
  if (!sameRegistry && !publicRegistry)
    return `it downloads from ${url.origin}, not the configured registry (${reg.origin})`;
  if (publicRegistry)
    return void 0;
  if (url.protocol !== "https:" && reg.protocol !== url.protocol)
    return "it downloads over plain http";
  return void 0;
}
function dependencyProblems(dir, registry2 = configuredRegistry()) {
  return [...manifestProblems(dir), ...lockfileProblems(dir, registry2)];
}
function manifestProblems(dir) {
  const problems = [];
  const manifest = insideProject(dir, "frontend/package.json");
  if (!existsSync(manifest))
    return problems;
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(manifest, "utf8"));
  } catch {
    return ["frontend/package.json is not valid JSON"];
  }
  for (const field of DEPENDENCY_FIELDS) {
    const deps = pkg[field];
    if (!deps || typeof deps !== "object")
      continue;
    for (const [name, spec] of Object.entries(deps)) {
      const why = nonRegistrySpec(spec);
      if (why)
        problems.push(`frontend/package.json ${field} "${name}": "${String(spec).slice(0, 120)}": ${why}`);
    }
  }
  if (pkg.workspaces !== void 0)
    problems.push("frontend/package.json declares workspaces, which install other folders");
  for (const field of ["overrides", "resolutions"]) {
    const walk = (value, at) => {
      if (typeof value === "string") {
        const why = value.startsWith("$") ? void 0 : nonRegistrySpec(value);
        if (why)
          problems.push(`frontend/package.json ${field} ${at}: "${value.slice(0, 120)}": ${why}`);
      } else if (value && typeof value === "object") {
        for (const [key, child] of Object.entries(value))
          walk(child, at ? `${at} > ${key}` : key);
      }
    };
    walk(pkg[field], "");
  }
  return problems;
}
function lockfileProblems(dir, registry2 = configuredRegistry()) {
  const problems = [];
  for (const name of ["package-lock.json", "npm-shrinkwrap.json"]) {
    const file = insideProject(dir, `frontend/${name}`);
    if (!existsSync(file))
      continue;
    let lock;
    try {
      lock = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      problems.push(`frontend/${name} is not valid JSON`);
      continue;
    }
    for (const [key, entry] of Object.entries(lock.packages ?? {})) {
      if (key === "")
        continue;
      if (!/^node_modules\/(?:@[^/]+\/)?[^/]+(?:\/node_modules\/(?:@[^/]+\/)?[^/]+)*$/.test(key)) {
        problems.push(`frontend/${name} entry "${key.slice(0, 120)}" is not an installed package (a linked folder)`);
        continue;
      }
      if (entry?.link) {
        problems.push(`frontend/${name} entry "${key.slice(0, 120)}" is a link to a folder`);
        continue;
      }
      const why = entry?.resolved === void 0 ? void 0 : foreignResolved(entry.resolved, registry2);
      if (why)
        problems.push(`frontend/${name} entry "${key.slice(0, 120)}": ${why}`);
    }
    const walkV1 = (deps, at) => {
      for (const [dep, entry] of Object.entries(deps ?? {})) {
        const where = at ? `${at} > ${dep}` : dep;
        const version = typeof entry?.version === "string" ? entry.version : "";
        if (/^(file|link|git|github|http|https):|^\.|\//.test(version))
          problems.push(`frontend/${name} dependency "${where}" is "${version.slice(0, 120)}", not a registry package`);
        else if (entry?.resolved !== void 0) {
          const why = foreignResolved(entry.resolved, registry2);
          if (why)
            problems.push(`frontend/${name} dependency "${where}": ${why}`);
        }
        walkV1(entry?.dependencies, where);
      }
    };
    if (!lock.packages)
      walkV1(lock.dependencies, "");
  }
  return [...new Set(problems)];
}
function dependencyRefusal(dir, what) {
  const problems = dependencyProblems(dir);
  if (!problems.length)
    return void 0;
  return new Error(`${what} was refused: the app's dependencies must all be registry packages from the configured registry.
` + problems.slice(0, 20).map((p) => `- ${p}`).join("\n") + (problems.length > 20 ? `
- and ${problems.length - 20} more` : "") + "\nRemove these packages with code_app_add_dependency (remove), or pin each to a registry version.");
}
function escapingLinks(dir) {
  const modules = join(dir, "frontend", "node_modules");
  if (!existsSync(modules))
    return [];
  let base;
  try {
    base = realpathSync(dir);
  } catch {
    return [];
  }
  const sdk = (process.env.TOOLJET_SDK_SPEC ?? "").replace(/^file:/, "");
  let sdkReal;
  try {
    sdkReal = sdk ? realpathSync(sdk) : void 0;
  } catch {
    sdkReal = void 0;
  }
  const out = [];
  const check = (full) => {
    let link = false;
    try {
      link = lstatSync(full).isSymbolicLink();
    } catch {
      return;
    }
    if (!link)
      return;
    let target;
    try {
      target = realpathSync(full);
    } catch {
      return;
    }
    if (isInside(base, target) || sdkReal && target === sdkReal)
      return;
    out.push(relative(dir, full).split(sep).join("/"));
  };
  for (const entry of readdirSync(modules, { withFileTypes: true })) {
    const full = join(modules, entry.name);
    if (entry.name.startsWith("@") && entry.isDirectory()) {
      for (const child of readdirSync(full))
        check(join(full, child));
    } else {
      check(full);
    }
  }
  return out.sort();
}
function removeEscapingLinks(dir) {
  const links = escapingLinks(dir);
  if (!links.length)
    return void 0;
  for (const rel of links)
    rmSync(join(dir, rel), { force: true });
  return new Error(`The install linked ${links.join(", ")} to a folder outside the project; ${links.length > 1 ? "those links were" : "that link was"} removed. Only registry packages may be installed.`);
}
var WRITES_MARKER = join(".tooljet", "agent-writes.json");
function markAgentWrites(dir) {
  try {
    mkdirSync(join(dir, ".tooljet"), { recursive: true });
    writeFileSync(join(dir, WRITES_MARKER), JSON.stringify({ at: (/* @__PURE__ */ new Date()).toISOString(), pid: process.pid }) + "\n");
  } catch {
  }
}
var hasAgentWrites = (dir) => {
  const ttl = Number(process.env.MCP_CODE_WRITES_MARKER_TTL_MS ?? 6 * 36e5);
  const at = statSync(join(dir, WRITES_MARKER), { throwIfNoEntry: false })?.mtimeMs;
  return at !== void 0 && (!(ttl > 0) || Date.now() - at < ttl);
};
function clearAgentWrites(dir) {
  rmSync(join(dir, WRITES_MARKER), { force: true });
}
function beforePullCopies(dir) {
  const folder = join(dir, ".tooljet", "before-pull");
  if (!existsSync(folder))
    return [];
  return readdirSync(folder, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => ({ name: entry.name, at: statSync(join(folder, entry.name)).mtimeMs })).sort((a, b) => b.at - a.at || (a.name < b.name ? 1 : -1)).map((entry) => `.tooljet/before-pull/${entry.name}`);
}
function pruneBeforePull(dir, keep = 3) {
  const copies = beforePullCopies(dir);
  for (const old of copies.slice(keep))
    rmSync(join(dir, old), { recursive: true, force: true });
  return copies.slice(0, keep);
}
var alive2 = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
};
var ProjectBusyError = class extends Error {
};
async function withProjectLock(lock, work, { waitMs, pollMs = 100 } = {}) {
  const wait = waitMs ?? Number(process.env.MCP_CODE_PROJECT_LOCK_WAIT_MS ?? 6e5);
  const stale2 = Number(process.env.MCP_CODE_PROJECT_LOCK_STALE_MS ?? 18e5);
  const deadline = Date.now() + wait;
  mkdirSync(dirname(lock), { recursive: true });
  const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  for (; ; ) {
    try {
      mkdirSync(lock);
      writeFileSync(join(lock, "owner"), JSON.stringify({ pid: process.pid, at: Date.now(), token }));
      break;
    } catch (error) {
      if (error.code !== "EEXIST")
        throw error;
      let owner = {};
      try {
        owner = JSON.parse(readFileSync(join(lock, "owner"), "utf8"));
      } catch {
        owner = { at: statSync(lock, { throwIfNoEntry: false })?.mtimeMs };
      }
      const gone = owner.pid !== void 0 && owner.pid !== process.pid && !alive2(owner.pid) || owner.at !== void 0 && Date.now() - owner.at > stale2;
      if (gone) {
        rmSync(lock, { recursive: true, force: true });
        continue;
      }
      if (Date.now() >= deadline) {
        throw new ProjectBusyError("Another build is working on this app's code right now, so nothing was done. Try again in a minute.");
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
  }
  try {
    return await work();
  } finally {
    try {
      const owner = JSON.parse(readFileSync(join(lock, "owner"), "utf8"));
      if (owner.token === token)
        rmSync(lock, { recursive: true, force: true });
    } catch {
    }
  }
}
var run = promisify(execFile);
var USER_WORDS = ` Talk to the user about "the app's code" and its versions (v1, v2): one version line, as for any app. Never say code version, revision, publishing code, bundle, library, manifest, root component, dev track or pin, and never show internal names, ids or paths.`;
var noCodeIdentity = (client) => ({
  client,
  workspaceId: async () => "",
  apiUrl: "",
  appUrl: ""
});
var scope = new AsyncLocalStorage();
var current = () => {
  const active = scope.getStore();
  if (!active)
    throw new Error("Code tools need a request identity");
  return active;
};
var SAFE_WORKSPACE = /^[A-Za-z0-9-]{1,64}$/;
var deploymentKey = (apiUrl) => {
  let url;
  try {
    url = new URL(apiUrl);
  } catch {
    throw new Error("This request names no valid ToolJet backend.");
  }
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("This request names no valid ToolJet backend.");
  const canonical = `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, "")}`;
  return `d_${createHash("sha256").update(canonical).digest("hex").slice(0, 24)}`;
};
var inScope = (context, handler) => async (args) => {
  try {
    if (!context.credential?.sessionToken && !context.credential?.pat)
      throw new Error("Code tools act for a signed-in user, and this request names none.");
    const deployment = deploymentKey(context.apiUrl);
    const workspace = await context.workspaceId();
    if (!SAFE_WORKSPACE.test(workspace))
      throw new Error("This request has no valid workspace.");
    return await scope.run({ ...context, workspace, deployment, authorized: authorizedFor(context) }, () => handler(args));
  } catch (err) {
    return fail(err);
  }
};
var grantTtlMs = () => {
  const ttl = Number(process.env.MCP_CODE_APP_AUTH_TTL_MS ?? 3e4);
  return Number.isFinite(ttl) && ttl >= 0 ? ttl : 3e4;
};
var authorizations = /* @__PURE__ */ new WeakMap();
var authorizedFor = (context) => {
  const known = authorizations.get(context) ?? /* @__PURE__ */ new Map();
  authorizations.set(context, known);
  return known;
};
var authorizeApp = async (appId, need) => {
  const active = current();
  const key = `${active.deployment}\0${active.workspace}\0${appId}`;
  const known = active.authorized.get(key);
  if (known && Date.now() - known.at < grantTtlMs() && known[need])
    return;
  active.authorized.delete(key);
  let app;
  try {
    app = await active.client.getApp(appId);
  } catch {
    throw new Error(`App ${appId} was not found in this workspace.`);
  }
  const owner = app?.organizationId ?? app?.organization_id;
  if (!owner || owner !== active.workspace)
    throw new Error(`App ${appId} was not found in this workspace.`);
  const versionId = app?.editing_version?.id ?? app?.editingVersion?.id;
  let access;
  try {
    if (!versionId)
      throw new Error("no version");
    access = await active.client.codeSourceAccess(appId, versionId);
  } catch {
    throw new Error(need === "edit" ? `ToolJet could not confirm that you can edit app ${appId}, so nothing was changed.` : `ToolJet could not confirm that you can read app ${appId}'s code, so nothing was read.`);
  }
  const grant = { read: access.read, edit: access.read && access.write, at: Date.now() };
  active.authorized.set(key, grant);
  if (need === "edit" && !grant.edit) {
    throw new Error(grant.read ? `You can view app ${appId} but not edit it, so its code cannot be changed, built or installed here.` : `You can view app ${appId} but not edit it or read its code, so its code cannot be changed, built or installed here.`);
  }
  if (need === "read" && !grant.read)
    throw new Error(`You can use app ${appId} but ToolJet does not let you read its code.`);
};
var baseRoot = () => resolve(process.env.TOOLJET_CODE_APP_ROOT || join(homedir(), "tooljet-code-apps"));
var root = () => join(baseRoot(), current().deployment, current().workspace);
var legacyFolders = () => {
  const owner = process.env.MCP_CODE_LEGACY_DEPLOYMENT_URL || process.env.TOOLJET_URL || process.env.TOOLJET_DEPLOYMENT_URL || process.env.TOOLJET_APP_URL || "http://localhost:3000";
  try {
    if (deploymentKey(owner) !== current().deployment)
      return [];
  } catch {
    return [];
  }
  return [join(baseRoot(), current().workspace), baseRoot()];
};
var NAME = /^[a-z][a-z0-9-]{1,40}$/;
var projectDir = (name) => {
  if (!NAME.test(name))
    throw new Error(`name must match ${NAME} (lowercase letters, digits, hyphens)`);
  return join(root(), name);
};
var appIdOf = (dir) => {
  try {
    return JSON.parse(readFileSync(join(dir, "app.json"), "utf8")).appId;
  } catch {
    return void 0;
  }
};
var projectsIn = (folder, appId) => {
  if (!existsSync(folder))
    return [];
  return readdirSync(folder, { withFileTypes: true }).filter((entry) => entry.isDirectory() && NAME.test(entry.name) && appIdOf(join(folder, entry.name)) === appId).map((entry) => entry.name).sort((a, b) => statSync(join(folder, b, "app.json")).mtimeMs - statSync(join(folder, a, "app.json")).mtimeMs);
};
var projectsForApp = (appId) => {
  for (const folder of legacyFolders()) {
    for (const name of projectsIn(folder, appId)) {
      mkdirSync(root(), { recursive: true });
      if (!existsSync(join(root(), name)))
        renameSync(join(folder, name), join(root(), name));
    }
  }
  return projectsIn(root(), appId);
};
var APP_ID = external_exports.string().uuid().optional().describe("The app's id: finds its project, so you never have to know the folder name");
var PROJECT_NAME = external_exports.string().regex(NAME).optional().describe("The project folder, when you know it; app_id is enough");
var locateProject = async (args, need) => {
  let dir;
  if (args.app_id) {
    await authorizeApp(args.app_id, need);
    const [found] = projectsForApp(args.app_id);
    if (!found)
      throw new Error(`no Code mode project for app ${args.app_id}; call code_app_scaffold with this app_id`);
    dir = join(root(), found);
  } else {
    if (!args.name)
      throw new Error("give app_id (or the project name)");
    dir = projectDir(args.name);
    const legacy = existsSync(join(dir, "app.json")) ? void 0 : legacyFolders().map((folder) => join(folder, args.name)).find((candidate) => existsSync(join(candidate, "app.json")));
    const owner = appIdOf(legacy ?? dir);
    if (!owner)
      throw new Error(`no app project "${args.name}"; call code_app_scaffold first`);
    await authorizeApp(owner, need);
    if (legacy) {
      mkdirSync(root(), { recursive: true });
      renameSync(legacy, dir);
    }
  }
  touchProject(dir);
  return dir;
};
var projectLockPath = (dir) => join(baseRoot(), ".locks", `${current().deployment}.${current().workspace}.${basename(dir)}`);
var onProject = (dir, work) => withProjectLock(projectLockPath(dir), work);
var STYLE_FILES = /* @__PURE__ */ new Set(["frontend/styles/theme.css", "frontend/styles/global.css"]);
var editable = (dir, path) => {
  const full = resolve(dir, path);
  const rel = relative(dir, full).split(sep).join("/");
  if (!(rel === "app.json" || STYLE_FILES.has(rel) || rel.startsWith("frontend/src/") && !rel.endsWith("tooljet.gen.ts"))) {
    throw new Error(`"${path}" is not editable: write app.json, frontend/styles/theme.css, frontend/styles/global.css or files under frontend/src/ (tooljet.gen.ts is generated)`);
  }
  const unstored = unstoredSegment(rel.slice("frontend/".length));
  if (rel.startsWith("frontend/") && unstored) {
    throw new Error(unstored === "node_modules" ? `"${path}" is not editable: nothing may be written under a node_modules folder (add packages with code_app_add_dependency)` : `"${path}" is not editable: files and folders whose names start with a dot are never stored with the app`);
  }
  return insideProject(dir, rel, path);
};
var TEXT = /\.(tsx?|jsx?|json|css|md)$/i;
var listFiles = (dir, base = dir, out = []) => {
  if (!existsSync(dir))
    return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist"].includes(entry.name) || entry.name.startsWith("."))
      continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory())
      listFiles(full, base, out);
    else if (entry.isFile() && TEXT.test(entry.name) && entry.name !== "package-lock.json")
      out.push(relative(base, full).split(sep).join("/"));
  }
  return out.sort();
};
var strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
var HOST_ENV = [
  "PATH",
  "TMPDIR",
  "TEMP",
  "TMP",
  "LANG",
  "LC_ALL",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NO_PROXY",
  "http_proxy",
  "https_proxy",
  "no_proxy",
  "NODE_EXTRA_CA_CERTS",
  "SSL_CERT_FILE",
  "SSL_CERT_DIR",
  "TOOLJET_SDK_SPEC",
  "TOOLJET_APP_SCANNER_BIN"
];
var SECRET_NAME = /TOKEN|SECRET|PASSWORD|PASSWD|KEY|PAT$|CREDENTIAL|COOKIE/i;
var operatorEnv = () => (process.env.MCP_CODE_CLI_ENV_PASS ?? "").split(",").map((name) => name.trim()).filter((name) => name && !SECRET_NAME.test(name));
var cliHome;
var buildHome = () => cliHome ??= mkdtempSync(join(tmpdir(), CLI_HOME_PREFIX));
process.once("exit", () => {
  if (cliHome)
    rmSync(cliHome, { recursive: true, force: true });
});
var cliEnv = () => {
  const active = current();
  const env = {};
  for (const name of [...HOST_ENV, ...operatorEnv()])
    if (process.env[name] !== void 0)
      env[name] = process.env[name];
  const { sessionToken, pat } = active.credential ?? {};
  return {
    ...env,
    HOME: buildHome(),
    USERPROFILE: buildHome(),
    FORCE_COLOR: "0",
    // The CLI is oclif: under NODE_ENV=development it loads its TypeScript sources instead of the build and fails
    // ("Unexpected token ':'"). A ToolJet server running in development passes that on to this MCP server.
    NODE_ENV: "production",
    TOOLJET_CLI_SERVER_MODE: "1",
    TOOLJET_URL: active.apiUrl,
    TOOLJET_APP_URL: process.env.TOOLJET_DEPLOYMENT_URL ?? active.appUrl,
    ...sessionToken ? { TOOLJET_SESSION_TOKEN: sessionToken, TOOLJET_WORKSPACE_ID: active.workspace } : { TOOLJET_PAT: pat },
    // npm's cache is by content hash, so projects can share it; a home per process alone would download everything each build.
    npm_config_cache: process.env.MCP_CODE_NPM_CACHE ?? join(baseRoot(), ".npm-cache"),
    ...registry() ? { npm_config_registry: registry() } : {}
  };
};
var registry = () => process.env.npm_config_registry ?? process.env.NPM_CONFIG_REGISTRY;
var COUNTED_COMMANDS = /* @__PURE__ */ new Set(["library build", "app dev", "app install", "app check"]);
var runCli = async (cwd, args, timeoutMs) => {
  const [cmd, pre] = process.env.TOOLJET_CLI ? ["node", [process.env.TOOLJET_CLI]] : ["tooljet", []];
  try {
    const { stdout, stderr } = await run(cmd, [...pre, ...args], { cwd, timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, env: cliEnv() });
    return { code: 0, output: strip(stdout + stderr) };
  } catch (err) {
    const e = err;
    return { code: typeof e.code === "number" ? e.code : 1, output: strip((e.stdout ?? "") + (e.stderr ?? e.message ?? "")) };
  }
};
var serverModeChecked;
var requireServerModeCli = () => {
  if (process.env.MCP_CODE_CLI_HANDSHAKE === "0")
    return Promise.resolve();
  serverModeChecked ??= runCli(baseRoot(), ["app", "server-mode"], 6e4).then((answer) => {
    if (!answer.output.includes("tooljet-server-mode:1")) {
      serverModeChecked = void 0;
      throw new Error("This server's ToolJet CLI does not support server mode, so Code builds are off here. Update the CLI.");
    }
  });
  return serverModeChecked;
};
async function cli(cwd, args, timeoutMs = 3e5) {
  mkdirSync(baseRoot(), { recursive: true });
  await requireServerModeCli();
  const command = args.filter((a) => !a.startsWith("-")).slice(0, 2).join(" ");
  if (!COUNTED_COMMANDS.has(command))
    return runCli(cwd, args, timeoutMs);
  return withBuildSlot(baseRoot(), `${current().deployment}.${current().workspace}`, () => runCli(cwd, args, timeoutMs));
}
var PLACEHOLDER_NAME = /^Untitled App\b/;
async function nameApp(client, dir, name, replaceName) {
  let snapshot;
  try {
    snapshot = JSON.parse(readFileSync(join(dir, ".tooljet", "snapshot.json"), "utf8"));
  } catch {
    return {};
  }
  const standIn = PLACEHOLDER_NAME.test(snapshot.appName ?? "") || !!replaceName && snapshot.appName === replaceName;
  if (!client || !snapshot.appId || !snapshot.versionId || !standIn || snapshot.appName === name)
    return {};
  try {
    await client.renameApp(snapshot.appId, snapshot.versionId, name);
    return { renamed_to: name };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/exist|unique|duplicate|taken|conflict|409|422/i.test(message))
      return { rename_warning: `Could not name the app: ${message}` };
    const fallback = `${name} ${Math.random().toString(36).slice(2, 5)}`;
    await client.renameApp(snapshot.appId, snapshot.versionId, fallback);
    return { renamed_to: fallback, rename_warning: `App name "${name}" is already used in this workspace; the app was named "${fallback}" instead.` };
  }
}
function parseReport(output) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end < start)
    return null;
  try {
    return JSON.parse(output.slice(start, end + 1));
  } catch {
    return null;
  }
}
var mustFix = (security) => (security?.findings ?? []).filter((f) => f.severity === "critical" || f.severity === "high");
var securitySummary = (security) => !security ? { error: "no security report (the CLI predates tooljet app check --json)" } : security.error ? { error: security.error } : {
  gate: security.gate,
  counts: security.counts,
  not_run: (security.notRun ?? []).map((n) => `${n.id}${n.reason ? `: ${n.reason}` : ""}`),
  findings: (security.findings ?? []).slice(0, 40),
  ...(security.findings?.length ?? 0) > 40 ? { more_findings: security.findings.length - 40 } : {}
};
function withDependencies(pkg, packages) {
  const dependencies = { ...pkg.dependencies ?? {} };
  for (const p of packages)
    dependencies[p.name] = p.version;
  return { ...pkg, dependencies: Object.fromEntries(Object.entries(dependencies).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) };
}
function withoutDependencies(pkg, names) {
  const drop = (deps) => deps && Object.fromEntries(Object.entries(deps).filter(([name]) => !names.includes(name)));
  return { ...pkg, ...pkg.dependencies ? { dependencies: drop(pkg.dependencies) } : {}, ...pkg.devDependencies ? { devDependencies: drop(pkg.devDependencies) } : {} };
}
var PACKAGE_NAME = /^(@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;
var PACKAGE_SPEC = /^(@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*(@[A-Za-z0-9.^~<>=*| -]+)?$/;
function codeAppScaffoldTool(context) {
  return {
    name: "code_app_scaffold",
    title: "Scaffold Code Mode App",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description: "Create the Code mode project for an app you created with create_app: app.json (the app and its routes, its screens) and frontend/ (React + TypeScript on shadcn + Tailwind, react-router through AppRouter). Create the app's queries (code_app_data) BEFORE this, so the typed hooks it writes (frontend/src/tooljet.gen.ts: useAppQuery, row types, ROUTES, routePath, PAGES) list them. Returns the files and the generated hooks." + USER_WORDS,
    inputSchema: {
      name: external_exports.string().regex(NAME).describe("Project folder: lowercase letters, digits and hyphens, e.g. inventory-console"),
      display_name: external_exports.string().min(1).max(100).describe(`The app's name; an app still called "Untitled App" is renamed to it`),
      app_id: external_exports.string().uuid().describe("The app from create_app"),
      rename_from: external_exports.string().max(100).optional().describe("Set by ToolJet; leave it out")
    },
    handler: inScope(context, async (args) => {
      try {
        await authorizeApp(args.app_id, "edit");
        cleanOldProjects(baseRoot());
        const [existing] = projectsForApp(args.app_id);
        const dir = existing ? join(root(), existing) : projectDir(args.name);
        return await onProject(dir, async () => {
          const owner = appIdOf(dir);
          if (!existing && owner && owner !== args.app_id)
            throw new Error(`project "${args.name}" belongs to app ${owner}; choose another name`);
          const created = !existsSync(join(dir, "app.json"));
          if (created) {
            mkdirSync(root(), { recursive: true });
            const init = await cli(root(), ["app", "init", args.name, "--name", args.display_name, "--no-install"]);
            if (init.code !== 0)
              throw new Error(`tooljet app init failed: ${init.output}`);
            const appFile = join(dir, "app.json");
            writeFileSync(appFile, JSON.stringify({ ...JSON.parse(readFileSync(appFile, "utf8")), appId: args.app_id }, null, 2) + "\n");
            const install = await installDependencies(dir, "Installing the template");
            if (install.code !== 0)
              throw new Error(`tooljet app install failed: ${install.output}`);
          }
          const pull = await cli(dir, ["app", "pull"]);
          if (pull.code !== 0)
            throw new Error(`tooljet app pull failed: ${pull.output}`);
          const restored = created ? await restoreStoredCode(dir) : {};
          const naming = await nameApp(context.client, dir, args.display_name, args.rename_from);
          if (!existing && !restored.stored_code)
            rememberScaffold(dir);
          return ok({
            project_dir: dir,
            ...naming,
            ...restored,
            ...existing ? { existing_project: existing, note: `This app already has a project, "${existing}"; it is used as is.` } : {},
            files: listFiles(dir),
            app_json: JSON.parse(readFileSync(join(dir, "app.json"), "utf8")),
            generated_hooks: readFileSync(join(dir, "frontend", "src", "tooljet.gen.ts"), "utf8"),
            next: "Set the routes in app.json, write the screens under frontend/src/App/, then code_app_install with verify: true."
          });
        });
      } catch (err) {
        return fail(err);
      }
    })
  };
}
async function restoreStoredCode(dir) {
  const manifest = join(dir, "frontend", "package.json");
  const before = existsSync(manifest) ? readFileSync(manifest, "utf8") : "";
  const pull = await cli(dir, ["app", "source-pull", "--force"], 6e4);
  if (pull.code !== 0 && /\b(401|403)\b|unauthori[sz]ed|forbidden/i.test(pull.output))
    throw new Error("ToolJet refused access to this app's stored code.");
  if (pull.code !== 0)
    return { sync_warning: `Could not bring the app's stored code into the new project: ${pull.output.trim().slice(0, 300)}` };
  if (/No source is stored/i.test(pull.output)) {
    nothingStored.add(dir);
    freshProjects.add(dir);
    lastSynced.set(dir, Date.now());
    return {};
  }
  if (!/Pulled revision|Already at revision/.test(pull.output))
    return {};
  if ((existsSync(manifest) ? readFileSync(manifest, "utf8") : "") !== before) {
    const install = await installDependencies(dir, "Installing the app's stored dependencies");
    if (install.code !== 0)
      throw new Error(`tooljet app install failed after bringing the app's code down: ${install.output}`);
  }
  freshProjects.add(dir);
  lastSynced.set(dir, Date.now());
  return {
    stored_code: "This app already has code on ToolJet: the project now holds it, not the template. Read the files you change before writing them, and keep the app's existing screens."
  };
}
async function installDependencies(dir, what, timeoutMs) {
  const refusal = dependencyRefusal(dir, what);
  if (refusal)
    throw refusal;
  const install = await cli(dir, ["app", "install"], timeoutMs);
  const escaped = removeEscapingLinks(dir);
  if (escaped)
    throw escaped;
  return install;
}
async function syncEditorEdits(dir, { force = false } = {}) {
  if (!force && nothingStored.has(dir))
    return {};
  if (force)
    forgetSourceRevision(dir);
  let pull = await cli(dir, ["app", "source-pull"], 6e4);
  let copy;
  if (force && pull.code !== 0 && /Not pulled\. These files differ/i.test(pull.output)) {
    const copies = new Set(beforePullCopies(dir));
    pull = await cli(dir, ["app", "source-pull", "--force"], 6e4);
    copy = pruneBeforePull(dir).find((kept) => !copies.has(kept));
  }
  if (pull.code !== 0 && /\b(401|403)\b|unauthori[sz]ed|forbidden/i.test(pull.output))
    throw new Error("ToolJet refused access to this app's stored code.");
  if (pull.code !== 0)
    return { sync_warning: `Could not check the ToolJet editor for edits: ${pull.output.trim().slice(0, 300)}` };
  if (/No source is stored/i.test(pull.output))
    nothingStored.add(dir);
  else
    nothingStored.delete(dir);
  lastSynced.set(dir, Date.now());
  return {
    .../Pulled revision/.test(pull.output) ? { editor_edits: pull.output.trim() } : {},
    ...copy ? { before_pull_copy: `The files this pull replaced are kept in ${copy} (the last 3 copies are kept).` } : {}
  };
}
var freshProjects = /* @__PURE__ */ new Set();
var nothingStored = /* @__PURE__ */ new Set();
var scaffoldHashes = /* @__PURE__ */ new Map();
var readHashes = /* @__PURE__ */ new Map();
var ownWrites = /* @__PURE__ */ new Map();
var lastSynced = /* @__PURE__ */ new Map();
var readSyncWindowMs = () => Number(process.env.MCP_CODE_APP_READ_SYNC_MS ?? 2e4);
var syncedRecently = (dir) => Date.now() - (lastSynced.get(dir) ?? -Infinity) < readSyncWindowMs();
var sha = (text) => createHash("sha256").update(text).digest("hex");
var readKey = (dir, rel) => `${dir}\0${rel}`;
function forgetSourceRevision(dir) {
  const file = join(dir, ".tooljet", "source.json");
  if (!existsSync(file))
    return;
  try {
    const state = JSON.parse(readFileSync(file, "utf8"));
    writeFileSync(file, JSON.stringify({ ...state, revision: -1 }, null, 2) + "\n");
  } catch {
  }
}
function rememberScaffold(dir) {
  for (const rel of listFiles(dir)) {
    const full = join(dir, rel);
    if (existsSync(full))
      scaffoldHashes.set(readKey(dir, rel), sha(readFileSync(full, "utf8")));
  }
}
var wroteHere = /* @__PURE__ */ new Set();
var unstoredWrites = (dir) => wroteHere.has(dir) || hasAgentWrites(dir);
function noteWrite(dir) {
  wroteHere.add(dir);
  markAgentWrites(dir);
}
async function ensureFresh(dir) {
  if (freshProjects.has(dir))
    return {};
  const sync = await syncEditorEdits(dir, { force: !unstoredWrites(dir) });
  if (!sync.sync_warning)
    freshProjects.add(dir);
  return sync;
}
var prefetchedScans = /* @__PURE__ */ new Map();
var scanReuseMs = () => Number(process.env.MCP_CODE_APP_SCAN_REUSE_MS ?? 6e5);
function projectHash(dir) {
  const hash = createHash("sha256");
  const walk = (at) => {
    for (const entry of readdirSync(at, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      if (entry.isDirectory() && ["node_modules", "dist", ".tooljet"].includes(entry.name))
        continue;
      const full = join(at, entry.name);
      if (entry.isDirectory())
        walk(full);
      else if (entry.isFile())
        hash.update(relative(dir, full)).update("\0").update(readFileSync(full)).update("\0");
    }
  };
  walk(dir);
  return hash.digest("hex");
}
function prefetchFullScan(dir) {
  if (process.env.MCP_CODE_APP_SCAN_PREFETCH === "0")
    return;
  const hash = projectHash(dir);
  const result = cli(dir, ["app", "check", "--json"]).then((check) => {
    try {
      return projectHash(dir) === hash ? check : null;
    } catch {
      return null;
    }
  });
  prefetchedScans.set(dir, { hash, at: Date.now(), result });
}
async function fullScan(dir) {
  const prefetched = prefetchedScans.get(dir);
  prefetchedScans.delete(dir);
  if (prefetched && Date.now() - prefetched.at < scanReuseMs() && projectHash(dir) === prefetched.hash) {
    const check = await prefetched.result;
    const security = check && parseReport(check.output)?.security;
    if (check && security && !security.error && projectHash(dir) === prefetched.hash)
      return { ...check, reused: true };
  }
  return { ...await cli(dir, ["app", "check", "--json"]), reused: false };
}
var sdkCopied = /* @__PURE__ */ new Set();
async function copySdkIn(dir) {
  let linked = false;
  try {
    linked = lstatSync(join(dir, "frontend", "node_modules", "@tooljet", "custom-component-sdk")).isSymbolicLink();
  } catch {
    return;
  }
  if (!linked || sdkCopied.has(dir))
    return;
  sdkCopied.add(dir);
  await installDependencies(dir, "Copying the SDK into the project", 18e4);
}
var TYPE_CHECKED = /^frontend\/(src\/.*\.tsx?|.*\.css)$/;
async function typeCheckAfterWrite(dir, written) {
  if (process.env.MCP_CODE_WRITE_TYPECHECK !== "1" || !written.some((rel) => TYPE_CHECKED.test(rel)))
    return void 0;
  await copySdkIn(dir);
  const result = await cli(join(dir, "frontend"), ["library", "typecheck", "--json"], 3e4);
  const report = parseReport(result.output);
  if (!Array.isArray(report?.problems))
    return void 0;
  if (!report.problems.length)
    return { errors: 0 };
  const problems = report.problems.map(fromChecked);
  const unwritten = problems.filter((p) => p.code === "TS2307" && /Cannot find module '\.{1,2}\//.test(p.message));
  const rest = problems.filter((p) => !unwritten.includes(p));
  return {
    errors: problems.length,
    ...rest.length ? { fix: formatProblems(rest, 25) } : {},
    ...unwritten.length ? { not_written_yet: [...new Set(unwritten.map((p) => `${/'([^']+)'/.exec(p.message)?.[1]} (imported at ${p.at})`))] } : {},
    note: "Fix these in this round of writes, before code_app_build. An import of a file you have not written yet clears once you write it."
  };
}
function changedLines(before, after) {
  const count = (text) => text.split("\n").reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), /* @__PURE__ */ new Map());
  const a = count(before);
  const b = count(after);
  let changed = 0;
  for (const [line, n] of a)
    changed += Math.max(0, n - (b.get(line) ?? 0));
  for (const [line, n] of b)
    changed += Math.max(0, n - (a.get(line) ?? 0));
  return changed;
}
var clip = (line) => line.trim().length > 100 ? `${line.trim().slice(0, 100)}...` : line.trim();
var lineAt = (text, index) => text.slice(0, index).split("\n").length;
function findHint(content, find) {
  const lines = content.split("\n");
  const at = [];
  for (let i = content.indexOf(find); i >= 0 && at.length < 6; i = content.indexOf(find, i + 1))
    at.push(lineAt(content, i));
  if (at.length > 1) {
    const shown = at.slice(0, 5).map((n) => `line ${n}${n > 1 ? ` (after "${clip(lines[n - 2])}")` : ""}`);
    return ` It is at ${shown.join("; ")}${at.length > 5 ? "; and more" : ""}. Add a neighbouring line to the find so it matches one place.`;
  }
  if (at.length === 1)
    return "";
  const wanted = find.split("\n").map((l) => l.trim());
  const trimmed = lines.map((l) => l.trim());
  const starts = trimmed.flatMap((l, i) => wanted.every((w, k) => trimmed[i + k] === w) ? [i + 1] : []);
  if (starts.length === 1)
    return ` The same lines are at line ${starts[0]} with different indentation or spacing; copy them exactly as the file has them.`;
  const words = (l) => new Set(l.match(/[A-Za-z_$][\w$]*|\d+/g) ?? []);
  const key = wanted.reduce((a, b) => b.length > a.length ? b : a, "");
  const target = words(key);
  if (!target.size)
    return "";
  const scored = lines.map((l, i) => {
    const w = words(l);
    const shared = [...target].filter((t) => w.has(t)).length;
    return { n: i + 1, l, score: shared / Math.max(target.size, w.size) };
  }).filter((x) => x.score >= 0.5).sort((a, b) => b.score - a.score).slice(0, 2);
  return scored.length ? ` Closest: ${scored.map((x) => `line ${x.n}: "${clip(x.l)}"`).join("; ")}.` : "";
}
var isRewrite = (before, after) => {
  const changed = changedLines(before, after);
  const size = Math.max(before.split("\n").length, after.split("\n").length);
  return changed > 20 && changed > 0.4 * size;
};
function codeAppReadFilesTool(context) {
  return {
    name: "code_app_read_files",
    title: "Read Code Mode Files",
    annotations: { readOnlyHint: true, openWorldHint: true },
    description: "Read a Code mode project. Without paths, lists its files; with paths, returns their contents (app.json, frontend/...). Edits saved in the ToolJet Code panel since the last install are brought into the project first." + USER_WORDS,
    inputSchema: { app_id: APP_ID, name: PROJECT_NAME, paths: external_exports.array(external_exports.string()).optional() },
    handler: inScope(context, async (args) => {
      try {
        const dir = await locateProject(args, "read");
        return await onProject(dir, async () => {
          if (!freshProjects.has(dir))
            await followDraft(dir);
          const sync = !freshProjects.has(dir) ? await ensureFresh(dir) : syncedRecently(dir) ? {} : await syncEditorEdits(dir);
          if (!args.paths?.length)
            return ok({ project_dir: dir, ...sync, files: listFiles(dir) });
          const files = Object.fromEntries(args.paths.map((p) => {
            const full = insideProject(dir, p);
            const rel = relative(dir, full).split(sep).join("/");
            const content = readFileSync(full, "utf8");
            readHashes.set(readKey(dir, rel), sha(content));
            return [p, content];
          }));
          return ok({ project_dir: dir, ...sync, files });
        });
      } catch (err) {
        return fail(err);
      }
    })
  };
}
function codeAppWriteFilesTool(context) {
  return {
    name: "code_app_write_files",
    title: "Write Code Mode Files",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    description: "Write into a Code mode project: app.json (name, codePage, routes [{id, path, title}]), frontend/styles/theme.css (tokens), frontend/styles/global.css (page-wide rules and library overrides) and anything under frontend/src/. To change an existing file, read it first (code_app_read_files) and pass edits: [{ path, find, replace }] with the exact text to change; a file you wrote in this build needs no read first, and before the first install may be sent whole again. files: [{ path, content }] is for new files and for replacing a file still as the template left it, or for a rewrite the request needs (then rewrite: true, as well as the files). A write to a file that changed in the ToolJet editor since you read it is refused: read it again and apply your change to what is there. Read data with useAppQuery from ../tooljet.gen; write by awaiting a query's run({ ...parameters }); route with AppRouter, react-router <Routes>/<Route> whose paths are exactly app.json's, and routePath(id, params). A type_check in the result lists the project's type errors after this write: fix them before code_app_build. Then code_app_build." + USER_WORDS,
    inputSchema: {
      app_id: APP_ID,
      name: PROJECT_NAME,
      files: external_exports.array(external_exports.object({ path: external_exports.string(), content: external_exports.string() })).max(40).optional(),
      edits: external_exports.array(external_exports.object({ path: external_exports.string(), find: external_exports.string().min(1), replace: external_exports.string() })).max(60).optional().describe("Targeted changes to existing files: each find must appear exactly once in the file as it is now"),
      rewrite: external_exports.boolean().optional().describe("Allow files to replace most of an existing file (only when the request needs it)")
    },
    handler: inScope(context, async (args) => {
      try {
        const dir = await locateProject(args, "edit");
        return await onProject(dir, async () => {
          if (!args.files?.length && !args.edits?.length)
            throw new Error(`Nothing was written: this call had no files and no edits, so it sent no code${args.rewrite ? " (rewrite: true only allows a rewrite, it carries none)" : ""}. Send the code in this call: files: [{ path, content }] with the whole file, or edits: [{ path, find, replace }].`);
          if (!freshProjects.has(dir))
            await followDraft(dir);
          const first = await ensureFresh(dir);
          const sync = first.editor_edits || first.sync_warning ? first : await syncEditorEdits(dir);
          const next = /* @__PURE__ */ new Map();
          const current2 = (rel, full) => next.get(rel)?.content ?? (existsSync(full) ? readFileSync(full, "utf8") : void 0);
          const stale2 = (rel, full) => {
            if (next.has(rel) || !existsSync(full))
              return void 0;
            const known = readHashes.get(readKey(dir, rel));
            if (!known)
              return `${rel} has not been read in this build: read it with code_app_read_files first`;
            if (known !== sha(readFileSync(full, "utf8")))
              return `${rel} changed on ToolJet (an edit in the editor) since you read it: read it again and apply your change to what is there now`;
            return void 0;
          };
          const refusals = [];
          for (const file of args.files ?? []) {
            const full = editable(dir, file.path);
            const rel = relative(dir, full).split(sep).join("/");
            const why = stale2(rel, full);
            if (why)
              refusals.push(why);
            const before = current2(rel, full);
            const stillTemplate = before !== void 0 && scaffoldHashes.get(readKey(dir, rel)) === sha(before);
            const ownFile = before !== void 0 && nothingStored.has(dir) && ownWrites.get(readKey(dir, rel)) === sha(before);
            if (!why && before !== void 0 && !args.rewrite && !stillTemplate && !ownFile && isRewrite(before, file.content))
              refusals.push(`${rel}: this replaces most of the file; change only what the request needs with edits (find/replace), or, if the request really is a rewrite, send these files again with rewrite: true in the same call`);
            next.set(rel, { full, content: file.content });
          }
          for (const edit of args.edits ?? []) {
            const full = editable(dir, edit.path);
            const rel = relative(dir, full).split(sep).join("/");
            const why = stale2(rel, full);
            if (why) {
              refusals.push(why);
              continue;
            }
            const before = current2(rel, full);
            if (before === void 0) {
              refusals.push(`${rel} does not exist: create it with files`);
              continue;
            }
            const found = before.split(edit.find).length - 1;
            if (found !== 1) {
              refusals.push(`${rel}: the find text appears ${found} times; it must match exactly once (copy it from the file as it is now).${findHint(before, edit.find)}`);
              continue;
            }
            next.set(rel, { full, content: before.replace(edit.find, () => edit.replace) });
          }
          if (refusals.length)
            return fail(new Error("Not written:\n" + refusals.map((r) => `- ${r}`).join("\n")));
          noteWrite(dir);
          const written = [];
          for (const [rel, { full, content }] of next) {
            mkdirSync(dirname(full), { recursive: true });
            writeFileSync(full, content);
            readHashes.set(readKey(dir, rel), sha(content));
            ownWrites.set(readKey(dir, rel), sha(content));
            written.push(rel);
          }
          const types = await typeCheckAfterWrite(dir, written).catch(() => void 0);
          return ok({ project_dir: dir, ...sync, written, ...types ? { type_check: types } : {} });
        });
      } catch (err) {
        return fail(err);
      }
    })
  };
}
async function followDraft(dir) {
  let pinned;
  try {
    pinned = JSON.parse(readFileSync(join(dir, "app.json"), "utf8")).version;
  } catch {
    return void 0;
  }
  if (!pinned?.id)
    return void 0;
  const list = await cli(dir, ["app", "checkout", "--list"], 6e4);
  const line = list.output.split("\n").find((l) => l.trimStart().startsWith("*") && l.includes(pinned.id));
  if (list.code !== 0 || !line || /\bdraft\b/i.test(line))
    return void 0;
  const moved = await cli(dir, ["app", "checkout", "--editing"], 6e4);
  if (moved.code !== 0)
    throw new Error(`The app's draft could not be opened: ${moved.output.trim().slice(0, 500)}`);
  return `${pinned.name ?? "The pinned version"} is saved, so the code now goes into the app's draft.`;
}
var STYLESHEET = "frontend/src/styles/globals.css";
var IMPORT_RE = /(?:^|[\s;])import\s+(?:[^'"]*?from\s+)?['"]([^'"]+\.css)['"]/gm;
function nativeSelects(dir) {
  const src = join(dir, "frontend", "src");
  if (!existsSync(join(src, "components", "ui", "select.tsx")))
    return [];
  return listFiles(src).filter((rel) => rel.endsWith(".tsx") && !rel.startsWith("components/")).flatMap((rel) => readFileSync(join(src, rel), "utf8").split("\n").flatMap((line, i) => /<select[\s>]/.test(line) ? [`frontend/src/${rel}:${i + 1}`] : []));
}
function badRouteHandles(dir) {
  const file = join(dir, "app.json");
  if (!existsSync(file))
    return [];
  const routes = JSON.parse(readFileSync(file, "utf8")).routes ?? [];
  return routes.map((route) => String(route.id)).filter((id) => !/^[a-z0-9][a-z0-9-]*$/.test(id)).map((id) => `app.json: route id "${id}" is not a valid handle: use lowercase letters, numbers and hyphens, such as "${id.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+/, "") || "page"}"`);
}
var SDK_DECLARED = /declare\s+module\s+['"]@tooljet\/custom-component-sdk['"]/;
function sdkRedeclared(dir) {
  const src = join(dir, "frontend", "src");
  if (!existsSync(src))
    return [];
  return listFiles(src).filter((rel) => /\.tsx?$/.test(rel) && rel !== "tooljet.gen.ts" && SDK_DECLARED.test(readFileSync(join(src, rel), "utf8"))).map((rel) => `frontend/src/${rel}: declares @tooljet/custom-component-sdk itself, which hides the SDK's real types; write the file without that declaration (the SDK has its own types), then fix what the build reports`);
}
function missingStylesheet(dir) {
  const sheet = join(dir, STYLESHEET);
  if (!existsSync(sheet))
    return void 0;
  const src = join(dir, "frontend", "src");
  for (const rel of listFiles(src)) {
    if (!/\.(tsx?|jsx?)$/.test(rel) || rel.startsWith("components/"))
      continue;
    const file = join(src, rel);
    const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const m of code.matchAll(IMPORT_RE)) {
      if (resolve(dirname(file), m[1]) === sheet)
        return void 0;
    }
  }
  return "frontend/src/App/index.tsx: the app's stylesheet is not imported, so every screen renders unstyled (no Tailwind, no theme colours). Add `import '../styles/globals.css';` back with the other imports at the top of App/index.tsx.";
}
async function browserUserQueries(appId) {
  if (!appId)
    return [];
  try {
    const summary = await current().client.getAppSummary?.(appId);
    return summary ? browserUserQueryProblems({ data_queries: summary.queries }).map((line) => `query check: ${line}`) : [];
  } catch {
    return [];
  }
}
function codeAppBuildTool(context) {
  return {
    name: "code_app_build",
    title: "Build Code Mode App",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description: "Refresh the typed hooks from the app's current queries (tooljet app pull), build the app's code (TypeScript, Tailwind, manifest), and check it against the app (tooljet app check: every useAppQuery name, route, link and page must exist) and the security scan (code rules such as external fetch, eval and token storage; secrets; vendored code). Returns ok and every error (errors: one line each, with the code and often the fix), native control and security finding to fix; fix every one in one round of writes. Repeat write and build until ok, then code_app_install." + USER_WORDS,
    inputSchema: { app_id: APP_ID, name: PROJECT_NAME },
    handler: inScope(context, async (args) => {
      try {
        const dir = await locateProject(args, "edit");
        return await onProject(dir, async () => ok(await buildProject(dir, args.app_id)));
      } catch (err) {
        return fail(err);
      }
    })
  };
}
async function buildProject(dir, appId) {
  const followed = await followDraft(dir);
  const sync = await ensureFresh(dir);
  const unstored = removeUnstoredSource(dir);
  await copySdkIn(dir);
  const escaped = removeEscapingLinks(dir);
  const started = Date.now();
  const pull = await cli(dir, ["app", "pull"]);
  const build = await cli(join(dir, "frontend"), ["library", "build"]);
  const tsErrors = Number(/TypeScript compiled \((\d+) errors\)/.exec(build.output)?.[1] ?? (build.code === 0 ? 0 : 1));
  const problems = build.code === 0 && tsErrors === 0 ? [] : parseBuildProblems(build.output);
  const check = await cli(dir, ["app", "check", "--offline", "--json"]);
  const report = parseReport(check.output);
  const unstyled = missingStylesheet(dir);
  const selects = nativeSelects(dir);
  const handles = badRouteHandles(dir);
  const serverUser = await browserUserQueries(appId ?? appIdOf(dir));
  const extra = [...handles, ...unstyled ? [unstyled] : [], ...sdkRedeclared(dir), ...serverUser, ...escaped ? [escaped.message] : []];
  const okBuild = pull.code === 0 && build.code === 0 && tsErrors === 0 && check.code === 0 && !extra.length;
  if (okBuild)
    prefetchFullScan(dir);
  return {
    ...followed ? { draft: followed } : {},
    ...sync.before_pull_copy ? { before_pull_copy: sync.before_pull_copy } : {},
    ...unstored.length ? { removed_unstored: { files: unstored, note: "Removed: never stored with the app or scanned. Put code under frontend/src without node_modules or dot names, and add packages with code_app_add_dependency." } } : {},
    ok: okBuild,
    build_ms: Date.now() - started,
    pull: pull.code === 0 ? "typed hooks refreshed" : pull.output.trim(),
    typescript_errors: tsErrors,
    // Every error on one line, with the code it is on and, for the mistakes that recur, the fix (codeTypeErrors.ts);
    // the raw output only when it holds no error this can read.
    ...problems.length ? { errors: formatProblems(problems) } : {},
    build_output: build.code === 0 && tsErrors === 0 ? build.output.trim().split("\n").slice(-6).join("\n") : problems.length ? buildSummary(build.output) : build.output.trim().slice(0, 12e3),
    check: report?.problems ? [...extra, ...report.problems.map((p) => `${p.file}:${p.line}  ${p.message}`)] : extra.length ? [...extra, check.output.trim().slice(0, 6e3)] : check.output.trim().slice(0, 6e3),
    ...selects.length ? { native_controls: { fix: "Use Select from components/ui/select instead of a native <select>.", at: selects } } : {},
    // jsx-a11y recommended rules, warnings only (tooljet app check); fix them when they are cheap to fix.
    a11y_warnings: report?.accessibility?.length ?? Number(/(\d+) accessibility warnings?/.exec(check.output)?.[1] ?? 0),
    // The offline scan (no dependency network checks): fix critical and high before code_app_install.
    security: securitySummary(report?.security)
  };
}
var concreteRoute = (path) => path.replace(/:[A-Za-z_][\w]*/g, "1");
function routesToCheck(dir) {
  let routes = [];
  try {
    routes = JSON.parse(readFileSync(join(dir, "app.json"), "utf8")).routes ?? [];
  } catch {
    routes = [];
  }
  const paths = routes.map((route) => typeof route.path === "string" && route.path.startsWith("/") ? concreteRoute(route.path) : void 0).filter((path) => Boolean(path));
  return [...new Set(paths.length ? paths : ["/"])].sort((a, b) => a === "/" ? -1 : b === "/" ? 1 : 0);
}
async function renderRoutes(render, appId, routes, widths, concurrency) {
  const jobs = routes.flatMap((route) => widths.map((width) => ({ route, width })));
  const out = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    for (let index = next++; index < jobs.length; index = next++) {
      const { route, width } = jobs[index];
      const result = await render({ app_id: appId, route, ...width !== 1280 ? { viewport_width: width } : {} });
      const text = result.content?.[0]?.text ?? "";
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = void 0;
      }
      out[index] = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? { route, width, ...parsed } : { route, width, ok: false, error: text.replace(/^Error:\s*/, "").slice(0, 500) };
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, jobs.length)) }, worker));
  return out;
}
function codeAppInstallTool(context, options = {}) {
  return {
    name: "code_app_install",
    title: "Install Code Mode App",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description: "Upload the app's code (tooljet app dev --once --source platform): it creates or updates the app's Code mode page, one hidden page per route (set each route's page permissions on it) and the component that runs the code, points the app version at this code as a Live preview, and stores the source on ToolJet so the Code panel can edit it. Build first. Runs the full security scan first and refuses while it has critical or high findings, listing them. Returns the editor URL. If it says the source was edited in the ToolJet editor, call code_app_read_files to bring those edits down, reapply your change, and install again. verify: true makes it one check round: the build (as code_app_build; on any error it stops there, not installed, listing every error), the install, then the render check of every route in app.json (each once, at 1280 px unless widths says otherwise), in one report: build, install, render [{ route, width, ok, pages: [{ findings, accessibility }] }]. This is the last step of a build or edit: saving the app version (release_app saves a draft first) freezes the code." + USER_WORDS,
    inputSchema: {
      app_id: APP_ID,
      name: PROJECT_NAME,
      verify: external_exports.boolean().optional().describe("Build, install and render-check every route, in this one call"),
      widths: external_exports.array(external_exports.number().int().min(320).max(2560)).min(1).max(3).optional().describe("verify: the widths to check, default [1280]; add 375 and 768 only when phones or tablets were asked for"),
      routes: external_exports.array(external_exports.string().regex(/^\/[A-Za-z0-9_\-\/.]*$/)).min(1).max(12).optional().describe("verify: the paths to open, default every route in app.json with each :param as 1 (e.g. only the routes that failed)")
    },
    handler: inScope(context, async (args) => {
      try {
        const dir = await locateProject(args, "edit");
        return await onProject(dir, async () => {
          if (!args.verify) {
            const installed2 = await installProject(dir);
            return installed2 instanceof Error ? fail(installed2) : ok(installed2);
          }
          const built = await buildProject(dir, args.app_id);
          if (!built.ok) {
            return ok({
              ...built,
              installed: false,
              next: "Not installed: the build has errors. Fix every one in one round of writes, then code_app_install with verify: true again."
            });
          }
          const installed = await installProject(dir);
          if (installed instanceof Error)
            return fail(installed);
          const appId = args.app_id ?? appIdOf(dir);
          const build = {
            ok: true,
            build_ms: built.build_ms,
            typescript_errors: 0,
            a11y_warnings: built.a11y_warnings,
            ...built.native_controls ? { native_controls: built.native_controls } : {}
          };
          if (!options.render || !appId)
            return ok({ ...installed, installed: true, build, render: "not available here: rendering is unverified" });
          const routes = args.routes?.length ? [...new Set(args.routes)] : routesToCheck(dir);
          const widths = args.widths?.length ? [...new Set(args.widths)] : [1280];
          const render = await renderRoutes(options.render, appId, routes, widths, options.renderConcurrency ?? 2);
          const failing = render.filter((entry) => entry.ok !== true).map((entry) => `${entry.route} at ${entry.width} px`);
          return ok({
            ...installed,
            installed: true,
            build,
            render_ok: failing.length === 0,
            render,
            next: failing.length ? `Fix what the render check found on ${failing.join(", ")} in one round of writes, then code_app_install with verify: true and routes set to those paths.` : "Built, installed, and every route renders cleanly."
          });
        });
      } catch (err) {
        return fail(err);
      }
    })
  };
}
async function installProject(dir) {
  const followed = await followDraft(dir);
  const sync = await ensureFresh(dir);
  nothingStored.delete(dir);
  const dependencies = dependencyRefusal(dir, "The install");
  if (dependencies)
    return new Error(`Not installed: ${dependencies.message}`);
  const unstored = removeUnstoredSource(dir);
  const unstyled = missingStylesheet(dir);
  if (unstyled)
    return new Error(`Not installed: ${unstyled} Then code_app_build and install again.`);
  const check = await fullScan(dir);
  const security = parseReport(check.output)?.security;
  if (!security || security.error)
    throw new Error(`The security scan did not run, so nothing was installed: ${security?.error ?? check.output.trim().slice(0, 2e3)}`);
  const blocking = mustFix(security);
  if (blocking.length)
    return new Error(`Not installed: the security scan has ${blocking.length} critical or high finding${blocking.length > 1 ? "s" : ""}. Fix them in the code (or remove the package), code_app_build, then install again:
` + blocking.map((f) => `${f.severity.toUpperCase()} ${f.ruleId} ${f.package ?? f.location}: ${f.message}`).join("\n"));
  const result = await cli(dir, ["app", "dev", "--once", "--source", "platform"]);
  if (result.code !== 0)
    throw new Error(result.output.trim());
  clearAgentWrites(dir);
  const copies = beforePullCopies(dir);
  return {
    ...followed ? { draft: followed } : {},
    ...sync.editor_edits ? { editor_edits: sync.editor_edits } : {},
    ...sync.sync_warning ? { sync_warning: sync.sync_warning } : {},
    ...unstored.length ? { removed_unstored: unstored } : {},
    ...copies.length ? { before_pull_copies: { kept: copies, note: "Copies of local files a pull of ToolJet's code replaced (newest first, the last 3 kept); read one with code_app_read_files to recover a change." } } : {},
    linked: true,
    editor_url: /Open: (\S+)/.exec(result.output)?.[1] ?? null,
    output: result.output.trim(),
    security: securitySummary(security)
  };
}
function codeAppAddDependencyTool(context) {
  return {
    name: "code_app_add_dependency",
    title: "Add Code Mode Dependency",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description: "Add npm packages to a Code mode app (frontend/package.json is not writable otherwise). Each package is vetted first (tooljet app vet: malware, known vulnerabilities, versions published in the last 7 days, licence, workspace blocklist); when any fails, nothing is written and the findings say why: pick another version or package. Passing packages are pinned to the exact version vetted and installed without install scripts. Prefer what the template already has (shadcn, Tailwind, lucide-react). To fix a vulnerable package, pass it again at a fixed version (upgrade), or pass its replacement and the old name in remove; the lockfile is refreshed through the same install." + USER_WORDS,
    inputSchema: {
      app_id: APP_ID,
      name: PROJECT_NAME,
      packages: external_exports.array(external_exports.string().regex(PACKAGE_SPEC)).max(10).describe("name, name@version or name@range, e.g. date-fns@4"),
      remove: external_exports.array(external_exports.string().regex(PACKAGE_NAME)).max(10).optional().describe("package names to take out of frontend/package.json (a replaced package)")
    },
    handler: inScope(context, async (args) => {
      try {
        const dir = await locateProject(args, "edit");
        return await onProject(dir, async () => {
          if (!args.packages.length && !args.remove?.length)
            throw new Error("Pass packages to add, or names to remove.");
          const local = args.packages.flatMap((spec) => {
            const at = spec.indexOf("@", 1);
            const why = at > 0 ? nonRegistrySpec(spec.slice(at + 1)) : void 0;
            return why ? [`${spec}: ${why}`] : [];
          });
          if (local.length)
            throw new Error(`Not added: ${local.join("; ")}. Pass a registry version or range, such as date-fns@4.`);
          const vet = args.packages.length ? await cli(dir, ["app", "vet", ...args.packages, "--json"]) : { code: 0, output: '{"ok":true,"packages":[]}' };
          const report = parseReport(vet.output);
          if (!report?.packages)
            throw new Error(`The package check did not run, so nothing was added: ${vet.output.trim().slice(0, 2e3)}`);
          if (!report.ok)
            return fail(new Error(`Not added: ${report.packages.map((p) => `${p.name}@${p.version}`).join(", ")} fail${report.packages.length > 1 ? "" : "s"} the package check:
` + (report.findings ?? []).map((f) => `${f.severity.toUpperCase()} ${f.ruleId} ${f.package ?? f.location}: ${f.message}`).join("\n")));
          const vetted = report.packages.flatMap((p) => nonRegistrySpec(p.version) ? [`${p.name}@${p.version}`] : []);
          if (vetted.length)
            throw new Error(`Not added: the package check named ${vetted.join(", ")}, which is not a registry version.`);
          const pkgFile = insideProject(dir, "frontend/package.json");
          const lockFile = insideProject(dir, "frontend/package-lock.json");
          const before = readFileSync(pkgFile, "utf8");
          const lockBefore = existsSync(lockFile) ? readFileSync(lockFile, "utf8") : null;
          const restore = () => {
            writeFileSync(pkgFile, before);
            if (lockBefore !== null)
              writeFileSync(lockFile, lockBefore);
          };
          noteWrite(dir);
          writeFileSync(pkgFile, JSON.stringify(withDependencies(withoutDependencies(JSON.parse(before), args.remove ?? []), report.packages), null, 2) + "\n");
          const regenerated = !manifestProblems(dir).length && lockfileProblems(dir).length > 0;
          if (regenerated)
            rmSync(lockFile, { force: true });
          let install;
          try {
            install = await installDependencies(dir, "Adding the packages");
          } catch (error) {
            restore();
            throw new Error(`${error instanceof Error ? error.message : String(error)}
Nothing was added; package.json restored.`);
          }
          if (install.code !== 0) {
            restore();
            throw new Error(`tooljet app install failed, package.json restored: ${install.output.trim().slice(0, 4e3)}`);
          }
          return ok({
            added: report.packages.map((p) => `${p.name}@${p.version}`),
            ...regenerated ? { lockfile: "The lockfile named packages from outside the registry, so it was written again from the registry." } : {},
            ...args.remove?.length ? { removed: args.remove } : {},
            not_run: (report.notRun ?? []).map((n) => `${n.id}${n.reason ? `: ${n.reason}` : ""}`),
            // Transitive packages come with the install; code_app_build and code_app_install scan the whole lockfile.
            next: "Import the package in frontend/src, then code_app_build."
          });
        });
      } catch (err) {
        return fail(err);
      }
    })
  };
}
createRequire(import.meta.url);
var X_ALREADY_SENT = "x-hono-already-sent";
var RequestError = class extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "RequestError";
  }
};
var nonJoinedHeaders = /* @__PURE__ */ new Set([
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "server",
  "user-agent"
]);
var validHeaderName = /^[!#$%&'*+\-.^_`|~\dA-Za-z]+$/;
var isHttpWhitespace = (code) => code === 9 || code === 10 || code === 13 || code === 32;
var normalizeHeaderValue = (value) => {
  if (!isHttpWhitespace(value.charCodeAt(0)) && !isHttpWhitespace(value.charCodeAt(value.length - 1))) return value;
  let start = 0;
  let end = value.length;
  while (start < end && isHttpWhitespace(value.charCodeAt(start))) start++;
  while (end > start && isHttpWhitespace(value.charCodeAt(end - 1))) end--;
  return value.slice(start, end);
};
var forbiddenHeaderValue = /[\0\r\n]/;
var GlobalHeaders = globalThis.Headers;
var materializeHeaders = (rawHeaders, HeadersCtor = GlobalHeaders) => {
  const headers = new HeadersCtor();
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const name = rawHeaders[i];
    if (!name.startsWith(":")) headers.append(name, rawHeaders[i + 1]);
  }
  return headers;
};
var RequestHeaders = class {
  #incoming;
  #rawHeaders;
  #headers;
  #invalidValue;
  constructor(incoming) {
    this.#incoming = incoming;
    if (incoming instanceof Http2ServerRequest) this.#rawHeaders = incoming.rawHeaders.slice();
  }
  get #lazyRawHeaders() {
    return this.#rawHeaders ??= this.#incoming.rawHeaders.slice();
  }
  get #native() {
    if (!this.#headers) {
      this.#headers = materializeHeaders(this.#lazyRawHeaders);
      this.#rawHeaders = void 0;
    }
    return this.#headers;
  }
  #normalizedName(name) {
    if (typeof name !== "string") return;
    if (!validHeaderName.test(name)) throw new TypeError(`Invalid header name: ${name}`);
    return name.toLowerCase();
  }
  #lookupHttp1(lowerName) {
    const headers = this.#incoming instanceof Http2ServerRequest ? void 0 : this.#incoming.headers;
    if (!headers || nonJoinedHeaders.has(lowerName) || lowerName === "set-cookie" || lowerName === "__proto__") return;
    if (!Object.hasOwn(headers, lowerName)) return null;
    const rawValue = headers[lowerName];
    if (typeof rawValue === "string") {
      const value = normalizeHeaderValue(rawValue);
      return forbiddenHeaderValue.test(value) ? void 0 : value;
    }
  }
  #lookup(rawHeaders, lowerName) {
    const separator = lowerName === "cookie" ? "; " : ", ";
    let value = null;
    for (let i = 0; i < rawHeaders.length; i += 2) {
      const rawName = rawHeaders[i];
      if (rawName.length === lowerName.length && rawName.toLowerCase() === lowerName) {
        const rawValue = normalizeHeaderValue(rawHeaders[i + 1]);
        if (forbiddenHeaderValue.test(rawValue)) {
          this.#invalidValue = true;
          return;
        }
        value = value === null ? rawValue : value + separator + rawValue;
      }
    }
    return value;
  }
  append(name, value) {
    this.#native.append(name, value);
  }
  delete(name) {
    this.#native.delete(name);
  }
  get(name) {
    const lowerName = this.#normalizedName(name);
    if (lowerName && !this.#headers && !this.#invalidValue) {
      const http1Value = this.#lookupHttp1(lowerName);
      if (http1Value !== void 0) return http1Value;
      const value = this.#lookup(this.#lazyRawHeaders, lowerName);
      if (value !== void 0) return value;
    }
    return this.#native.get(name);
  }
  has(name) {
    const lowerName = this.#normalizedName(name);
    if (lowerName && !this.#headers && !this.#invalidValue) {
      const http1Value = this.#lookupHttp1(lowerName);
      if (http1Value !== void 0) return http1Value !== null;
      const value = this.#lookup(this.#lazyRawHeaders, lowerName);
      if (value !== void 0) return value !== null;
    }
    return this.#native.has(name);
  }
  set(name, value) {
    this.#native.set(name, value);
  }
  getSetCookie() {
    return this.#native.getSetCookie();
  }
  keys() {
    return this.#native.keys();
  }
  values() {
    return this.#native.values();
  }
  entries() {
    return this.#native.entries();
  }
  forEach(callback, thisArg) {
    this.#native.forEach((value, key) => {
      callback.call(thisArg, value, key, this);
    });
  }
  [Symbol.iterator]() {
    return this.entries();
  }
};
Object.defineProperty(RequestHeaders.prototype, /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom"), { value: function(depth, options, inspectFn) {
  return `Headers (lightweight) ${inspectFn(Object.fromEntries(this), {
    ...options,
    depth: depth == null ? null : depth - 1
  })}`;
} });
Object.setPrototypeOf(RequestHeaders.prototype, GlobalHeaders.prototype);
var newHeadersFromIncoming = (incoming) => globalThis.Headers === GlobalHeaders ? new RequestHeaders(incoming) : materializeHeaders(incoming.rawHeaders, globalThis.Headers);
var reValidRequestUrl = /^\/[!#$&-;=?-\[\]_a-z~]*$/;
var reDotSegment = /\/\.\.?(?:[/?#]|$)/;
var reValidHost = /^[a-z0-9._-]+(?::(?:[1-5]\d{3,4}|[6-9]\d{3}))?$/;
var buildUrl = (scheme, host, incomingUrl) => {
  const url = `${scheme}://${host}${incomingUrl}`;
  if (!reValidHost.test(host)) {
    const urlObj = new URL(url);
    if (urlObj.hostname.length !== host.length && urlObj.hostname !== (host.includes(":") ? host.replace(/:\d+$/, "") : host).toLowerCase()) throw new RequestError("Invalid host header");
    return urlObj.href;
  } else if (incomingUrl.length === 0) return url + "/";
  else {
    if (incomingUrl.charCodeAt(0) !== 47) throw new RequestError("Invalid URL");
    if (!reValidRequestUrl.test(incomingUrl) || reDotSegment.test(incomingUrl)) return new URL(url).href;
    return url;
  }
};
var toRequestError = (e) => {
  if (e instanceof RequestError) return e;
  return new RequestError(e.message, { cause: e });
};
var GlobalRequest = global.Request;
var Request$1 = class extends GlobalRequest {
  constructor(input, options) {
    if (typeof input === "object" && getRequestCache in input) {
      const hasReplacementBody = options !== void 0 && "body" in options && options.body != null;
      if (input[bodyConsumedDirectlyKey] && !hasReplacementBody) throw new TypeError("Cannot construct a Request with a Request object that has already been used.");
      input = input[getRequestCache]();
    }
    if (typeof options?.body?.getReader !== "undefined") options.duplex ??= "half";
    super(input, options);
  }
};
var wrapBodyStream = /* @__PURE__ */ Symbol("wrapBodyStream");
var byteExactEncodings = /* @__PURE__ */ new Set([
  "latin1",
  "binary",
  "hex",
  "base64",
  "base64url"
]);
var isByteExactEncoding = (encoding) => encoding === null || byteExactEncodings.has(encoding);
var bodyBufferedBeforeDisconnectKey = /* @__PURE__ */ Symbol("bodyBufferedBeforeDisconnect");
var bodyBufferedLengthBeforeDisconnectKey = /* @__PURE__ */ Symbol("bodyBufferedLengthBeforeDisconnect");
var toBufferChunk = (chunk, encoding) => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding ?? "utf8");
var isRecoverableDisconnectedIncoming = (incoming) => !(incoming instanceof Http2ServerRequest) && !!incoming.complete && !!incoming.readableAborted && typeof incoming.read === "function" && isByteExactEncoding(incoming.readableEncoding);
var recordBodyBufferedBeforeDisconnect = (incoming) => {
  if (incoming.readableDidRead || !isRecoverableDisconnectedIncoming(incoming)) return;
  const incomingWithRecovery = incoming;
  incomingWithRecovery[bodyBufferedLengthBeforeDisconnectKey] ??= incoming.readableLength;
};
var readBodyBufferedBeforeDisconnect = (incoming, chunks) => {
  if (incoming.readableDidRead && !chunks || !isRecoverableDisconnectedIncoming(incoming)) return;
  const incomingWithRecovery = incoming;
  if (incomingWithRecovery[bodyBufferedBeforeDisconnectKey] !== void 0) return incomingWithRecovery[bodyBufferedBeforeDisconnectKey];
  let result;
  const errored = incoming.errored;
  if (errored && errored.code !== "ECONNRESET") result = errored;
  else if (incomingWithRecovery[bodyBufferedLengthBeforeDisconnectKey] !== void 0 && incoming.readableLength !== incomingWithRecovery[bodyBufferedLengthBeforeDisconnectKey]) result = newBodyUnusableError();
  else {
    const bodyChunks = chunks ?? [];
    const chunk = incoming.read();
    if (chunk !== null) bodyChunks.push(toBufferChunk(chunk, incoming.readableEncoding));
    const buffer = bodyChunks.length === 1 ? bodyChunks[0] : Buffer.concat(bodyChunks);
    result = buffer;
    const contentLength = incoming.headers["content-length"];
    if (typeof contentLength === "string" && /^\d+$/.test(contentLength)) {
      const expectedLength = Number(contentLength);
      if (Number.isSafeInteger(expectedLength) && buffer.length !== expectedLength) result = newBodyUnusableError();
    }
  }
  incomingWithRecovery[bodyBufferedBeforeDisconnectKey] = result;
  return result;
};
var enqueueBufferedBody = (controller, buffered) => {
  if (buffered instanceof Error) {
    controller.error(buffered);
    return;
  }
  if (buffered.length > 0) controller.enqueue(buffered);
  controller.close();
};
var newRequestFromIncoming = (method, url, headers, incoming, abortController) => {
  const init = {
    method,
    headers,
    signal: abortController.signal
  };
  if (method === "TRACE") {
    init.method = "GET";
    const req = new Request$1(url, init);
    Object.defineProperty(req, "method", { get() {
      return "TRACE";
    } });
    return req;
  }
  if (!(method === "GET" || method === "HEAD")) if ("rawBody" in incoming && incoming.rawBody instanceof Buffer) init.body = new ReadableStream({ start(controller) {
    controller.enqueue(incoming.rawBody);
    controller.close();
  } });
  else if (incoming[wrapBodyStream]) {
    let reader;
    init.body = new ReadableStream({ async pull(controller) {
      try {
        if (!reader) {
          const buffered = readBodyBufferedBeforeDisconnect(incoming);
          if (buffered !== void 0) {
            enqueueBufferedBody(controller, buffered);
            return;
          }
        }
        reader ||= Readable.toWeb(incoming).getReader();
        const { done, value } = await reader.read();
        if (done) controller.close();
        else controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    } });
  } else {
    const buffered = readBodyBufferedBeforeDisconnect(incoming);
    if (buffered !== void 0) init.body = new ReadableStream({ start(controller) {
      enqueueBufferedBody(controller, buffered);
    } });
    else init.body = Readable.toWeb(incoming);
  }
  return new Request$1(url, init);
};
var getRequestCache = /* @__PURE__ */ Symbol("getRequestCache");
var requestCache = /* @__PURE__ */ Symbol("requestCache");
var incomingKey = /* @__PURE__ */ Symbol("incomingKey");
var urlKey = /* @__PURE__ */ Symbol("urlKey");
var methodKey = /* @__PURE__ */ Symbol("methodKey");
var headersKey = /* @__PURE__ */ Symbol("headersKey");
var abortControllerKey = /* @__PURE__ */ Symbol("abortControllerKey");
var getAbortController = /* @__PURE__ */ Symbol("getAbortController");
var abortRequest = /* @__PURE__ */ Symbol("abortRequest");
var bodyBufferKey = /* @__PURE__ */ Symbol("bodyBuffer");
var bodyReadPromiseKey = /* @__PURE__ */ Symbol("bodyReadPromise");
var bodyConsumedDirectlyKey = /* @__PURE__ */ Symbol("bodyConsumedDirectly");
var bodyLockReaderKey = /* @__PURE__ */ Symbol("bodyLockReader");
var abortReasonKey = /* @__PURE__ */ Symbol("abortReason");
var newBodyUnusableError = () => {
  return /* @__PURE__ */ new TypeError("Body is unusable");
};
var rejectBodyUnusable = () => {
  return Promise.reject(newBodyUnusableError());
};
var textDecoder = new TextDecoder();
var consumeBodyDirectOnce = (request2) => {
  if (request2[bodyConsumedDirectlyKey]) return rejectBodyUnusable();
  request2[bodyConsumedDirectlyKey] = true;
};
var toArrayBuffer = (buf) => {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
};
var contentType = (request2) => {
  return (request2[headersKey] ||= newHeadersFromIncoming(request2[incomingKey])).get("content-type") || "";
};
var methodTokenRegExp = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
var normalizeIncomingMethod = (method) => {
  if (typeof method !== "string" || method.length === 0) return "GET";
  switch (method) {
    case "DELETE":
    case "GET":
    case "HEAD":
    case "OPTIONS":
    case "PATCH":
    case "POST":
    case "PUT":
    case "QUERY":
      return method;
  }
  const upper = method.toUpperCase();
  switch (upper) {
    case "DELETE":
    case "GET":
    case "HEAD":
    case "OPTIONS":
    case "POST":
    case "PUT":
      return upper;
    default:
      return method;
  }
};
var validateDirectReadMethod = (method) => {
  if (!methodTokenRegExp.test(method)) return /* @__PURE__ */ new TypeError(`'${method}' is not a valid HTTP method.`);
  const normalized = method.toUpperCase();
  if (normalized === "CONNECT" || normalized === "TRACK" || normalized === "TRACE" && method !== "TRACE") return /* @__PURE__ */ new TypeError(`'${method}' HTTP method is unsupported.`);
};
var readBodyWithFastPath = (request2, method, fromBuffer) => {
  if (request2[bodyConsumedDirectlyKey]) return rejectBodyUnusable();
  const methodName = request2.method;
  if (methodName === "GET" || methodName === "HEAD") return request2[getRequestCache]()[method]();
  const methodValidationError = validateDirectReadMethod(methodName);
  if (methodValidationError) return Promise.reject(methodValidationError);
  if (request2[requestCache]) {
    if (methodName !== "TRACE") return request2[requestCache][method]();
  }
  const alreadyUsedError = consumeBodyDirectOnce(request2);
  if (alreadyUsedError) return alreadyUsedError;
  const raw = readRawBodyIfAvailable(request2);
  if (raw) {
    const result = Promise.resolve(fromBuffer(raw, request2));
    request2[bodyBufferKey] = void 0;
    return result;
  }
  return readBodyDirect(request2).then((buf) => {
    const result = fromBuffer(buf, request2);
    request2[bodyBufferKey] = void 0;
    return result;
  });
};
var readRawBodyIfAvailable = (request2) => {
  const incoming = request2[incomingKey];
  if ("rawBody" in incoming && incoming.rawBody instanceof Buffer) return incoming.rawBody;
};
var normalizeAbortError = (request2, incoming) => {
  if (incoming.errored) return incoming.errored;
  const reason = request2[abortReasonKey];
  if (reason !== void 0) return reason instanceof Error ? reason : new Error(String(reason));
  return /* @__PURE__ */ new Error("Client connection prematurely closed.");
};
var readBodyDirect = (request2) => {
  if (request2[bodyBufferKey]) return Promise.resolve(request2[bodyBufferKey]);
  if (request2[bodyReadPromiseKey]) return request2[bodyReadPromiseKey];
  const incoming = request2[incomingKey];
  if (incoming.readableDidRead) return rejectBodyUnusable();
  const buffered = readBodyBufferedBeforeDisconnect(incoming);
  if (buffered !== void 0) {
    if (buffered instanceof Error) return Promise.reject(buffered);
    request2[bodyBufferKey] = buffered;
    return Promise.resolve(buffered);
  }
  const promise = new Promise((resolve2, reject) => {
    const chunks = [];
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const recoverCompleteBodyAfterDisconnect = (error) => {
      const streamError = incoming.errored ?? error;
      if (!isRecoverableDisconnectedIncoming(incoming) || streamError && streamError.code !== "ECONNRESET") return false;
      finish(() => {
        const recovered = readBodyBufferedBeforeDisconnect(incoming, chunks);
        if (recovered instanceof Error) reject(recovered);
        else if (recovered === void 0) reject(error ?? normalizeAbortError(request2, incoming));
        else {
          request2[bodyBufferKey] = recovered;
          resolve2(recovered);
        }
      });
      return true;
    };
    const onData = (chunk) => {
      chunks.push(toBufferChunk(chunk, incoming.readableEncoding));
    };
    const onEnd = () => {
      finish(() => {
        const buffer = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks);
        request2[bodyBufferKey] = buffer;
        resolve2(buffer);
      });
    };
    const onError = (error) => {
      if (recoverCompleteBodyAfterDisconnect(error)) return;
      finish(() => {
        reject(error);
      });
    };
    const onClose = () => {
      if (incoming.readableEnded) {
        onEnd();
        return;
      }
      if (recoverCompleteBodyAfterDisconnect()) return;
      finish(() => {
        reject(normalizeAbortError(request2, incoming));
      });
    };
    const cleanup = () => {
      incoming.off("data", onData);
      incoming.off("end", onEnd);
      incoming.off("error", onError);
      incoming.off("close", onClose);
      request2[bodyReadPromiseKey] = void 0;
    };
    incoming.on("data", onData);
    incoming.on("end", onEnd);
    incoming.on("error", onError);
    incoming.on("close", onClose);
    queueMicrotask(() => {
      if (settled) return;
      if (incoming.readableEnded) onEnd();
      else if (incoming.errored) onError(incoming.errored);
      else if (incoming.destroyed) onClose();
    });
  });
  request2[bodyReadPromiseKey] = promise;
  return promise;
};
var requestPrototype = {
  get method() {
    return this[methodKey];
  },
  get url() {
    return this[urlKey];
  },
  get headers() {
    return this[headersKey] ||= newHeadersFromIncoming(this[incomingKey]);
  },
  [abortRequest](reason) {
    if (this[abortReasonKey] === void 0) this[abortReasonKey] = reason;
    const abortController = this[abortControllerKey];
    if (abortController && !abortController.signal.aborted) abortController.abort(reason);
  },
  [getAbortController]() {
    this[abortControllerKey] ||= new AbortController();
    if (this[abortReasonKey] !== void 0 && !this[abortControllerKey].signal.aborted) this[abortControllerKey].abort(this[abortReasonKey]);
    return this[abortControllerKey];
  },
  [getRequestCache]() {
    const abortController = this[getAbortController]();
    if (this[requestCache]) return this[requestCache];
    const method = this.method;
    if (this[bodyConsumedDirectlyKey] && !(method === "GET" || method === "HEAD")) {
      this[bodyBufferKey] = void 0;
      const init = {
        method: method === "TRACE" ? "GET" : method,
        headers: this.headers,
        signal: abortController.signal
      };
      if (method !== "TRACE") {
        init.body = new ReadableStream({ start(c) {
          c.close();
        } });
        init.duplex = "half";
      }
      const req = new Request$1(this[urlKey], init);
      if (method === "TRACE") Object.defineProperty(req, "method", { get() {
        return "TRACE";
      } });
      return this[requestCache] = req;
    }
    return this[requestCache] = newRequestFromIncoming(this.method, this[urlKey], this.headers, this[incomingKey], abortController);
  },
  get body() {
    if (!this[bodyConsumedDirectlyKey]) return this[getRequestCache]().body;
    const request2 = this[getRequestCache]();
    if (!this[bodyLockReaderKey] && request2.body) this[bodyLockReaderKey] = request2.body.getReader();
    return request2.body;
  },
  get bodyUsed() {
    if (this[bodyConsumedDirectlyKey]) return true;
    if (this[requestCache]) return this[requestCache].bodyUsed;
    return false;
  }
};
Object.defineProperty(requestPrototype, "signal", { get() {
  return this[getAbortController]().signal;
} });
[
  "cache",
  "credentials",
  "destination",
  "integrity",
  "mode",
  "redirect",
  "referrer",
  "referrerPolicy",
  "keepalive"
].forEach((k) => {
  Object.defineProperty(requestPrototype, k, { get() {
    return this[getRequestCache]()[k];
  } });
});
["clone", "formData"].forEach((k) => {
  Object.defineProperty(requestPrototype, k, { value: function() {
    if (this[bodyConsumedDirectlyKey]) {
      if (k === "clone") throw newBodyUnusableError();
      return rejectBodyUnusable();
    }
    return this[getRequestCache]()[k]();
  } });
});
Object.defineProperty(requestPrototype, "text", { value: function() {
  return readBodyWithFastPath(this, "text", (buf) => textDecoder.decode(buf));
} });
Object.defineProperty(requestPrototype, "arrayBuffer", { value: function() {
  return readBodyWithFastPath(this, "arrayBuffer", (buf) => toArrayBuffer(buf));
} });
Object.defineProperty(requestPrototype, "blob", { value: function() {
  return readBodyWithFastPath(this, "blob", (buf, request2) => {
    const type = contentType(request2);
    const init = type ? { headers: { "content-type": type } } : void 0;
    return new Response(buf, init).blob();
  });
} });
Object.defineProperty(requestPrototype, "json", { value: function() {
  if (this[bodyConsumedDirectlyKey]) return rejectBodyUnusable();
  return this.text().then(JSON.parse);
} });
Object.defineProperty(requestPrototype, /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom"), { value: function(depth, options, inspectFn) {
  return `Request (lightweight) ${inspectFn({
    method: this.method,
    url: this.url,
    headers: this.headers,
    nativeRequest: this[requestCache]
  }, {
    ...options,
    depth: depth == null ? null : depth - 1
  })}`;
} });
Object.setPrototypeOf(requestPrototype, Request$1.prototype);
var newRequest = (incoming, defaultHostname) => {
  const req = Object.create(requestPrototype);
  req[incomingKey] = incoming;
  req[methodKey] = normalizeIncomingMethod(incoming.method);
  const incomingUrl = incoming.url || "";
  if (incomingUrl[0] !== "/" && (incomingUrl.startsWith("http://") || incomingUrl.startsWith("https://"))) {
    if (incoming instanceof Http2ServerRequest) throw new RequestError("Absolute URL for :path is not allowed in HTTP/2");
    try {
      req[urlKey] = new URL(incomingUrl).href;
    } catch (e) {
      throw new RequestError("Invalid absolute URL", { cause: e });
    }
    return req;
  }
  const host = (incoming instanceof Http2ServerRequest ? incoming.authority : incoming.headers.host) || defaultHostname;
  if (!host) throw new RequestError("Missing host header");
  let scheme;
  if (incoming instanceof Http2ServerRequest) {
    scheme = incoming.scheme;
    if (!(scheme === "http" || scheme === "https")) throw new RequestError("Unsupported scheme");
  } else scheme = incoming.socket && incoming.socket.encrypted ? "https" : "http";
  try {
    req[urlKey] = buildUrl(scheme, host, incomingUrl);
  } catch (e) {
    if (e instanceof RequestError) throw e;
    else throw new RequestError("Invalid URL", { cause: e });
  }
  return req;
};
var defaultContentType = "text/plain; charset=UTF-8";
var responseCache = /* @__PURE__ */ Symbol("responseCache");
var getResponseCache = /* @__PURE__ */ Symbol("getResponseCache");
var cacheKey = /* @__PURE__ */ Symbol("cache");
var GlobalResponse = global.Response;
var Response$1 = class Response$12 {
  #body;
  #init;
  [getResponseCache]() {
    const cache = this[cacheKey];
    const liveHeaders = cache && cache[2] instanceof Headers ? cache[2] : void 0;
    delete this[cacheKey];
    return this[responseCache] ||= new GlobalResponse(this.#body, liveHeaders ? {
      status: this.#init?.status,
      statusText: this.#init?.statusText,
      headers: liveHeaders
    } : this.#init);
  }
  constructor(body, init) {
    let headers;
    this.#body = body;
    if (init instanceof GlobalResponse) {
      const cachedGlobalResponse = init[responseCache];
      if (cachedGlobalResponse) {
        this.#init = cachedGlobalResponse;
        this[getResponseCache]();
        return;
      }
      this.#init = init instanceof Response$12 ? init.#init : init;
      headers = new Headers(init.headers);
    } else this.#init = init;
    if (body == null || typeof body === "string" || typeof body?.getReader !== "undefined" || body instanceof Blob || body instanceof Uint8Array) this[cacheKey] = [
      init?.status || 200,
      body ?? null,
      headers || init?.headers
    ];
  }
  get headers() {
    const cache = this[cacheKey];
    if (cache) {
      if (!(cache[2] instanceof Headers)) cache[2] = new Headers(cache[2] || (cache[1] === null ? void 0 : { "content-type": defaultContentType }));
      return cache[2];
    }
    return this[getResponseCache]().headers;
  }
  get status() {
    return this[cacheKey]?.[0] ?? this[getResponseCache]().status;
  }
  get ok() {
    const status = this.status;
    return status >= 200 && status < 300;
  }
};
[
  "body",
  "bodyUsed",
  "redirected",
  "statusText",
  "trailers",
  "type",
  "url"
].forEach((k) => {
  Object.defineProperty(Response$1.prototype, k, { get() {
    return this[getResponseCache]()[k];
  } });
});
[
  "arrayBuffer",
  "blob",
  "clone",
  "formData",
  "json",
  "text"
].forEach((k) => {
  Object.defineProperty(Response$1.prototype, k, { value: function() {
    return this[getResponseCache]()[k]();
  } });
});
Object.defineProperty(Response$1.prototype, /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom"), { value: function(depth, options, inspectFn) {
  return `Response (lightweight) ${inspectFn({
    status: this.status,
    headers: this.headers,
    ok: this.ok,
    nativeResponse: this[responseCache]
  }, {
    ...options,
    depth: depth == null ? null : depth - 1
  })}`;
} });
Object.setPrototypeOf(Response$1, GlobalResponse);
Object.setPrototypeOf(Response$1.prototype, GlobalResponse.prototype);
var validRedirectUrl = /^https?:\/\/[!#-;=?-[\]_a-z~A-Z]+$/;
var parseRedirectUrl = (url) => {
  if (url instanceof URL) return url.href;
  if (validRedirectUrl.test(url)) return url;
  return new URL(url).href;
};
var validRedirectStatuses = /* @__PURE__ */ new Set([
  301,
  302,
  303,
  307,
  308
]);
Object.defineProperty(Response$1, "redirect", {
  value: function redirect(url, status = 302) {
    if (!validRedirectStatuses.has(status)) throw new RangeError("Invalid status code");
    return new Response$1(null, {
      status,
      headers: { location: parseRedirectUrl(url) }
    });
  },
  writable: true,
  configurable: true
});
Object.defineProperty(Response$1, "json", {
  value: function json(data, init) {
    const body = JSON.stringify(data);
    if (body === void 0) throw new TypeError("The data is not JSON serializable");
    const initHeaders = init?.headers;
    let headers;
    if (initHeaders) {
      headers = new Headers(initHeaders);
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
    } else headers = { "content-type": "application/json" };
    return new Response$1(body, {
      status: init?.status ?? 200,
      statusText: init?.statusText,
      headers
    });
  },
  writable: true,
  configurable: true
});
async function readWithoutBlocking(readPromise) {
  return Promise.race([readPromise, Promise.resolve().then(() => Promise.resolve(void 0))]);
}
function writeFromReadableStreamDefaultReader(reader, writable, currentReadPromise) {
  const cancel = (error) => {
    reader.cancel(error).catch(() => {
    });
  };
  writable.on("close", cancel);
  writable.on("error", cancel);
  (currentReadPromise ?? reader.read()).then(flow, handleStreamError);
  return reader.closed.finally(() => {
    writable.off("close", cancel);
    writable.off("error", cancel);
  });
  function handleStreamError(error) {
    if (error) writable.destroy(error);
  }
  function onDrain() {
    reader.read().then(flow, handleStreamError);
  }
  function flow({ done, value }) {
    try {
      if (done) writable.end();
      else if (!writable.write(value)) writable.once("drain", onDrain);
      else return reader.read().then(flow, handleStreamError);
    } catch (e) {
      handleStreamError(e);
    }
  }
}
function writeFromReadableStream(stream, writable) {
  if (stream.locked) throw new TypeError("ReadableStream is locked.");
  else if (writable.destroyed) return;
  return writeFromReadableStreamDefaultReader(stream.getReader(), writable);
}
var buildOutgoingHttpHeaders = (headers, defaultContentType2) => {
  const res = {};
  if (!(headers instanceof Headers)) headers = new Headers(headers ?? void 0);
  if (headers.has("set-cookie")) {
    const cookies = [];
    for (const [k, v] of headers) if (k === "set-cookie") cookies.push(v);
    else res[k] = v;
    if (cookies.length > 0) res["set-cookie"] = cookies;
  } else for (const [k, v] of headers) res[k] = v;
  if (defaultContentType2) res["content-type"] ??= defaultContentType2;
  return res;
};
var outgoingEnded = /* @__PURE__ */ Symbol("outgoingEnded");
var incomingDraining = /* @__PURE__ */ Symbol("incomingDraining");
var DRAIN_TIMEOUT_MS = 500;
var MAX_DRAIN_BYTES = 64 * 1024 * 1024;
var drainIncoming = (incoming) => {
  const incomingWithDrainState = incoming;
  if (incoming.destroyed || incomingWithDrainState[incomingDraining]) return;
  incomingWithDrainState[incomingDraining] = true;
  if (incoming instanceof Http2ServerRequest) {
    try {
      incoming.stream?.close?.(constants.NGHTTP2_NO_ERROR);
    } catch {
    }
    return;
  }
  let bytesRead = 0;
  const cleanup = () => {
    clearTimeout(timer);
    incoming.off("data", onData);
    incoming.off("end", cleanup);
    incoming.off("error", cleanup);
  };
  const forceClose = () => {
    cleanup();
    const socket = incoming.socket;
    if (socket && !socket.destroyed) {
      if (typeof socket.destroySoon === "function") socket.destroySoon();
      else if (typeof socket.destroy === "function") socket.destroy();
    }
  };
  const timer = setTimeout(forceClose, DRAIN_TIMEOUT_MS);
  timer.unref?.();
  const onData = (chunk) => {
    bytesRead += chunk.length;
    if (bytesRead > MAX_DRAIN_BYTES) forceClose();
  };
  incoming.on("data", onData);
  incoming.on("end", cleanup);
  incoming.on("error", cleanup);
  incoming.resume();
};
var makeCloseHandler = (req, incoming, outgoing, needsBodyCleanup) => () => {
  if (incoming.errored) {
    recordBodyBufferedBeforeDisconnect(incoming);
    req[abortRequest](incoming.errored.toString());
  } else if (!outgoing.writableFinished) {
    recordBodyBufferedBeforeDisconnect(incoming);
    req[abortRequest]("Client connection prematurely closed.");
  }
  if (needsBodyCleanup && !incoming.readableEnded) setTimeout(() => {
    if (!incoming.readableEnded) setTimeout(() => {
      drainIncoming(incoming);
    });
  });
};
var isImmediateCacheableResponse = (res) => {
  if (!(cacheKey in res)) return false;
  const body = res[cacheKey][1];
  return body === null || typeof body === "string" || body instanceof Uint8Array;
};
var handleRequestError = () => new Response(null, { status: 400 });
var handleFetchError = (e) => new Response(null, { status: e instanceof Error && (e.name === "TimeoutError" || e.constructor.name === "TimeoutError") ? 504 : 500 });
var handleResponseError = (e, outgoing) => {
  const err = e instanceof Error ? e : new Error("unknown error", { cause: e });
  if (err.code === "ERR_STREAM_PREMATURE_CLOSE") console.info("The user aborted a request.");
  else {
    console.error(e);
    if (!outgoing.headersSent) outgoing.writeHead(500, { "Content-Type": "text/plain" });
    outgoing.end(`Error: ${err.message}`);
    outgoing.destroy(err);
  }
};
var flushHeaders = (outgoing) => {
  if ("flushHeaders" in outgoing && outgoing.writable) outgoing.flushHeaders();
};
var responseViaCache = async (res, outgoing) => {
  let [status, body, header] = res[cacheKey];
  if (!header) {
    if (body === null) {
      outgoing.writeHead(status);
      outgoing.end();
    } else if (typeof body === "string") {
      outgoing.writeHead(status, {
        "Content-Type": defaultContentType,
        "Content-Length": Buffer.byteLength(body)
      });
      outgoing.end(body);
    } else if (body instanceof Uint8Array) {
      outgoing.writeHead(status, {
        "Content-Type": defaultContentType,
        "Content-Length": body.byteLength
      });
      outgoing.end(body);
    } else if (body instanceof Blob) {
      outgoing.writeHead(status, {
        "Content-Type": defaultContentType,
        "Content-Length": body.size
      });
      outgoing.end(new Uint8Array(await body.arrayBuffer()));
    } else {
      outgoing.writeHead(status, { "Content-Type": defaultContentType });
      flushHeaders(outgoing);
      await writeFromReadableStream(body, outgoing)?.catch((e) => handleResponseError(e, outgoing));
    }
    outgoing[outgoingEnded]?.();
    return;
  }
  let hasContentLength = false;
  if (header instanceof Headers) {
    hasContentLength = header.has("content-length");
    header = buildOutgoingHttpHeaders(header, body === null ? void 0 : defaultContentType);
  } else if (Array.isArray(header)) {
    const headerObj = new Headers(header);
    hasContentLength = headerObj.has("content-length");
    header = buildOutgoingHttpHeaders(headerObj, body === null ? void 0 : defaultContentType);
  } else for (const key in header) if (key.length === 14 && key.toLowerCase() === "content-length") {
    hasContentLength = true;
    break;
  }
  if (!hasContentLength) {
    if (typeof body === "string") header["Content-Length"] = Buffer.byteLength(body);
    else if (body instanceof Uint8Array) header["Content-Length"] = body.byteLength;
    else if (body instanceof Blob) header["Content-Length"] = body.size;
  }
  outgoing.writeHead(status, header);
  if (body == null) outgoing.end();
  else if (typeof body === "string" || body instanceof Uint8Array) outgoing.end(body);
  else if (body instanceof Blob) outgoing.end(new Uint8Array(await body.arrayBuffer()));
  else {
    flushHeaders(outgoing);
    await writeFromReadableStream(body, outgoing)?.catch((e) => handleResponseError(e, outgoing));
  }
  outgoing[outgoingEnded]?.();
};
var isPromise = (res) => typeof res.then === "function";
var responseViaResponseObject = async (res, outgoing, options = {}) => {
  if (isPromise(res)) if (options.errorHandler) try {
    res = await res;
  } catch (err) {
    const errRes = await options.errorHandler(err);
    if (!errRes) return;
    res = errRes;
  }
  else res = await res.catch(handleFetchError);
  if (cacheKey in res) return responseViaCache(res, outgoing);
  const resHeaderRecord = buildOutgoingHttpHeaders(res.headers, res.body === null ? void 0 : defaultContentType);
  if (res.body) {
    const reader = res.body.getReader();
    const values = [];
    let done = false;
    let currentReadPromise = void 0;
    if (resHeaderRecord["transfer-encoding"] !== "chunked") {
      let maxReadCount = 2;
      for (let i = 0; i < maxReadCount; i++) {
        currentReadPromise ||= reader.read();
        const chunk = await readWithoutBlocking(currentReadPromise).catch((e) => {
          console.error(e);
          done = true;
        });
        if (!chunk) {
          if (i === 1) {
            await new Promise((resolve2) => setTimeout(resolve2));
            maxReadCount = 3;
            continue;
          }
          break;
        }
        currentReadPromise = void 0;
        if (chunk.value) values.push(chunk.value);
        if (chunk.done) {
          done = true;
          break;
        }
      }
      if (done && !("content-length" in resHeaderRecord)) resHeaderRecord["content-length"] = values.reduce((acc, value) => acc + value.length, 0);
    }
    outgoing.writeHead(res.status, resHeaderRecord);
    values.forEach((value) => {
      outgoing.write(value);
    });
    if (done) outgoing.end();
    else {
      if (values.length === 0) flushHeaders(outgoing);
      await writeFromReadableStreamDefaultReader(reader, outgoing, currentReadPromise);
    }
  } else if (resHeaderRecord[X_ALREADY_SENT]) ;
  else {
    outgoing.writeHead(res.status, resHeaderRecord);
    outgoing.end();
  }
  outgoing[outgoingEnded]?.();
};
var getRequestListener = (fetchCallback, options = {}) => {
  const autoCleanupIncoming = options.autoCleanupIncoming ?? true;
  if (options.overrideGlobalObjects !== false && global.Request !== Request$1) {
    Object.defineProperty(global, "Request", { value: Request$1 });
    Object.defineProperty(global, "Response", { value: Response$1 });
  }
  return async (incoming, outgoing) => {
    let res, req;
    let needsBodyCleanup = false;
    let closeHandlerAttached = false;
    const ensureCloseHandler = () => {
      if (!req || closeHandlerAttached) return;
      closeHandlerAttached = true;
      outgoing.on("close", makeCloseHandler(req, incoming, outgoing, needsBodyCleanup));
    };
    try {
      req = newRequest(incoming, options.hostname);
      needsBodyCleanup = autoCleanupIncoming && !(incoming.method === "GET" || incoming.method === "HEAD");
      if (needsBodyCleanup) {
        incoming[wrapBodyStream] = true;
        if (incoming instanceof Http2ServerRequest) outgoing[outgoingEnded] = () => {
          if (!incoming.readableEnded) setTimeout(() => {
            if (!incoming.readableEnded) setTimeout(() => {
              incoming.destroy();
              outgoing.destroy();
            });
          });
        };
      }
      res = fetchCallback(req, {
        incoming,
        outgoing
      });
      if (!isPromise(res) && isImmediateCacheableResponse(res)) {
        if (needsBodyCleanup && !incoming.readableEnded) outgoing.once("finish", () => {
          if (!incoming.readableEnded) drainIncoming(incoming);
        });
        return responseViaCache(res, outgoing);
      }
      ensureCloseHandler();
    } catch (e) {
      if (!res) if (options.errorHandler) {
        ensureCloseHandler();
        res = await options.errorHandler(req ? e : toRequestError(e));
        if (!res) return;
      } else if (!req) res = handleRequestError();
      else res = handleFetchError(e);
      else return handleResponseError(e, outgoing);
    }
    try {
      return await responseViaResponseObject(res, outgoing, options);
    } catch (e) {
      return handleResponseError(e, outgoing);
    }
  };
};
createRequire(import.meta.url);
var MAX_AUTO_ROWS = 1e3;
var PURE_FUNCTIONS = /* @__PURE__ */ new Set([
  // aggregates
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "bool_and",
  "bool_or",
  "every",
  "string_agg",
  "array_agg",
  "group_concat",
  "json_agg",
  "jsonb_agg",
  "json_object_agg",
  "jsonb_object_agg",
  "stddev",
  "stddev_pop",
  "stddev_samp",
  "variance",
  "var_pop",
  "var_samp",
  "percentile_cont",
  "percentile_disc",
  "mode",
  // window ranking
  "row_number",
  "rank",
  "dense_rank",
  "percent_rank",
  "cume_dist",
  "ntile",
  "lag",
  "lead",
  "first_value",
  "last_value",
  "nth_value",
  // conditional and casts
  "coalesce",
  "nullif",
  "greatest",
  "least",
  "cast",
  "ifnull",
  "isnull",
  "nvl",
  "iif",
  // strings
  "lower",
  "upper",
  "trim",
  "ltrim",
  "rtrim",
  "btrim",
  "length",
  "char_length",
  "character_length",
  "octet_length",
  "substring",
  "substr",
  "left",
  "right",
  "concat",
  "concat_ws",
  "replace",
  "position",
  "strpos",
  "split_part",
  "lpad",
  "rpad",
  "initcap",
  "reverse",
  "format",
  "to_char",
  // numbers
  "abs",
  "round",
  "floor",
  "ceil",
  "ceiling",
  "trunc",
  "mod",
  "power",
  "sqrt",
  "sign",
  "to_number",
  // dates and times
  "now",
  "current_timestamp",
  "current_date",
  "date_trunc",
  "date_part",
  "extract",
  "age",
  "to_date",
  "to_timestamp",
  "date",
  "year",
  "month",
  "day",
  "datediff",
  "dateadd",
  "date_add",
  "date_sub",
  "date_format",
  "make_date",
  "make_interval",
  "justify_interval",
  // json reads
  "json_extract_path_text",
  "jsonb_extract_path_text",
  "json_array_length",
  "jsonb_array_length"
]);
var PAREN_KEYWORDS = /* @__PURE__ */ new Set([
  "select",
  "from",
  "where",
  "in",
  "exists",
  "on",
  "using",
  "as",
  "and",
  "or",
  "not",
  "any",
  "all",
  "some",
  "values",
  "case",
  "when",
  "then",
  "else",
  "between",
  "distinct",
  "having",
  "limit",
  "offset",
  "lateral",
  "order",
  "group",
  "with",
  "array",
  "row"
]);
var AGGREGATES = /* @__PURE__ */ new Set([
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "bool_and",
  "bool_or",
  "every",
  "string_agg",
  "array_agg",
  "group_concat",
  "json_agg",
  "jsonb_agg"
]);
var TEXT_FUNCTIONS = /* @__PURE__ */ new Set([
  "lower",
  "upper",
  "trim",
  "ltrim",
  "rtrim",
  "btrim",
  "length",
  "char_length",
  "character_length",
  "octet_length",
  "substring",
  "substr",
  "left",
  "right",
  "replace",
  "position",
  "strpos",
  "split_part",
  "lpad",
  "rpad",
  "initcap",
  "reverse"
]);
var NUMERIC_FUNCTIONS = /* @__PURE__ */ new Set(["abs", "round", "floor", "ceil", "ceiling", "trunc", "mod", "power", "sqrt", "sign"]);
var TEXT_TYPES = /* @__PURE__ */ new Set(["text", "varchar", "character", "char", "bpchar", "name", "citext", "nvarchar", "nchar"]);
var NUMERIC_TYPES = /* @__PURE__ */ new Set([
  "numeric",
  "decimal",
  "int",
  "integer",
  "int2",
  "int4",
  "int8",
  "smallint",
  "bigint",
  "real",
  "float",
  "float4",
  "float8",
  "double"
]);
var READ_HINTS = /* @__PURE__ */ new Set(["nolock", "readuncommitted"]);
function maskSql(sql, dialect, backslashEscapes) {
  const mysqlRules = dialect === void 0 || dialect === "mysql";
  let out = "";
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "{" && sql[i + 1] === "{") {
      const end = sql.indexOf("}}", i + 2);
      if (end < 0)
        return { refusal: "its {{ }} bindings do not close" };
      out += "''";
      i = end + 1;
    } else if (ch === "'") {
      let closed = false;
      while (++i < sql.length) {
        if (sql[i] === "\\" && backslashEscapes) {
          i++;
          continue;
        }
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            i++;
            continue;
          }
          closed = true;
          break;
        }
      }
      if (!closed)
        return { refusal: "a string literal does not close" };
      out += "''";
    } else if (ch === '"' || ch === "`" || ch === "[" && dialect === "mssql") {
      const close = ch === "[" ? "]" : ch;
      const end = sql.indexOf(close, i + 1);
      if (end < 0)
        return { refusal: "a quoted identifier does not close" };
      out += " _q ";
      i = end;
    } else if (ch === "-" && sql[i + 1] === "-") {
      if (mysqlRules && !/^[\s\x00-\x1f]$/.test(sql[i + 2] ?? "")) {
        return { refusal: "it has -- without a space after it, which MySQL does not read as a comment" };
      }
      while (i < sql.length && sql[i] !== "\n")
        i++;
      out += " ";
    } else if (ch === "#" && mysqlRules) {
      return { refusal: "it has a #, which starts a comment in MySQL" };
    } else if (ch === "/" && sql[i + 1] === "*") {
      if (/^\/\*\s*(?:!|M!|\+)/.test(sql.slice(i)))
        return { refusal: "it has an executable comment or optimizer hint (/*! */, /*M! */, /*+ */)" };
      const end = sql.indexOf("*/", i + 2);
      if (end < 0)
        return { refusal: "a comment does not close" };
      out += " ";
      i = end + 1;
    } else if (ch === "$" && /^\$[A-Za-z_]*\$/.test(sql.slice(i))) {
      return { refusal: "it uses dollar quoting" };
    } else
      out += ch;
  }
  return { text: out.replace(/\s+/g, " ").trim().replace(/;\s*$/, "").trim().toLowerCase() };
}
function maskBothWays(sql, dialect) {
  const plain = maskSql(sql, dialect, false);
  const escaped = maskSql(sql, dialect, true);
  if ("refusal" in plain)
    return plain;
  if ("refusal" in escaped)
    return escaped;
  if (plain.text !== escaped.text)
    return { refusal: "its string literals read differently with and without backslash escapes" };
  return plain;
}
function topLevel(sql) {
  let depth = 0;
  let out = "";
  for (const ch of sql) {
    if (ch === "(") {
      if (depth === 0)
        out += "(";
      depth++;
    } else if (ch === ")") {
      depth--;
      if (depth < 0)
        return void 0;
      if (depth === 0)
        out += ")";
    } else if (depth === 0)
      out += ch;
  }
  return depth === 0 ? out : void 0;
}
var FROM_END = /^(where|group|order|limit|having|window|union|intersect|except|fetch|offset|for|qualify|returning|on|using)\b/;
function crossProduct(masked) {
  const sql = masked.toLowerCase();
  if (/\bcross\s+(join|apply)\b/.test(sql))
    return "it has a CROSS JOIN";
  if (/\bnatural\s+((left|right|full|inner)\s+)?(outer\s+)?join\b/.test(sql))
    return "it has a NATURAL JOIN";
  if (/\bon\s*\(?\s*(true|1\s*=\s*1|0\s*=\s*0)\s*\)?(?=\s|$|\))/.test(sql))
    return "it joins ON a condition that is always true";
  for (const match of sql.matchAll(/\bfrom\b/g)) {
    let depth = 0;
    for (let i = match.index + 4; i < sql.length; i++) {
      const ch = sql[i];
      if (ch === "(")
        depth++;
      else if (ch === ")") {
        if (--depth < 0)
          break;
      } else if (depth === 0) {
        if (ch === ",")
          return "it lists tables separated by commas in FROM (an implicit cross join)";
        if (ch === ";")
          break;
        if (/[a-z_]/.test(ch) && !/[a-z0-9_$]/.test(sql[i - 1] ?? " ") && FROM_END.test(sql.slice(i)))
          break;
      }
    }
  }
  return void 0;
}
var items = (clause) => clause.split(",").map((item) => item.trim()).filter(Boolean);
function closingParen(sql, open) {
  let depth = 0;
  for (let i = open; i < sql.length; i++) {
    if (sql[i] === "(")
      depth++;
    else if (sql[i] === ")" && --depth === 0)
      return i;
  }
  return -1;
}
function keywordCallAllowed(name, sql, at, dialect) {
  const before = sql.slice(0, at).trimEnd();
  if (name === "filter" || name === "over")
    return before.endsWith(")");
  if (name === "by")
    return /\b(?:order|group|partition)$/.test(before);
  if (name === "join")
    return /^join\s*\(\s*select\b/.test(sql.slice(at));
  if (name === "top")
    return (dialect === "mssql" || dialect === void 0) && /^select(?:\s+(?:distinct|all))?$/.test(before);
  return false;
}
function impureCall(sql, dialect) {
  const calls = sql.matchAll(/([a-z_][\w$]*(?:\s*\.\s*[a-z_][\w$]*)*|_q)\s*\(/g);
  for (const call of calls) {
    const name = call[1].replace(/\s+/g, "");
    if (name.includes(".") || name === "_q")
      return name;
    if (PAREN_KEYWORDS.has(name))
      continue;
    if (["filter", "over", "by", "join", "top"].includes(name)) {
      if (keywordCallAllowed(name, sql, call.index, dialect))
        continue;
      return name;
    }
    if (!PURE_FUNCTIONS.has(name))
      return name;
  }
  return void 0;
}
function overloadedCall(sql) {
  for (const call of sql.matchAll(/\b([a-z_][\w$]*)\s*\(/g)) {
    const name = call[1];
    const family = TEXT_FUNCTIONS.has(name) ? TEXT_TYPES : NUMERIC_FUNCTIONS.has(name) ? NUMERIC_TYPES : void 0;
    if (!family)
      continue;
    const open = call.index + call[0].length - 1;
    const close = closingParen(sql, open);
    const args = sql.slice(open + 1, close < 0 ? void 0 : close);
    const casts = [...args.matchAll(/::\s*([a-z_][\w$]*)/g), ...args.matchAll(/\bcast\s*\([^]*?\bas\s+([a-z_][\w$]*)/g)];
    const foreign = casts.map((cast) => cast[1]).find((type) => !family.has(type));
    if (foreign)
      return `${name}() with an argument cast to ${foreign === "_q" ? "a quoted type" : foreign}`;
  }
  return void 0;
}
function topBound(masked) {
  const head = masked.match(/^select\s+(?:(?:distinct|all)\s+)?top\b\s*(.*)$/);
  if (!head)
    return void 0;
  const count = head[1].match(/^(?:\(\s*(\d+)\s*\)|(\d+)\b)\s*(.*)$/);
  if (!count)
    return { refusal: "its TOP is not a fixed row count" };
  if (/^percent\b/.test(count[3]))
    return { refusal: "its TOP is a PERCENT of the rows, not a fixed row count" };
  if (/^with\s+ties\b/.test(count[3]))
    return { refusal: "its TOP ... WITH TIES can return more rows than its count" };
  return { rows: Number(count[1] ?? count[2]) };
}
function autoReadSqlRefusal(sql, dialect) {
  const read = maskBothWays(sql, dialect);
  if ("refusal" in read)
    return `its SQL cannot be read with certainty: ${read.refusal}`;
  const masked = read.text;
  if (!masked || masked.includes(";"))
    return "it is empty or has more than one statement";
  const top = topLevel(masked);
  if (top === void 0)
    return "its parentheses do not balance";
  if (/^with\b/.test(top))
    return "a statement with a WITH list (CTE) is not run automatically";
  if (!/^select\b/.test(top))
    return "only a single SELECT is run automatically";
  if (/\b(union|intersect|except)\b/.test(top))
    return "UNION, INTERSECT and EXCEPT are not run automatically";
  if (/\b(insert|update|delete|merge|upsert|truncate|drop|alter|create|grant|revoke|copy|call|exec|execute|into|lock)\b/.test(masked)) {
    return "it contains a statement that writes or runs code";
  }
  if (/\bfor\s+(update|share|no\s+key\s+update|key\s+share)\b/.test(top))
    return "a locking SELECT is not run automatically";
  if (/\bnext\s+value\s+for\b/.test(masked))
    return "it takes NEXT VALUE FOR a sequence, which advances it";
  if (/:=/.test(masked))
    return "it assigns a variable (:=)";
  if (/\b(updlock|xlock|holdlock|tablock|tablockx|paglock|rowlock|serializable|repeatableread|readcommittedlock)\b/.test(masked)) {
    return "it has a table hint that takes or holds locks";
  }
  for (const hint of masked.matchAll(/\bwith\s*\(([^()]*)\)/g)) {
    const names = hint[1].split(",").map((name) => name.trim()).filter(Boolean);
    if (!names.length || names.some((name) => !READ_HINTS.has(name)))
      return `it has the table hint WITH (${hint[1].trim()}), which is not a plain read`;
  }
  if (/\boption\s*\(/.test(masked))
    return "it has a query hint (OPTION (...))";
  if (/\bwith\s+ties\b/.test(masked))
    return "WITH TIES can return more rows than its limit";
  const product = crossProduct(masked);
  if (product)
    return `${product}, which can read the product of its tables however small its LIMIT; join on a condition`;
  const fn = impureCall(masked, dialect);
  if (fn)
    return `it calls ${fn}(), which is not a well-known pure function`;
  const overload = overloadedCall(masked);
  if (overload)
    return `it calls ${overload}, which is not the built-in function's signature (another overload would run)`;
  const limit = top.match(/\blimit\s+(\d+)(?:\s*,\s*(\d+))?(?:\s+offset\s+\d+)?$/) ?? top.match(/\boffset\s+\d+(?:\s+rows?)?\s+limit\s+(\d+)$/);
  const fetch = top.match(/\bfetch\s+(?:first|next)\s+(\d+)\s+rows?\s+only$/);
  const topN = topBound(masked);
  if (topN && "refusal" in topN)
    return topN.refusal;
  const bounds = [limit ? Number(limit[2] ?? limit[1]) : void 0, fetch ? Number(fetch[1]) : void 0, topN?.rows].filter((n) => n !== void 0);
  const bound = bounds.length ? Math.min(...bounds) : void 0;
  if (bound !== void 0) {
    return bound <= MAX_AUTO_ROWS ? void 0 : `its LIMIT ${bound} is above the ${MAX_AUTO_ROWS}-row automatic bound`;
  }
  if (/\b(limit|fetch|top)\b/.test(masked)) {
    return "its row limit is not the final clause of the outer SELECT (a LIMIT in a subquery bounds nothing it returns)";
  }
  const from = top.search(/\bfrom\b/);
  if (from < 0)
    return void 0;
  const projection = items(top.slice("select".length, from).replace(/^\s*distinct\b/, ""));
  const aggregateOnly = projection.length > 0 && projection.every((item) => {
    const m = item.match(/^([a-z_][\w$]*)\s*\(\)(?:\s+(?:as\s+)?[a-z_][\w$]*)?$/);
    return !!m && AGGREGATES.has(m[1]);
  });
  if (aggregateOnly && !/\b(group\s+by|over)\b/.test(top.slice(from)))
    return void 0;
  return "it has no row limit on the outer SELECT";
}
var sqlDialectOf = (kind) => kind ? SQL_DIALECT[kind.toLowerCase()] : void 0;
function batchSafeRead(query) {
  const assessment = assessQueryRead(query);
  if (assessment.provenRead && assessment.directSafe && !assessment.selectStar) {
    const refusal = resolvedReadRefusal(query, assessment, resolveStaticBindings(query.options).resolved);
    return refusal ? { safe: false, reason: refusal } : { safe: true };
  }
  if (assessment.provenRead && assessment.requiresRemoteReadConfirmation) {
    return {
      safe: false,
      reason: `${assessment.reason ?? "remote read"} run_queries cannot run remote reads at all. Use singular run_query for this one: tell the user which saved query will run, and once they approve, call run_query with user_confirmed_remote_read:true. Do not retry run_queries with it.`
    };
  }
  return {
    safe: false,
    reason: assessment.reason ?? (assessment.requiresCountPreflight ? "read requires a count-first preflight through singular run_query" : "query is not a proven bounded read")
  };
}
var NOT_CHECKED_AUTOMATICALLY = "not checked automatically, run it explicitly with run_query: ";
var AUTO_SQL_KINDS = /* @__PURE__ */ new Set(["postgresql", "mysql", "mariadb", "mssql", "oracledb"]);
var MODE_REQUIRED = /* @__PURE__ */ new Set(["postgresql", "mysql", "mssql"]);
var TOOLJETDB_LIST_ROWS_KEYS = /* @__PURE__ */ new Set(["limit", "offset", "where_filters", "order_filters", "aggregates", "group_by"]);
var record = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
var hasText = (value) => typeof value === "string" && !!value.trim();
function sqlRefusal(kind, options, sql) {
  if (!sql)
    return "its SQL text is empty";
  const dialect = sqlDialectOf(kind);
  const saved = autoReadSqlRefusal(sql, dialect);
  if (saved)
    return saved;
  let resolvedOptions;
  try {
    resolvedOptions = applyResolvedBindings(options, resolveStaticBindings(options).resolved);
  } catch {
    return "its bindings cannot be resolved without a browser";
  }
  const resolved = kind === "tooljetdb" ? record(resolvedOptions.sql_execution)?.sqlQuery : (() => {
    const path = sqlConnectorPath(kind, resolvedOptions);
    return path?.path === "sql" ? path.sql : void 0;
  })();
  if (typeof resolved !== "string")
    return "its SQL text is not text once its bindings resolve";
  if (resolved === sql)
    return void 0;
  const after = autoReadSqlRefusal(resolved, dialect);
  return after ? `once its {{ }} bindings resolve, ${after}` : void 0;
}
function connectorRefusal(query) {
  const kind = query.kind?.toLowerCase();
  const options = record(query.options);
  if (!kind || !options)
    return "its datasource kind or options are unavailable";
  if (kind === "tooljetdb") {
    if (options.operation === "list_rows") {
      if (options.limit !== void 0 || options.offset !== void 0) {
        return "it has a top-level limit or offset, which ToolJet Database ignores (it reads list_rows.limit and list_rows.offset)";
      }
      const stray = Object.keys(record(options.list_rows) ?? {}).filter((key) => !TOOLJETDB_LIST_ROWS_KEYS.has(key));
      return stray.length ? `its list_rows carries ${stray.join(", ")}, which ToolJet Database does not read` : void 0;
    }
    if (options.operation === "sql_execution")
      return sqlRefusal(kind, options, record(options.sql_execution)?.sqlQuery);
    return `ToolJet Database operation "${String(options.operation ?? "<missing>")}" is not one the automatic check runs`;
  }
  if (!AUTO_SQL_KINDS.has(kind)) {
    return `automatic checks run only ToolJet Database, PostgreSQL, MySQL, MariaDB, SQL Server and Oracle queries, whose read and write branches are known; this is a ${kind} query`;
  }
  const label = connectorLabel(kind);
  const mode = options.mode;
  if (MODE_REQUIRED.has(kind) && mode !== "sql" && mode !== "gui") {
    return `its mode is ${mode === void 0 ? "missing" : `"${String(mode)}"`}: ${label} runs a query only in mode "sql" or "gui"`;
  }
  if (mode !== void 0 && mode !== "sql" && mode !== "gui")
    return `its mode "${String(mode)}" is neither "sql" nor "gui"`;
  const path = sqlConnectorPath(kind, options);
  if (path.path === "not_read")
    return path.reason;
  if (path.path === "gui_list_rows") {
    if (hasText(options.query))
      return "it is a GUI query that also carries SQL text in query; remove the one that is not meant to run";
    const stray = Object.keys(record(options.list_rows) ?? {}).filter((key) => !GUI_LIST_ROWS_KEYS.has(key));
    if (stray.includes("limit") || stray.includes("offset")) {
      return `its row bound is in list_rows, which ${label} ignores (it applies only the top-level limit and offset), so it is unbounded`;
    }
    if (stray.length)
      return `its list_rows carries ${stray.join(", ")}, which ${label} does not read`;
    if (options.limit === void 0)
      return `it has no top-level limit, which is where ${label} applies the row limit`;
    return void 0;
  }
  if (hasText(options.operation)) {
    return `it is a SQL query that also names the GUI operation "${String(options.operation)}"; remove the one that is not meant to run`;
  }
  return sqlRefusal(kind, options, path.sql);
}
function autoReadPreflight(query) {
  const general = batchSafeRead(query);
  if (!general.safe)
    return { run: false, reason: String(general.reason ?? "not a proven bounded read") };
  const refusal = connectorRefusal(query);
  return refusal ? { run: false, reason: `${NOT_CHECKED_AUTOMATICALLY}${refusal}` } : { run: true };
}
createRequire(import.meta.url);
var running = 0;
var grants = /* @__PURE__ */ new Set();
function reserveRenderAudit(grant) {
  const configured = Number(process.env.MCP_RENDER_AUDIT_MAX_BROWSERS ?? 2);
  const limit = Number.isInteger(configured) && configured >= 1 && configured <= 32 ? configured : 2;
  if (running >= limit || grant && grants.has(grant))
    return void 0;
  running++;
  if (grant)
    grants.add(grant);
  let released = false;
  return () => {
    if (released)
      return;
    released = true;
    running--;
    if (grant)
      grants.delete(grant);
  };
}
async function waitForRenderAudit(grant, timeoutMs = 6e4) {
  const deadline = Date.now() + timeoutMs;
  for (; ; ) {
    const release = reserveRenderAudit(grant);
    if (release || grant && grants.has(grant) || Date.now() >= deadline)
      return release;
    await new Promise((resolve2) => setTimeout(resolve2, 200));
  }
}
function httpUrl(value) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Render audit URLs must use HTTP(S) without embedded credentials");
  }
  return url;
}
function renderAuditOrigins(configuredBase, additional = "") {
  return /* @__PURE__ */ new Set([httpUrl(configuredBase).origin, ...additional.split(",").map((s) => s.trim()).filter(Boolean).map((s) => httpUrl(s).origin)]);
}
function isSandboxFrameDocument(url, configured = process.env.CODE_MODE_SANDBOX_URL) {
  if (!configured || !url.pathname.endsWith("/api/code-frame/frame.html"))
    return false;
  try {
    const sandbox = new URL(configured.replace("*.", "wildcard."));
    const host = sandbox.hostname.replace(/^wildcard\./, "");
    const hostMatches = configured.includes("*.") ? url.hostname.endsWith(`.${host}`) : url.hostname === host;
    return hostMatches && url.protocol === sandbox.protocol && url.port === sandbox.port;
  } catch {
    return false;
  }
}
function renderAuditUrlAllowed(value, origins) {
  try {
    const url = httpUrl(value);
    return origins.has(url.origin) || isSandboxFrameDocument(url);
  } catch {
    return false;
  }
}
function renderAuditPrivateOrigins(configuredBase) {
  const named = [process.env.TOOLJET_URL, process.env.MCP_RENDER_AUDIT_PRIVATE_ORIGINS].filter(Boolean).join(",");
  return renderAuditOrigins(configuredBase, named);
}
function renderAuditBase(configuredBase, override) {
  const origins = renderAuditOrigins(configuredBase, process.env.MCP_RENDER_AUDIT_ALLOWED_ORIGINS);
  const url = httpUrl(override ?? configuredBase);
  if (!origins.has(url.origin))
    throw new Error("viewer_url origin is not configured for render audits");
  if (url.search || url.hash)
    throw new Error("viewer_url must be a base URL without query or fragment");
  return { base: url.href.replace(/\/$/, ""), origins };
}
function hasBinding(value) {
  if (typeof value === "string")
    return value.includes("{{");
  if (Array.isArray(value))
    return value.some(hasBinding);
  return !!value && typeof value === "object" && Object.values(value).some(hasBinding);
}
function renderAuditRequest(url, method, saved) {
  if (["GET", "HEAD", "OPTIONS"].includes(method))
    return { allowed: true };
  const blocked = (detail) => ({ allowed: false, detail: `${detail}; this behavior was not verified` });
  if (method !== "POST" || !saved?.version_id)
    return blocked("A potentially mutating request was blocked");
  const parsed = httpUrl(url);
  const match = parsed.pathname.match(/\/api\/data-queries\/([A-Za-z0-9_-]+)(?:\/versions\/([A-Za-z0-9_-]+))?\/run(?:\/([A-Za-z0-9_-]+))?$/);
  if (!match || match[2] && (match[2] !== saved.version_id || !match[3] || parsed.searchParams.get("mode") !== "view") || !match[2] && match[3])
    return blocked("An unverified query or mutating request was blocked");
  const query = saved.queries.find((item) => item.id === match[1]);
  if (!query)
    return blocked("A query outside the audited app/version was blocked");
  const options = query.options;
  if (hasBinding(options))
    return blocked("A query with dynamic bindings was blocked");
  if (options?.requestConfirmation || options?.request_confirmation)
    return blocked("A query requiring confirmation was blocked");
  if (!autoReadPreflight(query).run)
    return blocked("A query that is not a proven bounded read was blocked");
  return { allowed: true, postData: JSON.stringify({ resolvedOptions: {} }) };
}
var INTERNAL = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4]
])
  INTERNAL.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8]
])
  INTERNAL.addSubnet(net, prefix, "ipv6");
var embeddedIpv4 = (address) => {
  const lower = address.toLowerCase();
  const dotted = /^(?:::ffff:|::|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (dotted)
    return dotted[1];
  const hex = /^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower);
  if (!hex)
    return void 0;
  const hi = parseInt(hex[1], 16);
  const lo = parseInt(hex[2], 16);
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
};
function internalAddress(address) {
  const family = isIP(address);
  if (family === 4)
    return INTERNAL.check(address, "ipv4");
  if (family !== 6)
    return true;
  const v4 = embeddedIpv4(address);
  if (v4)
    return INTERNAL.check(v4, "ipv4");
  return INTERNAL.check(address, "ipv6");
}
var systemResolver = (hostname) => lookup(hostname, { all: true, verbatim: true });
var literalHost = (hostname) => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return isIP(host) !== 0 || host === "localhost" || host.endsWith(".localhost");
};
function connectionKey(value) {
  try {
    const url = new URL(value);
    if (!/^(https?|wss?):$/.test(url.protocol))
      return void 0;
    return `${url.hostname.toLowerCase()}:${url.port || defaultPort(url.protocol)}`;
  } catch {
    return void 0;
  }
}
var HOP_BY_HOP = ["proxy-connection", "proxy-authorization", "connection", "keep-alive", "te", "trailer", "upgrade"];
var forwardHeaders = (headers) => {
  const out = { ...headers };
  for (const name of HOP_BY_HOP)
    delete out[name];
  return out;
};
var defaultPort = (protocol) => protocol === "https:" || protocol === "wss:" ? "443" : "80";
var tunnelTargets = (origins) => {
  const targets = /* @__PURE__ */ new Set();
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      targets.add(`${url.hostname.toLowerCase()}:${url.port || defaultPort(url.protocol)}`);
    } catch {
    }
  }
  return targets;
};
var tunnelTarget = (authority) => {
  if (!authority || !/:\d{1,5}$/.test(authority))
    return void 0;
  try {
    const url = new URL(`http://${authority}`);
    const port = /:(\d{1,5})$/.exec(authority)[1];
    return url.username || url.password || url.pathname !== "/" ? void 0 : `${url.hostname.toLowerCase()}:${port}`;
  } catch {
    return void 0;
  }
};
var unbracket = (hostname) => hostname.replace(/^\[|\]$/g, "");
async function startEgressProxy(origins, onBlocked = () => {
}, options = {}) {
  const tunnels = tunnelTargets(origins);
  const mayBeInternal = tunnelTargets(new Set([...origins].filter((origin) => {
    try {
      return options.privateOrigins?.has(new URL(origin).origin) || literalHost(new URL(origin).hostname);
    } catch {
      return false;
    }
  })));
  const resolver = options.resolve ?? systemResolver;
  const pin = async (host, port) => {
    const bare = unbracket(host);
    const internalOk = mayBeInternal.has(`${host.toLowerCase()}:${port}`);
    let addresses;
    if (isIP(bare))
      addresses = [bare];
    else {
      try {
        addresses = (await resolver(bare)).map((entry) => entry.address);
      } catch {
        return void 0;
      }
    }
    if (!addresses.length)
      return void 0;
    if (!internalOk && addresses.some(internalAddress))
      return void 0;
    return addresses[0];
  };
  const sockets = /* @__PURE__ */ new Set();
  const track = (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  };
  const refuseSocket = (socket, destination) => {
    socket.on("error", () => socket.destroy());
    onBlocked(destination);
    socket.end("HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
  };
  const tunnel = async (client, host, port, destination, first) => {
    client.on("error", () => client.destroy());
    const address2 = await pin(host, port);
    if (client.destroyed)
      return;
    if (!address2) {
      refuseSocket(client, destination);
      return;
    }
    const upstream = connect(port, address2, () => {
      first(upstream);
      upstream.pipe(client);
      client.pipe(upstream);
    });
    track(upstream);
    upstream.on("error", () => client.destroy());
    client.on("error", () => upstream.destroy());
  };
  const server = createServer((req, res) => {
    let url;
    try {
      url = new URL(req.url ?? "");
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (url.protocol !== "http:" || !renderAuditUrlAllowed(url.href, origins)) {
      onBlocked(connectionKey(url.href) ?? url.origin);
      res.writeHead(403, { "content-length": "0", connection: "close" }).end();
      return;
    }
    const port = Number(url.port || 80);
    req.on("error", () => res.destroy());
    req.pause();
    void pin(url.hostname, port).then((address2) => {
      if (!address2) {
        onBlocked(connectionKey(url.href) ?? url.origin);
        res.writeHead(403, { "content-length": "0", connection: "close" }).end();
        return;
      }
      const upstream = request({ host: address2, port, method: req.method, path: url.pathname + url.search, headers: forwardHeaders(req.headers) }, (answer) => {
        const headers = { ...answer.headers };
        for (const name of ["connection", "keep-alive", "transfer-encoding"])
          delete headers[name];
        res.writeHead(answer.statusCode ?? 502, answer.statusMessage, headers);
        answer.pipe(res);
      });
      upstream.on("error", () => {
        if (!res.headersSent)
          res.writeHead(502, { "content-length": "0" });
        res.end();
      });
      req.pipe(upstream);
      req.resume();
    }).catch(() => res.destroy());
  });
  server.on("clientError", (_error, socket) => socket.destroy());
  server.on("connection", track);
  server.on("connect", (req, client, head) => {
    const target = tunnelTarget(req.url);
    if (!target || !tunnels.has(target)) {
      refuseSocket(client, target ?? "an unreadable tunnel target");
      return;
    }
    const at = target.lastIndexOf(":");
    void tunnel(client, target.slice(0, at), Number(target.slice(at + 1)), target, (upstream) => {
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length)
        upstream.write(head);
    }).catch(() => client.destroy());
  });
  server.on("upgrade", (req, client, head) => {
    let url;
    try {
      url = new URL(req.url ?? "");
    } catch {
      refuseSocket(client, "an unreadable upgrade target");
      return;
    }
    const asHttp = url.href.replace(/^ws:/i, "http:");
    if (!/^(http|ws):$/i.test(url.protocol) || !renderAuditUrlAllowed(asHttp, origins)) {
      refuseSocket(client, connectionKey(url.href) ?? url.origin);
      return;
    }
    void tunnel(client, url.hostname, Number(url.port || 80), connectionKey(url.href) ?? url.origin, (upstream) => {
      const lines = [`${req.method} ${url.pathname}${url.search} HTTP/${req.httpVersion}`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        if (!/^proxy-/i.test(req.rawHeaders[i]))
          lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
      }
      upstream.write(lines.join("\r\n") + "\r\n\r\n");
      if (head.length)
        upstream.write(head);
    }).catch(() => client.destroy());
  });
  await new Promise((resolve2, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve2();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("The render egress proxy has no address");
  return {
    server: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve2) => {
      for (const socket of sockets)
        socket.destroy();
      server.close(() => resolve2());
    })
  };
}
var screenshotDir = () => process.env.MCP_RENDER_AUDIT_SCREENSHOTS || join(tmpdir(), "tooljet-render-audit");
async function axeInCodePage(page) {
  const handle = await page.$("iframe[data-tj-code-page-frame]");
  const frame = await handle?.contentFrame();
  if (!frame)
    return void 0;
  const { default: axe } = await import("axe-core");
  await frame.evaluate(`${axe.source}
;void 0`);
  return frame.evaluate(axeRunInFrame);
}
function axeRunInFrame() {
  const refusal = '[data-cy^="code-screen-no-access"]';
  const context = document.querySelector(refusal) ? { exclude: [refusal] } : document;
  const textOf = (selector) => {
    try {
      const text = (document.querySelector(selector)?.textContent ?? "").trim().replace(/\s+/g, " ");
      return text ? text.length > 60 ? `${text.slice(0, 57)}...` : text : void 0;
    } catch {
      return void 0;
    }
  };
  return window.axe.run(context, { resultTypes: ["violations"], runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }).then((r) => r.violations.map((v) => {
    const nodes = v.nodes.slice(0, 3);
    const targets = nodes.map((n) => [].concat(n.target).join(" "));
    const out = { id: v.id, impact: v.impact ?? null, help: v.help, nodes: v.nodes.length, targets };
    if (v.id === "color-contrast") {
      out.elements = nodes.map((n, i) => {
        const data = (n.any ?? []).find((c) => c?.data?.fgColor)?.data ?? {};
        const text = textOf(targets[i]);
        return {
          target: targets[i],
          ...text ? { text } : {},
          ...data.fgColor ? { fg: data.fgColor } : {},
          ...data.bgColor ? { bg: data.bgColor } : {},
          ...typeof data.contrastRatio === "number" ? { ratio: data.contrastRatio } : {},
          ...data.expectedContrastRatio ? { needs: data.expectedContrastRatio } : {}
        };
      });
    }
    return out;
  }));
}
function auditScript() {
  const widgets = Array.from(document.querySelectorAll('[data-cy^="draggable-widget-"]'));
  const boxes = [];
  const findings = [];
  const seenNames = /* @__PURE__ */ new Set();
  const bad = /\bundefined\b|\bNaN\b|\bnull\b|Invalid date|\bTab [123]\b|Select\.\.|\\n|\[object Object\]|\{\{|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}|%%|·\s*·|[$€£]\s?\d{5,}(?![,.]\d)/;
  for (const el of widgets) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4)
      continue;
    const cy = el.getAttribute("data-cy") || "";
    const type = (el.className.toString().match(/_tooljet-([A-Za-z0-9]+)/) || [])[1] || "?";
    const name = `${type}:${cy.replace("draggable-widget-", "")}`;
    if (seenNames.has(cy))
      continue;
    seenNames.add(cy);
    const text = (el.innerText || "").trim();
    boxes.push({ name, x: r.x, y: r.y, w: r.width, h: r.height, el });
    const textual = /^(Html|Text|Statistics|Table|Tabs|Listview|Kanban|KeyValuePair|Timeline|Steps):/.test(name);
    const emptyStateByName = /empty|placeholder|no_?data|nothing/i.test(cy);
    if (textual && text.length === 0 && r.height > 30 && !emptyStateByName) {
      findings.push({ kind: "empty_render", component: name, detail: `${Math.round(r.width)}x${Math.round(r.height)}px box renders no text (a multi-line binding or a broken expression)` });
    }
    const m = text.match(bad);
    if (m)
      findings.push({ kind: "placeholder_text", component: name, detail: `rendered text contains "${m[0]}"` });
    let clippedHere = false;
    for (const node of [el, ...Array.from(el.querySelectorAll("*"))]) {
      const cs = getComputedStyle(node);
      const hidden = cs.overflow === "hidden" || cs.overflowY === "hidden" || cs.overflowX === "hidden";
      if (!hidden || (node.innerText || "").trim().length === 0)
        continue;
      if (node.scrollHeight > node.clientHeight + 6 && node.clientHeight > 12) {
        findings.push({ kind: "clipped", component: name, detail: `"${(node.innerText || "").trim().slice(0, 40)}" needs ${node.scrollHeight}px but has ${node.clientHeight}px` });
        clippedHere = true;
        break;
      }
    }
    if (!clippedHere && !/^(Table|Listview|Kanban|Container|Form|Tabs):/.test(name)) {
      const leaves = Array.from(el.querySelectorAll("*")).filter((n) => n.children.length === 0 && (n.textContent || "").trim());
      const overflow = Math.max(0, ...leaves.map((n) => n.getBoundingClientRect().bottom)) - (r.top + r.height);
      if (overflow > 4) {
        findings.push({ kind: "clipped", component: name, detail: `text runs ${Math.round(overflow)}px past the widget's bottom edge; the widget needs ${Math.round(r.height + overflow)}px` });
        clippedHere = true;
      }
    }
    if (/^Chart:/.test(name)) {
      const tick = el.querySelector(".xtick text, .ytick text, .legendtext");
      const family = tick ? getComputedStyle(tick).fontFamily.toLowerCase() : "";
      if (family.includes("open sans") || family.includes("verdana")) {
        findings.push({ kind: "placeholder_text", component: name, detail: "chart uses Plotly default styling (Open Sans/Verdana labels); draw it with plotFromJson and the house layout" });
      }
      const traces = el.querySelectorAll(".trace, .bars path, .slice, .scatterlayer path, .heatmaplayer image").length;
      if (el.querySelector(".js-plotly-plot, .plot-container") && traces === 0) {
        findings.push({ kind: "empty_render", component: name, detail: "chart has axes but no data trace; the query feeding it returned the wrong shape (a chart needs {data:[...], layout:{...}})" });
      }
      const slices = Array.from(el.querySelectorAll(".slice path, .pie path"));
      const fills = new Set(slices.map((n) => (n.getAttribute("style") || "").match(/fill:\s*([^;]+)/)?.[1] ?? n.getAttribute("fill") ?? "").filter(Boolean));
      if (fills.has("rgb(31, 119, 180)") && fills.has("rgb(255, 127, 14)")) {
        findings.push({ kind: "placeholder_text", component: name, detail: "pie chart uses Plotly default rainbow colours; use the theme series palette" });
      }
      const drag = el.querySelector(".nsewdrag");
      const dr = drag ? drag.getBoundingClientRect() : null;
      if (dr) {
        const cutLabels = Array.from(el.querySelectorAll(".bartext")).filter((t) => {
          const tr = t.getBoundingClientRect();
          if (tr.top >= dr.top - 1 && tr.right <= dr.right + 1)
            return false;
          let n = t.parentElement;
          while (n && n !== el) {
            if (n.getAttribute("clip-path"))
              return true;
            n = n.parentElement;
          }
          return false;
        });
        if (cutLabels.length)
          findings.push({ kind: "clipped", component: name, detail: `${cutLabels.length} bar value label(s) are cut by the plot area (e.g. "${(cutLabels[0].textContent || "").trim()}"); set cliponaxis:false on the bar trace` });
      }
      const plotEl = el.querySelector(".js-plotly-plot");
      for (const trace of plotEl?.data ?? []) {
        if ((trace.type ?? "scatter") !== "bar" || !Array.isArray(trace.x))
          continue;
        const seen = /* @__PURE__ */ new Set();
        const dup = trace.x.map(String).find((v) => seen.has(v) ? true : (seen.add(v), false));
        if (dup !== void 0) {
          findings.push({ kind: "placeholder_text", component: name, detail: `category "${dup}" appears more than once in a bar trace, so its bars stack and read as one taller bar; aggregate the rows per category in the query` });
          break;
        }
      }
      if (dr && r.height > 120 && dr.height < r.height * 0.55)
        findings.push({ kind: "clipped", component: name, detail: `plot area is ${Math.round(dr.height)}px of a ${Math.round(r.height)}px chart (styles.padding is the Plotly margin on every side; set it to 16)` });
      const rawLabels = Array.from(el.querySelectorAll(".bartext")).filter((t) => /^\d{5,}(\.\d+)?$/.test((t.textContent || "").trim()));
      if (rawLabels.length)
        findings.push({ kind: "placeholder_text", component: name, detail: `bar value labels are unformatted numbers (e.g. "${(rawLabels[0].textContent || "").trim()}"); format them with toLocaleString and the unit` });
      const ticks = Array.from(el.querySelectorAll(".xaxislayer-above .xtick text, .xtick text"));
      const runOff = ticks.filter((t) => t.getBoundingClientRect().bottom > r.bottom - 2);
      if (runOff.length)
        findings.push({ kind: "clipped", component: name, detail: `${runOff.length} category label(s) run off the bottom of the chart (e.g. "${(runOff[0].textContent || "").trim().slice(0, 30)}"); shorten the categories or draw horizontal bars (orientation 'h')` });
    }
    if (!clippedHere && /^Table:/.test(name)) {
      const cut = [];
      for (const cell of Array.from(el.querySelectorAll('td, [role="cell"], .td'))) {
        const text2 = (cell.innerText || "").trim();
        if (!text2)
          continue;
        const cellRect = cell.getBoundingClientRect();
        const spill = Array.from(cell.querySelectorAll("*")).find((node) => {
          if (!(node.innerText || "").trim() || node.children.length > 0)
            return false;
          const nr = node.getBoundingClientRect();
          return nr.width > 0 && (nr.right > cellRect.right + 2 || nr.left < cellRect.left - 2);
        });
        if (spill) {
          cut.push(text2.slice(0, 24));
          if (cut.length >= 3)
            break;
          continue;
        }
        for (const node of [cell, ...Array.from(cell.querySelectorAll("*"))]) {
          const cs = getComputedStyle(node);
          if ((cs.overflow === "hidden" || cs.overflowX === "hidden") && cs.textOverflow !== "ellipsis" && node.scrollWidth > node.clientWidth + 4 && node.clientWidth > 20) {
            cut.push(text2.slice(0, 24));
            break;
          }
        }
        if (cut.length >= 3)
          break;
      }
      if (cut.length)
        findings.push({ kind: "clipped", component: name, detail: `${cut.length}+ cells cut mid value (e.g. "${cut[0]}"); widen the column with columnSize or shorten the value` });
      const rawHeaders = Array.from(el.querySelectorAll('th, [role="columnheader"], .th')).map((h) => (h.innerText || "").trim()).filter((text2) => /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(text2));
      if (rawHeaders.length)
        findings.push({ kind: "placeholder_text", component: name, detail: `${rawHeaders.length} column header(s) are raw field names (e.g. "${rawHeaders[0]}"); author the columns with readable names instead of letting ToolJet generate them` });
      const scroller = Array.from(el.querySelectorAll("*")).find((node) => node.scrollWidth > node.clientWidth + 12 && node.clientWidth > 200 && /table/i.test(node.className.toString()));
      if (scroller)
        findings.push({ kind: "clipped", component: name, detail: `columns overflow the table by ${scroller.scrollWidth - scroller.clientWidth}px to the right (the columnSize values exceed the table width); show fewer columns or shrink them` });
      const body = el.querySelector('.table-responsive, .tbody, tbody, [class*="table-body"]');
      const rows = body ? Array.from(body.querySelectorAll('tr, [role="row"], .tr')) : [];
      if (body && rows.length) {
        const bodyBottom = body.getBoundingClientRect().bottom;
        const sliced = rows.filter((row) => {
          const rr = row.getBoundingClientRect();
          return rr.top < bodyBottom - 4 && rr.bottom > bodyBottom + 6 && (row.innerText || "").trim().length > 0;
        });
        if (sliced.length)
          findings.push({ kind: "clipped", component: name, detail: `a row is sliced by the table's bottom edge; size the table to whole rows (header 40 + rows x row height + footer) or enable pagination` });
      }
    }
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (/^(ModalV2|ShadDialog):/.test(a.name) || /^(ModalV2|ShadDialog):/.test(b.name))
        continue;
      if (a.name.split(":")[1] === b.name.split(":")[1])
        continue;
      if (a.el.contains(b.el) || b.el.contains(a.el))
        continue;
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 8 && iy > 8)
        findings.push({ kind: "overlap", component: `${a.name} and ${b.name}`, detail: `${Math.round(ix)}x${Math.round(iy)}px shared; move one` });
    }
  }
  return { widgets: widgets.length, findings: findings.slice(0, 60) };
}
function codePageAuditScript(route, outside) {
  const frame = outside ? null : document.querySelector("iframe[data-tj-code-page-frame]");
  if (!outside && !frame)
    return null;
  const findings = [];
  const doc = outside ? document : frame.contentDocument;
  const width = outside ? outside.width : window.innerWidth;
  const host = outside ? outside : document.scrollingElement;
  if (host && host.scrollWidth > host.clientWidth + 1)
    findings.push({ kind: "overflow", component: "Code mode app", detail: `the page scrolls sideways at ${width}px (${host.scrollWidth}px wide)` });
  if (!doc || !doc.body) {
    findings.push({ kind: "empty_render", component: "Code mode app", detail: "the Code mode frame has no document" });
    return findings;
  }
  if (doc.querySelector('[data-cy^="code-screen-no-access"]')) {
    findings.push({
      kind: "unreachable",
      component: "Code mode app",
      reason: "screen_refused",
      detail: `ToolJet showed "You don't have access to this screen"${route ? ` for ${route}` : ""}: the check's signed-in user may not open it (a screen limit), so this screen was not checked. The refusal is ToolJet's, not the app's: change nothing for it`
    });
  }
  const root2 = doc.getElementById("tj-frame-root");
  const text = (root2?.innerText ?? "").trim();
  if (!root2 || root2.children.length === 0 || !text && !root2.querySelector("svg,canvas,img")) {
    findings.push({ kind: "empty_render", component: "Code mode app", detail: "the Code mode app rendered nothing" });
    return findings;
  }
  const scroller = doc.scrollingElement;
  if (scroller && scroller.scrollWidth > scroller.clientWidth + 1)
    findings.push({ kind: "overflow", component: "Code mode app", detail: `the app scrolls sideways at ${width}px (${scroller.scrollWidth}px of content in ${scroller.clientWidth}px)` });
  const below = outside ? outside.below : frame.getBoundingClientRect().bottom - window.innerHeight;
  if (below > 1)
    findings.push({ kind: "clipped", component: "Code mode app", detail: `the app runs ${Math.round(below)}px below the window` });
  const describe = (el) => {
    const id = el.getAttribute("data-testid") || el.id;
    const label = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${el.tagName.toLowerCase()}${id ? `#${id}` : ""}${label ? ` "${label}"` : ""}`;
  };
  const win = doc.defaultView;
  const insideScroller = (el) => {
    for (let a = el.parentElement; a && a !== doc.body; a = a.parentElement) {
      const ox = win.getComputedStyle(a).overflowX;
      if (ox === "auto" || ox === "scroll")
        return true;
    }
    return false;
  };
  const cut = [];
  const frameWidth = doc.documentElement.clientWidth;
  for (const el of Array.from(doc.querySelectorAll("#tj-frame-root *"))) {
    if (cut.length >= 3)
      break;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.right <= frameWidth + 1)
      continue;
    if (!insideScroller(el))
      cut.push(describe(el));
  }
  if (cut.length)
    findings.push({ kind: "clipped", component: "Code mode app", detail: `cut off at the right edge at ${width}px: ${cut.join(", ")}` });
  const spills = (el) => {
    const h = el;
    if (!(h.clientWidth >= 8) || h.scrollWidth <= h.clientWidth + 4)
      return false;
    const cs = win.getComputedStyle(h);
    if (cs.display === "inline" || cs.overflowX === "auto" || cs.overflowX === "scroll" || cs.textOverflow === "ellipsis")
      return false;
    return !insideScroller(h);
  };
  const spilled = Array.from(doc.querySelectorAll("#tj-frame-root *")).filter(spills);
  const innermost = spilled.filter((el) => !spilled.some((other) => other !== el && el.contains(other)));
  const spillLines = innermost.slice(0, 3).map((el) => {
    const h = el;
    const cs = win.getComputedStyle(h);
    const widest = Array.from(h.children).reduce((best, c) => !best || c.getBoundingClientRect().width > best.getBoundingClientRect().width ? c : best, null);
    const tracks = cs.display === "grid" && cs.gridTemplateColumns !== "none" ? `, its grid columns (${cs.gridTemplateColumns}) are wider than the box` : "";
    const what = widest && widest.getBoundingClientRect().width > h.clientWidth + 4 ? `${describe(widest)} (${Math.round(widest.getBoundingClientRect().width)}px)` : `content ${h.scrollWidth}px wide`;
    const clips = cs.overflowX === "hidden" || cs.overflowX === "clip" ? " and is cut off" : " and spills out";
    return `${what} in ${describe(h)} (${h.clientWidth}px)${tracks}${clips}`;
  });
  if (spillLines.length)
    findings.push({ kind: "overflow", component: "Code mode app", detail: `content wider than its box${route ? ` on ${route}` : ""} at ${width}px: ${spillLines.join("; ")}. Let it wrap or shrink (min-w-0, flexible columns, fewer fixed widths), or put it in an overflow-x-auto wrapper` });
  const placeholder = text.match(/\b(undefined|NaN|Invalid date|\[object Object\])\b/);
  if (placeholder)
    findings.push({ kind: "placeholder_text", component: "Code mode app", detail: `the app shows "${placeholder[1]}"` });
  return findings;
}
async function loadPlaywright() {
  const explicit = process.env.MCP_RENDER_AUDIT_PLAYWRIGHT;
  if (explicit) {
    try {
      const { pathToFileURL } = await import("node:url");
      const { createRequire: createRequire2 } = await import("node:module");
      const req = createRequire2(pathToFileURL(explicit.replace(/\/?$/, "/")).href);
      return req(explicit);
    } catch {
    }
  }
  try {
    const specifier = "playwright-core";
    return await import(specifier);
  } catch {
    return null;
  }
}
var STATIC_RESOURCES = /* @__PURE__ */ new Set(["script", "stylesheet", "image", "font"]);
var socketHttpUrl = (url) => url.replace(/^ws(s?):/i, "http$1:");
var INFORMATIONAL_KINDS = /* @__PURE__ */ new Set(["blocked_socket", "blocked_query"]);
var pathOf = (url) => {
  try {
    return new URL(url).pathname;
  } catch {
    return "?";
  }
};
function trackNetwork(page) {
  if (typeof page?.on !== "function")
    return void 0;
  const tracker = { inflight: /* @__PURE__ */ new Map(), lastActivity: Date.now() };
  const done = (request2) => {
    tracker.inflight.delete(request2);
    tracker.lastActivity = Date.now();
  };
  page.on("request", (request2) => {
    if (STREAM_PATHS.test(pathOf(String(request2?.url?.() ?? ""))))
      return;
    tracker.inflight.set(request2, Date.now());
    tracker.lastActivity = Date.now();
  });
  page.on("requestfinished", done);
  page.on("requestfailed", done);
  return tracker;
}
var CODE_QUIET_MS = Number(process.env.MCP_RENDER_AUDIT_QUIET_MS || 750);
var CODE_MIN_SETTLE_MS = 750;
var LONG_REQUEST_MS = 3e3;
var STREAM_PATHS = /\/api\/code-page-security$/;
function codeFrameDrawn() {
  const frame = document.querySelector("iframe[data-tj-code-page-frame]");
  if (frame?.hasAttribute("data-tj-code-page-isolated"))
    return true;
  const root2 = frame?.contentDocument?.getElementById("tj-frame-root");
  return !!root2 && root2.children.length > 0;
}
async function isolatedFrame(page) {
  const handle = await page.$("iframe[data-tj-code-page-frame][data-tj-code-page-isolated]");
  return await handle?.contentFrame() ?? null;
}
async function waitForIsolatedFrame(page, untilMs) {
  while (Date.now() < untilMs) {
    const frame = await isolatedFrame(page).catch(() => null);
    if (!frame)
      return;
    const drawn = await frame.evaluate(() => {
      const root2 = document.getElementById("tj-frame-root");
      return !!root2 && root2.children.length > 0;
    }).catch(() => false);
    if (drawn)
      return;
    await page.waitForTimeout(100);
  }
}
async function auditCodePage(page, route) {
  const frame = await isolatedFrame(page);
  if (!frame)
    return page.evaluate(codePageAuditScript, route);
  const outside = await page.evaluate(() => {
    const el = document.querySelector("iframe[data-tj-code-page-frame]");
    const host = document.scrollingElement;
    return {
      width: window.innerWidth,
      scrollWidth: host?.scrollWidth ?? 0,
      clientWidth: host?.clientWidth ?? 0,
      below: el.getBoundingClientRect().bottom - window.innerHeight
    };
  });
  return frame.evaluate(`(${codePageAuditScript.toString()})(${route ? JSON.stringify(route) : "undefined"}, ${JSON.stringify(outside)})`);
}
async function settleWhenQuiet(page, tracker, maxMs) {
  const started = Date.now();
  await page.waitForTimeout(Math.min(CODE_MIN_SETTLE_MS, maxMs));
  while (Date.now() - started < maxMs) {
    const now = Date.now();
    const loading = [...tracker.inflight.values()].some((since) => now - since < LONG_REQUEST_MS);
    if (!loading && now - tracker.lastActivity >= CODE_QUIET_MS && await page.evaluate(codeFrameDrawn).catch(() => true) !== false)
      return;
    await page.waitForTimeout(100);
  }
}
async function auditPages(pages, options = {}, driver = loadPlaywright) {
  const unreachable = (p, reason, detail) => ({ ...p, widgets: 0, findings: [{ kind: "unreachable", component: "-", reason, detail }] });
  if (!pages.length)
    return [];
  const origins = options.allowedOrigins ?? renderAuditOrigins(pages[0].url);
  if (pages.some((p) => !renderAuditUrlAllowed(p.url, origins))) {
    return pages.map((p) => unreachable(p, "blocked_destination", "The requested viewer is outside the configured render-audit origins"));
  }
  const pw = await driver();
  if (!pw) {
    return pages.map((p) => unreachable(p, "browser_unavailable", "playwright-core is not installed on the MCP host; the render audit cannot run"));
  }
  const proxies = [];
  const proxyFor = async (onBlocked) => {
    const proxy = await startEgressProxy(origins, onBlocked, { privateOrigins: options.privateOrigins ?? renderAuditPrivateOrigins(pages[0].url) });
    proxies.push(proxy);
    return { server: proxy.server, bypass: "<-loopback>" };
  };
  const closeProxies = () => Promise.all(proxies.splice(0).map((proxy) => proxy.close().catch(() => {
  })));
  const logged = /* @__PURE__ */ new Set();
  const logUnattributed = (destination) => {
    if (logged.has(destination))
      return;
    logged.add(destination);
    console.error(`tooljet-mcp: render check refused a connection the page did not make (${destination}); not reported as a finding`);
  };
  const launch = {
    headless: true,
    chromiumSandbox: true,
    args: ["--force-webrtc-ip-handling-policy=disable_non_proxied_udp", "--disable-sync", "--no-pings", "--disable-domain-reliability"]
  };
  if (options.executablePath)
    launch.executablePath = options.executablePath;
  else
    launch.channel = options.channel ?? "chrome";
  let browser;
  try {
    launch.proxy = await proxyFor(logUnattributed);
    browser = await pw.chromium.launch(launch);
  } catch {
    await closeProxies();
    return pages.map((p) => unreachable(p, "browser_unavailable", "Chrome could not start on the MCP host; check the configured executable/channel"));
  }
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 4, pages.length || 1));
  const reports = new Array(pages.length);
  const auditOne = async (index) => {
    const p = pages[index];
    let ctx;
    let blocked;
    const blocks = [];
    const blockFindings = [];
    const block = (finding, where) => {
      blocked ??= finding;
      const line = `${finding.reason}: ${where}`;
      if (blocks.length < 4 && !blocks.includes(line))
        blocks.push(line);
      if (blockFindings.length < 4 && !blockFindings.some((f) => f.reason === finding.reason && f.detail === finding.detail))
        blockFindings.push(finding);
    };
    const proxyBlocks = /* @__PURE__ */ new Set();
    const pageConnections = /* @__PURE__ */ new Set();
    const attributeProxyBlocks = () => {
      for (const destination of proxyBlocks) {
        if (pageConnections.has(destination)) {
          block({
            kind: "unreachable",
            component: "-",
            reason: "redirect_blocked",
            detail: "A redirect or connection to a destination outside the configured audit origins was blocked"
          }, `connection to ${destination}`);
        } else
          logUnattributed(destination);
      }
      proxyBlocks.clear();
    };
    try {
      const width = options.viewportWidth ?? 1600;
      const proxy = await proxyFor((destination) => proxyBlocks.add(destination));
      ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 812 : 900 }, serviceWorkers: "block", proxy });
      ctx.on?.("request", (request2) => {
        const key = connectionKey(String(request2.url?.() ?? ""));
        if (key)
          pageConnections.add(key);
      });
      if (!ctx.routeWebSocket) {
        reports[index] = unreachable(p, "browser_unavailable", "The render audit requires Playwright 1.48+ for WebSocket interception");
        return;
      }
      if (options.session) {
        if (typeof options.session === "string") {
          const origin = new URL(p.url).origin;
          await ctx.addCookies([{
            name: "tj_auth_token",
            value: options.session,
            url: origin,
            httpOnly: true,
            secure: origin.startsWith("https:"),
            sameSite: "Lax"
          }]);
        } else {
          if (new URL(p.url).origin !== options.session.origin || options.session.expiresAt <= Date.now() / 1e3) {
            reports[index] = unreachable(p, "auth_required", "The scoped viewer credential does not authorize this page origin or has expired");
            return;
          }
          await ctx.addCookies([{
            name: "tj_oauth_viewer",
            value: options.session.token,
            url: options.session.origin,
            httpOnly: true,
            secure: options.session.origin.startsWith("https:"),
            sameSite: "Lax",
            expires: options.session.expiresAt
          }]);
        }
      }
      await ctx.routeWebSocket("**/*", (socket) => {
        const url = String(socket.url?.() ?? "");
        if (renderAuditUrlAllowed(socketHttpUrl(url), origins)) {
          socket.connectToServer();
          return;
        }
        block({ kind: "blocked_socket", component: "-", reason: "blocked_destination", detail: "A WebSocket to a destination outside the audit origins was blocked; its live behavior was not verified" }, `WebSocket ${(() => {
          try {
            return new URL(url).host;
          } catch {
            return "?";
          }
        })()}`);
        socket.close();
      });
      await ctx.route("**/*", async (route) => {
        const request2 = route.request();
        const url = request2.url();
        if (!renderAuditUrlAllowed(url, origins)) {
          block({ kind: "unreachable", component: "-", reason: "blocked_destination", detail: "A navigation or resource outside the configured audit origins was blocked" }, `${request2.method()} ${new URL(url).origin}`);
          await route.abort();
          return;
        }
        try {
          const policy = renderAuditRequest(url, request2.method(), options.savedQueries);
          if (!policy.allowed) {
            block({
              kind: "blocked_query",
              component: "-",
              reason: "blocked_execution",
              detail: `${policy.detail} (${request2.method()} ${pathOf(url)})`
            }, `${request2.method()} ${pathOf(url)}`);
            await route.abort();
            return;
          }
          if (request2.method() === "GET" && STATIC_RESOURCES.has(request2.resourceType?.())) {
            await route.continue();
            return;
          }
          const response2 = await route.fetch({
            maxRedirects: 0,
            maxRetries: 0,
            timeout: 3e4,
            ...policy.postData === void 0 ? {} : { postData: policy.postData }
          });
          try {
            if (response2.status() >= 300 && response2.status() < 400 && response2.headers().location) {
              const dest = new URL(response2.headers().location, url);
              const signIn = renderAuditUrlAllowed(dest.href, origins) && /\/(?:login|sign-in|signin)\b/i.test(dest.pathname);
              block({
                kind: "unreachable",
                component: "-",
                reason: signIn ? "auth_required" : "redirect_blocked",
                detail: signIn ? "The viewer requires sign-in; private app rendering was not verified" : "An HTTP redirect was blocked. Configure the canonical viewer/resource URL and its trusted origin"
              }, `${request2.method()} ${pathOf(url)} redirected`);
              await route.abort();
            } else
              await route.fulfill({ response: response2 });
          } finally {
            await response2.dispose();
          }
        } catch {
          block({ kind: "unreachable", component: "-", reason: "navigation_failed", detail: "A viewer resource could not be loaded; the audit is incomplete" }, `${request2.method()} ${pathOf(url)}`);
          await route.abort().catch(() => {
          });
        }
      });
      const page = await ctx.newPage();
      const network = trackNetwork(page);
      const response = await page.goto(p.url, { waitUntil: "domcontentloaded", timeout: 6e4 });
      if (response && response.status() >= 400) {
        const status = response.status();
        reports[index] = unreachable(p, [401, 403].includes(status) ? "auth_required" : "navigation_failed", "Viewer returned HTTP " + status);
        return;
      }
      const contentWaitMs = options.contentWaitMs ?? Number(process.env.MCP_RENDER_AUDIT_CONTENT_WAIT_MS || 3e4);
      const waitStarted = Date.now();
      await page.waitForFunction(() => {
        if (!document.querySelector('[data-cy^="draggable-widget-"]'))
          return false;
        const frame = document.querySelector("iframe[data-tj-code-page-frame]");
        if (!frame || frame.hasAttribute("data-tj-code-page-isolated"))
          return true;
        const root2 = frame.contentDocument?.getElementById("tj-frame-root");
        return !!root2 && root2.children.length > 0;
      }, void 0, { timeout: contentWaitMs }).catch(() => void 0);
      await waitForIsolatedFrame(page, waitStarted + contentWaitMs);
      const codeFrame = network ? options.codePage || await page.evaluate(() => !!document.querySelector("iframe[data-tj-code-page-frame]")).catch(() => false) : false;
      if (codeFrame === true) {
        await settleWhenQuiet(page, network, options.settleMs ?? 6e3);
      } else {
        await page.waitForTimeout(options.settleMs ?? 6e3);
        await page.waitForFunction(() => {
          const charts = document.querySelectorAll('[data-cy^="draggable-widget-"]._tooljet-Chart').length;
          const plots = document.querySelectorAll('[data-cy^="draggable-widget-"]._tooljet-Chart .js-plotly-plot').length;
          return charts === 0 || plots >= charts;
        }, void 0, { timeout: options.chartWaitMs ?? 2e4 }).catch(() => void 0);
        await page.waitForTimeout(1500);
      }
      attributeProxyBlocks();
      const landed = page.url();
      if (/\/(?:login|sign-in|signin)\b/i.test(new URL(landed).pathname)) {
        reports[index] = unreachable(p, "auth_required", "The viewer requires sign-in; private app rendering was not verified");
        return;
      }
      const result = await page.evaluate(auditScript);
      const codePage = await auditCodePage(page, new URL(p.url).searchParams.get("route") || void 0);
      if (Array.isArray(codePage)) {
        const accessibility = await axeInCodePage(page).catch(() => void 0);
        let screenshot;
        try {
          const dir = screenshotDir();
          mkdirSync(dir, { recursive: true });
          const route = new URL(p.url).searchParams.get("route") || "/";
          const app = /\/applications\/([^/?]+)/.exec(new URL(p.url).pathname)?.[1]?.slice(0, 8) ?? "app";
          const slug = `${app}-${p.page}${route.replace(/[^A-Za-z0-9]+/g, "-")}`.replace(/-+$/, "");
          screenshot = join(dir, `${slug}-${options.viewportWidth ?? 1600}.png`);
          await page.screenshot({ path: screenshot, fullPage: false });
        } catch {
          screenshot = void 0;
        }
        reports[index] = {
          page: p.page,
          url: p.url,
          widgets: result.widgets,
          findings: [...codePage, ...blockFindings],
          ...accessibility ? { accessibility } : {},
          ...screenshot ? { screenshot } : {}
        };
        return;
      }
      reports[index] = result.widgets === 0 && blocked ? { page: p.page, url: p.url, widgets: 0, findings: [{ ...blocked, kind: "unreachable", detail: `${blocked.detail}; the page then showed no widgets. Blocked: ${blocks.join("; ")}` }] } : result.widgets === 0 ? unreachable(p, "no_widgets", "No ToolJet widgets were found; the page may be empty, unauthenticated, or not loaded") : { page: p.page, url: p.url, widgets: result.widgets, findings: [...result.findings, ...blockFindings] };
    } catch (err) {
      attributeProxyBlocks();
      const why = String(err?.message ?? err).split("\n")[0].slice(0, 200);
      reports[index] = blocked ? { ...p, widgets: 0, findings: [{ ...blocked, kind: "unreachable", detail: `${blocked.detail}; the audit then stopped: ${why}. Blocked: ${blocks.join("; ")}` }] } : unreachable(p, "navigation_failed", `Could not load or inspect the viewer page: ${why}`);
    } finally {
      await ctx?.close().catch(() => {
      });
    }
  };
  try {
    let next = 0;
    const workers = Array.from({ length: concurrency }, async () => {
      while (next < pages.length) {
        const index = next++;
        await auditOne(index);
      }
    });
    await Promise.all(workers);
  } finally {
    await browser.close();
    await closeProxies();
  }
  return reports;
}
function verifyPageRenderTool(client, viewerBase, driver = loadPlaywright) {
  return {
    name: "verify_page_render",
    title: "Verify Page Render",
    annotations: { readOnlyHint: true, openWorldHint: true },
    description: 'Render audit of one page or every page of an app in a headless browser (1600x900 unless viewport_width is set; 1280 with route), after the app is built. On an app in Code mode it checks inside the app: sideways scrolling, content cut off at the right edge, an empty app and placeholder text; pass route to open one route of it and viewport_width (375, 768, 1280) to check each width. An app in Code mode also gets an axe-core accessibility run (WCAG 2 A/AA; `accessibility` lists violations by impact) and a screenshot path. Reports what lint cannot see: Html/Text widgets that render empty (a multi-line binding, a broken expression), placeholder text a customer would read as a bug ("undefined", "NaN", "Invalid date", "Tab 1", "Select..", a literal \\n), text clipped inside its box, and components overlapping each other. Run it once per page before the handoff and review every finding; report unverified behavior explicitly. Opens the version being edited with the builder\'s ToolJet session, or a separate app-scoped OAuth viewer credential (limited to the viewer origin), so a private app is audited without being made public. Only saved, static, bounded read queries may run; writes, dynamic queries and queries requiring confirmation are blocked and reported as unverified. WebSockets to the ToolJet origin pass; any other WebSocket is closed and reported as a `blocked_socket` finding, which does not make `ok` false. Returns { pages: [{ page, url, widgets, findings: [{ kind, component, detail }] }], ok }.',
    inputSchema: {
      app_id: external_exports.string().regex(/^[A-Za-z0-9_-]+$/),
      page_handle: external_exports.string().optional().describe("one page handle; omit to audit every page"),
      viewer_url: external_exports.string().optional().describe("canonical viewer base URL; alternate origins require host configuration in MCP_RENDER_AUDIT_ALLOWED_ORIGINS"),
      viewport_width: external_exports.number().int().min(320).max(2560).optional().describe("window width in px; default 1280 with route, else 1600"),
      route: external_exports.string().regex(/^\/[A-Za-z0-9_\-\/:.]*$/).optional().describe("a Code mode route path to open, such as /orders/36")
    },
    async handler(args) {
      const release = await waitForRenderAudit(client.renderAuditGrant);
      if (!release)
        return fail(new Error("Render verification is busy; rendering remains unverified. Retry shortly."));
      try {
        if (!/^[A-Za-z0-9_-]+$/.test(args.app_id))
          return fail(new Error("Invalid app id"));
        const { base, origins } = renderAuditBase(viewerBase(), args.viewer_url);
        if (client.browserRenderOrigin && new URL(base).origin !== client.browserRenderOrigin) {
          return fail(new Error("OAuth render verification must use the configured ToolJet deployment origin"));
        }
        const summary = await client.getAppSummary(args.app_id);
        const allPages = summary.pages ?? [];
        const visible = allPages.filter((p) => p.hidden !== true && p.hidden?.value !== true && p.hidden?.value !== "{{true}}");
        const pages = args.route && !args.page_handle ? (visible.length ? visible : allPages).slice(0, 1) : allPages;
        const version = await client.editingVersionName?.(args.app_id).catch(() => void 0);
        const query = new URLSearchParams();
        if (version) {
          query.set("env", "development");
          query.set("version", version);
        }
        if (args.route)
          query.set("route", args.route);
        const preview = query.toString() ? `?${query}` : "";
        const targets = pages.filter((p) => !args.page_handle || p.handle === args.page_handle).map((p) => ({ page: p.handle ?? p.name ?? "home", url: `${base}/applications/${args.app_id}/${encodeURIComponent(p.handle ?? "home")}${preview}` }));
        if (!targets.length)
          return fail(new Error(`no page ${args.page_handle ?? ""} in app ${args.app_id}`));
        if (summary.queries?.length) {
          if (!summary.version_id)
            return fail(new Error("Cannot verify datasource eligibility without an app version."));
          if (summary.queries.some((query2) => !query2.data_source_id)) {
            return fail(new Error("Cannot verify an app query datasource; refusing browser verification."));
          }
          await client.listDatasources(summary.version_id);
          await Promise.all([...new Set(summary.queries.map((query2) => query2.data_source_id))].map((id) => client.assertDatasourceAllowed(id, summary.version_id)));
        }
        const options = {
          channel: process.env.MCP_RENDER_AUDIT_CHANNEL || "chrome",
          executablePath: process.env.MCP_RENDER_AUDIT_CHROME || void 0,
          allowedOrigins: origins,
          privateOrigins: renderAuditPrivateOrigins(viewerBase()),
          savedQueries: summary,
          viewportWidth: args.viewport_width ?? (args.route ? 1280 : void 0),
          codePage: Boolean(args.route),
          // MCP_RENDER_AUDIT_SESSION=off keeps the browser unauthenticated (private apps are then reported unverified).
          session: process.env.MCP_RENDER_AUDIT_SESSION === "off" ? void 0 : client.browserRenderOrigin ? await client.viewerSession?.(args.app_id) : await client.viewerSession?.(args.app_id).catch(() => void 0)
        };
        const reports = await auditPages(targets, options, driver);
        const total = reports.reduce((n, r) => n + r.findings.filter((f) => !INFORMATIONAL_KINDS.has(f.kind)).length, 0);
        const axeCount = reports.reduce((n, r) => n + (r.accessibility?.length ?? 0), 0);
        return ok({ pages: reports, ok: total === 0, findings: total, ...reports.some((r) => r.accessibility) ? { accessibility_violations: axeCount } : {} });
      } catch (err) {
        return fail(err);
      } finally {
        release();
      }
    }
  };
}
export {
  NOT_CHECKED_AUTOMATICALLY as N,
  autoReadPreflight as a,
  codeAppReadFilesTool as b,
  codeAppScaffoldTool as c,
  codeAppWriteFilesTool as d,
  codeAppBuildTool as e,
  codeAppInstallTool as f,
  codeAppAddDependencyTool as g,
  getRequestListener as h,
  browserUserBindings as i,
  isCodeModeApp as j,
  browserUserMessage as k,
  noCodeIdentity as n,
  verifyPageRenderTool as v
};
