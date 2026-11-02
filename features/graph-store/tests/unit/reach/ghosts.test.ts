import { describe, expect, it } from "vitest";
import { edge, node, openStore } from "../../support/helpers.js";
import { oracle } from "../../support/oracle.js";

const ids = (ns: { id: string }[]) => ns.map((n) => n.id);

/** Hub "h" with `ghosts` edges to never-created nodes, then `real` existing targets. */
function hub(ghosts: number, real: number) {
  const s = openStore();
  s.upsertNode(node("h"), 1);
  for (let i = 0; i < ghosts; i++) s.addEdge(edge("h", `g${i}`), 1);
  for (let i = 0; i < real; i++) {
    s.upsertNode(node(`n${i}`), 1);
    s.addEdge(edge("h", `n${i}`), 1);
  }
  return s;
}
const o = (limit: number, depth = 1) => ({ kinds: ["links-to" as const], depth, limit });

describe("reach with ghost edges", () => {
  it("10 ghosts then 5 real, limit 1 returns 1", () => {
    expect(ids(hub(10, 5).reach("t1", "h", o(1)))).toEqual(["n0"]);
  });

  it("40 ghosts then 5 real, limit 3 returns 3", () => {
    expect(ids(hub(40, 5).reach("t1", "h", o(3)))).toEqual(["n0", "n1", "n2"]);
  });

  it("30-node clique plus a tail node, limit 31 depth 3 returns 31", () => {
    const s = openStore();
    for (let i = 0; i < 31; i++) s.upsertNode(node(`c${i}`), 1);
    for (let i = 0; i < 30; i++) for (let j = 0; j < 30; j++) if (i !== j) s.addEdge(edge(`c${i}`, `c${j}`), 1);
    s.addEdge(edge("c0", "c30"), 1);
    expect(s.reach("t1", "c0", o(31, 3))).toHaveLength(30);
    s.upsertNode(node("tail"), 1);
    s.addEdge(edge("c29", "tail"), 1);
    expect(s.reach("t1", "c0", o(31, 3))).toHaveLength(31);
  });

  it("5000 ghosts then 1 real, limit 1 still finds it", () => {
    expect(ids(hub(5000, 1).reach("t1", "h", o(1)))).toEqual(["n0"]);
  });
});

describe("reach matches the one-lookup-per-node semantics", () => {
  it("returns identical results and order on random graphs", () => {
    let seed = 12345;
    const rnd = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    for (let round = 0; round < 25; round++) {
      const s = openStore();
      const names = Array.from({ length: 30 }, (_, i) => `v${i}`);
      for (const id of names) if (rnd(4) !== 0) s.upsertNode(node(id), 1);
      for (let k = 0; k < 120; k++) {
        const kind = (["links-to", "mentions"] as const)[rnd(2)]!;
        s.addEdge(edge(names[rnd(30)]!, names[rnd(30)]!, { kind }), 1);
      }
      for (const limit of [0, 1, 2, 5, 17, 1000]) {
        for (const depth of [0, 1, 2, 4, 6]) {
          for (const kinds of [["links-to"], ["mentions"], ["links-to", "mentions"], []] as const) {
            const opts = { kinds: [...kinds], depth, limit };
            expect(ids(s.reach("t1", "v0", opts))).toEqual(ids(oracle(s, "v0", opts)));
          }
        }
      }
    }
  });
});
