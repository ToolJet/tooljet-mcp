import { createRequire } from "node:module";
import { $ as JSONRPCMessageSchema, a0 as isInitializeRequest, e as isJSONRPCRequest, a1 as DEFAULT_NEGOTIATED_PROTOCOL_VERSION, Z as SUPPORTED_PROTOCOL_VERSIONS, i as isJSONRPCResultResponse, d as isJSONRPCErrorResponse } from "./chunk-CPgx8ySR.js";
import { e7 as __toESM, e5 as __commonJS, eb as fail, ea as ok, e8 as tableQuotaError } from "./chunk-CYLdCKx-.js";
import { b0 as external_exports } from "./chunk-IinDkEBT.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync, readdirSync, rmSync, renameSync, utimesSync, openSync, closeSync, mkdtempSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, resolve, relative, sep, dirname } from "node:path";
import "node:http";
import { Http2ServerRequest, constants } from "node:http2";
import { Readable } from "node:stream";
import { p as peekAppPlan, c as consumeAppPlan, f as frozenAppRefusal, r as replaceView, a as replaceFingerprint, d as danglingAfterReplace, b as prepareQueryOptionsForWrite, m as matchPlannedPage, l as literalCanvasColor, e as prepareComponentBatch, g as replaceIds, h as expandQueryLifecycles, v as validateEvents, n as navigationReorders, i as persistedEventSpecs } from "./chunk-Do6OHOiG.js";
import { r as resolveRef } from "./chunk-CR8lGQ0p.js";
import { d as componentRef, o as completedPartialWrites, j as indexComponentReferences, i as isFlexContainerType, q as batchChildOrders, c as childOrderProperty } from "./chunk-B7le-Q_T.js";
import { J as validateAppStructure, N as unpinnedLibraries, d as decodeComponentParent, e as encodeComponentParent } from "./chunk-DgRXGydV.js";
import { L as LARGE_READ_ROW_THRESHOLD, k as assessQueryRead, m as resolveStaticBindings, o as resolvedReadRefusal, s as sameReadSource, p as extractRowCount, u as emptyViewerOnlyParams, x as emptyParamsNote, y as unresolvedNote, v as validateQueryOptions, i as issueMessages } from "./chunk-DADofzTT.js";
import { g as getDatasourceQuerySchema } from "./chunk-DXVhSqct.js";
import { fileURLToPath } from "node:url";
createRequire(import.meta.url);
var require_content_type = __commonJS({
  "node_modules/content-type/index.js"(exports) {
    var PARAM_REGEXP = /; *([!#$%&'*+.^_`|~0-9A-Za-z-]+) *= *("(?:[\u000b\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u000b\u0020-\u00ff])*"|[!#$%&'*+.^_`|~0-9A-Za-z-]+) */g;
    var TEXT_REGEXP = /^[\u000b\u0020-\u007e\u0080-\u00ff]+$/;
    var TOKEN_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
    var QESC_REGEXP = /\\([\u000b\u0020-\u00ff])/g;
    var QUOTE_REGEXP = /([\\"])/g;
    var TYPE_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
    exports.format = format;
    exports.parse = parse;
    function format(obj) {
      if (!obj || typeof obj !== "object") {
        throw new TypeError("argument obj is required");
      }
      var parameters = obj.parameters;
      var type = obj.type;
      if (!type || !TYPE_REGEXP.test(type)) {
        throw new TypeError("invalid type");
      }
      var string = type;
      if (parameters && typeof parameters === "object") {
        var param;
        var params = Object.keys(parameters).sort();
        for (var i = 0; i < params.length; i++) {
          param = params[i];
          if (!TOKEN_REGEXP.test(param)) {
            throw new TypeError("invalid parameter name");
          }
          string += "; " + param + "=" + qstring(parameters[param]);
        }
      }
      return string;
    }
    function parse(string) {
      if (!string) {
        throw new TypeError("argument string is required");
      }
      var header = typeof string === "object" ? getcontenttype(string) : string;
      if (typeof header !== "string") {
        throw new TypeError("argument string is required to be a string");
      }
      var index = header.indexOf(";");
      var type = index !== -1 ? header.slice(0, index).trim() : header.trim();
      if (!TYPE_REGEXP.test(type)) {
        throw new TypeError("invalid media type");
      }
      var obj = new ContentType(type.toLowerCase());
      if (index !== -1) {
        var key;
        var match;
        var value;
        PARAM_REGEXP.lastIndex = index;
        while (match = PARAM_REGEXP.exec(header)) {
          if (match.index !== index) {
            throw new TypeError("invalid parameter format");
          }
          index += match[0].length;
          key = match[1].toLowerCase();
          value = match[2];
          if (value.charCodeAt(0) === 34) {
            value = value.slice(1, -1);
            if (value.indexOf("\\") !== -1) {
              value = value.replace(QESC_REGEXP, "$1");
            }
          }
          obj.parameters[key] = value;
        }
        if (index !== header.length) {
          throw new TypeError("invalid parameter format");
        }
      }
      return obj;
    }
    function getcontenttype(obj) {
      var header;
      if (typeof obj.getHeader === "function") {
        header = obj.getHeader("content-type");
      } else if (typeof obj.headers === "object") {
        header = obj.headers && obj.headers["content-type"];
      }
      if (typeof header !== "string") {
        throw new TypeError("content-type header is missing from object");
      }
      return header;
    }
    function qstring(val) {
      var str = String(val);
      if (TOKEN_REGEXP.test(str)) {
        return str;
      }
      if (str.length > 0 && !TEXT_REGEXP.test(str)) {
        throw new TypeError("invalid parameter value");
      }
      return '"' + str.replace(QUOTE_REGEXP, "\\$1") + '"';
    }
    function ContentType(type) {
      this.parameters = /* @__PURE__ */ Object.create(null);
      this.type = type;
    }
  }
});
var import_content_type = __toESM(require_content_type(), 1);
function mediaTypeEssence(header) {
  if (!header) {
    return void 0;
  }
  try {
    return import_content_type.default.parse(header).type;
  } catch {
    const essence = (header.split(";", 1)[0] ?? "").trim().toLowerCase();
    if (essence === "" || header.slice(essence.length).includes(",")) {
      return void 0;
    }
    return essence;
  }
}
function isJsonContentType(header) {
  if (header === "application/json") {
    return true;
  }
  return mediaTypeEssence(header) === "application/json";
}
var DEFAULT_SSE_KEEP_ALIVE_MS = 15e3;
var MAX_TIMER_DELAY_MS = 2 ** 31 - 1;
function armSseKeepAlive(intervalMs, onTick) {
  if (!Number.isFinite(intervalMs) || intervalMs < 1) {
    return void 0;
  }
  const timer = setInterval(onTick, Math.min(intervalMs, MAX_TIMER_DELAY_MS));
  timer.unref?.();
  return timer;
}
var WebStandardStreamableHTTPServerTransport = class {
  constructor(options = {}) {
    this._started = false;
    this._hasHandledRequest = false;
    this._streamMapping = /* @__PURE__ */ new Map();
    this._requestToStreamMapping = /* @__PURE__ */ new Map();
    this._resumableStreams = /* @__PURE__ */ new Set();
    this._requestResponseMap = /* @__PURE__ */ new Map();
    this._initialized = false;
    this._enableJsonResponse = false;
    this._standaloneSseStreamId = "_GET_stream";
    this._closed = false;
    this.sessionIdGenerator = options.sessionIdGenerator;
    this._enableJsonResponse = options.enableJsonResponse ?? false;
    this._eventStore = options.eventStore;
    this._onsessioninitialized = options.onsessioninitialized;
    this._onsessionclosed = options.onsessionclosed;
    this._allowedHosts = options.allowedHosts;
    this._allowedOrigins = options.allowedOrigins;
    this._enableDnsRebindingProtection = options.enableDnsRebindingProtection ?? false;
    this._retryInterval = options.retryInterval;
    this._keepAliveMs = options.keepAliveMs ?? DEFAULT_SSE_KEEP_ALIVE_MS;
  }
  /**
   * Arms a keep-alive interval for an SSE stream that periodically writes an SSE
   * comment frame so intermediaries and idle timeouts don't kill the connection.
   * The returned timer is owned by the stream it was armed for: the stream's
   * cancel/cleanup callbacks must clear it. The interval clears itself if a
   * write fails (stream already closed/cancelled).
   */
  startKeepAlive(controller, encoder) {
    if (this._closed)
      return void 0;
    const timer = armSseKeepAlive(this._keepAliveMs, () => {
      try {
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      } catch {
        if (timer !== void 0)
          clearInterval(timer);
      }
    });
    return timer;
  }
  /**
   * Starts the transport. This is required by the Transport interface but is a no-op
   * for the Streamable HTTP transport as connections are managed per-request.
   */
  async start() {
    if (this._started) {
      throw new Error("Transport already started");
    }
    this._started = true;
  }
  /**
   * Helper to create a JSON error response
   */
  createJsonErrorResponse(status, code, message, options) {
    const error = { code, message };
    if (options?.data !== void 0) {
      error.data = options.data;
    }
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      error,
      id: null
    }), {
      status,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Validates request headers for DNS rebinding protection.
   * @returns Error response if validation fails, undefined if validation passes.
   */
  validateRequestHeaders(req) {
    if (!this._enableDnsRebindingProtection) {
      return void 0;
    }
    if (this._allowedHosts && this._allowedHosts.length > 0) {
      const hostHeader = req.headers.get("host");
      if (!hostHeader || !this._allowedHosts.includes(hostHeader)) {
        const error = `Invalid Host header: ${hostHeader}`;
        this.onerror?.(new Error(error));
        return this.createJsonErrorResponse(403, -32e3, error);
      }
    }
    if (this._allowedOrigins && this._allowedOrigins.length > 0) {
      const originHeader = req.headers.get("origin");
      if (originHeader && !this._allowedOrigins.includes(originHeader)) {
        const error = `Invalid Origin header: ${originHeader}`;
        this.onerror?.(new Error(error));
        return this.createJsonErrorResponse(403, -32e3, error);
      }
    }
    return void 0;
  }
  /**
   * Handles an incoming HTTP request, whether GET, POST, or DELETE
   * Returns a Response object (Web Standard)
   */
  async handleRequest(req, options) {
    if (this._closed) {
      return this.createJsonErrorResponse(404, -32001, "Session not found");
    }
    if (!this.sessionIdGenerator && this._hasHandledRequest) {
      throw new Error("Stateless transport cannot be reused across requests. Create a new transport per request.");
    }
    this._hasHandledRequest = true;
    const validationError = this.validateRequestHeaders(req);
    if (validationError) {
      return validationError;
    }
    switch (req.method) {
      case "POST":
        return this.handlePostRequest(req, options);
      case "GET":
        return this.handleGetRequest(req);
      case "DELETE":
        return this.handleDeleteRequest(req);
      default:
        return this.handleUnsupportedRequest();
    }
  }
  /**
   * Writes a priming event to establish resumption capability.
   * Only sends if eventStore is configured (opt-in for resumability) and
   * the client's protocol version supports empty SSE data (>= 2025-11-25).
   */
  async writePrimingEvent(controller, encoder, streamId, protocolVersion) {
    if (!this._eventStore) {
      return;
    }
    if (protocolVersion < "2025-11-25") {
      return;
    }
    const primingEventId = await this._eventStore.storeEvent(streamId, {});
    let primingEvent = `id: ${primingEventId}
data: 

`;
    if (this._retryInterval !== void 0) {
      primingEvent = `id: ${primingEventId}
retry: ${this._retryInterval}
data: 

`;
    }
    controller.enqueue(encoder.encode(primingEvent));
    this._resumableStreams.add(streamId);
  }
  /**
   * Handles GET requests for SSE stream
   */
  async handleGetRequest(req) {
    const acceptHeader = req.headers.get("accept");
    if (!acceptHeader?.includes("text/event-stream")) {
      this.onerror?.(new Error("Not Acceptable: Client must accept text/event-stream"));
      return this.createJsonErrorResponse(406, -32e3, "Not Acceptable: Client must accept text/event-stream");
    }
    const sessionError = this.validateSession(req);
    if (sessionError) {
      return sessionError;
    }
    const protocolError = this.validateProtocolVersion(req);
    if (protocolError) {
      return protocolError;
    }
    if (this._eventStore) {
      const lastEventId = req.headers.get("last-event-id");
      if (lastEventId) {
        return this.replayEvents(lastEventId);
      }
    }
    if (this._streamMapping.get(this._standaloneSseStreamId) !== void 0) {
      this.onerror?.(new Error("Conflict: Only one SSE stream is allowed per session"));
      return this.createJsonErrorResponse(409, -32e3, "Conflict: Only one SSE stream is allowed per session");
    }
    const encoder = new TextEncoder();
    let streamController;
    let keepAliveTimer = void 0;
    const readable = new ReadableStream({
      start: (controller) => {
        streamController = controller;
      },
      cancel: () => {
        if (keepAliveTimer !== void 0) {
          clearInterval(keepAliveTimer);
        }
        if (this._streamMapping.get(this._standaloneSseStreamId)?.controller === streamController) {
          this._streamMapping.delete(this._standaloneSseStreamId);
        }
      }
    });
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    };
    if (this.sessionId !== void 0) {
      headers["mcp-session-id"] = this.sessionId;
    }
    this._streamMapping.set(this._standaloneSseStreamId, {
      controller: streamController,
      encoder,
      cleanup: () => {
        if (keepAliveTimer !== void 0) {
          clearInterval(keepAliveTimer);
        }
        this._streamMapping.delete(this._standaloneSseStreamId);
        try {
          streamController.close();
        } catch {
        }
      }
    });
    keepAliveTimer = this.startKeepAlive(streamController, encoder);
    return new Response(readable, { headers });
  }
  /**
   * Replays events that would have been sent after the specified event ID
   * Only used when resumability is enabled
   */
  async replayEvents(lastEventId) {
    if (!this._eventStore) {
      this.onerror?.(new Error("Event store not configured"));
      return this.createJsonErrorResponse(400, -32e3, "Event store not configured");
    }
    try {
      let streamId;
      if (this._eventStore.getStreamIdForEventId) {
        streamId = await this._eventStore.getStreamIdForEventId(lastEventId);
        if (!streamId) {
          this.onerror?.(new Error("Invalid event ID format"));
          return this.createJsonErrorResponse(400, -32e3, "Invalid event ID format");
        }
        if (this._streamMapping.get(streamId) !== void 0) {
          this.onerror?.(new Error("Conflict: Stream already has an active connection"));
          return this.createJsonErrorResponse(409, -32e3, "Conflict: Stream already has an active connection");
        }
      }
      const headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      };
      if (this.sessionId !== void 0) {
        headers["mcp-session-id"] = this.sessionId;
      }
      const encoder = new TextEncoder();
      let streamController;
      let keepAliveTimer = void 0;
      let replayedStreamId = void 0;
      let cancelled = false;
      const readable = new ReadableStream({
        start: (controller) => {
          streamController = controller;
        },
        cancel: () => {
          cancelled = true;
          if (keepAliveTimer !== void 0) {
            clearInterval(keepAliveTimer);
          }
          if (replayedStreamId !== void 0 && this._streamMapping.get(replayedStreamId)?.controller === streamController) {
            this._streamMapping.delete(replayedStreamId);
          }
        }
      });
      const replayedEventIds = /* @__PURE__ */ new Set();
      replayedStreamId = await this._eventStore.replayEventsAfter(lastEventId, {
        send: async (eventId, message) => {
          const success = this.writeSSEEvent(streamController, encoder, message, eventId);
          if (!success) {
            this.onerror?.(new Error("Failed replay events"));
            try {
              streamController.close();
            } catch {
            }
          } else {
            replayedEventIds.add(eventId);
          }
        }
      });
      if (this._closed || cancelled) {
        try {
          streamController.close();
        } catch {
        }
        return this.createJsonErrorResponse(404, -32001, "Session not found");
      }
      this._streamMapping.get(replayedStreamId)?.cleanup();
      this._streamMapping.set(replayedStreamId, {
        controller: streamController,
        encoder,
        replayedEventIds,
        cleanup: () => {
          if (keepAliveTimer !== void 0) {
            clearInterval(keepAliveTimer);
          }
          this._streamMapping.delete(replayedStreamId);
          try {
            streamController.close();
          } catch {
          }
        }
      });
      this._resumableStreams.add(replayedStreamId);
      keepAliveTimer = this.startKeepAlive(streamController, encoder);
      return new Response(readable, { headers });
    } catch (error) {
      this.onerror?.(error);
      return this.createJsonErrorResponse(500, -32e3, "Error replaying events");
    }
  }
  /**
   * Writes an event to an SSE stream via controller with proper formatting
   */
  writeSSEEvent(controller, encoder, message, eventId) {
    try {
      let eventData = `event: message
`;
      if (eventId) {
        eventData += `id: ${eventId}
`;
      }
      eventData += `data: ${JSON.stringify(message)}

`;
      controller.enqueue(encoder.encode(eventData));
      return true;
    } catch (error) {
      this.onerror?.(error);
      return false;
    }
  }
  /**
   * Handles unsupported requests (PUT, PATCH, etc.)
   */
  handleUnsupportedRequest() {
    this.onerror?.(new Error("Method not allowed."));
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32e3,
        message: "Method not allowed."
      },
      id: null
    }), {
      status: 405,
      headers: {
        Allow: "GET, POST, DELETE",
        "Content-Type": "application/json"
      }
    });
  }
  /**
   * Handles POST requests containing JSON-RPC messages
   */
  async handlePostRequest(req, options) {
    try {
      const acceptHeader = req.headers.get("accept");
      if (!acceptHeader?.includes("application/json") || !acceptHeader.includes("text/event-stream")) {
        this.onerror?.(new Error("Not Acceptable: Client must accept both application/json and text/event-stream"));
        return this.createJsonErrorResponse(406, -32e3, "Not Acceptable: Client must accept both application/json and text/event-stream");
      }
      const ct = req.headers.get("content-type");
      if (!isJsonContentType(ct)) {
        this.onerror?.(new Error("Unsupported Media Type: Content-Type must be application/json"));
        return this.createJsonErrorResponse(415, -32e3, "Unsupported Media Type: Content-Type must be application/json");
      }
      const requestInfo = {
        headers: Object.fromEntries(req.headers.entries()),
        url: new URL(req.url)
      };
      let rawMessage;
      if (options?.parsedBody !== void 0) {
        rawMessage = options.parsedBody;
      } else {
        try {
          rawMessage = await req.json();
        } catch {
          this.onerror?.(new Error("Parse error: Invalid JSON"));
          return this.createJsonErrorResponse(400, -32700, "Parse error: Invalid JSON");
        }
      }
      let messages;
      try {
        if (Array.isArray(rawMessage)) {
          messages = rawMessage.map((msg) => JSONRPCMessageSchema.parse(msg));
        } else {
          messages = [JSONRPCMessageSchema.parse(rawMessage)];
        }
      } catch {
        this.onerror?.(new Error("Parse error: Invalid JSON-RPC message"));
        return this.createJsonErrorResponse(400, -32700, "Parse error: Invalid JSON-RPC message");
      }
      if (this._closed) {
        return this.createJsonErrorResponse(404, -32001, "Session not found");
      }
      const isInitializationRequest = messages.some(isInitializeRequest);
      if (isInitializationRequest) {
        if (this._initialized && this.sessionId !== void 0) {
          this.onerror?.(new Error("Invalid Request: Server already initialized"));
          return this.createJsonErrorResponse(400, -32600, "Invalid Request: Server already initialized");
        }
        if (messages.length > 1) {
          this.onerror?.(new Error("Invalid Request: Only one initialization request is allowed"));
          return this.createJsonErrorResponse(400, -32600, "Invalid Request: Only one initialization request is allowed");
        }
        this.sessionId = this.sessionIdGenerator?.();
        this._initialized = true;
        if (this.sessionId && this._onsessioninitialized) {
          await Promise.resolve(this._onsessioninitialized(this.sessionId));
        }
      }
      if (!isInitializationRequest) {
        const sessionError = this.validateSession(req);
        if (sessionError) {
          return sessionError;
        }
        const protocolError = this.validateProtocolVersion(req);
        if (protocolError) {
          return protocolError;
        }
      }
      if (this._closed) {
        return this.createJsonErrorResponse(404, -32001, "Session not found");
      }
      const hasRequests = messages.some(isJSONRPCRequest);
      if (!hasRequests) {
        for (const message of messages) {
          this.onmessage?.(message, { authInfo: options?.authInfo, requestInfo });
        }
        return new Response(null, { status: 202 });
      }
      const streamId = crypto.randomUUID();
      const initRequest = messages.find((m) => isInitializeRequest(m));
      const clientProtocolVersion = initRequest ? initRequest.params.protocolVersion : req.headers.get("mcp-protocol-version") ?? DEFAULT_NEGOTIATED_PROTOCOL_VERSION;
      if (this._enableJsonResponse) {
        return new Promise((resolve2) => {
          this._streamMapping.set(streamId, {
            resolveJson: resolve2,
            cleanup: () => {
              this._streamMapping.delete(streamId);
            }
          });
          for (const message of messages) {
            if (isJSONRPCRequest(message)) {
              this._requestToStreamMapping.set(message.id, streamId);
            }
          }
          for (const message of messages) {
            this.onmessage?.(message, { authInfo: options?.authInfo, requestInfo });
          }
        });
      }
      const encoder = new TextEncoder();
      let streamController;
      let keepAliveTimer = void 0;
      const readable = new ReadableStream({
        start: (controller) => {
          streamController = controller;
        },
        cancel: () => {
          if (keepAliveTimer !== void 0) {
            clearInterval(keepAliveTimer);
          }
          if (this._streamMapping.get(streamId)?.controller === streamController) {
            this._streamMapping.delete(streamId);
          }
        }
      });
      const headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      };
      if (this.sessionId !== void 0) {
        headers["mcp-session-id"] = this.sessionId;
      }
      for (const message of messages) {
        if (isJSONRPCRequest(message)) {
          this._streamMapping.set(streamId, {
            controller: streamController,
            encoder,
            cleanup: () => {
              if (keepAliveTimer !== void 0) {
                clearInterval(keepAliveTimer);
              }
              this._streamMapping.delete(streamId);
              try {
                streamController.close();
              } catch {
              }
            }
          });
          this._requestToStreamMapping.set(message.id, streamId);
        }
      }
      try {
        await this.writePrimingEvent(streamController, encoder, streamId, clientProtocolVersion);
        for (const message of messages) {
          let closeSSEStream;
          let closeStandaloneSSEStream;
          if (isJSONRPCRequest(message) && this._eventStore && clientProtocolVersion >= "2025-11-25") {
            closeSSEStream = () => {
              this.closeSSEStream(message.id);
            };
            closeStandaloneSSEStream = () => {
              this.closeStandaloneSSEStream();
            };
          }
          this.onmessage?.(message, { authInfo: options?.authInfo, requestInfo, closeSSEStream, closeStandaloneSSEStream });
        }
      } catch (error) {
        this._streamMapping.get(streamId)?.cleanup();
        this._resumableStreams.delete(streamId);
        for (const message of messages) {
          if (isJSONRPCRequest(message)) {
            this._requestToStreamMapping.delete(message.id);
          }
        }
        throw error;
      }
      if (this._streamMapping.get(streamId)?.controller === streamController) {
        keepAliveTimer = this.startKeepAlive(streamController, encoder);
      }
      return new Response(readable, { status: 200, headers });
    } catch (error) {
      this.onerror?.(error);
      return this.createJsonErrorResponse(400, -32700, "Parse error", { data: String(error) });
    }
  }
  /**
   * Handles DELETE requests to terminate sessions
   */
  async handleDeleteRequest(req) {
    const sessionError = this.validateSession(req);
    if (sessionError) {
      return sessionError;
    }
    const protocolError = this.validateProtocolVersion(req);
    if (protocolError) {
      return protocolError;
    }
    try {
      await Promise.resolve(this._onsessionclosed?.(this.sessionId));
      return new Response(null, { status: 200 });
    } finally {
      await this.close();
    }
  }
  /**
   * Validates session ID for non-initialization requests.
   * Returns Response error if invalid, undefined otherwise
   */
  validateSession(req) {
    if (this.sessionIdGenerator === void 0) {
      return void 0;
    }
    if (!this._initialized) {
      this.onerror?.(new Error("Bad Request: Server not initialized"));
      return this.createJsonErrorResponse(400, -32e3, "Bad Request: Server not initialized");
    }
    const sessionId = req.headers.get("mcp-session-id");
    if (!sessionId) {
      this.onerror?.(new Error("Bad Request: Mcp-Session-Id header is required"));
      return this.createJsonErrorResponse(400, -32e3, "Bad Request: Mcp-Session-Id header is required");
    }
    if (sessionId !== this.sessionId) {
      this.onerror?.(new Error("Session not found"));
      return this.createJsonErrorResponse(404, -32001, "Session not found");
    }
    return void 0;
  }
  /**
   * Validates the MCP-Protocol-Version header on incoming requests.
   *
   * For initialization: Version negotiation handles unknown versions gracefully
   * (server responds with its supported version).
   *
   * For subsequent requests with MCP-Protocol-Version header:
   * - Accept if in supported list
   * - 400 if unsupported
   *
   * For HTTP requests without the MCP-Protocol-Version header:
   * - Accept and default to the version negotiated at initialization
   */
  validateProtocolVersion(req) {
    const protocolVersion = req.headers.get("mcp-protocol-version");
    if (protocolVersion !== null && !SUPPORTED_PROTOCOL_VERSIONS.includes(protocolVersion)) {
      this.onerror?.(new Error(`Bad Request: Unsupported protocol version: ${protocolVersion} (supported versions: ${SUPPORTED_PROTOCOL_VERSIONS.join(", ")})`));
      return this.createJsonErrorResponse(400, -32e3, `Bad Request: Unsupported protocol version: ${protocolVersion} (supported versions: ${SUPPORTED_PROTOCOL_VERSIONS.join(", ")})`);
    }
    return void 0;
  }
  async close() {
    if (this._closed) {
      return;
    }
    this._closed = true;
    this._streamMapping.forEach(({ cleanup }) => {
      cleanup();
    });
    this._streamMapping.clear();
    this._requestResponseMap.clear();
    this._resumableStreams.clear();
    this.onclose?.();
  }
  /**
   * Close an SSE stream for a specific request, triggering client reconnection.
   * Use this to implement polling behavior during long-running operations -
   * client will reconnect after the retry interval specified in the priming event.
   */
  closeSSEStream(requestId) {
    const streamId = this._requestToStreamMapping.get(requestId);
    if (!streamId)
      return;
    const stream = this._streamMapping.get(streamId);
    if (stream) {
      stream.cleanup();
    }
  }
  /**
   * Close the standalone GET SSE stream, triggering client reconnection.
   * Use this to implement polling behavior for server-initiated notifications.
   */
  closeStandaloneSSEStream() {
    const stream = this._streamMapping.get(this._standaloneSseStreamId);
    if (stream) {
      stream.cleanup();
    }
  }
  async send(message, options) {
    let requestId = options?.relatedRequestId;
    if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) {
      requestId = message.id;
    }
    if (requestId === void 0) {
      if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) {
        throw new Error("Cannot send a response on a standalone SSE stream unless resuming a previous client request");
      }
      let eventId;
      if (this._eventStore) {
        eventId = await this._eventStore.storeEvent(this._standaloneSseStreamId, message);
      }
      const standaloneSse = this._streamMapping.get(this._standaloneSseStreamId);
      if (standaloneSse === void 0) {
        return;
      }
      if (standaloneSse.controller && standaloneSse.encoder && (eventId === void 0 || !standaloneSse.replayedEventIds?.has(eventId))) {
        this.writeSSEEvent(standaloneSse.controller, standaloneSse.encoder, message, eventId);
      }
      return;
    }
    const streamId = this._requestToStreamMapping.get(requestId);
    if (!streamId) {
      throw new Error(`No connection established for request ID: ${String(requestId)}`);
    }
    let stream = this._streamMapping.get(streamId);
    if (!this._enableJsonResponse) {
      let eventId;
      if (this._eventStore) {
        eventId = await this._eventStore.storeEvent(streamId, message);
        stream = this._streamMapping.get(streamId);
      }
      if (stream?.controller && stream?.encoder && (eventId === void 0 || !stream.replayedEventIds?.has(eventId))) {
        const written = this.writeSSEEvent(stream.controller, stream.encoder, message, eventId);
        if (written && eventId !== void 0) {
          this._resumableStreams.add(streamId);
        }
      }
    }
    if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) {
      this._requestResponseMap.set(requestId, message);
      const relatedIds = Array.from(this._requestToStreamMapping.entries()).filter(([_, sid]) => sid === streamId).map(([id]) => id);
      const allResponsesReady = relatedIds.every((id) => this._requestResponseMap.has(id));
      if (allResponsesReady) {
        if (!stream) {
          if (this._closed) {
            for (const id of relatedIds) {
              this._requestResponseMap.delete(id);
              this._requestToStreamMapping.delete(id);
            }
            return;
          }
          if (!this._enableJsonResponse && this._eventStore && this._resumableStreams.has(streamId)) {
            for (const id of relatedIds) {
              this._requestResponseMap.delete(id);
              this._requestToStreamMapping.delete(id);
            }
            this._resumableStreams.delete(streamId);
            return;
          }
          for (const id of relatedIds) {
            this._requestResponseMap.delete(id);
            this._requestToStreamMapping.delete(id);
          }
          throw new Error(`No connection established for request ID: ${String(requestId)}`);
        }
        if (this._enableJsonResponse && stream.resolveJson) {
          const headers = {
            "Content-Type": "application/json"
          };
          if (this.sessionId !== void 0) {
            headers["mcp-session-id"] = this.sessionId;
          }
          const responses = relatedIds.map((id) => this._requestResponseMap.get(id));
          if (responses.length === 1) {
            stream.resolveJson(new Response(JSON.stringify(responses[0]), { status: 200, headers }));
          } else {
            stream.resolveJson(new Response(JSON.stringify(responses), { status: 200, headers }));
          }
        } else {
          stream.cleanup();
        }
        for (const id of relatedIds) {
          this._requestResponseMap.delete(id);
          this._requestToStreamMapping.delete(id);
        }
        this._resumableStreams.delete(streamId);
      }
    }
  }
};
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
      await new Promise((resolve2) => setTimeout(resolve2, POLL_MS));
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
  const key = `${active.deployment}\0${appId}`;
  const known = active.authorized.get(key);
  if (known && Date.now() - known.at < grantTtlMs() && (need === "view" || known.edit))
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
  let edit = false;
  if (need === "edit") {
    try {
      edit = await active.client.canEditApp(appId);
    } catch {
      throw new Error(`ToolJet could not confirm that you can edit app ${appId}, so nothing was changed.`);
    }
    if (!edit) {
      active.authorized.set(key, { edit: false, at: Date.now() });
      throw new Error(`You can view app ${appId} but not edit it, so its code cannot be changed, built or installed here.`);
    }
  }
  active.authorized.set(key, { edit, at: Date.now() });
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
    if (args.name && args.name !== found)
      throw new Error(`app ${args.app_id}'s project is "${found}", not "${args.name}"`);
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
var STYLE_FILES = /* @__PURE__ */ new Set(["frontend/styles/theme.css", "frontend/styles/global.css"]);
var editable = (dir, path) => {
  const full = resolve(dir, path);
  const rel = relative(dir, full).split(sep).join("/");
  if (rel === "app.json" || STYLE_FILES.has(rel) || rel.startsWith("frontend/src/") && !rel.endsWith("tooljet.gen.ts"))
    return full;
  throw new Error(`"${path}" is not editable: write app.json, frontend/styles/theme.css, frontend/styles/global.css or files under frontend/src/ (tooljet.gen.ts is generated)`);
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
    else if (TEXT.test(entry.name) && entry.name !== "package-lock.json")
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
async function nameApp(client, dir, name) {
  let snapshot;
  try {
    snapshot = JSON.parse(readFileSync(join(dir, ".tooljet", "snapshot.json"), "utf8"));
  } catch {
    return {};
  }
  if (!client || !snapshot.appId || !snapshot.versionId || !PLACEHOLDER_NAME.test(snapshot.appName ?? ""))
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
    description: "Create the Code mode project for an app you created with create_app: app.json (the app and its routes, its screens) and frontend/ (React + TypeScript on shadcn + Tailwind, react-router through AppRouter). Create the app's queries with add_queries BEFORE this, so the typed hooks it writes (frontend/src/tooljet.gen.ts: useAppQuery, row types, ROUTES, routePath, PAGES) list them. Returns the files and the generated hooks." + USER_WORDS,
    inputSchema: {
      name: external_exports.string().regex(NAME).describe("Project folder: lowercase letters, digits and hyphens, e.g. inventory-console"),
      display_name: external_exports.string().min(1).max(100).describe(`The app's name; an app still called "Untitled App" is renamed to it`),
      app_id: external_exports.string().uuid().describe("The app from create_app")
    },
    handler: inScope(context, async (args) => {
      try {
        await authorizeApp(args.app_id, "edit");
        cleanOldProjects(baseRoot());
        const [existing] = projectsForApp(args.app_id);
        const dir = existing ? join(root(), existing) : projectDir(args.name);
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
          const install = await cli(dir, ["app", "install"]);
          if (install.code !== 0)
            throw new Error(`tooljet app install failed: ${install.output}`);
        }
        const pull = await cli(dir, ["app", "pull"]);
        if (pull.code !== 0)
          throw new Error(`tooljet app pull failed: ${pull.output}`);
        const restored = created ? await restoreStoredCode(dir) : {};
        const naming = await nameApp(context.client, dir, args.display_name);
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
          next: "Set the routes in app.json, write the screens under frontend/src/App/, then code_app_build until ok, then code_app_install."
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
    const install = await cli(dir, ["app", "install"]);
    if (install.code !== 0)
      throw new Error(`tooljet app install failed after bringing the app's code down: ${install.output}`);
  }
  freshProjects.add(dir);
  lastSynced.set(dir, Date.now());
  return {
    stored_code: "This app already has code on ToolJet: the project now holds it, not the template. Read the files you change before writing them, and keep the app's existing screens."
  };
}
async function syncEditorEdits(dir, { force = false } = {}) {
  if (!force && nothingStored.has(dir))
    return {};
  if (force)
    forgetSourceRevision(dir);
  const pull = await cli(dir, ["app", "source-pull"], 6e4);
  if (pull.code !== 0 && /\b(401|403)\b|unauthori[sz]ed|forbidden/i.test(pull.output))
    throw new Error("ToolJet refused access to this app's stored code.");
  if (pull.code !== 0)
    return { sync_warning: `Could not check the ToolJet editor for edits: ${pull.output.trim().slice(0, 300)}` };
  if (/No source is stored/i.test(pull.output))
    nothingStored.add(dir);
  else
    nothingStored.delete(dir);
  lastSynced.set(dir, Date.now());
  return /Pulled revision/.test(pull.output) ? { editor_edits: pull.output.trim() } : {};
}
var freshProjects = /* @__PURE__ */ new Set();
var nothingStored = /* @__PURE__ */ new Set();
var scaffoldHashes = /* @__PURE__ */ new Map();
var readHashes = /* @__PURE__ */ new Map();
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
async function ensureFresh(dir) {
  if (freshProjects.has(dir))
    return {};
  const sync = await syncEditorEdits(dir, { force: true });
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
        const dir = await locateProject(args, "view");
        if (!freshProjects.has(dir))
          await followDraft(dir);
        const sync = !freshProjects.has(dir) ? await ensureFresh(dir) : syncedRecently(dir) ? {} : await syncEditorEdits(dir);
        if (!args.paths?.length)
          return ok({ project_dir: dir, ...sync, files: listFiles(dir) });
        const files = Object.fromEntries(args.paths.map((p) => {
          const full = resolve(dir, p);
          const rel = relative(dir, full).split(sep).join("/");
          if (rel.startsWith(".."))
            throw new Error(`"${p}" is outside the project`);
          const content = readFileSync(full, "utf8");
          readHashes.set(readKey(dir, rel), sha(content));
          return [p, content];
        }));
        return ok({ project_dir: dir, ...sync, files });
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
    description: "Write into a Code mode project: app.json (name, codePage, routes [{id, path, title}]), frontend/styles/theme.css (tokens), frontend/styles/global.css (page-wide rules and library overrides) and anything under frontend/src/. To change an existing file, read it first (code_app_read_files) and pass edits: [{ path, find, replace }] with the exact text to change; files: [{ path, content }] is for new files and for replacing a file still as the template left it, or for a rewrite the request needs (then rewrite: true, as well as the files). A write to a file that changed in the ToolJet editor since you read it is refused: read it again and apply your change to what is there. Read data with useAppQuery from ../tooljet.gen; write by awaiting a query's run({ ...parameters }); route with AppRouter, react-router <Routes>/<Route> whose paths are exactly app.json's, and routePath(id, params). Then code_app_build." + USER_WORDS,
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
          if (!why && before !== void 0 && !args.rewrite && !stillTemplate && isRewrite(before, file.content))
            refusals.push(`${rel}: this replaces most of the file; change only what the request needs with edits (find/replace), or pass rewrite: true if the request really is a rewrite`);
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
        const written = [];
        for (const [rel, { full, content }] of next) {
          mkdirSync(dirname(full), { recursive: true });
          writeFileSync(full, content);
          readHashes.set(readKey(dir, rel), sha(content));
          written.push(rel);
        }
        return ok({ project_dir: dir, ...sync, written });
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
function codeAppBuildTool(context) {
  return {
    name: "code_app_build",
    title: "Build Code Mode App",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description: "Refresh the typed hooks from the app's current queries (tooljet app pull), build the app's code (TypeScript, Tailwind, manifest), and check it against the app (tooljet app check: every useAppQuery name, route, link and page must exist) and the security scan (code rules such as external fetch, eval and token storage; secrets; vendored code). Returns ok and every error, native control and security finding to fix. Repeat write and build until ok, then code_app_install." + USER_WORDS,
    inputSchema: { app_id: APP_ID, name: PROJECT_NAME },
    handler: inScope(context, async (args) => {
      try {
        const dir = await locateProject(args, "edit");
        const followed = await followDraft(dir);
        await ensureFresh(dir);
        const started = Date.now();
        const pull = await cli(dir, ["app", "pull"]);
        const build = await cli(join(dir, "frontend"), ["library", "build"]);
        const tsErrors = Number(/TypeScript compiled \((\d+) errors\)/.exec(build.output)?.[1] ?? (build.code === 0 ? 0 : 1));
        const check = await cli(dir, ["app", "check", "--offline", "--json"]);
        const report = parseReport(check.output);
        const unstyled = missingStylesheet(dir);
        const selects = nativeSelects(dir);
        const handles = badRouteHandles(dir);
        const okBuild = pull.code === 0 && build.code === 0 && tsErrors === 0 && check.code === 0 && !unstyled && !handles.length;
        if (okBuild)
          prefetchFullScan(dir);
        return ok({
          ...followed ? { draft: followed } : {},
          ok: okBuild,
          build_ms: Date.now() - started,
          pull: pull.code === 0 ? "typed hooks refreshed" : pull.output.trim(),
          typescript_errors: tsErrors,
          build_output: build.code === 0 && tsErrors === 0 ? build.output.trim().split("\n").slice(-6).join("\n") : build.output.trim().slice(0, 12e3),
          check: report?.problems ? [...handles, ...unstyled ? [unstyled] : [], ...report.problems.map((p) => `${p.file}:${p.line}  ${p.message}`)] : unstyled || handles.length ? [...handles, ...unstyled ? [unstyled] : [], check.output.trim().slice(0, 6e3)] : check.output.trim().slice(0, 6e3),
          ...selects.length ? { native_controls: { fix: "Use Select from components/ui/select instead of a native <select>.", at: selects } } : {},
          // jsx-a11y recommended rules, warnings only (tooljet app check); fix them when they are cheap to fix.
          a11y_warnings: report?.accessibility?.length ?? Number(/(\d+) accessibility warnings?/.exec(check.output)?.[1] ?? 0),
          // The offline scan (no dependency network checks): fix critical and high before code_app_install.
          security: securitySummary(report?.security)
        });
      } catch (err) {
        return fail(err);
      }
    })
  };
}
function codeAppInstallTool(context) {
  return {
    name: "code_app_install",
    title: "Install Code Mode App",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description: "Upload the app's code (tooljet app dev --once --source platform): it creates or updates the app's Code mode page, one hidden page per route (set each route's page permissions on it) and the component that runs the code, points the app version at this code as a Live preview, and stores the source on ToolJet so the Code panel can edit it. Build first. Runs the full security scan first and refuses while it has critical or high findings, listing them. Returns the editor URL. If it says the source was edited in the ToolJet editor, call code_app_read_files to bring those edits down, reapply your change, and install again. This is the last step of a build or edit: saving the app version (release_app saves a draft first) freezes the code." + USER_WORDS,
    inputSchema: { app_id: APP_ID, name: PROJECT_NAME },
    handler: inScope(context, async (args) => {
      try {
        const dir = await locateProject(args, "edit");
        const followed = await followDraft(dir);
        await ensureFresh(dir);
        nothingStored.delete(dir);
        const unstyled = missingStylesheet(dir);
        if (unstyled)
          return fail(new Error(`Not installed: ${unstyled} Then code_app_build and install again.`));
        const check = await fullScan(dir);
        const security = parseReport(check.output)?.security;
        if (!security || security.error)
          throw new Error(`The security scan did not run, so nothing was installed: ${security?.error ?? check.output.trim().slice(0, 2e3)}`);
        const blocking = mustFix(security);
        if (blocking.length)
          return fail(new Error(`Not installed: the security scan has ${blocking.length} critical or high finding${blocking.length > 1 ? "s" : ""}. Fix them in the code (or remove the package), code_app_build, then install again:
` + blocking.map((f) => `${f.severity.toUpperCase()} ${f.ruleId} ${f.package ?? f.location}: ${f.message}`).join("\n")));
        const result = await cli(dir, ["app", "dev", "--once", "--source", "platform"]);
        if (result.code !== 0)
          throw new Error(result.output.trim());
        return ok({
          ...followed ? { draft: followed } : {},
          linked: true,
          editor_url: /Open: (\S+)/.exec(result.output)?.[1] ?? null,
          output: result.output.trim(),
          security: securitySummary(security)
        });
      } catch (err) {
        return fail(err);
      }
    })
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
        if (!args.packages.length && !args.remove?.length)
          throw new Error("Pass packages to add, or names to remove.");
        const vet = args.packages.length ? await cli(dir, ["app", "vet", ...args.packages, "--json"]) : { code: 0, output: '{"ok":true,"packages":[]}' };
        const report = parseReport(vet.output);
        if (!report?.packages)
          throw new Error(`The package check did not run, so nothing was added: ${vet.output.trim().slice(0, 2e3)}`);
        if (!report.ok)
          return fail(new Error(`Not added: ${report.packages.map((p) => `${p.name}@${p.version}`).join(", ")} fail${report.packages.length > 1 ? "" : "s"} the package check:
` + (report.findings ?? []).map((f) => `${f.severity.toUpperCase()} ${f.ruleId} ${f.package ?? f.location}: ${f.message}`).join("\n")));
        const pkgFile = join(dir, "frontend", "package.json");
        const lockFile = join(dir, "frontend", "package-lock.json");
        const before = readFileSync(pkgFile, "utf8");
        const lockBefore = existsSync(lockFile) ? readFileSync(lockFile, "utf8") : null;
        writeFileSync(pkgFile, JSON.stringify(withDependencies(withoutDependencies(JSON.parse(before), args.remove ?? []), report.packages), null, 2) + "\n");
        const install = await cli(dir, ["app", "install"]);
        if (install.code !== 0) {
          writeFileSync(pkgFile, before);
          if (lockBefore !== null)
            writeFileSync(lockFile, lockBefore);
          throw new Error(`tooljet app install failed, package.json restored: ${install.output.trim().slice(0, 4e3)}`);
        }
        return ok({
          added: report.packages.map((p) => `${p.name}@${p.version}`),
          ...args.remove?.length ? { removed: args.remove } : {},
          not_run: (report.notRun ?? []).map((n) => `${n.id}${n.reason ? `: ${n.reason}` : ""}`),
          // Transitive packages come with the install; code_app_build and code_app_install scan the whole lockfile.
          next: "Import the package in frontend/src, then code_app_build."
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
var consumeBodyDirectOnce = (request) => {
  if (request[bodyConsumedDirectlyKey]) return rejectBodyUnusable();
  request[bodyConsumedDirectlyKey] = true;
};
var toArrayBuffer = (buf) => {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
};
var contentType = (request) => {
  return (request[headersKey] ||= newHeadersFromIncoming(request[incomingKey])).get("content-type") || "";
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
var readBodyWithFastPath = (request, method, fromBuffer) => {
  if (request[bodyConsumedDirectlyKey]) return rejectBodyUnusable();
  const methodName = request.method;
  if (methodName === "GET" || methodName === "HEAD") return request[getRequestCache]()[method]();
  const methodValidationError = validateDirectReadMethod(methodName);
  if (methodValidationError) return Promise.reject(methodValidationError);
  if (request[requestCache]) {
    if (methodName !== "TRACE") return request[requestCache][method]();
  }
  const alreadyUsedError = consumeBodyDirectOnce(request);
  if (alreadyUsedError) return alreadyUsedError;
  const raw = readRawBodyIfAvailable(request);
  if (raw) {
    const result = Promise.resolve(fromBuffer(raw, request));
    request[bodyBufferKey] = void 0;
    return result;
  }
  return readBodyDirect(request).then((buf) => {
    const result = fromBuffer(buf, request);
    request[bodyBufferKey] = void 0;
    return result;
  });
};
var readRawBodyIfAvailable = (request) => {
  const incoming = request[incomingKey];
  if ("rawBody" in incoming && incoming.rawBody instanceof Buffer) return incoming.rawBody;
};
var normalizeAbortError = (request, incoming) => {
  if (incoming.errored) return incoming.errored;
  const reason = request[abortReasonKey];
  if (reason !== void 0) return reason instanceof Error ? reason : new Error(String(reason));
  return /* @__PURE__ */ new Error("Client connection prematurely closed.");
};
var readBodyDirect = (request) => {
  if (request[bodyBufferKey]) return Promise.resolve(request[bodyBufferKey]);
  if (request[bodyReadPromiseKey]) return request[bodyReadPromiseKey];
  const incoming = request[incomingKey];
  if (incoming.readableDidRead) return rejectBodyUnusable();
  const buffered = readBodyBufferedBeforeDisconnect(incoming);
  if (buffered !== void 0) {
    if (buffered instanceof Error) return Promise.reject(buffered);
    request[bodyBufferKey] = buffered;
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
        else if (recovered === void 0) reject(error ?? normalizeAbortError(request, incoming));
        else {
          request[bodyBufferKey] = recovered;
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
        request[bodyBufferKey] = buffer;
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
        reject(normalizeAbortError(request, incoming));
      });
    };
    const cleanup = () => {
      incoming.off("data", onData);
      incoming.off("end", onEnd);
      incoming.off("error", onError);
      incoming.off("close", onClose);
      request[bodyReadPromiseKey] = void 0;
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
  request[bodyReadPromiseKey] = promise;
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
    const request = this[getRequestCache]();
    if (!this[bodyLockReaderKey] && request.body) this[bodyLockReaderKey] = request.body.getReader();
    return request.body;
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
  return readBodyWithFastPath(this, "blob", (buf, request) => {
    const type = contentType(request);
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
var valueOf = (prop) => prop && typeof prop === "object" && "value" in prop ? prop.value : prop;
function htmlFedTextColumns(table, queries) {
  if (table.type !== "Table")
    return [];
  const columns = valueOf(table.properties?.columns);
  if (!Array.isArray(columns))
    return [];
  const data = String(valueOf(table.properties?.data) ?? "");
  const read = new Set([...data.matchAll(/queries\.(\w+)/g)].map((m) => m[1]));
  const code = queries.filter((q) => q.kind === "runjs" && read.has(String(q.name))).map((q) => String(q.options?.code ?? "")).join("\n");
  if (!code)
    return [];
  return columns.filter((col) => {
    if ((col.columnType ?? "string") !== "string" || typeof col.key !== "string" || !col.key)
      return false;
    const key = col.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${key}\\s*:[^,;{}]*?['"\`]\\s*<[a-zA-Z]`).test(code))
      return true;
    const idents = [...code.matchAll(new RegExp(`\\b${key}\\s*:\\s*([A-Za-z_$][\\w$]*)\\s*[,}]`, "g"))].map((m) => m[1]);
    return idents.some((id) => new RegExp(`\\b${id}\\s*=(?!=)[^;]*?['"\`]\\s*<[a-zA-Z]`).test(code));
  });
}
var SCRATCH_NAME = /^(debug|diag|diagnostic|probe|tmp|temp|scratch|dummy|sample_test|testonly)[_-]|^hidden[A-Z]|[_-](probe|scratch)$/i;
function scratchArtifactWarnings(summary) {
  const warnings = [];
  for (const query of summary.queries ?? []) {
    const name = typeof query.name === "string" ? query.name : "";
    if (name && SCRATCH_NAME.test(name)) {
      warnings.push(`Query "${name}" looks like a leftover diagnostic, not part of the app. Delete it before finishing, or rename it if it is genuinely part of what the user asked for.`);
    }
  }
  for (const page of summary.pages ?? []) {
    for (const component of page.components ?? []) {
      const name = typeof component.name === "string" ? component.name : "";
      if (name && SCRATCH_NAME.test(name)) {
        warnings.push(`Component "${name}" on page "${page.name}" looks like a leftover scratch component. Delete it before finishing, or rename it if it is genuinely part of the app.`);
      }
    }
  }
  return warnings;
}
function libraryPinErrors(summary, pins) {
  const components = (summary.pages ?? []).flatMap((page) => page.components ?? []);
  return unpinnedLibraries(components, pins).map(({ library, components: names }) => `Library "${library}" is not pinned on this version, so ${names.length} of its components show an empty "Slot" placeholder (${names.slice(0, 5).join(", ")}${names.length > 5 ? ", ..." : ""}). Adding one of its components with add_components pins it.`);
}
function validatePersistedAppSummary(summary, options = {}) {
  const structural = validateAppStructure(summary, options);
  const errors = [...structural.errors];
  const warnings = [...structural.warnings];
  warnings.push(...scratchArtifactWarnings(summary));
  const eventValidation = validateEvents(summary, persistedEventSpecs(summary), { includePersistedChains: false });
  errors.push(...eventValidation.errors);
  warnings.push(...eventValidation.warnings);
  for (const page of summary.pages ?? []) {
    for (const component of page.components ?? []) {
      for (const col of htmlFedTextColumns(component, summary.queries)) {
        warnings.push(`Table "${String(component.name)}" column "${String(col.key)}" is typed as text but its query returns HTML for it, so it renders as raw text (<span ...>). Set that column's columnType "html", or return plain text.`);
      }
    }
  }
  for (const query of summary.queries) {
    const label = `Query "${query.name ?? query.id}"`;
    if (!query.kind || !query.options || typeof query.options !== "object" || Array.isArray(query.options)) {
      warnings.push(`${label}: kind/options are unavailable, so its datasource contract was not validated.`);
      continue;
    }
    const validation = validateQueryOptions(query.kind, query.options);
    errors.push(...issueMessages(validation.errors, label));
    warnings.push(...issueMessages(validation.warnings, label));
  }
  return {
    ok: errors.length === 0,
    scope: "structural_and_contract",
    checked: [
      "persisted references and bindings",
      "component render traps",
      "event source/trigger compatibility",
      "saved datasource option contracts",
      "leftover diagnostic queries and scratch components"
    ],
    not_checked: [
      "query execution or external API success",
      "mutating/billable query behavior",
      "browser event delivery",
      "visual rendering"
    ],
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)]
  };
}
var SECTIONS = ["properties", "styles", "validation", "others"];
var bundled;
function bundledDefinitions() {
  if (!bundled) {
    const path = resolve(dirname(fileURLToPath(import.meta.url)), "../data/component-default-definitions.json");
    try {
      bundled = JSON.parse(readFileSync(path, "utf8")).definitions;
    } catch {
      bundled = {};
    }
  }
  return bundled;
}
var isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
var WHOLE_ARRAY_TYPES = /* @__PURE__ */ new Set([
  "Table",
  "DropdownV2",
  "MultiselectV2",
  "PopoverMenu",
  "Steps",
  "Tabs",
  "RadioButtonV2",
  "Tags",
  "TagsInput",
  "TreeSelect",
  "Cascader",
  "Navigation",
  "ButtonGroupV2"
]);
function mergeLikeServer(target, source, wholeArrays) {
  if (wholeArrays && Array.isArray(target)) {
    if (source === void 0)
      return target;
    if (Array.isArray(source))
      return source;
    return isPlainObject(source) ? Object.values(source) : source;
  }
  if (Array.isArray(source)) {
    const base = Array.isArray(target) ? [...target] : [];
    source.forEach((item, index) => {
      const merged = mergeLikeServer(base[index], item, wholeArrays);
      if (merged !== void 0 || !(index in base))
        base[index] = merged;
    });
    return base;
  }
  if (isPlainObject(source)) {
    const base = isPlainObject(target) ? { ...target } : {};
    for (const [key, value] of Object.entries(source)) {
      const merged = mergeLikeServer(base[key], value, wholeArrays);
      if (merged !== void 0 || !(key in base))
        base[key] = merged;
    }
    return base;
  }
  return source === void 0 ? target : source;
}
var stable = (value) => JSON.stringify(value, (_key, inner) => isPlainObject(inner) ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : inner);
function sectionAsRead(type, section, stored, definitions = bundledDefinitions()) {
  const wholeArrays = section === "properties" && WHOLE_ARRAY_TYPES.has(type);
  return mergeLikeServer(definitions[type]?.[section] ?? {}, stored ?? {}, wholeArrays);
}
function differingKey(type, section, planned, stored, definitions) {
  const asRead = sectionAsRead(type, section, planned, definitions);
  const have = stored ?? {};
  for (const key of /* @__PURE__ */ new Set([...Object.keys(asRead), ...Object.keys(have)])) {
    if (stable(asRead[key]) !== stable(have[key]))
      return key;
  }
  return void 0;
}
var RECT_KEYS = ["top", "left", "width", "height"];
var FLEX_LAYOUT_KEYS = ["fillWidth", "widthPx", "grow", "minWidthPx"];
var sameRect = (planned, stored) => {
  if (!planned)
    return true;
  if (!stored || typeof stored !== "object")
    return false;
  const held = stored;
  return RECT_KEYS.every((key) => Number(held[key]) === Number(planned[key])) && FLEX_LAYOUT_KEYS.every((key) => planned[key] === void 0 || held[key] === planned[key]);
};
function diffPageInPlace(stored, planned, definitions = bundledDefinitions(), newId = randomUUID) {
  const references = indexComponentReferences(planned);
  if (references.errors.length)
    throw new Error(references.errors.join(" "));
  const storedByName = new Map(stored.filter((component) => component.name).map((component) => [component.name, component]));
  const ids = /* @__PURE__ */ new Map();
  const idOf = /* @__PURE__ */ new Map();
  for (const spec of planned) {
    const id = storedByName.get(spec.name)?.id ?? newId();
    idOf.set(spec, id);
    ids.set(componentRef(spec), id);
  }
  const plannedParentId = (spec) => {
    const parent = spec.parentRef ? ids.get(spec.parentRef) : spec.parent;
    if (!parent)
      return void 0;
    const slot = spec.slotName ?? decodeComponentParent(parent).slotName;
    return slot === "body" ? decodeComponentParent(parent).parentId : void 0;
  };
  const explicitOrders = new Map(planned.flatMap((spec) => {
    if (!isFlexContainerType(spec.type) || spec.properties?.childOrder === void 0)
      return [];
    const raw = spec.properties.childOrder;
    const value = Array.isArray(raw) ? raw : raw?.value;
    return [[idOf.get(spec), Array.isArray(value) ? value : []]];
  }));
  const childOrders = batchChildOrders(planned.map((spec) => ({ id: idOf.get(spec), type: spec.type, parentId: plannedParentId(spec) })), explicitOrders, (ref) => ids.get(ref));
  const diff = { ids, keep: [], relayout: [], create: [], recreated: [], deleteIds: [], why: {} };
  const plannedNames = new Set(planned.map((spec) => spec.name));
  for (const component of stored)
    if (!component.name || !plannedNames.has(component.name))
      diff.deleteIds.push(component.id);
  for (const spec of planned) {
    const id = idOf.get(spec);
    const parent = spec.parentRef ? ids.get(spec.parentRef) : spec.parent;
    const submit = spec.type === "Form" ? spec.properties?.buttonToSubmit : void 0;
    const submitId = submit && typeof submit.value === "string" ? ids.get(submit.value) : void 0;
    let properties = submit && submitId ? { ...spec.properties, buttonToSubmit: { ...submit, value: submitId } } : spec.properties;
    const childOrder = childOrders.get(id);
    if (childOrder)
      properties = { ...properties, childOrder: childOrderProperty(childOrder) };
    const { clientRef: _clientRef, parentRef: _parentRef, ...rest } = spec;
    const parentType = parent ? planned.find((other) => idOf.get(other) === decodeComponentParent(parent).parentId)?.type : void 0;
    const resolved = { ...rest, properties, id, ...parent ? { parent } : {}, ...parentType ? { parentType } : {} };
    if (!parent)
      delete resolved.parent;
    const existing = storedByName.get(spec.name);
    if (!existing) {
      diff.create.push(resolved);
      continue;
    }
    let why;
    if (existing.type !== spec.type)
      why = `type ${existing.type} -> ${spec.type}`;
    else if ((existing.parent ?? void 0) !== (parent ? encodeComponentParent(parent, spec.slotName, parentType) : void 0))
      why = "parent";
    else if (!definitions[spec.type])
      why = "no default definition for this widget";
    else {
      for (const section of SECTIONS) {
        const key = differingKey(spec.type, section, section === "properties" ? properties : spec[section], existing[section], definitions);
        if (key !== void 0) {
          why = `${section}.${key}`;
          break;
        }
      }
    }
    if (why) {
      diff.deleteIds.push(existing.id);
      diff.create.push(resolved);
      diff.recreated.push(spec.name);
      diff.why[spec.name] = why;
      continue;
    }
    const layouts = existing.layouts ?? {};
    const desktop = spec.layouts?.desktop ?? spec.layout;
    const mobile = spec.layouts?.mobile ?? spec.layout;
    if (sameRect(desktop, layouts.desktop) && sameRect(mobile, layouts.mobile))
      diff.keep.push(spec.name);
    else
      diff.relayout.push({ componentId: existing.id, ...desktop ? { desktop } : {}, ...mobile ? { mobile } : {} });
  }
  return diff;
}
var REMOTE_RESULT_MAX_JSON_CHARS = 3e4;
function queryResultBindingHint(query, result) {
  const data = result.data;
  const options = query.options;
  if (result.status !== "ok" || query.kind !== "tooljetdb" || options?.operation !== "sql_execution" || !data || !Array.isArray(data.results))
    return void 0;
  return {
    rows_path: "data.results",
    row_count: data.results.length,
    guidance: "This ToolJet DB SQL read returned an object containing results. Bind row consumers to queries.<name>.data.results (or data?.results ?? []), not data.map/filter or data[0]. Other operations can return different shapes; preserve the actual returned contract."
  };
}
function truncateRemoteResult(result) {
  if (!Object.prototype.hasOwnProperty.call(result, "data"))
    return { result };
  let serialized;
  try {
    serialized = JSON.stringify(result.data);
  } catch {
    return {
      result: { ...result, data: { mcp_truncated: true, preview_json: "<unserializable response>" } },
      warning: "The REST response data could not be serialized for MCP output; inspect it in ToolJet."
    };
  }
  if (typeof serialized !== "string")
    return { result };
  if (serialized.length <= REMOTE_RESULT_MAX_JSON_CHARS)
    return { result };
  return {
    result: {
      ...result,
      data: {
        mcp_truncated: true,
        original_json_characters: serialized.length,
        preview_json: serialized.slice(0, REMOTE_RESULT_MAX_JSON_CHARS)
      }
    },
    warning: `REST response data exceeded ${REMOTE_RESULT_MAX_JSON_CHARS} JSON characters and was truncated in MCP output. The remote request already completed; add API-specific pagination or a smaller limit before another run.`
  };
}
function containsComponentBinding(value) {
  if (typeof value === "string")
    return /\bcomponents\s*\./.test(value);
  if (Array.isArray(value))
    return value.some(containsComponentBinding);
  if (value && typeof value === "object")
    return Object.values(value).some(containsComponentBinding);
  return false;
}
function datasourceRecovery(query) {
  if (!query.datasource_settings_url)
    return void 0;
  return {
    action: "open_datasource_settings",
    url: query.datasource_settings_url,
    instruction: "Ask the user to repair or test the connection in ToolJet. If an in-app browser is available, open this URL; do not enter credentials, authorize OAuth, test, or save settings for the user. Retry only after they confirm the repair."
  };
}
var CONNECTION_SQLSTATE_PREFIXES = ["08", "28", "53", "57P0", "3D000"];
var SCHEMA_NAME_SQLSTATES = /* @__PURE__ */ new Set(["42P01", "42703", "3F000", "42P02", "42704"]);
var LEGACY_CONNECTION_CODES = /* @__PURE__ */ new Set([
  "ELOGIN",
  "ESOCKET",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ER_ACCESS_DENIED_ERROR",
  "ER_DBACCESS_DENIED_ERROR",
  "ER_BAD_DB_ERROR",
  "PROTOCOL_CONNECTION_LOST"
]);
var LEGACY_SCHEMA_CODES = /* @__PURE__ */ new Set(["ER_BAD_FIELD_ERROR", "ER_BAD_TABLE_ERROR", "ER_NO_SUCH_TABLE"]);
function classifyQueryFailure(result) {
  if (!result)
    return "unknown";
  const details = result.data;
  if (details?.name === "SyntaxError" && typeof result.description === "string" && result.description.startsWith("JSON5:"))
    return "query";
  const category = result.category;
  if (category === "authentication" || category === "connection")
    return "connection";
  if (category === "schema_name")
    return "schema_name";
  if (category === "unknown")
    return "unknown";
  if (["timeout", "rate_limit", "transient", "query"].includes(String(category)))
    return "query";
  if (typeof category === "string")
    return "unknown";
  const data = result.data;
  const codes = data && typeof data === "object" ? [data.code, data.sqlState, data.sqlstate].map((value) => String(value ?? "").toUpperCase()).filter(Boolean) : [];
  if (codes.some((code) => CONNECTION_SQLSTATE_PREFIXES.some((prefix) => code.startsWith(prefix))) || codes.some((code) => LEGACY_CONNECTION_CODES.has(code)))
    return "connection";
  if (codes.some((code) => SCHEMA_NAME_SQLSTATES.has(code) || LEGACY_SCHEMA_CODES.has(code)))
    return "schema_name";
  return codes.length ? "query" : "unknown";
}
function failureRecovery(query, result) {
  return classifyQueryFailure(result) === "connection" ? datasourceRecovery(query) : void 0;
}
function failureVerification(query, result) {
  if (!query.data_source_id || classifyQueryFailure(result) !== "unknown")
    return void 0;
  return {
    action: "test_datasource_connection",
    datasource_id: query.data_source_id,
    instruction: "Test this same saved datasource before diagnosing the failure. If testing is unsupported or inconclusive, ask the user before one bounded read. Never substitute another datasource from an unknown failure."
  };
}
function introspectedNames(result) {
  const data = result?.data;
  if (!Array.isArray(data))
    return [];
  return data.map((row) => typeof row === "string" ? row : row?.value ?? row?.label ?? row?.name).filter((value) => typeof value === "string" && value.length > 0);
}
async function availableTableNames(client, query) {
  if (!query.data_source_id || !query.kind)
    return void 0;
  const methods = getDatasourceQuerySchema(query.kind)?.introspectionMethods ?? [];
  const tableMethod = ["listTables", "list_tables", "getTables", "tables"].find((m) => methods.includes(m));
  if (!tableMethod)
    return void 0;
  let methodArgs;
  if (methods.includes("listSchemas")) {
    const schemas = introspectedNames(await client.invokeDatasourceMethod({ dataSourceId: query.data_source_id, method: "listSchemas" }));
    const schema = schemas.includes("public") ? "public" : schemas[0];
    if (schema)
      methodArgs = { schema };
  }
  const tableResult = await client.invokeDatasourceMethod({
    dataSourceId: query.data_source_id,
    method: tableMethod,
    ...methodArgs ? { args: methodArgs } : {}
  });
  const names = introspectedNames(tableResult);
  return names.length ? names : void 0;
}
async function schemaNameHint(client, query, result) {
  if (classifyQueryFailure(result) !== "schema_name")
    return void 0;
  const data = result.data;
  const code = data && typeof data === "object" ? String(data.code ?? "") : "";
  const hint = {
    kind: "schema_name_error",
    detail: String(result.description ?? result.message ?? "a table or column named in the query does not exist"),
    ...code ? { sqlstate: code } : {},
    guidance: "This is a schema/name error, NOT a connection problem \u2014 the datasource is reachable, so do NOT ask the user to repair or test the connection. A table or column named in the SQL does not exist. Call inspect_datasource_schema (listTables, then listColumns for the target table) to get the EXACT names, correct the query, and retry. Never guess table or column names."
  };
  try {
    const tables = await availableTableNames(client, query);
    if (tables?.length)
      hint.available_tables = tables.slice(0, 50);
  } catch {
  }
  return hint;
}
function runQueryTool(client) {
  return {
    name: "run_query",
    title: "Run Query",
    // Executes whatever the query holds against the customer datasource — which may write or delete.
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: `Run an already-created query and return its REAL result \u2014 the browser-free way to see actual data. Use it to (a) verify a query works before binding UI to it, and (b) inspect real column values / distinct values (statuses, categories) before writing chart series, dropdown options, or filters. The query must already exist (create it with add_query first). Returns { status: "ok"|"failed", data: <datasource result>, ... }; data may be an array or an object (ToolJet DB SQL uses data.results). Inspect the actual shape before binding components. HTTP is 200 even on failure, so CHECK \`status\` and read \`message\` on failure. Runs the SAVED query as-is; it does not mutate it. SELECT * is always refused. Reads with no static limit at or below ${LARGE_READ_ROW_THRESHOLD} rows require an unfiltered, same-datasource count_query_id first; if the observed count is larger, retry only after explicit user approval with user_confirmed_large_read:true. BigQuery, Snowflake, and Redshift reads also require explicit cost approval with user_confirmed_billable_read:true, even when row-limited. Never set confirmation flags from inferred consent. A static remote read (including REST GET and Supabase rows) requires separate approval with user_confirmed_remote_read:true because it may expose sensitive data or consume quota; remote writes are refused. If saved options reference \`components.*\`, the result includes a warning because browser-free execution cannot prove the component-resolved pagination/filter behavior.`,
    inputSchema: {
      query_id: external_exports.string(),
      version_id: external_exports.string(),
      environment_id: external_exports.string().optional(),
      count_query_id: external_exports.string().optional(),
      user_confirmed_large_read: external_exports.boolean().optional(),
      user_confirmed_billable_read: external_exports.boolean().optional(),
      user_confirmed_remote_read: external_exports.boolean().optional()
    },
    async handler(args) {
      try {
        const warnings = [];
        const query = await client.getQuery(args.query_id, args.version_id).catch(async (error) => {
          const saved = await client.getQueries(args.version_id);
          const resolution = resolveRef(saved, args.query_id, "Query", `on version "${args.version_id}"`);
          if (!resolution.ok)
            throw new Error(resolution.error, { cause: error });
          return resolution.target;
        });
        const assessment = assessQueryRead(query);
        if (!assessment.provenRead || assessment.selectStar) {
          return fail(new Error(`run_query refused query "${query.name ?? query.id}" before execution: ${assessment.reason ?? "not a proven read"}`));
        }
        const staticBindings = resolveStaticBindings(query.options);
        const bindingRefusal = resolvedReadRefusal(query, assessment, staticBindings.resolved);
        if (bindingRefusal) {
          return fail(new Error(`run_query refused query "${query.name ?? query.id}" before execution: ${bindingRefusal}`));
        }
        if (containsComponentBinding(query.options)) {
          warnings.push('Saved query options reference components.*. Browser-free run_query cannot resolve live component state. A missing/undefined filter parameter here is not proof the saved SQL is wrong. Verify in the viewer before rewriting the query; preserve output aliases and every consumer when a real repair is needed. Even status:"ok" does not prove live filter or pagination behavior.');
        }
        if (assessment.requiresRemoteReadConfirmation && !args.user_confirmed_remote_read) {
          return fail(new Error(`run_query refused remote read "${query.name ?? query.id}" before execution: remote reads can expose sensitive data, consume API quota, and return an unbounded payload. Tell the user which saved query will run and ask explicitly; retry with user_confirmed_remote_read:true only after they approve that request.`));
        }
        if (assessment.requiresRemoteReadConfirmation) {
          warnings.push(assessment.datasourceKind === "restapi" ? "User-confirmed REST GET: the remote API controls response size and quota. Inspect metadata.request and metadata.response, and add API-specific pagination before another run when needed." : "User-confirmed remote read: the datasource controls response size and quota.");
        }
        if (assessment.requiresBillableReadConfirmation && !args.user_confirmed_billable_read) {
          return fail(new Error(`run_query refused query "${query.name ?? query.id}" before execution: ${query.kind} reads can incur warehouse/scan charges even with a row LIMIT. Explain that cost to the user and retry with user_confirmed_billable_read:true only after explicit approval.`));
        }
        let preflight;
        if (assessment.requiresCountPreflight) {
          if (!args.count_query_id) {
            return fail(new Error(`run_query refused query "${query.name ?? query.id}" before execution: ${assessment.reason ?? "result size is not bounded"} Create a same-source COUNT(*)/ToolJet DB count-aggregate query and retry with count_query_id. Use server-side pagination when the count exceeds ${LARGE_READ_ROW_THRESHOLD}.`));
          }
          if (args.count_query_id === args.query_id || args.count_query_id === query.id) {
            return fail(new Error("count_query_id must be a separate count-only query."));
          }
          const countQuery = await client.getQuery(args.count_query_id, args.version_id);
          const countAssessment = assessQueryRead(countQuery);
          const countCanRun = countAssessment.directSafe || countAssessment.requiresBillableReadConfirmation === true && args.user_confirmed_billable_read === true || countAssessment.requiresRemoteReadConfirmation === true && args.user_confirmed_remote_read === true;
          if (!countAssessment.countOnly || !countCanRun || countAssessment.requiresCountPreflight || !sameReadSource(assessment, countAssessment)) {
            return fail(new Error(`run_query refused the count preflight: "${countQuery.name ?? countQuery.id}" must be an unfiltered COUNT(*) (or ToolJet DB count of the generated id) against the same datasource and simple table as the target query.`));
          }
          const countResult = await client.runQuery({
            queryId: countQuery.id,
            versionId: args.version_id,
            environmentId: args.environment_id
          });
          const rowCount2 = extractRowCount(countResult);
          if (rowCount2 === void 0) {
            return fail(new Error(`Count preflight "${countQuery.name ?? countQuery.id}" did not return one row with exactly one numeric count; target query was not run.`));
          }
          preflight = { count_query_id: countQuery.id, row_count: rowCount2, threshold: LARGE_READ_ROW_THRESHOLD };
          if (rowCount2 > LARGE_READ_ROW_THRESHOLD && !args.user_confirmed_large_read) {
            return fail(new Error(`Target query was not run: count preflight found ${rowCount2} rows, above the ${LARGE_READ_ROW_THRESHOLD}-row threshold. Recommend server-side pagination. If a full read is still necessary, tell the user the observed count and ask explicitly; retry with user_confirmed_large_read:true only after they approve.`));
          }
          if (rowCount2 > LARGE_READ_ROW_THRESHOLD) {
            warnings.push(`User-confirmed large read: count preflight found ${rowCount2} rows. Server-side pagination remains recommended.`);
          }
        }
        let result;
        try {
          const bindings = staticBindings;
          const emptied = emptyViewerOnlyParams(query.options, bindings);
          if (emptied.length)
            warnings.push(emptyParamsNote(emptied));
          const liveOnly = bindings.unresolved.filter((b) => !/components\./.test(b));
          if (liveOnly.length)
            warnings.push(unresolvedNote(liveOnly));
          result = await client.runQuery({
            queryId: query.id,
            versionId: args.version_id,
            environmentId: args.environment_id,
            resolvedOptions: bindings.resolved
          });
        } catch (error) {
          return ok({
            status: "failed",
            message: error instanceof Error ? error.message : String(error),
            ...preflight ? { preflight } : {},
            ...warnings.length ? { warnings } : {}
          });
        }
        const failed = result.status === "failed";
        const bindingHint = queryResultBindingHint(query, result);
        const recovery = failed ? failureRecovery(query, result) : void 0;
        const verification = failed ? failureVerification(query, result) : void 0;
        const schemaHint = failed ? await schemaNameHint(client, query, result) : void 0;
        const output = assessment.requiresRemoteReadConfirmation ? truncateRemoteResult(result) : { result };
        if (output.warning)
          warnings.push(output.warning);
        return ok({
          ...output.result,
          // Trusted execution evidence, separate from datasource-supplied data. No credentials,
          // URLs or row contents are needed for the agent's early migration/readiness checkpoint.
          execution: { query_id: query.id, datasource_kind: query.kind, read_only: true },
          ...bindingHint ? { binding_hint: bindingHint } : {},
          ...preflight ? { preflight } : {},
          ...warnings.length ? { warnings } : {},
          ...recovery ? { recovery } : {},
          ...verification ? { verification } : {},
          ...schemaHint ? { schema_hint: schemaHint } : {}
        });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
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
function runQueriesTool(client) {
  return {
    name: "run_queries",
    title: "Run Queries",
    // Executes whatever the queries hold against the customer datasource — which may write or delete.
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: "Run 1\u201310 already-created, proven read-only queries concurrently and return ordered per-query results. It currently accepts ToolJet DB list_rows/join_tables and SQL datasource list_rows or one bounded explicit-column SELECT/SHOW/DESCRIBE/EXPLAIN read. Every query is preflighted before any execution; SELECT *, unbounded reads, mutations, RunJS, paid/remote API operations, and unknown kinds are refused \u2014 remote API reads (restapi, openapi, servicenow, influxdb) can never run here; use singular run_query with user_confirmed_remote_read. Metadata and the environment are loaded once. Returns {queries:[{query_id,name,status,data|message,warnings?}]}; one runtime failure does not hide other read results. Pass include_data:false to only confirm each query runs \u2014 the result drops the rows and returns {status,row_count} instead, for lightweight post-build verification. Use singular run_query with count_query_id for a count-first large-read preflight. Component-bound options receive the run_query viewer warning.",
    inputSchema: {
      query_ids: external_exports.array(external_exports.string()).min(1).max(10),
      version_id: external_exports.string(),
      environment_id: external_exports.string().optional(),
      include_data: external_exports.boolean().optional().describe("Default true. Set false to verify execution without returning rows: each result keeps status/message/warnings and adds row_count, but omits data. Use for smoke checks that only need the run status.")
    },
    async handler(args) {
      try {
        if (new Set(args.query_ids).size !== args.query_ids.length) {
          return fail(new Error("run_queries query_ids must be unique."));
        }
        const saved = await client.getQueries(args.version_id);
        const byId = new Map(saved.map((query) => [query.id, query]));
        const resolveWarnings = [];
        const resolveErrors = [];
        args = {
          ...args,
          query_ids: args.query_ids.map((queryId) => {
            if (byId.has(queryId))
              return queryId;
            const resolution = resolveRef(saved, queryId, "Query", `on version "${args.version_id}"`);
            if (!resolution.ok) {
              resolveErrors.push(resolution.error);
              return queryId;
            }
            if (resolution.warning)
              resolveWarnings.push(resolution.warning);
            return resolution.target.id;
          })
        };
        if (resolveErrors.length)
          return fail(new Error(resolveErrors.join(" ")));
        const unsafe = args.query_ids.flatMap((queryId) => {
          const verdict = batchSafeRead(byId.get(queryId));
          return verdict.safe ? [] : [`${queryId}: ${verdict.reason}`];
        });
        if (unsafe.length) {
          return fail(new Error(`run_queries refused ${unsafe.length === 1 ? "a query" : "queries"} before execution: ${unsafe.join("; ")}`));
        }
        const environmentId = args.environment_id ?? await client.getDevelopmentEnvironmentId();
        const queries = await Promise.all(args.query_ids.map(async (queryId) => {
          const query = byId.get(queryId);
          const warnings = containsComponentBinding(query.options) ? ["Saved query options reference components.*. Browser-free run_queries does not resolve live component state; verify pagination/filter values in the viewer."] : [];
          try {
            const bindings = resolveStaticBindings(query.options);
            const emptied = emptyViewerOnlyParams(query.options, bindings);
            if (emptied.length)
              warnings.push(emptyParamsNote(emptied));
            const liveOnly = bindings.unresolved.filter((b) => !/components\./.test(b));
            if (liveOnly.length)
              warnings.push(unresolvedNote(liveOnly));
            const result = await client.runQuery({ queryId, versionId: args.version_id, environmentId, resolvedOptions: bindings.resolved });
            const failed = result.status === "failed";
            const bindingHint = queryResultBindingHint(query, result);
            const recovery = failed ? failureRecovery(query, result) : void 0;
            const verification = failed ? failureVerification(query, result) : void 0;
            const schemaHint = failed ? await schemaNameHint(client, query, result) : void 0;
            const shaped = args.include_data === false ? (() => {
              const { data, ...rest } = result;
              return Array.isArray(data) ? { ...rest, row_count: data.length } : bindingHint ? { ...rest, row_count: bindingHint.row_count } : rest;
            })() : result;
            return {
              query_id: queryId,
              ...query.name ? { name: query.name } : {},
              ...shaped,
              execution: { query_id: queryId, datasource_kind: query.kind, read_only: true },
              ...bindingHint ? { binding_hint: bindingHint } : {},
              ...warnings.length ? { warnings } : {},
              ...recovery ? { recovery } : {},
              ...verification ? { verification } : {},
              ...schemaHint ? { schema_hint: schemaHint } : {}
            };
          } catch (error) {
            const failure = { status: "failed", message: error instanceof Error ? error.message : String(error) };
            return {
              query_id: queryId,
              ...query.name ? { name: query.name } : {},
              ...failure,
              ...warnings.length ? { warnings } : {}
            };
          }
        }));
        return ok({ queries });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
var MAX_READS = 10;
var CLOCK_SKEW = /JWT issued at future/i;
var CLOCK_SKEW_RETRY_MS = 1500;
var REASON_CHARS = 160;
var rowCount = (result) => {
  const data = result.data;
  if (Array.isArray(data))
    return data.length;
  return void 0;
};
async function checkPlanReads(client, params) {
  const wanted = [...new Set(params.queryIds)];
  if (!wanted.length)
    return void 0;
  const saved = await client.getQueries(params.versionId);
  const byId = new Map(saved.map((query) => [query.id, query]));
  const check = { ran: 0, rows: {}, failed: [], inconclusive: [], not_run: [] };
  const runnable = [];
  for (const id of wanted) {
    const query = byId.get(id);
    if (!query)
      continue;
    const name = query.name ?? id;
    const verdict = batchSafeRead(query);
    if (!verdict.safe) {
      check.not_run.push({ name, reason: String(verdict.reason ?? "not a proven bounded read").slice(0, REASON_CHARS) });
    } else if (runnable.length >= MAX_READS) {
      check.not_run.push({ name, reason: `only the first ${MAX_READS} reads of a phase are checked; run this one with run_queries` });
    } else {
      runnable.push(id);
    }
  }
  if (!runnable.length)
    return check;
  const environmentId = params.environmentId ?? await client.getDevelopmentEnvironmentId();
  await Promise.all(runnable.map(async (id) => {
    const query = byId.get(id);
    const name = query.name ?? id;
    const needsViewer = containsComponentBinding(query.options);
    const run2 = async () => {
      try {
        const bindings = resolveStaticBindings(query.options);
        emptyViewerOnlyParams(query.options, bindings);
        return await client.runQuery({ queryId: id, versionId: params.versionId, environmentId, resolvedOptions: bindings.resolved });
      } catch (error) {
        return { status: "failed", message: error instanceof Error ? error.message : String(error) };
      }
    };
    let result = await run2();
    if (result.status === "failed" && CLOCK_SKEW.test(String(result.message ?? result.description ?? ""))) {
      await new Promise((resolve2) => setTimeout(resolve2, params.retryDelayMs ?? CLOCK_SKEW_RETRY_MS));
      result = await run2();
    }
    check.ran += 1;
    if (result.status !== "failed") {
      const rows = rowCount(result);
      if (rows !== void 0)
        check.rows[name] = rows;
      return;
    }
    const message = String(result.message ?? result.description ?? "the query failed").slice(0, 600);
    if (needsViewer) {
      check.inconclusive.push({
        name,
        message,
        note: "This query reads components.*, which a browser-free run leaves empty: the failure may be about the missing value. Check that the query also works when that input is empty, or give the input a default."
      });
      return;
    }
    const schemaHint = await schemaNameHint(client, query, result).catch(() => void 0);
    check.failed.push({ name, message, ...schemaHint ? { schema_hint: schemaHint } : {} });
  }));
  return check;
}
function logicalRef(value) {
  return value.client_ref ?? value.name;
}
function sourceTarget(sourceType, ref, pages, queries, components) {
  if (sourceType === "page")
    return pages.get(ref);
  if (sourceType === "data_query")
    return queries.get(ref);
  return components.get(ref);
}
function resolveAction(raw, pages, queries, components) {
  const { target_ref: explicitRef, ...action } = raw;
  const targetRef = explicitRef ?? (action.actionId === "run-query" ? action.queryId ?? action.queryName : void 0);
  if (targetRef === void 0)
    return action;
  if (typeof targetRef !== "string")
    throw new Error("Event action target_ref must be a string.");
  const actionId = String(action.actionId);
  const target = actionId === "run-query" ? queries.get(targetRef) : actionId === "switch-page" ? pages.get(targetRef) : ["show-modal", "close-modal", "control-component", "set-table-page", "scroll-component-into-view"].includes(actionId) ? components.get(targetRef) : void 0;
  if (!target)
    throw new Error(`Action "${actionId}" has unknown or unsupported target_ref "${targetRef}".`);
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
function refs(values, targets, label) {
  return values?.map((ref) => {
    const target = targets.get(ref);
    if (!target)
      throw new Error(`${label} ref "${ref}" does not exist.`);
    return target.id;
  });
}
function oneRef(value, targets, label) {
  if (!value)
    return void 0;
  const target = targets.get(value);
  if (!target)
    throw new Error(`${label} ref "${value}" does not exist.`);
  return target.id;
}
function appliedSummary(applied) {
  return Object.entries(applied).map(([key, value]) => `${key}=${value}`).join(", ");
}
var TABLE_READY_DELAYS_MS = [100, 200, 400, 800, 1e3];
async function waitForCreatedTables(client, tableNames) {
  await Promise.all(tableNames.map(async (tableName) => {
    let lastError;
    for (let attempt = 0; attempt <= TABLE_READY_DELAYS_MS.length; attempt += 1) {
      try {
        const [tables, schema] = await Promise.all([client.listTables(), client.getTableSchema(tableName)]);
        if (!tables.some((table) => table.table_name === tableName)) {
          throw new Error(`table is not visible in list_tables yet`);
        }
        if (!schema.length)
          throw new Error("schema has no columns yet");
        return;
      } catch (error) {
        lastError = error;
        const delay = TABLE_READY_DELAYS_MS[attempt];
        if (delay === void 0)
          break;
        await new Promise((resolve2) => setTimeout(resolve2, delay));
      }
    }
    throw new Error(`Created table "${tableName}" did not become readable before seeding: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }));
}
function applyAppPhaseTool(client) {
  return {
    name: "apply_app_phase",
    title: "Apply App Phase",
    // Creates, and amends page metadata or the app name when the approved plan says to. It drops no table and deletes
    // no row; the one delete path is a plan page marked replace, whose old components and events it removes.
    annotations: {
      readOnlyHint: false,
      // A plan page marked replace has its components and their events deleted before the plan's are created.
      destructiveHint: true,
      openWorldHint: true
    },
    description: "Consume one successful lint_app_spec plan_token and apply that exact phase once. The tool resolves logical refs, creates tables/pages/queries in dependency order, seeds rows, creates independent page component batches concurrently, combines ordinary events and mutation lifecycles into one bulk write, then returns persisted structural/contract validation. It then runs the proven read queries the phase created or updated once and reports them in read_check (failed: fix the query; inconclusive: the read takes a component value a browser-free run leaves empty; not_run: writes, remote or paid calls and RunJS, which are never run here). A failing read does not fail the phase. ToolJet has no cross-resource transaction: a rare upstream partial failure reports the completed stage/counts and never auto-deletes user data, except for a plan page marked replace: that page ends up holding exactly the plan's components. It is written as a difference: a component the plan leaves as it is is not rewritten, one that only moved is moved, one that changed is created again under its own id, and one the plan drops is deleted, with the events on the page's components replaced by the plan's (page events and query events only where the plan declares them again); queries the plan defines again are updated in place keeping their ids. A replace is refused before any write if the page changed since lint (any component, redefined query or related event edited), and every component and event ref is prepared before the first write. A replace is not atomic: a failure midway leaves the page to be repaired (the result says what was removed; there is no rollback), so use replace on draft or otherwise recoverable pages. The one-time token prevents an accidental retry from duplicating objects.",
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string().optional().describe("Defaults to the version the plan was linted for."),
      plan_token: external_exports.string(),
      check_reads: external_exports.boolean().optional().describe("Default true: after the phase is written, the proven read queries it created or updated are run once and the result carries read_check {ran, rows, failed, inconclusive, not_run}. Writes, remote or paid calls and RunJS are never run. false skips the check.")
    },
    async handler(input) {
      const peeked = peekAppPlan(input.plan_token);
      if (peeked) {
        const planVersion = peeked.spec.version_id;
        const mismatch = peeked.spec.app_id && peeked.spec.app_id !== input.app_id ? `Plan app_id "${peeked.spec.app_id}" does not match "${input.app_id}".` : input.version_id && planVersion && planVersion !== input.version_id ? `Plan version_id "${planVersion}" does not match "${input.version_id}". Omit version_id to use the plan's.` : void 0;
        if (mismatch)
          return { content: [{ type: "text", text: `Error: ${mismatch} The plan_token is still valid.` }], isError: true };
      }
      const version = input.version_id ?? peeked?.spec.version_id;
      if (!version) {
        return { content: [{ type: "text", text: "Error: apply_app_phase needs version_id: neither the call nor the plan names one." }], isError: true };
      }
      const args = { ...input, version_id: version };
      const applied = {
        app_metadata: 0,
        tables: 0,
        seed_rows: 0,
        pages: 0,
        queries: 0,
        components: 0,
        events: 0,
        queries_updated: 0,
        events_removed: 0,
        components_removed: 0,
        components_kept: 0,
        components_moved: 0
      };
      let stage = "consume plan";
      let createdPageIds = [];
      let replacedPageNames = [];
      let retargetPending = [];
      let notRetargeted;
      try {
        const stored = consumeAppPlan(args.plan_token);
        const spec = stored.spec;
        if (spec.app_id && spec.app_id !== args.app_id) {
          throw new Error(`Plan app_id "${spec.app_id}" does not match "${args.app_id}".`);
        }
        if (spec.version_id && spec.version_id !== args.version_id) {
          throw new Error(`Plan version_id "${spec.version_id}" does not match "${args.version_id}".`);
        }
        stage = "read current app context";
        const [initialSummary, existingTables, datasources] = await Promise.all([
          client.getAppSummary(args.app_id),
          client.listTables(),
          spec.queries?.length ? client.listDatasources(args.version_id) : Promise.resolve([])
        ]);
        const frozen = frozenAppRefusal(initialSummary);
        if (frozen)
          return fail(new Error(frozen));
        if (initialSummary.version_id && initialSummary.version_id !== args.version_id) {
          throw new Error(`App editing version is "${initialSummary.version_id}", not "${args.version_id}".`);
        }
        const replacing = replaceView(initialSummary, spec);
        if (replacing && replaceFingerprint(initialSummary, replacing) !== stored.replaceFingerprint) {
          const pages = replacing.replacedPageNames.length ? `"${replacing.replacedPageNames.join('", "')}"` : "The queries this plan redefines";
          return fail(new Error(`apply_app_phase refused before any write: ${pages} changed since this plan was linted (a component, event or query was edited, or the plan was linted without app_id). Run lint_app_spec with app_id again so the plan sees the current state.`));
        }
        if (replacing) {
          const dangling = danglingAfterReplace(initialSummary, replacing, spec);
          if (dangling.length)
            return fail(new Error(`apply_app_phase refused before any write: ${dangling.join(" ")}`));
        }
        const planSummary = replacing?.summary ?? initialSummary;
        replacedPageNames = replacing?.replacedPageNames ?? [];
        retargetPending = (replacing?.eventsToRetarget ?? []).map((event) => `"${event.name ?? event.id}"`);
        stage = "prepare queries";
        const datasourceKinds = new Map(datasources.map((datasource) => [datasource.id, datasource.kind]));
        const preparedQueryOptions = (spec.queries ?? []).map((query) => {
          if (!query.datasource_id)
            throw new Error(`Query "${query.name}" has no pinned datasource_id. Lint the phase again.`);
          const kind = datasourceKinds.get(query.datasource_id);
          if (!kind)
            throw new Error(`Query "${query.name}" datasource "${query.datasource_id}" is unavailable.`);
          const options = structuredClone(query.options);
          if (query.table_ref)
            options.table_id = `planned-table:${query.table_ref}`;
          const prepared = prepareQueryOptionsForWrite(kind, options, `Query "${query.name}"`);
          if (prepared.errors.length)
            throw new Error(`${prepared.errors.join(" ")} Nothing was written; lint the phase again.`);
          return { kind, options: prepared.options };
        });
        for (const query of preparedQueryOptions) {
          if (query.kind === "workflows")
            await client.assertWorkflowQueryTarget(query.options);
        }
        const plannedPageMatches = /* @__PURE__ */ new Map();
        const claimedPageIds = /* @__PURE__ */ new Set();
        const reusableHome = initialSummary.pages.length === 1 && initialSummary.pages[0]?.handle === "home" && initialSummary.pages[0].components.length === 0 ? initialSummary.pages[0] : void 0;
        const plannedPageNames = new Set((spec.pages ?? []).map((page) => page.name));
        for (const page of spec.pages ?? []) {
          let match = matchPlannedPage(planSummary.pages, page.name, plannedPageNames, claimedPageIds);
          if (!match && reusableHome && !claimedPageIds.has(reusableHome.id))
            match = reusableHome;
          if (match)
            plannedPageMatches.set(logicalRef(page), match);
          if (match)
            claimedPageIds.add(match.id);
          const existingNames = new Set((match?.components ?? []).map((component) => component.name).filter(Boolean));
          const collision = (page.components ?? []).find((component) => existingNames.has(component.name));
          if (collision) {
            throw new Error(`Page "${page.name}" already has a component named "${collision.name}".`);
          }
        }
        const existingQueryNames = new Set(planSummary.queries.map((query) => query.name).filter(Boolean));
        const queryCollision = (spec.queries ?? []).find((query) => existingQueryNames.has(query.name));
        if (queryCollision)
          throw new Error(`App already has a query named "${queryCollision.name}".`);
        const existingTableIds = new Map(existingTables.map((table) => [table.table_name.toLowerCase(), table.id]));
        const resolvePlannedEvents = (pageTargets2, queryTargets2, targets) => {
          const ordinaryEvents2 = (spec.events ?? []).map((event) => {
            const source = sourceTarget(event.source_type, event.source_ref, pageTargets2, queryTargets2, targets);
            if (!source)
              throw new Error(`Event has unknown ${event.source_type} source_ref "${event.source_ref}".`);
            return {
              sourceId: source.id,
              sourceType: event.source_type,
              ref: event.ref,
              trigger: event.trigger,
              action: resolveAction(event.action, pageTargets2, queryTargets2, targets),
              name: event.name
            };
          });
          const lifecycleSpecs2 = (spec.lifecycles ?? []).map((lifecycle) => ({
            queryId: oneRef(lifecycle.query_ref, queryTargets2, "Lifecycle query"),
            beforeRefreshActions: lifecycle.before_refresh_actions?.map((action) => resolveAction(action, pageTargets2, queryTargets2, targets)),
            refreshQueryIds: refs(lifecycle.refresh_query_refs, queryTargets2, "Lifecycle refresh query"),
            clearComponentIds: refs(lifecycle.clear_component_refs, targets, "Lifecycle clear component"),
            closeModalId: oneRef(lifecycle.close_modal_ref, targets, "Lifecycle modal"),
            successAlert: lifecycle.success_alert ? { message: lifecycle.success_alert.message, alertType: lifecycle.success_alert.alert_type } : void 0,
            failureAlert: lifecycle.failure_alert ? { message: lifecycle.failure_alert.message, alertType: lifecycle.failure_alert.alert_type } : void 0,
            successActions: lifecycle.success_actions?.map((action) => resolveAction(action, pageTargets2, queryTargets2, targets)),
            failureActions: lifecycle.failure_actions?.map((action) => resolveAction(action, pageTargets2, queryTargets2, targets))
          }));
          return { ordinaryEvents: ordinaryEvents2, lifecycleSpecs: lifecycleSpecs2 };
        };
        stage = "prepare page components";
        const canvasColor = await literalCanvasColor(client, args.app_id, initialSummary.version_id ?? args.version_id);
        const preparedBatches = /* @__PURE__ */ new Map();
        for (const page of spec.pages ?? []) {
          if (!page.components?.length)
            continue;
          const prepared = prepareComponentBatch(page.components, {
            canvasColor,
            existingComponents: plannedPageMatches.get(logicalRef(page))?.components
          });
          if (prepared.errors.length)
            throw new Error(`Page "${page.name}": ${prepared.errors.join(" ")}`);
          preparedBatches.set(logicalRef(page), prepared);
        }
        stage = "resolve event refs";
        {
          const pages = persistedTargets(initialSummary.pages.map((page) => ({ id: page.id, name: page.name ?? page.id, aliases: [page.handle] })));
          for (const page of spec.pages ?? []) {
            const id = plannedPageMatches.get(logicalRef(page))?.id ?? `planned-page:${logicalRef(page)}`;
            pages.set(logicalRef(page), { id, name: page.name });
          }
          const queries = persistedTargets(planSummary.queries.map((query) => ({ id: query.id, name: query.name ?? query.id })));
          for (const query of spec.queries ?? []) {
            const target = { id: replacing?.queriesToUpdate.get(query.name) ?? `planned-query:${query.name}`, name: query.name };
            queries.set(logicalRef(query), target);
            queries.set(query.name, target);
          }
          const components = persistedTargets(planSummary.pages.flatMap((page) => page.components).map((component) => ({
            id: component.id,
            name: component.name ?? component.id,
            type: component.type
          })));
          for (const prepared of preparedBatches.values()) {
            for (const component of prepared.components) {
              const ref = componentRef(component);
              if (components.has(ref))
                throw new Error(`Duplicate component client_ref/name "${ref}" in planned app.`);
              components.set(ref, { id: `planned:${ref}`, name: component.name, type: component.type });
            }
          }
          resolvePlannedEvents(pages, queries, components);
        }
        let renameWarning;
        if (spec.app_name && spec.app_name !== initialSummary.name) {
          stage = "rename target app";
          try {
            await client.renameApp(args.app_id, args.version_id, spec.app_name);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (!/exist|unique|duplicate|taken|conflict|409|422/i.test(message))
              throw error;
            const fallback = `${spec.app_name} ${Math.random().toString(36).slice(2, 5)}`;
            await client.renameApp(args.app_id, args.version_id, fallback);
            renameWarning = `App name "${spec.app_name}" is already used in this workspace; the app was named "${fallback}" instead.`;
          }
          applied.app_metadata = 1;
        }
        stage = "create tables and pages";
        const newPages = (spec.pages ?? []).filter((page) => !plannedPageMatches.has(logicalRef(page)));
        const [tableWrite, pageWrite] = await Promise.allSettled([
          spec.tables?.length ? client.createTables({
            tables: spec.tables.map((table) => ({
              tableName: table.table_name,
              columns: table.columns,
              foreignKeys: table.foreign_keys
            }))
          }) : Promise.resolve([]),
          newPages.length ? client.createPages({
            appId: args.app_id,
            versionId: args.version_id,
            pages: newPages.map((page) => ({ name: page.name, icon: page.icon, hidden: page.hidden }))
          }) : Promise.resolve([])
        ]);
        const createdTables = tableWrite.status === "fulfilled" ? tableWrite.value : completedPartialWrites(tableWrite.reason);
        const createdPages = pageWrite.status === "fulfilled" ? pageWrite.value : completedPartialWrites(pageWrite.reason);
        applied.tables = createdTables.length;
        applied.pages = createdPages.length;
        createdPageIds = createdPages.map((page) => page.page_id);
        const foundationFailures = [
          ...tableWrite.status === "rejected" ? [`tables: ${tableWrite.reason instanceof Error ? tableWrite.reason.message : String(tableWrite.reason)}`] : [],
          ...pageWrite.status === "rejected" ? [`pages: ${pageWrite.reason instanceof Error ? pageWrite.reason.message : String(pageWrite.reason)}`] : []
        ];
        if (foundationFailures.length)
          throw new Error(foundationFailures.join(" | "), {
            cause: tableWrite.status === "rejected" ? tableQuotaError(tableWrite.reason) : void 0
          });
        const tableIds = new Map(existingTableIds);
        for (const table of createdTables)
          tableIds.set(table.table_name.toLowerCase(), table.table_id);
        const newlyCreatedSeedTables = createdTables.map((table) => table.table_name).filter((tableName) => spec.seed_data?.some((seed) => seed.table_name === tableName));
        if (newlyCreatedSeedTables.length) {
          stage = "wait for created table schemas";
          await waitForCreatedTables(client, newlyCreatedSeedTables);
        }
        const pageTargets = persistedTargets(initialSummary.pages.map((page) => ({ id: page.id, name: page.name ?? page.id, aliases: [page.handle] })));
        for (const page of spec.pages ?? []) {
          const ref = logicalRef(page);
          const existing = plannedPageMatches.get(ref);
          const created = createdPages.find((candidate) => candidate.name === page.name);
          const id = existing?.id ?? created?.page_id;
          if (!id)
            throw new Error(`Could not resolve page "${page.name}" after creation.`);
          pageTargets.set(ref, { id, name: page.name });
        }
        const pageUpdates = (spec.pages ?? []).flatMap((page) => {
          const existing = plannedPageMatches.get(logicalRef(page));
          if (!existing)
            return [];
          const update = {
            pageId: existing.id,
            ...existing.name !== page.name ? { name: page.name } : {},
            ...existing.icon !== page.icon ? { icon: page.icon } : {},
            ...page.hidden !== void 0 && Boolean(existing.hidden) !== page.hidden ? { hidden: page.hidden } : {}
          };
          return Object.keys(update).length > 1 ? [update] : [];
        });
        if (pageUpdates.length) {
          await client.updatePages({ appId: args.app_id, versionId: args.version_id, updates: pageUpdates });
        }
        stage = "seed data and create queries";
        const queryInputs = (spec.queries ?? []).map((query, index) => {
          const { kind, options } = preparedQueryOptions[index];
          if (query.table_ref) {
            const tableId = tableIds.get(query.table_ref.toLowerCase());
            if (!tableId)
              throw new Error(`Query "${query.name}" has unknown table_ref "${query.table_ref}".`);
            options.table_id = tableId;
          }
          return { dataSourceId: query.datasource_id, name: query.name, options, kind };
        });
        const updateInputs = queryInputs.filter((query) => replacing?.queriesToUpdate.has(query.name));
        const createInputs = queryInputs.filter((query) => !replacing?.queriesToUpdate.has(query.name));
        const [seedWrite, queryWrite] = await Promise.allSettled([
          spec.seed_data?.length ? client.insertRowsBatch({
            tables: spec.seed_data.map((seed) => ({ tableName: seed.table_name, rows: seed.rows }))
          }) : Promise.resolve([]),
          createInputs.length ? client.createQueries({ versionId: args.version_id, queries: createInputs }) : Promise.resolve([])
        ]);
        const seedResults = seedWrite.status === "fulfilled" ? seedWrite.value : completedPartialWrites(seedWrite.reason);
        const createdQueries = queryWrite.status === "fulfilled" ? queryWrite.value : completedPartialWrites(queryWrite.reason);
        applied.seed_rows = seedResults.reduce((total, result) => total + result.processed_rows, 0);
        applied.queries = createdQueries.length;
        const dataFailures = [
          ...seedWrite.status === "rejected" ? [`seed_data: ${seedWrite.reason instanceof Error ? seedWrite.reason.message : String(seedWrite.reason)}`] : [],
          ...queryWrite.status === "rejected" ? [`queries: ${queryWrite.reason instanceof Error ? queryWrite.reason.message : String(queryWrite.reason)}`] : []
        ];
        if (dataFailures.length)
          throw new Error(dataFailures.join(" | "));
        for (const query of updateInputs) {
          const queryId = replacing.queriesToUpdate.get(query.name);
          const current2 = initialSummary.queries.find((candidate) => candidate.id === queryId);
          if (current2 && query.dataSourceId && current2.data_source_id !== query.dataSourceId) {
            await client.updateQueryDatasource({ queryId, versionId: args.version_id, dataSourceId: query.dataSourceId });
          }
          try {
            await client.updateQuery({ queryId, versionId: args.version_id, options: query.options });
            applied.queries_updated += 1;
          } catch (error) {
            applied.queries_updated += completedPartialWrites(error).length;
            throw error;
          }
        }
        const queryTargets = persistedTargets(planSummary.queries.map((query) => ({ id: query.id, name: query.name ?? query.id })));
        let createdIndex = 0;
        (spec.queries ?? []).forEach((query) => {
          const updatedId = replacing?.queriesToUpdate.get(query.name);
          const target = updatedId ? { query_id: updatedId, name: query.name } : createdQueries[createdIndex++];
          if (!target)
            throw new Error(`Could not resolve query "${query.name}" after creation.`);
          queryTargets.set(logicalRef(query), { id: target.query_id, name: target.name });
          queryTargets.set(query.name, { id: target.query_id, name: target.name });
        });
        const preparedPages = (spec.pages ?? []).flatMap((page) => {
          const prepared = preparedBatches.get(logicalRef(page));
          if (!prepared)
            return [];
          const target = pageTargets.get(logicalRef(page));
          if (!target)
            throw new Error(`Could not resolve component page "${page.name}".`);
          return [{ page, pageId: target.id, prepared }];
        });
        const inPlace = /* @__PURE__ */ new Map();
        if (replacing) {
          for (const page of preparedPages) {
            if (!replacing.replacedPageIds.includes(page.pageId))
              continue;
            const held = initialSummary.pages.find((existing) => existing.id === page.pageId)?.components ?? [];
            inPlace.set(page.pageId, diffPageInPlace(held, page.prepared.components));
          }
        }
        if (replacing) {
          stage = "remove the replaced page's components and events";
          for (const eventId of replacing.eventsToDelete) {
            await client.deleteEvent({ appId: args.app_id, versionId: args.version_id, eventId });
            applied.events_removed += 1;
          }
          for (const { pageId, componentIds } of replacing.componentsToDelete) {
            const ids = inPlace.get(pageId)?.deleteIds ?? componentIds;
            if (!ids.length)
              continue;
            const removed = await client.deleteComponents({ appId: args.app_id, versionId: args.version_id, pageId, componentIds: ids });
            applied.components_removed += removed.deleted ?? ids.length;
          }
        }
        stage = "create page components";
        const componentWrites = await Promise.allSettled(preparedPages.map(async (page) => {
          const diff = inPlace.get(page.pageId);
          if (!diff) {
            const created2 = await client.createComponents({
              appId: args.app_id,
              versionId: args.version_id,
              pageId: page.pageId,
              components: page.prepared.components
            });
            return { ...page, created: created2, written: created2.length };
          }
          if (diff.create.length) {
            await client.createComponents({ appId: args.app_id, versionId: args.version_id, pageId: page.pageId, components: diff.create });
          }
          if (diff.relayout.length) {
            await client.updateLayouts({ appId: args.app_id, versionId: args.version_id, pageId: page.pageId, layouts: diff.relayout });
          }
          applied.components_kept += diff.keep.length;
          applied.components_moved += diff.relayout.length;
          const created = page.prepared.components.map((component) => ({
            component_id: diff.ids.get(componentRef(component)),
            name: component.name
          }));
          return { ...page, created, written: diff.create.length };
        }));
        const componentResults = componentWrites.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
        const componentFailures = componentWrites.flatMap((result, index) => result.status === "rejected" ? [`page ${preparedPages[index].page.name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`] : []);
        const componentTargets = persistedTargets(planSummary.pages.flatMap((page) => page.components).map((component) => ({
          id: component.id,
          name: component.name ?? component.id,
          type: component.type
        })));
        const warnings = [];
        if (renameWarning)
          warnings.push(renameWarning);
        for (const page of componentResults) {
          applied.components += page.written;
          warnings.push(...page.prepared.warnings.map((warning) => `Page ${page.page.name}: ${warning}`));
          page.prepared.components.forEach((component, index) => {
            const created = page.created[index];
            if (!created)
              throw new Error(`Could not resolve component "${component.name}" after creation.`);
            componentTargets.set(componentRef(component), {
              id: created.component_id,
              name: created.name,
              type: component.type
            });
          });
        }
        if (replacing?.eventsToRetarget.length) {
          stage = "point other events at the recreated components";
          const newIdByName = new Map(componentResults.flatMap((page) => page.prepared.components.map((component, index) => [component.name, page.created[index]?.component_id])));
          const updates = [];
          const missingTargets = [];
          for (const event of replacing.eventsToRetarget) {
            const newIds = new Map([...replacing.replacedComponentNames].map(([oldId, name]) => [oldId, newIdByName.get(name)]));
            const original = JSON.stringify(event.event ?? {});
            const swapped = replaceIds(original, newIds);
            const text = swapped.text;
            const missing = swapped.missing.map((id) => replacing.replacedComponentNames.get(id) ?? id);
            if (missing.length) {
              missingTargets.push(`"${event.name ?? event.id}" (${missing.join(", ")})`);
              warnings.push(`Event "${event.name ?? event.id}" targets ${missing.map((n) => `"${n}"`).join(", ")}, which the replaced page no longer has; it was left as it was.`);
            } else if (text !== original) {
              updates.push({ eventId: event.id, ...event.name ? { name: event.name } : {}, event: JSON.parse(text) });
            }
          }
          if (updates.length)
            await client.updateEvents({ appId: args.app_id, versionId: args.version_id, events: updates });
          notRetargeted = missingTargets;
        }
        if (componentFailures.length)
          throw new Error(componentFailures.join(" | "));
        stage = "create events and lifecycles";
        const summaryBeforeEvents = await client.getAppSummary(args.app_id);
        const { ordinaryEvents, lifecycleSpecs } = resolvePlannedEvents(pageTargets, queryTargets, componentTargets);
        const expanded = expandQueryLifecycles(summaryBeforeEvents, lifecycleSpecs);
        warnings.push(...expanded.warnings);
        const allEvents = [...ordinaryEvents, ...expanded.events];
        const eventValidation = validateEvents(summaryBeforeEvents, allEvents, { navigationMovedLast: true });
        if (eventValidation.errors.length)
          throw new Error(eventValidation.errors.join(" "));
        warnings.push(...eventValidation.warnings);
        const newEvents = withoutExistingEvents(allEvents, summaryBeforeEvents.events);
        if (newEvents.length) {
          await client.createEvents({
            appId: args.app_id,
            versionId: args.version_id,
            events: newEvents,
            existingEvents: summaryBeforeEvents.events
          });
          applied.events = newEvents.length;
          const reorders = navigationReorders(await client.getAppSummary(args.app_id), newEvents, warnings);
          if (reorders.length) {
            await client.updateEvents({ appId: args.app_id, versionId: args.version_id, events: reorders, updateType: "reorder" });
            warnings.push(`Moved ${reorders.length} page switch${reorders.length > 1 ? "es" : ""} behind the handlers this phase added, so they still run.`);
          }
        }
        stage = "validate persisted phase";
        const persisted = await client.getAppSummary(args.app_id);
        const validation = validatePersistedAppSummary(persisted, { canvasColor: await literalCanvasColor(client, args.app_id, persisted.version_id) });
        warnings.push(...validation.warnings);
        const relevantTableNames = /* @__PURE__ */ new Set([
          ...(spec.tables ?? []).map((table) => table.table_name),
          ...(spec.seed_data ?? []).map((seed) => seed.table_name),
          ...(spec.queries ?? []).flatMap((query) => query.table_ref ? [query.table_ref] : [])
        ]);
        let readCheck;
        if (input.check_reads !== false) {
          stage = "check the phase's reads";
          try {
            const written = (spec.queries ?? []).flatMap((query) => {
              const target = queryTargets.get(logicalRef(query));
              return target ? [target.id] : [];
            });
            readCheck = await checkPlanReads(client, { versionId: args.version_id, queryIds: written });
          } catch (error) {
            readCheck = { error: `The phase applied; its reads could not be checked (${error instanceof Error ? error.message : String(error)}). Run them with run_queries.` };
          }
        }
        return ok({
          applied,
          ...readCheck ? { read_check: readCheck } : {},
          refs: {
            tables: Object.fromEntries([...relevantTableNames].map((name) => [name, tableIds.get(name.toLowerCase())])),
            pages: selectedRefs(pageTargets, (spec.pages ?? []).map(logicalRef)),
            queries: selectedRefs(queryTargets, (spec.queries ?? []).map(logicalRef)),
            components: selectedRefs(componentTargets, (spec.pages ?? []).flatMap((page) => (page.components ?? []).map(logicalRef)))
          },
          warnings: [...new Set(warnings)],
          validation
        });
      } catch (error) {
        let recovery = "";
        const onlyFoundation = applied.components === 0 && applied.queries === 0 && applied.queries_updated === 0 && applied.events === 0;
        if (onlyFoundation && createdPageIds.length) {
          const removed = [];
          for (const pageId of createdPageIds) {
            try {
              await client.deletePage({ appId: args.app_id, versionId: args.version_id, pageId });
              removed.push(pageId);
            } catch {
            }
          }
          if (removed.length) {
            applied.pages -= removed.length;
            recovery += ` Removed the ${removed.length} empty page(s) this phase had created, so the next plan can recreate them under the same names.`;
          }
        }
        if (Object.values(applied).some((count) => count > 0)) {
          try {
            const current2 = await client.getAppSummary(args.app_id);
            recovery = " Persisted resources for targeted repair (do not recreate): " + JSON.stringify({
              pages: current2.pages.map((page) => ({
                id: page.id,
                name: page.name,
                components: page.components.map((c) => ({ id: c.id, name: c.name }))
              })),
              queries: current2.queries.map((q) => ({ id: q.id, name: q.name }))
            }).slice(0, 12e3);
          } catch {
          }
        }
        const removedNote = applied.components_removed || applied.events_removed ? `The replace had already removed the old content of ${replacedPageNames.map((name) => `"${name}"`).join(", ")} (${applied.components_removed} component(s), ${applied.events_removed} event(s)); that page now holds only what this phase created (listed below). Repair it by linting the whole page again with replace: true and applying that plan. ` + (notRetargeted === void 0 && retargetPending.length ? `Events on other pages that pointed at its old components were not re-pointed: ${retargetPending.join(", ")}; they still hold the removed ids, so point them at the recreated components with update_events. ` : notRetargeted?.length ? `Events on other pages still point at components that were not recreated: ${notRetargeted.join(", ")}; recreate those or change the events with update_events. ` : "") : "nothing with content on it was auto-deleted. ";
        return fail(new Error(`apply_app_phase failed during ${stage}. Applied before failure: ${appliedSummary(applied)}. The one-time plan token is consumed; ${removedNote}${error instanceof Error ? error.message : String(error)}` + recovery, { cause: error }));
      }
    }
  };
}
function persistedTargets(values) {
  const targets = /* @__PURE__ */ new Map();
  const nameCounts = /* @__PURE__ */ new Map();
  values.forEach((value) => nameCounts.set(value.name, (nameCounts.get(value.name) ?? 0) + 1));
  for (const { aliases, ...value } of values) {
    targets.set(value.id, value);
    if (nameCounts.get(value.name) === 1)
      targets.set(value.name, value);
    for (const alias of aliases ?? [])
      if (alias && !targets.has(alias))
        targets.set(alias, value);
  }
  return targets;
}
function selectedRefs(targets, refs2) {
  return Object.fromEntries(refs2.flatMap((ref) => {
    const target = targets.get(ref);
    return target ? [[ref, target.id]] : [];
  }));
}
function withoutExistingEvents(planned, existing) {
  const key = (sourceType, sourceId, payload) => JSON.stringify([sourceType, sourceId, Object.keys(payload).sort().map((k) => [k, payload[k]])]);
  const have = new Set(existing.flatMap((e) => {
    const raw = e.event && typeof e.event === "object" && !Array.isArray(e.event) ? e.event : void 0;
    if (!raw)
      return [];
    const { index: _index, name: _name, ...payload } = raw;
    return [key(e.target, e.sourceId, payload)];
  }));
  return planned.filter((e) => !have.has(key(e.sourceType, e.sourceId, { eventId: e.trigger, ...e.ref ? { ref: e.ref } : {}, ...e.action })));
}
export {
  WebStandardStreamableHTTPServerTransport as W,
  codeAppReadFilesTool as a,
  codeAppWriteFilesTool as b,
  codeAppScaffoldTool as c,
  codeAppBuildTool as d,
  codeAppInstallTool as e,
  codeAppAddDependencyTool as f,
  applyAppPhaseTool as g,
  runQueriesTool as h,
  getRequestListener as i,
  libraryPinErrors as l,
  noCodeIdentity as n,
  runQueryTool as r,
  validatePersistedAppSummary as v
};
