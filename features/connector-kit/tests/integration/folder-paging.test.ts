import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFolderConnector } from "../../src/index.js";

const temp = () => mkdtemp(join(tmpdir(), "connector-kit-page-"));

describe("folder connector paging", () => {
  it("walks every file exactly once and rejects bad cursors", async () => {
    const root = await temp();
    for (let index = 0; index < 7; index += 1) await writeFile(join(root, `f${index}.txt`), "x");
    const connector = createFolderConnector("folder", root);
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await connector.list(cursor === undefined ? { limit: 3 } : { limit: 3, cursor });
      seen.push(...page.items.map((item) => item.address));
      cursor = page.nextCursor;
    } while (cursor !== undefined);
    expect(seen).toEqual(Array.from({ length: 7 }, (_, index) => `f${index}.txt`));
    await expect(connector.list({ limit: 3, cursor: "nope" })).rejects.toMatchObject({ code: "BAD_CURSOR" });
  });

  it("reports title, zone and ISO updatedAt, and hides sidecar files", async () => {
    const root = await temp();
    await writeFile(join(root, "a.md"), "abc");
    await writeFile(join(root, "a.md.acl.json"), JSON.stringify({ allowUsers: [], allowGroups: [], version: 1 }));
    const [item, ...rest] = (await createFolderConnector("f", root).list({ limit: 10 })).items;
    expect(rest).toEqual([]);
    expect(item).toMatchObject({ address: "a.md", title: "a.md", zone: "personal" });
    expect(item?.version).toMatch(/^\d+(\.\d+)?:3$/);
    expect(new Date(item?.updatedAt ?? "").toISOString()).toBe(item?.updatedAt);
  });

  it("rejects a malformed ACL sidecar instead of silently allowing", async () => {
    const root = await temp();
    await writeFile(join(root, "a.md"), "abc");
    await writeFile(join(root, "a.md.acl.json"), "{not json");
    await expect(createFolderConnector("f", root).list({ limit: 1 })).rejects.toThrow();
  });

  it("keeps a walk on one snapshot but a fresh list sees new files", async () => {
    const root = await temp();
    for (const name of ["a", "b", "c"]) await writeFile(join(root, name), "x");
    const connector = createFolderConnector("f", root);
    const first = await connector.list({ limit: 2 });
    await writeFile(join(root, "aa"), "x");
    const second = await connector.list({ limit: 2, cursor: first.nextCursor ?? "" });
    expect(second.items.map((item) => item.address)).toEqual(["c"]);
    const fresh = await connector.list({ limit: 10 });
    expect(fresh.items.map((item) => item.address)).toEqual(["a", "aa", "b", "c"]);
  });

  it("rejects a cursor when no walk has started", async () => {
    const root = await temp();
    await writeFile(join(root, "a"), "x");
    await expect(createFolderConnector("f", root).list({ limit: 1, cursor: "1" }))
      .rejects.toMatchObject({ code: "BAD_CURSOR" });
  });
});
