import{createRequire as __cr}from"module";const require=__cr(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/sisteransi/src/index.js
var require_src = __commonJS({
  "node_modules/sisteransi/src/index.js"(exports, module) {
    "use strict";
    var ESC2 = "\x1B";
    var CSI2 = `${ESC2}[`;
    var beep = "\x07";
    var cursor3 = {
      to(x, y2) {
        if (!y2) return `${CSI2}${x + 1}G`;
        return `${CSI2}${y2 + 1};${x + 1}H`;
      },
      move(x, y2) {
        let ret = "";
        if (x < 0) ret += `${CSI2}${-x}D`;
        else if (x > 0) ret += `${CSI2}${x}C`;
        if (y2 < 0) ret += `${CSI2}${-y2}A`;
        else if (y2 > 0) ret += `${CSI2}${y2}B`;
        return ret;
      },
      up: (count = 1) => `${CSI2}${count}A`,
      down: (count = 1) => `${CSI2}${count}B`,
      forward: (count = 1) => `${CSI2}${count}C`,
      backward: (count = 1) => `${CSI2}${count}D`,
      nextLine: (count = 1) => `${CSI2}E`.repeat(count),
      prevLine: (count = 1) => `${CSI2}F`.repeat(count),
      left: `${CSI2}G`,
      hide: `${CSI2}?25l`,
      show: `${CSI2}?25h`,
      save: `${ESC2}7`,
      restore: `${ESC2}8`
    };
    var scroll = {
      up: (count = 1) => `${CSI2}S`.repeat(count),
      down: (count = 1) => `${CSI2}T`.repeat(count)
    };
    var erase3 = {
      screen: `${CSI2}2J`,
      up: (count = 1) => `${CSI2}1J`.repeat(count),
      down: (count = 1) => `${CSI2}J`.repeat(count),
      line: `${CSI2}2K`,
      lineEnd: `${CSI2}K`,
      lineStart: `${CSI2}1K`,
      lines(count) {
        let clear = "";
        for (let i2 = 0; i2 < count; i2++)
          clear += this.line + (i2 < count - 1 ? cursor3.up() : "");
        if (count)
          clear += cursor3.left;
        return clear;
      }
    };
    module.exports = { cursor: cursor3, scroll, erase: erase3, beep };
  }
});

// node_modules/picocolors/picocolors.js
var require_picocolors = __commonJS({
  "node_modules/picocolors/picocolors.js"(exports, module) {
    var p = process || {};
    var argv = p.argv || [];
    var env2 = p.env || {};
    var isColorSupported = !(!!env2.NO_COLOR || argv.includes("--no-color")) && (!!env2.FORCE_COLOR || argv.includes("--color") || p.platform === "win32" || (p.stdout || {}).isTTY && env2.TERM !== "dumb" || !!env2.CI);
    var formatter = (open, close, replace = open) => (input) => {
      let string = "" + input, index = string.indexOf(close, open.length);
      return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close;
    };
    var replaceClose = (string, close, replace, index) => {
      let result2 = "", cursor3 = 0;
      do {
        result2 += string.substring(cursor3, index) + replace;
        cursor3 = index + close.length;
        index = string.indexOf(close, cursor3);
      } while (~index);
      return result2 + string.substring(cursor3);
    };
    var createColors = (enabled = isColorSupported) => {
      let f = enabled ? formatter : () => String;
      return {
        isColorSupported: enabled,
        reset: f("\x1B[0m", "\x1B[0m"),
        bold: f("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
        dim: f("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
        italic: f("\x1B[3m", "\x1B[23m"),
        underline: f("\x1B[4m", "\x1B[24m"),
        inverse: f("\x1B[7m", "\x1B[27m"),
        hidden: f("\x1B[8m", "\x1B[28m"),
        strikethrough: f("\x1B[9m", "\x1B[29m"),
        black: f("\x1B[30m", "\x1B[39m"),
        red: f("\x1B[31m", "\x1B[39m"),
        green: f("\x1B[32m", "\x1B[39m"),
        yellow: f("\x1B[33m", "\x1B[39m"),
        blue: f("\x1B[34m", "\x1B[39m"),
        magenta: f("\x1B[35m", "\x1B[39m"),
        cyan: f("\x1B[36m", "\x1B[39m"),
        white: f("\x1B[37m", "\x1B[39m"),
        gray: f("\x1B[90m", "\x1B[39m"),
        bgBlack: f("\x1B[40m", "\x1B[49m"),
        bgRed: f("\x1B[41m", "\x1B[49m"),
        bgGreen: f("\x1B[42m", "\x1B[49m"),
        bgYellow: f("\x1B[43m", "\x1B[49m"),
        bgBlue: f("\x1B[44m", "\x1B[49m"),
        bgMagenta: f("\x1B[45m", "\x1B[49m"),
        bgCyan: f("\x1B[46m", "\x1B[49m"),
        bgWhite: f("\x1B[47m", "\x1B[49m"),
        blackBright: f("\x1B[90m", "\x1B[39m"),
        redBright: f("\x1B[91m", "\x1B[39m"),
        greenBright: f("\x1B[92m", "\x1B[39m"),
        yellowBright: f("\x1B[93m", "\x1B[39m"),
        blueBright: f("\x1B[94m", "\x1B[39m"),
        magentaBright: f("\x1B[95m", "\x1B[39m"),
        cyanBright: f("\x1B[96m", "\x1B[39m"),
        whiteBright: f("\x1B[97m", "\x1B[39m"),
        bgBlackBright: f("\x1B[100m", "\x1B[49m"),
        bgRedBright: f("\x1B[101m", "\x1B[49m"),
        bgGreenBright: f("\x1B[102m", "\x1B[49m"),
        bgYellowBright: f("\x1B[103m", "\x1B[49m"),
        bgBlueBright: f("\x1B[104m", "\x1B[49m"),
        bgMagentaBright: f("\x1B[105m", "\x1B[49m"),
        bgCyanBright: f("\x1B[106m", "\x1B[49m"),
        bgWhiteBright: f("\x1B[107m", "\x1B[49m")
      };
    };
    module.exports = createColors();
    module.exports.createColors = createColors;
  }
});

// dist/cli/commands.js
import { existsSync as existsSync5 } from "node:fs";
import { parseArgs } from "node:util";

// dist/cli/agents/index.js
import { existsSync as existsSync2 } from "node:fs";

// dist/cli/agents/shared.js
import { execFile } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, join } from "node:path";

// dist/config.js
function isPlaceholder(value) {
  return /^\$\{[^}]*\}$/.test(value.trim());
}

// dist/cli/agents/shared.js
var SERVER_NAME = "tooljet";
function credentialFromEnv(envMap) {
  if (!envMap || typeof envMap !== "object")
    return void 0;
  const get = (k) => {
    const v = envMap[k];
    return typeof v === "string" && v.trim() && !isPlaceholder(v) ? v.trim() : void 0;
  };
  const pat = get("TOOLJET_PAT");
  const url = get("TOOLJET_DEPLOYMENT_URL") ?? get("TOOLJET_APP_URL") ?? get("TOOLJET_URL");
  if (!pat || !url)
    return void 0;
  return { url, apiUrl: get("TOOLJET_URL"), pat };
}
var home = (...parts) => join(homedir(), ...parts);
var isWin = process.platform === "win32";
var isMac = process.platform === "darwin";
function appConfig(...parts) {
  if (isWin)
    return join(process.env.APPDATA ?? home("AppData", "Roaming"), ...parts);
  if (isMac)
    return home("Library", "Application Support", ...parts);
  return join(process.env.XDG_CONFIG_HOME ?? home(".config"), ...parts);
}
function which(bin) {
  const exts = isWin ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";") : [""];
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (!dir)
      continue;
    for (const ext of exts) {
      for (const name of /* @__PURE__ */ new Set([bin + ext.toLowerCase(), bin + ext])) {
        const candidate = join(dir, name);
        if (existsSync(candidate))
          return candidate;
      }
    }
  }
  return void 0;
}
function run(file, args) {
  return new Promise((resolve2) => {
    execFile(file, args, { timeout: 3e4, shell: isWin, windowsHide: true }, (err, stdout2, stderr) => {
      resolve2({ ok: !err, out: `${stdout2}${stderr}`.trim() });
    });
  });
}
function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return void 0;
  }
}
function readText(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}
function editJson(path, mutate) {
  let doc = {};
  if (existsSync(path)) {
    const raw = readFileSync(path, "utf8");
    if (raw.trim()) {
      try {
        doc = JSON.parse(raw);
      } catch {
        throw new Error(`${path} is not plain JSON (it may contain comments), so it was left untouched. Add the entry by hand \u2014 choose "Other agent" to see it.`);
      }
    }
    copyFileSync(path, `${path}.tj.bak`);
  } else {
    mkdirSync(dirname(path), { recursive: true });
  }
  mutate(doc);
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(doc, null, 2)}
`);
  renameSync(tmp, path);
}
var TOKEN_KEY = /^TOOLJET_(PAT|PASSWORD|SESSION_TOKEN)$/;
var TOKEN_HEADER = /^x-tooljet-(pat|session)$/i;
function entryHoldsToken(entry) {
  if (!entry || typeof entry !== "object")
    return false;
  const env2 = entry.env && typeof entry.env === "object" ? entry.env : {};
  const headers = entry.headers && typeof entry.headers === "object" ? entry.headers : {};
  return Object.entries(env2).some(([k, v]) => TOKEN_KEY.test(k) && typeof v === "string" && v && !isPlaceholder(v)) || Object.entries(headers).some(([k, v]) => TOKEN_HEADER.test(k) && typeof v === "string" && v);
}
function jsonFileAdapter(opts) {
  const key = opts.key ?? "mcpServers";
  const base = opts.entry ?? ((l2) => ({ command: l2.command, args: l2.args }));
  const entry = (l2) => l2.env ? { ...base(l2), env: l2.env } : base(l2);
  return {
    id: opts.id,
    name: opts.name,
    detect: opts.detect,
    reload: opts.reload,
    status() {
      const found = readJson(opts.file())?.[key]?.[SERVER_NAME];
      return { connected: found ? "yes" : "no", storedToken: entryHoldsToken(found) };
    },
    storedCredential() {
      return credentialFromEnv(readJson(opts.file())?.[key]?.[SERVER_NAME]?.env);
    },
    async connect(launch2) {
      editJson(opts.file(), (doc) => {
        doc[key] = { ...doc[key] ?? {}, [SERVER_NAME]: entry(launch2) };
      });
      return opts.file();
    },
    async disconnect() {
      editJson(opts.file(), (doc) => {
        if (doc[key])
          delete doc[key][SERVER_NAME];
      });
      return opts.file();
    }
  };
}

// dist/cli/agents/index.js
var macApp = (name) => isMac && existsSync2(`/Applications/${name}.app`);
var PLUGIN_KEY = "tooljet-app-builder@";
var claudeCode = {
  id: "claude-code",
  name: "Claude Code",
  reload: "New chats pick it up. In an open CLI session run /mcp; in the desktop app, start a new chat.",
  detect: () => Boolean(which("claude")) || existsSync2(home(".claude.json")),
  status() {
    const settings2 = readJson(home(".claude", "settings.json")) ?? {};
    const viaPlugin = Object.entries(settings2.enabledPlugins ?? {}).some(([k, on]) => k.startsWith(PLUGIN_KEY) && on === true);
    const viaUser = Boolean(readJson(home(".claude.json"))?.mcpServers?.[SERVER_NAME]);
    return {
      connected: viaPlugin ? "plugin" : viaUser ? "yes" : "no",
      storedToken: entryHoldsToken({ env: settings2.env ?? {} }),
      detail: viaPlugin ? "through the ToolJet plugin" : void 0
    };
  },
  async connect(launch2) {
    if (this.status().connected === "plugin")
      return "already provided by the ToolJet plugin \u2014 nothing to add";
    const bin = which("claude");
    if (!bin)
      throw new Error('The `claude` command is not on your PATH. Install Claude Code, or add the entry by hand ("Other agent").');
    const json = JSON.stringify({ type: "stdio", command: launch2.command, args: launch2.args, ...launch2.env ? { env: launch2.env } : {} });
    const res = await run(bin, ["mcp", "add-json", "--scope", "user", SERVER_NAME, json]);
    if (!res.ok)
      throw new Error(`claude mcp add-json failed: ${res.out}`);
    return "~/.claude.json (user scope)";
  },
  async disconnect() {
    if (this.status().connected === "plugin")
      throw new Error("ToolJet comes from the plugin here. Disable it in Claude Code with /plugin.");
    const bin = which("claude");
    if (!bin)
      throw new Error("The `claude` command is not on your PATH.");
    const res = await run(bin, ["mcp", "remove", "--scope", "user", SERVER_NAME]);
    if (!res.ok)
      throw new Error(`claude mcp remove failed: ${res.out}`);
    return "~/.claude.json (user scope)";
  },
  storedCredential: () => credentialFromEnv(readJson(home(".claude", "settings.json"))?.env),
  scrubToken() {
    const file = home(".claude", "settings.json");
    editJson(file, (doc) => {
      for (const k of Object.keys(doc.env ?? {}))
        if (/^TOOLJET_/.test(k))
          delete doc.env[k];
    });
    return file;
  }
};
function codexBinary() {
  return which("codex") ?? (isMac && existsSync2("/Applications/ChatGPT.app/Contents/Resources/codex") ? "/Applications/ChatGPT.app/Contents/Resources/codex" : void 0);
}
var codex = {
  id: "codex",
  name: "Codex",
  reload: "Restart the ChatGPT/Codex app, or start a new `codex` session.",
  detect: () => Boolean(codexBinary()) || existsSync2(home(".codex")),
  status() {
    const toml = readText(home(".codex", "config.toml"));
    const viaPlugin = /\[plugins\."tooljet-app-builder@[^"]*"\]\s*\r?\n\s*enabled\s*=\s*true/.test(toml);
    const viaUser = /^\[mcp_servers\.tooljet\]/m.test(toml);
    const block2 = toml.split(/^\[mcp_servers\.tooljet\.env\]/m)[1]?.split(/^\[/m)[0] ?? "";
    return {
      connected: viaPlugin ? "plugin" : viaUser ? "yes" : "no",
      storedToken: /^\s*TOOLJET_(PAT|PASSWORD)\s*=\s*"[^"$]/m.test(block2),
      detail: viaPlugin ? "through the ToolJet plugin" : void 0
    };
  },
  storedCredential() {
    const block2 = readText(home(".codex", "config.toml")).split(/^\[mcp_servers\.tooljet\.env\]/m)[1]?.split(/^\[/m)[0] ?? "";
    const envMap = Object.fromEntries([...block2.matchAll(/^\s*(TOOLJET_[A-Z_]+)\s*=\s*"([^"]*)"/gm)].map((m) => [m[1], m[2]]));
    return credentialFromEnv(envMap);
  },
  async connect(launch2) {
    if (this.status().connected === "plugin")
      return "already provided by the ToolJet plugin \u2014 nothing to add";
    const bin = codexBinary();
    if (!bin)
      throw new Error('Could not find the `codex` command. Add the entry by hand ("Other agent").');
    if (this.status().connected === "yes")
      await run(bin, ["mcp", "remove", SERVER_NAME]);
    const envArgs = Object.entries(launch2.env ?? {}).flatMap(([k, v]) => ["--env", `${k}=${v}`]);
    const res = await run(bin, ["mcp", "add", SERVER_NAME, ...envArgs, "--", launch2.command, ...launch2.args]);
    if (!res.ok)
      throw new Error(`codex mcp add failed: ${res.out}`);
    return "~/.codex/config.toml";
  },
  async disconnect() {
    if (this.status().connected === "plugin")
      throw new Error("ToolJet comes from the plugin here. Disable it from Codex \u2192 Plugins.");
    const bin = codexBinary();
    if (!bin)
      throw new Error("Could not find the `codex` command.");
    const res = await run(bin, ["mcp", "remove", SERVER_NAME]);
    if (!res.ok)
      throw new Error(`codex mcp remove failed: ${res.out}`);
    return "~/.codex/config.toml";
  }
};
var vscodeUserMcp = () => appConfig("Code", "User", "mcp.json");
var vscode = {
  ...jsonFileAdapter({
    id: "vscode",
    name: "VS Code (Copilot)",
    detect: () => Boolean(which("code")) || macApp("Visual Studio Code") || existsSync2(appConfig("Code", "User")),
    file: vscodeUserMcp,
    key: "servers",
    entry: (l2) => ({ type: "stdio", command: l2.command, args: l2.args }),
    reload: "VS Code starts it on your next chat message and asks once whether you trust it."
  }),
  async connect(launch2) {
    const bin = which("code");
    if (bin) {
      const json = JSON.stringify({ name: SERVER_NAME, type: "stdio", command: launch2.command, args: launch2.args, ...launch2.env ? { env: launch2.env } : {} });
      const res = await run(bin, ["--add-mcp", json]);
      if (res.ok)
        return "your VS Code user profile";
    }
    editJson(vscodeUserMcp(), (doc) => {
      doc.servers = { ...doc.servers ?? {}, [SERVER_NAME]: { type: "stdio", command: launch2.command, args: launch2.args, ...launch2.env ? { env: launch2.env } : {} } };
    });
    return vscodeUserMcp();
  }
};
var ADAPTERS = [
  claudeCode,
  codex,
  jsonFileAdapter({
    id: "antigravity",
    name: "Antigravity",
    detect: () => macApp("Antigravity") || existsSync2(home(".gemini", "config")),
    file: () => home(".gemini", "config", "mcp_config.json"),
    reload: "In Antigravity open MCP Servers \u2192 Manage and press Refresh (or restart the app)."
  }),
  jsonFileAdapter({
    id: "cursor",
    name: "Cursor",
    detect: () => macApp("Cursor") || existsSync2(home(".cursor")) || Boolean(which("cursor")),
    file: () => home(".cursor", "mcp.json"),
    entry: (l2) => ({ type: "stdio", command: l2.command, args: l2.args }),
    reload: 'Restart Cursor, then enable "tooljet" under Settings \u2192 MCP if it is off.'
  }),
  vscode,
  jsonFileAdapter({
    id: "claude-desktop",
    name: "Claude Desktop",
    detect: () => macApp("Claude") || existsSync2(appConfig("Claude", "claude_desktop_config.json")),
    file: () => appConfig("Claude", "claude_desktop_config.json"),
    reload: "Quit Claude Desktop completely and open it again."
  }),
  jsonFileAdapter({
    id: "gemini-cli",
    name: "Gemini CLI",
    detect: () => Boolean(which("gemini")) || existsSync2(home(".gemini", "settings.json")),
    file: () => home(".gemini", "settings.json"),
    reload: "Run /mcp refresh in an open session, or start a new one."
  }),
  jsonFileAdapter({
    id: "windsurf",
    name: "Windsurf",
    detect: () => macApp("Windsurf") || existsSync2(home(".codeium", "windsurf")),
    file: () => home(".codeium", "windsurf", "mcp_config.json"),
    reload: "Restart Windsurf."
  }),
  jsonFileAdapter({
    id: "kiro",
    name: "Kiro",
    detect: () => macApp("Kiro") || existsSync2(home(".kiro")),
    file: () => home(".kiro", "settings", "mcp.json"),
    reload: "Kiro reloads the file on save."
  })
];
var detectedAgents = () => ADAPTERS.filter((a2) => a2.detect());
function manualSetup(repoUrl, platform = process.platform) {
  const windows = platform === "win32";
  const placeholder = `${windows ? "C:" : ""}/path/to`;
  const argument = `${placeholder}/tooljet-mcp/bundle/index.js`;
  const json = JSON.stringify({ mcpServers: { [SERVER_NAME]: { command: "node", args: [argument] } } }, null, 2).replace(/\[\s+("(?:[^"\\]|\\.)*")\s+\]/, "[$1]");
  return {
    cloneCommand: `git clone ${repoUrl}`,
    name: SERVER_NAME,
    command: "node",
    argument,
    placeholder,
    json,
    notes: [
      "Already have the repo? Skip step 1.",
      windows ? "Not sure of the full path? Copy it from File Explorer's address bar." : "Not sure of the full path? Run pwd inside the tooljet-mcp folder.",
      ...windows ? ["In JSON, keep the forward slashes, or double every backslash."] : [],
      `If the agent cannot find node, use its full path (run: ${windows ? "where" : "which"} node).`,
      "To update later, run git pull inside the tooljet-mcp folder."
    ]
  };
}
function manualText(setup) {
  const indent = (block2, by) => block2.split("\n").map((line) => line ? by + line : "").join("\n");
  return indent([
    "Any agent that supports MCP servers can use ToolJet.",
    "",
    "1. Clone the ToolJet MCP repo into any folder, such as your Desktop:",
    "",
    indent(setup.cloneCommand, "   "),
    "",
    "2. Add a server in your agent's MCP settings.",
    `   Replace ${setup.placeholder} with the folder you cloned into.`,
    "",
    `   Name       ${setup.name}`,
    `   Command    ${setup.command}`,
    `   Argument   ${setup.argument}`,
    "",
    "   Most agents take it as JSON, often in a file named mcp.json:",
    "",
    indent(setup.json, "   "),
    "",
    "3. Restart the agent. No token goes in its config \u2014 use tj for servers.",
    "",
    ...setup.notes
  ].join("\n"), "   ");
}

// dist/setup.js
import { chmodSync, cpSync, existsSync as existsSync3, mkdirSync as mkdirSync2, readFileSync as readFileSync2, realpathSync, renameSync as renameSync2, rmSync, writeFileSync as writeFileSync2 } from "node:fs";
import { homedir as homedir3 } from "node:os";
import { delimiter as delimiter2, dirname as dirname2, join as join3, resolve } from "node:path";

// dist/profiles/paths.js
import { homedir as homedir2 } from "node:os";
import { join as join2 } from "node:path";
function homeDir() {
  const override = process.env.TOOLJET_MCP_HOME?.trim();
  return override ? override : join2(homedir2(), ".tooljet-mcp");
}
var profilesPath = () => join2(homeDir(), "profiles.json");
var installedBundlePath = () => join2(homeDir(), "bundle", "index.js");

// dist/runtimeFreshness.js
import { createHash } from "node:crypto";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
var TOOLJET_MCP_VERSION = "0.7.0";
function snapshot(path) {
  try {
    const stat = statSync(path);
    const source = `${Math.round(stat.mtimeMs * 1e3)}:${stat.size}`;
    return {
      buildId: createHash("sha256").update(source).digest("hex").slice(0, 12),
      modifiedMs: stat.mtimeMs,
      size: stat.size
    };
  } catch {
    return { buildId: "missing", modifiedMs: -1, size: -1 };
  }
}
var RuntimeFreshnessMonitor = class {
  artifactPath;
  loaded;
  startedAt = (/* @__PURE__ */ new Date()).toISOString();
  constructor(artifactPath = fileURLToPath(import.meta.url)) {
    this.artifactPath = artifactPath;
    this.loaded = snapshot(artifactPath);
  }
  status() {
    const current = snapshot(this.artifactPath);
    const stale = current.modifiedMs !== this.loaded.modifiedMs || current.size !== this.loaded.size;
    return {
      version: TOOLJET_MCP_VERSION,
      state: stale ? "stale" : "fresh",
      build_id: this.loaded.buildId,
      disk_build_id: current.buildId,
      process_started_at: this.startedAt,
      restart_required: stale
    };
  }
};
var runtimeFreshness = new RuntimeFreshnessMonitor();

// dist/profiles/version.js
function newerVersion(a2, b) {
  const parts = (v) => typeof v === "string" ? v.split(".").map((n3) => Number.parseInt(n3, 10) || 0) : [0, 0, 0];
  const pa = parts(a2), pb = parts(b);
  for (let i2 = 0; i2 < 3; i2++)
    if ((pa[i2] ?? 0) !== (pb[i2] ?? 0))
      return (pa[i2] ?? 0) > (pb[i2] ?? 0);
  return false;
}

// dist/setup.js
var versionPath = () => join3(homeDir(), "bundle", "version");
var REPO_URL = "https://github.com/ToolJet/tooljet-mcp.git";
var SHIM_MARKER = "tooljet-mcp shim";
function runningBundle() {
  try {
    const self = realpathSync(process.argv[1] ?? "");
    return /[\\/]bundle[\\/]index\.js$/.test(self) && existsSync3(resolve(dirname2(self), "..", "data")) ? self : void 0;
  } catch {
    return void 0;
  }
}
function shimPath() {
  const dir = process.env.TOOLJET_MCP_BIN_DIR?.trim();
  if (dir)
    return join3(dir, process.platform === "win32" ? "tj.cmd" : "tj");
  return process.platform === "win32" ? join3(process.env.LOCALAPPDATA ?? join3(homedir3(), "AppData", "Local"), "tooljet-mcp", "bin", "tj.cmd") : join3(homedir3(), ".local", "bin", "tj");
}
function shimOnPath() {
  const dir = dirname2(shimPath());
  return (process.env.PATH ?? "").split(delimiter2).some((p) => p && resolve(p) === resolve(dir));
}
function shimState() {
  const path = shimPath();
  if (!existsSync3(path))
    return "absent";
  try {
    return readFileSync2(path, "utf8").includes(SHIM_MARKER) ? "ours" : "foreign";
  } catch {
    return "foreign";
  }
}
function copyFile(from, to) {
  mkdirSync2(dirname2(to), { recursive: true, mode: 448 });
  cpSync(from, `${to}.${process.pid}.tmp`);
  renameSync2(`${to}.${process.pid}.tmp`, to);
}
function installBundle() {
  const from = runningBundle();
  const to = installedBundlePath();
  if (!from) {
    throw new Error("This command must run from a built bundle (bundle/index.js). From a source checkout run: npm run build:plugin");
  }
  if (resolve(from) === resolve(to))
    return { from, to };
  copyFile(join3(dirname2(from), "cli", "index.js"), join3(dirname2(to), "cli", "index.js"));
  copyFile(from, to);
  cpSync(resolve(dirname2(from), "..", "data"), join3(homeDir(), "data"), { recursive: true });
  writeFileSync2(join3(homeDir(), "package.json"), '{ "type": "module" }\n');
  writeFileSync2(versionPath(), TOOLJET_MCP_VERSION);
  return { from, to };
}
function writeShim() {
  const path = shimPath();
  mkdirSync2(dirname2(path), { recursive: true });
  const node = process.execPath;
  const bundle = installedBundlePath();
  if (process.platform === "win32") {
    writeFileSync2(path, `@echo off\r
