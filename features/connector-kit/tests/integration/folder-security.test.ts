import { mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFolderConnector } from "../../src/index.js";

const temp = () => mkdtemp(join(tmpdir(), "connector-kit-security-"));

describe("folder connector path security", () => {
  it("rejects an ACL sidecar symlink leaving the root", async () => {
    const root = await temp();
    const outside = await temp();
    await writeFile(join(root, "note.txt"), "safe");
    await writeFile(join(outside, "acl.json"), JSON.stringify({ version: 0 }));
    await symlink(join(outside, "acl.json"), join(root, "note.txt.acl.json"));
    await expect(createFolderConnector("folder", root).list({ limit: 10 })).rejects.toMatchObject({ code: "PATH_ESCAPE" });
  });
});
