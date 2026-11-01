import type { Principal } from "@brain/core-types";
import { registerSearchTool, type SearchFn } from "@brain/mcp-search-tool";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type McpServerDeps = {
  search: SearchFn;
  /** Derives the caller from SDK request metadata (headers, authInfo). Throws when unauthenticated. */
  principalFor: (extra: unknown) => Principal;
  logger?: ((cause: unknown) => void) | undefined;
};

/** One McpServer per transport connection: the SDK allows a single transport per server. */
export function buildServer(deps: McpServerDeps): McpServer {
  const server = new McpServer({ name: "brain-mcp-service", version: "0.1.0" });
  registerSearchTool(server, deps);
  return server;
}
