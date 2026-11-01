import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createRegistry } from "../../src/index.js";
import { hashOf, ptr } from "../fixtures.js";

const dirs: string[] = [];
const tmp = (): string => { const d = mkdtempSync(join(tmpdir(), "pr-")); dirs.push(d); return join(d, "r.db"); };
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

describe("file-backed db", () => {
  it("survives reopen, including tombstones and change detection", () => {
    const file = tmp();
    const a = createRegistry(file);
    a.upsert(ptr({ id: "keep" })); a.upsert(ptr({ id: "gone" }));
    a.tombstone("t1", "gone", "2026-11-02T00:00:00Z");
    a.close();
    const b = createRegistry(file);
    expect(b.get("t1", "keep")).toEqual(ptr({ id: "keep" }));
    expect(b.get("t1", "gone")).toBeUndefined();
    expect(b.upsert(ptr({ id: "keep" })).change).toBe("unchanged");
    b.close();
  });
  it("two open handles on one file see each other's writes", () => {
    const file = tmp();
    const a = createRegistry(file); const b = createRegistry(file);
    a.upsert(ptr());
    expect(b.upsert(ptr()).change).toBe("unchanged");
    a.close(); b.close();
  });
});

describe("interleaved writers", () => {
  it("1000 upserts from 4 interleaved loops give 1000 rows", async () => {
    const r = createRegistry(tmp());
    const loop = async (k: number) => {
      for (let i = k; i < 1000; i += 4) { r.upsert(ptr({ id: `d${i}`, contentHash: hashOf(i) })); await Promise.resolve(); }
    };
    await Promise.all([0, 1, 2, 3].map(loop));
    let n = 0; let after: string | undefined;
    for (;;) {
      const page = r.list(after === undefined ? { tenantId: "t1", limit: 1000 } : { tenantId: "t1", limit: 1000, afterId: after });
      if (page.length === 0) break;
      n += page.length; after = page[page.length - 1]?.id;
    }
    expect(n).toBe(1000);
    r.close();
  });
  it("same key from 4 loops and 2 handles ends with one row", async () => {
    const file = tmp();
    const hs = [createRegistry(file), createRegistry(file)];
    const loop = async (k: number) => {
      for (let i = 0; i < 50; i++) { hs[k % 2]?.upsert(ptr({ contentHash: hashOf(k * 100 + i) })); await Promise.resolve(); }
    };
    await Promise.all([0, 1, 2, 3].map(loop));
    expect(hs[0]?.list({ tenantId: "t1" })).toHaveLength(1);
    hs.forEach((h) => h.close());
  });
});
