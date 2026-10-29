#!/usr/bin/env node
import { createRequire } from "node:module";
import { b as buildServer, a as buildUnconfiguredServer, c as allowedApiOrigins, A as ALLOWED_API_ORIGINS_VAR, o as oauthHttpOptionsFromEnv, d as createOAuthHttpServer, i as identityFromHeaders, S as SESSION_TOKEN_HEADER, B as BASE_URL_HEADER, P as PAT_HEADER, e as StreamableHTTPServerTransport } from "./chunk-B_EXmN9g.js";
import "./chunk-8iUq0slz.js";
import "./chunk-rf3v0KLq.js";
import { J as JSONRPCMessageSchema } from "./chunk-pk1wj3UI.js";
import "./chunk-CeK3IIjD.js";
import "./chunk-CldhDVI0.js";
import "./chunk-BLALee7Y.js";
import "./chunk-BsYpTL2E.js";
import "./chunk-gznY6rD8.js";
import "./chunk-BEuHHGL1.js";
import "./chunk-Biq-LW6M.js";
import "./chunk-4DDZMCNh.js";
import "./chunk-Dlrd_yJi.js";
import "./chunk-yxr8SUor.js";
import "./chunk-CsHFzbSc.js";
import "./chunk-CPO3lpSy.js";
import "./chunk-qhyW4MeS.js";
import "./chunk-CLeJ853_.js";
import "./chunk-BjOFSCcG.js";
import { createServer } from "node:http";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import process2 from "node:process";
import { timingSafeEqual, randomBytes } from "node:crypto";
import "node:net";
import "node:async_hooks";
import "node:fs/promises";
import "node:path";
import "node:util";
import "node:vm";
import "node:http2";
import "node:stream";
createRequire(import.meta.url);
var STDIO_DEFAULT_MAX_BUFFER_SIZE = 10 * 1024 * 1024;
var ReadBuffer = class {
  constructor(options) {
    this._maxBufferSize = options?.maxBufferSize ?? STDIO_DEFAULT_MAX_BUFFER_SIZE;
  }
  append(chunk) {
    const newSize = (this._buffer?.length ?? 0) + chunk.length;
    if (newSize > this._maxBufferSize) {
      this.clear();
      throw new Error(`ReadBuffer exceeded maximum size of ${this._maxBufferSize} bytes`);
    }
    this._buffer = this._buffer ? Buffer.concat([this._buffer, chunk]) : chunk;
  }
  readMessage() {
    if (!this._buffer) {
      return null;
    }
    const index = this._buffer.indexOf("\n");
    if (index === -1) {
      return null;
    }
    const line = this._buffer.toString("utf8", 0, index).replace(/\r$/, "");
    this._buffer = this._buffer.subarray(index + 1);
    return deserializeMessage(line);
  }
  clear() {
    this._buffer = void 0;
  }
};
function deserializeMessage(line) {
  return JSONRPCMessageSchema.parse(JSON.parse(line));
}
function serializeMessage(message) {
  return JSON.stringify(message) + "\n";
}
var StdioServerTransport = class {
  constructor(_stdin = process2.stdin, _stdout = process2.stdout, options) {
    this._stdin = _stdin;
    this._stdout = _stdout;
    this._started = false;
    this._ondata = (chunk) => {
      try {
        this._readBuffer.append(chunk);
        this.processReadBuffer();
      } catch (error) {
        this.onerror?.(error);
        this.close().catch(() => {
        });
      }
    };
    this._onerror = (error) => {
      this.onerror?.(error);
    };
    this._readBuffer = new ReadBuffer({ maxBufferSize: options?.maxBufferSize });
  }
  /**
   * Starts listening for messages on stdin.
   */
  async start() {
    if (this._started) {
      throw new Error("StdioServerTransport already started! If using Server class, note that connect() calls start() automatically.");
    }
    this._started = true;
    this._stdin.on("data", this._ondata);
    this._stdin.on("error", this._onerror);
  }
  processReadBuffer() {
    while (true) {
      try {
        const message = this._readBuffer.readMessage();
        if (message === null) {
          break;
        }
        this.onmessage?.(message);
      } catch (error) {
        this.onerror?.(error);
      }
    }
  }
  async close() {
    this._stdin.off("data", this._ondata);
    this._stdin.off("error", this._onerror);
    const remainingDataListeners = this._stdin.listenerCount("data");
    if (remainingDataListeners === 0) {
      this._stdin.pause();
    }
    this._readBuffer.clear();
    this.onclose?.();
  }
  send(message) {
    return new Promise((resolve) => {
      const json = serializeMessage(message);
      if (this._stdout.write(json)) {
        resolve();
      } else {
        this._stdout.once("drain", resolve);
      }
    });
  }
};
function checkBearerToken(authHeader, expectedToken) {
  if (!authHeader)
    return false;
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token || token.length !== expectedToken.length)
    return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
}
function bearerValue(authHeader) {
  if (!authHeader)
    return void 0;
  const [scheme, token] = authHeader.split(" ");
  return scheme === "Bearer" && token ? token : void 0;
}
var BUILD_TOKEN_PREFIX = "tjb_";
var DEFAULT_TTL_MS = 2 * 60 * 60 * 1e3;
var MAX_TTL_MS = 6 * 60 * 60 * 1e3;
var SWEEP_EVERY_MS = 5 * 60 * 1e3;
var store = /* @__PURE__ */ new Map();
var lastSweep = 0;
function sweep(now) {
  if (now - lastSweep < SWEEP_EVERY_MS)
    return;
  lastSweep = now;
  for (const [token, entry] of store) {
    if (entry.expiresAt <= now)
      store.delete(token);
  }
}
function isBuildToken(value) {
  return typeof value === "string" && value.startsWith(BUILD_TOKEN_PREFIX);
}
function mintBuildToken(identity, ttlMs = DEFAULT_TTL_MS) {
  const now = Date.now();
  sweep(now);
  const ttl = Math.min(Math.max(ttlMs, 6e4), MAX_TTL_MS);
  const token = `${BUILD_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  const expiresAt = now + ttl;
  store.set(token, { identity, expiresAt });
  return { token, expiresAt };
}
function resolveBuildToken(token) {
  if (!isBuildToken(token))
    return void 0;
  const now = Date.now();
  sweep(now);
  const entry = store.get(token);
  if (!entry)
    return void 0;
  if (entry.expiresAt <= now) {
    store.delete(token);
    return void 0;
  }
  return entry.identity;
}
function revokeBuildToken(token) {
  if (!isBuildToken(token))
    return false;
  return store.delete(token);
}
function mintSecret(env = process.env) {
  const secret = env.MCP_BUILD_TOKEN_SECRET?.trim() || env.TOOLJET_MCP_TOKEN?.trim();
  return secret || void 0;
}
function mintAuthorized(authHeader, secret) {
  if (!authHeader)
    return false;
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token)
    return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
async function readJsonBody(req, maxBodyBytes) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBodyBytes) {
      throw new Error(`Request body exceeds ${maxBodyBytes} bytes`);
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0)
    throw new Error("Request body is required");
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
var MAX_REQUEST_BODY_BYTES = 64 * 1024 * 1024;
function createGatewayHttpServer() {
  const oauth = oauthHttpOptionsFromEnv();
  if (oauth)
    return { server: createOAuthHttpServer(oauth), gatewayMode: false };
  const sharedToken = process.env.MCP_SHARED_TOKEN;
  const gatewayMode = Boolean(sharedToken);
  const requireUserSession = gatewayMode && (/^(1|true|yes|on)$/i.test(process.env.MCP_REQUIRE_USER_SESSION ?? "") || !(process.env.TOOLJET_PAT || process.env.TOOLJET_SESSION_TOKEN));
  const requireRequestUrl = gatewayMode && /^(1|true|yes|on)$/i.test(process.env.MCP_REQUIRE_REQUEST_URL ?? "");
  const handleBuildTokenRequest = async (req, res) => {
    const secret = mintSecret();
    const json = (status, body) => {
      res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
    };
    if (!secret) {
      json(404, { error: "Not found" });
      return;
    }
    if (!mintAuthorized(req.headers.authorization, secret)) {
      json(401, { error: "Build tokens require the mint secret as a bearer." });
      return;
    }
    if (req.method === "DELETE") {
      const token = req.headers["x-tooljet-build-token"];
      json(200, { revoked: revokeBuildToken(Array.isArray(token) ? token[0] : token) });
      return;
    }
    if (req.method !== "POST") {
      res.setHeader("allow", "POST, DELETE");
      json(405, { error: "Method not allowed" });
      return;
    }
    let identity;
    try {
      identity = await identityFromHeaders(req.headers, { allowPat: false });
    } catch (err) {
      json(400, { error: err instanceof Error ? err.message : "Invalid identity headers" });
      return;
    }
    if (!identity?.sessionToken || !identity.workspaceId) {
      json(400, {
        error: `A build token names a signed-in user: send ${SESSION_TOKEN_HEADER} with x-tooljet-workspace-id.`
      });
      return;
    }
    let ttlMs;
    try {
      const chunks = [];
      for await (const chunk of req)
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      if (chunks.length) {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (typeof body?.ttl_seconds === "number")
          ttlMs = body.ttl_seconds * 1e3;
      }
    } catch {
    }
    const minted = mintBuildToken(identity, ttlMs);
    json(200, { token: minted.token, expires_at: new Date(minted.expiresAt).toISOString() });
  };
  const httpServer = createServer(async (req, res) => {
    const requestPath = new URL(req.url ?? "/", "http://localhost").pathname;
    const bearer = bearerValue(req.headers.authorization);
    if (requestPath === "/build-token") {
      await handleBuildTokenRequest(req, res);
      return;
    }
    let buildIdentity;
    if (isBuildToken(bearer)) {
      buildIdentity = resolveBuildToken(bearer);
      if (!buildIdentity) {
        res.writeHead(401, { "Content-Type": "text/plain" }).end("Build token is unknown or expired.");
        return;
      }
    }
    if (gatewayMode && !buildIdentity && !checkBearerToken(req.headers.authorization, sharedToken)) {
      res.writeHead(401, { "Content-Type": "text/plain" }).end("Unauthorized");
      return;
    }
    let identity = buildIdentity;
    try {
      if (!identity)
        identity = await identityFromHeaders(req.headers, { allowPat: !gatewayMode });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid identity headers";
      res.writeHead(400, { "Content-Type": "text/plain" }).end(message);
      return;
    }
    if (!gatewayMode && !identity) {
      if (bearer)
        identity = { pat: bearer };
    }
    const hasUserCredential = Boolean(identity?.pat || identity?.sessionToken);
    if (!hasUserCredential && requireUserSession && !identity?.customerVerified) {
      res.writeHead(400, { "Content-Type": "text/plain" }).end(`This server acts only on behalf of a signed-in user: send the ${SESSION_TOKEN_HEADER} header (with x-tooljet-workspace-id). Refusing rather than using a shared identity.`);
      return;
    }
    if (!identity?.apiUrl && !identity?.customerVerified && requireRequestUrl) {
      res.writeHead(400, { "Content-Type": "text/plain" }).end(`This server acts only on the backend named in the request: send the ${BASE_URL_HEADER} header. Refusing rather than falling back to a fixed TOOLJET_URL.`);
      return;
    }
    if (!gatewayMode && !hasUserCredential && !(process.env.TOOLJET_PAT || process.env.TOOLJET_SESSION_TOKEN)) {
      res.writeHead(401, { "Content-Type": "text/plain" }).end(`No ToolJet credential. Send your personal access token as \`Authorization: Bearer <token>\` or in the ${PAT_HEADER} header, or set TOOLJET_PAT on this server. Create a token in ToolJet under Settings \u2192 Access tokens.`);
      return;
    }
    let parsedBody;
    if (req.method === "POST" && /^application\/json\b/i.test(req.headers["content-type"] ?? "")) {
      try {
        parsedBody = await readJsonBody(req, MAX_REQUEST_BODY_BYTES);
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32700, message: `Parse error: ${err instanceof Error ? err.message : "invalid JSON"}` },
          id: null
        }));
        return;
      }
    }
    const readsResource = !!parsedBody && typeof parsedBody === "object" && !Array.isArray(parsedBody) && parsedBody.method === "resources/read";
    const server = buildServer(identity);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: void 0, enableJsonResponse: readsResource });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    server.connect(transport).then(() => transport.handleRequest(req, res, parsedBody)).catch((err) => {
      console.error("tooljet-mcp: request failed", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain" }).end("Internal Server Error");
      }
    });
  });
  return { server: httpServer, gatewayMode };
}
async function serveHttp() {
  const port = Number(process.env.PORT ?? 8787);
  try {
    allowedApiOrigins();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`tooljet-mcp: invalid ${ALLOWED_API_ORIGINS_VAR}: ${reason}`);
  }
  const { server: httpServer, gatewayMode } = createGatewayHttpServer();
  const host = process.env.MCP_HTTP_HOST ?? (gatewayMode ? "0.0.0.0" : "127.0.0.1");
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, host, resolve);
  });
  console.error(`tooljet-mcp: listening on http://${host}:${port} (${process.env.MCP_OAUTH_ENABLED === "true" ? "OAuth" : gatewayMode ? "gateway" : "direct"} mode)`);
}
async function main() {
  if (process.env.MCP_TRANSPORT === "http") {
    await serveHttp();
    return;
  }
  let server;
  try {
    server = buildServer();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`tooljet-mcp: ${reason}`);
    server = buildUnconfiguredServer(reason);
  }
  await server.connect(new StdioServerTransport());
}
function isEntrypoint() {
  const invoked = process.argv[1];
  if (!invoked)
    return false;
  try {
    return realpathSync(invoked) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
if (isEntrypoint()) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
export {
  createGatewayHttpServer
};
