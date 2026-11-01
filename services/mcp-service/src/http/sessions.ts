import { randomUUID } from "node:crypto";
import type { Principal } from "@brain/core-types";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildServer, type McpServerDeps } from "../build.js";

export type Session = { transport: StreamableHTTPServerTransport; server: McpServer; owner: Principal };

/** Live Streamable HTTP sessions, each pinned to the principal that opened it. */
export class Sessions {
  private readonly live = new Map<string, Session>();

  get(id: string): Session | undefined {
    return this.live.get(id);
  }

  open(deps: McpServerDeps, owner: Principal): Session {
    const server = buildServer(deps);
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: randomUUID,
      onsessioninitialized: (id) => {
        this.live.set(id, session);
      },
    });
    const session: Session = { transport, server, owner };
    transport.onclose = () => {
      if (transport.sessionId) this.live.delete(transport.sessionId);
    };
    return session;
  }

  async closeAll(): Promise<void> {
    const all = [...this.live.values()];
    this.live.clear();
    await Promise.all(all.map((s) => s.server.close()));
  }
}
