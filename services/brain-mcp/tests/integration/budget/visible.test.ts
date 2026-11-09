import type { AsyncGraphStore, EdgeKind, NodeKind } from "@anvesx/graph-store";
import { describe, expect, it } from "vitest";
import { CHUNK, viewer } from "../../../src/access/visible.js";
import { storeFactories } from "../../support/server.js";
import { counted, seed } from "./count.js";

const T = "org-fan";
const FAN = 4_000; // documents behind one person and one project
const docs = Array.from({ length: FAN }, (_, i) => `doc-${i}`);
const put = (s: AsyncGraphStore, id: string, kind: NodeKind) =>
  s.upsertNode({ tenant: T, id, kind, source: "test", address: `x://${id}`, title: id, version: "1", props: {} }, 1);
const link = (s: AsyncGraphStore, from: string, kind: EdgeKind, to: string) => s.addEdge({ tenant: T, from, to, kind, source: "test" }, 1);

/** u-wide can read all FAN documents and they all belong to proj-big. u-none reads nothing; u-one reads only the last. */
async function fanOut(s: AsyncGraphStore): Promise<void> {
  for (const [id, kind] of [
    ["u-wide", "person"],
    ["u-none", "person"],
    ["u-one", "person"],
    ["proj-big", "project"],
  ] as const)
    await put(s, id, kind);
  await seed(docs, async (d) => {
    await put(s, d, "document");
    await link(s, "u-wide", "can-read", d);
    await link(s, d, "belongs-to", "proj-big");
  });
  await link(s, "u-one", "can-read", docs.at(-1)!);
}

// mcp-server rule 2 at scale: checking a node with FAN neighbours costs a few batched store calls, not two per neighbour.
for (const f of storeFactories) {
  describe.skipIf(f.skip !== undefined)(`${f.name}: viewer cost does not grow with fan-out`, () => {
    it(`a read-nothing viewer checks a person and a project with ${FAN} documents in at most ceil(${FAN}/CHUNK) + 6 calls`, { timeout: 120_000 }, async () => {
      const real = await f.open();
      await fanOut(real);
      for (const bulk of [false, true]) {
        const { store, calls } = counted(real);
        const v = await viewer(store, { tenant: T, user: "u-none" }, undefined, bulk);
        expect([await v.sees("u-wide"), await v.sees("proj-big")]).toEqual([false, false]);
        expect(calls.length, `bulk=${bulk}: ${calls.length} calls`).toBeLessThanOrEqual(Math.ceil(FAN / CHUNK) + 6);
      }
      // The same batched path still says yes when one document of the FAN is readable.
      const one = await viewer(real, { tenant: T, user: "u-one" });
      expect([await one.sees("u-wide"), await one.sees("proj-big"), await one.sees("doc-0")]).toEqual([true, true, false]);
      const many = await viewer(real, { tenant: T, user: "u-one" }, undefined, true);
      expect(await many.seesMany([{ id: "proj-big" }, { id: "doc-0", kind: "document" }, { id: docs.at(-1)!, kind: "document" }])).toEqual([true, false, true]);
    });
  });
}
