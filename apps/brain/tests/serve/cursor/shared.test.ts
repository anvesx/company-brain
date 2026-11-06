import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cursorKeyFrom } from "../../../src/serve/key.js";
import { signUp } from "../../identity/boot.js";
import { boot, SECRET, seed } from "./support.js";

const closers: (() => Promise<void>)[] = [];
afterEach(async () => Promise.all(closers.splice(0).map((c) => c())));

type Page = { nodes: { id: string }[]; next?: string };
const page = async (base: string, cookie: string, query: string) => {
  const res = await fetch(`${base}/v1/graph?${query}`, { headers: { cookie } });
  return { status: res.status, body: (await res.json()) as Page };
};

describe("startBrain derives the cursor key from BRAIN_AUTH_SECRET (not a per-process random key)", () => {
  it("a Load more cursor issued by one instance is accepted by a second instance with the same secret", async () => {
    const dir = mkdtempSync(join(tmpdir(), "brain-cursor-"));
    const [a, b] = [await boot(dir, closers), await boot(dir, closers)];
    const ann = await signUp(a, "Ann");
    const cookie = ann.browser.cookie();
    await seed(dir, a.base, cookie, 5);

    const first = await page(a.base, cookie, "limit=2");
    expect([first.status, first.body.nodes.length, typeof first.body.next]).toEqual([200, 2, "string"]);
    const second = await page(b.base, cookie, `limit=2&cursor=${encodeURIComponent(first.body.next ?? "")}`);
    expect(second.status).toBe(200);
    const seen = [...first.body.nodes, ...second.body.nodes].map((n) => n.id);
    expect(new Set(seen).size).toBe(seen.length); // the second instance continued where the first stopped
    // One changed character in the signature: refused, and by the instance that never issued it.
    const flipped = (first.body.next ?? "").replace(/.$/, (c) => (c === "A" ? "B" : "A"));
    const bad = await page(b.base, cookie, `limit=2&cursor=${encodeURIComponent(flipped)}`);
    expect([bad.status, bad.body]).toEqual([400, { error: "bad_input", message: "cursor is not one this view issued" }]);
  });

  it("cursorKeyFrom is deterministic per secret and 32 bytes long", () => {
    expect(cursorKeyFrom(SECRET)).toEqual(cursorKeyFrom(SECRET));
    expect(cursorKeyFrom(SECRET).length).toBe(32);
    expect(cursorKeyFrom(SECRET)).not.toEqual(cursorKeyFrom(`${SECRET}-other`));
  });
});