rem ${SHIM_MARKER}\r
where node >nul 2>nul && (node "${bundle}" cli %*) || ("${node}" "${bundle}" cli %*)\r
`);
  } else {
    writeFileSync2(path, `#!/bin/sh
# ${SHIM_MARKER}
if command -v node >/dev/null 2>&1; then exec node "${bundle}" cli "$@"; fi
exec "${node}" "${bundle}" cli "$@"
`);
    chmodSync(path, 493);
  }
  return path;
}
function removeShim() {
  if (shimState() !== "ours")
    return false;
  rmSync(shimPath(), { force: true });
  return true;
}
function removeInstalled() {
  rmSync(join3(homeDir(), "bundle"), { recursive: true, force: true });
  rmSync(join3(homeDir(), "data"), { recursive: true, force: true });
  rmSync(join3(homeDir(), "package.json"), { force: true });
}
var removeHome = () => rmSync(homeDir(), { recursive: true, force: true });
function selfCommand() {
  if (shimState() === "ours" && shimOnPath())
    return "tj";
  return `"${process.execPath}" "${runningBundle() ?? installedBundlePath()}" cli`;
}
var isInstalled = () => existsSync3(installedBundlePath());
function launch() {
  return { command: process.execPath, args: [installedBundlePath()] };
}

// node_modules/@clack/core/dist/index.mjs
import { styleText } from "node:util";
import { stdout, stdin } from "node:process";
import * as l from "node:readline";
import l__default from "node:readline";

// node_modules/fast-string-truncated-width/dist/utils.js
var getCodePointsLength = /* @__PURE__ */ (() => {
  const SURROGATE_PAIR_RE = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
  return (input) => {
    let surrogatePairsNr = 0;
    SURROGATE_PAIR_RE.lastIndex = 0;
    while (SURROGATE_PAIR_RE.test(input)) {
      surrogatePairsNr += 1;
    }
    return input.length - surrogatePairsNr;
  };
})();
var isFullWidth = (x) => {
  return x === 12288 || x >= 65281 && x <= 65376 || x >= 65504 && x <= 65510;
};
var isWideNotCJKTNotEmoji = (x) => {
  return x === 8987 || x === 9001 || x >= 12272 && x <= 12287 || x >= 12289 && x <= 12350 || x >= 12441 && x <= 12543 || x >= 12549 && x <= 12591 || x >= 12593 && x <= 12686 || x >= 12688 && x <= 12771 || x >= 12783 && x <= 12830 || x >= 12832 && x <= 12871 || x >= 12880 && x <= 19903 || x >= 65040 && x <= 65049 || x >= 65072 && x <= 65106 || x >= 65108 && x <= 65126 || x >= 65128 && x <= 65131 || x >= 127488 && x <= 127490 || x >= 127504 && x <= 127547 || x >= 127552 && x <= 127560 || x >= 131072 && x <= 196605 || x >= 196608 && x <= 262141;
};

// node_modules/fast-string-truncated-width/dist/index.js
var ANSI_RE = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]|\u001b\]8;[^;]*;.*?(?:\u0007|\u001b\u005c)/y;
var CONTROL_RE = /[\x00-\x08\x0A-\x1F\x7F-\x9F]{1,1000}/y;
var CJKT_WIDE_RE = /(?:(?![\uFF61-\uFF9F\uFF00-\uFFEF])[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Tangut}]){1,1000}/yu;
var TAB_RE = /\t{1,1000}/y;
var EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}]{2}|\u{1F3F4}[\u{E0061}-\u{E007A}]{2}[\u{E0030}-\u{E0039}\u{E0061}-\u{E007A}]{1,3}\u{E007F}|(?:\p{Emoji}\uFE0F\u20E3?|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation})(?:\u200D(?:\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F\u20E3?))*/yu;
var LATIN_RE = /(?:[\x20-\x7E\xA0-\xFF](?!\uFE0F)){1,1000}/y;
var MODIFIER_RE = /\p{M}+/gu;
var NO_TRUNCATION = { limit: Infinity, ellipsis: "" };
var getStringTruncatedWidth = (input, truncationOptions = {}, widthOptions = {}) => {
  const LIMIT = truncationOptions.limit ?? Infinity;
  const ELLIPSIS = truncationOptions.ellipsis ?? "";
  const ELLIPSIS_WIDTH = truncationOptions?.ellipsisWidth ?? (ELLIPSIS ? getStringTruncatedWidth(ELLIPSIS, NO_TRUNCATION, widthOptions).width : 0);
  const ANSI_WIDTH = 0;
  const CONTROL_WIDTH = widthOptions.controlWidth ?? 0;
  const TAB_WIDTH = widthOptions.tabWidth ?? 8;
  const EMOJI_WIDTH = widthOptions.emojiWidth ?? 2;
  const FULL_WIDTH_WIDTH = 2;
  const REGULAR_WIDTH = widthOptions.regularWidth ?? 1;
  const WIDE_WIDTH = widthOptions.wideWidth ?? FULL_WIDTH_WIDTH;
  const PARSE_BLOCKS = [
    [LATIN_RE, REGULAR_WIDTH],
    [ANSI_RE, ANSI_WIDTH],
    [CONTROL_RE, CONTROL_WIDTH],
    [TAB_RE, TAB_WIDTH],
    [EMOJI_RE, EMOJI_WIDTH],
    [CJKT_WIDE_RE, WIDE_WIDTH]
  ];
  let indexPrev = 0;
  let index = 0;
  let length = input.length;
  let lengthExtra = 0;
  let truncationEnabled = false;
  let truncationIndex = length;
  let truncationLimit = Math.max(0, LIMIT - ELLIPSIS_WIDTH);
  let unmatchedStart = 0;
  let unmatchedEnd = 0;
  let width = 0;
  let widthExtra = 0;
  outer: while (true) {
    if (unmatchedEnd > unmatchedStart || index >= length && index > indexPrev) {
      const unmatched = input.slice(unmatchedStart, unmatchedEnd) || input.slice(indexPrev, index);
      lengthExtra = 0;
      for (const char of unmatched.replaceAll(MODIFIER_RE, "")) {
        const codePoint = char.codePointAt(0) || 0;
        if (isFullWidth(codePoint)) {
          widthExtra = FULL_WIDTH_WIDTH;
        } else if (isWideNotCJKTNotEmoji(codePoint)) {
          widthExtra = WIDE_WIDTH;
        } else {
          widthExtra = REGULAR_WIDTH;
        }
        if (width + widthExtra > truncationLimit) {
          truncationIndex = Math.min(truncationIndex, Math.max(unmatchedStart, indexPrev) + lengthExtra);
        }
        if (width + widthExtra > LIMIT) {
          truncationEnabled = true;
          break outer;
        }
        lengthExtra += char.length;
        width += widthExtra;
      }
      unmatchedStart = unmatchedEnd = 0;
    }
    if (index >= length) {
      break outer;
    }
    for (let i2 = 0, l2 = PARSE_BLOCKS.length; i2 < l2; i2++) {
      const [BLOCK_RE, BLOCK_WIDTH] = PARSE_BLOCKS[i2];
      BLOCK_RE.lastIndex = index;
      if (BLOCK_RE.test(input)) {
        lengthExtra = BLOCK_RE === CJKT_WIDE_RE ? getCodePointsLength(input.slice(index, BLOCK_RE.lastIndex)) : BLOCK_RE === EMOJI_RE ? 1 : BLOCK_RE.lastIndex - index;
        widthExtra = lengthExtra * BLOCK_WIDTH;
        if (width + widthExtra > truncationLimit) {
          truncationIndex = Math.min(truncationIndex, index + Math.floor((truncationLimit - width) / BLOCK_WIDTH));
        }
        if (width + widthExtra > LIMIT) {
          truncationEnabled = true;
          break outer;
        }
        width += widthExtra;
        unmatchedStart = indexPrev;
        unmatchedEnd = index;
        index = indexPrev = BLOCK_RE.lastIndex;
        continue outer;
      }
    }
    index += 1;
  }
  return {
    width: truncationEnabled ? truncationLimit : width,
    index: truncationEnabled ? truncationIndex : length,
    truncated: truncationEnabled,
    ellipsed: truncationEnabled && LIMIT >= ELLIPSIS_WIDTH
  };
};
var dist_default = getStringTruncatedWidth;

// node_modules/fast-string-width/dist/index.js
var NO_TRUNCATION2 = {
  limit: Infinity,
  ellipsis: "",
  ellipsisWidth: 0
};
var fastStringWidth = (input, options = {}) => {
  return dist_default(input, NO_TRUNCATION2, options).width;
};
var dist_default2 = fastStringWidth;

// node_modules/fast-wrap-ansi/lib/main.js
var ESC = "\x1B";
var CSI = "\x9B";
var END_CODE = 39;
var ANSI_ESCAPE_BELL = "\x07";
var ANSI_CSI = "[";
var ANSI_OSC = "]";
var ANSI_SGR_TERMINATOR = "m";
var ANSI_ESCAPE_LINK = `${ANSI_OSC}8;;`;
var GROUP_REGEX = new RegExp(`(?:\\${ANSI_CSI}(?<code>\\d+)m|\\${ANSI_ESCAPE_LINK}(?<uri>.*)${ANSI_ESCAPE_BELL})`, "y");
var getClosingCode = (openingCode) => {
  if (openingCode >= 30 && openingCode <= 37)
    return 39;
  if (openingCode >= 90 && openingCode <= 97)
    return 39;
  if (openingCode >= 40 && openingCode <= 47)
    return 49;
  if (openingCode >= 100 && openingCode <= 107)
    return 49;
  if (openingCode === 1 || openingCode === 2)
    return 22;
  if (openingCode === 3)
    return 23;
  if (openingCode === 4)
    return 24;
  if (openingCode === 7)
    return 27;
  if (openingCode === 8)
    return 28;
  if (openingCode === 9)
    return 29;
  if (openingCode === 0)
    return 0;
  return void 0;
};
var wrapAnsiCode = (code) => `${ESC}${ANSI_CSI}${code}${ANSI_SGR_TERMINATOR}`;
var wrapAnsiHyperlink = (url) => `${ESC}${ANSI_ESCAPE_LINK}${url}${ANSI_ESCAPE_BELL}`;
var wrapWord = (rows, word, columns) => {
  const characters = word[Symbol.iterator]();
  let isInsideEscape = false;
  let isInsideLinkEscape = false;
  let lastRow = rows.at(-1);
  let visible = lastRow === void 0 ? 0 : dist_default2(lastRow);
  let currentCharacter = characters.next();
  let nextCharacter = characters.next();
  let rawCharacterIndex = 0;
  while (!currentCharacter.done) {
    const character = currentCharacter.value;
    const characterLength = dist_default2(character);
    if (visible + characterLength <= columns) {
      rows[rows.length - 1] += character;
    } else {
      rows.push(character);
      visible = 0;
    }
    if (character === ESC || character === CSI) {
      isInsideEscape = true;
      isInsideLinkEscape = word.startsWith(ANSI_ESCAPE_LINK, rawCharacterIndex + 1);
    }
    if (isInsideEscape) {
      if (isInsideLinkEscape) {
        if (character === ANSI_ESCAPE_BELL) {
          isInsideEscape = false;
          isInsideLinkEscape = false;
        }
      } else if (character === ANSI_SGR_TERMINATOR) {
        isInsideEscape = false;
      }
    } else {
      visible += characterLength;
      if (visible === columns && !nextCharacter.done) {
        rows.push("");
        visible = 0;
      }
    }
    currentCharacter = nextCharacter;
    nextCharacter = characters.next();
    rawCharacterIndex += character.length;
  }
  lastRow = rows.at(-1);
  if (!visible && lastRow !== void 0 && lastRow.length && rows.length > 1) {
    rows[rows.length - 2] += rows.pop();
  }
};
var stringVisibleTrimSpacesRight = (string) => {
  const words = string.split(" ");
  let last = words.length;
  while (last) {
    if (dist_default2(words[last - 1])) {
      break;
    }
    last--;
  }
  if (last === words.length) {
    return string;
  }
  return words.slice(0, last).join(" ") + words.slice(last).join("");
};
var exec = (string, columns, options = {}) => {
  if (options.trim !== false && string.trim() === "") {
    return "";
  }
  let returnValue = "";
  let escapeCode;
  let escapeUrl;
  const words = string.split(" ");
  let rows = [""];
  let rowLength = 0;
  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    if (options.trim !== false) {
      const row = rows.at(-1) ?? "";
      const trimmed = row.trimStart();
      if (row.length !== trimmed.length) {
        rows[rows.length - 1] = trimmed;
        rowLength = dist_default2(trimmed);
      }
    }
    if (index !== 0) {
      if (rowLength >= columns && (options.wordWrap === false || options.trim === false)) {
        rows.push("");
        rowLength = 0;
      }
      if (rowLength || options.trim === false) {
        rows[rows.length - 1] += " ";
        rowLength++;
      }
    }
    const wordLength = dist_default2(word);
    if (options.hard && wordLength > columns) {
      const remainingColumns = columns - rowLength;
      const breaksStartingThisLine = 1 + Math.floor((wordLength - remainingColumns - 1) / columns);
      const breaksStartingNextLine = Math.floor((wordLength - 1) / columns);
      if (breaksStartingNextLine < breaksStartingThisLine) {
        rows.push("");
      }
      wrapWord(rows, word, columns);
      rowLength = dist_default2(rows.at(-1) ?? "");
      continue;
    }
    if (rowLength + wordLength > columns && rowLength && wordLength) {
      if (options.wordWrap === false && rowLength < columns) {
        wrapWord(rows, word, columns);
        rowLength = dist_default2(rows.at(-1) ?? "");
        continue;
      }
      rows.push("");
      rowLength = 0;
    }
    if (rowLength + wordLength > columns && options.wordWrap === false) {
      wrapWord(rows, word, columns);
      rowLength = dist_default2(rows.at(-1) ?? "");
      continue;
    }
    rows[rows.length - 1] += word;
    rowLength += wordLength;
  }
  if (options.trim !== false) {
    rows = rows.map((row) => stringVisibleTrimSpacesRight(row));
  }
  const preString = rows.join("\n");
  let inSurrogate = false;
  for (let i2 = 0; i2 < preString.length; i2++) {
    const character = preString[i2];
    returnValue += character;
    if (!inSurrogate) {
      inSurrogate = character >= "\uD800" && character <= "\uDBFF";
      if (inSurrogate) {
        continue;
      }
    } else {
      inSurrogate = false;
    }
    if (character === ESC || character === CSI) {
      GROUP_REGEX.lastIndex = i2 + 1;
      const groupsResult = GROUP_REGEX.exec(preString);
      const groups = groupsResult?.groups;
      if (groups?.code !== void 0) {
        const code = Number.parseFloat(groups.code);
        escapeCode = code === END_CODE ? void 0 : code;
      } else if (groups?.uri !== void 0) {
        escapeUrl = groups.uri.length === 0 ? void 0 : groups.uri;
      }
    }
    if (preString[i2 + 1] === "\n") {
      if (escapeUrl) {
        returnValue += wrapAnsiHyperlink("");
      }
      const closingCode = escapeCode ? getClosingCode(escapeCode) : void 0;
      if (escapeCode && closingCode) {
        returnValue += wrapAnsiCode(closingCode);
      }
    } else if (character === "\n") {
      if (escapeCode && getClosingCode(escapeCode)) {
        returnValue += wrapAnsiCode(escapeCode);
      }
      if (escapeUrl) {
        returnValue += wrapAnsiHyperlink(escapeUrl);
      }
    }
  }
  return returnValue;
};
var CRLF_OR_LF = /\r?\n/;
function wrapAnsi(string, columns, options) {
  return String(string).normalize().split(CRLF_OR_LF).map((line) => exec(line, columns, options)).join("\n");
}

// node_modules/@clack/core/dist/index.mjs
var import_sisteransi = __toESM(require_src(), 1);
import { ReadStream } from "node:tty";
function findCursor(s, o, l2) {
  if (!l2.some((r2) => !r2.disabled))
    return s;
  const t2 = s + o, n3 = Math.max(l2.length - 1, 0), e = t2 < 0 ? n3 : t2 > n3 ? 0 : t2;
  return l2[e]?.disabled ? findCursor(e, o < 0 ? -1 : 1, l2) : e;
}
var a$1 = ["up", "down", "left", "right", "space", "enter", "cancel"];
var t = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
var settings = {
  actions: new Set(a$1),
  aliases: /* @__PURE__ */ new Map([
    // vim support
    ["k", "up"],
    ["j", "down"],
    ["h", "left"],
    ["l", "right"],
    ["", "cancel"],
    // opinionated defaults!
    ["escape", "cancel"]
  ]),
  messages: {
    cancel: "Canceled",
    error: "Something went wrong"
  },
  withGuide: true,
  accessible: void 0,
  date: {
    monthNames: [...t],
    messages: {
      required: "Please enter a valid date",
      invalidMonth: "There are only 12 months in a year",
      invalidDay: (n3, e) => `There are only ${n3} days in ${e}`,
      afterMin: (n3) => `Date must be on or after ${n3.toISOString().slice(0, 10)}`,
      beforeMax: (n3) => `Date must be on or before ${n3.toISOString().slice(0, 10)}`
    }
  }
};
function isAccessible(n3) {
  if (n3 !== void 0) return n3;
  if (settings.accessible !== void 0) return settings.accessible;
  const e = process.env.ACCESSIBLE;
  return e !== void 0 && e !== "" && e !== "0" && e !== "false";
}
function isActionKey(n3, e) {
  if (typeof n3 == "string")
    return settings.aliases.get(n3) === e;
  for (const s of n3)
    if (s !== void 0 && isActionKey(s, e))
      return true;
  return false;
}
function diffLines(i2, s) {
  if (i2 === s) return;
  const e = i2.split(`
