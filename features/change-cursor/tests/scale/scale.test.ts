import { describe, expect, it } from "vitest";
import { diffListing } from "../../src/diff.js";
import { createCursorStore } from "../../src/store.js";

const N = 100_000;

describe("scale", () => {
  it("diffs 100k known addresses in under 500 ms", () => {
    const known = new Map<string, string>();
    const listed = new Map<string, string>();
    for (let i = 0; i < N; i++) known.set(`addr-${i}`, "v1");
    for (let i = 5_000; i < N + 5_000; i++) listed.set(`addr-${i}`, i % 10 === 0 ? "v2" : "v1");

    const started = performance.now();
    const diff = diffListing(known, listed);
    const elapsed = performance.now() - started;

    expect(diff.created).toHaveLength(5_000);
    expect(diff.deleted).toHaveLength(5_000);
    expect(diff.updated).toHaveLength(9_500);
    expect(elapsed).toBeLessThan(500);
  });

  it("records 100k new event ids, then sees all of them as seen", () => {
    const s = createCursorStore(":memory:", () => 0);
    let fresh = 0;
    for (let i = 0; i < N; i++) if (!s.seen("t1", `evt-${i}`)) fresh++;
    let repeats = 0;
    for (let i = 0; i < N; i++) if (s.seen("t1", `evt-${i}`)) repeats++;
    expect(fresh).toBe(N);
    expect(repeats).toBe(N);
  });
});
