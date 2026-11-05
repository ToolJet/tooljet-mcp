import { createRequire } from "node:module";
import { j as union, A as string, V as number, a7 as looseObject, U as object, a8 as literal, i as unknown, ax as _enum, aU as array, ai as intersection, K as record, aQ as boolean, N as preprocess, T as optional, ae as iso_exports, aD as discriminatedUnion, aI as custom, Y as _null2 } from "./chunk-Ct2h4NOy.js";
import { ed as __toESM, eb as __commonJS, e5 as fail, e6 as ok } from "./chunk-addBGscc.js";
import { a as assessQueryRead } from "./chunk-CQ1QtaUb.js";
import { b0 as external_exports } from "./chunk-CN1mtqtB.js";
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
        return new Promise((resolve) => {
          this._streamMapping.set(streamId, {
            resolveJson: resolve,
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
var pathOf = (url) => {
  try {
    return new URL(url).pathname;
  } catch {
    return "?";
  }
};
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
    browser = await pw.chromium.launch(launch);
  } catch {
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
      ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, serviceWorkers: "block" });
      if (!ctx.routeWebSocket) {
        reports[index] = unreachable(p, "browser_unavailable", "The render audit requires Playwright 1.48+ for WebSocket interception");
        return;
      }
      if (options.session) {
        if (typeof options.session === "string") {
          await ctx.addCookies([{ name: "tj_auth_token", value: options.session, url: new URL(p.url).origin }]);
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
        block({ kind: "unreachable", component: "-", reason: "blocked_destination", detail: "A WebSocket dependency was blocked; live behavior was not verified" }, `WebSocket ${pathOf(socket.url?.() ?? "")}`);
        socket.close();
      });
      await ctx.route("**/*", async (route) => {
        const request = route.request();
        const url = request.url();
        if (!renderAuditUrlAllowed(url, origins)) {
          block({ kind: "unreachable", component: "-", reason: "blocked_destination", detail: "A navigation or resource outside the configured audit origins was blocked" }, `${request.method()} ${new URL(url).origin}`);
          await route.abort();
          return;
        }
        try {
          const policy = renderAuditRequest(url, request.method(), options.savedQueries);
          if (!policy.allowed) {
            block({
              kind: "unreachable",
              component: "-",
              reason: "blocked_execution",
              detail: `${policy.detail} (${request.method()} ${pathOf(url)})`
            }, `${request.method()} ${pathOf(url)}`);
            await route.abort();
            return;
          }
          if (request.method() === "GET" && STATIC_RESOURCES.has(request.resourceType?.())) {
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
              }, `${request.method()} ${pathOf(url)} redirected`);
              await route.abort();
            } else
              await route.fulfill({ response: response2 });
          } finally {
            await response2.dispose();
          }
        } catch {
          block({ kind: "unreachable", component: "-", reason: "navigation_failed", detail: "A viewer resource could not be loaded; the audit is incomplete" }, `${request.method()} ${pathOf(url)}`);
          await route.abort().catch(() => {
          });
        }
      });
      const page = await ctx.newPage();
      const response = await page.goto(p.url, { waitUntil: "domcontentloaded", timeout: 6e4 });
      if (response && response.status() >= 400) {
        const status = response.status();
        reports[index] = unreachable(p, [401, 403].includes(status) ? "auth_required" : "navigation_failed", "Viewer returned HTTP " + status);
        return;
      }
      await page.waitForTimeout(options.settleMs ?? 6e3);
      await page.waitForFunction(() => {
        const charts = document.querySelectorAll('[data-cy^="draggable-widget-"]._tooljet-Chart').length;
        const plots = document.querySelectorAll('[data-cy^="draggable-widget-"]._tooljet-Chart .js-plotly-plot').length;
        return charts === 0 || plots >= charts;
      }, void 0, { timeout: options.chartWaitMs ?? 2e4 }).catch(() => void 0);
      await page.waitForTimeout(1500);
      const landed = page.url();
      if (/\/(?:login|sign-in|signin)\b/i.test(new URL(landed).pathname)) {
        reports[index] = unreachable(p, "auth_required", "The viewer requires sign-in; private app rendering was not verified");
        return;
      }
      const result = await page.evaluate(auditScript);
      reports[index] = result.widgets === 0 && blocked ? { page: p.page, url: p.url, widgets: 0, findings: [{ ...blocked, detail: `${blocked.detail}; the page then showed no widgets. Blocked: ${blocks.join("; ")}` }] } : result.widgets === 0 ? unreachable(p, "no_widgets", "No ToolJet widgets were found; the page may be empty, unauthenticated, or not loaded") : { page: p.page, url: p.url, widgets: result.widgets, findings: [...result.findings, ...blockFindings] };
    } catch (err) {
      const why = String(err?.message ?? err).split("\n")[0].slice(0, 200);
      reports[index] = blocked ? { ...p, widgets: 0, findings: [{ ...blocked, detail: `${blocked.detail}; the audit then stopped: ${why}. Blocked: ${blocks.join("; ")}` }] } : unreachable(p, "navigation_failed", `Could not load or inspect the viewer page: ${why}`);
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
  }
  return reports;
}
function verifyPageRenderTool(client, viewerBase, driver = loadPlaywright) {
  return {
    name: "verify_page_render",
    title: "Verify Page Render",
    annotations: { readOnlyHint: true, openWorldHint: true },
    description: `Render audit of one page or every page of an app in a headless browser at 1600x900, after the app is built. Reports what lint cannot see: Html/Text widgets that render empty (a multi-line binding, a broken expression), placeholder text a customer would read as a bug ("undefined", "NaN", "Invalid date", "Tab 1", "Select..", a literal \\n), text clipped inside its box, and components overlapping each other. Run it once per page before the handoff and review every finding; report unverified behavior explicitly. Opens the version being edited with the builder's ToolJet session, or a separate app-scoped OAuth viewer credential (limited to the viewer origin), so a private app is audited without being made public. Only saved, static, bounded read queries may run; writes, dynamic queries and queries requiring confirmation are blocked and reported as unverified. Returns { pages: [{ page, url, widgets, findings: [{ kind, component, detail }] }], ok }.`,
    inputSchema: {
      app_id: external_exports.string().regex(/^[A-Za-z0-9_-]+$/),
      page_handle: external_exports.string().optional().describe("one page handle; omit to audit every page"),
      viewer_url: external_exports.string().optional().describe("canonical viewer base URL; alternate origins require host configuration in MCP_RENDER_AUDIT_ALLOWED_ORIGINS")
    },
    async handler(args) {
      const release = reserveRenderAudit(client.renderAuditGrant);
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
        const pages = summary.pages ?? [];
        const version = await client.editingVersionName?.(args.app_id).catch(() => void 0);
        const preview = version ? `?env=development&version=${encodeURIComponent(version)}` : "";
        const targets = pages.filter((p) => !args.page_handle || p.handle === args.page_handle).map((p) => ({ page: p.handle ?? p.name ?? "home", url: `${base}/applications/${args.app_id}/${encodeURIComponent(p.handle ?? "home")}${preview}` }));
        if (!targets.length)
          return fail(new Error(`no page ${args.page_handle ?? ""} in app ${args.app_id}`));
        if (summary.queries?.length) {
          if (!summary.version_id)
            return fail(new Error("Cannot verify datasource eligibility without an app version."));
          if (summary.queries.some((query) => !query.data_source_id)) {
            return fail(new Error("Cannot verify an app query datasource; refusing browser verification."));
          }
          await client.listDatasources(summary.version_id);
          await Promise.all([...new Set(summary.queries.map((query) => query.data_source_id))].map((id) => client.assertDatasourceAllowed(id, summary.version_id)));
        }
        const options = {
          channel: process.env.MCP_RENDER_AUDIT_CHANNEL || "chrome",
          executablePath: process.env.MCP_RENDER_AUDIT_CHROME || void 0,
          allowedOrigins: origins,
          savedQueries: summary,
          // MCP_RENDER_AUDIT_SESSION=off keeps the browser unauthenticated (private apps are then reported unverified).
          session: process.env.MCP_RENDER_AUDIT_SESSION === "off" ? void 0 : client.browserRenderOrigin ? await client.viewerSession?.(args.app_id) : await client.viewerSession?.(args.app_id).catch(() => void 0)
        };
        const reports = await auditPages(targets, options, driver);
        const total = reports.reduce((n, r) => n + r.findings.length, 0);
        return ok({ pages: reports, ok: total === 0, findings: total });
      } catch (err) {
        return fail(err);
      } finally {
        release();
      }
    }
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
  const promise = new Promise((resolve, reject) => {
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
          resolve(recovered);
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
        resolve(buffer);
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
            await new Promise((resolve) => setTimeout(resolve));
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
  verifyPageRenderTool as K,
  ListTasksRequestSchema as L,
  McpError as M,
  getRequestListener as N,
  JSONRPCMessageSchema as O,
  ProgressNotificationSchema as P,
  RELATED_TASK_META_KEY as R,
  SetLevelRequestSchema as S,
  TaskStatusNotificationSchema as T,
  WebStandardStreamableHTTPServerTransport as W,
  PingRequestSchema as a,
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
