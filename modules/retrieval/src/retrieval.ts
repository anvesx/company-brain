import type { Principal } from "@brain/core-types";
import { type McpServiceOptions, startMcpServer } from "@brain/mcp-service";
import { createQueryService, type QueryDeps } from "@brain/query-service";
import { type EmbedQuery, toSearchFn } from "./adapter.js";

export type RetrievalOptions = QueryDeps &
  Pick<McpServiceOptions, "transport" | "port" | "host" | "stdin" | "stdout" | "logger"> & {
    /** Derives the caller from transport metadata; must throw when unauthenticated. */
    principalFor: (extra: unknown) => Principal;
    /** Turns query text into the vector the index was built with. */
    embedQuery: EmbedQuery;
  };

export type RetrievalHandle = { close(): Promise<void>; port: number | undefined };

/** Wires query-service into mcp-service. No retrieval logic lives here. */
export async function createRetrieval(options: RetrievalOptions): Promise<RetrievalHandle> {
  const { index, registry, embedQuery, ...server } = options;
  const search = toSearchFn(createQueryService({ index, registry }), embedQuery);
  const running = await startMcpServer({ ...server, search });
  return { close: running.close, port: running.port };
}
