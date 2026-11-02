import { join } from "node:path";
import { createCursorStore } from "@anvesx/change-cursor";
import { createFolderConnector } from "@anvesx/connector-kit";
import { SyncError, syncConnector } from "@anvesx/graph-sync";
import { describe, expect, it } from "vitest";
import { graphDocs } from "../../../src/reindex.js";
import { deps, openStore, put, TENANT, tmp } from "../../support/world.js";

const names = ["a", "b", "c", "d"].map((n) => `${n}.md`);

describe("restart graph-sync mid-feed", () => {
  it("resumes after an abort: no duplicate node, no lost node, cursor and dedupe survive", async () => {
    const [root, base] = [tmp(), tmp()];
    for (const n of names) put(root, n, `body of ${n}`, ["ana"]);
    const [graphFile, cursorFile] = [join(base, "graph.db"), join(base, "cursor.db")];
    let store = openStore(graphFile);
    let cursors = createCursorStore(cursorFile, Date.now);
    const real = createFolderConnector("docs", root);
    const stop = new AbortController();
    let pages = 0;
    // Same connector, but it checkpoints each page cursor and pulls the plug after two pages.
    const interrupting = {
      ...real,
      list: async (q: Parameters<typeof real.list>[0]) => {
        const page = await real.list(q);
        if (page.nextCursor) cursors.setCursor(TENANT, "docs", page.nextCursor);
        if (++pages === 2) stop.abort();
        return page;
      },
    };

    const first = syncConnector({ ...deps(store, root), connector: interrupting }, { pageSize: 1, signal: stop.signal });
    await expect(first).rejects.toMatchObject({ code: "ABORTED" });
    await expect(first).rejects.toBeInstanceOf(SyncError);
    const written = graphDocs(store, TENANT, "docs")
      .map((n) => n.id)
      .sort();
    expect(written).toHaveLength(2);
    for (const id of written) cursors.seen(TENANT, id);
    const saved = cursors.getCursor(TENANT, "docs");
    expect(saved).toBeDefined();

    // Restart: new handles on the same files.
    store.close();
    cursors.close();
    store = openStore(graphFile);
    cursors = createCursorStore(cursorFile, Date.now);
    expect(cursors.getCursor(TENANT, "docs")).toBe(saved);
    const replayed = names.map((n) => `docs/${n}`).filter((id) => cursors.seen(TENANT, id));
    expect(replayed).toEqual(written);

    const report = await syncConnector(deps(store, root), { pageSize: 1 });
    expect(report.removed).toBe(0);
    expect(report.skipped).toEqual([]);
    const all = graphDocs(store, TENANT, "docs")
      .map((n) => n.id)
      .sort();
    expect(all).toEqual(names.map((n) => `docs/${n}`));
    for (const id of all) expect(store.history(TENANT, id)).toHaveLength(1);
    cursors.close();
  });
});
