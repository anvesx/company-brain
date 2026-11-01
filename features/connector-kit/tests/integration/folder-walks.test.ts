import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFolderConnector } from "../../src/index.js";

const temp = () => mkdtemp(join(tmpdir(), "connector-kit-walks-"));

describe("folder walks are independent", () => {
  it("lets an in-flight walk finish unharmed while another walk starts", async () => {
    const root = await temp();
    for (const name of ["a", "b", "c", "d"]) await writeFile(join(root, name), name);
    const connector = createFolderConnector("f", root);
    const a1 = await connector.list({ limit: 2 });
    await writeFile(join(root, "0"), "new");
    await connector.list({ limit: 1 });
    const a2 = await connector.list({ limit: 2, cursor: a1.nextCursor ?? "" });
    expect([...a1.items, ...a2.items].map((i) => i.address)).toEqual(["a", "b", "c", "d"]);
    expect(a2.nextCursor).toBeUndefined();
  });

  it("interleaves two walks with distinct cursors", async () => {
    const root = await temp();
    for (const name of ["a", "b", "c", "d", "e"]) await writeFile(join(root, name), name);
    const connector = createFolderConnector("f", root);
    const x = await connector.list({ limit: 2 });
    const y = await connector.list({ limit: 2 });
    expect(x.nextCursor).not.toBe(y.nextCursor);
    const x2 = await connector.list({ limit: 3, cursor: x.nextCursor ?? "" });
    const y2 = await connector.list({ limit: 3, cursor: y.nextCursor ?? "" });
    expect(x2.items.map((i) => i.address)).toEqual(["c", "d", "e"]);
    expect(y2.items.map((i) => i.address)).toEqual(["c", "d", "e"]);
  });

  it("throws BAD_CURSOR for a cursor this instance never issued", async () => {
    const root = await temp();
    for (const name of ["a", "b", "c"]) await writeFile(join(root, name), name);
    const issued = (await createFolderConnector("f", root).list({ limit: 1 })).nextCursor ?? "";
    const other = createFolderConnector("g", root);
    await expect(other.list({ limit: 1, cursor: issued })).rejects.toMatchObject({ code: "BAD_CURSOR" });
    await expect(other.list({ limit: 1, cursor: "2" })).rejects.toMatchObject({ code: "BAD_CURSOR" });
  });

  it("forgets a walk once its last page is served", async () => {
    const root = await temp();
    for (const name of ["a", "b", "c"]) await writeFile(join(root, name), name);
    const connector = createFolderConnector("f", root);
    const first = await connector.list({ limit: 2 });
    await connector.list({ limit: 2, cursor: first.nextCursor ?? "" });
    await expect(connector.list({ limit: 2, cursor: first.nextCursor ?? "" })).rejects.toMatchObject({ code: "BAD_CURSOR" });
  });

  it("bounds open walks by evicting the oldest", async () => {
    const root = await temp();
    for (const name of ["a", "b"]) await writeFile(join(root, name), name);
    const connector = createFolderConnector("f", root);
    const oldest = (await connector.list({ limit: 1 })).nextCursor ?? "";
    let newest = "";
    for (let i = 0; i < 40; i += 1) newest = (await connector.list({ limit: 1 })).nextCursor ?? "";
    await expect(connector.list({ limit: 1, cursor: oldest })).rejects.toMatchObject({ code: "BAD_CURSOR" });
    await expect(connector.list({ limit: 1, cursor: newest })).resolves.toMatchObject({ items: [{ address: "b" }] });
  });
});
