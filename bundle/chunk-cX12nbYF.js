import { createRequire } from "node:module";
import { e9 as fail, e7 as ok } from "./chunk-By54lwVj.js";
import { g as assessQueryRead } from "./chunk-CWuyYxjg.js";
import { b1 as external_exports } from "./chunk-DsdTCwqi.js";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, request } from "node:http";
import { connect } from "node:net";
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
function renderAuditUrlAllowed(value, origins) {
  try {
    return origins.has(httpUrl(value).origin);
  } catch {
    return false;
  }
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
  const read = assessQueryRead(query);
  if (!read.provenRead || !read.directSafe || read.requiresCountPreflight || read.requiresRemoteReadConfirmation || read.requiresBillableReadConfirmation) {
    return blocked("A query that is not a proven bounded read was blocked");
  }
  return { allowed: true, postData: JSON.stringify({ resolvedOptions: {} }) };
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
}) {
  const tunnels = tunnelTargets(origins);
  const sockets = /* @__PURE__ */ new Set();
  const track = (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  };
  const refuseSocket = (socket, destination) => {
    onBlocked(destination);
    socket.end("HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
  };
  const tunnel = (client, host, port, first) => {
    const upstream = connect(port, unbracket(host), () => {
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
      onBlocked(url.origin);
      res.writeHead(403, { "content-length": "0", connection: "close" }).end();
      return;
    }
    const upstream = request({ host: unbracket(url.hostname), port: url.port || 80, method: req.method, path: url.pathname + url.search, headers: forwardHeaders(req.headers) }, (answer) => {
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
  });
  server.on("connection", track);
  server.on("connect", (req, client, head) => {
    const target = tunnelTarget(req.url);
    if (!target || !tunnels.has(target)) {
      refuseSocket(client, target ?? "an unreadable tunnel target");
      return;
    }
    const at = target.lastIndexOf(":");
    tunnel(client, target.slice(0, at), Number(target.slice(at + 1)), (upstream) => {
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length)
        upstream.write(head);
    });
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
      refuseSocket(client, url.origin);
      return;
    }
    tunnel(client, url.hostname, Number(url.port || 80), (upstream) => {
      const lines = [`${req.method} ${url.pathname}${url.search} HTTP/${req.httpVersion}`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        if (!/^proxy-/i.test(req.rawHeaders[i]))
          lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
      }
      upstream.write(lines.join("\r\n") + "\r\n\r\n");
      if (head.length)
        upstream.write(head);
    });
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
  return frame.evaluate(() => window.axe.run(document, { resultTypes: ["violations"], runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }).then((r) => r.violations.map((v) => ({
    id: v.id,
    impact: v.impact ?? null,
    help: v.help,
    nodes: v.nodes.length,
    targets: v.nodes.slice(0, 3).map((n) => [].concat(n.target).join(" "))
  }))));
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
function codePageAuditScript(route) {
  const frame = document.querySelector("iframe[data-tj-code-page-frame]");
  if (!frame)
    return null;
  const findings = [];
  const doc = frame.contentDocument;
  const width = window.innerWidth;
  const host = document.scrollingElement;
  if (host && host.scrollWidth > host.clientWidth + 1)
    findings.push({ kind: "overflow", component: "Code mode app", detail: `the page scrolls sideways at ${width}px (${host.scrollWidth}px wide)` });
  if (!doc || !doc.body) {
    findings.push({ kind: "empty_render", component: "Code mode app", detail: "the Code mode frame has no document" });
    return findings;
  }
  const root = doc.getElementById("tj-frame-root");
  const text = (root?.innerText ?? "").trim();
  if (!root || root.children.length === 0 || !text && !root.querySelector("svg,canvas,img")) {
    findings.push({ kind: "empty_render", component: "Code mode app", detail: "the Code mode app rendered nothing" });
    return findings;
  }
  const scroller = doc.scrollingElement;
  if (scroller && scroller.scrollWidth > scroller.clientWidth + 1)
    findings.push({ kind: "overflow", component: "Code mode app", detail: `the app scrolls sideways at ${width}px (${scroller.scrollWidth}px of content in ${scroller.clientWidth}px)` });
  const frameRect = frame.getBoundingClientRect();
  if (frameRect.bottom > window.innerHeight + 1)
    findings.push({ kind: "clipped", component: "Code mode app", detail: `the app runs ${Math.round(frameRect.bottom - window.innerHeight)}px below the window` });
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
var INFORMATIONAL_KINDS = /* @__PURE__ */ new Set(["blocked_socket"]);
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
  const root = frame?.contentDocument?.getElementById("tj-frame-root");
  return !!root && root.children.length > 0;
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
    const proxy = await startEgressProxy(origins, onBlocked);
    proxies.push(proxy);
    return { server: proxy.server, bypass: "<-loopback>" };
  };
  const closeProxies = () => Promise.all(proxies.splice(0).map((proxy) => proxy.close().catch(() => {
  })));
  const launch = {
    headless: true,
    chromiumSandbox: true,
    args: ["--force-webrtc-ip-handling-policy=disable_non_proxied_udp"]
  };
  if (options.executablePath)
    launch.executablePath = options.executablePath;
  else
    launch.channel = options.channel ?? "chrome";
  let browser;
  try {
    launch.proxy = await proxyFor();
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
    try {
      const width = options.viewportWidth ?? 1600;
      const proxy = await proxyFor((destination) => block({
        kind: "unreachable",
        component: "-",
        reason: "redirect_blocked",
        detail: "A redirect or connection to a destination outside the configured audit origins was blocked"
      }, `connection to ${destination}`));
      ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 812 : 900 }, serviceWorkers: "block", proxy });
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
              kind: "unreachable",
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
      await page.waitForFunction(() => {
        if (!document.querySelector('[data-cy^="draggable-widget-"]'))
          return false;
        const frame = document.querySelector("iframe[data-tj-code-page-frame]");
        if (!frame)
          return true;
        const root = frame.contentDocument?.getElementById("tj-frame-root");
        return !!root && root.children.length > 0;
      }, void 0, { timeout: options.contentWaitMs ?? Number(process.env.MCP_RENDER_AUDIT_CONTENT_WAIT_MS || 3e4) }).catch(() => void 0);
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
      const landed = page.url();
      if (/\/(?:login|sign-in|signin)\b/i.test(new URL(landed).pathname)) {
        reports[index] = unreachable(p, "auth_required", "The viewer requires sign-in; private app rendering was not verified");
        return;
      }
      const result = await page.evaluate(auditScript);
      const codePage = await page.evaluate(codePageAuditScript, new URL(p.url).searchParams.get("route") || void 0);
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
    description: 'Render audit of one page or every page of an app in a headless browser (1600x900 unless viewport_width is set), after the app is built. On an app in Code mode it checks inside the app: sideways scrolling, content cut off at the right edge, an empty app and placeholder text; pass route to open one route of it and viewport_width (375, 768, 1280) to check each width. An app in Code mode also gets an axe-core accessibility run (WCAG 2 A/AA; `accessibility` lists violations by impact) and a screenshot path. Reports what lint cannot see: Html/Text widgets that render empty (a multi-line binding, a broken expression), placeholder text a customer would read as a bug ("undefined", "NaN", "Invalid date", "Tab 1", "Select..", a literal \\n), text clipped inside its box, and components overlapping each other. Run it once per page before the handoff and review every finding; report unverified behavior explicitly. Opens the version being edited with the builder\'s ToolJet session, or a separate app-scoped OAuth viewer credential (limited to the viewer origin), so a private app is audited without being made public. Only saved, static, bounded read queries may run; writes, dynamic queries and queries requiring confirmation are blocked and reported as unverified. WebSockets to the ToolJet origin pass; any other WebSocket is closed and reported as a `blocked_socket` finding, which does not make `ok` false. Returns { pages: [{ page, url, widgets, findings: [{ kind, component, detail }] }], ok }.',
    inputSchema: {
      app_id: external_exports.string().regex(/^[A-Za-z0-9_-]+$/),
      page_handle: external_exports.string().optional().describe("one page handle; omit to audit every page"),
      viewer_url: external_exports.string().optional().describe("canonical viewer base URL; alternate origins require host configuration in MCP_RENDER_AUDIT_ALLOWED_ORIGINS"),
      viewport_width: external_exports.number().int().min(320).max(2560).optional().describe("window width in px; default 1600"),
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
          savedQueries: summary,
          viewportWidth: args.viewport_width,
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
  verifyPageRenderTool as v
};
