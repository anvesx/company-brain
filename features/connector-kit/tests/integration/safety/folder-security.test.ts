import { mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFolderConnector } from "../../../src/index.js";

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

const acl = (users: string[], version: number) => JSON.stringify({ allowUsers: users, allowGroups: [], version });
const versions = async (root: string) => new Map((await createFolderConnector("f", root).list({ limit: 100 })).items.map((i) => [i.address, i.version]));

describe("folder ACL versioning", () => {
  it("changes the listed and fetched version when only the ACL sidecar changes", async () => {
    const root = await temp();
    await writeFile(join(root, "plan.md"), "secret");
    await writeFile(join(root, "plan.md.acl.json"), acl(["alice", "bob"], 1));
    const before = await versions(root);
    await writeFile(join(root, "plan.md.acl.json"), acl(["alice"], 2));
    const after = await versions(root);
    expect(after.get("plan.md")).not.toBe(before.get("plan.md"));
    const fetched = await createFolderConnector("f", root).fetch("plan.md", { token: "t" });
    expect(fetched.version).toBe(after.get("plan.md"));
  });

  it("keeps the version stable when nothing changed, and changes it when the sidecar appears", async () => {
    const root = await temp();
    await writeFile(join(root, "a.md"), "x");
    const first = await versions(root);
    expect((await versions(root)).get("a.md")).toBe(first.get("a.md"));
    await writeFile(join(root, "a.md.acl.json"), acl(["u"], 1));
    expect((await versions(root)).get("a.md")).not.toBe(first.get("a.md"));
  });
});
