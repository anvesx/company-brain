import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { start } from "../harness.js";

const dir = mkdtempSync(join(tmpdir(), "brain-data-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const alice = { id: "alice", tenantId: "t1", groups: [] };

describe("dataDir persistence", () => {
  it("previously ingested docs are searchable after a restart and are not re-emitted", async () => {
    const data = join(dir, "restart");
    const first = await start({ dataDir: data, cursors: undefined });
    expect(await first.app.ingest("t1")).toMatchObject({ emitted: 3, indexed: 3 });
    await first.app.close();
    const second = await start({ dataDir: data, cursors: undefined });
    const found = await second.app.search({ query: "needle", principal: alice });
    expect(found.map((p) => p.address).sort()).toEqual(["a", "b"]);
    expect(await second.app.ingest("t1")).toMatchObject({ emitted: 0, indexed: 0, failed: 0 });
    await second.app.close();
  });

  it("without dataDir nothing survives a restart", async () => {
    const first = await start();
    await first.app.ingest("t1");
    await first.app.close();
    const second = await start();
    expect(await second.app.search({ query: "needle", principal: alice })).toEqual([]);
    await second.app.close();
  });

  // Needs ingestion to seed its in-memory `known` map from the registry; see README Limits.
  it.todo("docs deleted at source while down are tombstoned on the next run");
});
