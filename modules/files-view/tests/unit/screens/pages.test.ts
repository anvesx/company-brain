import { jsx } from "hono/jsx";
import { describe, expect, it } from "vitest";
import { ClusterScreen, ClustersScreen, FileScreen, type FilesPage, FilesScreen } from "../../../src/ui/index.js";
import { dom, file, link } from "./support.js";

const html = async (el: unknown) => String(await (el as { toString(): string | Promise<string> }).toString());
const page = (over: Partial<FilesPage> = {}): FilesPage => ({ rows: [file()], query: {}, sources: ["notion"], mimes: ["text/plain"], ...over });
const node = (id: string, children: ReturnType<typeof tree>[] = []) => tree(id, children);
const tree = (id: string, children: unknown[]) => ({
  id,
  name: `Name ${id}`,
  type: "topic" as const,
  why: `why ${id}`,
  count: 3,
  children: children as never[],
});

describe("files screen", () => {
  it("renders a row with every column, escapes the title and links the groups", async () => {
    const d = dom(await html(jsx(FilesScreen, { page: page(), viewer: { name: "alice", admin: true } })));
    const cells = [...d.querySelectorAll("tbody tr td")].map((c) => c.textContent);
    expect(cells.slice(0, 5)).toEqual(["Quarterly plan <b>/finance", "notion", "alice", "2026-10-01 10:00 UTC", "2.0 KB"]);
    expect(d.querySelector("tbody b")).toBeNull();
    expect(d.querySelector('a[href="/files/f%2F1"]')).not.toBeNull();
    expect(d.querySelector('a[href="/clusters/l"]')?.textContent).toBe("Q3");
    expect(d.body.textContent).toContain("Why: Same folder /finance");
    expect(d.querySelector(".who")?.textContent).toBe("alice (admin)");
  });
  it("shows Not grouped yet for a file with no cluster", async () =>
    expect(await html(jsx(FilesScreen, { page: page({ rows: [file({ clusters: [] })] }) }))).toContain("Not grouped yet"));
  it("links to the next page with the cursor and the query kept, or says the list ended", async () => {
    const more = dom(await html(jsx(FilesScreen, { page: page({ nextCursor: "abc", query: { q: "plan", sort: "size" } }) })));
    expect(link(more, "/files?q=plan&sort=size&cursor=abc")?.textContent).toBe("Next page");
    expect(dom(await html(jsx(FilesScreen, { page: page() }))).body.textContent).toContain("End of results");
  });
  it("sortable headers flip the direction and mark the active sort", async () => {
    const d = dom(await html(jsx(FilesScreen, { page: page({ query: { sort: "title", dir: "asc" } }) })));
    expect(d.querySelector('th[aria-sort="ascending"] a')?.getAttribute("href")).toBe("/files?sort=title&dir=desc");
    expect(link(d, "/files?sort=modified&dir=desc")).toBeDefined();
  });
  it("tells empty from filtered-empty, and shows the sync age when known", async () => {
    expect(await html(jsx(FilesScreen, { page: page({ rows: [] }) }))).toContain("No files yet");
    expect(await html(jsx(FilesScreen, { page: page({ rows: [], query: { q: "zz" } }) }))).toContain("No files match these filters");
    const synced = await html(jsx(FilesScreen, { page: page({ syncedAt: new Date(Date.now() - 7_200_000).toISOString() }) }));
    expect(synced).toContain("2 h ago");
  });
});

describe("file screen", () => {
  it("shows readers only when supplied and says Only the owner for none", async () => {
    expect(await html(jsx(FileScreen, { detail: { file: file() } }))).not.toContain("Readers");
    expect(await html(jsx(FileScreen, { detail: { file: file(), readers: ["bob", "carol"] } }))).toContain("bob, carol");
    expect(await html(jsx(FileScreen, { detail: { file: file(), readers: [] } }))).toContain("Only the owner");
  });
  it("omits the folder line when there is none", async () =>
    expect(await html(jsx(FileScreen, { detail: { file: file({ folder: undefined }) } }))).not.toContain("Folder"));
});

describe("cluster screens", () => {
  it("the tree nests children with kind, count and why", async () => {
    const d = dom(await html(jsx(ClustersScreen, { roots: [node("a", [node("b")])] })));
    expect(d.querySelectorAll("ul.tree li")).toHaveLength(2);
    expect(d.querySelector("ul.tree ul.tree li a")?.getAttribute("href")).toBe("/clusters/b");
    expect(d.body.textContent).toContain("Why: why a");
  });
  it("an empty tree says there are no groups yet", async () => expect(await html(jsx(ClustersScreen, { roots: [] }))).toContain("No groups yet"));
  it("a cluster page shows breadcrumb, why, count, sub-groups and members, or the empty state", async () => {
    const detail = { node: { ...node("c", [node("d")]), type: "place" as const }, ancestors: [{ id: "a", name: "Name a" }], members: page() };
    const d = dom(await html(jsx(ClusterScreen, { detail })));
    expect(d.querySelector('.eyebrow a[href="/clusters/a"]')?.textContent).toBe("Name a");
    expect(d.body.textContent).toContain("Why this group exists: why c");
    expect(d.body.textContent).toContain("3 files you can access");
    expect(d.querySelector('ul.tree a[href="/clusters/d"]')).not.toBeNull();
    expect(d.querySelector("tbody tr")).not.toBeNull();
    expect(d.querySelector('form[action="/clusters/c"]')).not.toBeNull();
    const empty = await html(jsx(ClusterScreen, { detail: { ...detail, node: node("c"), members: page({ rows: [] }) } }));
    expect(empty).toContain("No files yet");
    expect(empty).not.toContain("Sub-groups");
  });
});
