import { ConnectorError, contentHash } from "@brain/connector-kit";
import { RuntimeError } from "./errors.js";
import { pendingStore } from "./pending.js";
import type { ConnectorRuntime, RunResult, RuntimeDeps } from "./types.js";

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 1000;

export function createConnectorRuntime(deps: RuntimeDeps): ConnectorRuntime {
  const { connector, cursors, sink, clock } = deps;
  const limit = deps.pageSize ?? DEFAULT_PAGE_SIZE;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new RuntimeError("INVALID_INPUT", `pageSize must be an integer in 1-${MAX_PAGE_SIZE}`);
  }
  const { pending, setPending } = pendingStore(cursors, `${connector.id}#inflight`);

  // Marker-before-seen: seen() cannot be undone, so a crash or sink failure after it would lose the
  // event. Ids whose delivery is unconfirmed sit in a pending list; a later run bypasses seen() for them.
  async function process(tenantId: string, item: { address: string; version: string; title: string }) {
    const eventId = contentHash(JSON.stringify([connector.id, item.address, item.version]));
    const before = pending(tenantId);
    const others = before.filter((id) => id !== eventId);
    if (!before.includes(eventId)) {
      setPending(tenantId, [...before, eventId]);
      if (cursors.seen(tenantId, eventId)) {
        setPending(tenantId, before);
        return false;
      }
    }
    try {
      await sink({
        tenantId,
        connectorId: connector.id,
        address: item.address,
        version: item.version,
        title: item.title,
        emittedAt: clock(),
      });
    } catch (cause) {
      throw new RuntimeError("SINK_FAILED", `sink rejected ${item.address}`, { cause });
    }
    setPending(tenantId, others);
    return true;
  }

  async function scan(tenantId: string, tally: RunResult): Promise<void> {
    let cursor = cursors.getCursor(tenantId, connector.id) ?? "";
    for (;;) {
      const query = cursor === "" ? { limit } : { cursor, limit };
      const page = await connector.list(query);
      for (const item of page.items) {
        if (await process(tenantId, item)) tally.emitted++;
        else tally.skipped++;
      }
      cursor = page.nextCursor ?? "";
      cursors.setCursor(tenantId, connector.id, cursor); // only after every item reached the sink
      if (cursor === "") return;
    }
  }

  return {
    async runOnce(tenantId) {
      if (typeof tenantId !== "string" || tenantId.length === 0) {
        throw new RuntimeError("INVALID_INPUT", "tenantId must be a non-empty string");
      }
      const tally: RunResult = { emitted: 0, skipped: 0, restarted: false };
      for (;;) {
        try {
          await scan(tenantId, tally);
          return tally;
        } catch (error) {
          if (!(error instanceof ConnectorError) || error.code !== "BAD_CURSOR") throw error;
          if (tally.restarted) throw new RuntimeError("BAD_CURSOR_LOOP", "BAD_CURSOR after full restart", { cause: error });
          tally.restarted = true;
          cursors.setCursor(tenantId, connector.id, "");
        }
      }
    },
  };
}
