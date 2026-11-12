import { createRequire } from "node:module";
import { a as autoReadPreflight } from "./chunk-CLiX8A3Y.js";
import { b7 as fail, b8 as ok, b0 as external_exports } from "./chunk-Csl8mO51.js";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, request } from "node:http";
import { lookup } from "node:dns/promises";
import { BlockList, isIP, connect } from "node:net";
import { p as plannedCurrency, n as normalizeComponentSpec, r as resolveRef } from "./chunk-BmwE9MbG.js";
import { v as validateTableBatch, i as indexComponentReferences, c as componentRef, n as normalizeType, p as packDefaultDefinition } from "./chunk-M7e4iJ0f.js";
import { D as pageIconError, E as lintComponents, f as encodeComponentParent, F as validateAppStructure, G as isModalV2Type, H as lintComponentStateBindings, r as retiredUi2Name, d as decodeComponentParent, I as minimumTextHeight, J as unifyChartAccents } from "./chunk-CzEla2h4.js";
import { o as normalizeQueryToggles, t as toggleRewriteWarning, p as issueMessages, q as queryToggleIssues, u as normalizeQueryOptions, v as validateQueryOptions, g as getComponentSchema } from "./chunk-CmizjRXJ.js";
import { p as parseExpression } from "./chunk-C1y-3rfY.js";
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
    await new Promise((resolve) => setTimeout(resolve, 200));
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
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("The render egress proxy has no address");
  return {
    server: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => {
      for (const socket of sockets)
        socket.destroy();
      server.close(() => resolve());
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
  const textOf2 = (selector) => {
    try {
      const text3 = (document.querySelector(selector)?.textContent ?? "").trim().replace(/\s+/g, " ");
      return text3 ? text3.length > 60 ? `${text3.slice(0, 57)}...` : text3 : void 0;
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
        const text3 = textOf2(targets[i]);
        return {
          target: targets[i],
          ...text3 ? { text: text3 } : {},
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
    const text3 = (el.innerText || "").trim();
    boxes.push({ name, x: r.x, y: r.y, w: r.width, h: r.height, el });
    const textual = /^(Html|Text|Statistics|Table|Tabs|Listview|Kanban|KeyValuePair|Timeline|Steps):/.test(name);
    const emptyStateByName = /empty|placeholder|no_?data|nothing/i.test(cy);
    if (textual && text3.length === 0 && r.height > 30 && !emptyStateByName) {
      findings.push({ kind: "empty_render", component: name, detail: `${Math.round(r.width)}x${Math.round(r.height)}px box renders no text (a multi-line binding or a broken expression)` });
    }
    const m = text3.match(bad);
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
        const text22 = (cell.innerText || "").trim();
        if (!text22)
          continue;
        const cellRect = cell.getBoundingClientRect();
        const spill = Array.from(cell.querySelectorAll("*")).find((node) => {
          if (!(node.innerText || "").trim() || node.children.length > 0)
            return false;
          const nr = node.getBoundingClientRect();
          return nr.width > 0 && (nr.right > cellRect.right + 2 || nr.left < cellRect.left - 2);
        });
        if (spill) {
          cut.push(text22.slice(0, 24));
          if (cut.length >= 3)
            break;
          continue;
        }
        for (const node of [cell, ...Array.from(cell.querySelectorAll("*"))]) {
          const cs = getComputedStyle(node);
          if ((cs.overflow === "hidden" || cs.overflowX === "hidden") && cs.textOverflow !== "ellipsis" && node.scrollWidth > node.clientWidth + 4 && node.clientWidth > 20) {
            cut.push(text22.slice(0, 24));
            break;
          }
        }
        if (cut.length >= 3)
          break;
      }
      if (cut.length)
        findings.push({ kind: "clipped", component: name, detail: `${cut.length}+ cells cut mid value (e.g. "${cut[0]}"); widen the column with columnSize or shorten the value` });
      const rawHeaders = Array.from(el.querySelectorAll('th, [role="columnheader"], .th')).map((h) => (h.innerText || "").trim()).filter((text22) => /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(text22));
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
  const root = doc.getElementById("tj-frame-root");
  const text3 = (root?.innerText ?? "").trim();
  if (!root || root.children.length === 0 || !text3 && !root.querySelector("svg,canvas,img")) {
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
    const label2 = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${el.tagName.toLowerCase()}${id ? `#${id}` : ""}${label2 ? ` "${label2}"` : ""}`;
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
  const placeholder = text3.match(/\b(undefined|NaN|Invalid date|\[object Object\])\b/);
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
  const root = frame?.contentDocument?.getElementById("tj-frame-root");
  return !!root && root.children.length > 0;
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
      const root = document.getElementById("tj-frame-root");
      return !!root && root.children.length > 0;
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
        const key2 = connectionKey(String(request2.url?.() ?? ""));
        if (key2)
          pageConnections.add(key2);
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
        const root = frame.contentDocument?.getElementById("tj-frame-root");
        return !!root && root.children.length > 0;
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
          const slug2 = `${app}-${p.page}${route.replace(/[^A-Za-z0-9]+/g, "-")}`.replace(/-+$/, "");
          screenshot = join(dir, `${slug2}-${options.viewportWidth ?? 1600}.png`);
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
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
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
createRequire(import.meta.url);
var lookOf = (c) => {
  const entry = c.styles?.tableLook;
  return entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
};
function packTableLook(components) {
  if (!components.some((c) => /^Shad[A-Z]/.test(c.type ?? "")))
    return { components, warnings: [] };
  const warnings = [];
  const out = components.map((c) => {
    if (c.type !== "Table" || lookOf(c) !== void 0)
      return c;
    warnings.push(`Table "${c.name ?? "Table"}" sits among ToolJet UI 2.0 widgets; it now draws in the UI 2.0 look (styles.tableLook "shadcn").`);
    return { ...c, styles: { ...c.styles ?? {}, tableLook: { value: "shadcn" } } };
  });
  return { components: out, warnings };
}
var BOX_PADDING_PX = 2;
var BORDER_PX = 1;
var CARD_HEADER_PX = { title: 48, withDescription: 70 };
var DEFAULT_GAP = 12;
var DEFAULT_PADDING = 12;
var CANVAS_PX = { narrow: 1100, wide: 1600 };
var GRID_COLUMNS = 43;
var DIALOG_TYPES = /* @__PURE__ */ new Set(["ShadDialog", "ModalV2", "Modal"]);
var valueOf = (entry) => entry && typeof entry === "object" && !Array.isArray(entry) && "value" in entry ? entry.value : entry;
var text = (entry) => {
  const v = valueOf(entry);
  return typeof v === "string" ? v.trim() : typeof v === "number" || typeof v === "boolean" ? String(v) : "";
};
var prop = (c, key2) => text(c.properties && typeof c.properties === "object" ? c.properties[key2] : void 0);
var style = (c, key2) => text(c.styles && typeof c.styles === "object" ? c.styles[key2] : void 0);
var bool = (raw, fallback) => {
  const bare = raw.replace(/[{}\s]/g, "").toLowerCase();
  return bare === "true" ? true : bare === "false" ? false : fallback;
};
var num = (raw, fallback) => {
  const n = Number(raw.replace(/[{}\s]/g, "").replace(/px$/, ""));
  return raw === "" || !Number.isFinite(n) ? fallback : n;
};
var refOf = (c) => c.clientRef ?? c.name;
var rectsOf = (c) => [c.layout, c.layouts?.desktop].filter((r, i, all) => !!r && typeof r.height === "number" && all.indexOf(r) === i);
var heightOf = (c) => Number((c.layouts?.desktop ?? c.layout)?.height ?? NaN);
var setHeight = (c, height) => rectsOf(c).forEach((r) => r.height = height);
function moveBelow(components, box, was, now) {
  const placeOf = (c) => `${c.parentRef ?? c.parent ?? ""}|${c.slotName ?? ""}`;
  const top = (box.layouts?.desktop ?? box.layout)?.top;
  if (typeof top !== "number" || now === was)
    return 0;
  const oldBottom = top + was;
  let moved = 0;
  for (const other of components) {
    if (!other || other === box || placeOf(other) !== placeOf(box) || DIALOG_TYPES.has(other.type))
      continue;
    const otherRects = [other.layout, other.layouts?.desktop].filter((r, i, all) => !!r && typeof r.top === "number" && all.indexOf(r) === i);
    if (!otherRects.length || otherRects[0].top < oldBottom - 1)
      continue;
    otherRects.forEach((r) => r.top = r.top + now - was);
    moved += 1;
  }
  return moved;
}
function fitFlexHeights(components, warnings) {
  const fitted = /* @__PURE__ */ new Set();
  const byRef = /* @__PURE__ */ new Map();
  for (const c of components)
    if (c && refOf(c))
      byRef.set(refOf(c), c);
  const childrenOf = (ref) => components.filter((c) => c && c.parentRef === ref && !c.slotName);
  const depth = (c) => {
    let d = 0;
    for (let p = c.parentRef; p && d < 20; p = byRef.get(p)?.parentRef)
      d += 1;
    return d;
  };
  const isCard = (c) => c.type === "FlexContainer" && prop(c, "cardStyle") === "shadcnCard";
  const directionOf = (c) => prop(c, "direction") || "row";
  const layoutV2 = (c) => prop(c, "layoutVersion") === "" || num(prop(c, "layoutVersion"), 2) >= 2;
  const inFlow = (c) => !DIALOG_TYPES.has(c.type) && bool(prop(c, "visibility"), true);
  const boxes = components.filter((c) => c && c.type === "FlexContainer").sort((a, b) => depth(b) - depth(a));
  const original = new Map(boxes.map((c) => [c, heightOf(c)]));
  const notes = [];
  for (const box of boxes) {
    const rects = rectsOf(box);
    const ref = refOf(box);
    if (!rects.length || !ref)
      continue;
    const inner = childrenOf(ref).filter(inFlow);
    if (!inner.length || inner.some((c) => !Number.isFinite(heightOf(c))))
      continue;
    const row = directionOf(box) === "row";
    const card = isCard(box);
    const fitsContent = layoutV2(box) && (card || row);
    if (!fitsContent && !bool(prop(box, "dynamicHeight"), true))
      continue;
    const gap = num(prop(box, "gap"), DEFAULT_GAP);
    const padding = num(prop(box, "padding"), DEFAULT_PADDING);
    let lines;
    if (!row) {
      lines = inner.map((c) => [c]);
    } else {
      const lineWidth = (c) => {
        const r = c.layouts?.desktop ?? c.layout;
        if (r?.fillWidth === false && typeof r.widthPx === "number")
          return r.widthPx;
        return typeof r?.minWidthPx === "number" ? r.minWidthPx : 0;
      };
      const widths = inner.map(lineWidth);
      const wraps = bool(prop(box, "flexWrap"), true);
      if (!wraps || widths.every((w) => w === 0)) {
        lines = [inner];
      } else {
        const pageLevel = !box.parentRef && !box.parent;
        if (!pageLevel)
          continue;
        const pack = (canvasPx) => {
          const available = (rects[0].width ?? GRID_COLUMNS) / GRID_COLUMNS * canvasPx - padding * 2;
          const packed = [];
          let used = 0;
          inner.forEach((c, i) => {
            const w = Math.min(widths[i], available);
            const current = packed[packed.length - 1];
            if (!current || used + gap + w > available) {
              packed.push([c]);
              used = w;
            } else {
              current.push(c);
              used += gap + w;
            }
          });
          return packed;
        };
        const narrow = pack(CANVAS_PX.narrow);
        const wide = pack(CANVAS_PX.wide);
        if (narrow.length !== wide.length || narrow.some((line, i) => line.length !== wide[i].length))
          continue;
        lines = narrow;
      }
      const stretches = prop(box, "alignItems") === "stretch" || bool(prop(box, "equalHeights"), true);
      if (stretches) {
        for (const line of lines) {
          if (line.length < 2)
            continue;
          const tallest = Math.max(...line.map(heightOf));
          for (const c of line)
            if (isCard(c) && heightOf(c) < tallest)
              setHeight(c, tallest);
          if (bool(prop(box, "equalHeights"), true)) {
            for (const c of line) {
              if (c.type === "ShadStat" && bool(prop(c, "card"), true) && bool(prop(c, "dynamicHeight"), true) && heightOf(c) < tallest) {
                setHeight(c, tallest);
              }
            }
          }
        }
      }
    }
    const content = lines.reduce((sum, line) => sum + Math.max(...line.map(heightOf)), 0) + gap * (lines.length - 1);
    const title = prop(box, "cardTitle");
    const extra = prop(box, "cardExtra");
    const header = card && (title || extra) ? extra ? CARD_HEADER_PX.withDescription : CARD_HEADER_PX.title : 0;
    const boxPadding = style(box, "padding") === "none" ? 0 : BOX_PADDING_PX;
    const needed = Math.ceil(content + padding * 2 + boxPadding * 2 + BORDER_PX * 2 + header);
    const was = heightOf(box);
    const target = fitsContent ? needed : Math.max(needed, was);
    if (target === was)
      continue;
    setHeight(box, target);
    fitted.add(box);
    const parent = box.parentRef ? byRef.get(box.parentRef) : void 0;
    const moved = parent?.type === "FlexContainer" ? 0 : moveBelow(components, box, was, target);
    notes.push({ box, kind: card ? "Card" : row ? "Row" : "Container", moved });
  }
  for (const { box, kind, moved } of notes) {
    const was = original.get(box);
    const now = heightOf(box);
    if (now === was) {
      fitted.delete(box);
      continue;
    }
    const shifted = moved ? ` (${moved} component${moved > 1 ? "s" : ""} below it moved ${now < was ? "up" : "down"} ${Math.abs(now - was)}px)` : "";
    warnings.push(now < was ? `${kind} "${box.name}" was ${was}px tall; it is now ${now}px, the height the app draws it at, so the editor shows no empty band under it${shifted}.` : `${kind} "${box.name}" was ${was}px tall; it is now ${now}px, the height the app draws it at, so the editor does not cut its content off${shifted}.`);
  }
  return fitted;
}
var BOX = 4;
var CHAR_EM = 0.45;
function wrappedLines(text3, widthPx, fontPx) {
  const charPx = fontPx * CHAR_EM;
  const width = Math.max(widthPx, charPx * 4);
  let total = 0;
  for (const paragraph of text3.split("\n")) {
    let lines = 1;
    let used = 0;
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const w = Math.min(word.length * charPx, width);
      const next = used === 0 ? w : used + charPx + w;
      if (next > width) {
        lines += 1;
        used = w;
      } else
        used = next;
    }
    total += lines;
  }
  return Math.max(1, total);
}
var TEXT_TONES = {
  paragraph: { font: 14, line: 28 },
  lead: { font: 20, line: 28 },
  muted: { font: 14, line: 20 },
  small: { font: 14, line: 14 },
  large: { font: 18, line: 28 }
};
var HEADING_LEVELS = {
  h1: { font: 36, line: 40 },
  h2: { font: 30, line: 36 },
  h3: { font: 24, line: 32 },
  h4: { font: 20, line: 28 }
};
var LABELLED_FIELDS = /* @__PURE__ */ new Set([
  "ShadInput",
  "ShadSelect",
  "ShadDatePicker",
  "ShadNumberInput",
  "ShadCurrencyInput",
  "ShadMultiselect",
  "ShadCombobox",
  "ShadPasswordInput",
  "ShadPhoneInput",
  "ShadTimePicker",
  "ShadDateTimePicker",
  "ShadTagsInput",
  "ShadOtpInput",
  "ShadColorPicker"
]);
var FIELD_BOX = 40;
var FIELD_LABEL = 22;
var FIELD_DESCRIPTION = 26;
var FIELD_LABEL_LINE = 14;
var literal = (raw) => raw === void 0 ? void 0 : raw.replace(/^\{\{\s*|\s*\}\}$/g, "").trim();
var isTrue = (raw, fallback) => {
  const v = literal(raw);
  return v === "true" ? true : v === "false" ? false : fallback;
};
var isNumber = (raw) => {
  const v = literal(raw);
  const n = v === void 0 || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : void 0;
};
var shown = (input, key2) => {
  const t = input.text(key2);
  return !!t && (t.bound || t.text.trim() !== "");
};
function drawnPackHeight(input) {
  const { type } = input;
  if (isTrue(input.attr("dynamicHeight"), true) === false)
    return void 0;
  const exact = (height) => ({ height: Math.round(height), exact: true });
  const estimate = (height) => ({ height: Math.round(height), exact: false });
  const inner = input.widthPx - BOX;
  if (type === "ShadText" || type === "ShadHeading") {
    const style2 = type === "ShadText" ? TEXT_TONES[input.attr("tone") ?? "paragraph"] ?? TEXT_TONES.paragraph : HEADING_LEVELS[input.attr("level") ?? "h2"] ?? HEADING_LEVELS.h2;
    const t = input.text("text");
    const lines = wrappedLines(t?.text ?? "", inner, style2.font);
    const height = lines * style2.line + BOX;
    return t?.bound ? estimate(height) : exact(height);
  }
  if (type === "ShadStat") {
    const size = input.attr("size") ?? "default";
    let height = size === "sm" ? 120 : size === "lg" ? 132 : 124;
    if (!isTrue(input.attr("card"), true))
      height -= 42;
    if (shown(input, "footnote"))
      height += 26;
    if (input.has("progress"))
      height += 16 + (shown(input, "progressLabel") ? 20 : 0);
    if (input.has("trendData"))
      height += 46;
    if (shown(input, "icon") && input.attr("iconPosition") === "top")
      height += 42;
    return exact(height);
  }
  if (LABELLED_FIELDS.has(type)) {
    const label2 = input.text("label");
    const labelLines = label2 && (label2.bound || label2.text.trim()) ? wrappedLines(label2.text, inner, 14) : 0;
    const height = FIELD_BOX + (labelLines ? FIELD_LABEL + (labelLines - 1) * FIELD_LABEL_LINE : 0) + (shown(input, "description") ? FIELD_DESCRIPTION : 0) + (type === "ShadTagsInput" ? 2 : 0);
    return label2?.bound ? estimate(height) : exact(height);
  }
  switch (type) {
    case "ShadSwitch":
    case "ShadCheckbox": {
      const label2 = input.text("label");
      const lines = label2 && (label2.bound || label2.text.trim()) ? wrappedLines(label2.text, inner - 24, 14) : 1;
      const row = type === "ShadSwitch" ? 24 : 20;
      const height = (lines > 1 ? lines * 20 : row) + (shown(input, "description") ? type === "ShadSwitch" ? 20 : 24 : 0);
      return lines > 1 || label2?.bound ? estimate(height) : exact(height);
    }
    case "ShadSlider":
      return exact(shown(input, "label") ? 46 : 24);
    case "ShadRating":
      return exact(shown(input, "label") ? 46 : 24);
    case "ShadToggleGroup":
      return exact(40);
    case "ShadTags": {
      const size = input.attr("size") ?? "default";
      return exact(size === "sm" ? 24 : size === "lg" ? 32 : 28);
    }
    case "ShadCircularProgress":
      return exact((isNumber(input.attr("size")) ?? 96) + BOX);
    case "ShadFileUpload":
      return exact(182);
    case "ShadRadioGroup": {
      const label2 = shown(input, "label");
      if (isTrue(input.attr("horizontal"), false))
        return exact(label2 ? 50 : 28);
      const options = input.count("options");
      return options === void 0 ? void 0 : exact((label2 ? 26 : 4) + 24 * options);
    }
    case "ShadAlert": {
      const description = input.text("description");
      const lines = description && (description.bound || description.text.trim()) ? wrappedLines(description.text, inner - 34, 14) : 0;
      const height = 34 + (shown(input, "title") ? 22 : 0) + lines * 20 + (shown(input, "actionLabel") ? 44 : 0);
      return description?.bound ? estimate(height) : exact(height);
    }
    case "ShadSteps": {
      if ((input.attr("orientation") ?? "horizontal") !== "vertical")
        return exact(64);
      const steps = input.count("steps");
      return steps === void 0 ? void 0 : exact(48 * steps + BOX);
    }
    case "ShadSummaryStrip": {
      const size = input.attr("size") ?? "default";
      const panel = (input.attr("appearance") ?? "panel") !== "plain";
      return exact((size === "sm" ? 78 : size === "lg" ? 102 : 90) - (panel ? 0 : 2));
    }
    case "ShadAccordion": {
      const open = input.count("defaultOpen");
      if (open !== void 0 ? open > 0 : input.has("defaultOpen"))
        return void 0;
      const items = input.count("items");
      return items === void 0 || items === 0 ? void 0 : exact(53 * items + BOX);
    }
    case "ShadKeyValue": {
      const n = input.count("data");
      if (!n)
        return void 0;
      const columns = Math.max(1, isNumber(input.attr("columns")) ?? 1);
      return estimateOrExact(input, "data", 41 * Math.ceil(n / columns) + (isTrue(input.attr("dividers"), true) ? 3 : 0));
    }
    case "ShadRecordList": {
      const n = input.count("data");
      if (!n)
        return void 0;
      const density = input.attr("density") ?? "default";
      const avatar = isTrue(input.attr("showAvatar"), true);
      const meta = shown(input, "metaFields");
      const row = density === "compact" ? 45 : density === "comfortable" ? avatar ? 73 : 57 : avatar ? 61 + (meta ? 2 : 0) : 45;
      const chrome = (input.attr("listStyle") ?? "card") === "plain" ? 3 : 5;
      return estimateOrExact(input, "data", n * row + chrome);
    }
    case "ShadProgressList": {
      const n = input.count("data");
      if (!n)
        return void 0;
      const bar = input.attr("barSize") ?? "default";
      const target = input.attr("targetField");
      const row = 59.4 + (target && input.itemsHave("data", target) ? 1 : 0) + (bar === "thick" ? 4 : bar === "thin" ? -2 : 0);
      const chrome = (input.attr("listStyle") ?? "card") === "plain" ? 3 : 13.6;
      return estimateOrExact(input, "data", n * row + chrome);
    }
    case "ShadTimeline": {
      const n = input.count("items");
      if (!n)
        return void 0;
      const compact = input.attr("density") === "compact";
      const item = (compact ? 32 : 44) + (input.itemsHave("items", "description") ? 22 : 0) + (!compact && input.attr("timePosition") === "top" ? 22 : 0);
      return estimateOrExact(input, "items", n * item - (compact ? 8 : 20));
    }
    case "ShadTable": {
      const n = input.count("data");
      if (!n)
        return void 0;
      const cell = input.attr("cellSize") ?? "regular";
      const row = cell === "condensed" ? 36 : cell === "spacious" ? 52 : 44;
      const paged = isTrue(input.attr("enablePagination"), true) && !isTrue(input.attr("serverSidePagination"), false);
      const perPage = Math.max(1, isNumber(input.attr("rowsPerPage")) ?? 10);
      const rows = paged ? Math.min(n, perPage) : n;
      return estimateOrExact(input, "data", 122 + rows * row + (paged && n > perPage ? 16 : 0));
    }
    case "ShadCardGrid": {
      const n = input.count("data");
      if (!n)
        return void 0;
      const gap = 12;
      const columns = (input.attr("layout") ?? "stacked") === "row" ? 1 : Math.max(1, isNumber(input.attr("columns")) ?? 3);
      const min = isNumber(input.attr("minCardWidth")) ?? 240;
      const perRow = Math.max(1, Math.min(columns, Math.floor((input.widthPx + gap) / (min + gap))));
      const cardWidth = (input.widthPx - gap * (perRow - 1)) / perRow;
      const image = isTrue(input.attr("showImage"), true) && shown(input, "imageField");
      const aspect = { "16/9": 9 / 16, "4/3": 3 / 4, "1/1": 1 }[input.attr("imageAspect") ?? "16/9"] ?? 9 / 16;
      const card = 89 + (image ? cardWidth * aspect : 0);
      const rows = Math.ceil(n / perRow);
      return estimate(rows * card + gap * (rows - 1));
    }
    case "ShadImage": {
      const ratio = input.attr("aspectRatio");
      const m = ratio ? /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(ratio) : null;
      return m ? estimate(input.widthPx * Number(m[2]) / Number(m[1])) : void 0;
    }
    default:
      return void 0;
  }
}
function estimateOrExact(input, key2, height) {
  const source = input.attr(key2) ?? "";
  return { height: Math.round(height), exact: /^\s*(\{\{\s*)?\[/.test(source) };
}
var VIEWER_COLUMN_PX = 32.2;
var GRID_COLUMNS2 = 43;
var WIDTH_SENSITIVE = /* @__PURE__ */ new Set([
  "ShadText",
  "ShadHeading",
  "ShadAlert",
  "ShadCardGrid",
  "ShadImage",
  "ShadSwitch",
  "ShadCheckbox",
  "ShadInput",
  "ShadSelect",
  "ShadDatePicker",
  "ShadNumberInput",
  "ShadCurrencyInput",
  "ShadMultiselect",
  "ShadCombobox",
  "ShadPasswordInput",
  "ShadPhoneInput",
  "ShadTimePicker",
  "ShadDateTimePicker",
  "ShadTagsInput",
  "ShadOtpInput",
  "ShadColorPicker"
]);
var valueOf2 = (entry) => entry && typeof entry === "object" && !Array.isArray(entry) && "value" in entry ? entry.value : entry;
var asText = (v) => v === void 0 || v === null ? void 0 : typeof v === "string" ? v : typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(v);
var listCount = (raw) => {
  if (raw === void 0)
    return void 0;
  const bare = raw.trim().replace(/^\{\{\s*|\s*\}\}$/g, "").trim();
  if (!bare.startsWith("[") || !bare.endsWith("]"))
    return void 0;
  try {
    const parsed = JSON.parse(bare.replace(/'/g, '"'));
    return Array.isArray(parsed) ? parsed.length : void 0;
  } catch {
    let depth = 0;
    let items = 0;
    let any = false;
    let quote = "";
    for (const ch of bare.slice(1, -1)) {
      if (quote) {
        if (ch === quote)
          quote = "";
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`")
        quote = ch;
      else if ("([{".includes(ch))
        depth += 1;
      else if (")]}".includes(ch))
        depth -= 1;
      else if (ch === "," && depth === 0)
        items += 1;
      if (!/\s/.test(ch))
        any = true;
    }
    return any ? items + 1 : 0;
  }
};
function fitPackHeights(components) {
  const notes = [];
  const byRef = /* @__PURE__ */ new Map();
  for (const c of components)
    if (c && (c.clientRef ?? c.name))
      byRef.set(c.clientRef ?? c.name, c);
  const rectOf = (c) => c.layouts?.desktop ?? c.layout;
  const drawnWidth = (c, depth = 0) => {
    const rect = rectOf(c);
    if (!rect || depth > 20)
      return void 0;
    const parent = c.parentRef ? byRef.get(c.parentRef) : void 0;
    if (parent?.type === "FlexContainer")
      return rect.fillWidth === false && typeof rect.widthPx === "number" ? rect.widthPx : void 0;
    if (typeof rect.width !== "number")
      return void 0;
    if (!c.parentRef && !c.parent)
      return rect.width * VIEWER_COLUMN_PX;
    const outer = parent ? drawnWidth(parent, depth + 1) : void 0;
    return outer === void 0 ? void 0 : rect.width / GRID_COLUMNS2 * outer;
  };
  for (const c of components) {
    if (!c || !c.type?.startsWith("Shad"))
      continue;
    const rect = rectOf(c);
    if (!rect || typeof rect.height !== "number")
      continue;
    const width = drawnWidth(c);
    if (width === void 0 && WIDTH_SENSITIVE.has(c.type))
      continue;
    const props2 = c.properties ?? {};
    const defaults = packDefaultDefinition(c.type)?.properties ?? {};
    const raw = (key2) => {
      const v = asText(valueOf2(key2 in props2 ? props2[key2] : defaults[key2]));
      return key2 in props2 || v !== void 0 && v !== "" ? v : void 0;
    };
    const input = {
      type: c.type,
      widthPx: width ?? 300,
      attr: raw,
      has: (key2) => key2 in props2 && (asText(valueOf2(props2[key2])) ?? "").trim() !== "",
      text: (key2) => {
        const t = raw(key2);
        if (t === void 0)
          return void 0;
        const bound = t.includes("{{");
        return { text: t.replace(/\{\{[\s\S]*?\}\}/g, "00000000"), bound };
      },
      count: (key2) => listCount(raw(key2)),
      itemsHave: (key2, field) => new RegExp(`["']?${field}["']?\\s*:\\s*(?!["']{2}|null\\b)`).test(raw(key2) ?? "")
    };
    const drawn = drawnPackHeight(input);
    if (!drawn?.exact || drawn.height === rect.height)
      continue;
    const parent = c.parentRef ? byRef.get(c.parentRef) : void 0;
    const was = rect.height;
    [c.layout, c.layouts?.desktop].forEach((r) => {
      if (r && typeof r.height === "number")
        r.height = drawn.height;
    });
    const moved = parent?.type === "FlexContainer" ? 0 : moveBelow(components, c, was, drawn.height);
    notes.push({ component: c, was, moved });
  }
  return notes;
}
function reportPackHeights(notes, warnings) {
  for (const { component: c, was, moved } of notes) {
    const now = Number((c.layouts?.desktop ?? c.layout)?.height);
    if (!Number.isFinite(now) || now === was)
      continue;
    warnings.push(`${c.type} "${c.name}" was ${was}px tall; it is now ${now}px, the height the app draws it at (it fits its content there), so the editor draws it the same${moved ? ` (${moved} component${moved > 1 ? "s" : ""} below it moved ${now < was ? "up" : "down"} ${Math.abs(now - was)}px)` : ""}.`);
  }
}
var FIELD_TYPES = /* @__PURE__ */ new Set([
  "ShadInput",
  "ShadSelect",
  "ShadDatePicker",
  "ShadDateTimePicker",
  "ShadTimePicker",
  "ShadCombobox",
  "ShadMultiselect",
  "ShadNumberInput",
  "ShadCurrencyInput",
  "ShadPhoneInput",
  "ShadPasswordInput",
  "ShadTagsInput",
  "ShadColorPicker",
  "ShadSlider"
]);
var ACTION_TYPES = /* @__PURE__ */ new Set(["ShadButton", "ShadButtonGroup", "ShadDropdownMenu"]);
var INLINE_TYPES = /* @__PURE__ */ new Set([
  ...FIELD_TYPES,
  ...ACTION_TYPES,
  "ShadBadge",
  "ShadText",
  "ShadToggleGroup",
  "ShadSwitch",
  "ShadCheckbox",
  "ShadLink",
  "ShadIcon",
  "ShadTags",
  "ShadSpinner"
]);
var valueOf3 = (entry) => entry && typeof entry === "object" && !Array.isArray(entry) && "value" in entry ? entry.value : entry;
var text2 = (entry) => {
  const v = valueOf3(entry);
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
};
var props = (component) => component.properties && typeof component.properties === "object" ? component.properties : {};
var prop2 = (component, key2) => props(component)[key2];
var styleText = (component, key2) => text2(component.styles && typeof component.styles === "object" ? component.styles[key2] : void 0);
var refOf2 = (component) => component.clientRef ?? component.name;
var setProp = (component, key2, value) => {
  const current = props(component)[key2];
  component.properties = {
    ...props(component),
    [key2]: current && typeof current === "object" && !Array.isArray(current) ? { ...current, value } : { value }
  };
};
var isRow = (component) => component.type === "FlexContainer" && text2(prop2(component, "direction")) === "row";
var isLabelledField = (component) => FIELD_TYPES.has(component.type) && text2(prop2(component, "label")) !== "";
var isSurface = (component) => {
  if (component.type !== "FlexContainer")
    return false;
  if (text2(prop2(component, "cardStyle")) === "shadcnCard")
    return true;
  const background = styleText(component, "backgroundColor").toLowerCase();
  return background !== "" && background !== "transparent" && !/^#[0-9a-f]{6}00$/.test(background);
};
var isTitle = (component, children) => component.type === "ShadHeading" || component.type === "FlexContainer" && !isRow(component) && children(refOf2(component) ?? "").some((inner) => inner.type === "ShadHeading");
var HEADING_PX = { h1: 36, h2: 30, h3: 24, h4: 20 };
var headingLineWidth = (component) => {
  const raw = text2(prop2(component, "text"));
  if (!raw || raw.includes("{{"))
    return null;
  const size = HEADING_PX[text2(prop2(component, "level"))] ?? HEADING_PX.h2;
  return Math.ceil(raw.length * size * (size >= 36 ? 0.6 : 0.56) + 8);
};
var fixedRects = (component) => [component.layout, component.layouts?.desktop].filter((rect) => !!rect && rect.fillWidth === false && typeof rect.widthPx === "number");
var META_TYPES = /* @__PURE__ */ new Set(["ShadText", "ShadBadge", "ShadTags"]);
var shownText = (raw) => raw.replace(/\{\{([\s\S]*?)\}\}/g, (_, code) => {
  const words = [...code.matchAll(/'([^']*)'|"([^"]*)"|`([^`$]*)`/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? "");
  if (!words.length)
    return "0000";
  const values = code.split(/'[^']*'|"[^"]*"|`[^`$]*`/).filter((part) => /[A-Za-z0-9_)\]]/.test(part)).length;
  return words.join("") + "00".repeat(Math.max(1, values));
});
var PAGE_MARGIN = 24;
var LABELLED_FIELD_TYPES = /* @__PURE__ */ new Set([
  "ShadInput",
  "ShadSelect",
  "ShadMultiSelect",
  "ShadCombobox",
  "ShadCurrencyInput",
  "ShadNumberInput",
  "ShadDatePicker",
  "ShadDateRangePicker",
  "ShadTimePicker",
  "ShadPhoneInput",
  "ShadEmailInput",
  "ShadPasswordInput"
]);
function polishFlexRows(input) {
  const warnings = [];
  if (!Array.isArray(input) || !input.length)
    return { components: Array.isArray(input) ? [...input] : [], warnings };
  const components = input.map((component) => component && typeof component === "object" ? {
    ...component,
    properties: { ...props(component) },
    ...component.layout ? { layout: { ...component.layout } } : {},
    ...component.layouts ? {
      layouts: {
        ...component.layouts,
        ...component.layouts.desktop ? { desktop: { ...component.layouts.desktop } } : {}
      }
    } : {}
  } : component);
  const childrenOf = (ref) => components.filter((component) => component && component.parentRef === ref && !component.slotName);
  const DIALOG_TYPES3 = /* @__PURE__ */ new Set(["ShadDialog", "ModalV2", "Modal"]);
  const isRootLevel = (c) => !c.parentRef && !c.parent;
  const topOf = (c) => Number(c.layout?.top ?? c.layouts?.desktop?.top);
  for (const host of [...components]) {
    if (!host || host.type !== "FlexContainer" || !isRootLevel(host))
      continue;
    const ref = refOf2(host);
    const inner = components.filter((c) => c && c.parentRef === ref);
    if (!inner.length || !inner.every((c) => DIALOG_TYPES3.has(c.type)))
      continue;
    inner.forEach((dialog) => {
      delete dialog.parentRef;
      delete dialog.slotName;
    });
    components.splice(components.indexOf(host), 1);
    const hostTop = topOf(host);
    const below = components.filter((c) => c && isRootLevel(c) && !DIALOG_TYPES3.has(c.type) && topOf(c) > hostTop);
    const nextTop = below.length ? Math.min(...below.map(topOf)) : NaN;
    const lift = Number.isFinite(hostTop) && Number.isFinite(nextTop) ? nextTop - hostTop : 0;
    if (lift > 0) {
      below.forEach((c) => {
        [c.layout, c.layouts?.desktop].forEach((rect) => {
          if (rect && typeof rect.top === "number")
            rect.top -= lift;
        });
      });
    }
    warnings.push(`"${host.name}" held only dialogs, which draw nothing until opened, so it showed as an empty band; the dialogs now sit at the page root, the container is gone${lift > 0 ? ` and the sections below moved up ${lift}px` : ""}.`);
  }
  for (const root of components) {
    if (!root || root.type !== "FlexContainer" || root.parentRef || root.parent)
      continue;
    const dynamic = text2(prop2(root, "dynamicHeight")).replace(/[{}\s]/g, "");
    if (dynamic === "true")
      continue;
    setProp(root, "dynamicHeight", "{{true}}");
  }
  for (const root of components) {
    if (!root || root.type !== "FlexContainer" || root.parentRef || root.parent)
      continue;
    const rect = root.layouts?.desktop ?? root.layout;
    if (!rect || typeof rect.left !== "number" || typeof rect.width !== "number")
      continue;
    if (rect.width < 39 || rect.left >= 2 && rect.left + rect.width <= 41)
      continue;
    const band = styleText(root, "backgroundColor").toLowerCase();
    if (band && band !== "transparent" && !band.startsWith("var(--cc-appbackground"))
      continue;
    const raw = text2(prop2(root, "padding"));
    const padding = raw === "" ? 12 : Number(raw) || 0;
    if (padding >= PAGE_MARGIN)
      continue;
    setProp(root, "padding", PAGE_MARGIN);
  }
  const heightOf2 = (c) => Number(c.layout?.height ?? c.layouts?.desktop?.height ?? NaN);
  for (const sheet of components) {
    if (!sheet || sheet.type !== "ShadDialog" || text2(prop2(sheet, "variant")) !== "sheet")
      continue;
    if (["xl", "fullscreen"].includes(text2(prop2(sheet, "size"))))
      continue;
    const descendants = [];
    const queue = [refOf2(sheet)];
    while (queue.length && descendants.length < 400) {
      const parent = queue.shift();
      for (const c of components) {
        if (c && parent && c.parentRef === parent) {
          descendants.push(c);
          queue.push(refOf2(c));
        }
      }
    }
    const pairRow = descendants.find((c) => isRow(c) && components.filter((x) => x && x.parentRef === refOf2(c) && FIELD_TYPES.has(x.type)).length >= 2);
    if (!pairRow)
      continue;
    setProp(sheet, "size", "xl");
    warnings.push(`Sheet "${sheet.name}" holds fields side by side ("${pairRow.name}"); it now opens at the wide size (xl, 640px).`);
  }
  for (const container of components) {
    if (!container || !isRow(container))
      continue;
    const ref = refOf2(container);
    if (!ref)
      continue;
    let children = childrenOf(ref);
    const label0 = container.name ?? ref;
    children.forEach((card, i) => {
      const next2 = children[i + 1];
      if (!next2 || !isSurface(card) || !text2(prop2(card, "cardTitle")))
        return;
      const cardRef = refOf2(card);
      if (!cardRef || childrenOf(cardRef).length)
        return;
      if (next2.type === "FlexContainer" || ACTION_TYPES.has(next2.type))
        return;
      next2.parentRef = cardRef;
      const order = valueOf3(prop2(container, "childOrder"));
      if (Array.isArray(order)) {
        setProp(container, "childOrder", order.filter((entry) => entry !== refOf2(next2) && entry !== next2.name));
      }
      warnings.push(`"${next2.name}" sat beside the empty card "${card.name}" in row "${label0}"; it is now inside the card.`);
    });
    children = childrenOf(ref);
    if (!isSurface(container) && !text2(prop2(container, "cardTitle"))) {
      const rects = [container.layout, container.layouts?.desktop].filter((rect) => !!rect && typeof rect.height === "number");
      const tallest = Math.max(0, ...children.map((c) => Number(c.layout?.height ?? c.layouts?.desktop?.height ?? 0)).filter(Number.isFinite));
      const rawPadding = text2(prop2(container, "padding"));
      const padding = rawPadding === "" ? 12 : Number(rawPadding) || 0;
      const needed = tallest > 0 ? tallest + padding * 2 + 6 : 0;
      if (needed && rects.length && rects.some((rect) => rect.height < needed)) {
        rects.forEach((rect) => {
          rect.height = Math.max(rect.height, needed);
        });
        warnings.push(`Row "${label0}" was shorter than its tallest child; its height is now ${needed}.`);
      }
    }
    const lone = children.length === 1 ? children[0] : void 0;
    if (lone && lone.type === "ShadButton" && ["flex-end", "end", "center"].includes(text2(prop2(container, "justifyContent")))) {
      const rects = [lone.layout, lone.layouts?.desktop].filter((rect) => !!rect && rect.fillWidth !== false);
      if (rects.length) {
        const caption = text2(prop2(lone, "text")) || text2(prop2(lone, "label"));
        const own = rects.map((rect) => rect.widthPx).find((w) => typeof w === "number" && w > 0);
        const width = own ?? Math.max(96, Math.ceil(caption.length * 8 + (text2(prop2(lone, "icon")) ? 64 : 40)));
        rects.forEach((rect) => {
          rect.fillWidth = false;
          rect.widthPx = width;
        });
        warnings.push(`"${lone.name}" filled row "${label0}" and drew at its left; it now keeps its own width (${width}px).`);
      }
    }
    if (children.length < 2)
      continue;
    const fullWidth = children.filter((child) => {
      const rect = child.layout ?? child.layouts?.desktop;
      return rect && typeof rect.width === "number" && rect.width >= 40 && rect.fillWidth !== true && typeof rect.widthPx !== "number";
    });
    if (fullWidth.length >= 2) {
      fullWidth.forEach((child) => {
        [child.layout, child.layouts?.desktop].forEach((rect) => {
          if (rect)
            rect.fillWidth = true;
        });
      });
      warnings.push(`Row "${label0}": ${fullWidth.length} children were each drawn full-width; they now share the row.`);
    }
    const placed = ["flex-end", "end", "center", "space-between", "space-around", "space-evenly"].includes(text2(prop2(container, "justifyContent")));
    if (placed || children.some((child) => !ACTION_TYPES.has(child.type))) {
      const hasTitle = children.some((c) => isTitle(c, childrenOf));
      for (const child of children) {
        const inline = child.type === "ShadButton" || hasTitle && ["ShadBadge", "ShadTags", "ShadLink"].includes(child.type);
        if (!inline)
          continue;
        const rects = [child.layout, child.layouts?.desktop].filter((rect) => !!rect && rect.fillWidth !== false);
        if (!rects.length)
          continue;
        const caption = text2(prop2(child, "text")) || text2(prop2(child, "label"));
        const fitted = child.type === "ShadButton" ? Math.max(96, Math.ceil(caption.length * 8 + (text2(prop2(child, "icon")) ? 64 : 40))) : Math.min(320, Math.max(48, Math.ceil(caption.length * 7 + 28)));
        const own = rects.map((rect) => rect.widthPx).find((w) => typeof w === "number" && w > 0);
        const width = own ?? fitted;
        rects.forEach((rect) => {
          rect.fillWidth = false;
          rect.widthPx = width;
        });
        warnings.push(`"${child.name}" in row "${label0}" filled the row's width; it now keeps its own (${width}px).`);
      }
    }
    if (children.some((c) => isTitle(c, childrenOf))) {
      const buttonWidth = (button) => {
        const own = [button.layout, button.layouts?.desktop].map((rect) => rect?.widthPx).find((w) => typeof w === "number" && w > 0);
        if (own)
          return own;
        const caption = text2(prop2(button, "text")) || text2(prop2(button, "label"));
        return Math.max(96, Math.ceil(caption.length * 8 + (text2(prop2(button, "icon")) ? 64 : 40)));
      };
      const actionGroup = (c) => {
        if (c.type !== "FlexContainer" || isSurface(c))
          return null;
        const inner = childrenOf(refOf2(c) ?? "");
        return inner.length && inner.every((b) => ACTION_TYPES.has(b.type)) ? inner : null;
      };
      const metaWidth = (c) => {
        if (c.type !== "ShadText" && c.type !== "ShadBadge")
          return null;
        const shown2 = shownText(text2(prop2(c, "text")));
        return shown2.length <= 40 ? Math.min(320, Math.max(48, Math.ceil(shown2.length * 7 + 28))) : null;
      };
      const metaActionGroup = (c) => {
        if (c.type !== "FlexContainer" || isSurface(c) || !isRow(c))
          return null;
        const inner = childrenOf(refOf2(c) ?? "");
        return inner.some((b) => ACTION_TYPES.has(b.type)) && inner.some((b) => !ACTION_TYPES.has(b.type)) && inner.every((b) => ACTION_TYPES.has(b.type) || metaWidth(b) !== null) ? inner : null;
      };
      for (const c of children) {
        const inner = actionGroup(c);
        if (inner && inner.length >= 2 && props(c).flexWrap === void 0)
          setProp(c, "flexWrap", "{{false}}");
        if (!inner || inner.length < 2 || isRow(c))
          continue;
        setProp(c, "direction", "row");
        if (text2(prop2(c, "gap")) === "")
          setProp(c, "gap", 8);
        warnings.push(`"${c.name}" stacked its ${inner.length} buttons beside a title; it now lays them out in a row.`);
      }
      const [first, ...rest] = children;
      if (first && rest.length && isTitle(first, childrenOf) && text2(prop2(container, "justifyContent")) === "space-between") {
        const fills = (c) => [c.layout, c.layouts?.desktop].filter((rect) => !!rect && rect.fillWidth !== false);
        for (const c of rest) {
          const rects = fills(c);
          if (!rects.length)
            continue;
          let width = null;
          const inner = actionGroup(c);
          const mixed = inner ? null : metaActionGroup(c);
          if (mixed) {
            const rawGap = text2(prop2(c, "gap"));
            const gap = rawGap === "" ? 8 : Number(rawGap) || 0;
            const rawPad = text2(prop2(c, "padding"));
            const pad = rawPad === "" ? 12 : Number(rawPad) || 0;
            width = mixed.reduce((sum, b) => sum + (ACTION_TYPES.has(b.type) ? buttonWidth(b) : metaWidth(b) ?? 0), 0) + gap * (mixed.length - 1) + pad * 2 + 4;
            for (const meta of mixed) {
              const own2 = metaWidth(meta);
              if (own2 === null)
                continue;
              if (meta.type === "ShadText" && ["", "left"].includes(styleText(meta, "textAlign"))) {
                meta.styles = { ...meta.styles ?? {}, textAlign: { value: "right" } };
              }
              [meta.layout, meta.layouts?.desktop].forEach((rect) => {
                if (!rect)
                  return;
                rect.fillWidth = false;
                rect.widthPx = own2;
              });
            }
          } else if (inner) {
            const rawGap = text2(prop2(c, "gap"));
            const gap = rawGap === "" ? 8 : Number(rawGap) || 0;
            const rawPad = text2(prop2(c, "padding"));
            const pad = rawPad === "" ? 12 : Number(rawPad) || 0;
            width = inner.reduce((sum, b) => sum + buttonWidth(b), 0) + gap * (inner.length - 1) + pad * 2 + 4;
          } else if (c.type === "ShadText") {
            const shown2 = shownText(text2(prop2(c, "text")));
            if (shown2.length <= 40)
              width = Math.min(320, Math.max(48, Math.ceil(shown2.length * 7 + 28)));
          }
          if (width === null)
            continue;
          const own = width;
          rects.forEach((rect) => {
            rect.fillWidth = false;
            rect.widthPx = own;
          });
          warnings.push(`"${c.name}" in header "${label0}" filled half the header; it now keeps its own width (${own}px).`);
        }
        const titleRects = [first.layout, first.layouts?.desktop].filter(
          // A title the build sized itself (fillWidth:false) keeps its width; space-between still puts the rest right.
          (rect) => !!rect && rect.fillWidth === void 0
        );
        if (titleRects.length && rest.every((c) => !fills(c).length)) {
          titleRects.forEach((rect) => {
            rect.fillWidth = true;
          });
        }
      }
    }
    const align = text2(prop2(container, "alignItems"));
    const label2 = container.name ?? ref;
    if (children.every((child) => INLINE_TYPES.has(child.type)) && children.some(isLabelledField) && children.some((child) => !isLabelledField(child)) && align !== "flex-end") {
      setProp(container, "alignItems", "flex-end");
      warnings.push(`Row "${label2}" has labelled fields beside other controls; its alignItems is now "flex-end" so the field boxes and the controls beside them line up along the bottom.`);
    }
    if (children.length >= 2 && children.every(isLabelledField) && text2(prop2(container, "alignItems")) !== "flex-end") {
      setProp(container, "alignItems", "flex-end");
      warnings.push(`Row "${label2}" holds only labelled fields; its alignItems is now "flex-end" so the field boxes line up along the bottom.`);
    }
    if (children.some(isLabelledField) && children.some((child) => ACTION_TYPES.has(child.type)) && !children.every((child) => INLINE_TYPES.has(child.type)) && align !== "flex-end") {
      setProp(container, "alignItems", "flex-end");
      warnings.push(`Row "${label2}" has a labelled field beside buttons; its alignItems is now "flex-end" so the buttons line up with the field box.`);
    }
    if (text2(prop2(container, "alignItems")) === "flex-end" && children.some(isLabelledField)) {
      for (const button of children.filter((child) => child.type === "ShadButton")) {
        const rects = [button.layout, button.layouts?.desktop].filter((rect) => !!rect);
        if (!rects.length || !rects.some((rect) => typeof rect.height === "number" && rect.height < 40))
          continue;
        rects.forEach((rect) => {
          if (typeof rect.height === "number" && rect.height < 40)
            rect.height = 40;
        });
        warnings.push(`"${button.name}" in row "${label2}" is now 40px tall so its box matches the field box beside it.`);
      }
    }
    if (children.length >= 2 && children.every(isSurface) && align !== "stretch") {
      setProp(container, "alignItems", "stretch");
      warnings.push(`Row "${label2}" holds ${children.length} cards; its alignItems is now stretch so they share one height.`);
    }
    if (children.length >= 2 && children.every(isSurface) && text2(prop2(container, "alignItems")) === "stretch") {
      const contentOf = (card) => {
        const inner = childrenOf(refOf2(card) ?? "");
        const heights = inner.map((c) => Number(c.layout?.height ?? c.layouts?.desktop?.height ?? NaN));
        if (!inner.length || heights.some((h) => !Number.isFinite(h)))
          return { height: NaN };
        const rawGap = text2(prop2(card, "gap"));
        const gap = rawGap === "" ? 8 : Number(rawGap) || 0;
        return { height: heights.reduce((a, b) => a + b, 0) + gap * (inner.length - 1), last: inner[inner.length - 1] };
      };
      const contents = children.map(contentOf);
      const tallest = Math.max(...contents.map((c) => Number.isFinite(c.height) ? c.height : 0));
      contents.forEach(({ height, last }) => {
        if (!last || !Number.isFinite(height) || tallest - height < 24 || !/Chart$/.test(last.type))
          return;
        const grow = tallest - height;
        [last.layout, last.layouts?.desktop].forEach((rect) => {
          if (rect && typeof rect.height === "number")
            rect.height += grow;
        });
        warnings.push(`Chart "${last.name}" grows by ${grow}px to fill its card, which is stretched to the tallest card in row "${label2}".`);
      });
    }
    if (children.length >= 2 && children.some(isSurface)) {
      const rawGap = text2(prop2(container, "gap"));
      const gap = rawGap === "" ? 16 : Number(rawGap) || 0;
      const share = Math.floor((1280 - gap * (children.length - 1)) / children.length);
      for (const card of children) {
        if (!isSurface(card))
          continue;
        const rawPad = text2(prop2(card, "padding"));
        const pad = rawPad === "" ? 12 : Number(rawPad) || 0;
        const own = fixedRects(card).map((rect) => rect.widthPx).find((w) => typeof w === "number" && w > 0);
        const available = (own ?? share) - pad * 2 - 4;
        for (const table of childrenOf(refOf2(card) ?? "")) {
          if (table.type !== "Table")
            continue;
          const columns = valueOf3(prop2(table, "columns"));
          if (!Array.isArray(columns))
            continue;
          const visible = columns.filter((c) => !!c && typeof c === "object" && c.columnVisibility !== false);
          const size = (c) => Number.isFinite(Number(c.columnSize)) ? Number(c.columnSize) : 120;
          const total = visible.reduce((sum, c) => sum + size(c), 0);
          if (!visible.length || total <= available)
            continue;
          if (available / visible.length < 80) {
            warnings.push(`Table "${table.name}" shows ${visible.length} columns (${total}px) in a card about ${available}px wide; show fewer columns there (the 3 or 4 this card is about), or give the card more of the row.`);
            continue;
          }
          const factor = available / total;
          setProp(table, "columns", columns.map((c) => visible.includes(c) ? {
            ...c,
            // A button column keeps room for its button's label.
            columnSize: Math.max(c.columnType === "button" ? 110 : 64, Math.floor(size(c) * factor))
          } : c));
          warnings.push(`Table "${table.name}" in a narrow card: its columns (${total}px) now fit the card's ${available}px.`);
        }
      }
    }
    for (const child of children) {
      if (child.type !== "ShadHeading")
        continue;
      const needed = headingLineWidth(child);
      if (!needed)
        continue;
      const rects = fixedRects(child);
      if (!rects.length || rects.every((rect) => (rect.widthPx ?? 0) >= needed))
        continue;
      rects.forEach((rect) => {
        rect.widthPx = Math.max(rect.widthPx ?? 0, needed);
      });
      warnings.push(`Heading "${child.name}" in row "${label2}" was too narrow for one line of its text; its widthPx is now ${needed}.`);
    }
    if (children.some((child) => child.type === "ShadHeading") && children.some((child) => META_TYPES.has(child.type)) && children.every((child) => child.type === "ShadHeading" || META_TYPES.has(child.type)) && ["", "center", "flex-start"].includes(align)) {
      setProp(container, "alignItems", "last baseline");
      warnings.push(`Row "${label2}" pairs a heading with meta text; its alignItems is now "last baseline" so they share a baseline.`);
    }
    if (text2(prop2(container, "justifyContent")) === "space-between" && children.length >= 3) {
      const first = children[0];
      if (isTitle(first, childrenOf)) {
        const rects = [first.layout, first.layouts?.desktop].filter((rect) => !!rect && rect.fillWidth !== true);
        if (rects.length) {
          rects.forEach((rect) => {
            rect.fillWidth = true;
          });
          warnings.push(`Row "${label2}": the title now takes the free space, so the items after it sit together at the right of the header.`);
        }
      }
    }
    const authored = valueOf3(prop2(container, "childOrder"));
    const authoredOrder = Array.isArray(authored) ? authored.filter((entry) => typeof entry === "string") : null;
    const ordered = authoredOrder?.length ? [
      ...authoredOrder.map((name) => children.find((child) => refOf2(child) === name || child.name === name)).filter((child) => !!child),
      ...children.filter((child) => !authoredOrder.includes(refOf2(child) ?? "") && !authoredOrder.includes(child.name))
    ] : children;
    const titleIndex = ordered.findIndex((child) => isTitle(child, childrenOf));
    if (titleIndex <= 0)
      continue;
    const before = ordered.slice(0, titleIndex);
    const leadingActions = before.filter((child) => ACTION_TYPES.has(child.type));
    if (!leadingActions.length)
      continue;
    const next = [
      ...before.filter((child) => !ACTION_TYPES.has(child.type)),
      ...ordered.slice(titleIndex),
      ...leadingActions
    ];
    if (authoredOrder?.length) {
      setProp(container, "childOrder", next.map((child) => authoredOrder.includes(child.name) ? child.name : refOf2(child)));
    } else {
      const slots = components.map((component, index) => component && component.parentRef === ref && !component.slotName ? index : -1).filter((index) => index >= 0);
      slots.forEach((slot, i) => {
        components[slot] = next[i];
      });
    }
    warnings.push(`Row "${label2}": ${leadingActions.map((child) => `"${child.name}"`).join(", ")} came before the title; moved after it so the page action sits at the right of the header.`);
  }
  const firstOf = (parent) => {
    const inner = childrenOf(refOf2(parent) ?? "");
    const authored = valueOf3(prop2(parent, "childOrder"));
    const first = Array.isArray(authored) && typeof authored[0] === "string" ? inner.find((c) => refOf2(c) === authored[0] || c.name === authored[0] || c.id === authored[0]) : void 0;
    return first ?? inner[0];
  };
  for (const card of components) {
    if (!card || !isSurface(card))
      continue;
    const title = text2(prop2(card, "cardTitle"));
    if (!title)
      continue;
    let node = firstOf(card);
    for (let depth = 0; node && node.type === "FlexContainer" && !isSurface(node) && depth < 2; depth++)
      node = firstOf(node);
    if (node?.type !== "ShadHeading")
      continue;
    warnings.push(`Card "${card.name}" is already titled "${title}" and opens with heading "${text2(prop2(node, "text"))}": two section titles stacked read as a card in a card. Keep one: drop the heading (and its caption) or clear cardTitle and cardExtra.`);
  }
  const dialogRefs = new Set(components.filter((c) => c && (c.type === "ShadDialog" || c.type === "ModalV2")).map((c) => refOf2(c)).filter(Boolean));
  for (const heading of components) {
    if (!heading || heading.type !== "ShadHeading" || heading.slotName !== "header" || !dialogRefs.has(heading.parentRef))
      continue;
    const level = text2(prop2(heading, "level")) || "h2";
    if (level !== "h1" && level !== "h2")
      continue;
    setProp(heading, "level", "h3");
    warnings.push(`Heading "${heading.name}" in a dialog header was ${level}; it is now h3, so a long title fits the header.`);
  }
  const DIALOGS = /* @__PURE__ */ new Set(["ShadDialog", "ModalV2"]);
  for (const dialog of [...components]) {
    if (!dialog || !DIALOGS.has(dialog.type))
      continue;
    const ref = refOf2(dialog);
    if (!ref)
      continue;
    const bare = components.filter((c) => c && c.parentRef === ref && c.slotName === "footer" && c.type === "ShadButton");
    if (bare.length < 2 || components.some((c) => c && c.parentRef === ref && c.slotName === "footer" && c.type !== "ShadButton"))
      continue;
    const rowRef = `${ref}FooterRow`;
    if (components.some((c) => c && refOf2(c) === rowRef))
      continue;
    const leftOf = (c) => Number(c.layout?.left ?? c.layouts?.desktop?.left ?? 0);
    const ordered = [...bare].sort((a, b) => leftOf(a) - leftOf(b));
    const top = Math.min(...bare.map((c) => Number(c.layout?.top ?? c.layouts?.desktop?.top ?? 0)));
    const row = {
      name: rowRef,
      type: "FlexContainer",
      clientRef: rowRef,
      parentRef: ref,
      slotName: "footer",
      properties: {
        direction: { value: "row" },
        justifyContent: { value: "flex-end" },
        alignItems: { value: "center" },
        gap: { value: 8 },
        padding: { value: 0 },
        dynamicHeight: { value: "{{true}}" }
      },
      layout: { top: Number.isFinite(top) ? top : 0, left: 0, width: 43, height: 48 }
    };
    for (const button of ordered) {
      button.parentRef = rowRef;
      delete button.slotName;
      const label2 = text2(prop2(button, "text"));
      const width = Math.max(80, Math.ceil(label2.length * 8 + (text2(prop2(button, "icon")) ? 64 : 40)));
      [button.layout, button.layouts?.desktop].forEach((rect) => {
        if (!rect)
          return;
        rect.fillWidth = false;
        rect.widthPx = rect.widthPx ?? width;
      });
    }
    const firstIndex = Math.min(...ordered.map((c) => components.indexOf(c)));
    const rest = components.filter((c) => !ordered.includes(c));
    rest.splice(Math.min(firstIndex, rest.length), 0, row, ...ordered);
    components.splice(0, components.length, ...rest);
    warnings.push(`Dialog "${dialog.name}": its ${ordered.length} footer buttons were placed by hand with uneven gaps; they now sit in one row "${rowRef}" at the right, in their order (${ordered.map((c) => `"${c.name}"`).join(", ")}).`);
  }
  const packNotes = fitPackHeights(components);
  const fittedBoxes = fitFlexHeights(components, warnings);
  reportPackHeights(packNotes, warnings);
  {
    const gridCards = components.filter((c) => c && !c.parentRef && !c.parent && (isSurface(c) || c.type === "ShadStat") && !fittedBoxes.has(c) && Number.isFinite(heightOf2(c)));
    const lines = /* @__PURE__ */ new Map();
    for (const c of gridCards) {
      const top = Number(c.layout?.top ?? c.layouts?.desktop?.top);
      if (!Number.isFinite(top))
        continue;
      const key2 = [...lines.keys()].find((t) => Math.abs(t - top) <= 10) ?? top;
      lines.set(key2, [...lines.get(key2) ?? [], c]);
    }
    for (const line of lines.values()) {
      if (line.length < 2)
        continue;
      const tallest = Math.max(...line.map(heightOf2));
      if (line.every((c) => heightOf2(c) === tallest))
        continue;
      for (const c of line) {
        [c.layout, c.layouts?.desktop].forEach((rect) => {
          if (rect && typeof rect.height === "number")
            rect.height = tallest;
        });
      }
      warnings.push(`Cards ${line.map((c) => `"${c.name}"`).join(", ")} sit side by side; they now share one height (${tallest}px).`);
    }
  }
  const flexRefs = new Set(components.filter((c) => c?.type === "FlexContainer").map((c) => refOf2(c)));
  const rectOf = (c) => c.layouts?.desktop ?? c.layout;
  const placeOf = (c) => String(c.parentRef ?? c.parent ?? "") + "|" + String(c.slotName ?? "");
  const labelled = components.filter((c) => {
    const label2 = props(c).label?.value;
    return c && LABELLED_FIELD_TYPES.has(c.type) && typeof label2 === "string" && label2.trim() !== "" && rectOf(c) && !flexRefs.has(String(c.parentRef ?? ""));
  });
  for (const button of components) {
    if (!button || button.type !== "ShadButton" || flexRefs.has(String(button.parentRef ?? "")))
      continue;
    const b = rectOf(button);
    if (!b || typeof b.top !== "number" || (b.height ?? 0) > 44)
      continue;
    const field = labelled.find((f) => {
      const r = rectOf(f);
      if (placeOf(f) !== placeOf(button) || typeof r.top !== "number")
        return false;
      const sameRow = b.top >= r.top - 4 && b.top < r.top + 18;
      const apart = (b.left ?? 0) >= (r.left ?? 0) + (r.width ?? 0) || (r.left ?? 0) >= (b.left ?? 0) + (b.width ?? 0);
      return sameRow && apart;
    });
    if (!field)
      continue;
    const top = rectOf(field).top + 22;
    b.top = top;
    b.height = 40;
    warnings.push(`Button "${button.name}" sat at the top of a row of labelled fields; it now sits at ${top} (40px tall) so it lines up with the field boxes, not the labels.`);
  }
  const accents = unifyChartAccents(components);
  const tables = packTableLook(accents.components);
  return { components: tables.components, warnings: [...warnings, ...accents.warnings, ...tables.warnings] };
}
var PAGE_ARCHETYPES = ["catalog", "personal-overview", "register", "queue-board", "other"];
var MAIN_SURFACE = {
  catalog: { types: /* @__PURE__ */ new Set(["ShadCardGrid"]), label: "a photo card grid (ShadCardGrid)" },
  "personal-overview": {
    types: /* @__PURE__ */ new Set(["ShadSummaryStrip", "ShadStat", "ShadProgress", "ShadCircularProgress"]),
    label: "the period figures (ShadSummaryStrip, then progress tiles)"
  },
  register: { types: /* @__PURE__ */ new Set(["Table", "ShadTable"]), label: 'the records table (Table with tableLook "shadcn")' },
  "queue-board": {
    types: /* @__PURE__ */ new Set(["ShadRecordList", "Table", "ShadTable", "ShadKanban", "ShadCardGrid"]),
    label: "the work itself (a needs-attention ShadRecordList, the queue table or a ShadKanban)"
  }
};
var FILTER_TYPES = /* @__PURE__ */ new Set(["ShadInput", "ShadToggleGroup", "ShadSelect", "ShadTabs", "ShadCombobox", "ShadMultiselect"]);
var DIALOG_TYPES2 = /* @__PURE__ */ new Set(["ShadDialog", "Modal", "ModalV2"]);
var SHORT_LIST_MAX = 36;
var isChart = (type) => /^Shad\w*Chart$/.test(type ?? "");
var valueOf4 = (bag, key2) => {
  const entry = bag?.[key2];
  return entry && typeof entry === "object" && !Array.isArray(entry) && "value" in entry ? entry.value : entry;
};
var textOf = (bag, key2) => {
  const v = valueOf4(bag, key2);
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
};
var refOf3 = (c) => c.clientRef ?? c.name ?? "";
var label = (c) => `"${c.name ?? c.clientRef ?? c.type}"`;
function readingOrder(components) {
  const refs = new Set(components.map(refOf3).filter(Boolean));
  const parentOf = (c) => {
    const p = c.parentRef ?? c.parent;
    return p && refs.has(p) ? p : void 0;
  };
  const children = /* @__PURE__ */ new Map();
  for (const c of components) {
    const p = parentOf(c);
    if (p)
      children.set(p, [...children.get(p) ?? [], c]);
  }
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  const visit = (c) => {
    if (seen.has(c) || DIALOG_TYPES2.has(c.type ?? ""))
      return;
    seen.add(c);
    out.push(c);
    for (const child of children.get(refOf3(c)) ?? [])
      visit(child);
  };
  for (const c of components)
    if (!parentOf(c))
      visit(c);
  return out;
}
function chartColourWarnings(chart) {
  const series = valueOf4(chart.properties, "yFields");
  const parts = chart.type === "ShadPieChart" || chart.type === "ShadFunnelChart" ? "slice" : Array.isArray(series) && series.length > 1 ? "series" : null;
  if (!parts)
    return [];
  const colors = valueOf4(chart.properties, "colors");
  const literal2 = Array.isArray(colors) ? colors : null;
  const bound = typeof colors === "string" && colors.includes("{{") && !/^\{\{\s*\[\s*\]\s*\}\}$/.test(colors.trim());
  if (bound)
    return [];
  if (!literal2 || literal2.length === 0) {
    return [
      `Chart ${label(chart)} draws each ${parts} in the default palette: set colors to explicit, distinct hues that sit with the theme (one family, clearly different lightness or hue per ` + parts + "), so no pair clashes and no slice disappears."
    ];
  }
  const norm = literal2.map((c) => String(c).trim().toLowerCase());
  if (new Set(norm).size < norm.length) {
    return [`Chart ${label(chart)} repeats a colour in colors (${literal2.join(", ")}): give each ${parts} its own hue.`];
  }
  return [];
}
function headerActionWarnings(order, components) {
  const first = order.find((c) => c.type === "ShadHero" || c.type === "ShadHeading");
  if (!first)
    return [];
  if (first.type === "ShadHero") {
    const primary = textOf(first.properties, "actionLabel");
    const secondary = textOf(first.properties, "secondaryActionLabel");
    return primary && secondary ? [`Header ${label(first)} offers two actions ("${primary}", "${secondary}"): keep the one the page is for; move the other into the page (a card's action, a filter or the nav).`] : [];
  }
  const byRef = new Map(components.map((c) => [refOf3(c), c]));
  let row;
  let at = first;
  for (let i = 0; i < 2 && at; i++) {
    at = byRef.get(at.parentRef ?? at.parent ?? "");
    if (at?.type === "FlexContainer" && textOf(at.properties, "direction") === "row") {
      row = at;
      break;
    }
  }
  if (!row)
    return [];
  const inRow = /* @__PURE__ */ new Set([refOf3(row)]);
  const buttons = [];
  for (const c of order) {
    const p = c.parentRef ?? c.parent ?? "";
    if (!inRow.has(p))
      continue;
    inRow.add(refOf3(c));
    if (c.type === "ShadButton")
      buttons.push(c);
  }
  return buttons.length > 1 ? [`Header row ${label(row)} holds ${buttons.length} buttons (${buttons.map(label).join(", ")}): keep one primary action in the header; the rest belong in the page or the nav.`] : [];
}
function lintPageArchetype(archetype, components) {
  const kind = (archetype ?? "").trim();
  if (!kind)
    return [];
  if (!PAGE_ARCHETYPES.includes(kind)) {
    return [`Archetype "${kind}" is not one of ${PAGE_ARCHETYPES.join(", ")}; use "other" for a page that is none of them.`];
  }
  if (kind === "other")
    return [];
  const prefix = `Archetype "${kind}": `;
  const order = readingOrder(components);
  const warnings = [];
  const main = MAIN_SURFACE[kind];
  const mainAt = order.findIndex((c) => main.types.has(c.type ?? ""));
  const chartAt = order.findIndex((c) => isChart(c.type));
  if (mainAt < 0) {
    warnings.push(`the page is built around ${main.label}, and this plan has none.`);
  } else if (chartAt >= 0 && chartAt < mainAt) {
    warnings.push(`chart ${label(order[chartAt])} comes before ${label(order[mainAt])}: the main surface opens the page; a chart, if it earns a place, sits beside or below it, never as the first thing under the header.`);
  }
  const has = (type) => order.some((c) => c.type === type);
  const filterBefore = (index) => order.slice(0, Math.max(index, 0)).some((c) => FILTER_TYPES.has(c.type ?? ""));
  const hasDialog = components.some((c) => DIALOG_TYPES2.has(c.type ?? ""));
  if (kind === "catalog" && mainAt >= 0) {
    const grid = order[mainAt];
    if (!filterBefore(mainAt))
      warnings.push(`no search or filter bar above ${label(grid)}: put a search input and a course/kind toggle in a row between the hero and the grid.`);
    if (!hasDialog)
      warnings.push('no detail sheet: a card click opens a ShadDialog (variant "sheet") with the full record.');
  }
  if (kind === "register" && mainAt >= 0) {
    if (!filterBefore(mainAt))
      warnings.push(`no filter row above ${label(order[mainAt])}: a register is read through a period or status toggle and a select.`);
    if (!hasDialog)
      warnings.push('no detail sheet: a row click opens a ShadDialog (variant "sheet") with the record and its actions.');
  }
  if (kind === "personal-overview") {
    if (!has("ShadSummaryStrip"))
      warnings.push("no ShadSummaryStrip under the hero: the period's four key figures go in one strip.");
    const progress = order.some((c) => c.type === "ShadProgress" || c.type === "ShadCircularProgress" || c.type === "ShadStat" && valueOf4(c.properties, "progress") !== void 0);
    if (!progress)
      warnings.push("no progress grid: show each goal or budget as a ShadStat with progress (or ShadProgress) against its limit.");
  }
  if (kind === "queue-board" && !has("ShadSummaryStrip")) {
    warnings.push("no ShadSummaryStrip: a queue opens with its counts (open, overdue, unassigned, done this week) in one strip.");
  }
  for (const chart of order.filter((c) => isChart(c.type)))
    warnings.push(...chartColourWarnings(chart));
  warnings.push(...headerActionWarnings(order, components));
  if (order.length > SHORT_LIST_MAX) {
    warnings.push(`${order.length} components outside dialogs: a ${kind} page reads best with a short list (the blueprint has about 10 to 20); merge repeated tiles into one bound component and drop sections the page does not need.`);
  }
  return warnings.map((w) => prefix + w);
}
var AUTO_MATERIALIZE_DEFAULTS = /* @__PURE__ */ new Set(["Kanban"]);
var TOOLJET_DESKTOP_GRID_COLUMNS = 43;
function wrappedValues(keys, defaults) {
  if (!keys?.length)
    return void 0;
  return Object.fromEntries(keys.map((key2) => [key2, { value: defaults[key2] ?? "" }]));
}
function childLayout(child, parentType, index) {
  const schema = getComponentSchema(child.componentName);
  if (parentType === "Kanban" && child.componentName === "Text") {
    return { top: index === 0 ? 12 : 44, left: 2, width: 39, height: child.layout?.height ?? 30 };
  }
  return {
    top: child.layout?.top ?? 0,
    left: child.layout?.left ?? 0,
    width: child.layout?.width ?? (schema?.defaultSize?.width ?? 1) * 100 / TOOLJET_DESKTOP_GRID_COLUMNS,
    height: child.layout?.height ?? schema?.defaultSize?.height ?? 40
  };
}
function childName(parentName, child, index) {
  const cardField = Object.values(child.defaultValue ?? {}).find((value) => typeof value === "string")?.match(/cardData\.([A-Za-z0-9_]+)/)?.[1];
  const baseRole = cardField ?? child.accessorKey ?? child.componentName;
  const role = baseRole.charAt(0).toUpperCase() + baseRole.slice(1) + (cardField ? "" : index + 1);
  return `${parentName}Card${role}`;
}
function materializeRequiredDefaultChildren(input) {
  const explicitParentRefs = new Set(input.flatMap((component) => component.parentRef && (!component.slotName || component.slotName === "body") ? [component.parentRef] : []));
  const components = [];
  const warnings = [];
  let materializedChildren = 0;
  input.forEach((original) => {
    if (!AUTO_MATERIALIZE_DEFAULTS.has(original.type)) {
      components.push(original);
      return;
    }
    const schema = getComponentSchema(original.type);
    const defaults = schema?.defaultChildren ?? [];
    if (!defaults.length || explicitParentRefs.has(componentRef(original))) {
      components.push(original);
      return;
    }
    const clientRef = componentRef(original);
    components.push(original);
    defaults.forEach((child, childIndex) => {
      const defaultValue = child.defaultValue ?? {};
      components.push({
        name: childName(original.name, child, childIndex),
        type: child.componentName,
        properties: wrappedValues(child.properties, defaultValue) ?? {},
        styles: wrappedValues(child.styles, defaultValue),
        layout: childLayout(child, original.type, childIndex),
        parentRef: clientRef
      });
    });
    materializedChildren += defaults.length;
    warnings.push(`Kanban "${original.name}" had no explicit card children; materialized ${defaults.length} catalog default children so cards render content. For wrapped multi-line card text, use add_components with a Kanban client_ref and an explicit Html child using the matching parent_ref.`);
  });
  return { components, warnings, materializedChildren };
}
function matchPlannedPage(pages, name, plannedNames, claimed = /* @__PURE__ */ new Set()) {
  const byName = pages.find((page) => page.name === name && !claimed.has(page.id));
  if (byName || name !== "Home" || pages.some((page) => page.name === "Home"))
    return byName;
  return pages.find((page) => page.handle === "home" && !claimed.has(page.id) && !plannedNames.has(page.name ?? ""));
}
var member = (n) => n && ["MemberExpression", "OptionalMemberExpression"].includes(n.type);
var key = (n) => n.computed ? n.property?.type === "StringLiteral" ? n.property.value : void 0 : n.property?.name;
var unwrap = (v) => v && typeof v === "object" && "value" in v ? v.value : v;
function inputRefs(value) {
  const refs = /* @__PURE__ */ new Set();
  const scan = (v) => {
    if (Array.isArray(v)) {
      v.forEach(scan);
      return;
    }
    if (v && typeof v === "object") {
      Object.values(v).forEach(scan);
      return;
    }
    if (typeof v !== "string")
      return;
    const binding = v.trim().match(/^\{\{([\s\S]*)\}\}$/);
    if (!binding)
      return;
    let root;
    try {
      root = parseExpression(binding[1]);
    } catch {
      return;
    }
    const found = /* @__PURE__ */ new Set();
    let uncertain = false;
    const visit = (n) => {
      if (!n || typeof n !== "object")
        return;
      if (Array.isArray(n)) {
        n.forEach(visit);
        return;
      }
      if (n.params || n.type === "VariableDeclarator" || n.type === "WithStatement")
        uncertain = true;
      if (member(n) && ["value", "selectedDate", "isValid"].includes(key(n)) && member(n.object)) {
        const owner = n.object;
        if (owner.object?.type === "Identifier" && owner.object.name === "components" && key(owner))
          found.add(key(owner));
      }
      Object.values(n).forEach(visit);
    };
    visit(root);
    if (!uncertain)
      found.forEach((name) => refs.add(name));
  };
  scan(value);
  return refs;
}
function truthyOnlyRequiredText(value, disabled) {
  const raw = unwrap(value);
  if (typeof raw !== "string")
    return /* @__PURE__ */ new Set();
  const binding = raw.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!binding)
    return /* @__PURE__ */ new Set();
  let root;
  try {
    root = parseExpression(binding[1]);
  } catch {
    return /* @__PURE__ */ new Set();
  }
  const refs = /* @__PURE__ */ new Set();
  const rooted = (n, name) => member(n) && n.object?.type === "Identifier" && n.object.name === name && key(n);
  const visit = (n) => {
    if (n.type === "LogicalExpression" && n.operator === (disabled ? "||" : "&&"))
      return visit(n.left) && visit(n.right);
    if (disabled && n.type === "UnaryExpression" && n.operator === "!") {
      const v2 = n.argument;
      if (member(v2) && key(v2) === "value" && rooted(v2.object, "components")) {
        refs.add(key(v2.object));
        return true;
      }
    }
    if (!disabled && member(n) && key(n) === "value" && rooted(n.object, "components")) {
      refs.add(key(n.object));
      return true;
    }
    const v = n.type === "UnaryExpression" && n.operator === "!" ? n.argument : n;
    return Boolean(member(v) && key(v) === "isLoading" && rooted(v.object, "queries"));
  };
  return visit(root) ? refs : /* @__PURE__ */ new Set();
}
function requiredMutationGuardWarnings(source, query, action, components) {
  const inputs = inputRefs(query.options);
  const guarded = inputRefs([source.properties?.disabledState, action.runOnlyIf]);
  const missing = components.filter((c) => c.name && inputs.has(c.name) && !guarded.has(c.name) && ["TextInput", "TextArea", "NumberInput", "CurrencyInput", "DatePickerV2"].includes(c.type ?? "") && [true, "true", "{{true}}"].includes(unwrap(c.validation?.mandatory)));
  const warnings = missing.length ? [`Button "${source.name ?? source.id}" directly runs mutation "${query.name ?? query.id}" using required inputs ${missing.map((c) => `"${c.name}"`).join(", ")}, but no field validation is visible in disabledState or runOnlyIf. A required marker alone does not stop this query. Validate before writing (including whitespace-only text), or route through a validating Form/RunJS success chain. Preserve zero and false; keep database constraints authoritative. This advisory does not prove arbitrary guards or server validation.`] : [];
  const disabledRefs = inputRefs(source.properties?.disabledState), actionRefs = inputRefs(action.runOnlyIf);
  const disabledTruthy = truthyOnlyRequiredText(source.properties?.disabledState, true);
  const actionTruthy = truthyOnlyRequiredText(action.runOnlyIf, false);
  const weak = components.filter((c) => c.name && inputs.has(c.name) && ["TextInput", "TextArea"].includes(c.type ?? "") && (disabledTruthy.has(c.name) || actionTruthy.has(c.name)) && (!disabledRefs.has(c.name) || disabledTruthy.has(c.name)) && (!actionRefs.has(c.name) || actionTruthy.has(c.name)));
  if (weak.length)
    warnings.push(`Button "${source.name ?? source.id}" checks text ${weak.map((c) => `"${c.name}"`).join(", ")} using only truthiness. Whitespace-only text can pass this guard. If blank text is invalid, trim before checking length (and validate before writing); do not apply truthiness validation to numbers or booleans.`);
  return warnings;
}
function unconditional(action) {
  if (action.disabled)
    return false;
  const guard = action.runOnlyIf;
  return !guard || guard === true || typeof guard === "string" && /^(?:true|\{\{\s*true\s*\}\})$/.test(guard.trim());
}
function queryEventCycleErrors(summary, additions, persisted) {
  const names = new Map(summary.queries.map((q) => [q.id, q.name ?? q.id]));
  const resolve = (value) => {
    if (typeof value !== "string")
      return void 0;
    if (names.has(value))
      return value;
    const matches = summary.queries.filter((q) => q.name === value);
    return matches.length === 1 ? matches[0].id : void 0;
  };
  const edge = (event) => {
    if (event.sourceType !== "data_query" || !names.has(event.sourceId) || event.action.actionId !== "run-query" || !unconditional(event.action))
      return void 0;
    const target = resolve(event.action.queryId);
    return target ? [event.sourceId, target] : void 0;
  };
  const graph = /* @__PURE__ */ new Map();
  for (const event of [...persisted, ...additions]) {
    if (event.trigger !== "onDataQuerySuccess")
      continue;
    const pair = edge(event);
    if (!pair)
      continue;
    const targets = graph.get(pair[0]) ?? /* @__PURE__ */ new Set();
    targets.add(pair[1]);
    graph.set(pair[0], targets);
  }
  const reaches = (start, end) => {
    const queue = [start], visited = /* @__PURE__ */ new Set();
    while (queue.length) {
      const current = queue.pop();
      if (current === end)
        return true;
      if (visited.has(current))
        continue;
      visited.add(current);
      for (const next of graph.get(current) ?? [])
        queue.push(next);
    }
    return false;
  };
  const errors = [];
  for (const event of additions) {
    const pair = edge(event);
    if (!pair)
      continue;
    const [source, target] = pair;
    const successCycle = event.trigger === "onDataQuerySuccess" && reaches(target, source);
    const failureSelfRetry = event.trigger === "onDataQueryFailure" && source === target;
    if (successCycle || failureSelfRetry)
      errors.push(`Query "${names.get(source)}" -> "${names.get(target)}" creates an unconditional query ${failureSelfRetry ? "failure retry" : "success cycle"}. This can repeat queries and writes after one click. Refresh a separate read query with no return edge, or use an explicit bounded retry/termination guard.`);
  }
  return [...new Set(errors)];
}
var ACTION_IDS = /* @__PURE__ */ new Set([
  "run-query",
  "switch-page",
  "show-alert",
  "show-modal",
  "close-modal",
  "set-custom-variable",
  "unset-custom-variable",
  "set-page-variable",
  "set-table-page",
  "copy-to-clipboard",
  "generate-file",
  "open-webpage",
  "go-to-app",
  "logout",
  "control-component",
  "set-localstorage-value",
  "scroll-component-into-view"
]);
function propVal(properties, key2) {
  const value = properties?.[key2];
  return value && typeof value === "object" && "value" in value ? value.value : value;
}
function isFalseBinding(value) {
  return value === false || value === "false" || value === "{{false}}";
}
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function navigationItemRef(source, ref) {
  let unknown = false;
  let found = false;
  let group = false;
  const visit = (items) => {
    if (typeof items === "string" && items.includes("{{")) {
      unknown = true;
      return;
    }
    if (!Array.isArray(items)) {
      if (items == null)
        unknown = true;
      return;
    }
    for (const item of items) {
      if (!isRecord(item))
        continue;
      if (item.id === ref) {
        if (item.isGroup)
          group = true;
        else
          found = true;
      }
      if (typeof item.id === "string" && item.id.includes("{{"))
        unknown = true;
      if (item.isGroup)
        visit(item.children ?? []);
    }
  };
  visit(propVal(source.properties, "menuItems"));
  return group ? "invalid" : found ? "valid" : unknown ? "unknown" : "invalid";
}
function effectiveRef(event) {
  return Object.prototype.hasOwnProperty.call(event.action, "ref") ? event.action.ref : event.ref;
}
function validateTableColumnRef(source, ref) {
  if (!ref)
    return 'Table Button-column events require ref "<column key or name>::<button id>".';
  const separator = ref.lastIndexOf("::");
  if (separator <= 0 || separator === ref.length - 2)
    return `Table Button-column ref "${ref}" is malformed.`;
  const columnRef = ref.slice(0, separator);
  const buttonId = ref.slice(separator + 2);
  const columns = propVal(source.properties, "columns");
  if (!Array.isArray(columns))
    return `Table "${source.name ?? source.id}" has no explicit columns array for ref "${ref}".`;
  const column = columns.find((candidate) => {
    const item = candidate;
    return item?.key === columnRef || item?.name === columnRef;
  });
  if (!column || column.columnType !== "button") {
    return `Table "${source.name ?? source.id}" has no Button column keyed/named "${columnRef}".`;
  }
  if (!Array.isArray(column.buttons) || !column.buttons.some((button) => button?.id === buttonId)) {
    return `Table Button column "${columnRef}" has no button id "${buttonId}".`;
  }
  return void 0;
}
var MUTATION_OPERATIONS = /* @__PURE__ */ new Set([
  "create_row",
  "update_row",
  "update_rows",
  "upsert_rows",
  "delete_row",
  "delete_rows",
  "bulk_insert",
  "bulk_update_pkey",
  "bulk_upsert_pkey",
  "bulk_update_with_primary_key",
  "bulk_upsert_with_primary_key"
]);
function isMutationQuery(query) {
  const options = query.options ?? {};
  const operation = typeof options.operation === "string" ? options.operation.toLowerCase() : void 0;
  if (operation && MUTATION_OPERATIONS.has(operation))
    return true;
  const sqlExecution = options.sql_execution;
  const sql = typeof options.query === "string" ? options.query : typeof options.sql === "string" ? options.sql : typeof sqlExecution?.sqlQuery === "string" ? sqlExecution.sqlQuery : void 0;
  return typeof sql === "string" && /^\s*(insert|update|delete|merge|upsert|replace)\b/i.test(sql);
}
function validateEvents(summary, events, options = {}) {
  const errors = [];
  const warnings = [];
  const components = new Map(summary.pages.flatMap((page) => page.components).map((component) => [component.id, component]));
  const queries = new Set(summary.queries.map((query) => query.id));
  const queryById = new Map(summary.queries.map((query) => [query.id, query]));
  const pages = new Set(summary.pages.map((page) => page.id));
  const pageOfComponent = new Map(summary.pages.flatMap((page) => page.components.map((c) => [c.id, page.id])));
  const pageName = new Map(summary.pages.map((page) => [page.id, page.name ?? page.handle ?? page.id]));
  const queryTriggerPages = /* @__PURE__ */ new Map();
  const noteTrigger = (queryId, pageId) => {
    if (!queryId)
      return;
    const set = queryTriggerPages.get(queryId) ?? /* @__PURE__ */ new Set();
    set.add(pageId ?? "*");
    queryTriggerPages.set(queryId, set);
  };
  for (const query of summary.queries) {
    const opts = query.options && typeof query.options === "object" ? query.options : {};
    const onLoad = opts.runOnPageLoad;
    const raw = onLoad && typeof onLoad === "object" ? onLoad.value : onLoad;
    if (raw === true || String(raw ?? "").replace(/[{}\s]/g, "").toLowerCase() === "true")
      noteTrigger(query.id, void 0);
  }
  for (const persisted of summary.events ?? []) {
    const payload = persisted.event && typeof persisted.event === "object" ? persisted.event : void 0;
    if (!payload || payload.actionId !== "run-query")
      continue;
    const queryId = String(payload.queryId ?? "");
    if (persisted.target === "page")
      noteTrigger(queryId, persisted.sourceId);
    else if (persisted.target === "component" && persisted.sourceId)
      noteTrigger(queryId, pageOfComponent.get(persisted.sourceId));
  }
  for (const event of events) {
    if (event.action?.actionId !== "run-query")
      continue;
    const queryId = String(event.action.queryId ?? "");
    if (event.sourceType === "page")
      noteTrigger(queryId, event.sourceId);
    else if (event.sourceType === "component" || event.sourceType === "table_column")
      noteTrigger(queryId, pageOfComponent.get(event.sourceId));
  }
  const pageScopedTarget = (action) => {
    const id = action.actionId;
    if (id === "set-table-page")
      return typeof action.table === "string" ? action.table : void 0;
    if (id === "control-component" || id === "scroll-component-into-view")
      return typeof action.componentId === "string" ? action.componentId : void 0;
    if (id === "show-modal" || id === "close-modal")
      return typeof action.modal === "string" ? action.modal : void 0;
    return void 0;
  };
  events.forEach((event, index) => {
    const label2 = event.name ? `Event "${event.name}"` : `Event[${index}]`;
    errors.push(...lintComponentStateBindings(event.action, [...components.values()], label2));
    if (event.sourceType === "component") {
      const source = components.get(event.sourceId);
      for (const ref of new Set([event.ref, event.action.ref].filter((ref2) => ref2 != null && ref2 !== ""))) {
        if (source?.type !== "Navigation" || event.trigger !== "onClick") {
          (options.savedRefs?.has(event) ? warnings : errors).push(`${label2}: ordinary component events cannot use ref; use name to label the handler. Only Navigation onClick item refs and Table Button-column refs have component sub-element scopes.`);
        } else if (!nonEmptyString(ref) || ref.includes("{{")) {
          errors.push(`${label2}: Navigation onClick ref must be a literal non-empty item id.`);
        } else {
          const membership = navigationItemRef(source, ref);
          if (membership === "invalid")
            errors.push(`${label2}: Navigation ref "${ref}" does not identify a non-group menu item.`);
          if (membership === "unknown")
            warnings.push(`${label2}: Navigation ref "${ref}" membership cannot be verified because menuItems are unresolved/dynamic. Verify the runtime item id; no item membership was inferred.`);
        }
      }
      if (!source)
        errors.push(`${label2}: component source "${event.sourceId}" does not exist.`);
      else if (source.type) {
        const schema = getComponentSchema(source.type);
        const validTriggers = schema?.events?.map((item) => item.id) ?? [];
        if (schema && !validTriggers.includes(event.trigger)) {
          const renamed = retiredUi2Name(source.type, "events", event.trigger);
          errors.push(renamed ? `${label2}: ${source.type} event "${event.trigger}" was renamed "${renamed}"; use trigger "${renamed}".` : `${label2}: trigger "${event.trigger}" is not valid for ${source.type}. Valid triggers: ${validTriggers.join(", ") || "none"}.`);
        }
        if (source.type === "Kanban" && event.trigger === "onCardSelected" && isFalseBinding(propVal(source.properties, "openModalOnCardClick"))) {
          errors.push(`${label2}: Kanban onCardSelected cannot fire while openModalOnCardClick is false; ToolJet returns before it sets lastSelectedCard or fires the event. Enable the native card modal AND populate it with children parented to the Kanban using slot_name:"modal", or remove this handler and use a separate supported detail flow.`);
        }
      }
    } else if (event.sourceType === "data_query") {
      if (!queries.has(event.sourceId))
        errors.push(`${label2}: query source "${event.sourceId}" does not exist.`);
      if (!["onDataQuerySuccess", "onDataQueryFailure"].includes(event.trigger)) {
        errors.push(`${label2}: query trigger must be onDataQuerySuccess or onDataQueryFailure, not "${event.trigger}".`);
      }
    } else if (event.sourceType === "page") {
      if (!pages.has(event.sourceId))
        errors.push(`${label2}: page source "${event.sourceId}" does not exist.`);
      if (event.trigger !== "onPageLoad")
        errors.push(`${label2}: page trigger must be onPageLoad, not "${event.trigger}".`);
    } else if (event.sourceType === "table_column") {
      const source = components.get(event.sourceId);
      if (!source)
        errors.push(`${label2}: Table source "${event.sourceId}" does not exist.`);
      else if (source.type !== "Table")
        errors.push(`${label2}: table_column source must be a Table, not ${source.type ?? "unknown"}.`);
      else {
        if (event.trigger !== "onClick")
          errors.push(`${label2}: Table Button-column trigger must be onClick.`);
        const refError = validateTableColumnRef(source, event.ref);
        if (refError)
          errors.push(`${label2}: ${refError}`);
      }
    } else if (event.sourceType === "table_action") {
      errors.push(`${label2}: deprecated table_action handlers are not authored reliably. Use a columnType:"button" column with source_type:"table_column".`);
    }
    const actionId = event.action.actionId;
    if (typeof actionId !== "string" || !ACTION_IDS.has(actionId)) {
      errors.push(`${label2}: unknown actionId "${String(actionId)}"; ToolJet silently ignores invalid action ids.`);
      return;
    }
    const targetId = pageScopedTarget(event.action);
    const targetPage = targetId ? pageOfComponent.get(targetId) : void 0;
    if (targetId && targetPage) {
      const targetLabel = `${components.get(targetId)?.type ?? "component"} "${components.get(targetId)?.name ?? targetId}" on page "${pageName.get(targetPage)}"`;
      const sourcePage = event.sourceType === "page" ? event.sourceId : event.sourceType === "component" || event.sourceType === "table_column" ? pageOfComponent.get(event.sourceId) : void 0;
      if (sourcePage && sourcePage !== targetPage) {
        errors.push(`${label2}: ${actionId} targets ${targetLabel} from page "${pageName.get(sourcePage)}". A page-scoped action only reaches components on the page that is open; on another page the target is not mounted and the action fails at runtime. Put this handler on page "${pageName.get(targetPage)}" (its onPageLoad, or a component there), or drop it: switch-page mounts that page fresh.`);
      } else if (event.sourceType === "data_query") {
        const triggerPages = queryTriggerPages.get(event.sourceId);
        const elsewhere = triggerPages ? [...triggerPages].filter((page) => page !== targetPage) : [];
        if (elsewhere.length) {
          const where = elsewhere.includes("*") ? "on every page load (runOnPageLoad)" : `from page "${elsewhere.map((p) => pageName.get(p) ?? p).join('", "')}"`;
          errors.push(`${label2}: ${actionId} targets ${targetLabel}, but query "${queryById.get(event.sourceId)?.name ?? event.sourceId}" runs ${where}, where that component is not mounted, so the success handler fails at runtime. Move the action to page "${pageName.get(targetPage)}" (its onPageLoad, or the filter's own event there), or run the query only from that page.`);
        }
      }
    }
    if (actionId === "run-query") {
      let queryId = event.action.queryId;
      if (typeof queryId === "string" && !queries.has(queryId)) {
        const resolution = resolveRef(summary.queries, queryId, "Query", "in this app");
        if (resolution.ok) {
          if (resolution.warning)
            warnings.push(`${label2}: ${resolution.warning}`);
          queryId = resolution.target.id;
          event.action.queryId = queryId;
        }
      }
      if (typeof queryId !== "string" || !queries.has(queryId)) {
        const available = summary.queries.map((q) => `${q.name ?? "(unnamed)"}=${q.id}`).join(", ");
        errors.push(`${label2}: no query with id or name "${String(queryId)}" in this app. Do not re-read \u2014 the app currently has: ${available || "(no queries)"}.`);
      } else if (event.sourceType === "component" && event.trigger === "onClick") {
        const source = components.get(event.sourceId);
        const query = queryById.get(queryId);
        if (source?.type === "Button" && query && isMutationQuery(query)) {
          warnings.push(...requiredMutationGuardWarnings(source, query, event.action, [...components.values()]));
          const disabled = propVal(source.properties, "disabledState");
          const guarded = typeof disabled === "string" && disabled.includes("{{") && /isloading/i.test(disabled);
          if (!guarded) {
            warnings.push(`Button "${source.name ?? source.id}" runs the mutation query "${query.name ?? queryId}" on click but its disabledState does not gate on the query's loading state, so it can be double-submitted. Set disabledState to {{queries.${query.name ?? queryId}.isLoading}}.`);
          }
        }
      }
    }
    if (actionId === "switch-page") {
      const pageId = event.action.pageId;
      if (typeof pageId !== "string" || !pages.has(pageId)) {
        errors.push(`${label2}: switch-page target "${String(pageId)}" does not exist.`);
      }
    }
    if (["show-modal", "close-modal"].includes(actionId)) {
      const modal = event.action.modal;
      const target = typeof modal === "string" ? components.get(modal) : void 0;
      if (!target) {
        errors.push(`${label2}: ${actionId} modal target "${String(modal)}" does not exist.`);
      } else if (target.type !== "Modal" && !isModalV2Type(target.type)) {
        errors.push(`${label2}: ${actionId} target must be a Modal, ModalV2 or ShadDialog, not ${target.type ?? "unknown"} "${target.name ?? target.id}".`);
      }
    }
    if (actionId === "control-component") {
      const componentId = event.action.componentId;
      const target = typeof componentId === "string" ? components.get(componentId) : void 0;
      if (!target) {
        errors.push(`${label2}: control-component target "${String(componentId)}" does not exist.`);
      } else {
        const handle = event.action.componentSpecificActionHandle;
        const schema = target.type ? getComponentSchema(target.type) : null;
        const componentAction = typeof handle === "string" ? schema?.actions?.find((candidate) => candidate.handle === handle) : void 0;
        if (!nonEmptyString(handle)) {
          errors.push(`${label2}: control-component requires componentSpecificActionHandle.`);
        } else if (!componentAction) {
          const renamed = retiredUi2Name(target.type, "actions", handle);
          errors.push(renamed ? `${label2}: ${target.type} action "${handle}" was renamed "${renamed}"; use componentSpecificActionHandle "${renamed}".` : `${label2}: control-component action "${handle}" is not valid for ${target.type ?? "unknown"} "${target.name ?? target.id}". Valid actions: ${schema?.actions?.map((candidate) => candidate.handle).join(", ") || "none"}.`);
        } else {
          const params = event.action.componentSpecificActionParams;
          if (params !== void 0 && !Array.isArray(params)) {
            errors.push(`${label2}: componentSpecificActionParams must be an array.`);
          } else if (Array.isArray(params)) {
            const supplied = new Set(params.flatMap((param) => isRecord(param) && nonEmptyString(param.handle) ? [param.handle] : []));
            if (params.some((param) => !isRecord(param) || !nonEmptyString(param.handle))) {
              errors.push(`${label2}: every componentSpecificActionParams entry requires a string handle.`);
            }
            const requiredHandles = (componentAction.params ?? []).flatMap((param) => nonEmptyString(param.handle) ? [param.handle] : []);
            const missing = requiredHandles.filter((required) => !supplied.has(required));
            if (missing.length) {
              errors.push(`${label2}: control-component action "${handle}" is missing parameter handles: ${missing.join(", ")}.`);
            }
          } else if ((componentAction.params?.length ?? 0) > 0) {
            errors.push(`${label2}: control-component action "${handle}" requires componentSpecificActionParams for ${componentAction.params.map((param) => String(param.handle)).join(", ")}.`);
          }
        }
      }
    }
    if (actionId === "scroll-component-into-view") {
      const componentId = event.action.componentId;
      if (typeof componentId !== "string" || !components.has(componentId)) {
        errors.push(`${label2}: scroll-component-into-view target "${String(componentId)}" does not exist.`);
      }
    }
    if (actionId === "show-alert") {
      if (!nonEmptyString(event.action.message))
        errors.push(`${label2}: show-alert requires a non-empty message.`);
      if (!["success", "info", "warning", "error"].includes(String(event.action.alertType))) {
        errors.push(`${label2}: show-alert alertType must be success, info, warning, or error.`);
      }
    }
    if (["set-custom-variable", "set-page-variable", "set-localstorage-value"].includes(actionId)) {
      if (!nonEmptyString(event.action.key))
        errors.push(`${label2}: ${actionId} requires a non-empty key.`);
      if (!Object.prototype.hasOwnProperty.call(event.action, "value"))
        errors.push(`${label2}: ${actionId} requires value.`);
    }
    if (actionId === "unset-custom-variable" && !nonEmptyString(event.action.key)) {
      errors.push(`${label2}: unset-custom-variable requires a non-empty key.`);
    }
    if (actionId === "open-webpage" && !nonEmptyString(event.action.url)) {
      errors.push(`${label2}: open-webpage requires a non-empty url.`);
    }
    if (actionId === "copy-to-clipboard" && !Object.prototype.hasOwnProperty.call(event.action, "contentToCopy")) {
      errors.push(`${label2}: copy-to-clipboard requires contentToCopy.`);
    }
    if (actionId === "set-table-page") {
      const tableId = event.action.table;
      const table = typeof tableId === "string" ? components.get(tableId) : void 0;
      if (!table) {
        errors.push(`${label2}: set-table-page Table target "${String(tableId)}" does not exist.`);
      } else if (table.type !== "Table") {
        errors.push(`${label2}: set-table-page target must be a Table, not ${table.type ?? "unknown"}.`);
      }
      const pageIndex = event.action.pageIndex;
      if (!["string", "number"].includes(typeof pageIndex) || String(pageIndex).trim() === "") {
        errors.push(`${label2}: set-table-page requires a numeric value or binding in pageIndex.`);
      }
    }
    if (actionId === "generate-file") {
      const format = ["fileType", "type", "format", "extension"].map((key2) => event.action[key2]).find((value) => typeof value === "string");
      if (format && /\bpdf\b/i.test(format)) {
        warnings.push(`${label2}: generate-file PDF is a pass-through and expects pre-formed PDF bytes; it does not convert text/HTML/data into a PDF. Use CSV/plaintext, or supply and browser-verify real PDF bytes.`);
      }
    }
  });
  const chainKey = (event) => [event.sourceType, event.sourceId, event.ref ?? "", event.trigger].join("\0");
  const touchedChains = new Set(events.map(chainKey));
  const chains = /* @__PURE__ */ new Map();
  for (const persisted of options.includePersistedChains === false ? [] : summary.events) {
    const raw = isRecord(persisted.event) ? persisted.event : void 0;
    const sourceType = persisted.target;
    const trigger = raw?.eventId;
    if (!raw || !persisted.sourceId || !sourceType || !nonEmptyString(trigger))
      continue;
    const event = {
      sourceId: persisted.sourceId,
      sourceType,
      ref: nonEmptyString(raw.ref) ? raw.ref : void 0,
      trigger,
      action: raw,
      name: persisted.name
    };
    const key2 = chainKey(event);
    if (!touchedChains.has(key2))
      continue;
    const chain = chains.get(key2) ?? [];
    chain.push({ event, index: persisted.index ?? 0, persisted: true });
    chains.set(key2, chain);
  }
  events.forEach((event, index) => {
    const key2 = chainKey(event);
    const chain = chains.get(key2) ?? [];
    const lastPersistedIndex = chain.reduce((maximum, item) => item.persisted ? Math.max(maximum, item.index) : maximum, -1);
    chain.push({ event, index: lastPersistedIndex + index + 1, persisted: false });
    chains.set(key2, chain);
  });
  for (const chain of chains.values()) {
    chain.sort((left, right) => left.index - right.index || Number(right.persisted) - Number(left.persisted));
    chain.forEach(({ event }, index) => {
      if (event.action.actionId !== "control-component" || !["selectOption", "selectOptions", "setText", "setValue"].includes(String(event.action.componentSpecificActionHandle)))
        return;
      let child = components.get(String(event.action.componentId));
      const visited = /* @__PURE__ */ new Set();
      while (child?.parent && !visited.has(child.id)) {
        visited.add(child.id);
        const parent = components.get(decodeComponentParent(child.parent).parentId);
        if (!parent)
          break;
        if (isModalV2Type(parent.type) && chain.slice(index + 1).some(({ event: later2 }) => later2.action.actionId === "show-modal" && later2.action.modal === parent.id)) {
          errors.push(`Event "${event.name ?? index}": prefill targets a child of ${parent.type} "${parent.name ?? parent.id}" before show-modal. Closed modal children are not mounted; these values can be lost. Bind input defaults to the selected record, or initialize after the modal opens.`);
          break;
        }
        child = parent;
      }
    });
    const navigationIndex = chain.findIndex(({ event }) => event.action.actionId === "switch-page");
    if (navigationIndex === -1 || navigationIndex === chain.length - 1)
      continue;
    const navigation = chain[navigationIndex];
    const afterNavigation = chain.slice(navigationIndex + 1);
    if (options.navigationMovedLast && navigation.persisted && afterNavigation.every((item) => !item.persisted && item.event.action.actionId !== "switch-page"))
      continue;
    const later = chain.slice(navigationIndex + 1).map(({ event }) => String(event.action.actionId)).join(", ");
    const label2 = navigation.event.name ? `${navigation.persisted ? "Persisted event" : "Event"} "${navigation.event.name}"` : `${navigation.persisted ? "Persisted event" : "Event"}[${navigation.index}]`;
    errors.push(`${label2}: switch-page must be the LAST handler for the same source and trigger; ToolJet does not run later handlers (${later}). Put state updates and run-query actions before navigation.`);
  }
  errors.push(...queryEventCycleErrors(summary, events, options.includePersistedChains === false ? [] : persistedEventSpecs(summary)));
  const persistedMode = options.includePersistedChains === false;
  const isNavigation = (sourceType, sourceId, trigger) => sourceType === "component" && components.get(sourceId)?.type === "Navigation" && trigger === "onClick";
  const runKey = (sourceType, sourceId, trigger, queryId) => JSON.stringify([sourceType, sourceId, trigger, queryId]);
  const runScope = (sourceType, sourceId, trigger, ref) => sourceType === "table_column" || isNavigation(sourceType, sourceId, trigger) ? ref || null : null;
  const overlaps = (left, right, navigation) => left === right || navigation && (left === null || right === null);
  const payloadKey = (payload) => JSON.stringify(Object.keys(payload).filter((k) => k !== "index" && k !== "name").sort().map((k) => [k, payload[k]]));
  const heldRuns = /* @__PURE__ */ new Map();
  if (!persistedMode) {
    for (const held of summary.events ?? []) {
      const payload = held.event && typeof held.event === "object" ? held.event : void 0;
      if (!payload || payload.actionId !== "run-query" || !held.sourceId)
        continue;
      if (held.target !== "component" && held.target !== "table_column")
        continue;
      const key2 = runKey(held.target, held.sourceId, payload.eventId, payload.queryId);
      const scope = runScope(held.target, held.sourceId, payload.eventId, payload.ref);
      heldRuns.set(key2, [...heldRuns.get(key2) ?? [], { id: held.id, payload: payloadKey(payload), scope }]);
    }
  }
  const plannedRuns = /* @__PURE__ */ new Map();
  for (const event of events) {
    if (event.action?.actionId !== "run-query")
      continue;
    if (event.sourceType !== "component" && event.sourceType !== "table_column")
      continue;
    const key2 = runKey(event.sourceType, event.sourceId, event.trigger, event.action.queryId);
    const scope = runScope(event.sourceType, event.sourceId, event.trigger, effectiveRef(event));
    const navigation = isNavigation(event.sourceType, event.sourceId, event.trigger);
    const sourceName = components.get(event.sourceId)?.name ?? event.sourceId;
    const queryName = queryById.get(String(event.action.queryId ?? ""))?.name ?? String(event.action.queryName ?? event.action.queryId);
    const mine = payloadKey({ eventId: event.trigger, ...event.ref ? { ref: event.ref } : {}, ...event.action });
    const held = (heldRuns.get(key2) ?? []).filter((h) => overlaps(h.scope, scope, navigation));
    if (held.length && !held.some((h) => h.payload === mine)) {
      errors.push(`"${sourceName}" ${event.trigger} already runs query "${queryName}" (event ${held[0].id}); a second handler would run it twice on one ${event.trigger}. Change that handler with update_events, or delete it with delete_event before adding this one.`);
    } else if ((plannedRuns.get(key2) ?? []).some((previous) => overlaps(previous, scope, navigation))) {
      (persistedMode ? warnings : errors).push(`"${sourceName}" ${event.trigger} runs query "${queryName}" twice: two handlers on it run the same query, so one ${event.trigger} runs it two times. Keep one.`);
    }
    plannedRuns.set(key2, [...plannedRuns.get(key2) ?? [], scope]);
  }
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}
var persistedEventIds = /* @__PURE__ */ new WeakMap();
function persistedEventSpecs(summary) {
  return summary.events.map((event, position) => ({ event, position })).sort((left, right) => (left.event.index ?? left.position) - (right.event.index ?? right.position)).flatMap(({ event }) => {
    if (!event.sourceId || !event.target || !event.event || typeof event.event !== "object")
      return [];
    const payload = event.event;
    if (typeof payload.eventId !== "string")
      return [];
    const { eventId, ref, ...action } = payload;
    if (event.target === "component" && ref != null && typeof ref !== "string")
      action.ref = ref;
    const spec = {
      sourceId: event.sourceId,
      sourceType: event.target,
      ...typeof ref === "string" ? { ref } : {},
      trigger: eventId,
      action,
      name: event.name
    };
    if (event.id)
      persistedEventIds.set(spec, event.id);
    return [spec];
  });
}
function navigationReorders(summary, touched, diagnostics) {
  const touchedKeys = touched ? new Set(touched.map((event) => [event.sourceType, event.sourceId, event.ref ?? "", event.trigger].join("\0"))) : void 0;
  const chains = /* @__PURE__ */ new Map();
  for (const saved of summary.events ?? []) {
    const raw = isRecord(saved.event) ? saved.event : void 0;
    if (!raw || !saved.sourceId || !nonEmptyString(raw.eventId))
      continue;
    const key2 = [saved.target, saved.sourceId, nonEmptyString(raw.ref) ? raw.ref : "", raw.eventId].join("\0");
    const chain = chains.get(key2) ?? [];
    chain.push({ id: saved.id, index: saved.index ?? 0, nav: raw.actionId === "switch-page" });
    chains.set(key2, chain);
  }
  const moves = [];
  for (const [key2, chain] of chains) {
    chain.sort((a, b) => a.index - b.index);
    const navs = chain.filter((item) => item.nav);
    if (!navs.length || chain.slice(-navs.length).every((item) => item.nav))
      continue;
    if (touchedKeys && !touchedKeys.has(key2)) {
      const [, sourceId, ref, trigger] = key2.split("\0");
      diagnostics?.push(`The saved ${trigger} chain of "${sourceId}"${ref ? ` (${ref})` : ""} has a page switch before other handlers, so those never run; this phase did not touch it, so it was left as it is.`);
      continue;
    }
    let next = Math.max(...chain.map((item) => item.index)) + 1;
    for (const nav of navs)
      moves.push({ eventId: nav.id, index: next++ });
  }
  return moves;
}
function prepareQueryOptionsForWrite(kind, raw, subject) {
  const prefix = subject ? `${subject}: ` : "";
  const line = (text3) => subject ? `${prefix}${text3}` : text3.charAt(0).toUpperCase() + text3.slice(1);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { options: raw, errors: [line("options must be an object.")], warnings: [] };
  }
  const toggled = normalizeQueryToggles(raw);
  const warnings = [];
  const rewrite = toggleRewriteWarning(raw, toggled);
  if (rewrite)
    warnings.push(`${prefix}${rewrite}`);
  if (!kind) {
    return { options: toggled, errors: issueMessages(queryToggleIssues(toggled), subject), warnings };
  }
  const options = normalizeQueryOptions(kind, toggled);
  if (options !== toggled) {
    warnings.push(line(kind === "workflows" ? "normalized legacy workflow selectors to workflowId/workflowVersionId." : kind === "mongodb" ? "serialized MongoDB document fields to the JSON text expected by the plugin." : `rewrote the ${String(options.operation)} column map to ToolJet's {index: {column, value}} shape; the flat {column: value} form sends an empty body and fails at runtime.`));
  }
  const validation = validateQueryOptions(kind, options);
  warnings.push(...issueMessages(validation.warnings, subject));
  return { options, errors: issueMessages(validation.errors, subject), warnings, validation };
}
function expandQueryLifecycles(summary, lifecycles) {
  const queries = new Map(summary.queries.map((query) => [query.id, query]));
  const components = new Map(summary.pages.flatMap((page) => page.components).map((component) => [component.id, component]));
  const warnings = [];
  const events = [];
  const seenSources = /* @__PURE__ */ new Set();
  for (const lifecycle of lifecycles) {
    const query = queries.get(lifecycle.queryId);
    if (!query)
      throw new Error(`Query lifecycle source "${lifecycle.queryId}" does not exist.`);
    if (seenSources.has(lifecycle.queryId)) {
      throw new Error(`Query "${query.name ?? lifecycle.queryId}" has more than one lifecycle declaration in this batch.`);
    }
    seenSources.add(lifecycle.queryId);
    const sourceName = query.name ?? lifecycle.queryId;
    const refreshIds = unique(lifecycle.refreshQueryIds ?? [], `refresh query`, sourceName, warnings);
    if (refreshIds.includes(lifecycle.queryId)) {
      throw new Error(`Query "${sourceName}" cannot refresh itself after success: this repeats the query indefinitely, including any writes. Refresh a separate read query instead.`);
    }
    const clearIds = unique(lifecycle.clearComponentIds ?? [], `clear component`, sourceName, warnings);
    (lifecycle.beforeRefreshActions ?? []).forEach((action, index) => {
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: "data_query",
        trigger: "onDataQuerySuccess",
        action,
        name: `${sourceName} before refresh action ${index + 1}`
      });
    });
    for (const queryId of refreshIds) {
      const refresh = queries.get(queryId);
      if (!refresh)
        throw new Error(`Query "${sourceName}" lifecycle refresh target "${queryId}" does not exist.`);
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: "data_query",
        trigger: "onDataQuerySuccess",
        action: { actionId: "run-query", queryId, queryName: refresh.name ?? queryId },
        name: `Refresh ${refresh.name ?? queryId} after ${sourceName}`
      });
    }
    (lifecycle.successActions ?? []).forEach((action, index) => {
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: "data_query",
        trigger: "onDataQuerySuccess",
        action,
        name: `${sourceName} success action ${index + 1}`
      });
    });
    if (lifecycle.closeModalId) {
      const modal = components.get(lifecycle.closeModalId);
      if (!modal)
        throw new Error(`Query "${sourceName}" lifecycle modal "${lifecycle.closeModalId}" does not exist.`);
      if (modal.type !== "Modal" && !isModalV2Type(modal.type)) {
        throw new Error(`Query "${sourceName}" lifecycle close target "${modal.name ?? modal.id}" is ${modal.type ?? "unknown"}, not a Modal.`);
      }
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: "data_query",
        trigger: "onDataQuerySuccess",
        action: { actionId: "close-modal", modal: lifecycle.closeModalId },
        name: `Close ${modal.name ?? modal.id} after ${sourceName}`
      });
    }
    for (const componentId of clearIds) {
      const component = components.get(componentId);
      if (!component)
        throw new Error(`Query "${sourceName}" lifecycle clear target "${componentId}" does not exist.`);
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: "data_query",
        trigger: "onDataQuerySuccess",
        action: {
          actionId: "control-component",
          componentId,
          componentSpecificActionHandle: "clear",
          componentSpecificActionParams: []
        },
        name: `Clear ${component.name ?? componentId} after ${sourceName}`
      });
    }
    if (lifecycle.successAlert) {
      events.push(alertEvent(lifecycle.queryId, sourceName, "onDataQuerySuccess", lifecycle.successAlert, "success"));
    }
    (lifecycle.failureActions ?? []).forEach((action, index) => {
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: "data_query",
        trigger: "onDataQueryFailure",
        action,
        name: `${sourceName} failure action ${index + 1}`
      });
    });
    if (lifecycle.failureAlert) {
      events.push(alertEvent(lifecycle.queryId, sourceName, "onDataQueryFailure", lifecycle.failureAlert, "error"));
    }
  }
  return { events, warnings };
}
function alertEvent(queryId, queryName, trigger, alert, defaultType) {
  return {
    sourceId: queryId,
    sourceType: "data_query",
    trigger,
    action: { actionId: "show-alert", message: alert.message, alertType: alert.alertType ?? defaultType },
    name: trigger === "onDataQuerySuccess" ? `Confirm ${queryName}` : `${queryName} failed`
  };
}
function unique(values, label2, sourceName, warnings) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const value of values) {
    if (seen.has(value)) {
      warnings.push(`Query "${sourceName}" lifecycle listed ${label2} "${value}" more than once; duplicate ignored.`);
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}
function invalidPlannedGeneratedPrimaryKeySeeds(columns, rows) {
  const primaryKeys = columns.some((column) => column.primaryKey) ? columns.filter((column) => column.primaryKey) : [{ name: "id", type: "serial", primaryKey: true }];
  const errors = [];
  for (const column of primaryKeys) {
    if (normalizeType(column.type) !== "serial" && !/^nextval\(/i.test(String(column.defaultValue ?? "").trim()))
      continue;
    const supplied = rows.flatMap((row, index) => column.name in row ? [index + 1] : []);
    if (supplied.length) {
      errors.push(`Omit generated primary key "${column.name}" from seed row(s) ${supplied.slice(0, 12).join(", ")}${supplied.length > 12 ? ` and ${supplied.length - 12} more` : ""}. ToolJet allocates it from the table sequence; explicit keys can collide or desynchronize future inserts. No seed values were removed or rewritten.`);
    }
  }
  return errors;
}
var MIN_ROWS = 6;
var METRIC = /(progress|complet|percent|pct|score|rating|health|satisfaction|nps|readiness|utili[sz]ation|occupancy|amount|price|cost|total|revenue|balance|spend|budget|salary|value|hours|minutes|duration|days|stock|quantity|qty|count|tickets|visits|sales|margin|rate)/i;
var NOT_METRIC = /(^id$|_id$|^id_|uuid|key$|^sort|order$|position|rank|index|^year$|^is_|^has_|date|_at$|zip|phone|code$)/i;
var MEASURED = /(progress|complet|percent|pct|score|health|satisfaction|nps|readiness|utili[sz]ation|occupancy)/i;
var asNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value))
    return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim()))
    return Number(value);
  return void 0;
};
function lintUniformSeedMetrics(tableName, rows) {
  if (rows.length < MIN_ROWS)
    return [];
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const warnings = [];
  for (const column of columns) {
    if (!METRIC.test(column) || NOT_METRIC.test(column))
      continue;
    const values = rows.map((row) => asNumber(row[column]));
    const present = values.filter((v) => v !== void 0);
    if (present.length < MIN_ROWS || present.length < rows.length * 0.8)
      continue;
    const distinct = new Set(present);
    if (distinct.size === 1) {
      warnings.push(`Seed data for table "${tableName}": column "${column}" is ${present[0]} in all ${present.length} rows, so every record shows the same figure. Vary it across rows the way real records differ.`);
      continue;
    }
    if (!MEASURED.test(column))
      continue;
    for (const by of columns) {
      if (by === column || NOT_METRIC.test(by))
        continue;
      const groups = /* @__PURE__ */ new Map();
      const sizes = /* @__PURE__ */ new Map();
      let usable = true;
      rows.forEach((row, index) => {
        const group = row[by];
        const value = values[index];
        if (typeof group !== "string" || value === void 0) {
          usable = false;
          return;
        }
        groups.set(group, (groups.get(group) ?? /* @__PURE__ */ new Set()).add(value));
        sizes.set(group, (sizes.get(group) ?? 0) + 1);
      });
      if (!usable || groups.size < 3 || groups.size > 8 || [...sizes.values()].some((n) => n < 2))
        continue;
      if ([...groups.values()].some((set) => set.size > 1))
        continue;
      const examples = [...groups.entries()].slice(0, 3).map(([group, set]) => `${group} ${[...set][0]}`).join(", ");
      warnings.push(`Seed data for table "${tableName}": column "${column}" is one value per ${by} (${examples}), so every record in a ${by} shows the same ${column}. Vary it within each ${by} the way real records differ, and compute it from the record's own data (tasks done of tasks due, for example) rather than a fixed number per stage.`);
      break;
    }
  }
  return warnings;
}
function normalizePlannedLayouts(component) {
  const warnings = [];
  const label2 = `${component.type ?? "component"} "${component.name ?? "?"}"`;
  const targets = [];
  if (component.layout)
    targets.push(["layout", component.layout]);
  if (component.layouts?.desktop)
    targets.push(["desktop", component.layouts.desktop]);
  if (component.layouts?.mobile)
    targets.push(["mobile", component.layouts.mobile]);
  if (!targets.length)
    return { component, warnings };
  const textMinimum = component.type === "Text" ? minimumTextHeight(component) : void 0;
  const schema = component.type ? getComponentSchema(component.type) : void 0;
  const compactHeight = schema?.renderingHints?.compactFormHeight ? schema?.defaultSize?.height : void 0;
  const fixed = /* @__PURE__ */ new Map();
  for (const [name, rect] of targets) {
    if (typeof rect.height !== "number")
      continue;
    if (textMinimum !== void 0 && rect.height < textMinimum) {
      fixed.set(name, { ...rect, height: textMinimum });
      warnings.push(`${label2}: raised ${name} height ${rect.height}px to ${textMinimum}px so one line of text renders.`);
    } else if (compactHeight !== void 0 && rect.height > compactHeight) {
      fixed.set(name, { ...rect, height: compactHeight });
      warnings.push(`${label2}: lowered ${name} height ${rect.height}px to the standard single-line ${compactHeight}px (oversizing does not enlarge the value text; a top label renders outside the box).`);
    }
  }
  if (!fixed.size)
    return { component, warnings };
  const next = { ...component };
  if (fixed.has("layout"))
    next.layout = fixed.get("layout");
  if (fixed.has("desktop") || fixed.has("mobile")) {
    next.layouts = {
      ...component.layouts,
      ...fixed.has("desktop") ? { desktop: fixed.get("desktop") } : {},
      ...fixed.has("mobile") ? { mobile: fixed.get("mobile") } : {}
    };
  }
  return { component: next, warnings };
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function containsExactValue(value, expected) {
  if (value === expected)
    return true;
  if (Array.isArray(value))
    return value.some((entry) => containsExactValue(entry, expected));
  if (value && typeof value === "object") {
    return Object.values(value).some((entry) => containsExactValue(entry, expected));
  }
  return false;
}
function containsNamedBinding(value, namespace, name) {
  if (typeof value === "string") {
    return new RegExp(`\\b${namespace}\\s*\\.\\s*${escapeRegExp(name)}(?:\\b|\\s*\\[)`).test(value);
  }
  if (Array.isArray(value))
    return value.some((entry) => containsNamedBinding(entry, namespace, name));
  if (value && typeof value === "object") {
    return Object.values(value).some((entry) => containsNamedBinding(entry, namespace, name));
  }
  return false;
}
var CHART_QUERY_BINDING = /^\s*\{\{\s*queries\.([A-Za-z_$][\w$]*)\.data\s*\}\}\s*$/;
function lintQueryFedCharts(components, queries) {
  const errors = [];
  for (const component of components) {
    if (component.type !== "Chart")
      continue;
    const raw = component.properties?.jsonDescription;
    const description = typeof raw === "string" ? raw : raw && typeof raw === "object" && "value" in raw ? String(raw.value ?? "") : "";
    const match = CHART_QUERY_BINDING.exec(description);
    if (!match)
      continue;
    const query = queries.find((candidate) => candidate.name === match[1] || candidate.clientRef === match[1]);
    if (!query)
      continue;
    if (query.kind !== "runjs")
      continue;
    const code = String(query.options?.code ?? "");
    const label2 = component.name ?? "Chart";
    if (!code.trim()) {
      errors.push(`Chart "${label2}" is bound to query "${query.name}", which has no JavaScript code to build the chart object.`);
      continue;
    }
    if (/textposition\s*:\s*['"]outside['"]/.test(code) && !/cliponaxis\s*:\s*false/.test(code)) {
      errors.push(`Chart "${label2}" is bound to query "${query.name}", whose bar trace places its text outside without cliponaxis:false, so the tallest bar's value label is cut in half by the plot area. Add cliponaxis:false to the trace.`);
    }
    const missing = ["data", "layout"].filter((key2) => !code.includes(key2));
    if (missing.length) {
      errors.push(`Chart "${label2}" is bound to query "${query.name}", whose code never mentions ${missing.join(", ")}: a query feeding a chart must return the whole { data: [trace], layout: { font, xaxis, yaxis, ... } } object from references/ui-layout.md. A bare array of points draws empty axes in Plotly's default font.`);
    }
  }
  return errors;
}
var QUERY_DATA_REF = /queries\.([A-Za-z_$][\w$]*)\.data\b/g;
var isStaticTrue = (value) => value === true || value === "true" || value === "{{true}}";
function lintRunjsLoadOrder(spec) {
  const errors = [];
  const warnings = [];
  const queries = spec.queries ?? [];
  const byRef = /* @__PURE__ */ new Map();
  for (const query of queries) {
    byRef.set(query.name, query);
    if (query.clientRef)
      byRef.set(query.clientRef, query);
  }
  const chained = /* @__PURE__ */ new Set();
  for (const lifecycle of spec.lifecycles ?? []) {
    for (const target of lifecycle.refreshQueryRefs ?? [])
      chained.add(`${lifecycle.queryRef}->${target}`);
  }
  for (const event of spec.events ?? []) {
    const action = event.action ?? {};
    if (event.sourceType !== "data_query" || event.trigger !== "onDataQuerySuccess" || action.actionId !== "run-query")
      continue;
    const target = String(action.target_ref ?? action.queryName ?? action.queryId ?? "");
    if (target)
      chained.add(`${event.sourceRef}->${target}`);
  }
  const keysOf = (query) => [query.name, ...query.clientRef ? [query.clientRef] : []];
  for (const query of queries) {
    if (query.kind !== "runjs")
      continue;
    const code = String(query.options?.code ?? "");
    if (!isStaticTrue(query.options?.runOnPageLoad))
      continue;
    const refs = new Set([...code.matchAll(QUERY_DATA_REF)].map((match) => match[1]));
    for (const ref of refs) {
      const source = byRef.get(ref);
      if (!source || source === query)
        continue;
      const isChained = keysOf(source).some((from) => keysOf(query).some((to) => chained.has(`${from}->${to}`)));
      if (isChained) {
        warnings.push(`Query "${query.name}" is already run from "${source.name}"'s success but also has runOnPageLoad on, so it runs twice and the first run reads queries.${ref}.data before it exists. Set runOnPageLoad to false.`);
      } else {
        errors.push(`Query "${query.name}" reads queries.${ref}.data and runs on page load, so it races "${source.name}" and reads undefined on first load (the chart or table it feeds stays empty). Set runOnPageLoad to false and run it from "${source.name}"'s success: a lifecycle { queryRef: "${source.clientRef ?? source.name}", refreshQueryRefs: ["${query.clientRef ?? query.name}"] } or an onDataQuerySuccess run-query event.`);
      }
    }
  }
  return { errors, warnings };
}
function lintCrossPageComponentReads(spec) {
  const pages = spec.pages ?? [];
  if (pages.length < 2)
    return [];
  const pageOf = /* @__PURE__ */ new Map();
  for (const page of pages) {
    for (const component of page.components ?? []) {
      if (component.name)
        pageOf.set(component.name, page.name);
      if (component.clientRef)
        pageOf.set(component.clientRef, page.name);
    }
    if (page.clientRef)
      pageOf.set(page.clientRef, page.name);
  }
  const home = pages[0].name;
  const queries = spec.queries ?? [];
  const nameOf = /* @__PURE__ */ new Map();
  for (const q of queries) {
    nameOf.set(q.name, q.name);
    if (q.clientRef)
      nameOf.set(q.clientRef, q.name);
  }
  const startup = new Set(queries.filter((q) => isStaticTrue(q.options?.runOnPageLoad)).map((q) => q.name));
  const runners = /* @__PURE__ */ new Map();
  const add = (target, entry) => {
    const name = nameOf.get(target) ?? target;
    runners.set(name, [...runners.get(name) ?? [], entry]);
  };
  for (const lifecycle of spec.lifecycles ?? []) {
    const from = nameOf.get(lifecycle.queryRef) ?? lifecycle.queryRef;
    for (const target of lifecycle.refreshQueryRefs ?? [])
      add(target, { why: `after "${from}"`, startupChain: from });
  }
  for (const event of spec.events ?? []) {
    const action = event.action ?? {};
    if (action.actionId !== "run-query")
      continue;
    const target = String(action.target_ref ?? action.queryName ?? action.queryId ?? "");
    if (!target)
      continue;
    if (event.sourceType === "data_query")
      add(target, { why: `after "${nameOf.get(event.sourceRef) ?? event.sourceRef}"`, startupChain: nameOf.get(event.sourceRef) ?? event.sourceRef });
    else if (event.sourceType === "page")
      add(target, { why: `from page "${pageOf.get(event.sourceRef) ?? event.sourceRef}"`, page: pageOf.get(event.sourceRef) ?? event.sourceRef });
    else if (event.sourceType === "component")
      add(target, { why: `from page "${pageOf.get(event.sourceRef) ?? "?"}"`, page: pageOf.get(event.sourceRef) });
  }
  const errors = [];
  for (const query of queries) {
    const text3 = JSON.stringify(query.options ?? {});
    const reads = /* @__PURE__ */ new Map();
    for (const match of text3.matchAll(/components\.([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)/g)) {
      const page2 = pageOf.get(match[1]);
      if (page2 && page2 !== home && !reads.has(match[1]))
        reads.set(match[1], `${match[1]}.${match[2]}`);
    }
    if (!reads.size)
      continue;
    const [component, read] = [...reads.entries()][0];
    const page = pageOf.get(component);
    const closed = [];
    if (startup.has(query.name))
      closed.push("at app start");
    for (const runner of runners.get(query.name) ?? []) {
      if (runner.startupChain && startup.has(runner.startupChain))
        closed.push(`${runner.why}, which runs at app start`);
      else if (runner.page && runner.page !== page)
        closed.push(runner.why);
    }
    if (!closed.length)
      continue;
    errors.push(`Query "${query.name}" reads components.${read} (on page "${page}") but runs while "${page}" may be closed: ${[...new Set(closed)].join("; ")}. Only the open page's components exist, so it throws "Cannot read properties of undefined". Read them optionally with a default (components.${read.replace(".", "?.")} ?? ...), and run the query when "${page}" opens (a page onPageLoad run-query event).`);
  }
  return errors;
}
function lintChartNumericBindings(pages, queries) {
  const warnings = [];
  const sqlByName = /* @__PURE__ */ new Map();
  for (const query of queries) {
    const sql = query.options?.query;
    if (query.name && typeof sql === "string")
      sqlByName.set(query.name, sql);
  }
  if (!sqlByName.size)
    return warnings;
  for (const page of pages) {
    for (const component of page.components) {
      if (component.type !== "Chart")
        continue;
      const properties = component.properties;
      const entry = properties?.data;
      const binding = typeof entry?.value === "string" ? entry.value : typeof entry === "string" ? entry : "";
      if (!binding.includes("{{"))
        continue;
      const yMatch = binding.match(/y\s*:\s*(?:\w+\.)?([A-Za-z_]\w*)/);
      const queryMatch = binding.match(/queries\.([A-Za-z_$][\w$]*)/);
      if (!yMatch || !queryMatch)
        continue;
      const column = yMatch[1];
      const sql = sqlByName.get(queryMatch[1]);
      if (!sql)
        continue;
      const aggregate = new RegExp(`\\b(count|sum|avg|min|max)\\s*\\([^)]*\\)\\s+as\\s+${column}\\b`, "i").test(sql);
      if (!aggregate)
        continue;
      const cast = new RegExp(`(cast\\s*\\(|::\\s*(float|numeric|decimal|int|bigint|double))`, "i").test(sql);
      const coerced = /Number\s*\(|parseFloat\s*\(|parseInt\s*\(|\+\s*r\./.test(binding);
      if (cast || coerced)
        continue;
      warnings.push(`Chart "${component.name ?? component.id}" plots y from "${column}", an uncast SQL aggregate in query "${queryMatch[1]}". Many drivers return numeric aggregates as STRINGS (BigQuery INT64 from COUNT(*) especially), and a Chart given string y values renders blank with no error. Cast in SQL (CAST(... AS FLOAT64) / ::float) or coerce in the binding (y: Number(r.${column})).`);
    }
  }
  return warnings;
}
function lintServerSidePaginationRace(pages, queries) {
  const errors = [];
  const queryByName = /* @__PURE__ */ new Map();
  for (const query of queries)
    if (query.name)
      queryByName.set(query.name, query);
  const propValue = (properties, key2) => {
    const entry = properties?.[key2];
    return entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
  };
  const isTrue2 = (value) => value === true || typeof value === "string" && value.replace(/\s+/g, "").toLowerCase() === "{{true}}";
  const runsOnPageLoad = (options) => {
    const opts = options;
    return !!opts && (opts.runOnPageLoad === true || opts.runOnPageLoad === "{{true}}");
  };
  const referencedQueryNames = (dataBinding) => {
    if (typeof dataBinding !== "string")
      return [];
    const names = /* @__PURE__ */ new Set();
    for (const match of dataBinding.matchAll(/queries\.([A-Za-z_$][\w$]*)/g))
      names.add(match[1]);
    return [...names];
  };
  for (const page of pages) {
    for (const component of page.components) {
      if (component.type !== "Table" || !component.name)
        continue;
      const properties = component.properties;
      if (!isTrue2(propValue(properties, "serverSidePagination")))
        continue;
      for (const queryName of referencedQueryNames(propValue(properties, "data"))) {
        const query = queryByName.get(queryName);
        if (!query)
          continue;
        if (runsOnPageLoad(query.options) && containsNamedBinding(query.options, "components", component.name)) {
          errors.push(`Table "${component.name}" uses server-side pagination and its data query "${queryName}" runs on page load while referencing components.${component.name}.* in its SQL. On first load the table is not registered yet, so those bindings resolve to "undefined" and the query fails (e.g. column "undefined" does not exist) \u2014 the table then shows "No data" even though the record count is non-zero. For a bounded result set, prefer client-side pagination: set serverSidePagination:false, bind the table data to the full query, and drop the separate count query. If server-side pagination is genuinely needed, set the data query's runOnPageLoad:false and drive it from the table's onPageChanged/onSearch events so it runs after the table mounts.`);
        }
      }
    }
  }
  return errors;
}
function pagesUsingQuery(summary, name, planPages) {
  if (!summary)
    return [];
  const query = (summary.queries ?? []).find((q) => q.name === name);
  const reads = new RegExp(`queries\\??\\.${name.replace(/[$]/g, "\\$&")}\\b`);
  return (summary.pages ?? []).filter((page) => {
    if (!page.name || planPages.has(page.name))
      return false;
    const ids = new Set(page.components.map((component) => component.id));
    return page.components.some((component) => reads.test(JSON.stringify([component.properties ?? {}, component.styles ?? {}]))) || !!query && (summary.events ?? []).some((event) => !!event.sourceId && (ids.has(event.sourceId) || event.sourceId === page.id) && JSON.stringify(event.event ?? {}).includes(`"${query.id}"`));
  }).map((page) => page.name);
}
function lintPlannedApp(spec, existingSummary, options = {}) {
  const errors = [];
  const warnings = [];
  const checked = [];
  const tables = spec.tables ?? [];
  if (tables.length) {
    checked.push("ToolJet DB table names, columns, foreign keys, reserved names, and dependency order");
    errors.push(...validateTableBatch(tables));
  }
  const seedData = spec.seedData ?? [];
  const seedRows = seedData.reduce((total, seed) => total + seed.rows.length, 0);
  if (seedData.length) {
    checked.push("seed batches have non-empty rows");
    for (const [batchIndex, seed] of seedData.entries()) {
      if (!seed.rows.length)
        errors.push(`Seed data for table "${seed.tableName}" has no rows.`);
      const plannedTable = tables.find((table) => table.tableName.toLowerCase() === seed.tableName.toLowerCase());
      if (plannedTable) {
        errors.push(...invalidPlannedGeneratedPrimaryKeySeeds(plannedTable.columns, seed.rows).map((error) => `Seed data for planned table "${seed.tableName}" (batch ${batchIndex + 1}): ${error}`));
      }
      const columns = plannedTable?.columns ?? [];
      for (const column of columns) {
        if (!/^jsonb?$/i.test(String(column.type ?? "")))
          continue;
        const bad = seed.rows.flatMap((row, index) => {
          const value = row[column.name];
          return value === void 0 || value === null || typeof value === "object" ? [] : [index + 1];
        });
        if (bad.length) {
          errors.push(`Seed data for table "${seed.tableName}": column "${column.name}" is jsonb, so each value must be an object or an array (or null), not ${typeof seed.rows[bad[0] - 1][column.name]}; row(s) ${bad.slice(0, 8).join(", ")}. Store a list as ["a","b"], or make the column string if it holds text.`);
        }
      }
    }
    const rowsByTable = /* @__PURE__ */ new Map();
    for (const seed of seedData)
      rowsByTable.set(seed.tableName, [...rowsByTable.get(seed.tableName) ?? [], ...seed.rows]);
    for (const [tableName, rows] of rowsByTable)
      warnings.push(...lintUniformSeedMetrics(tableName, rows));
  }
  const queryRefs = /* @__PURE__ */ new Map();
  const queryIds = /* @__PURE__ */ new Map();
  const existingQueries = existingSummary?.queries ?? [];
  const existingQueryNames = /* @__PURE__ */ new Set();
  for (const query of existingQueries) {
    const target = { id: query.id, name: query.name ?? query.id };
    queryRefs.set(query.id, target);
    queryIds.set(query.id, target);
    if (query.name) {
      if (existingQueryNames.has(query.name))
        errors.push(`Existing app has duplicate query name "${query.name}".`);
      existingQueryNames.add(query.name);
      queryRefs.set(query.name, target);
    }
  }
  const plannedQueries = (spec.queries ?? []).map((query, index) => {
    const ref = query.clientRef ?? query.name;
    const id = `planned-query:${index}:${ref}`;
    if (existingQueryNames.has(query.name)) {
      const users = pagesUsingQuery(existingSummary, query.name, new Set((spec.pages ?? []).map((page) => page.name)));
      errors.push(`App already has a query named "${query.name}"` + (users.length ? `, which page${users.length > 1 ? "s" : ""} ${users.map((u) => `"${u}"`).join(", ")} also read${users.length > 1 ? "" : "s"} or run${users.length > 1 ? "" : "s"}. To use it as it is, refer to it by name here without defining it. To change it for every page that reads it, mark this definition update: true.` : ". To use it as it is, refer to it by name without defining it in this plan; to change it, mark this definition update: true."));
    }
    registerRef(queryRefs, ref, { id, name: query.name }, "query", errors);
    if (ref !== query.name)
      registerRef(queryRefs, query.name, { id, name: query.name }, "query", errors);
    queryIds.set(id, { id, name: query.name });
    if (!query.kind) {
      errors.push(`Query "${query.name}" has no resolved datasource kind; pass kind or a resolvable datasource_id + version_id.`);
    }
    const prepared = prepareQueryOptionsForWrite(query.kind, query.options, `Query "${query.name}"`);
    const options2 = prepared.options;
    errors.push(...prepared.errors);
    warnings.push(...prepared.warnings);
    return {
      id,
      name: query.name,
      kind: query.kind,
      data_source_id: query.datasourceId,
      options: options2
    };
  });
  const queries = [...existingQueries, ...plannedQueries];
  if (plannedQueries.length)
    checked.push("datasource query option contracts and duplicate logical query references");
  {
    const loadOrder = lintRunjsLoadOrder(spec);
    errors.push(...loadOrder.errors);
    errors.push(...lintCrossPageComponentReads(spec));
    warnings.push(...loadOrder.warnings);
  }
  const pageRefs = /* @__PURE__ */ new Map();
  const componentRefs = /* @__PURE__ */ new Map();
  const pages = (existingSummary?.pages ?? []).map((page) => ({
    ...page,
    components: page.components.map((component) => ({ ...component }))
  }));
  const componentNameCounts = /* @__PURE__ */ new Map();
  for (const page of pages) {
    bindRef(pageRefs, page.id, { id: page.id, name: page.name ?? page.id });
    if (page.name)
      bindRef(pageRefs, page.name, { id: page.id, name: page.name });
    if (page.handle)
      bindRef(pageRefs, page.handle, { id: page.id, name: page.name ?? page.handle });
    for (const component of page.components) {
      const target = { id: component.id, name: component.name ?? component.id, type: component.type };
      bindRef(componentRefs, component.id, target);
      if (component.name)
        componentNameCounts.set(component.name, (componentNameCounts.get(component.name) ?? 0) + 1);
    }
  }
  for (const page of pages) {
    for (const component of page.components) {
      if (component.name && componentNameCounts.get(component.name) === 1) {
        bindRef(componentRefs, component.name, { id: component.id, name: component.name, type: component.type });
      }
    }
  }
  let componentCount = 0;
  const currency = plannedCurrency((spec.pages ?? []).flatMap((page) => page.components ?? []));
  (spec.pages ?? []).forEach((plannedPage, pageIndex) => {
    const pageRef = plannedPage.clientRef ?? plannedPage.name;
    const existingPage = matchPlannedPage(pages, plannedPage.name, new Set((spec.pages ?? []).map((page) => page.name)));
    const pageId = existingPage?.id ?? `planned-page:${pageIndex}:${pageRef}`;
    bindRef(pageRefs, pageRef, { id: pageId, name: plannedPage.name }, "page", errors);
    const iconError = pageIconError(plannedPage.icon);
    if (iconError)
      errors.push(`Page "${plannedPage.name}": ${iconError}`);
    const normalized = (plannedPage.components ?? []).map((component) => {
      const definition = normalizeComponentSpec(component, { stripUnknownKeys: true, currency });
      const geometry = normalizePlannedLayouts(definition.component);
      return { component: geometry.component, warnings: [...definition.warnings, ...geometry.warnings] };
    });
    warnings.push(...normalized.flatMap((item) => item.warnings));
    const materialized = materializeRequiredDefaultChildren(normalized.map((item) => item.component));
    warnings.push(...materialized.warnings);
    const polished = polishFlexRows(materialized.components);
    warnings.push(...polished.warnings.map((message) => `Page "${plannedPage.name}": ${message}`));
    const expansion = { components: polished.components };
    const componentLint = lintComponents(expansion.components, {
      ...options,
      flexContainerIds: (existingPage?.components ?? []).filter((component) => component.type === "FlexContainer").map((component) => component.id)
    });
    errors.push(...componentLint.errors.map((message) => `Page "${plannedPage.name}": ${message}`));
    errors.push(...lintQueryFedCharts(expansion.components, spec.queries ?? []).map((message) => `Page "${plannedPage.name}": ${message}`));
    warnings.push(...componentLint.warnings.map((message) => `Page "${plannedPage.name}": ${message}`));
    warnings.push(...lintPageArchetype(plannedPage.archetype, expansion.components).map((message) => `Page "${plannedPage.name}": ${message}`));
    const references = indexComponentReferences(expansion.components, existingPage?.components);
    errors.push(...references.errors.map((message) => `Page "${plannedPage.name}": ${message}`));
    const localRefs = /* @__PURE__ */ new Map();
    const componentEntries = references.components.map((component, componentIndex) => {
      const ref = componentRef(component);
      const id = `planned-component:${pageIndex}:${componentIndex}:${ref}`;
      if ((existingPage?.components ?? []).some((candidate) => candidate.name === component.name)) {
        errors.push(`Page "${plannedPage.name}" already has a component named "${component.name}".`);
      }
      if (localRefs.has(ref))
        errors.push(`Page "${plannedPage.name}" has duplicate component ref "${ref}".`);
      else
        localRefs.set(ref, id);
      registerRef(componentRefs, ref, { id, name: component.name, type: component.type }, "component", errors);
      componentCount += 1;
      return { component, id, originalParentRef: expansion.components[componentIndex].parentRef };
    });
    const plannedComponents = componentEntries.map(({ component, id, originalParentRef }) => {
      let parent;
      if (component.parentRef) {
        parent = localRefs.get(component.parentRef);
        if (!parent) {
          errors.push(`Page "${plannedPage.name}" component "${component.name}" has unknown parent_ref "${component.parentRef}".`);
        }
      } else if (component.parent) {
        if (!originalParentRef)
          warnings.push(`Page "${plannedPage.name}" component "${component.name}" uses persisted parent id "${component.parent}"; its parent relationship cannot be verified in a pre-write plan. Prefer parent_ref.`);
        parent = component.parent;
      }
      if (parent)
        parent = encodeComponentParent(parent, component.slotName);
      return {
        id,
        name: component.name,
        type: component.type,
        properties: component.properties,
        styles: component.styles,
        validation: component.validation,
        others: component.others,
        layouts: component.layouts ?? (component.layout ? { desktop: component.layout, mobile: component.layout } : void 0),
        parent,
        ...component.slotName && component.slotName !== "body" ? { slot_name: component.slotName } : {}
      };
    });
    const pageSummary = existingPage ?? {
      id: pageId,
      name: plannedPage.name,
      handle: plannedPage.name === "Home" ? "home" : slug(plannedPage.name),
      icon: plannedPage.icon,
      components: []
    };
    pageSummary.name = plannedPage.name;
    pageSummary.icon = plannedPage.icon;
    if (plannedPage.hidden !== void 0)
      pageSummary.hidden = plannedPage.hidden;
    pageSummary.components.push(...plannedComponents);
    if (!existingPage)
      pages.push(pageSummary);
  });
  if (pages.length)
    checked.push("page icons, component contracts, bindings, rendered geometry, modal sizing, and nested refs");
  errors.push(...lintServerSidePaginationRace(pages, queries));
  warnings.push(...lintChartNumericBindings(pages, queries));
  const eventSpecs = [];
  const scanners = new Set((spec.pages ?? []).flatMap((p) => (p.components ?? []).filter((c) => c.type === "QrScanner").flatMap((c) => [c.clientRef, c.name].filter(Boolean))));
  (spec.events ?? []).forEach((event, index) => {
    if (event.sourceType === "component" && event.trigger === "onDetect" && scanners.has(String(event.sourceRef)) && !event.action?.debounce) {
      errors.push(`Event[${index}] (QrScanner "${event.sourceRef}" onDetect): add debounce: "300" to the action. The scanner runs onDetect before it sets lastDetectedValue, so an undelayed action reads the previous scan (nothing on the first).`);
    }
    const source = sourceMap(event.sourceType, componentRefs, queryRefs, pageRefs).get(event.sourceRef);
    if (!source)
      errors.push(`Event[${index}] has unknown ${event.sourceType} source_ref "${event.sourceRef}".`);
    eventSpecs.push({
      sourceId: source?.id ?? `missing-source:${event.sourceRef}`,
      sourceType: event.sourceType,
      ref: event.ref,
      trigger: event.trigger,
      action: resolveAction(event.action, queryRefs, pageRefs, componentRefs, errors, `Event[${index}]`),
      name: event.name
    });
  });
  if ((spec.lifecycles ?? []).length) {
    const lifecycleSpecs = (spec.lifecycles ?? []).flatMap((lifecycle, index) => {
      const source = queryRefs.get(lifecycle.queryRef);
      if (!source) {
        errors.push(`Lifecycle[${index}] has unknown query_ref "${lifecycle.queryRef}".`);
        return [];
      }
      return [{
        queryId: source.id,
        refreshQueryIds: resolveRefs(lifecycle.refreshQueryRefs, queryRefs, errors, `Lifecycle[${index}] refresh query`),
        clearComponentIds: resolveRefs(lifecycle.clearComponentRefs, componentRefs, errors, `Lifecycle[${index}] clear component`),
        closeModalId: resolveRef2(lifecycle.closeModalRef, componentRefs, errors, `Lifecycle[${index}] modal`),
        successAlert: lifecycle.successAlert,
        failureAlert: lifecycle.failureAlert,
        beforeRefreshActions: lifecycle.beforeRefreshActions?.map((action, actionIndex) => resolveAction(action, queryRefs, pageRefs, componentRefs, errors, `Lifecycle[${index}] before refresh action[${actionIndex}]`)),
        successActions: lifecycle.successActions?.map((action, actionIndex) => resolveAction(action, queryRefs, pageRefs, componentRefs, errors, `Lifecycle[${index}] success action[${actionIndex}]`)),
        failureActions: lifecycle.failureActions?.map((action, actionIndex) => resolveAction(action, queryRefs, pageRefs, componentRefs, errors, `Lifecycle[${index}] failure action[${actionIndex}]`))
      }];
    });
    try {
      const expanded = expandQueryLifecycles({ app_id: existingSummary?.app_id ?? "planned-app", pages, queries, events: existingSummary?.events ?? [] }, lifecycleSpecs);
      eventSpecs.push(...expanded.events);
      warnings.push(...expanded.warnings);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  const summary = {
    app_id: existingSummary?.app_id ?? "planned-app",
    name: existingSummary?.name ?? "Planned app",
    version_id: existingSummary?.version_id ?? "planned-version",
    pages,
    queries,
    events: [
      ...existingSummary?.events ?? [],
      ...eventSpecs.map((event, index) => ({
        id: `planned-event:${index}`,
        name: event.name,
        sourceId: event.sourceId,
        target: event.sourceType,
        event: { eventId: event.trigger, ...event.ref ? { ref: event.ref } : {}, ...event.action }
      }))
    ]
  };
  if (eventSpecs.length) {
    checked.push("event/lifecycle sources, triggers, action ids, and logical targets");
    const eventValidation = validateEvents(
      { ...summary, events: existingSummary?.events ?? [] },
      eventSpecs,
      // apply_app_phase moves a saved page switch behind the handlers a plan adds (navigationReorders).
      { navigationMovedLast: true }
    );
    errors.push(...eventValidation.errors);
    warnings.push(...eventValidation.warnings);
  }
  const structure = validateAppStructure(summary, options);
  const forward = splitForwardComponentRefs(structure.errors, existingQueryNames);
  errors.push(...forward.errors);
  warnings.push(...structure.warnings, ...forward.notes);
  const deduped = dropUnprefixedDuplicates(errors);
  return {
    ok: deduped.length === 0,
    errors: deduped,
    warnings: dropUnprefixedDuplicates(warnings),
    checked,
    not_checked: [
      "server acceptance of writes or external datasource connectivity",
      "query execution results and mutation side effects",
      "browser event delivery, dynamic bindings, and visual rendering"
    ],
    counts: {
      tables: tables.length,
      seed_rows: seedRows,
      pages: spec.pages?.length ?? 0,
      components: componentCount,
      queries: plannedQueries.length,
      events: eventSpecs.length,
      lifecycles: spec.lifecycles?.length ?? 0
    }
  };
}
function splitForwardComponentRefs(structureErrors, existingQueryNames) {
  const errors = [];
  const missing = /* @__PURE__ */ new Map();
  for (const error of structureErrors) {
    const m = error.match(/^Query "([^"]+)" references components\.([^,]+), but no component is named /) ?? error.match(/^RunJS query "([^"]+)" references components\["([^"]+)"\], but no component is named /);
    if (m && existingQueryNames.has(m[1])) {
      const names = missing.get(m[1]) ?? [];
      if (!names.includes(m[2]))
        names.push(m[2]);
      missing.set(m[1], names);
    } else {
      errors.push(error);
    }
  }
  const notes = [...missing].map(([query, names]) => `Query "${query}" reads ${names.map((n) => `components.${n}`).join(", ")}, which no page has yet. Build them on a later page with that exact name, or the query reads undefined.`);
  return { errors, notes };
}
function bindRef(map, ref, value, type, errors) {
  const existing = map.get(ref);
  if (!existing || existing.id === value.id)
    map.set(ref, value);
  else if (type && errors)
    errors.push(`Duplicate ${type} client_ref/name "${ref}" in planned app.`);
}
function registerRef(map, ref, value, type, errors) {
  if (map.has(ref))
    errors.push(`Duplicate ${type} client_ref/name "${ref}" in planned app.`);
  else
    map.set(ref, value);
}
function sourceMap(sourceType, components, queries, pages) {
  if (sourceType === "data_query")
    return queries;
  if (sourceType === "page")
    return pages;
  return components;
}
function resolveAction(raw, queries, pages, components, errors, label2) {
  const { target_ref: explicitRef, ...action } = raw;
  const targetRef = explicitRef ?? (action.actionId === "run-query" ? action.queryId ?? action.queryName : void 0);
  if (Object.values(action).some((value) => typeof value === "string" && /^planned-(query|page|component):/.test(value))) {
    errors.push(`${label2}: synthetic planned ids cannot be saved. Use action.target_ref with the logical client_ref or name.`);
    return action;
  }
  if (targetRef === void 0)
    return action;
  if (typeof targetRef !== "string") {
    errors.push(`${label2} target_ref must be a string.`);
    return action;
  }
  const actionId = action.actionId;
  const target = actionId === "run-query" ? queries.get(targetRef) : actionId === "switch-page" ? pages.get(targetRef) : ["show-modal", "close-modal", "control-component", "set-table-page", "scroll-component-into-view"].includes(String(actionId)) ? components.get(targetRef) : void 0;
  if (!target) {
    errors.push(`${label2} action "${String(actionId)}" has unknown or unsupported target_ref "${targetRef}".`);
    return action;
  }
  if (actionId === "run-query")
    return { ...action, queryId: target.id, queryName: target.name };
  if (actionId === "switch-page")
    return { ...action, pageId: target.id };
  if (actionId === "show-modal" || actionId === "close-modal")
    return { ...action, modal: target.id };
  if (actionId === "control-component" || actionId === "scroll-component-into-view") {
    return { ...action, componentId: target.id };
  }
  if (actionId === "set-table-page")
    return { ...action, table: target.id };
  return action;
}
function resolveRefs(refs, map, errors, label2) {
  return refs?.flatMap((ref) => {
    const value = map.get(ref);
    if (!value) {
      errors.push(`${label2} ref "${ref}" does not exist.`);
      return [];
    }
    return [value.id];
  });
}
function resolveRef2(ref, map, errors, label2) {
  if (!ref)
    return void 0;
  const value = map.get(ref);
  if (!value) {
    errors.push(`${label2} ref "${ref}" does not exist.`);
    return void 0;
  }
  return value.id;
}
function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "page";
}
function unique2(values) {
  return [...new Set(values)];
}
function dropUnprefixedDuplicates(values) {
  const distinct = unique2(values);
  const stripped = new Set(distinct.map((value) => value.replace(/^Page "[^"]*": /, "")).filter((value, i) => value !== distinct[i]));
  return distinct.filter((value) => value.startsWith('Page "') || !stripped.has(value));
}
export {
  prepareQueryOptionsForWrite as a,
  persistedEventSpecs as b,
  normalizePlannedLayouts as c,
  materializeRequiredDefaultChildren as d,
  expandQueryLifecycles as e,
  polishFlexRows as f,
  verifyPageRenderTool as g,
  containsExactValue as h,
  containsNamedBinding as i,
  persistedEventIds as j,
  lintPlannedApp as l,
  matchPlannedPage as m,
  navigationReorders as n,
  pagesUsingQuery as p,
  validateEvents as v
};
