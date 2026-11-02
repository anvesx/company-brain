import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFolderConnector } from "../../src/index.js";

const temp = () => mkdtemp(join(tmpdir(), "connector-kit-skip-"));
const list = async (root: string) => createFolderConnector("f", root).list({ limit: 100 });

describe("one bad entry does not abort the listing", () => {
  it.each([
    ["not JSON", "{oops"],
    ["empty", ""],
    ["wrong shape", JSON.stringify({ allowUsers: "alice", version: 0 })],
    ["not an object", "[1]"],
  ])("skips a document whose sidecar is %s and lists the rest", async (_name, body) => {
    const root = await temp();
    await writeFile(join(root, "good.md"), "ok");
    await writeFile(join(root, "bad.md"), "x");
    await writeFile(join(root, "bad.md.acl.json"), body);
    const page = await list(root);
    expect(page.items.map((i) => i.address)).toEqual(["good.md"]);
    expect(page.skipped).toEqual([{ address: "bad.md", code: "BAD_ACL", message: expect.any(String) }]);
  });
  it("skips an entry whose target vanished (dangling symlink) and lists the rest", async () => {
    const root = await temp();
    await mkdir(join(root, "sub"));
    await writeFile(join(root, "sub", "keep.md"), "ok");
    await symlink(join(root, "gone-target.md"), join(root, "gone.md"));
    await symlink(join(root, "gone-dir"), join(root, "sub", "gone-dir-link"));
    const page = await list(root);
    expect(page.items.map((i) => i.address)).toEqual(["sub/keep.md"]);
    expect(page.skipped?.map((s) => [s.address, s.code]).sort()).toEqual([
      ["gone.md", "VANISHED"],
      ["sub/gone-dir-link", "VANISHED"],
    ]);
  });
  it("omits skipped when nothing was skipped", async () => {
    const root = await temp();
    await writeFile(join(root, "a.md"), "x");
    expect("skipped" in (await list(root))).toBe(false);
  });
  it("reports skipped on the first page only, and later pages still work", async () => {
    const root = await temp();
    for (const n of ["a", "b", "c"]) await writeFile(join(root, `${n}.md`), n);
    await writeFile(join(root, "z.md"), "z");
    await writeFile(join(root, "z.md.acl.json"), "{");
    const c = createFolderConnector("f", root);
    const first = await c.list({ limit: 2 });
    expect(first.skipped).toHaveLength(1);
    const second = await c.list({ limit: 2, cursor: first.nextCursor as string });
    expect(second.items.map((i) => i.address)).toEqual(["c.md"]);
    expect("skipped" in second).toBe(false);
  });
  it("still aborts on a sidecar symlink that leaves the root", async () => {
    const root = await temp();
    const outside = await temp();
    await writeFile(join(root, "n.md"), "x");
    await writeFile(join(outside, "a.json"), "{}");
    await symlink(join(outside, "a.json"), join(root, "n.md.acl.json"));
    await expect(list(root)).rejects.toMatchObject({ code: "PATH_ESCAPE" });
  });
});
