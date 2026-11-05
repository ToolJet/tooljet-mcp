import { createRequire } from "node:module";
import { bb as union, bo as string, bJ as number, bW as looseObject, bI as object, bX as literal, ba as unknown, ck as _enum, cH as array, c5 as intersection, by as record, cD as boolean, bB as preprocess, bH as optional, c1 as iso_exports, cq as discriminatedUnion, cv as custom, bM as _null2 } from "./chunk-DUGnQDIP.js";
import { _ as __toESM, a as __commonJS } from "./chunk-cuZ92804.js";
import { ay as ok, ax as fail } from "./chunk-D70UN33u.js";
import { e as external_exports } from "./chunk-B2U2gFJI.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync, readdirSync, rmSync, renameSync, lstatSync, utimesSync, openSync, closeSync, mkdtempSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, resolve, relative, sep, dirname } from "node:path";
import "node:http";
import { Http2ServerRequest, constants } from "node:http2";
import { Readable } from "node:stream";
createRequire(import.meta.url);
var LATEST_PROTOCOL_VERSION = "2025-11-25";
var DEFAULT_NEGOTIATED_PROTOCOL_VERSION = "2025-03-26";
var SUPPORTED_PROTOCOL_VERSIONS = [LATEST_PROTOCOL_VERSION, "2025-06-18", "2025-03-26", "2024-11-05", "2024-10-07"];
var RELATED_TASK_META_KEY = "io.modelcontextprotocol/related-task";
var JSONRPC_VERSION = "2.0";
var AssertObjectSchema = custom((v) => v !== null && (typeof v === "object" || typeof v === "function"));
var ProgressTokenSchema = union([string(), number().int()]);
var CursorSchema = string();
looseObject({
  /**
   * Requested duration in milliseconds to retain task from creation.
   */
  ttl: number().optional(),
  /**
   * Time in milliseconds to wait between task status requests.
   */
  pollInterval: number().optional()
});
var TaskMetadataSchema = object({
  ttl: number().optional()
});
var RelatedTaskMetadataSchema = object({
  taskId: string()
});
var RequestMetaSchema = looseObject({
  /**
   * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
   */
  progressToken: ProgressTokenSchema.optional(),
  /**
   * If specified, this request is related to the provided task.
   */
  [RELATED_TASK_META_KEY]: RelatedTaskMetadataSchema.optional()
});
var BaseRequestParamsSchema = object({
  /**
   * See [General fields: `_meta`](/specification/draft/basic/index#meta) for notes on `_meta` usage.
   */
  _meta: RequestMetaSchema.optional()
});
var TaskAugmentedRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * If specified, the caller is requesting task-augmented execution for this request.
   * The request will return a CreateTaskResult immediately, and the actual result can be
   * retrieved later via tasks/result.
   *
   * Task augmentation is subject to capability negotiation - receivers MUST declare support
   * for task augmentation of specific request types in their capabilities.
   */
  task: TaskMetadataSchema.optional()
});
var isTaskAugmentedRequestParams = (value) => TaskAugmentedRequestParamsSchema.safeParse(value).success;
var RequestSchema = object({
  method: string(),
  params: BaseRequestParamsSchema.loose().optional()
});
var NotificationsParamsSchema = object({
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: RequestMetaSchema.optional()
});
var NotificationSchema = object({
  method: string(),
  params: NotificationsParamsSchema.loose().optional()
});
var ResultSchema = looseObject({
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: RequestMetaSchema.optional()
});
var RequestIdSchema = union([string(), number().int()]);
var JSONRPCRequestSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  ...RequestSchema.shape
}).strict();
var isJSONRPCRequest = (value) => JSONRPCRequestSchema.safeParse(value).success;
var JSONRPCNotificationSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  ...NotificationSchema.shape
}).strict();
var isJSONRPCNotification = (value) => JSONRPCNotificationSchema.safeParse(value).success;
var JSONRPCResultResponseSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  result: ResultSchema
}).strict();
var isJSONRPCResultResponse = (value) => JSONRPCResultResponseSchema.safeParse(value).success;
var ErrorCode;
(function(ErrorCode2) {
  ErrorCode2[ErrorCode2["ConnectionClosed"] = -32e3] = "ConnectionClosed";
  ErrorCode2[ErrorCode2["RequestTimeout"] = -32001] = "RequestTimeout";
  ErrorCode2[ErrorCode2["ParseError"] = -32700] = "ParseError";
  ErrorCode2[ErrorCode2["InvalidRequest"] = -32600] = "InvalidRequest";
  ErrorCode2[ErrorCode2["MethodNotFound"] = -32601] = "MethodNotFound";
  ErrorCode2[ErrorCode2["InvalidParams"] = -32602] = "InvalidParams";
  ErrorCode2[ErrorCode2["InternalError"] = -32603] = "InternalError";
  ErrorCode2[ErrorCode2["UrlElicitationRequired"] = -32042] = "UrlElicitationRequired";
})(ErrorCode || (ErrorCode = {}));
var JSONRPCErrorResponseSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema.optional(),
  error: object({
    /**
     * The error type that occurred.
     */
    code: number().int(),
    /**
     * A short description of the error. The message SHOULD be limited to a concise single sentence.
     */
    message: string(),
    /**
     * Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).
     */
    data: unknown().optional()
  })
}).strict();
var isJSONRPCErrorResponse = (value) => JSONRPCErrorResponseSchema.safeParse(value).success;
var JSONRPCMessageSchema = union([
  JSONRPCRequestSchema,
  JSONRPCNotificationSchema,
  JSONRPCResultResponseSchema,
  JSONRPCErrorResponseSchema
]);
union([JSONRPCResultResponseSchema, JSONRPCErrorResponseSchema]);
var EmptyResultSchema = ResultSchema.strict();
var CancelledNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The ID of the request to cancel.
   *
   * This MUST correspond to the ID of a request previously issued in the same direction.
   */
  requestId: RequestIdSchema.optional(),
  /**
   * An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
   */
  reason: string().optional()
});
var CancelledNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/cancelled"),
  params: CancelledNotificationParamsSchema
});
var IconSchema = object({
  /**
   * URL or data URI for the icon.
   */
  src: string(),
  /**
   * Optional MIME type for the icon.
   */
  mimeType: string().optional(),
  /**
   * Optional array of strings that specify sizes at which the icon can be used.
   * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
   *
   * If not provided, the client should assume that the icon can be used at any size.
   */
  sizes: array(string()).optional(),
  /**
   * Optional specifier for the theme this icon is designed for. `light` indicates
   * the icon is designed to be used with a light background, and `dark` indicates
   * the icon is designed to be used with a dark background.
   *
   * If not provided, the client should assume the icon can be used with any theme.
   */
  theme: _enum(["light", "dark"]).optional()
});
var IconsSchema = object({
  /**
   * Optional set of sized icons that the client can display in a user interface.
   *
   * Clients that support rendering icons MUST support at least the following MIME types:
   * - `image/png` - PNG images (safe, universal compatibility)
   * - `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)
   *
   * Clients that support rendering icons SHOULD also support:
   * - `image/svg+xml` - SVG images (scalable but requires security precautions)
   * - `image/webp` - WebP images (modern, efficient format)
   */
  icons: array(IconSchema).optional()
});
var BaseMetadataSchema = object({
  /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
  name: string(),
  /**
   * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
   * even by those unfamiliar with domain-specific terminology.
   *
   * If not provided, the name should be used for display (except for Tool,
   * where `annotations.title` should be given precedence over using `name`,
   * if present).
   */
  title: string().optional()
});
var ImplementationSchema = BaseMetadataSchema.extend({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  version: string(),
  /**
   * An optional URL of the website for this implementation.
   */
  websiteUrl: string().optional(),
  /**
   * An optional human-readable description of what this implementation does.
   *
   * This can be used by clients or servers to provide context about their purpose
   * and capabilities. For example, a server might describe the types of resources
   * or tools it provides, while a client might describe its intended use case.
   */
  description: string().optional()
});
var FormElicitationCapabilitySchema = intersection(object({
  applyDefaults: boolean().optional()
}), record(string(), unknown()));
var ElicitationCapabilitySchema = preprocess((value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (Object.keys(value).length === 0) {
      return { form: {} };
    }
  }
  return value;
}, intersection(object({
  form: FormElicitationCapabilitySchema.optional(),
  url: AssertObjectSchema.optional()
}), record(string(), unknown()).optional()));
var ClientTasksCapabilitySchema = looseObject({
  /**
   * Present if the client supports listing tasks.
   */
  list: AssertObjectSchema.optional(),
  /**
   * Present if the client supports cancelling tasks.
   */
  cancel: AssertObjectSchema.optional(),
  /**
   * Capabilities for task creation on specific request types.
   */
  requests: looseObject({
    /**
     * Task support for sampling requests.
     */
    sampling: looseObject({
      createMessage: AssertObjectSchema.optional()
    }).optional(),
    /**
     * Task support for elicitation requests.
     */
    elicitation: looseObject({
      create: AssertObjectSchema.optional()
    }).optional()
  }).optional()
});
var ServerTasksCapabilitySchema = looseObject({
  /**
   * Present if the server supports listing tasks.
   */
  list: AssertObjectSchema.optional(),
  /**
   * Present if the server supports cancelling tasks.
   */
  cancel: AssertObjectSchema.optional(),
  /**
   * Capabilities for task creation on specific request types.
   */
  requests: looseObject({
    /**
     * Task support for tool requests.
     */
    tools: looseObject({
      call: AssertObjectSchema.optional()
    }).optional()
  }).optional()
});
var ClientCapabilitiesSchema = object({
  /**
   * Experimental, non-standard capabilities that the client supports.
   */
  experimental: record(string(), AssertObjectSchema).optional(),
  /**
   * Present if the client supports sampling from an LLM.
   */
  sampling: object({
    /**
     * Present if the client supports context inclusion via includeContext parameter.
     * If not declared, servers SHOULD only use `includeContext: "none"` (or omit it).
     */
    context: AssertObjectSchema.optional(),
    /**
     * Present if the client supports tool use via tools and toolChoice parameters.
     */
    tools: AssertObjectSchema.optional()
  }).optional(),
  /**
   * Present if the client supports eliciting user input.
   */
  elicitation: ElicitationCapabilitySchema.optional(),
  /**
   * Present if the client supports listing roots.
   */
  roots: object({
    /**
     * Whether the client supports issuing notifications for changes to the roots list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the client supports task creation.
   */
  tasks: ClientTasksCapabilitySchema.optional(),
  /**
   * Extensions that the client supports. Keys are extension identifiers (vendor-prefix/extension-name).
   */
  extensions: record(string(), AssertObjectSchema).optional()
});
var InitializeRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
   */
  protocolVersion: string(),
  capabilities: ClientCapabilitiesSchema,
  clientInfo: ImplementationSchema
});
var InitializeRequestSchema = RequestSchema.extend({
  method: literal("initialize"),
  params: InitializeRequestParamsSchema
});
var isInitializeRequest = (value) => InitializeRequestSchema.safeParse(value).success;
var ServerCapabilitiesSchema = object({
  /**
   * Experimental, non-standard capabilities that the server supports.
   */
  experimental: record(string(), AssertObjectSchema).optional(),
  /**
   * Present if the server supports sending log messages to the client.
   */
  logging: AssertObjectSchema.optional(),
  /**
   * Present if the server supports sending completions to the client.
   */
  completions: AssertObjectSchema.optional(),
  /**
   * Present if the server offers any prompt templates.
   */
  prompts: object({
    /**
     * Whether this server supports issuing notifications for changes to the prompt list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the server offers any resources to read.
   */
  resources: object({
    /**
     * Whether this server supports clients subscribing to resource updates.
     */
    subscribe: boolean().optional(),
    /**
     * Whether this server supports issuing notifications for changes to the resource list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the server offers any tools to call.
   */
  tools: object({
    /**
     * Whether this server supports issuing notifications for changes to the tool list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the server supports task creation.
   */
  tasks: ServerTasksCapabilitySchema.optional(),
  /**
   * Extensions that the server supports. Keys are extension identifiers (vendor-prefix/extension-name).
   */
  extensions: record(string(), AssertObjectSchema).optional()
});
var InitializeResultSchema = ResultSchema.extend({
  /**
   * The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
   */
  protocolVersion: string(),
  capabilities: ServerCapabilitiesSchema,
  serverInfo: ImplementationSchema,
  /**
   * Instructions describing how to use the server and its features.
   *
   * This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.
   */
  instructions: string().optional()
});
var InitializedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/initialized"),
  params: NotificationsParamsSchema.optional()
});
var PingRequestSchema = RequestSchema.extend({
  method: literal("ping"),
  params: BaseRequestParamsSchema.optional()
});
var ProgressSchema = object({
  /**
   * The progress thus far. This should increase every time progress is made, even if the total is unknown.
   */
  progress: number(),
  /**
   * Total number of items to process (or total progress required), if known.
   */
  total: optional(number()),
  /**
   * An optional message describing the current progress.
   */
  message: optional(string())
});
var ProgressNotificationParamsSchema = object({
  ...NotificationsParamsSchema.shape,
  ...ProgressSchema.shape,
  /**
   * The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
   */
  progressToken: ProgressTokenSchema
});
var ProgressNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/progress"),
  params: ProgressNotificationParamsSchema
});
var PaginatedRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * An opaque token representing the current pagination position.
   * If provided, the server should return results starting after this cursor.
   */
  cursor: CursorSchema.optional()
});
var PaginatedRequestSchema = RequestSchema.extend({
  params: PaginatedRequestParamsSchema.optional()
});
var PaginatedResultSchema = ResultSchema.extend({
  /**
   * An opaque token representing the pagination position after the last returned result.
   * If present, there may be more results available.
   */
  nextCursor: CursorSchema.optional()
});
var TaskStatusSchema = _enum(["working", "input_required", "completed", "failed", "cancelled"]);
var TaskSchema = object({
  taskId: string(),
  status: TaskStatusSchema,
  /**
   * Time in milliseconds to keep task results available after completion.
   * If null, the task has unlimited lifetime until manually cleaned up.
   */
  ttl: union([number(), _null2()]),
  /**
   * ISO 8601 timestamp when the task was created.
   */
  createdAt: string(),
  /**
   * ISO 8601 timestamp when the task was last updated.
   */
  lastUpdatedAt: string(),
  pollInterval: optional(number()),
  /**
   * Optional diagnostic message for failed tasks or other status information.
   */
  statusMessage: optional(string())
});
var CreateTaskResultSchema = ResultSchema.extend({
  task: TaskSchema
});
var TaskStatusNotificationParamsSchema = NotificationsParamsSchema.merge(TaskSchema);
var TaskStatusNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/tasks/status"),
  params: TaskStatusNotificationParamsSchema
});
var GetTaskRequestSchema = RequestSchema.extend({
  method: literal("tasks/get"),
  params: BaseRequestParamsSchema.extend({
    taskId: string()
  })
});
var GetTaskResultSchema = ResultSchema.merge(TaskSchema);
var GetTaskPayloadRequestSchema = RequestSchema.extend({
  method: literal("tasks/result"),
  params: BaseRequestParamsSchema.extend({
    taskId: string()
  })
});
ResultSchema.loose();
var ListTasksRequestSchema = PaginatedRequestSchema.extend({
  method: literal("tasks/list")
});
var ListTasksResultSchema = PaginatedResultSchema.extend({
  tasks: array(TaskSchema)
});
var CancelTaskRequestSchema = RequestSchema.extend({
  method: literal("tasks/cancel"),
  params: BaseRequestParamsSchema.extend({
    taskId: string()
  })
});
var CancelTaskResultSchema = ResultSchema.merge(TaskSchema);
var ResourceContentsSchema = object({
  /**
   * The URI of this resource.
   */
  uri: string(),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: optional(string()),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var TextResourceContentsSchema = ResourceContentsSchema.extend({
  /**
   * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
   */
  text: string()
});
var Base64Schema = string().refine((val) => {
  try {
    atob(val);
    return true;
  } catch {
    return false;
  }
}, { message: "Invalid Base64 string" });
var BlobResourceContentsSchema = ResourceContentsSchema.extend({
  /**
   * A base64-encoded string representing the binary data of the item.
   */
  blob: Base64Schema
});
var RoleSchema = _enum(["user", "assistant"]);
var AnnotationsSchema = object({
  /**
   * Intended audience(s) for the resource.
   */
  audience: array(RoleSchema).optional(),
  /**
   * Importance hint for the resource, from 0 (least) to 1 (most).
   */
  priority: number().min(0).max(1).optional(),
  /**
   * ISO 8601 timestamp for the most recent modification.
   */
  lastModified: iso_exports.datetime({ offset: true }).optional()
});
var ResourceSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * The URI of this resource.
   */
  uri: string(),
  /**
   * A description of what this resource represents.
   *
   * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
   */
  description: optional(string()),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: optional(string()),
  /**
   * The size of the raw resource content, in bytes (i.e., before base64 encoding or any tokenization), if known.
   *
   * This can be used by Hosts to display file sizes and estimate context window usage.
   */
  size: optional(number()),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: optional(looseObject({}))
});
var ResourceTemplateSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * A URI template (according to RFC 6570) that can be used to construct resource URIs.
   */
  uriTemplate: string(),
  /**
   * A description of what this template is for.
   *
   * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
   */
  description: optional(string()),
  /**
   * The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
   */
  mimeType: optional(string()),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: optional(looseObject({}))
});
var ListResourcesRequestSchema = PaginatedRequestSchema.extend({
  method: literal("resources/list")
});
var ListResourcesResultSchema = PaginatedResultSchema.extend({
  resources: array(ResourceSchema)
});
var ListResourceTemplatesRequestSchema = PaginatedRequestSchema.extend({
  method: literal("resources/templates/list")
});
var ListResourceTemplatesResultSchema = PaginatedResultSchema.extend({
  resourceTemplates: array(ResourceTemplateSchema)
});
var ResourceRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The URI of the resource to read. The URI can use any protocol; it is up to the server how to interpret it.
   *
   * @format uri
   */
  uri: string()
});
var ReadResourceRequestParamsSchema = ResourceRequestParamsSchema;
var ReadResourceRequestSchema = RequestSchema.extend({
  method: literal("resources/read"),
  params: ReadResourceRequestParamsSchema
});
var ReadResourceResultSchema = ResultSchema.extend({
  contents: array(union([TextResourceContentsSchema, BlobResourceContentsSchema]))
});
var ResourceListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/resources/list_changed"),
  params: NotificationsParamsSchema.optional()
});
var SubscribeRequestParamsSchema = ResourceRequestParamsSchema;
var SubscribeRequestSchema = RequestSchema.extend({
  method: literal("resources/subscribe"),
  params: SubscribeRequestParamsSchema
});
var UnsubscribeRequestParamsSchema = ResourceRequestParamsSchema;
var UnsubscribeRequestSchema = RequestSchema.extend({
  method: literal("resources/unsubscribe"),
  params: UnsubscribeRequestParamsSchema
});
var ResourceUpdatedNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
   */
  uri: string()
});
var ResourceUpdatedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/resources/updated"),
  params: ResourceUpdatedNotificationParamsSchema
});
var PromptArgumentSchema = object({
  /**
   * The name of the argument.
   */
  name: string(),
  /**
   * A human-readable description of the argument.
   */
  description: optional(string()),
  /**
   * Whether this argument must be provided.
   */
  required: optional(boolean())
});
var PromptSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * An optional description of what this prompt provides
   */
  description: optional(string()),
  /**
   * A list of arguments to use for templating the prompt.
   */
  arguments: optional(array(PromptArgumentSchema)),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: optional(looseObject({}))
});
var ListPromptsRequestSchema = PaginatedRequestSchema.extend({
  method: literal("prompts/list")
});
var ListPromptsResultSchema = PaginatedResultSchema.extend({
  prompts: array(PromptSchema)
});
var GetPromptRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The name of the prompt or prompt template.
   */
  name: string(),
  /**
   * Arguments to use for templating the prompt.
   */
  arguments: record(string(), string()).optional()
});
var GetPromptRequestSchema = RequestSchema.extend({
  method: literal("prompts/get"),
  params: GetPromptRequestParamsSchema
});
var TextContentSchema = object({
  type: literal("text"),
  /**
   * The text content of the message.
   */
  text: string(),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ImageContentSchema = object({
  type: literal("image"),
  /**
   * The base64-encoded image data.
   */
  data: Base64Schema,
  /**
   * The MIME type of the image. Different providers may support different image types.
   */
  mimeType: string(),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var AudioContentSchema = object({
  type: literal("audio"),
  /**
   * The base64-encoded audio data.
   */
  data: Base64Schema,
  /**
   * The MIME type of the audio. Different providers may support different audio types.
   */
  mimeType: string(),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ToolUseContentSchema = object({
  type: literal("tool_use"),
  /**
   * The name of the tool to invoke.
   * Must match a tool name from the request's tools array.
   */
  name: string(),
  /**
   * Unique identifier for this tool call.
   * Used to correlate with ToolResultContent in subsequent messages.
   */
  id: string(),
  /**
   * Arguments to pass to the tool.
   * Must conform to the tool's inputSchema.
   */
  input: record(string(), unknown()),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var EmbeddedResourceSchema = object({
  type: literal("resource"),
  resource: union([TextResourceContentsSchema, BlobResourceContentsSchema]),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ResourceLinkSchema = ResourceSchema.extend({
  type: literal("resource_link")
});
var ContentBlockSchema = union([
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema,
  ResourceLinkSchema,
  EmbeddedResourceSchema
]);
var PromptMessageSchema = object({
  role: RoleSchema,
  content: ContentBlockSchema
});
var GetPromptResultSchema = ResultSchema.extend({
  /**
   * An optional description for the prompt.
   */
  description: string().optional(),
  messages: array(PromptMessageSchema)
});
var PromptListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/prompts/list_changed"),
  params: NotificationsParamsSchema.optional()
});
var ToolAnnotationsSchema = object({
  /**
   * A human-readable title for the tool.
   */
  title: string().optional(),
  /**
   * If true, the tool does not modify its environment.
   *
   * Default: false
   */
  readOnlyHint: boolean().optional(),
  /**
   * If true, the tool may perform destructive updates to its environment.
   * If false, the tool performs only additive updates.
   *
   * (This property is meaningful only when `readOnlyHint == false`)
   *
   * Default: true
   */
  destructiveHint: boolean().optional(),
  /**
   * If true, calling the tool repeatedly with the same arguments
   * will have no additional effect on the its environment.
   *
   * (This property is meaningful only when `readOnlyHint == false`)
   *
   * Default: false
   */
  idempotentHint: boolean().optional(),
  /**
   * If true, this tool may interact with an "open world" of external
   * entities. If false, the tool's domain of interaction is closed.
   * For example, the world of a web search tool is open, whereas that
   * of a memory tool is not.
   *
   * Default: true
   */
  openWorldHint: boolean().optional()
});
var ToolExecutionSchema = object({
  /**
   * Indicates the tool's preference for task-augmented execution.
   * - "required": Clients MUST invoke the tool as a task
   * - "optional": Clients MAY invoke the tool as a task or normal request
   * - "forbidden": Clients MUST NOT attempt to invoke the tool as a task
   *
   * If not present, defaults to "forbidden".
   */
  taskSupport: _enum(["required", "optional", "forbidden"]).optional()
});
var ToolSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * A human-readable description of the tool.
   */
  description: string().optional(),
  /**
   * A JSON Schema 2020-12 object defining the expected parameters for the tool.
   * Must have type: 'object' at the root level per MCP spec.
   */
  inputSchema: object({
    type: literal("object"),
    properties: record(string(), AssertObjectSchema).optional(),
    required: array(string()).optional()
  }).catchall(unknown()),
  /**
   * An optional JSON Schema 2020-12 object defining the structure of the tool's output
   * returned in the structuredContent field of a CallToolResult.
   * Must have type: 'object' at the root level per MCP spec.
   */
  outputSchema: object({
    type: literal("object"),
    properties: record(string(), AssertObjectSchema).optional(),
    required: array(string()).optional()
  }).catchall(unknown()).optional(),
  /**
   * Optional additional tool information.
   */
  annotations: ToolAnnotationsSchema.optional(),
  /**
   * Execution-related properties for this tool.
   */
  execution: ToolExecutionSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ListToolsRequestSchema = PaginatedRequestSchema.extend({
  method: literal("tools/list")
});
var ListToolsResultSchema = PaginatedResultSchema.extend({
  tools: array(ToolSchema)
});
var CallToolResultSchema = ResultSchema.extend({
  /**
   * A list of content objects that represent the result of the tool call.
   *
   * If the Tool does not define an outputSchema, this field MUST be present in the result.
   * For backwards compatibility, this field is always present, but it may be empty.
   */
  content: array(ContentBlockSchema).default([]),
  /**
   * An object containing structured tool output.
   *
   * If the Tool defines an outputSchema, this field MUST be present in the result, and contain a JSON object that matches the schema.
   */
  structuredContent: record(string(), unknown()).optional(),
  /**
   * Whether the tool call ended in an error.
   *
   * If not set, this is assumed to be false (the call was successful).
   *
   * Any errors that originate from the tool SHOULD be reported inside the result
   * object, with `isError` set to true, _not_ as an MCP protocol-level error
   * response. Otherwise, the LLM would not be able to see that an error occurred
   * and self-correct.
   *
   * However, any errors in _finding_ the tool, an error indicating that the
   * server does not support tool calls, or any other exceptional conditions,
   * should be reported as an MCP error response.
   */
  isError: boolean().optional()
});
CallToolResultSchema.or(ResultSchema.extend({
  toolResult: unknown()
}));
var CallToolRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  /**
   * The name of the tool to call.
   */
  name: string(),
  /**
   * Arguments to pass to the tool.
   */
  arguments: record(string(), unknown()).optional()
});
var CallToolRequestSchema = RequestSchema.extend({
  method: literal("tools/call"),
  params: CallToolRequestParamsSchema
});
var ToolListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/tools/list_changed"),
  params: NotificationsParamsSchema.optional()
});
object({
  /**
   * If true, the list will be refreshed automatically when a list changed notification is received.
   * The callback will be called with the updated list.
   *
   * If false, the callback will be called with null items, allowing manual refresh.
   *
   * @default true
   */
  autoRefresh: boolean().default(true),
  /**
   * Debounce time in milliseconds for list changed notification processing.
   *
   * Multiple notifications received within this timeframe will only trigger one refresh.
   * Set to 0 to disable debouncing.
   *
   * @default 300
   */
  debounceMs: number().int().nonnegative().default(300)
});
var LoggingLevelSchema = _enum(["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"]);
var SetLevelRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/logging/message.
   */
  level: LoggingLevelSchema
});
var SetLevelRequestSchema = RequestSchema.extend({
  method: literal("logging/setLevel"),
  params: SetLevelRequestParamsSchema
});
var LoggingMessageNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The severity of this log message.
   */
  level: LoggingLevelSchema,
  /**
   * An optional name of the logger issuing this message.
   */
  logger: string().optional(),
  /**
   * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
   */
  data: unknown()
});
var LoggingMessageNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/message"),
  params: LoggingMessageNotificationParamsSchema
});
var ModelHintSchema = object({
  /**
   * A hint for a model name.
   */
  name: string().optional()
});
var ModelPreferencesSchema = object({
  /**
   * Optional hints to use for model selection.
   */
  hints: array(ModelHintSchema).optional(),
  /**
   * How much to prioritize cost when selecting a model.
   */
  costPriority: number().min(0).max(1).optional(),
  /**
   * How much to prioritize sampling speed (latency) when selecting a model.
   */
  speedPriority: number().min(0).max(1).optional(),
  /**
   * How much to prioritize intelligence and capabilities when selecting a model.
   */
  intelligencePriority: number().min(0).max(1).optional()
});
var ToolChoiceSchema = object({
  /**
   * Controls when tools are used:
   * - "auto": Model decides whether to use tools (default)
   * - "required": Model MUST use at least one tool before completing
   * - "none": Model MUST NOT use any tools
   */
  mode: _enum(["auto", "required", "none"]).optional()
});
var ToolResultContentSchema = object({
  type: literal("tool_result"),
  toolUseId: string().describe("The unique identifier for the corresponding tool call."),
  content: array(ContentBlockSchema).default([]),
  structuredContent: object({}).loose().optional(),
  isError: boolean().optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var SamplingContentSchema = discriminatedUnion("type", [TextContentSchema, ImageContentSchema, AudioContentSchema]);
var SamplingMessageContentBlockSchema = discriminatedUnion("type", [
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema,
  ToolUseContentSchema,
  ToolResultContentSchema
]);
var SamplingMessageSchema = object({
  role: RoleSchema,
  content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)]),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var CreateMessageRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  messages: array(SamplingMessageSchema),
  /**
   * The server's preferences for which model to select. The client MAY modify or omit this request.
   */
  modelPreferences: ModelPreferencesSchema.optional(),
  /**
   * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
   */
  systemPrompt: string().optional(),
  /**
   * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt.
   * The client MAY ignore this request.
   *
   * Default is "none". Values "thisServer" and "allServers" are soft-deprecated. Servers SHOULD only use these values if the client
   * declares ClientCapabilities.sampling.context. These values may be removed in future spec releases.
   */
  includeContext: _enum(["none", "thisServer", "allServers"]).optional(),
  temperature: number().optional(),
  /**
   * The requested maximum number of tokens to sample (to prevent runaway completions).
   *
   * The client MAY choose to sample fewer tokens than the requested maximum.
   */
  maxTokens: number().int(),
  stopSequences: array(string()).optional(),
  /**
   * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
   */
  metadata: AssertObjectSchema.optional(),
  /**
   * Tools that the model may use during generation.
   * The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.
   */
  tools: array(ToolSchema).optional(),
  /**
   * Controls how the model uses tools.
   * The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.
   * Default is `{ mode: "auto" }`.
   */
  toolChoice: ToolChoiceSchema.optional()
});
var CreateMessageRequestSchema = RequestSchema.extend({
  method: literal("sampling/createMessage"),
  params: CreateMessageRequestParamsSchema
});
var CreateMessageResultSchema = ResultSchema.extend({
  /**
   * The name of the model that generated the message.
   */
  model: string(),
  /**
   * The reason why sampling stopped, if known.
   *
   * Standard values:
   * - "endTurn": Natural end of the assistant's turn
   * - "stopSequence": A stop sequence was encountered
   * - "maxTokens": Maximum token limit was reached
   *
   * This field is an open string to allow for provider-specific stop reasons.
   */
  stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens"]).or(string())),
  role: RoleSchema,
  /**
   * Response content. Single content block (text, image, or audio).
   */
  content: SamplingContentSchema
});
var CreateMessageResultWithToolsSchema = ResultSchema.extend({
  /**
   * The name of the model that generated the message.
   */
  model: string(),
  /**
   * The reason why sampling stopped, if known.
   *
   * Standard values:
   * - "endTurn": Natural end of the assistant's turn
   * - "stopSequence": A stop sequence was encountered
   * - "maxTokens": Maximum token limit was reached
   * - "toolUse": The model wants to use one or more tools
   *
   * This field is an open string to allow for provider-specific stop reasons.
   */
  stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens", "toolUse"]).or(string())),
  role: RoleSchema,
  /**
   * Response content. May be a single block or array. May include ToolUseContent if stopReason is "toolUse".
   */
  content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)])
});
var BooleanSchemaSchema = object({
  type: literal("boolean"),
  title: string().optional(),
  description: string().optional(),
  default: boolean().optional()
});
var StringSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  minLength: number().optional(),
  maxLength: number().optional(),
  format: _enum(["email", "uri", "date", "date-time"]).optional(),
  default: string().optional()
});
var NumberSchemaSchema = object({
  type: _enum(["number", "integer"]),
  title: string().optional(),
  description: string().optional(),
  minimum: number().optional(),
  maximum: number().optional(),
  default: number().optional()
});
var UntitledSingleSelectEnumSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  enum: array(string()),
  default: string().optional()
});
var TitledSingleSelectEnumSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  oneOf: array(object({
    const: string(),
    title: string()
  })),
  default: string().optional()
});
var LegacyTitledEnumSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  enum: array(string()),
  enumNames: array(string()).optional(),
  default: string().optional()
});
var SingleSelectEnumSchemaSchema = union([UntitledSingleSelectEnumSchemaSchema, TitledSingleSelectEnumSchemaSchema]);
var UntitledMultiSelectEnumSchemaSchema = object({
  type: literal("array"),
  title: string().optional(),
  description: string().optional(),
  minItems: number().optional(),
  maxItems: number().optional(),
  items: object({
    type: literal("string"),
    enum: array(string())
  }),
  default: array(string()).optional()
});
var TitledMultiSelectEnumSchemaSchema = object({
  type: literal("array"),
  title: string().optional(),
  description: string().optional(),
  minItems: number().optional(),
  maxItems: number().optional(),
  items: object({
    anyOf: array(object({
      const: string(),
      title: string()
    }))
  }),
  default: array(string()).optional()
});
var MultiSelectEnumSchemaSchema = union([UntitledMultiSelectEnumSchemaSchema, TitledMultiSelectEnumSchemaSchema]);
var EnumSchemaSchema = union([LegacyTitledEnumSchemaSchema, SingleSelectEnumSchemaSchema, MultiSelectEnumSchemaSchema]);
var PrimitiveSchemaDefinitionSchema = union([EnumSchemaSchema, BooleanSchemaSchema, StringSchemaSchema, NumberSchemaSchema]);
var ElicitRequestFormParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  /**
   * The elicitation mode.
   *
   * Optional for backward compatibility. Clients MUST treat missing mode as "form".
   */
  mode: literal("form").optional(),
  /**
   * The message to present to the user describing what information is being requested.
   */
  message: string(),
  /**
   * A restricted subset of JSON Schema.
   * Only top-level properties are allowed, without nesting.
   */
  requestedSchema: object({
    type: literal("object"),
    properties: record(string(), PrimitiveSchemaDefinitionSchema),
    required: array(string()).optional()
  })
});
var ElicitRequestURLParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  /**
   * The elicitation mode.
   */
  mode: literal("url"),
  /**
   * The message to present to the user explaining why the interaction is needed.
   */
  message: string(),
  /**
   * The ID of the elicitation, which must be unique within the context of the server.
   * The client MUST treat this ID as an opaque value.
   */
  elicitationId: string(),
  /**
   * The URL that the user should navigate to.
   */
  url: string().url()
});
var ElicitRequestParamsSchema = union([ElicitRequestFormParamsSchema, ElicitRequestURLParamsSchema]);
var ElicitRequestSchema = RequestSchema.extend({
  method: literal("elicitation/create"),
  params: ElicitRequestParamsSchema
});
var ElicitationCompleteNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The ID of the elicitation that completed.
   */
  elicitationId: string()
});
var ElicitationCompleteNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/elicitation/complete"),
  params: ElicitationCompleteNotificationParamsSchema
});
var ElicitResultSchema = ResultSchema.extend({
  /**
   * The user action in response to the elicitation.
   * - "accept": User submitted the form/confirmed the action
   * - "decline": User explicitly decline the action
   * - "cancel": User dismissed without making an explicit choice
   */
  action: _enum(["accept", "decline", "cancel"]),
  /**
   * The submitted form data, only present when action is "accept".
   * Contains values matching the requested schema.
   * Per MCP spec, content is "typically omitted" for decline/cancel actions.
   * We normalize null to undefined for leniency while maintaining type compatibility.
   */
  content: preprocess((val) => val === null ? void 0 : val, record(string(), union([string(), number(), boolean(), array(string())])).optional())
});
var ResourceTemplateReferenceSchema = object({
  type: literal("ref/resource"),
  /**
   * The URI or URI template of the resource.
   */
  uri: string()
});
var PromptReferenceSchema = object({
  type: literal("ref/prompt"),
  /**
   * The name of the prompt or prompt template
   */
  name: string()
});
var CompleteRequestParamsSchema = BaseRequestParamsSchema.extend({
  ref: union([PromptReferenceSchema, ResourceTemplateReferenceSchema]),
  /**
   * The argument's information
   */
  argument: object({
    /**
     * The name of the argument
     */
    name: string(),
    /**
     * The value of the argument to use for completion matching.
     */
    value: string()
  }),
  context: object({
    /**
     * Previously-resolved variables in a URI template or prompt.
     */
    arguments: record(string(), string()).optional()
  }).optional()
});
var CompleteRequestSchema = RequestSchema.extend({
  method: literal("completion/complete"),
  params: CompleteRequestParamsSchema
});
function assertCompleteRequestPrompt(request) {
  if (request.params.ref.type !== "ref/prompt") {
    throw new TypeError(`Expected CompleteRequestPrompt, but got ${request.params.ref.type}`);
  }
}
function assertCompleteRequestResourceTemplate(request) {
  if (request.params.ref.type !== "ref/resource") {
    throw new TypeError(`Expected CompleteRequestResourceTemplate, but got ${request.params.ref.type}`);
  }
}
var CompleteResultSchema = ResultSchema.extend({
  completion: looseObject({
    /**
     * An array of completion values. Must not exceed 100 items.
     */
    values: array(string()).max(100),
    /**
     * The total number of completion options available. This can exceed the number of values actually sent in the response.
     */
    total: optional(number().int()),
    /**
     * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
     */
    hasMore: optional(boolean())
  })
});
var RootSchema = object({
  /**
   * The URI identifying the root. This *must* start with file:// for now.
   */
  uri: string().startsWith("file://"),
  /**
   * An optional name for the root.
   */
  name: string().optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ListRootsRequestSchema = RequestSchema.extend({
  method: literal("roots/list"),
  params: BaseRequestParamsSchema.optional()
});
var ListRootsResultSchema = ResultSchema.extend({
  roots: array(RootSchema)
});
var RootsListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/roots/list_changed"),
  params: NotificationsParamsSchema.optional()
});
union([
  PingRequestSchema,
  InitializeRequestSchema,
  CompleteRequestSchema,
  SetLevelRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema
]);
union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  InitializedNotificationSchema,
  RootsListChangedNotificationSchema,
  TaskStatusNotificationSchema
]);
union([
  EmptyResultSchema,
  CreateMessageResultSchema,
  CreateMessageResultWithToolsSchema,
  ElicitResultSchema,
  ListRootsResultSchema,
  GetTaskResultSchema,
  ListTasksResultSchema,
  CreateTaskResultSchema
]);
union([
  PingRequestSchema,
  CreateMessageRequestSchema,
  ElicitRequestSchema,
  ListRootsRequestSchema,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema
]);
union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  LoggingMessageNotificationSchema,
  ResourceUpdatedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ToolListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
  TaskStatusNotificationSchema,
  ElicitationCompleteNotificationSchema
]);
union([
  EmptyResultSchema,
  InitializeResultSchema,
  CompleteResultSchema,
  GetPromptResultSchema,
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ReadResourceResultSchema,
  CallToolResultSchema,
  ListToolsResultSchema,
  GetTaskResultSchema,
  ListTasksResultSchema,
  CreateTaskResultSchema
]);
var McpError = class _McpError extends Error {
  constructor(code, message, data) {
    super(`MCP error ${code}: ${message}`);
    this.code = code;
    this.data = data;
    this.name = "McpError";
  }
  /**
   * Factory method to create the appropriate error type based on the error code and data
   */
  static fromError(code, message, data) {
    if (code === ErrorCode.UrlElicitationRequired && data) {
      const errorData = data;
      if (errorData.elicitations) {
        return new UrlElicitationRequiredError(errorData.elicitations, message);
      }
    }
    return new _McpError(code, message, data);
  }
};
var UrlElicitationRequiredError = class extends McpError {
  constructor(elicitations, message = `URL elicitation${elicitations.length > 1 ? "s" : ""} required`) {
    super(ErrorCode.UrlElicitationRequired, message, {
      elicitations
    });
  }
  get elicitations() {
    return this.data?.elicitations ?? [];
  }
};
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
      var string2 = type;
      if (parameters && typeof parameters === "object") {
        var param;
        var params = Object.keys(parameters).sort();
        for (var i = 0; i < params.length; i++) {
          param = params[i];
          if (!TOKEN_REGEXP.test(param)) {
            throw new TypeError("invalid parameter name");
          }
          string2 += "; " + param + "=" + qstring(parameters[param]);
        }
      }
      return string2;
    }
    function parse(string2) {
      if (!string2) {
        throw new TypeError("argument string is required");
      }
      var header = typeof string2 === "object" ? getcontenttype(string2) : string2;
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
var CODE_PAGE_TRUE$1 = /* @__PURE__ */ new Set([true, "true", "{{true}}"]);
function codeScreens(summary) {
  const pageIds = new Set(summary.pages.map((page) => page.id));
  const screens = [];
  for (const page of summary.pages) {
    for (const component of page.components) {
      const props = component.properties ?? {};
      if (component.parent || !CODE_PAGE_TRUE$1.has(props.codePage?.value))
        continue;
      let routes = props.routes?.value;
      if (typeof routes === "string") {
        try {
          routes = JSON.parse(routes);
        } catch {
          routes = [];
        }
      }
      if (!Array.isArray(routes))
        continue;
      for (const route of routes) {
        if (typeof route?.id !== "string" || typeof route?.path !== "string")
          continue;
        if (typeof route.pageId !== "string" || !pageIds.has(route.pageId))
          continue;
        screens.push({
          route_id: route.id,
          path: route.path,
          ...typeof route.title === "string" ? { title: route.title } : {},
          page_id: route.pageId,
          code_page_id: page.id
        });
      }
    }
  }
  return screens;
}
function findScreen(summary, route) {
  const screens = codeScreens(summary);
  const screen = screens.find((s) => s.route_id === route) ?? screens.find((s) => s.path === route);
  if (screen)
    return screen;
  throw new Error(`No Code mode screen "${route}" in app "${summary.app_id}". ` + (screens.length ? `Its screens: ${screens.map((s) => `${s.route_id} (${s.path})`).join(", ")}.` : "The app has no Code mode screens."));
}
function findQuery(summary, ref) {
  const lower = ref.toLowerCase();
  return summary.queries.find((q) => q.id === ref) ?? summary.queries.find((q) => q.name === ref) ?? summary.queries.find((q) => q.name?.toLowerCase() === lower);
}
function isCodeApp(summary) {
  return summary.pages.some((page) => page.components.some((component) => {
    const props = component.properties ?? {};
    return !component.parent && CODE_PAGE_TRUE$1.has(props.codePage?.value);
  }));
}
function findResource(summary, resourceType, resourceId) {
  if (resourceType === "page") {
    const page = summary.pages.find((candidate) => candidate.id === resourceId) ?? summary.pages.find((candidate) => candidate.name === resourceId);
    if (page)
      return { type: resourceType, id: page.id, name: page.name };
  } else if (resourceType === "query") {
    const query = findQuery(summary, resourceId);
    if (query)
      return { type: resourceType, id: query.id, name: query.name };
  } else {
    for (const page of summary.pages) {
      const component = page.components.find((candidate) => candidate.id === resourceId);
      if (component) {
        return {
          type: resourceType,
          id: component.id,
          name: component.name,
          component_type: component.type,
          page_id: page.id,
          page_name: page.name
        };
      }
    }
  }
  throw new Error(`${resourceType} "${resourceId}" does not belong to app "${summary.app_id}". Use get_app_summary and do not guess resource ids.`);
}
function normalizePermission(permissions) {
  const permission = permissions[0];
  if (!permission)
    return { access: "all", permission_id: null };
  if (permission.type === "SINGLE") {
    return {
      access: "users",
      permission_id: permission.id,
      users: (Array.isArray(permission.users) ? permission.users : []).map((entry) => entry?.user).filter(Boolean).map((user) => ({
        id: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || void 0,
        email: user.email
      }))
    };
  }
  if (permission.type === "GROUP") {
    return {
      access: "groups",
      permission_id: permission.id,
      groups: (Array.isArray(permission.groups) ? permission.groups : []).map((entry) => entry?.permissionGroup).filter(Boolean).map((group) => ({ id: group.id, name: group.name }))
    };
  }
  return { access: String(permission.type ?? "unknown").toLowerCase(), permission_id: permission.id };
}
function planLimits(features) {
  if (!features)
    return void 0;
  const known = Object.entries({
    query_limits: features.appPermissionQuery,
    screen_limits: features.appPermissionPages,
    server_side_current_user: features.serverSideGlobalResolve
  }).filter(([, value]) => typeof value === "boolean");
  return known.length ? Object.fromEntries(known) : void 0;
}
async function subjectGroups(client, open) {
  const openIds = new Map(open.map((group) => [group.id, group]));
  let workspace;
  try {
    workspace = await client.listWorkspaceGroups();
  } catch {
    workspace = void 0;
  }
  if (!workspace) {
    return {
      groups: open.map((group) => ({ ...group, can_open_app: true })),
      complete: false
    };
  }
  const groups = workspace.map((group) => ({
    id: group.id,
    name: group.name,
    type: group.type,
    ...typeof openIds.get(group.id)?.count === "number" ? { count: openIds.get(group.id).count } : {},
    can_open_app: openIds.has(group.id),
    ...group.disabled ? { disabled: true } : {}
  }));
  for (const group of open)
    if (!groups.some((known) => known.id === group.id))
      groups.push({ ...group, can_open_app: true });
  return { groups, complete: true };
}
function viewRule(appId, appName, groupId) {
  return {
    name: `${(appName || "App").slice(0, 40)} (view)`,
    type: "app",
    groupId,
    isAll: false,
    createResourcePermissionObject: {
      canEdit: false,
      canView: true,
      hideFromDashboard: false,
      canAccessDevelopment: false,
      canAccessStaging: false,
      canAccessProduction: false,
      canAccessReleased: true,
      resourcesToAdd: [{ appId }]
    }
  };
}
async function groupDirectory(client, appId) {
  const subjects = await client.listAppPermissionSubjects(appId);
  const { groups, complete } = await subjectGroups(client, subjects.groups);
  return { groups, complete, openIds: new Set(subjects.groups.map((group) => group.id)) };
}
function resolveGroups(directory, refs) {
  const ids = [];
  const unknown2 = [];
  for (const ref of refs) {
    const lower = ref.toLowerCase();
    const group = directory.groups.find((g) => g.id === ref) ?? directory.groups.find((g) => g.name === ref) ?? directory.groups.find((g) => g.name?.toLowerCase() === lower);
    if (group)
      ids.push(group.id);
    else if (!directory.complete && UUID.test(ref))
      ids.push(ref);
    else
      unknown2.push(ref);
  }
  return { ids: [...new Set(ids)], unknown: unknown2 };
}
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function ensureGroupsCanOpen(client, appId, appName, directory, groupIds, grant) {
  const missing = groupIds.filter((id) => !directory.openIds.has(id));
  if (!missing.length)
    return [];
  const byId = new Map(directory.groups.map((group) => [group.id, group]));
  const names = missing.map((id) => byId.get(id)?.name ?? id);
  if (!grant) {
    throw new Error(`${names.join(", ")} cannot open this app yet, so a limit to ${missing.length > 1 ? "them" : "it"} would leave ${missing.length > 1 ? "their" : "its"} members without the screen or query. Pass grant_app_access: true to give each of them view access to this app only (the released app), or give them access in Workspace settings > Groups. Nothing was changed.`);
  }
  const disabled = missing.filter((id) => byId.get(id)?.disabled);
  if (disabled.length) {
    throw new Error(`${disabled.map((id) => byId.get(id)?.name ?? id).join(", ")} cannot be changed under the current plan, so it cannot be given access to this app. Nothing was changed.`);
  }
  const granted = [];
  for (const id of missing) {
    const rule = viewRule(appId, appName, id);
    await client.writeWorkspaceGroupAccess("POST", id, "app", void 0, rule);
    granted.push({ group_id: id, ...byId.get(id)?.name ? { name: byId.get(id).name } : {}, rule_name: rule.name });
  }
  const after = new Set((await client.listAppPermissionSubjects(appId)).groups.map((group) => group.id));
  const still = missing.filter((id) => !after.has(id));
  if (still.length) {
    throw new Error(`ToolJet did not confirm that ${still.map((id) => byId.get(id)?.name ?? id).join(", ")} can open this app after the access rule was added, so no limit was set. Check the group in Workspace settings > Groups.`);
  }
  return granted;
}
function resolveTargets(args, summary, problems) {
  const targets = [];
  const routes = [...args.route !== void 0 ? [args.route] : [], ...args.routes ?? []];
  const queries = [...args.query !== void 0 ? [args.query] : [], ...args.queries ?? []];
  const type = args.resource_type === "screen" ? "page" : args.resource_type;
  if (routes.length && type && type !== "page") {
    problems.push(`route names a Code mode screen (a page permission), so resource_type "${args.resource_type}" does not fit: leave resource_type out.`);
  }
  if (queries.length && type && type !== "query") {
    problems.push(`query names a query, so resource_type "${args.resource_type}" does not fit: leave resource_type out.`);
  }
  for (const route of [...new Set(routes)]) {
    try {
      const screen = findScreen(summary, route);
      targets.push({
        resourceType: "page",
        resourceId: screen.page_id,
        resource: {
          ...findResource(summary, "page", screen.page_id),
          screen: { route_id: screen.route_id, path: screen.path, title: screen.title }
        }
      });
    } catch (error) {
      problems.push(error.message);
    }
  }
  const unknownQueries = [];
  for (const ref of [...new Set(queries)]) {
    const query = findQuery(summary, ref);
    if (!query)
      unknownQueries.push(ref);
    else
      targets.push({ resourceType: "query", resourceId: query.id, resource: { type: "query", id: query.id, name: query.name } });
  }
  if (unknownQueries.length) {
    const names = summary.queries.map((q) => q.name ?? q.id);
    problems.push(`No query ${unknownQueries.map((q) => `"${q}"`).join(", ")} in this app. ` + (names.length ? `Its queries: ${names.join(", ")}.` : "The app has no queries."));
  }
  if (args.resource_id !== void 0) {
    const kinds = type ? [type] : ["query", "page", "component"];
    let found;
    for (const kind of kinds) {
      try {
        found = { resourceType: kind, resourceId: "", resource: findResource(summary, kind, args.resource_id) };
        found.resourceId = String(found.resource.id);
        break;
      } catch {
      }
    }
    if (found)
      targets.push(found);
    else
      problems.push(`resource_id "${args.resource_id}" is no ${type ?? "page, query or component"} of this app. Pass a query by its name with query, or a screen with route.`);
  }
  if (!routes.length && !queries.length && args.resource_id === void 0) {
    const screens = codeScreens(summary);
    problems.push("Name what to limit: route (or routes) for screens, query (or queries) for queries, by name or id." + (screens.length ? ` Screens: ${screens.map((s) => s.path).join(", ")}.` : "") + (summary.queries.length ? ` Queries: ${summary.queries.map((q) => q.name ?? q.id).join(", ")}.` : ""));
  }
  const seen = /* @__PURE__ */ new Set();
  return targets.filter((target) => {
    const key = `${target.resourceType}:${target.resourceId}`;
    if (seen.has(key))
      return false;
    seen.add(key);
    return true;
  });
}
function exampleCall(args, summary, codeApp) {
  const example = { action: args.action === "get" ? "get" : args.action, app_id: args.app_id };
  const screens = summary ? codeScreens(summary) : [];
  if (args.routes?.length)
    example.routes = args.routes;
  else if (args.route)
    example.route = args.route;
  else if (args.queries?.length)
    example.queries = args.queries;
  else if (args.query)
    example.query = args.query;
  else if (screens.length)
    example.route = screens[screens.length - 1].path;
  else if (summary?.queries.length)
    example.query = summary.queries[0].name ?? summary.queries[0].id;
  else
    example.route = "/finance";
  if (args.action === "set") {
    if (args.users?.length || args.user_ids?.length)
      example.users = args.users ?? args.user_ids;
    else
      example.groups = args.groups ?? args.group_ids ?? ["Finance"];
    if (!codeApp)
      example.confirm = true;
  }
  if (args.action === "clear")
    example.confirm = true;
  return JSON.stringify(example);
}
function manageAppPermissionsTool(client) {
  return {
    name: "manage_app_permissions",
    title: "Manage App Permissions",
    // get/list_subjects only read, but set overwrites an access rule and clear broadens access to
    // every user who can reach the app, so the hint covers its widest action.
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: `Server-enforced access to an app's screens and queries: who can open a Code mode screen (route) or run a query. Example: {"action":"set","app_id":"<id>","route":"/finance","groups":["Finance"]}; for queries "query":"finance_queue" (name or id), and "routes" or "queries" take several at once with the same groups. groups take names or ids, users take emails or ids; access_type and resource_type are inferred. In a Code mode app, set needs no confirm, and a named group that cannot open the app first gets view access to this app only (grant_app_access defaults to true; false refuses instead). In other apps set needs confirm:true after the user approves the exact rule. clear (back to everyone who can open the app) always needs confirm:true. list_subjects: every workspace group with can_open_app, and plan (whether this plan enforces query and screen limits and resolves {{globals.server.currentUser}} on the server). list_screens: each route with its access. A screen limit hides the screen; the data it shows is protected only by limiting the queries that return it. Visual pages and components: resource_id (resource_type is optional). License gates apply.`,
    inputSchema: {
      action: external_exports.enum(["list_subjects", "list_screens", "get", "set", "clear"]),
      app_id: external_exports.string().uuid(),
      route: external_exports.string().min(1).max(200).optional().describe("A Code mode screen by route path or id (app.json routes)."),
      routes: external_exports.array(external_exports.string().min(1).max(200)).min(1).max(50).optional().describe("Several screens at once."),
      query: external_exports.string().min(1).max(200).optional().describe("A query by name or id."),
      queries: external_exports.array(external_exports.string().min(1).max(200)).min(1).max(100).optional().describe("Several queries at once."),
      groups: external_exports.array(external_exports.string().min(1).max(200)).min(1).max(100).optional().describe("Group names or ids."),
      users: external_exports.array(external_exports.string().min(1).max(320)).min(1).max(100).optional().describe("User emails or ids."),
      resource_type: external_exports.enum(["page", "query", "component", "screen"]).optional().describe("Inferred; only needed with resource_id."),
      resource_id: external_exports.string().min(1).max(200).optional(),
      access_type: external_exports.enum(["users", "groups"]).optional().describe("Inferred from groups or users."),
      user_ids: external_exports.array(external_exports.string().min(1)).min(1).max(100).optional(),
      group_ids: external_exports.array(external_exports.string().min(1)).min(1).max(100).optional(),
      confirm: external_exports.boolean().optional(),
      grant_app_access: external_exports.boolean().optional().describe("set with groups: give a group that cannot open the app view access to this app only first (default true in a Code mode app)")
    },
    async handler(args) {
      try {
        if (args.action === "list_subjects") {
          const [subjects, features] = await Promise.all([
            client.listAppPermissionSubjects(args.app_id),
            client.getLicenseFeatureAccess().catch(() => void 0)
          ]);
          const { groups, complete } = await subjectGroups(client, subjects.groups);
          const plan = planLimits(features);
          return ok({
            app_id: args.app_id,
            users: subjects.users,
            groups,
            ...plan ? { plan } : {},
            note: complete ? "A group with can_open_app false cannot open the app: a set naming it gives it view access to this app only first (in a Code mode app by default, elsewhere with grant_app_access:true)." : "Only the groups that can open the app are listed: the workspace group list could not be read."
          });
        }
        if (args.action === "list_screens") {
          const summary2 = await client.getAppSummary(args.app_id);
          const screens = await Promise.all(codeScreens(summary2).map(async (screen) => ({
            ...screen,
            ...normalizePermission(await client.getAppPermission(args.app_id, "page", screen.page_id))
          })));
          return ok({ app_id: args.app_id, screens });
        }
        const summary = await client.getAppSummary(args.app_id);
        const codeApp = isCodeApp(summary);
        const problems = [];
        const targets = resolveTargets(args, summary, problems);
        let accessType;
        let subjectIds = [];
        let directory;
        if (args.action === "set") {
          const groupRefs = [...args.groups ?? [], ...args.group_ids ?? []];
          const userRefs = [...args.users ?? [], ...args.user_ids ?? []];
          if (groupRefs.length && userRefs.length) {
            problems.push("Pass groups or users, not both: one limit is to groups or to named users.");
          } else if (!groupRefs.length && !userRefs.length) {
            problems.push("Name who keeps access: groups (names or ids) or users (emails or ids).");
          } else {
            accessType = groupRefs.length ? "groups" : "users";
            if (args.access_type && args.access_type !== accessType) {
              problems.push(`access_type "${args.access_type}" does not match the ${accessType} passed: leave access_type out.`);
            }
          }
          if (accessType === "groups") {
            directory = await groupDirectory(client, args.app_id);
            const { ids, unknown: unknown2 } = resolveGroups(directory, groupRefs);
            if (unknown2.length) {
              problems.push(`${unknown2.map((g) => `"${g}"`).join(", ")} ${unknown2.length > 1 ? "are not groups" : "is not a group"} of this workspace. Its groups: ${directory.groups.map((g) => g.name ?? g.id).join(", ")}.`);
            }
            subjectIds = ids;
          } else if (accessType === "users") {
            const users = (await client.listAppPermissionSubjects(args.app_id)).users;
            const unknown2 = [];
            for (const ref of userRefs) {
              const lower = ref.toLowerCase();
              const user = users.find((u) => u.id === ref) ?? users.find((u) => u.email?.toLowerCase() === lower);
              if (user)
                subjectIds.push(user.id);
              else
                unknown2.push(ref);
            }
            if (unknown2.length) {
              problems.push(`${unknown2.map((u) => `"${u}"`).join(", ")} cannot open this app or is not a user of this workspace (users must already have access to the app; list_subjects lists them).`);
            }
            subjectIds = [...new Set(subjectIds)];
            if (args.grant_app_access === true) {
              problems.push("grant_app_access applies only to a limit to groups: leave it out with users.");
            }
          }
          if (!codeApp && args.confirm !== true) {
            problems.push("set on this app needs confirm:true after the user explicitly approves the exact access rule.");
          }
        }
        if (args.action === "clear" && args.confirm !== true) {
          problems.push("clear opens the resource to everyone who can open the app, so it needs confirm:true after the user approves it.");
        }
        if (problems.length) {
          throw new Error(`manage_app_permissions ${args.action} was refused and nothing was changed:
` + problems.map((problem) => `- ${problem}`).join("\n") + `
A call that works: ${exampleCall(args, summary, codeApp)}`);
        }
        const one = targets.length === 1;
        if (args.action === "get") {
          const results2 = await Promise.all(targets.map(async (t) => ({ resource: t.resource, ...normalizePermission(await client.getAppPermission(args.app_id, t.resourceType, t.resourceId)) })));
          return ok(one ? { app_id: args.app_id, ...results2[0] } : { app_id: args.app_id, results: results2 });
        }
        if (args.action === "clear") {
          for (const t of targets)
            await client.clearAppPermission(args.app_id, t.resourceType, t.resourceId);
          const results2 = targets.map((t) => ({ resource: t.resource, access: "all", permission_id: null }));
          return ok(one ? { app_id: args.app_id, ...results2[0] } : { app_id: args.app_id, results: results2 });
        }
        const grant = args.grant_app_access ?? codeApp;
        const granted = accessType === "groups" ? await ensureGroupsCanOpen(client, args.app_id, summary.name, directory, subjectIds, grant) : [];
        const results = [];
        for (const t of targets) {
          try {
            const permissions = await client.setAppPermission({
              appId: args.app_id,
              resourceType: t.resourceType,
              resourceId: t.resourceId,
              accessType,
              subjectIds
            });
            results.push({ resource: t.resource, ...normalizePermission(permissions) });
          } catch (error) {
            results.push({ resource: t.resource, error: error.message });
          }
        }
        const failed = results.filter((r) => r.error);
        const grantNote = granted.length ? `${granted.map((g) => g.name ?? g.group_id).join(", ")} could not open this app, so ${granted.length > 1 ? "each now has" : "it now has"} view access to this app only (released app, rule "${granted[0].rule_name}").` : void 0;
        const body = {
          app_id: args.app_id,
          ...one ? results[0] : { results },
          ...granted.length ? { granted_app_access: granted, note: grantNote } : {}
        };
        if (failed.length === results.length) {
          throw new Error(failed.map((r) => `${r.resource.name ?? r.resource.id}: ${r.error}`).join("; ") + (grantNote ? ` (${grantNote})` : ""));
        }
        return ok(failed.length ? { ...body, warning: `${failed.length} of ${results.length} limits were not set; see each error.` } : body);
      } catch (error) {
        return fail(error);
      }
    }
  };
}
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
  await cli(dir, ["app", "install"], 18e4);
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
    description: "Write into a Code mode project: app.json (name, codePage, routes [{id, path, title}]), frontend/styles/theme.css (tokens), frontend/styles/global.css (page-wide rules and library overrides) and anything under frontend/src/. To change an existing file, read it first (code_app_read_files) and pass edits: [{ path, find, replace }] with the exact text to change; files: [{ path, content }] is for new files and for replacing a file still as the template left it, or for a rewrite the request needs (then rewrite: true, as well as the files). A write to a file that changed in the ToolJet editor since you read it is refused: read it again and apply your change to what is there. Read data with useAppQuery from ../tooljet.gen; write by awaiting a query's run({ ...parameters }); route with AppRouter, react-router <Routes>/<Route> whose paths are exactly app.json's, and routePath(id, params). A type_check in the result lists the project's type errors after this write: fix them before code_app_build. Then code_app_build." + USER_WORDS,
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
        const types = await typeCheckAfterWrite(dir, written).catch(() => void 0);
        return ok({ project_dir: dir, ...sync, written, ...types ? { type_check: types } : {} });
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
        const followed = await followDraft(dir);
        await ensureFresh(dir);
        await copySdkIn(dir);
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
        const serverUser = await browserUserQueries(args.app_id ?? appIdOf(dir));
        const extra = [...handles, ...unstyled ? [unstyled] : [], ...sdkRedeclared(dir), ...serverUser];
        const okBuild = pull.code === 0 && build.code === 0 && tsErrors === 0 && check.code === 0 && !extra.length;
        if (okBuild)
          prefetchFullScan(dir);
        return ok({
          ...followed ? { draft: followed } : {},
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
export {
  isCodeModeApp as $,
  CreateMessageResultWithToolsSchema as A,
  CreateMessageResultSchema as B,
  CancelledNotificationSchema as C,
  ElicitResultSchema as D,
  ErrorCode as E,
  ListRootsResultSchema as F,
  GetTaskRequestSchema as G,
  SUPPORTED_PROTOCOL_VERSIONS as H,
  InitializeRequestSchema as I,
  CallToolResultSchema as J,
  codeAppScaffoldTool as K,
  ListTasksRequestSchema as L,
  McpError as M,
  codeAppReadFilesTool as N,
  codeAppWriteFilesTool as O,
  ProgressNotificationSchema as P,
  codeAppBuildTool as Q,
  RELATED_TASK_META_KEY as R,
  SetLevelRequestSchema as S,
  TaskStatusNotificationSchema as T,
  codeAppInstallTool as U,
  codeAppAddDependencyTool as V,
  manageAppPermissionsTool as W,
  noCodeIdentity as X,
  WebStandardStreamableHTTPServerTransport as Y,
  getRequestListener as Z,
  browserUserBindings as _,
  PingRequestSchema as a,
  browserUserMessage as a0,
  JSONRPCMessageSchema as a1,
  GetTaskPayloadRequestSchema as b,
  CancelTaskRequestSchema as c,
  isJSONRPCErrorResponse as d,
  isJSONRPCRequest as e,
  isJSONRPCNotification as f,
  isTaskAugmentedRequestParams as g,
  CreateTaskResultSchema as h,
  isJSONRPCResultResponse as i,
  GetTaskResultSchema as j,
  ListTasksResultSchema as k,
  CancelTaskResultSchema as l,
  ListToolsRequestSchema as m,
  CallToolRequestSchema as n,
  CompleteRequestSchema as o,
  assertCompleteRequestResourceTemplate as p,
  assertCompleteRequestPrompt as q,
  ListResourcesRequestSchema as r,
  ListResourceTemplatesRequestSchema as s,
  ReadResourceRequestSchema as t,
  ListPromptsRequestSchema as u,
  GetPromptRequestSchema as v,
  LoggingLevelSchema as w,
  InitializedNotificationSchema as x,
  LATEST_PROTOCOL_VERSION as y,
  EmptyResultSchema as z
};
