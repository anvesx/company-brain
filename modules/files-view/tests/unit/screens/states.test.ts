import { jsx } from "hono/jsx";
import { describe, expect, it } from "vitest";
import { ErrorScreen, ErrorView, FileScreen } from "../../../src/ui/index.js";
import { Empty, Removed } from "../../../src/ui/parts/states.js";
import { dom, file } from "./support.js";

const html = async (el: unknown) => String(await (el as { toString(): string | Promise<string> }).toString());
describe("states", () => {
  it("empty with filters says no match and offers to clear them", async () => {
    const d = dom(await html(jsx(Empty, { filtered: true, clearHref: "/files" })));
    expect(d.querySelector("h2")?.textContent).toBe("No files match these filters");
    expect(d.querySelector('a[href="/files"]')?.textContent).toBe("Clear all filters");
  });
  it("empty without filters says no files yet and links to the groups", async () => {
    const d = dom(await html(jsx(Empty, { filtered: false, clearHref: "/files" })));
    expect(d.querySelector("h2")?.textContent).toBe("No files yet");
    expect(d.querySelector('a[href="/clusters"]')).not.toBeNull();
  });
  it("removed state hides every detail and links back", async () => {
    const d = dom(await html(jsx(Removed, {})));
    expect(d.querySelector("h1")?.textContent).toBe("Access removed");
    expect(d.querySelector('[role="status"]')).not.toBeNull();
    expect(d.querySelector('a[href="/files"]')).not.toBeNull();
  });
  it("the file screen shows only the removed state when the recheck says the source no longer allows access", async () => {
    const text = dom(await html(jsx(FileScreen, { detail: { file: file(), removed: true, readers: ["bob"] } }))).body.textContent ?? "";
    expect(text).toContain("Access removed");
    for (const secret of ["Quarterly plan", "notion", "alice", "bob", "Why: Same folder"]) expect(text).not.toContain(secret);
  });
  it.each([
    [400, "Request not valid", "bad cursor"],
    [401, "Sign in required", "Send a valid access token"],
    [404, "Not found", "removed"],
    [500, "Something went wrong", "We could not load this page"],
  ])("error %d shows %s", async (status, title, text) => {
    const d = dom(await html(jsx(ErrorView, { status, message: "bad cursor Send a valid access token removed", requestId: "r-1" })));
    expect(d.querySelector("h1")?.textContent).toBe(title);
    expect(d.querySelector('[role="alert"]')?.textContent).toContain(text);
    expect(d.body.textContent).toContain("Request id r-1");
  });
  it("a 5xx never echoes the message", async () => {
    expect(await html(jsx(ErrorScreen, { status: 500, message: "password=hunter2 at db.internal" }))).not.toContain("hunter2");
  });
  it("a 4xx without a message falls back to a default", async () => expect(await html(jsx(ErrorView, { status: 400 }))).toContain("Please check the request"));
});