`), t2 = s.split(`
`), r2 = Math.max(e.length, t2.length), f = [];
  for (let n3 = 0; n3 < r2; n3++)
    e[n3] !== t2[n3] && f.push(n3);
  return {
    lines: f,
    numLinesBefore: e.length,
    numLinesAfter: t2.length,
    numLines: r2
  };
}
var R = globalThis.process.platform.startsWith("win");
var CANCEL_SYMBOL = /* @__PURE__ */ Symbol("clack:cancel");
function isCancel(e) {
  return e === CANCEL_SYMBOL;
}
function setRawMode(e, r2) {
  const o = e;
  o.isTTY && o.setRawMode(r2);
}
function block({
  input: e = stdin,
  output: r2 = stdout,
  overwrite: o = true,
  hideCursor: n3 = true
} = {}) {
  const s = l.createInterface({
    input: e,
    output: r2,
    prompt: "",
    tabSize: 1
  });
  l.emitKeypressEvents(e, s), e instanceof ReadStream && e.isTTY && e.setRawMode(true);
  const t2 = (f, { name: a2, sequence: w }) => {
    const c = String(f);
    if (isActionKey([c, a2, w], "cancel")) {
      n3 && r2.write(import_sisteransi.cursor.show), process.exit(0);
      return;
    }
    if (!o) return;
    const i2 = a2 === "return" ? 0 : -1, m = a2 === "return" ? -1 : 0;
    l.moveCursor(r2, i2, m, () => {
      l.clearLine(r2, 1, () => {
        e.once("keypress", t2);
      });
    });
  };
  return n3 && r2.write(import_sisteransi.cursor.hide), e.once("keypress", t2), () => {
    e.off("keypress", t2), n3 && r2.write(import_sisteransi.cursor.show), e instanceof ReadStream && e.isTTY && !R && e.setRawMode(false), s.terminal = false, s.close();
  };
}
var getColumns = (e) => "columns" in e && typeof e.columns == "number" ? e.columns : 80;
var getRows = (e) => "rows" in e && typeof e.rows == "number" ? e.rows : 20;
function runValidation(e, a2) {
  if ("~standard" in e) {
    const n3 = e["~standard"].validate(a2);
    return n3 instanceof Promise ? n3.then((r2) => r2.issues?.at(0)?.message) : n3.issues?.at(0)?.message;
  }
  return e(a2);
}
var y = class {
  input;
  output;
  _abortSignal;
  rl;
  opts;
  _render;
  _track = false;
  _prevFrame = "";
  _subscribers = /* @__PURE__ */ new Map();
  _cursor = 0;
  state = "initial";
  error = "";
  value;
  userInput = "";
  /**
   * Whether accessible (static, screen-reader friendly) output is enabled for
   * this prompt, resolved from the `accessible` option, the global setting,
   * and the `ACCESSIBLE` env var.
   */
  get accessible() {
    return isAccessible(this.opts.accessible);
  }
  constructor(t2, e = true) {
    const { input: i2 = stdin, output: s = stdout, render: r2, signal: n3, ...o } = t2;
    this.opts = o, this.onKeypress = this.onKeypress.bind(this), this.close = this.close.bind(this), this.render = this.render.bind(this), this._render = r2.bind(this), this._track = e, this._abortSignal = n3, this.input = i2, this.output = s;
  }
  /**
   * Unsubscribe all listeners
   */
  unsubscribe() {
    this._subscribers.clear();
  }
  /**
   * Set a subscriber with opts
   * @param event - The event name
   */
  setSubscriber(t2, e) {
    const i2 = this._subscribers.get(t2) ?? [];
    i2.push(e), this._subscribers.set(t2, i2);
  }
  /**
   * Subscribe to an event
   * @param event - The event name
   * @param cb - The callback
   */
  on(t2, e) {
    this.setSubscriber(t2, { cb: e });
  }
  /**
   * Subscribe to an event once
   * @param event - The event name
   * @param cb - The callback
   */
  once(t2, e) {
    this.setSubscriber(t2, { cb: e, once: true });
  }
  /**
   * Emit an event with data
   * @param event - The event name
   * @param data - The data to pass to the callback
   */
  emit(t2, ...e) {
    const i2 = this._subscribers.get(t2) ?? [], s = [];
    for (const r2 of i2)
      r2.cb(...e), r2.once && s.push(() => i2.splice(i2.indexOf(r2), 1));
    for (const r2 of s)
      r2();
  }
  prompt() {
    return new Promise((t2) => {
      if (this._abortSignal) {
        if (this._abortSignal.aborted)
          return this.state = "cancel", this.close(), t2(CANCEL_SYMBOL);
        this._abortSignal.addEventListener(
          "abort",
          () => {
            this.state = "cancel", this.close();
          },
          { once: true }
        );
      }
      this.rl = l__default.createInterface({
        input: this.input,
        tabSize: 2,
        prompt: "",
        escapeCodeTimeout: 50,
        terminal: true
      }), this.rl.prompt(), this.opts.initialUserInput !== void 0 && this._setUserInput(this.opts.initialUserInput, true), this.input.on("keypress", this.onKeypress), setRawMode(this.input, true), this.output.on("resize", this.render), this.render(), this.once("submit", () => {
        this.output.write(import_sisteransi.cursor.show), this.output.off("resize", this.render), setRawMode(this.input, false), t2(this.value);
      }), this.once("cancel", () => {
        this.output.write(import_sisteransi.cursor.show), this.output.off("resize", this.render), setRawMode(this.input, false), t2(CANCEL_SYMBOL);
      });
    });
  }
  _isActionKey(t2, e) {
    return t2 === "	";
  }
  _shouldSubmit(t2, e) {
    return true;
  }
  _setValue(t2) {
    this.value = t2, this.emit("value", this.value);
  }
  _setUserInput(t2, e) {
    this.userInput = t2 ?? "", this.emit("userInput", this.userInput), e && this._track && this.rl && (this.rl.write(this.userInput), this._cursor = this.rl.cursor);
  }
  _clearUserInput() {
    this.rl?.write(null, { ctrl: true, name: "u" }), this._setUserInput("");
  }
  async onKeypress(t2, e) {
    if (this.state !== "validating") {
      if (this._track && e.name !== "return" && (e.name && this._isActionKey(t2, e) && this.rl?.write(null, { ctrl: true, name: "h" }), this._cursor = this.rl?.cursor ?? 0, this._setUserInput(this.rl?.line)), this.state === "error" && (this.state = "active"), e?.name && (!this._track && settings.aliases.has(e.name) && this.emit("cursor", settings.aliases.get(e.name)), settings.actions.has(e.name) && this.emit("cursor", e.name)), t2 && (t2.toLowerCase() === "y" || t2.toLowerCase() === "n") && this.emit("confirm", t2.toLowerCase() === "y"), this.emit("key", t2, e), e?.name === "return" && this._shouldSubmit(t2, e)) {
        if (this.opts.validate) {
          const i2 = runValidation(this.opts.validate, this.value);
          let s;
          i2 instanceof Promise ? (this.state = "validating", this.render(), s = await i2) : s = i2, s && (this.error = s instanceof Error ? s.message : s, this.state = "error", this.rl?.write(this.userInput));
        }
        this.state !== "error" && (this.state = "submit");
      }
      isActionKey([t2, e?.name, e?.sequence], "cancel") && (this.state = "cancel"), (this.state === "submit" || this.state === "cancel") && this.emit("finalize"), this.render(), (this.state === "submit" || this.state === "cancel") && this.close();
    }
  }
  close() {
    this.input.unpipe(), this.input.removeListener("keypress", this.onKeypress), this.output.write(`
