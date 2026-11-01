import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFolderConnector } from "../../src/index.js";

const temp = () => mkdtemp(join(tmpdir(), "connector-kit-fetch-"));
const ctx = { token: "t" };

describe("folder connector fetch and symlinks", () => {
  it("rejects nested traversal and absolute addresses", async () => {
    const root = await temp();
    const outside = await temp();
    await mkdir(join(root, "a"));
    await writeFile(join(outside, "s.txt"), "secret");
    const connector = createFolderConnector("f", root);
    await expect(connector.fetch("a/../../x", ctx)).rejects.toMatchObject({ code: "PATH_ESCAPE" });
    await expect(connector.fetch(join(outside, "s.txt"), ctx)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns NOT_FOUND for missing files and directories", async () => {
    const root = await temp();
    await mkdir(join(root, "dir"));
    const connector = createFolderConnector("f", root);
    await expect(connector.fetch("nope.txt", ctx)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(connector.fetch("dir", ctx)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a directory symlink leaving the root", async () => {
    const root = await temp();
    const outside = await temp();
    await writeFile(join(outside, "s.txt"), "secret");
    await symlink(outside, join(root, "link"));
    const connector = createFolderConnector("f", root);
    await expect(connector.list({ limit: 10 })).rejects.toMatchObject({ code: "PATH_ESCAPE" });
    await expect(connector.fetch("link/s.txt", ctx)).rejects.toMatchObject({ code: "PATH_ESCAPE" });
  });

  it("allows internal symlinks and survives a directory cycle", async () => {
    const root = await temp();
    await mkdir(join(root, "d"));
    await writeFile(join(root, "d", "n.txt"), "inner");
    await symlink(root, join(root, "d", "loop"));
    await symlink(join(root, "d", "n.txt"), join(root, "alias.txt"));
    const connector = createFolderConnector("f", root);
    const addresses = (await connector.list({ limit: 10 })).items.map((item) => item.address);
    expect(addresses).toContain("alias.txt");
    expect(addresses).toContain("d/n.txt");
    await expect(connector.fetch("alias.txt", ctx)).resolves.toMatchObject({ text: "inner" });
  });

  it("serves a symlinked root and unicode names", async () => {
    const real = await temp();
    const holder = await temp();
    await writeFile(join(real, "résumé 文档.txt"), "héllo");
    await symlink(real, join(holder, "root"));
    const connector = createFolderConnector("f", join(holder, "root"));
    const items = (await connector.list({ limit: 5 })).items;
    expect(items[0]?.address).toBe("résumé 文档.txt");
    await expect(connector.fetch("résumé 文档.txt", ctx)).resolves.toMatchObject({ text: "héllo" });
  });
});
