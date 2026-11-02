import { GraphError } from "@anvesx/graph-store";
import { claim } from "./lease.js";
import { syncMemberships } from "./membership/sync.js";
import { type SyncDeps, SyncError, type SyncReport } from "./types.js";
import { syncAccess } from "./write/access.js";
import { type Ctx, nodeId, rootNode, syncDocument, writeNode } from "./write/document.js";
import { guarded, revoke } from "./write/skip.js";

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
    c.alive();
    c.report.pages++;
    for (const d of page.items) {
      const id = nodeId(c, d.address);
      // A skipped entry stays "seen" (never tombstoned for being bad) but loses its readers: fail closed.
      const write = (): void => {
        syncDocument(c, d);
        syncAccess(c, id, d.acl);
      };
      guarded(c, d.address, write, () => revoke(c, id));
      seen.add(id);
    }
    if (page.nextCursor === undefined) break;
    if (page.nextCursor === cursor) throw new SyncError("CONNECTOR_FAILED", "connector cursor did not advance");
    cursor = page.nextCursor;
  }
  await syncMemberships(c);
  c.alive();
  // Only a complete listing may delete: a failed, aborted or superseded run never reaches here.
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
  if (deps.connector.id.includes("/")) throw new SyncError("BAD_INPUT", "connector id must not contain a slash");
  const report: SyncReport = { nodes: 0, edges: 0, removed: 0, pages: 0, skipped: [] };
  const alive = claim(deps.tenant, deps.connector.id);
  const c: Ctx = { deps, report, alive, principals: new Set(), root: `connector:${deps.connector.id}` };
  try {
    await run(c, size, opts.signal);
  } catch (e) {
    if (e instanceof GraphError && e.code === "BAD_INPUT") throw new SyncError("BAD_INPUT", e.message, e);
    throw e;
  }
  return report;
}