`), setRawMode(this.input, false), this.rl?.close(), this.rl = void 0, this.emit(`${this.state}`, this.value), this.unsubscribe();
  }
  restoreCursor() {
    const t2 = wrapAnsi(this._prevFrame, process.stdout.columns, { hard: true, trim: false }).split(`
`).length - 1;
    this.output.write(import_sisteransi.cursor.move(-999, t2 * -1));
  }
  render() {
    const t2 = wrapAnsi(this._render(this) ?? "", process.stdout.columns, {
      hard: true,
      trim: false
    });
    if (t2 !== this._prevFrame) {
      if (this.state === "initial")
        this.output.write(import_sisteransi.cursor.hide);
      else {
        const e = diffLines(this._prevFrame, t2), i2 = getRows(this.output);
        if (this.restoreCursor(), e) {
          const s = Math.max(0, e.numLinesAfter - i2), r2 = Math.max(0, e.numLinesBefore - i2);
          let n3 = e.lines.find((o) => o >= s);
          if (n3 === void 0) {
            this._prevFrame = t2;
            return;
          }
          if (e.lines.length === 1) {
            this.output.write(import_sisteransi.cursor.move(0, n3 - r2)), this.output.write(import_sisteransi.erase.lines(1));
            const o = t2.split(`
`);
            this.output.write(o[n3]), this._prevFrame = t2, this.output.write(import_sisteransi.cursor.move(0, o.length - n3 - 1));
            return;
          } else if (e.lines.length > 1) {
            if (s < r2)
              n3 = s;
            else {
              const h2 = n3 - r2;
              h2 > 0 && this.output.write(import_sisteransi.cursor.move(0, h2));
            }
            this.output.write(import_sisteransi.erase.down());
            const f = t2.split(`
`).slice(n3);
            this.output.write(f.join(`
