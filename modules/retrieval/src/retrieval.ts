import type { AuditService } from "@brain/audit-service";
import type { Principal } from "@brain/core-types";
import { type McpServiceOptions, startMcpServer } from "@brain/mcp-service";
import { createQueryService, type QueryDeps } from "@brain/query-service";
import { type EmbedQuery, toSearchFn } from "./adapter.js";
import { type AuditKey, auditedSearch } from "./audit.js";

export type RetrievalOptions = QueryDeps &
  Pick<McpServiceOptions, "transport" | "port" | "host" | "stdin" | "stdout" | "logger"> & {
    /** Derives the caller from transport metadata; must throw when unauthenticated. */
    principalFor: (extra: unknown) => Principal;
    /** Turns query text into the vector the index was built with. */
    embedQuery: EmbedQuery;
    /** Required. Every search writes one row here before results are returned; a failed write fails the search. */
    audit: AuditService;
    /** Required, non-empty master secret for the keyed audit target digest. */
    auditKey: AuditKey;
  };

export type RetrievalHandle = { close(): Promise<void>; port: number | undefined };

/** Wires query-service into mcp-service, with every search audited fail-closed. No retrieval logic lives here. */
export async function createRetrieval(options: RetrievalOptions): Promise<RetrievalHandle> {
  const { index, registry, embedQuery, audit, auditKey, ...server } = options;
  const plain = toSearchFn(createQueryService({ index, registry }), embedQuery);
  const search = auditedSearch(plain, audit, auditKey);
  const running = await startMcpServer({ ...server, search });
  return { close: running.close, port: running.port };
}
