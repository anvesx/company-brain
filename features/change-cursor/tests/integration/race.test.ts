import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCursorStore } from "../../src/store.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "change-cursor-race-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("two handles on one file race on seen", () => {
  it("lets exactly one handle see each fresh id as new, in either order", () => {
    const path = join(dir, "race.db");
    const clock = () => 0;
    const a = createCursorStore(path, clock);
    const b = createCursorStore(path, clock);
    for (let i = 0; i < 500; i++) {
      const id = `evt-${i}`;
      const first = i % 2 === 0 ? [a.seen(id), b.seen(id)] : [b.seen(id), a.seen(id)];
      expect(first.filter((hit) => !hit)).toHaveLength(1);
    }
  });

  it("sees an id recorded through one handle as seen through the other", () => {
    const path = join(dir, "race.db");
    const a = createCursorStore(path, () => 0);
    const b = createCursorStore(path, () => 0);
    expect(a.seen("shared")).toBe(false);
    expect(b.seen("shared")).toBe(true);
  });
});
