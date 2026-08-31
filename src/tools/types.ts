import type { z } from 'zod';
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
  annotations: ToolAnnotations;
  inputSchema: z.ZodRawShape;
  handler: (args: any) => Promise<ToolResult>;
}

/** Wraps a value as a successful MCP tool result. */
export function ok(value: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value) }] };
}

/** Wraps a thrown error as a failed MCP tool result. Never throws. */
export function fail(err: unknown): ToolResult {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}
