import { tableQuotaError } from '../tableQuotaError.js';
import { z } from 'zod';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

export interface ToolTextContent {
  type: 'text';
  text: string;
}

export interface ToolResult {
  content: ToolTextContent[];
  isError?: boolean;
  _meta?: Record<string, unknown>;
}

/** Direct booleans are required by public MCP review; never fill missing values at registration. */
export type ExplicitToolAnnotations = ToolAnnotations & Required<Pick<
  ToolAnnotations, 'readOnlyHint' | 'destructiveHint' | 'openWorldHint'
>>;

export interface ToolDef {
  name: string;
  /**
   * Human-readable name for the tool, shown in client UIs and in directory listings.
   *
   * Required rather than optional: a tool that reaches a client without one is displayed by its
   * snake_case identifier, and the Claude connector directory rejects the whole server for it.
   * Making the compiler ask for it is cheaper than remembering to.
   */
  title: string;
  description: string;
  /**
   * Behavioural hints. Required for the same reason `title` is — but the stakes are higher, because
   * an omitted `destructiveHint` defaults to *true* under the spec while an omitted `readOnlyHint`
   * defaults to false. Silence therefore reads as "this tool may destroy things", which is wrong for
   * most of this server and would train clients to over-confirm the safe majority. Say it explicitly.
   */
  annotations: ExplicitToolAnnotations;
  inputSchema: z.ZodRawShape;
  /** Reject unknown arguments in the SDK before it can strip them from a mutation. */
  strictInput?: boolean;
  handler: (args: any) => Promise<ToolResult>;
}

/** Wraps a value as a successful MCP tool result. */
export function ok(value: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value) }] };
}

/** Wraps a thrown error as a failed MCP tool result. Never throws. */
export function fail(err: unknown): ToolResult {
  const message = err instanceof Error ? err.message : String(err);
  const quota = tableQuotaError(err);
  const text = quota ? JSON.stringify({ error: {
    code: quota.code, status: quota.status, retryable: quota.retryable,
    message: quota.message, details: message,
  } }) : `Error: ${message}`;
  return { content: [{ type: 'text', text }], isError: true };
}

export interface ActionTool extends Pick<ToolDef, 'name' | 'title' | 'description' | 'annotations'> {
  action: string;
  required: string[];
  optional?: string[];
}

// Like the registry schemas, these are independent of the request identity. Do not retain a
// source ToolDef in a callback: that would keep another schema tree alive per HTTP request.
const schemas = new Map<string, z.ZodObject>();

/** Expose fixed operations without duplicating their authorization and confirmation checks. */
export function exposeActions(source: ToolDef, definitions: ActionTool[]): ToolDef[] {
  source.description += ' Individually exposed operations: ' + definitions.map(action => action.name).join(', ') + '.';
  const handler = source.handler;
  return definitions.map(({ action, required, optional = [], ...definition }) => {
    let schema = schemas.get(definition.name);
    if (!schema) {
      const fields: { -readonly [K in keyof z.ZodRawShape]: z.ZodRawShape[K] } = {};
      for (const key of [...required, ...optional]) {
        if (key === 'action' || !source.inputSchema[key]) throw new Error(`Invalid action field: ${definition.name}.${key}`);
        fields[key] = source.inputSchema[key];
      }
      schema = z.object(fields).required(Object.fromEntries(required.map(key => [key, true]))).strict();
      if (required.includes('confirm')) schema = schema.extend({ confirm: z.literal(true) });
      schemas.set(definition.name, schema);
    }
    const input = schema;
    return {
      ...definition,
      strictInput: true,
      inputSchema: input.shape,
      async handler(args: unknown) {
        try {
          // Parse here too so direct callers cannot inject an action or irrelevant write fields.
          return await handler({ ...input.parse(args), action });
        } catch (error) {
          return fail(error);
        }
      },
    };
  });
}