`)), this._prevFrame = t2;
            return;
          }
        }
        this.output.write(import_sisteransi.erase.down());
      }
      this.output.write(t2), this.state === "initial" && (this.state = "active"), this._prevFrame = t2;
    }
  }
};
var r = class extends y {
  get cursor() {
    return this.value ? 0 : 1;
  }
  get _value() {
    return this.cursor === 0;
  }
  constructor(t2) {
    super(t2, false), this.value = !!t2.initialValue, this.on("userInput", () => {
      this.value = this._value;
    }), this.on("confirm", (i2) => {
      this.output.write(import_sisteransi.cursor.move(0, -1)), this.value = i2, this.state = "submit", this.close();
    }), this.on("cursor", () => {
      this.value = !this.value;
    });
  }
};
var u$1 = class u extends y {
  _mask = "\u2022";
  get cursor() {
    return this._cursor;
  }
  get masked() {
    return this.userInput.replaceAll(/./g, this._mask);
  }
  get userInputWithCursor() {
    if (this.state === "submit" || this.state === "cancel")
      return this.masked;
    const t2 = this.userInput;
    if (this.cursor >= t2.length)
      return `${this.masked}${styleText(["inverse", "hidden"], "_")}`;
    const s = this.masked, r2 = s.slice(0, this.cursor), i2 = s.slice(this.cursor, this.cursor + 1), o = s.slice(this.cursor + 1);
    return `${r2}${styleText("inverse", i2)}${o}`;
  }
  clear() {
    this._clearUserInput();
  }
  constructor({ mask: t2, ...s }) {
    super(s), this._mask = t2 ?? "\u2022", this.on("userInput", (r2) => {
      this._setValue(r2);
    }), this.on("finalize", () => {
      this.value === void 0 && (this.value = "");
    });
  }
};
var n$1 = class n extends y {
  options;
  cursor = 0;
  get _selectedValue() {
    return this.options[this.cursor];
  }
  changeValue() {
    const e = this._selectedValue;
    this.value = e === void 0 ? void 0 : e.value;
  }
  constructor(e) {
    super(e, false), this.options = e.options;
    const o = this.options.findIndex(({ value: s }) => s === e.initialValue), t2 = o === -1 ? 0 : o;
    this.cursor = this.options[t2]?.disabled ? findCursor(t2, 1, this.options) : t2, this.changeValue(), this.on("cursor", (s) => {
      switch (s) {
        case "left":
        case "up":
          this.cursor = findCursor(this.cursor, -1, this.options);
          break;
        case "down":
        case "right":
          this.cursor = findCursor(this.cursor, 1, this.options);
          break;
      }
      this.changeValue();
    });
  }
};
var n2 = class extends y {
  get userInputWithCursor() {
    if (this.state === "submit")
      return this.userInput;
    const t2 = this.userInput;
    if (this.cursor >= t2.length)
      return `${this.userInput}\u2588`;
    const r2 = t2.slice(0, this.cursor), s = t2.slice(this.cursor, this.cursor + 1), e = t2.slice(this.cursor + 1);
    return `${r2}${styleText("inverse", s)}${e}`;
  }
  get cursor() {
    return this._cursor;
  }
  constructor(t2) {
    super({
      ...t2,
      initialUserInput: t2.initialUserInput ?? t2.initialValue
    }), this.on("userInput", (r2) => {
      this._setValue(r2);
    }), this.on("finalize", () => {
      this.value || (this.value = t2.defaultValue), this.value === void 0 && (this.value = "");
    });
  }
};

// node_modules/@clack/prompts/dist/index.mjs
import { styleText as styleText2, stripVTControlCharacters } from "node:util";
import process$1 from "node:process";
var import_sisteransi2 = __toESM(require_src(), 1);
function isUnicodeSupported() {
  if (process$1.platform !== "win32") {
    return process$1.env.TERM !== "linux";
  }
  return Boolean(process$1.env.CI) || Boolean(process$1.env.WT_SESSION) || Boolean(process$1.env.TERMINUS_SUBLIME) || process$1.env.ConEmuTask === "{cmd::Cmder}" || process$1.env.TERM_PROGRAM === "Terminus-Sublime" || process$1.env.TERM_PROGRAM === "vscode" || process$1.env.TERM === "xterm-256color" || process$1.env.TERM === "alacritty" || process$1.env.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}
var unicode = isUnicodeSupported();
var isCI = () => process.env.CI === "true";
var unicodeOr = (o, e) => unicode ? o : e;
var S_STEP_ACTIVE = unicodeOr("\u25C6", "*");
var S_STEP_CANCEL = unicodeOr("\u25A0", "x");
var S_STEP_ERROR = unicodeOr("\u25B2", "x");
var S_STEP_SUBMIT = unicodeOr("\u25C7", "o");
var S_BAR_START = unicodeOr("\u250C", "T");
var S_BAR = unicodeOr("\u2502", "|");
var S_BAR_END = unicodeOr("\u2514", "\u2014");
var S_BAR_START_RIGHT = unicodeOr("\u2510", "T");
var S_BAR_END_RIGHT = unicodeOr("\u2518", "\u2014");
var S_RADIO_ACTIVE = unicodeOr("\u25CF", ">");
var S_RADIO_INACTIVE = unicodeOr("\u25CB", " ");
var S_CHECKBOX_ACTIVE = unicodeOr("\u25FB", "[\u2022]");
var S_CHECKBOX_SELECTED = unicodeOr("\u25FC", "[+]");
var S_CHECKBOX_INACTIVE = unicodeOr("\u25FB", "[ ]");
var S_PASSWORD_MASK = unicodeOr("\u25AA", "\u2022");
var S_BAR_H = unicodeOr("\u2500", "-");
var S_CORNER_TOP_RIGHT = unicodeOr("\u256E", "+");
var S_CONNECT_LEFT = unicodeOr("\u251C", "+");
var S_CORNER_BOTTOM_RIGHT = unicodeOr("\u256F", "+");
var S_CORNER_BOTTOM_LEFT = unicodeOr("\u2570", "+");
var S_CORNER_TOP_LEFT = unicodeOr("\u256D", "+");
var S_INFO = unicodeOr("\u25CF", "\u2022");
var S_SUCCESS = unicodeOr("\u25C6", "*");
var S_WARN = unicodeOr("\u25B2", "!");
var S_ERROR = unicodeOr("\u25A0", "x");
var MULTISELECT_INSTRUCTIONS = [
  `${styleText2("dim", "\u2191/\u2193")} to navigate`,
  `${styleText2("dim", "Space:")} select`,
  `${styleText2("dim", "Enter:")} confirm`
];
var log = {
  message: (s = [], {
    symbol: e = styleText2("gray", S_BAR),
    secondarySymbol: r2 = styleText2("gray", S_BAR),
    output: m = process.stdout,
    spacing: l2 = 1,
    withGuide: c
  } = {}) => {
    const t2 = [], o = c ?? settings.withGuide, f = o ? r2 : "", O = o ? `${e}  ` : "", u4 = o ? `${r2}  ` : "";
    for (let i2 = 0; i2 < l2; i2++)
      t2.push(f);
    const g = Array.isArray(s) ? s : s.split(`
`);
    if (g.length > 0) {
      const [i2, ...y2] = g;
      i2.length > 0 ? t2.push(`${O}${i2}`) : t2.push(o ? e : "");
      for (const p of y2)
        p.length > 0 ? t2.push(`${u4}${p}`) : t2.push(o ? r2 : "");
    }
    m.write(`${t2.join(`
`)}
`);
  },
  info: (s, e) => {
    log.message(s, { ...e, symbol: styleText2("blue", S_INFO) });
  },
  success: (s, e) => {
    log.message(s, { ...e, symbol: styleText2("green", S_SUCCESS) });
  },
  step: (s, e) => {
    log.message(s, { ...e, symbol: styleText2("green", S_STEP_SUBMIT) });
  },
  warn: (s, e) => {
    log.message(s, { ...e, symbol: styleText2("yellow", S_WARN) });
  },
  /** alias for `log.warn()`. */
  warning: (s, e) => {
    log.warn(s, e);
  },
  error: (s, e) => {
    log.message(s, { ...e, symbol: styleText2("red", S_ERROR) });
  }
};
var intro = (o = "", t2) => {
  const i2 = t2?.output ?? process.stdout, e = t2?.withGuide ?? settings.withGuide ? `${styleText2("gray", S_BAR_START)}  ` : "";
  i2.write(`${e}${o}
`);
};
var outro = (o = "", t2) => {
  const i2 = t2?.output ?? process.stdout, e = t2?.withGuide ?? settings.withGuide ? `${styleText2("gray", S_BAR)}
${styleText2("gray", S_BAR_END)}  ` : "";
  i2.write(`${e}${o}

`);
};
var W = (l2) => styleText2("magenta", l2);
var spinner = ({
  indicator: l2 = "dots",
  onCancel: h2,
  output: n3 = process.stdout,
  cancelMessage: G,
  errorMessage: O,
  frames: E = unicode ? ["\u25D2", "\u25D0", "\u25D3", "\u25D1"] : ["\u2022", "o", "O", "0"],
  delay: F = unicode ? 80 : 120,
  signal: m,
  ...I
} = {}) => {
  const u4 = isCI();
  let M, T, d = false, S = false, s = "", p, w = performance.now();
  const x = getColumns(n3), k = I?.styleFrame ?? W, g = (e) => {
    const r2 = e > 1 ? O ?? settings.messages.error : G ?? settings.messages.cancel;
    S = e === 1, d && (a2(r2, e), S && typeof h2 == "function" && h2());
  }, f = () => g(2), i2 = () => g(1), A = () => {
    process.on("uncaughtExceptionMonitor", f), process.on("unhandledRejection", f), process.on("SIGINT", i2), process.on("SIGTERM", i2), process.on("exit", g), m && m.addEventListener("abort", i2);
  }, H = () => {
    process.removeListener("uncaughtExceptionMonitor", f), process.removeListener("unhandledRejection", f), process.removeListener("SIGINT", i2), process.removeListener("SIGTERM", i2), process.removeListener("exit", g), m && m.removeEventListener("abort", i2);
  }, y2 = () => {
    if (p === void 0) return;
    u4 && n3.write(`
`);
    const r2 = wrapAnsi(p, x, {
      hard: true,
      trim: false
    }).split(`
`);
    r2.length > 1 && n3.write(import_sisteransi2.cursor.up(r2.length - 1)), n3.write(import_sisteransi2.cursor.to(0)), n3.write(import_sisteransi2.erase.down());
  }, C = (e) => e.replace(/\.+$/, ""), _ = (e) => {
    const r2 = (performance.now() - e) / 1e3, t2 = Math.floor(r2 / 60), o = Math.floor(r2 % 60);
    return t2 > 0 ? `[${t2}m ${o}s]` : `[${o}s]`;
  }, N = I.withGuide ?? settings.withGuide, P = (e = "") => {
    d = true, M = block({ output: n3 }), s = C(e), w = performance.now(), N && n3.write(`${styleText2("gray", S_BAR)}
`);
    let r2 = 0, t2 = 0;
    A(), T = setInterval(() => {
      if (u4 && s === p)
        return;
      y2(), p = s;
      const o = k(E[r2]);
      let v;
      if (u4)
        v = `${o}  ${s}...`;
      else if (l2 === "timer")
        v = `${o}  ${s} ${_(w)}`;
      else {
        const B = ".".repeat(Math.floor(t2)).slice(0, 3);
        v = `${o}  ${s}${B}`;
      }
      const j = wrapAnsi(v, x, {
        hard: true,
        trim: false
      });
      n3.write(j), r2 = r2 + 1 < E.length ? r2 + 1 : 0, t2 = t2 < 4 ? t2 + 0.125 : 0;
    }, F);
  }, a2 = (e = "", r2 = 0, t2 = false) => {
    if (!d) return;
    d = false, clearInterval(T), y2();
    const o = r2 === 0 ? styleText2("green", S_STEP_SUBMIT) : r2 === 1 ? styleText2("red", S_STEP_CANCEL) : styleText2("red", S_STEP_ERROR);
    s = e ?? s, t2 || (l2 === "timer" ? n3.write(`${o}  ${s} ${_(w)}
