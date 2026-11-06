import { type McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { toToolResult } from "../server/errors.js";
import { nodeView } from "../tools/read/node.js";
import type { Ctx } from "../tools/schema.js";

/** `brain://node/{id}`: a visible node and its visible edges as JSON. Same rules as `brain.node`. */
export function registerNodeResource(server: McpServer, ctx: Ctx): void {
  server.registerResource(
    "node",
    new ResourceTemplate("brain://node/{id}", { list: undefined }),
    { title: "Graph node", description: "A node the caller may see, with its visible edges.", mimeType: "application/json" },
    async (uri, vars) => {
      try {
        const { node, neighbours } = await nodeView(ctx, String(vars["id"]));
        return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({ ...node, neighbours }) }] };
      } catch (error) {
        // Same safe wording as a tool failure: an unexpected error never shows its own message.
        const { code, message } = toToolResult(error).structuredContent as { code: string; message: string };
        throw new McpError(code === "INTERNAL" ? ErrorCode.InternalError : ErrorCode.InvalidParams, message);
      }
    },
  );
}
