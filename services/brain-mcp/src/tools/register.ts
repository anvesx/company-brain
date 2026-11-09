import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { handlers, run, serveCalls } from "./dispatch.js";
import { type Ctx, INPUT, OUTPUT, TOOL_NAMES, type ToolName } from "./schema.js";

const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;
const DESCRIPTION: Record<ToolName, string> = {
  "brain.search": "Find nodes by title.",
  "brain.node": "One node and its visible edges.",
  "brain.graph": "A page of the visible graph.",
  "brain.connectors": "The connectors linked to the caller.",
};

/**
 * The four read tools. `ctx.caller` comes from the token, so no argument can pick another tenant or user.
 * `registerTool` supplies tools/list (names, schemas, annotations). tools/call is served by `serveCalls`, which
 * validates the arguments itself; the handler given here is the same function, kept so the SDK has one.
 */
export function registerTools(server: McpServer, ctx: Ctx): void {
  const table = handlers(ctx);
  for (const name of TOOL_NAMES) {
    const call = table[name] as (a: unknown) => unknown;
    server.registerTool(name, { description: DESCRIPTION[name], inputSchema: INPUT[name], outputSchema: OUTPUT[name], annotations: READ_ONLY }, (a: unknown) =>
      run(() => call(a)),
    );
  }
  serveCalls(server, ctx);
}
