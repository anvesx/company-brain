import { GraphError } from "@anvesx/graph-store";
import { IdentityError } from "@anvesx/identity";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/** The only four codes a client ever sees. */
export const CODES = ["NOT_FOUND", "INVALID_ARGUMENT", "UNAUTHENTICATED", "INTERNAL"] as const;
export type Code = (typeof CODES)[number];

/** A failure a tool raises on purpose. Its code and message are safe to show the client. */
export class ToolFailure extends Error {
  override readonly name = "ToolFailure";
  readonly code: Code;
  constructor(code: Code, message: string) {
    super(message);
    if (!CODES.includes(code)) throw new RangeError(`unknown tool failure code: ${String(code)}`);
    this.code = code;
  }
}

/** Picks the code and the message to show. Anything we did not expect becomes a bare INTERNAL. */
function describe(error: unknown): { code: Code; message: string } {
  if (error instanceof ToolFailure) return { code: error.code, message: error.message };
  if (error instanceof GraphError && error.code === "BAD_INPUT") return { code: "INVALID_ARGUMENT", message: error.message };
  if (error instanceof IdentityError) return { code: "UNAUTHENTICATED", message: error.message };
  // Never echo the original message: it could carry a path, a query or a token.
  return { code: "INTERNAL", message: "internal error" };
}

/** Turns any thrown value into an MCP error result: text for people, structuredContent for code. */
export function toToolResult(error: unknown): CallToolResult {
  const out = describe(error);
  return { isError: true, content: [{ type: "text", text: `${out.code}: ${out.message}` }], structuredContent: out };
}
