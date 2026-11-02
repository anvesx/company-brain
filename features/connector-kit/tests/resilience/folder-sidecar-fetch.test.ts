import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFolderConnector } from "../../src/index.js";

const temp = () => mkdtemp(join(tmpdir(), "connector-kit-sidecar-"));

describe("fetch does not serve ACL sidecars", () => {
  it("refuses a sidecar by name, by dotted path and through a symlink", async () => {
    const root = await temp();
    await writeFile(join(root, "x.md"), "body");
    await writeFile(join(root, "x.md.acl.json"), JSON.stringify({ allowUsers: ["alice"], allowGroups: [], version: 1 }));
    await mkdir(join(root, "d"));
    await symlink(join(root, "x.md.acl.json"), join(root, "d", "innocent.md"));
    const c = createFolderConnector("f", root);
    for (const a of ["x.md.acl.json", "d/../x.md.acl.json", "d/innocent.md"]) {
      await expect(c.fetch(a, { token: "t" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    expect((await c.fetch("x.md", { token: "t" })).text).toBe("body");
  });
  it("fetch of a document with a malformed sidecar throws a typed BAD_ACL", async () => {
    const root = await temp();
    await writeFile(join(root, "x.md"), "body");
    await writeFile(join(root, "x.md.acl.json"), "{");
    await expect(createFolderConnector("f", root).fetch("x.md", { token: "t" })).rejects.toMatchObject({ code: "BAD_ACL" });
  });
});
