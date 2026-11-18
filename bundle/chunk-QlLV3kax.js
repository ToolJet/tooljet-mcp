import { createRequire } from "node:module";
import { aA as external_exports, aE as fail, aF as ok } from "./chunk-B6ozJ2M5.js";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync, readFileSync, statSync, readdirSync, renameSync, lstatSync, realpathSync, utimesSync, openSync, closeSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, relative, sep, dirname, resolve, basename, isAbsolute } from "node:path";
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
var run = promisify(execFile);
var buildServiceUrl = () => process.env.MCP_CODE_BUILD_WORKER_URL?.trim().replace(/\/+$/, "") || void 0;
var POLL_MS2 = Number(process.env.MCP_CODE_BUILD_WORKER_POLL_MS ?? 1500);
var deadlineMs = () => Number(process.env.MCP_CODE_BUILD_WORKER_TIMEOUT_MS ?? 10 * 6e4);
var strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
async function packProject(dir) {
  const { stdout } = await run("tar", ["-czf", "-", "--exclude=node_modules", "--exclude=frontend/dist", "-C", dir, "app.json", "frontend"], { encoding: "buffer", maxBuffer: 64 * 1024 * 1024, env: { PATH: process.env.PATH ?? "/usr/bin:/bin", COPYFILE_DISABLE: "1" } });
  return stdout;
}
async function buildInService(dir, env, fetchImpl = fetch) {
  const base = buildServiceUrl();
  if (!base)
    throw new Error("MCP_CODE_BUILD_WORKER_URL is not set");
  const token = process.env.MCP_CODE_BUILD_WORKER_TOKEN ?? "";
  const headers = { authorization: `Bearer ${token}` };
  const started = Date.now();
  const deadline = started + deadlineMs();
  const bounded = (init = {}) => ({ ...init, signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())) });
  const late = () => `the build did not finish in ${Math.max(1, Math.round(deadlineMs() / 6e4))} minutes`;
  const reason = (error) => error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError") ? late() : error instanceof Error ? error.message : String(error);
  const unreachable = (detail) => ({
    code: 1,
    ms: Date.now() - started,
    output: `The build service could not build this app (${detail}). Nothing was built here: try the build again in a minute.`
  });
  let id;
  try {
    const body = await packProject(dir);
    const res = await fetchImpl(`${base}/jobs?env=${env}`, bounded({ method: "POST", headers: { ...headers, "content-type": "application/gzip" }, body: new Uint8Array(body) }));
    if (res.status !== 202)
      return unreachable(`HTTP ${res.status} ${(await res.text()).trim().slice(0, 200)}`);
    id = (await res.json()).id;
  } catch (error) {
    return unreachable(reason(error));
  }
  let job;
  try {
    for (; ; ) {
      const res = await fetchImpl(`${base}/jobs/${id}`, bounded({ headers }));
      if (!res.ok)
        return unreachable(`HTTP ${res.status} reading build ${id}`);
      job = await res.json();
      if (job.status === "done" || job.status === "failed")
        break;
      if (Date.now() + POLL_MS2 > deadline)
        return unreachable(`build ${id}: ${late()}`);
      await new Promise((resolve3) => setTimeout(resolve3, POLL_MS2));
    }
  } catch (error) {
    return unreachable(reason(error));
  } finally {
    void fetchImpl(`${base}/jobs/${id}`, { method: "DELETE", headers }).catch(() => void 0);
  }
  const output = strip([job.output ?? "", job.error ? `
${job.error}` : ""].join("")).trim();
  const location = [job.location?.CLOUDFLARE_REGION, job.location?.CLOUDFLARE_LOCATION].filter(Boolean).join(" ") || void 0;
  const failedCode = job.exitCode && job.exitCode > 0 ? job.exitCode : 1;
  if (job.status !== "done" || (job.exitCode ?? 0) !== 0)
    return { code: failedCode, output, location, ms: Date.now() - started };
  const refused = job.bundleTgzBase64 ? writeDist(join(dir, "frontend"), Buffer.from(job.bundleTgzBase64, "base64")) : "the build service sent no bundle";
  if (refused) {
    return { code: failedCode, output: `${output}
${refused}. The previous build was kept; try the build again.`.trim(), location, ms: Date.now() - started };
  }
  return { code: 0, output, location, ms: Date.now() - started };
}
var ENTRY = /^[-d]/;
function irregularEntries(root2, at = root2) {
  return readdirSync(at, { withFileTypes: true }).flatMap((entry) => {
    const full = join(at, entry.name);
    const stat = lstatSync(full);
    if (stat.isDirectory())
      return irregularEntries(root2, full);
    return stat.isFile() ? [] : [full.slice(root2.length + 1)];
  });
}
function writeDist(frontend, tgz) {
  const scratch = mkdtempSync(join(tmpdir(), "tj-dist-"));
  const incoming = mkdtempSync(join(frontend, ".dist-incoming-"));
  try {
    const file = join(scratch, "bundle.tgz");
    writeFileSync(file, tgz);
    let listing;
    try {
      listing = execFileSync("tar", ["-tvzf", file], { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 }).toString();
    } catch {
      return "the bundle from the build service could not be read";
    }
    const lines = listing.split("\n").filter(Boolean);
    const bad = lines.filter((line) => !ENTRY.test(line) || / link to | -> /.test(line));
    if (bad.length)
      return `the bundle from the build service holds ${bad.length} link(s) or special file(s), which are refused (${bad[0].trim().slice(0, 160)})`;
    if (!lines.some((line) => line.startsWith("-")))
      return "the bundle from the build service is empty";
    execFileSync("tar", ["-xzf", file, "-C", incoming, "--no-same-owner"], { stdio: "pipe" });
    const irregular = irregularEntries(incoming);
    if (irregular.length)
      return `the bundle from the build service holds links or special files (${irregular.slice(0, 3).join(", ")}), which are refused`;
    const dist = join(frontend, "dist");
    rmSync(dist, { recursive: true, force: true });
    renameSync(incoming, dist);
    return void 0;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
    rmSync(incoming, { recursive: true, force: true });
  }
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
var run2 = promisify(execFile);
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
  if (app?.type === "module") {
    throw new Error(`App ${appId} is a module, and Code mode is for apps only: its code cannot be read, changed, built or installed here. Nothing was changed. For a Code mode build, create an app with create_app build_mode "code".`);
  }
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
var strip2 = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
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
    const { stdout, stderr } = await run2(cmd, [...pre, ...args], { cwd, timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, env: cliEnv() });
    return { code: 0, output: strip2(stdout + stderr) };
  } catch (err) {
    const e = err;
    return { code: typeof e.code === "number" ? e.code : 1, output: strip2((e.stdout ?? "") + (e.stderr ?? e.message ?? "")) };
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
var cliReady;
var codeCliProblem = () => {
  if (process.env.MCP_CODE_CLI_HANDSHAKE === "0")
    return Promise.resolve(void 0);
  cliReady ??= (async () => {
    const [cmd, pre] = process.env.TOOLJET_CLI ? ["node", [process.env.TOOLJET_CLI]] : ["tooljet", []];
    const env = { HOME: buildHome(), USERPROFILE: buildHome(), FORCE_COLOR: "0", NODE_ENV: "production", TOOLJET_CLI_SERVER_MODE: "1" };
    for (const name of HOST_ENV)
      if (process.env[name] !== void 0)
        env[name] = process.env[name];
    try {
      const { stdout, stderr } = await run2(cmd, [...pre, "app", "server-mode"], { timeout: 6e4, env });
      if (strip2(stdout + stderr).includes("tooljet-server-mode:1"))
        return void 0;
      return CLI_TOO_OLD;
    } catch (err) {
      const e = err;
      if (e.code === "ENOENT" || /MODULE_NOT_FOUND|Cannot find module/.test(e.stderr ?? ""))
        return CLI_MISSING;
      return /Unknown command|not a tooljet command|command .*not found/i.test(strip2((e.stdout ?? "") + (e.stderr ?? ""))) ? CLI_TOO_OLD : CLI_MISSING;
    }
  })().then((problem) => {
    if (problem)
      cliReady = void 0;
    return problem;
  });
  return cliReady;
};
var CLI_FIX = "install it with `npm install -g @tooljet/cli@beta` (or set TOOLJET_CLI to its entry point), then try again";
var CLI_MISSING = `Code mode apps are built with the ToolJet CLI on the machine running this MCP server, and it is not installed: ${CLI_FIX}. No app was created. Or build a visual app (create_app without build_mode).`;
var CLI_TOO_OLD = `The ToolJet CLI on the machine running this MCP server is too old for Code mode: ${CLI_FIX}. No app was created. Or build a visual app (create_app without build_mode).`;
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
        let name = args.name;
        const taken = !existing && appIdOf(projectDir(name));
        if (taken && taken !== args.app_id && process.env.MCP_CODE_SCAFFOLD_FREE_NAME !== "0")
          name = `${args.name.slice(0, 32).replace(/-+$/, "")}-${args.app_id.slice(0, 8)}`;
        const dir = existing ? join(root(), existing) : projectDir(name);
        return await onProject(dir, async () => {
          const owner = appIdOf(dir);
          if (!existing && owner && owner !== args.app_id)
            throw new Error(`project "${name}" belongs to app ${owner}; choose another name`);
          const created = !existsSync(join(dir, "app.json"));
          if (created) {
            mkdirSync(root(), { recursive: true });
            const init = await cli(root(), ["app", "init", name, "--name", args.display_name, "--no-install"]);
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
          const visual = created ? await visualAppWarning(context.client, args.app_id) : void 0;
          return ok({
            project_dir: dir,
            ...visual ? { warning: visual } : {},
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
async function visualAppWarning(client, appId) {
  const app = await client.getApp(appId).catch(() => null);
  if (!app || isCodeModeApp(app))
    return void 0;
  return 'This app was created as a visual app, not a Code mode app (create_app without build_mode "code"). Its code will run, but ToolJet will treat it as visual. If this is a new build, create the app again with create_app build_mode "code" and scaffold that one instead; tell the user which app you used.';
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
var installReuse = () => process.env.MCP_CODE_INSTALL_REUSE !== "0" && !buildServiceUrl();
var devBuilt = /* @__PURE__ */ new Map();
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
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
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
    description: "Write into a Code mode project: app.json (name and routes [{id, path, title}]; its codePage stays as the scaffold set it), frontend/styles/theme.css (tokens), frontend/styles/global.css (page-wide rules and library overrides) and anything under frontend/src/. To change an existing file, read it first (code_app_read_files) and pass edits: [{ path, find, replace }] with the exact text to change; a file you wrote in this build needs no read first, and before the first install may be sent whole again. files: [{ path, content }] is for new files and for replacing a file still as the template left it, or for a rewrite the request needs (then rewrite: true, as well as the files). A write to a file that changed in the ToolJet editor since you read it is refused: read it again and apply your change to what is there. Read data with useAppQuery from ../tooljet.gen; write by awaiting a query's run({ ...parameters }); route with AppRouter, react-router <Routes>/<Route> whose paths are exactly app.json's, and routePath(id, params). A type_check in the result lists the project's type errors after this write: fix them before code_app_build. Then code_app_build." + USER_WORDS,
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
          const notes = [];
          for (const [rel, entry] of next) {
            const { full } = entry;
            let { content } = entry;
            if (rel === "app.json") {
              const keptPage = keepCodePage(full, content);
              content = keptPage.content;
              if (keptPage.note)
                notes.push(keptPage.note);
            }
            mkdirSync(dirname(full), { recursive: true });
            writeFileSync(full, content);
            readHashes.set(readKey(dir, rel), sha(content));
            ownWrites.set(readKey(dir, rel), sha(content));
            written.push(rel);
          }
          const types = await typeCheckAfterWrite(dir, written).catch(() => void 0);
          return ok({ project_dir: dir, ...sync, written, ...notes.length ? { notes } : {}, ...types ? { type_check: types } : {} });
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
function keepCodePage(full, content) {
  if (!existsSync(full))
    return { content };
  let before;
  let after;
  try {
    before = JSON.parse(readFileSync(full, "utf8"));
    after = JSON.parse(content);
  } catch {
    return { content };
  }
  const kept = before.codePage;
  if (!kept || typeof kept.handle !== "string")
    return { content };
  const sent = after.codePage;
  if (sent && sent.handle === kept.handle && sent.name === kept.name)
    return { content };
  const note = sent ? `app.json: codePage kept as "${kept.handle}" (the app's home page, which people open); the code cannot move to "${String(sent.handle)}". Change the name and routes only.` : void 0;
  return { content: JSON.stringify({ ...after, codePage: kept }, null, 2) + "\n", note };
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
  devBuilt.delete(dir);
  const build = buildServiceUrl() ? await buildInService(dir, "production") : await cli(join(dir, "frontend"), ["library", "build", ...installReuse() ? ["--env", "development"] : []]);
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
  if (okBuild && installReuse())
    devBuilt.set(dir, projectHash(dir));
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
    // The build reports the offline scan. Installation uses the full scan's gate.
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
    description: "Upload the app's code (tooljet app dev --once --source platform): it creates or updates the app's Code mode page, one hidden page per route (set each route's page permissions on it) and the component that runs the code, points the app version at this code as a Live preview, and stores the source on ToolJet so the Code panel can edit it. Build first. Installs when the full security scan passes, including when it reports nonblocking warnings. Returns the editor URL. If it says the source was edited in the ToolJet editor, call code_app_read_files to bring those edits down, reapply your change, and install again. verify: true makes it one check round: the build (as code_app_build; on any error it stops there, not installed, listing every error), the install, then the render check of every route in app.json (each once, at 1280 px unless widths says otherwise), in one report: build, install, render [{ route, width, ok, pages: [{ findings, accessibility }] }]. This is the last step of a build or edit: saving the app version (release_app saves a draft first) freezes the code." + USER_WORDS,
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
  const t0 = Date.now();
  const lap = {};
  const followed = await followDraft(dir);
  const sync = await ensureFresh(dir);
  lap.sync_ms = Date.now() - t0;
  nothingStored.delete(dir);
  const dependencies = dependencyRefusal(dir, "The install");
  if (dependencies)
    return new Error(`Not installed: ${dependencies.message}`);
  const unstored = removeUnstoredSource(dir);
  const unstyled = missingStylesheet(dir);
  if (unstyled)
    return new Error(`Not installed: ${unstyled} Then code_app_build and install again.`);
  const check = await fullScan(dir);
  lap.scan_ms = Date.now() - t0 - lap.sync_ms;
  lap.scan_reused = check.reused ? 1 : 0;
  const security = parseReport(check.output)?.security;
  if (!security || security.error)
    throw new Error(`The security scan did not run, so nothing was installed: ${security?.error ?? check.output.trim().slice(0, 2e3)}`);
  if (security.gate === "fail") {
    const details = [
      ...(security.findings ?? []).filter((f) => f.blocking).map((f) => `${f.severity.toUpperCase()} ${f.ruleId} ${f.package ?? f.location}: ${f.message}`),
      ...(security.notRun ?? []).map((check2) => `Check did not run: ${check2.id}${check2.reason ? ` (${check2.reason})` : ""}`)
    ];
    return new Error([
      "Not installed: the security scan blocked installation. If you cannot resolve the blocker, stop and tell the user.",
      ...details
    ].join("\n"));
  }
  if (security.gate !== "pass")
    return new Error("Not installed: the security scan did not report a pass or fail decision.");
  let prebuilt = [];
  if (buildServiceUrl()) {
    const built = await buildInService(dir, "development");
    if (built.code !== 0)
      throw new Error(built.output.trim());
    prebuilt = ["--prebuilt", join(dir, "frontend", "dist")];
  } else if (installReuse() && devBuilt.get(dir) === projectHash(dir) && existsSync(join(dir, "frontend", "dist", "manifest.json"))) {
    prebuilt = ["--prebuilt", join(dir, "frontend", "dist"), "--no-scan"];
  }
  devBuilt.delete(dir);
  const devStarted = Date.now();
  const result = await cli(dir, ["app", "dev", "--once", "--source", "platform", ...prebuilt]);
  lap.dev_ms = Date.now() - devStarted;
  lap.prebuilt = prebuilt.length ? 1 : 0;
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
    ...process.env.MCP_CODE_INSTALL_TIMINGS === "1" ? { timings: { ...lap, total_ms: Date.now() - t0 } } : {},
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
export {
  codeAppScaffoldTool as a,
  codeAppReadFilesTool as b,
  codeCliProblem as c,
  codeAppWriteFilesTool as d,
  codeAppBuildTool as e,
  codeAppInstallTool as f,
  codeAppAddDependencyTool as g,
  browserUserBindings as h,
  isCodeModeApp as i,
  browserUserMessage as j,
  noCodeIdentity as n
};