`) : n3.write(`${o}  ${s}
`)), H(), M();
  };
  return {
    start: P,
    stop: (e = "") => a2(e, 0),
    message: (e = "") => {
      s = C(e ?? s);
    },
    cancel: (e = "") => a2(e, 1),
    error: (e = "") => a2(e, 2),
    clear: () => a2("", 0, true),
    get isCancelled() {
      return S;
    }
  };
};
var u3 = {
  light: unicodeOr("\u2500", "-"),
  heavy: unicodeOr("\u2501", "="),
  block: unicodeOr("\u2588", "#")
};
var SELECT_INSTRUCTIONS = [
  `${styleText2("dim", "\u2191/\u2193")} to navigate`,
  `${styleText2("dim", "Enter:")} confirm`
];
var i = `${styleText2("gray", S_BAR)}  `;

// dist/cli/ui.js
var import_picocolors = __toESM(require_picocolors(), 1);
import { homedir as homedir4 } from "node:os";
var BRAND_RGB = [98, 134, 255];
var GOOD_RGB = [134, 239, 172];
var WARN_RGB = [253, 230, 138];
var BAD_RGB = [252, 165, 165];
var LOGO_RGB = [67, 104, 227];
function colorEnabled() {
  return import_picocolors.default.isColorSupported;
}
function trueColor() {
  const ct = (process.env.COLORTERM ?? "").toLowerCase();
  return ct.includes("truecolor") || ct.includes("24bit") || process.env.TERM_PROGRAM === "iTerm.app" || process.env.TERM_PROGRAM === "vscode" || Boolean(process.env.WT_SESSION);
}
function tint(rgb, text2, fallback) {
  if (!colorEnabled())
    return text2;
  if (!trueColor())
    return fallback(text2);
  return `\x1B[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m${text2}\x1B[39m`;
}
var accent = (text2) => tint(BRAND_RGB, text2, import_picocolors.default.blue);
var unicode2 = unicode;
var sym = (u4, a2) => unicode2 ? u4 : a2;
var BAR = sym("\u2502", "|");
var BAR_END = sym("\u2514", "\u2014");
var POINTER = sym("\u276F", ">");
var RADIO_ON = sym("\u25CF", ">");
var RADIO_OFF = sym("\u25CB", " ");
var dim = import_picocolors.default.dim;
var bold = import_picocolors.default.bold;
var good = (t2) => tint(GOOD_RGB, t2, import_picocolors.default.green);
var warn = (t2) => tint(WARN_RGB, t2, import_picocolors.default.yellow);
var bad = (t2) => tint(BAD_RGB, t2, import_picocolors.default.red);
function intro2(subtitle) {
  intro(`${accent(bold("ToolJet MCP"))}${subtitle ? dim(`  ${subtitle}`) : ""}`);
}
var MARK = [
  "*****        ****",
  " *****     ********",
  "  *****        *****",
  "   *****        *****",
  "  *****        *****",
  " *****   **********",
  "*****   **********"
];
function logo(info = []) {
  const width = Math.max(...MARK.map((r2) => r2.length));
  const fit = (line) => line.length > 76 - width - 3 ? `${line.slice(0, 76 - width - 4)}\u2026` : line;
  const text2 = [`${bold("ToolJet MCP")} ${dim(`v${TOOLJET_MCP_VERSION}`)}`, ...info.map((line) => dim(fit(line)))];
  const top = Math.max(0, Math.floor((MARK.length - text2.length) / 2));
  const rows = MARK.map((row, i2) => {
    const beside = text2[i2 - top];
    return beside ? `${tint(LOGO_RGB, row, import_picocolors.default.blue)}${" ".repeat(width - row.length + 3)}${beside}` : tint(LOGO_RGB, row, import_picocolors.default.blue);
  });
  process.stdout.write(`
${rows.join("\n")}

`);
}
var outro2 = (msg) => outro(msg);
var log2 = log;
var isCancel2 = isCancel;
function spinner2() {
  return spinner({
    // Braille frames spin smoothly; clack's default quarter-circles wobble.
    frames: unicode2 ? ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"] : void 0,
    styleFrame: (frame) => accent(frame)
  });
}
function fieldFrame(state, message, body, error) {
  if (state === "submit" || state === "cancel") {
    return `${dim(BAR)}
${dim(sym("\u25C7", "o"))}  ${message}
${dim(BAR)}  ${body}`;
  }
  const foot = state === "error" ? `${accent(BAR_END)}  ${warn(error ?? "")}` : accent(BAR_END);
  return `${dim(BAR)}
${accent(sym("\u25C6", "*"))}  ${message}
${accent(BAR)}  ${body}
${foot}
`;
}
function ghost(placeholder) {
  if (!placeholder)
    return "";
  return colorEnabled() ? `\x1B[7m${placeholder[0]}\x1B[27m${dim(placeholder.slice(1))}` : placeholder;
}
async function text(opts) {
  const prompt = new n2({
    validate: opts.validate,
    render() {
      const body = this.userInput === "" ? ghost(opts.placeholder ?? "") : this.userInputWithCursor;
      const kept = this.state === "submit" || this.state === "cancel" ? dim(this.userInput) : body;
      return fieldFrame(this.state, opts.message, kept, this.error);
    }
  });
  return await prompt.prompt();
}
async function confirm(opts) {
  const prompt = new r({
    initialValue: opts.initialValue ?? false,
    active: "Yes",
    inactive: "No",
    render() {
      if (this.state === "submit" || this.state === "cancel") {
        return fieldFrame(this.state, opts.message, dim(this.value ? "Yes" : "No"));
      }
      const pick = (label, on) => on ? `${accent(RADIO_ON)} ${bold(label)}` : `${dim(RADIO_OFF)} ${dim(label)}`;
      const yes = this.value === true;
      return fieldFrame(this.state, opts.message, `${pick("Yes", yes)} ${dim("/")} ${pick("No", !yes)}`);
    }
  });
  return await prompt.prompt();
}
async function secret(message) {
  const title = `${message} ${sym("\u{1F511}", "")}`.trimEnd();
  const prompt = new u$1({
    mask: sym("\u2022", "*"),
    render() {
      const kept = this.state === "submit" || this.state === "cancel" ? dim(this.masked) : this.userInputWithCursor;
      return fieldFrame(this.state, title, kept, this.error);
    }
  });
  return await prompt.prompt();
}
async function select(message, options, initialValue, escape = "back") {
  const prompt = new n$1({
    options,
    initialValue,
    render() {
      if (this.state === "submit" || this.state === "cancel")
        return "";
      const width = Math.max(...options.map((o) => o.hint ? o.label.length : 0));
      const rows = options.map((o, i2) => {
        const hint = o.hint ? `${" ".repeat(width - o.label.length)}   ${dim(o.hint)}` : "";
        return i2 === this.cursor ? `${accent(BAR)}  ${accent(`${POINTER} ${RADIO_ON}`)} ${bold(o.label)}${hint}` : `${accent(BAR)}    ${dim(RADIO_OFF)} ${dim(o.label)}${hint}`;
      });
      const head = `${dim(BAR)}
${accent(sym("\u25C6", "*"))}  ${message}
`;
      return `${head}${rows.join("\n")}
${accent(BAR_END)}  ${dim(`\u2191\u2193 move \xB7 enter select \xB7 esc ${escape}`)}
`;
    }
  });
  const picked = await prompt.prompt();
  process.stdout.write("\x1B[1A");
  return picked;
}
async function textSuggest(opts) {
  const prompt = new n2({
    validate: opts.validate,
    render() {
      const body = this.state === "submit" || this.state === "cancel" ? dim(this.userInput) : this.userInput === "" ? `${ghost(opts.suggestion)}${dim(`   ${opts.comment}`)}` : this.userInputWithCursor;
      return fieldFrame(this.state, opts.message, body, this.error);
    }
  });
  prompt.on("key", (_char, key) => {
    if (key?.name !== "tab")
      return;
    const typed = prompt.userInput.replace(/\t/g, "");
    prompt._setUserInput(typed === "" ? opts.suggestion : typed, true);
  });
  return await prompt.prompt();
}
function result(ok2, title, details = []) {
  const body = [title, ...details.map((d) => dim(d))].join("\n");
  if (ok2)
    log.success(body);
  else
    log.error(body);
}
function copyable(block2) {
  process.stdout.write(`
${block2}
`);
}
function shortPath(path) {
  const home2 = homedir4();
  return path.startsWith(home2) ? `~${path.slice(home2.length)}` : path;
}
function table(rows) {
  const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
  const widths = [];
  for (const row of rows)
    row.forEach((c, i2) => widths[i2] = Math.max(widths[i2] ?? 0, strip(c).length));
  return rows.map((row) => row.map((c, i2) => i2 === row.length - 1 ? c : c + " ".repeat(widths[i2] - strip(c).length)).join("  ")).join("\n");
}
var interactive = () => Boolean(process.stdin.isTTY && process.stdout.isTTY);
async function onAltScreen(run2) {
  process.stdout.write("\x1B[?1049h\x1B[H");
  const restore = () => process.stdout.write("\x1B[?1049l");
  process.once("exit", restore);
  try {
    return await run2();
  } finally {
    process.removeListener("exit", restore);
    restore();
  }
}

// dist/telemetry.js
import { AsyncLocalStorage } from "node:async_hooks";
var storage = new AsyncLocalStorage();

// dist/auth.js
function requestPatSession(apiUrl, pat, fetchImpl = fetch) {
  return fetchImpl(`${apiUrl}/api/personal-access-tokens/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${pat}` }
  });
}

// dist/profiles/checkLogin.js
async function checkLogin(profile, fetchImpl = fetch) {
  const base = profile.apiUrl ?? profile.url;
  const withTimeout = (input, init) => fetchImpl(input, { ...init, signal: AbortSignal.timeout(1e4) });
  let res;
  try {
    res = await requestPatSession(base, profile.pat, withTimeout);
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return { ok: false, message: timedOut ? `No answer from ${base} within 10 seconds.` : `Cannot reach ${base}.` };
  }
  if (res.ok) {
    const body = await res.json().catch(() => ({}));
    const workspaceSlug = body.organizationSlug ?? body.organizationName ?? void 0;
    return { ok: true, workspaceSlug, message: workspaceSlug ? `Token accepted \u2014 workspace ${workspaceSlug}.` : "Token accepted." };
  }
  if (res.status === 401 || res.status === 403)
    return { ok: false, message: "Token rejected. It may be expired, revoked, or copied incompletely." };
  if (res.status === 404)
    return { ok: false, message: `${base} has no access-token login. It may be an older ToolJet, or not the API address.` };
  return { ok: false, message: `${base} answered HTTP ${res.status}.` };
}

// dist/profiles/store.js
import { chmodSync as chmodSync2, existsSync as existsSync4, lstatSync, mkdirSync as mkdirSync3, readFileSync as readFileSync3, renameSync as renameSync3, statSync as statSync2, writeFileSync as writeFileSync3 } from "node:fs";
import { dirname as dirname3 } from "node:path";
var NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
function assertProfileName(name) {
  if (!NAME_PATTERN.test(name)) {
    throw new Error(`"${name}" is not a usable profile name. Use letters, digits, dot, dash or underscore, starting with a letter or digit.`);
  }
}
function normalizeUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed)
    throw new Error("A ToolJet URL is required.");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new Error(`"${raw}" is not a valid URL.`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("A ToolJet URL must start with https:// or http://.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("A ToolJet URL must not carry credentials, a query, or a fragment.");
  }
  const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
  return parsed.origin + path;
}
function urlCandidates(raw) {
  const url = normalizeUrl(raw);
  const origin = new URL(url).origin;
  return url === origin ? [url] : [url, origin];
}
function isPosix() {
  return process.platform !== "win32";
}
function assertPrivate(path) {
  if (!isPosix())
    return;
  const link = lstatSync(path);
  if (link.isSymbolicLink()) {
    throw new Error(`${path} is a symbolic link. Refusing to read tokens through it \u2014 replace it with a real file.`);
  }
  const mode = statSync2(path).mode & 511;
  if (mode & 63) {
    throw new Error(`${path} is readable by other users (mode ${mode.toString(8)}). Run: chmod 600 "${path}" \u2014 then try again.`);
  }
}
function emptyStore() {
  return { version: TOOLJET_MCP_VERSION, active: "", agentDefaults: {}, profiles: {} };
}
function sanitize(input) {
  if (!input || typeof input !== "object")
    return emptyStore();
  const raw = input;
  const store = { ...raw, ...emptyStore() };
  if (typeof raw.version === "string" && newerVersion(raw.version, TOOLJET_MCP_VERSION))
    store.version = raw.version;
  if (raw.profiles && typeof raw.profiles === "object") {
    for (const [name, value] of Object.entries(raw.profiles)) {
      if (!NAME_PATTERN.test(name) || !value || typeof value !== "object")
        continue;
      const p = value;
      if (typeof p.url !== "string" || typeof p.pat !== "string" || !p.pat)
        continue;
      try {
        const profile = { ...p, url: normalizeUrl(p.url), pat: p.pat };
        if (typeof p.apiUrl === "string" && p.apiUrl.trim())
          profile.apiUrl = normalizeUrl(p.apiUrl);
        else
          delete profile.apiUrl;
        store.profiles[name] = profile;
      } catch {
      }
    }
  }
  if (typeof raw.active === "string" && store.profiles[raw.active])
    store.active = raw.active;
  if (raw.agentDefaults && typeof raw.agentDefaults === "object") {
    for (const [agent, name] of Object.entries(raw.agentDefaults)) {
      if (typeof name === "string" && store.profiles[name])
        store.agentDefaults[agent] = name;
    }
  }
  return store;
}
function loadStore() {
  const path = profilesPath();
  if (!existsSync4(path))
    return emptyStore();
  assertPrivate(path);
  let parsed;
  const text2 = readFileSync3(path, "utf8");
  if (!text2.trim())
    return emptyStore();
  try {
    parsed = JSON.parse(text2);
  } catch {
    throw new Error(`${path} is not valid JSON. Fix or delete it, then run: tj`);
  }
  const store = sanitize(parsed);
  if (newerVersion(TOOLJET_MCP_VERSION, parsed?.version)) {
    try {
      saveStore(store);
    } catch {
    }
  }
  return store;
}
function saveStore(store) {
  const path = profilesPath();
  mkdirSync3(dirname3(path), { recursive: true, mode: 448 });
  if (isPosix())
    chmodSync2(homeDir(), 448);
  const tmp = `${path}.${process.pid}.tmp`;
  const { version, active, agentDefaults, profiles, ...extra } = store;
  const ordered = { version, active, agentDefaults, profiles, ...extra };
  writeFileSync3(tmp, `${JSON.stringify(ordered, null, 2)}
`, { mode: 384 });
  if (isPosix())
    chmodSync2(tmp, 384);
  renameSync3(tmp, path);
}
var CLOUD_HOST = /^app\.tooljet\.(ai|com)$/;
function isCloudUrl(rawUrl) {
  try {
    return CLOUD_HOST.test(new URL(normalizeUrl(rawUrl)).hostname);
  } catch {
    return false;
  }
}
function suggestName(rawUrl, taken, workspaceSlug) {
  let base = "tooljet";
  try {
    const host = new URL(normalizeUrl(rawUrl)).hostname;
    base = CLOUD_HOST.test(host) ? "cloud" : host === "localhost" || /^[\d.]+$/.test(host) ? "local" : host.split(".")[0];
  } catch {
  }
  const clean = (text2) => text2.replace(/[^A-Za-z0-9._-]/g, "-");
  base = clean(base) || "tooljet";
  if (!taken.includes(base))
    return base;
  const named = workspaceSlug ? `${base}-${clean(workspaceSlug)}` : "";
  if (named && !taken.includes(named))
    return named;
  for (let i2 = 2; ; i2++)
    if (!taken.includes(`${base}-${i2}`))
      return `${base}-${i2}`;
}
function importCredential(cred) {
  const store = loadStore();
  const url = normalizeUrl(cred.url);
  const apiUrl = cred.apiUrl && normalizeUrl(cred.apiUrl) !== url ? normalizeUrl(cred.apiUrl) : void 0;
  const same = Object.entries(store.profiles).find(([, p]) => p.url === url && p.pat === cred.pat);
  if (same)
    return { name: same[0], created: false };
  const name = suggestName(url, Object.keys(store.profiles), cred.workspaceSlug);
  store.profiles[name] = { url, ...apiUrl ? { apiUrl } : {}, pat: cred.pat };
  if (!store.active)
    store.active = name;
  saveStore(store);
  return { name, created: true };
}
function hostOfUrl(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
var hostOf = (profile) => hostOfUrl(profile.url);

// dist/profiles/agentId.js
var AGENT_LABEL_VAR = "TOOLJET_AGENT";

// dist/cli/commands.js
var CliError = class extends Error {
};
var tick = () => good("\u2713");
var cross = () => bad("\u2717");
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin)
    chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").trim();
}
var FLAGS = {
  url: { type: "string" },
  "pat-stdin": { type: "boolean" },
  pat: { type: "string" },
  token: { type: "string" },
  offline: { type: "boolean" },
  agent: { type: "string" },
  reset: { type: "boolean" },
  all: { type: "boolean" },
  force: { type: "boolean" },
  profiles: { type: "boolean" },
  yes: { type: "boolean", short: "y" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean" }
};
var parseFlags = (args) => parseArgs({ args, options: FLAGS, allowPositionals: true, strict: true });
async function settleUrl(raw, pat) {
  let last = { profile: { url: normalizeUrl(raw), pat }, message: "", ok: false };
  for (const url of urlCandidates(raw)) {
    const profile = { url, pat };
    const check = await checkLogin(profile);
    last = { profile, message: check.message, ok: check.ok };
    if (check.ok)
      return last;
  }
  return last;
}
async function authAdd(args, flags = {}) {
  const url = flags.url;
  const fromStdin = Boolean(flags["pat-stdin"]);
  if (flags.pat !== void 0 || flags.token !== void 0) {
    throw new CliError("Tokens are never accepted as a command-line argument. Use --pat-stdin, or run `tj auth add` and paste it at the prompt.");
  }
  let name = args[0];
  if (url && fromStdin) {
    if (!name)
      throw new CliError("Usage: tj auth add <name> --url <URL> --pat-stdin   (token on standard input)");
    assertProfileName(name);
    const pat = await readStdin();
    if (!pat)
      throw new CliError("No token arrived on standard input.");
    const settled = await settleUrl(url, pat);
    saveProfile(name, settled.profile);
    console.log(`${settled.ok ? tick() : warn("!")} saved '${name}' \u2192 ${settled.profile.url}${settled.ok ? "" : `  (${settled.message})`}`);
    return;
  }
  if (!interactive())
    throw new CliError("Not a terminal. Use: tj auth add <name> --url <URL> --pat-stdin");
  intro2("add a ToolJet server");
  await addWizard(name, url);
  outro2(dim("Done."));
}
async function addWizard(presetName, presetUrl) {
  const store = loadStore();
  const taken = Object.keys(store.profiles);
  let suggested = "workspace-1";
  for (let i2 = 2; taken.includes(suggested); i2++)
    suggested = `workspace-${i2}`;
  const nameAnswer = presetName ?? await textSuggest({
    message: "Name for this server",
    suggestion: suggested,
    comment: "// press Tab to use this name",
    validate: (v) => {
      if (!v?.trim())
        return "Type a name, or press Tab to use the suggestion.";
      try {
        assertProfileName(v);
        return void 0;
      } catch (e) {
        return e.message;
      }
    }
  });
  if (isCancel2(nameAnswer))
    return void 0;
  const name = String(nameAnswer);
  if (store.profiles[name]) {
    const replace = await confirm({ message: `'${name}' already exists. Replace it?`, initialValue: false });
    if (isCancel2(replace) || !replace)
      return void 0;
  }
  const urlAnswer = presetUrl ?? await textSuggest({
    message: "ToolJet URL",
    suggestion: "https://app.tooljet.ai/",
    comment: "// press Tab for ToolJet cloud",
    validate: (v) => {
      if (!v?.trim())
        return "Type a URL, or press Tab for ToolJet cloud.";
      try {
        normalizeUrl(v);
        return void 0;
      } catch (e) {
        return e.message;
      }
    }
  });
  if (isCancel2(urlAnswer))
    return void 0;
  let uiUrl = "";
  if (!isCloudUrl(String(urlAnswer))) {
    const answer = await text({
      message: "UI address, if different (optional)",
      placeholder: "press enter to skip   e.g. https://ui.your-company.com",
      validate: (v) => {
        if (!v?.trim())
          return void 0;
        try {
          normalizeUrl(v);
          return void 0;
        } catch (e) {
          return e.message;
        }
      }
    });
    if (isCancel2(answer))
      return void 0;
    uiUrl = String(answer ?? "").trim();
  }
  log2.message(dim("Create a token in ToolJet: Settings \u2192 Access tokens, in the workspace you want to work in."));
  const pat = await secret("Personal access token");
  if (isCancel2(pat) || !pat)
    return void 0;
  const spin = spinner2();
  spin.start("Checking the token");
  const settled = await settleUrl(String(urlAnswer), String(pat).trim());
  if (settled.ok)
    spin.stop(`${settled.message}`);
  else
    spin.error(settled.message);
  if (!settled.ok) {
    const keep = await confirm({ message: "Save it anyway?", initialValue: false });
    if (isCancel2(keep) || !keep)
      return void 0;
  }
  const browser = uiUrl ? normalizeUrl(uiUrl) : "";
  const profile = browser && browser !== settled.profile.url ? { url: browser, apiUrl: settled.profile.url, pat: settled.profile.pat } : settled.profile;
  const becameActive = saveProfile(name, profile);
  log2.success(`Saved '${name}' \u2192 ${profile.url}${becameActive ? dim("  \xB7 now the default for new chats") : ""}`);
  return name;
}
function saveProfile(name, profile) {
  const store = loadStore();
  store.profiles[name] = profile;
  const becameActive = !store.active;
  if (becameActive)
    store.active = name;
  saveStore(store);
  return becameActive;
}
function noProfiles() {
  console.log(`No ToolJet servers saved yet. Add one with: ${bold(`${selfCommand()} auth add`)}`);
}
async function authList() {
  const store = loadStore();
  const names = Object.keys(store.profiles);
  if (!names.length)
    return noProfiles();
  const agentsOn = (n3) => Object.entries(store.agentDefaults).filter(([, p]) => p === n3).map(([a2]) => a2);
  console.log(table(names.map((n3) => [
    n3 === store.active ? accent("\u25CF") : " ",
    n3 === store.active ? bold(n3) : n3,
    dim(store.profiles[n3].url),
    agentsOn(n3).length ? dim(`default for ${agentsOn(n3).join(", ")}`) : ""
  ])));
  console.log(dim("\n\u25CF = what new chats start on, unless that agent has its own default"));
}
async function authStatus(args, flags = {}) {
  const offline = Boolean(flags.offline);
  const store = loadStore();
  const names = args[0] ? [args[0]] : Object.keys(store.profiles);
  if (!Object.keys(store.profiles).length)
    return noProfiles();
  let failed = false;
  for (const name of names) {
    const profile = store.profiles[name];
    if (!profile)
      throw new CliError(`No saved server named '${name}'. See: tj auth list`);
    const label = `${name === store.active ? bold(name) : name}${name === store.active ? dim(" (default)") : ""}`;
    if (offline) {
      console.log(`  ${dim("\xB7")} ${label}  ${dim(profile.url)}`);
      continue;
    }
    const check = await checkLogin(profile);
    failed ||= !check.ok;
    console.log(`  ${check.ok ? tick() : cross()} ${label}  ${dim(profile.url)}
      ${check.ok ? dim(check.message) : check.message}`);
  }
  if (failed)
    process.exitCode = 1;
}
function setDefault(name, agentId) {
  const store = loadStore();
  if (agentId && !ADAPTERS.some((a2) => a2.id === agentId)) {
    throw new CliError(`Unknown agent '${agentId}'. Known: ${ADAPTERS.map((a2) => a2.id).join(", ")}`);
  }
  if (!name) {
    if (!agentId)
      throw new CliError("Name a server.");
    delete store.agentDefaults[agentId];
    saveStore(store);
    return `${agentId} now follows the shared default ('${store.active || "\u2014"}').`;
  }
  if (!store.profiles[name])
    throw new CliError(`No saved server named '${name}'. See: tj auth list`);
  if (agentId)
    store.agentDefaults[agentId] = name;
  else
    store.active = name;
  saveStore(store);
  return agentId ? `New ${agentId} chats now start on '${name}'.` : `New chats now start on '${name}'.`;
}
async function pickDefault(agentId) {
  const store = loadStore();
  const EVERY = "__every__";
  const FOLLOW = "__follow__";
  let scope = agentId;
  if (!scope) {
    const asked = await select("Change the default for\u2026", [
      { value: EVERY, label: "All agents", hint: `now: ${store.active || "\u2014"}` },
      ...detectedAgents().map((a2) => ({ value: a2.id, label: `${a2.name} only`, hint: store.agentDefaults[a2.id] ? `now: ${store.agentDefaults[a2.id]}` : "follows all agents" }))
    ]);
    if (isCancel2(asked))
      return void 0;
    scope = asked === EVERY ? void 0 : asked;
  }
  const own = scope ? store.agentDefaults[scope] : void 0;
  const picked = await select("Start new chats on", [
    ...Object.keys(store.profiles).map((n3) => ({ value: n3, label: n3, hint: hostOf(store.profiles[n3]) })),
    ...own ? [{ value: FOLLOW, label: "Follow all agents again" }] : []
  ], own || store.active);
  if (isCancel2(picked))
    return void 0;
  return setDefault(picked === FOLLOW ? void 0 : picked, scope);
}
async function authSwitch(args, flags = {}) {
  const agentId = flags.agent;
  const reset = Boolean(flags.reset);
  const store = loadStore();
  const names = Object.keys(store.profiles);
  if (!names.length)
    return noProfiles();
  if (reset && !agentId)
    throw new CliError("Usage: tj auth switch --agent <id> --reset");
  let message;
  if (reset)
    message = setDefault(void 0, agentId);
  else if (args[0])
    message = setDefault(args[0], agentId);
  else if (interactive())
    message = await pickDefault(agentId);
  else {
    const current = agentId && store.agentDefaults[agentId] || store.active;
    message = setDefault(names[(names.indexOf(current) + 1) % names.length], agentId);
  }
  if (!message)
    return;
  console.log(`${tick()} ${message}`);
  console.log(dim('  Chats that are already open keep their server. To move one, ask it: "switch to <name>".'));
}
async function authRemove(args) {
  const name = args[0];
  if (!name)
    throw new CliError("Usage: tj auth remove <name>");
  const store = loadStore();
  if (!store.profiles[name])
    throw new CliError(`No saved server named '${name}'.`);
  delete store.profiles[name];
  for (const [agent, p] of Object.entries(store.agentDefaults))
    if (p === name)
      delete store.agentDefaults[agent];
  if (store.active === name)
    store.active = Object.keys(store.profiles)[0] ?? "";
  saveStore(store);
  console.log(`${tick()} Removed '${name}'.${store.active ? dim(`  New chats now start on '${store.active}'.`) : ""}`);
}
async function authSet(args) {
  const [name, field, value] = args;
  if (!name || !field || !value)
    throw new CliError("Usage: tj auth set <name> url|api-url <value>    (to change a token, run: tj auth add <name>)");
  const store = loadStore();
  const profile = store.profiles[name];
  if (!profile)
    throw new CliError(`No saved server named '${name}'.`);
  if (field === "url")
    profile.url = normalizeUrl(value);
  else if (field === "api-url")
    profile.apiUrl = normalizeUrl(value);
  else
    throw new CliError(`'${field}' cannot be set. Fields: url, api-url. To change a token, run: tj auth add ${name}`);
  saveStore(store);
  console.log(`${tick()} Updated '${name}'.`);
}
async function ensureInstalled(quiet = false) {
  const running = runningBundle();
  if (!running && !isInstalled())
    installBundle();
  if (running) {
    const { to } = installBundle();
    if (!quiet)
      console.log(`${tick()} Server installed at ${dim(to)}`);
  }
}
async function install(flags = {}) {
  const force = Boolean(flags.force);
  await ensureInstalled();
  const state = shimState();
  if (state === "foreign" && !force) {
    let overwrite = false;
    if (interactive()) {
      const answer = await confirm({ message: `${shimPath()} is another program also called tj. Replace it?`, initialValue: false });
      overwrite = !isCancel2(answer) && Boolean(answer);
    }
    if (!overwrite) {
      console.log(`${warn("!")} Left ${shimPath()} alone. Re-run with --force to replace it, or run this tool as:
    "${process.execPath}" "${installedBundlePath()}" cli`);
      return;
    }
  }
  const path = writeShim();
  console.log(`${tick()} Command installed: ${bold("tj")} ${dim(`(${path})`)}`);
  if (!shimOnPath()) {
    console.log(`${warn("!")} ${path.replace(/[\\/]tj(\.cmd)?$/, "")} is not on your PATH yet. Add it, then open a new terminal.`);
  }
}
async function uninstall(flags = {}, agents = detectedAgents()) {
  if (!interactive() && !flags.yes)
    throw new CliError("Not a terminal. Use: tj uninstall --yes [--profiles]");
  const connected = agents.filter((a2) => a2.status().connected === "yes");
  const viaPlugin = agents.filter((a2) => a2.status().connected === "plugin");
  let saved = -1;
  try {
    saved = Object.keys(loadStore().profiles).length;
  } catch {
  }
  const hasProfiles = saved !== 0 && existsSync5(profilesPath());
  let wipe = !hasProfiles || Boolean(flags.profiles);
  const planned = [
    ...shimState() === "ours" ? [`the tj command  ${shortPath(shimPath())}`] : [],
    ...isInstalled() ? [`the server copy in ${shortPath(homeDir())}`] : [],
    ...connected.map((a2) => `the ToolJet entry in ${a2.name}`),
    ...hasProfiles && wipe ? ["every saved server and its token \u2014 ALL coding agents lose them"] : []
  ];
  if (!planned.length && !hasProfiles)
    return void console.log("Nothing to remove.");
  if (interactive() && !flags.yes) {
    intro2("uninstall");
    if (planned.length) {
      log2.message(`This removes:
${planned.map((l2) => `  \xB7 ${l2}`).join("\n")}`);
      const go = await confirm({ message: "Continue?", initialValue: false });
      if (isCancel2(go) || !go)
        return void outro2(dim("Nothing was changed."));
    }
    if (hasProfiles && !flags.profiles) {
      const also = await confirm({
        message: `${planned.length ? "Also delete" : "Delete"} the saved servers and their tokens? They are shared \u2014 ALL coding agents lose them.`,
        initialValue: false
      });
      if (isCancel2(also))
        return void outro2(dim("Nothing was changed."));
      wipe = Boolean(also);
    }
  }
  for (const agent of connected) {
    try {
      console.log(`${tick()} ToolJet entry removed from ${agent.name} ${dim(`(${shortPath(await agent.disconnect())})`)}`);
    } catch (err) {
      console.log(`${cross()} ${agent.name}: ${err.message}`);
      process.exitCode = 1;
    }
  }
  const shim = shimPath();
  if (removeShim())
    console.log(`${tick()} tj command removed ${dim(`(${shortPath(shim)})`)}`);
  else if (shimState() === "foreign")
    console.log(`${warn("!")} Left ${shortPath(shim)} alone \u2014 it is a different program called tj.`);
  if (wipe) {
    removeHome();
    console.log(`${tick()} Removed ${shortPath(homeDir())}${hasProfiles ? " \u2014 the saved servers are gone for every coding agent" : ""}`);
  } else {
    if (isInstalled()) {
      removeInstalled();
      console.log(`${tick()} Server copy removed.`);
    }
    console.log(dim(`  Saved servers kept: ${shortPath(profilesPath())} \u2014 a reinstall finds them again.
  Delete that file to remove them for every coding agent.`));
  }
  if (viaPlugin.length) {
    console.log(`${warn("!")} The ToolJet plugin is still installed in ${viaPlugin.map((a2) => a2.name).join(", ")} \u2014 it reinstalls all this on its next chat. Remove the plugin there too.`);
  }
  if (interactive() && !flags.yes)
    outro2(dim("Done."));
}
function describe(agent) {
  const s = agent.status();
  const state = s.connected === "plugin" ? "connected through the plugin" : s.connected === "yes" ? "connected" : "not connected";
  return { connected: s.connected !== "no", hint: s.storedToken ? `${state} \xB7 ${warn("token still in its config")}` : state };
}
async function agentsList() {
  const found = detectedAgents();
  if (!found.length) {
    console.log("No supported coding agent was found on this machine. See: tj agents snippet");
    return;
  }
  console.log(table(found.map((a2) => {
    const d = describe(a2);
    return [d.connected ? tick() : dim("\u25CB"), a2.name, d.connected ? d.hint : dim(d.hint)];
  })));
}
async function keepExistingServer(agent) {
  const cred = agent.storedCredential?.();
  if (!cred)
    return void 0;
  const { workspaceSlug } = await checkLogin(cred);
  const imported = importCredential({ ...cred, workspaceSlug });
  return { ...imported, isDefault: loadStore().active === imported.name };
}
function needsConnect(agent) {
  const s = agent.status();
  return s.connected === "no" || s.storedToken;
}
async function connectOne(agent) {
  try {
    const before = agent.status();
    const kept = await keepExistingServer(agent);
    if (kept && !kept.isDefault)
      setDefault(kept.name, agent.id);
    const details = [];
    let title = `${agent.name} gets ToolJet from the plugin`;
    if (before.connected !== "plugin") {
      await ensureInstalled(true);
      details.push(shortPath(await agent.connect({ ...launch(), env: { [AGENT_LABEL_VAR]: agent.id } })));
      title = `${agent.name} connected`;
    }
    if (kept)
      details.push(kept.isDefault ? `Its server is your default, '${kept.name}'.` : `Its server is kept as '${kept.name}', and ${agent.name} starts on it.`);
    if (agent.scrubToken && agent.status().storedToken)
      details.push(`Token removed from ${shortPath(agent.scrubToken())} (backup beside it).`);
    else if (before.storedToken)
      details.push("Token removed from its config (backup beside it).");
    if (before.connected !== "plugin" || before.storedToken)
      details.push(agent.reload);
    return { ok: true, title, details };
  } catch (err) {
    return { ok: false, title: `${agent.name} was not connected`, details: [err.message] };
  }
}
function printResult(r2) {
  console.log(`${r2.ok ? tick() : cross()} ${bold(r2.title)}`);
  for (const d of r2.details)
    console.log(`    ${dim(d)}`);
  if (!r2.ok)
    process.exitCode = 1;
}
async function agentsConnect(args, flags = {}) {
  const all = Boolean(flags.all);
  const chosen = all ? detectedAgents().filter(needsConnect) : args.map((id) => {
    const agent = ADAPTERS.find((a2) => a2.id === id);
    if (!agent)
      throw new CliError(`Unknown agent '${id}'. Known: ${ADAPTERS.map((a2) => a2.id).join(", ")}`);
    return agent;
  });
  if (all && !chosen.length)
    return void console.log("Every coding agent found on this machine is already connected.");
  if (!chosen.length)
    throw new CliError(`Usage: tj agents connect <id\u2026> | --all
Known: ${ADAPTERS.map((a2) => a2.id).join(", ")}`);
  for (const agent of chosen)
    printResult(await connectOne(agent));
}
async function agentsDisconnect(args) {
  const agent = ADAPTERS.find((a2) => a2.id === args[0]);
  if (!agent)
    throw new CliError(`Usage: tj agents disconnect <id>
Known: ${ADAPTERS.map((a2) => a2.id).join(", ")}`);
  const where = await agent.disconnect();
  console.log(`${tick()} Disconnected ${agent.name} ${dim(`(${where})`)}`);
}
function manualInstructions() {
  return manualText(manualSetup(REPO_URL));
}
async function agentsSnippet() {
  console.log(`${bold("Set up any other agent by hand")}

${manualInstructions()}`);
}
async function doctor() {
  const line = (ok2, msg) => console.log(`  ${ok2 === "warn" ? warn("!") : ok2 ? tick() : cross()} ${msg}`);
  console.log(bold(`tooljet-mcp ${TOOLJET_MCP_VERSION}`) + dim(`  \xB7  node ${process.version}  \xB7  ${process.platform}`));
  const major = Number(process.versions.node.split(".")[0]);
  line(major >= 20, `Node ${process.version}${major >= 20 ? "" : " \u2014 version 20 or newer is required"}`);
  line(true, `Home: ${homeDir()}`);
  line(isInstalled() || "warn", isInstalled() ? `Server: ${installedBundlePath()}` : `Server not installed to the home folder yet \u2014 run: ${selfCommand()} install`);
  const shim = shimState();
  line(shim === "ours" ? shimOnPath() || "warn" : "warn", shim === "ours" ? `Command: ${shimPath()}${shimOnPath() ? "" : " (its folder is not on PATH)"}` : shim === "foreign" ? `${shimPath()} is a different program called tj \u2014 replace it with: ${selfCommand()} install --force` : `The \`tj\` command is not installed \u2014 run: ${selfCommand()} install`);
  try {
    const store = loadStore();
    const n3 = Object.keys(store.profiles).length;
    line(n3 > 0 || "warn", n3 ? `${n3} saved server${n3 === 1 ? "" : "s"}; new chats start on '${store.active || "\u2014"}'  ${dim(profilesPath())}` : `No saved servers \u2014 run: ${selfCommand()} auth add`);
  } catch (err) {
    line(false, err.message);
  }
  console.log(bold("\nCoding agents"));
  const found = detectedAgents();
  let own = {};
  try {
    own = loadStore().agentDefaults;
  } catch {
  }
  if (!found.length)
    line("warn", "none detected");
  for (const a2 of found) {
    const s = a2.status();
    if (s.connected === "no")
      console.log(`  ${dim("\u25CB")} ${a2.name}: ${dim(`not connected \u2014 run: ${selfCommand()} agents connect ${a2.id}`)}`);
    else
      line(s.storedToken ? "warn" : true, `${a2.name}: ${describe(a2).hint}${own[a2.id] ? dim(`  \xB7 starts on '${own[a2.id]}'`) : ""}`);
  }
}

// dist/cli/menu.js
var ok = (text2) => `${good("\u2713")} ${text2}`;
async function menu() {
  const done = [];
  await onAltScreen(() => loop(done));
  if (done.length)
    console.log(done.join("\n"));
}
async function loop(done) {
  let startsOn = "no server saved yet";
  try {
    const store = loadStore();
    if (store.active)
      startsOn = `default: ${store.active} \xB7 ${hostOf(store.profiles[store.active])}`;
    else if (Object.keys(store.profiles).length)
      startsOn = "no default server chosen yet";
  } catch {
  }
  logo([startsOn, shortPath(homeDir())]);
  if (!Object.keys(loadStore().profiles).length) {
    log2.message("No ToolJet server saved yet \u2014 let's add one.");
    const added = await addFlow(done);
    if (added && detectedAgents().some((a2) => a2.status().connected === "no"))
      await agentsFlow(done);
  }
  for (; ; ) {
    const store = loadStore();
    const names = Object.keys(store.profiles);
    const agents = detectedAgents();
    const connected = agents.filter((a2) => a2.status().connected !== "no").length;
    const choice = await select("What would you like to do?", [
      { value: "add", label: "Add a ToolJet server" },
      ...names.length > 1 ? [{ value: "switch", label: "Switch default server", hint: `now: ${store.active || "\u2014"}` }] : [],
      ...names.length ? [{ value: "check", label: "Check connections", hint: `${names.length} saved` }] : [],
      { value: "agents", label: "Connect coding agents", hint: agents.length ? `${connected} of ${agents.length} connected` : "none detected" },
      ...names.length ? [{ value: "remove", label: "Remove a server" }] : [],
      ...shimState() !== "ours" ? [{ value: "command", label: "Install the `tj` command", hint: "so you can run this from any terminal" }] : [],
      { value: "quit", label: "Quit" }
    ], void 0, "quit");
    if (isCancel2(choice) || choice === "quit")
      break;
    try {
      if (choice === "add")
        await addFlow(done);
      if (choice === "switch")
        await switchFlow(done);
      if (choice === "check")
        await checkFlow(done);
      if (choice === "agents")
        await agentsFlow(done);
      if (choice === "remove")
        await removeFlow(done);
      if (choice === "command")
        await installFlow(done);
    } catch (err) {
      const message = err.message;
      log2.error(message);
      done.push(`${bad("\u2717")} ${message}`);
    }
  }
}
async function addFlow(done) {
  const name = await addWizard();
  if (name) {
    const profile = loadStore().profiles[name];
    done.push(ok(`Added '${name}'${profile ? ` \xB7 ${hostOf(profile)}` : ""}`));
  }
  return name;
}
async function switchFlow(done) {
  const changed = await pickDefault();
  if (!changed)
    return;
  log2.success(`${changed} Open chats are not affected.`);
  done.push(ok(`${changed} Open chats keep their server; to move one, ask it: "switch to <name>".`));
}
async function checkFlow(done) {
  const store = loadStore();
  let failing = 0;
  const names = Object.keys(store.profiles);
  for (const [name, profile] of Object.entries(store.profiles)) {
    const spin = spinner2();
    spin.start(`${name}  ${dim(hostOf(profile))}`);
    const check = await checkLogin(profile);
    if (check.ok)
      spin.stop(`${name}  ${dim(check.message)}`);
    else {
      spin.error(`${name}  ${check.message}`);
      failing++;
    }
  }
  done.push(failing ? `${warn("!")} ${failing} of ${names.length} tokens failing \u2014 details: tj auth status` : ok(`${names.length} server${names.length === 1 ? "" : "s"} checked \u2014 all tokens work`));
}
async function removeFlow(done) {
  const store = loadStore();
  const picked = await select("Remove which server?", Object.keys(store.profiles).map((n3) => ({ value: n3, label: n3, hint: hostOf(store.profiles[n3]) })));
  if (isCancel2(picked))
    return;
  const sure = await confirm({ message: `Remove '${String(picked)}' and its token from this machine?`, initialValue: false });
  if (isCancel2(sure) || !sure)
    return;
  await authRemove([picked]);
  done.push(ok(`Removed '${String(picked)}'`));
}
async function installFlow(done) {
  await install();
  if (shimState() === "ours")
    done.push(ok("tj command installed"));
}
var ALL = "__all__";
var OTHER = "__other__";
var BACK = "__back__";
async function agentsFlow(done) {
  const show = (r2) => {
    result(r2.ok, r2.title, r2.details);
    done.push(r2.ok ? ok(r2.title) : `${bad("\u2717")} ${r2.title}`);
  };
  let focus;
  for (; ; ) {
    const agents = detectedAgents();
    const pending = agents.filter((a2) => a2.status().connected === "no");
    const picked = await select("Connect coding agents", [
      ...agents.map((a2) => ({ value: a2.id, label: a2.name, hint: describe(a2).hint })),
      ...pending.length > 1 ? [{ value: ALL, label: `Connect all ${pending.length} that are not connected` }] : [],
      { value: OTHER, label: "My agent is not listed\u2026", hint: "set it up by hand" },
      { value: BACK, label: "Back" }
    ], focus ?? pending[0]?.id ?? OTHER);
    if (isCancel2(picked) || picked === BACK)
      return;
    focus = picked;
    if (picked === ALL) {
      for (const agent of pending)
        show(await connectOne(agent));
    } else if (picked === OTHER) {
      log2.step("Set up any other agent by hand");
      copyable(manualInstructions());
      const note = `${warn("!")} Manual setup steps were shown \u2014 print them again with: tj agents snippet`;
      if (!done.includes(note))
        done.push(note);
    } else {
      const agent = agents.find((a2) => a2.id === picked);
      if (agent.status().connected === "no")
        show(await connectOne(agent));
      else
        await connectedFlow(agent, show, done);
    }
  }
}
async function connectedFlow(agent, show, done) {
  const status = agent.status();
  if (status.storedToken) {
    const sure = await confirm({ message: `Move ${agent.name}'s ToolJet token into a saved server and remove it from its config? A backup is kept.` });
    if (!isCancel2(sure) && sure)
      show(await connectOne(agent));
    return;
  }
  if (status.connected === "plugin") {
    log2.info(`${agent.name} gets ToolJet from the plugin. There is nothing to change here.`);
    return;
  }
  const action = await select(`${agent.name} is connected`, [
    { value: "back", label: "Back" },
    { value: "reconnect", label: "Reconnect", hint: "rewrite its entry \u2014 fixes a moved Node or server path" },
    { value: "disconnect", label: "Disconnect" }
  ]);
  if (isCancel2(action))
    return;
  if (action === "reconnect")
    show(await connectOne(agent));
  if (action === "disconnect") {
    try {
      result(true, `${agent.name} disconnected`, [shortPath(await agent.disconnect())]);
      done.push(ok(`${agent.name} disconnected`));
    } catch (err) {
      result(false, `${agent.name} was not disconnected`, [err.message]);
      done.push(`${bad("\u2717")} ${agent.name} was not disconnected`);
    }
  }
}

// dist/cli/words.js
var CLI_WORDS = /* @__PURE__ */ new Set(["cli", "auth", "agents", "install", "uninstall", "doctor", "help", "--help", "-h", "version", "--version"]);

// dist/cli/index.js
var HELP = `${bold("tj")} \u2014 manage the ToolJet servers your coding agents work with

  tj                                   guided menu

  tj auth add                          add a server (asks for URL and token)
  tj auth add <name> --url <URL> --pat-stdin     same, for scripts; token on standard input
  tj auth list                         saved servers
  tj auth status [name] [--offline]    check that each token still works
  tj auth switch [name]                choose what NEW chats start on
  tj auth switch [name] --agent <id>   \u2026for one agent only (--reset to follow the shared default again)
  tj auth set <name> url|api-url <v>   change an address
  tj auth remove <name>

  tj agents                            which coding agents are installed / connected
  tj agents connect <id\u2026> | --all      connect them (no token is written to their config)
  tj agents disconnect <id>
  tj agents snippet                    setup for any other agent: clone the repo, add one entry

  tj install [--force]                 put the server in its fixed home and install this command
  tj uninstall [--profiles]            remove tj and the server copy (saved servers stay unless --profiles)
  tj doctor                            check the whole setup

Inside a chat, ask:  "switch to <name>"  \u2014 only that chat moves.
`;
async function runCli(argv) {
  try {
    const { values: flags, positionals } = parseFlags(argv[0] === "cli" ? argv.slice(1) : argv);
    const [group, sub, ...rest] = positionals;
    if (flags.help || group === "help")
      return void console.log(HELP);
    if (flags.version || group === "version")
      return void console.log(TOOLJET_MCP_VERSION);
    if (!group) {
      if (!interactive())
        return void console.log(HELP);
      return await menu();
    }
    if (group === "install")
      return await install(flags);
    if (group === "uninstall")
      return await uninstall(flags);
    if (group === "doctor")
      return await doctor();
    if (group === "auth") {
      if (sub === "add" || sub === "login")
        return await authAdd(rest, flags);
      if (sub === "list" || sub === "ls")
        return await authList();
      if (sub === "status" || !sub)
        return await authStatus(rest, flags);
      if (sub === "switch" || sub === "use")
        return await authSwitch(rest, flags);
      if (sub === "remove" || sub === "rm" || sub === "logout")
        return await authRemove(rest);
      if (sub === "set")
        return await authSet(rest);
      throw new CliError(`Unknown command 'tj auth ${sub}'. Try: tj help`);
    }
    if (group === "agents") {
      if (!sub || sub === "list")
        return await agentsList();
      if (sub === "connect")
        return await agentsConnect(rest, flags);
      if (sub === "disconnect")
        return await agentsDisconnect(rest);
      if (sub === "snippet")
        return await agentsSnippet();
      throw new CliError(`Unknown command 'tj agents ${sub}'. Try: tj help`);
    }
    throw new CliError(`Unknown command 'tj ${group}'. Try: tj help`);
  } catch (err) {
    console.error(`${bad("error")} ${err.message.split(". To specify")[0]}`);
    process.exitCode = 1;
  }
}
export {
  CLI_WORDS,
  runCli
};
