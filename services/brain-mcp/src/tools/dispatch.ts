import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ToolFailure, toToolResult } from "../server/errors.js";
import { connectors } from "./read/connectors.js";
import { graph } from "./read/graph.js";
import { nodeView } from "./read/node.js";
import { search } from "./read/search.js";
import { type Ctx, INPUT, OUTPUT, TOOL_NAMES, type ToolName } from "./schema.js";

type In<N extends ToolName> = z.output<(typeof INPUT)[N]>;
/** The handler of each tool. Arguments reach it already checked against INPUT. */
export const handlers = (ctx: Ctx): { [N in ToolName]: (args: In<N>) => unknown } => ({
  "brain.search": (a) => search(ctx, a),
  "brain.node": (a) => nodeView(ctx, a.id, a.asOf),
  "brain.graph": (a) => graph(ctx, a),
  "brain.connectors": () => connectors(ctx),
});

/** Runs a handler and turns its result, or its failure, into an MCP tool result. */
export async function run(fn: () => unknown): Promise<CallToolResult> {
  try {
    const out = (await fn()) as Record<string, unknown>;
    return { content: [{ type: "text", text: JSON.stringify(out) }], structuredContent: out };
  } catch (error) {
    return toToolResult(error);
  }
}

// Everything past `method` is `unknown` and optional on purpose: the SDK's Protocol parses THIS schema before the Server
// re-checks the stock one, and a ZodError here becomes -32603 "Internal error" with a raw zod dump. Leaving the shape
// loose lets a missing `params`, a missing `name` or a string `arguments` fall through to the stock check, which
// answers -32602 as the spec says. `arguments` itself is optional in the spec (brain.connectors takes none).
const CallTool = z.object({
  method: z.literal("tools/call"),
  params: z.looseObject({ name: z.unknown().optional(), arguments: z.unknown().optional() }).optional(),
});

/**
 * Replaces the SDK's tools/call so every failure, bad input and unknown tool included, comes back as
 * { isError, structuredContent: { code, message } } (spec rule 8). tools/list still comes from `registerTool`.
 * The Server class re-checks the envelope with the stock schema (sdk/server/index.js, setRequestHandler), so a
 * malformed request (no `params`, no `name`, `arguments` as a string) is a JSON-RPC -32602 protocol error, never -32603.
 */
export function serveCalls(server: McpServer, ctx: Ctx): void {
  const table = handlers(ctx);
  server.server.setRequestHandler(CallTool, async (req): Promise<CallToolResult> => {
    const name = String(req.params?.name) as ToolName; // the stock check above guarantees a string by the time this runs
    if (!TOOL_NAMES.includes(name)) return toToolResult(new ToolFailure("INVALID_ARGUMENT", `unknown tool: ${name.slice(0, 100)}`));
    const parsed = INPUT[name].safeParse(req.params?.arguments ?? {});
    if (!parsed.success) {
      // zod names the field and the rule ("query: Too big: expected string to have <=512 characters") and never repeats the value.
      const why = parsed.error.issues.map((i) => `${i.path.join(".") || "arguments"}: ${i.message}`).join("; ");
      return toToolResult(new ToolFailure("INVALID_ARGUMENT", why.slice(0, 280)));
    }
    const result = await run(() => (table[name] as (a: unknown) => unknown)(parsed.data));
    // A success is checked against the tool's output schema before it leaves, as the SDK did.
    if (!result.isError && !OUTPUT[name].safeParse(result.structuredContent).success) return toToolResult(new Error("output did not match its schema"));
    return result;
  });
}
