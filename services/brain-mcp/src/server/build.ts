import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerNodeResource } from "../resources/node.js";
import { registerTools } from "../tools/register.js";
import type { Ctx } from "../tools/schema.js";

/** One server per session, bound to the caller who opened it. Read-only: four tools and one resource. */
export function createBrainServer(ctx: Ctx): McpServer {
  const server = new McpServer(
    { name: "company-brain", version: "0.1.0" },
    { instructions: "Read-only access to the company graph, limited to what the signed-in user may see." },
  );
  registerTools(server, ctx);
  registerNodeResource(server, ctx);
  return server;
}
