import { createAuditChain } from "@brain/audit-chain";
import { createAuditService, createFileAnchorStore } from "@brain/audit-service";
import { chunkText } from "@brain/chunker";
import { createGovernance } from "@brain/governance";
import { createIndexService } from "@brain/index-service";
import { createIngestion } from "@brain/ingestion";
import { startMcpServer } from "@brain/mcp-service";
import { createQueryService } from "@brain/query-service";
import { liveIds } from "./runtime/known.js";
import { defaultLogger } from "./runtime/logger.js";
import { openStores } from "./runtime/stores.js";
import type { BrainApp, BrainDeps } from "./types.js";

async function probeDimension(embed: BrainDeps["embed"]): Promise<number> {
  const [vector] = await embed(["dimension probe"]);
  if (!vector) throw new Error("embed returned no vector for the dimension probe");
  return vector.length;
}

/** Composes ingestion, governed search and the MCP server. Adds no logic of its own. */
export async function createBrainApp(deps: BrainDeps): Promise<BrainApp> {
  const dimension = deps.dimension ?? (await probeDimension(deps.embed));
  const logger = deps.logger ?? defaultLogger;
  const { registry, index, cursors } = openStores(deps, dimension);
  const query = createQueryService({ index, registry });
  const audit = createAuditService({
    chain: createAuditChain(deps.auditDbPath),
    anchorStore: createFileAnchorStore(deps.anchorPath),
    clock: () => new Date(deps.clock()),
  });
  const governance = createGovernance({ audit, query, auditKey: deps.auditKey });
  const indexService = createIndexService({
    registry,
    index,
    embed: deps.embed,
    fetchText: deps.fetchText,
    chunk: async (docId, text) => chunkText(docId, text),
  });
  const ingestion = createIngestion({
    runtime: { cursors, clock: deps.clock },
    connectorFor: deps.connectorFor,
    tokenFor: deps.tokenFor,
    known: (tenantId) => liveIds(registry, tenantId),
    indexService,
  });
  const search: BrainApp["search"] = async ({ query: text, principal, limit }) =>
    governance.search({ query: text, principal, embedding: await deps.embedQuery(text), ...(limit !== undefined && { limit }) });
  const server = await startMcpServer({
    transport: deps.transport,
    port: deps.port,
    stdin: deps.stdin,
    stdout: deps.stdout,
    principalFor: deps.principalFor,
    // Cause name and message only: never the query, the principal or the token.
    logger: (cause) => logger.error("search failed", { cause: cause instanceof Error ? `${cause.name}: ${cause.message}` : "non-error thrown" }),
    search: ({ query: text, limit, principal }) => search({ query: text, limit, principal }),
  });
  let closing: Promise<void> | undefined;
  return {
    ingest: (tenantId) => ingestion.runOnce(tenantId),
    search,
    verify: (tenantId) => governance.verify(tenantId),
    checkpoint: (tenantId) => governance.checkpoint(tenantId),
    close: () => {
      closing ??= server.close().finally(() => registry.close());
      return closing;
    },
    port: server.port,
  };
}
