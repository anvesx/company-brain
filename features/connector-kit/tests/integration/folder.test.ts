import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFolderConnector } from "../../src/index.js";

const temp = () => mkdtemp(join(tmpdir(), "connector-kit-"));

describe("folder connector", () => {
  it("lists an empty folder", async () => {
    const root = await temp();
    await expect(createFolderConnector("folder", root).list({ limit: 10 })).resolves.toEqual({ items: [] });
  });

  it("lists unicode recursively, loads ACL, and denies by default", async () => {
    const root = await temp();
    await mkdir(join(root, "nested"));
    await writeFile(join(root, "nested", "文档.txt"), "first");
    await writeFile(join(root, "open.md"), "open");
    await writeFile(
      join(root, "open.md.acl.json"),
      JSON.stringify({
        allowUsers: ["u1"],
        allowGroups: ["g1"],
        version: 2,
      }),
    );
    const page = await createFolderConnector("folder", root).list({ limit: 10 });
    expect(page.items.map((item) => item.address)).toEqual(["nested/文档.txt", "open.md"]);
    expect(page.items[0]?.acl).toEqual({ allowUsers: [], allowGroups: [], version: 0 });
    expect(page.items[1]?.acl).toEqual({ allowUsers: ["u1"], allowGroups: ["g1"], version: 2 });
  });

  it("fetches current text and exposes a changed mtime+size version", async () => {
    const root = await temp();
    const path = join(root, "note.txt");
    await writeFile(path, "one");
    const connector = createFolderConnector("folder", root);
    const before = (await connector.list({ limit: 1 })).items[0];
    await writeFile(path, "two-two");
    const after = (await connector.list({ limit: 1 })).items[0];
    expect(after?.version).not.toBe(before?.version);
    await expect(connector.fetch("note.txt", { token: "user" })).resolves.toEqual({ text: "two-two", version: after?.version });
  });

  it("refuses traversal and a symlink escaping the root", async () => {
    const root = await temp();
    const outside = await temp();
    await writeFile(join(outside, "secret.txt"), "secret");
    const connector = createFolderConnector("folder", root);
    await expect(connector.fetch("../secret.txt", { token: "user" })).rejects.toMatchObject({ code: "PATH_ESCAPE" });
    await symlink(join(outside, "secret.txt"), join(root, "escape.txt"));
    await expect(connector.list({ limit: 10 })).rejects.toMatchObject({ code: "PATH_ESCAPE" });
    await expect(connector.fetch("escape.txt", { token: "user" })).rejects.toMatchObject({ code: "PATH_ESCAPE" });
  });
});
