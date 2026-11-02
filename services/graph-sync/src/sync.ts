import { GraphError } from "@brain/graph-store";
import { syncAccess } from "./access.js";
import { type Ctx, rootNode, syncDocument, writeNode } from "./document.js";
import { type SyncDeps, SyncError, type SyncReport } from "./types.js";

type Opts = { pageSize?: number; signal?: AbortSignal };

async function run(c: Ctx, size: number, signal?: AbortSignal): Promise<void> {
  const { store, connector, tenant, now } = c.deps;
  writeNode(c, rootNode(c));
  const seen = new Set<string>();
  let cursor: string | undefined;
  for (;;) {
    if (signal?.aborted) throw new SyncError("ABORTED", "sync aborted");
    const page = await connector.list(cursor === undefined ? { limit: size } : { cursor, limit: size }).catch((e: unknown) => {
      throw new SyncError("CONNECTOR_FAILED", `connector ${connector.id} failed: ${String(e)}`, e);
    });
    c.report.pages++;
    for (const d of page.items) {
      syncDocument(c, d);
      syncAccess(c, d.address, d.acl);
      seen.add(d.address);
    }
    if (page.nextCursor === undefined) break;
    if (page.nextCursor === cursor) throw new SyncError("CONNECTOR_FAILED", "connector cursor did not advance");
    cursor = page.nextCursor;
  }
  // Only a complete listing may delete: a failed or aborted run never reaches here.
  for (const e of store.neighbors(tenant, c.root, { kind: "belongs-to", dir: "in" })) {
    if (seen.has(e.from)) continue;
    store.tombstone(tenant, e.from, now());
    c.report.removed++;
  }
}

/** Copies the connector's listing into the graph as metadata only. Full listing each run; re-runs converge. */
export async function syncConnector(deps: SyncDeps, opts: Opts = {}): Promise<SyncReport> {
  const size = opts.pageSize ?? 100;
  if (!Number.isInteger(size) || size < 1 || size > 1000) throw new SyncError("BAD_INPUT", "pageSize must be an integer from 1 to 1000");
  const report: SyncReport = { nodes: 0, edges: 0, removed: 0, pages: 0 };
  const c: Ctx = { deps, report, principals: new Set(), root: `connector:${deps.connector.id}` };
  try {
    await run(c, size, opts.signal);
  } catch (e) {
    if (e instanceof GraphError && e.code === "BAD_INPUT") throw new SyncError("BAD_INPUT", e.message, e);
    throw e;
  }
  return report;
}
