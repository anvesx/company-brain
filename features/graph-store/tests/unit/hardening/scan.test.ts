import { describe, expect, it } from "vitest";
import type { GraphStore, ScanQuery } from "../../../src/index.js";
import { code, edge, node, openStore } from "../../support/helpers.js";

// scanTitles: the bounded, rowid-ordered twin of searchTitles. Over every page it must return exactly the
// rows searchTitles (the LIKE oracle) returns, and no single call may look at more than `cap` candidates.
const TITLES = ["Budget report", "report 50% done", "a_b report", "Re: plan", "REPORT draft", "日本 report", "rep", "re", "quarterly review"];
const seeded = () => {
  const s = openStore();
  for (let i = 0; i < 40; i++) {
    for (const [j, title] of TITLES.entries()) s.upsertNode(node(`d${i}-${j}`, { title: `${title} ${i}`, kind: j % 3 === 0 ? "person" : "document" }), 10);
  }
  return s;
};
const pages = (s: GraphStore, q: Omit<ScanQuery, "cursor">) => {
  const all: string[] = [];
  const flags: boolean[] = [];
  for (let cursor: number | undefined, n = 0; n < 500; n++) {
    const p = s.scanTitles("t1", { ...q, ...(cursor === undefined ? {} : { cursor }) });
    all.push(...p.nodes.map((x) => x.id));
    flags.push(p.truncated);
    if (p.next === undefined) return { all, flags };
    cursor = p.next;
  }
  throw new Error("did not finish");
};
const oracle = (s: GraphStore, text: string) =>
  s
    .searchTitles("t1", { text, limit: 1000 })
    .map((n) => n.id)
    .sort();

describe("scanTitles", () => {
  it.each(["report", "re", "rep", "50%", "a_b", "REPORT", "日本", "Re: "])("pages to the same rows as the LIKE oracle for %j", (text) => {
    const s = seeded();
    const { all } = pages(s, { text, limit: 37 });
    expect(all.sort()).toEqual(oracle(s, text));
    expect(all.length).toBeGreaterThan(0);
  });

  it("stops at `cap` candidates, says truncated, and the cursor still reaches every row", () => {
    const s = seeded();
    // accept rejects everything, so no page can fill: each call must stop at the cap instead of scanning on.
    const first = s.scanTitles("t1", { text: "report", limit: 5, cap: 30, accept: () => false });
    expect(first).toMatchObject({ nodes: [], truncated: true });
    expect(first.next).toBeGreaterThan(0);
    const { all, flags } = pages(s, { text: "report", limit: 1000, cap: 30 });
    expect(all.sort()).toEqual(oracle(s, "report"));
    expect(flags.filter(Boolean).length).toBeGreaterThan(1); // many partial pages, each bounded by cap
  });

  it("applies the edge rule to one kind only, and `accept` to the rest", () => {
    const s = seeded();
    s.addEdge(edge("u1", "d0-1", { kind: "can-read" }), 10);
    const reachedBy = { from: ["u1"], kind: "can-read" as const, only: "document" as const };
    const { all } = pages(s, { text: "report", limit: 1000, reachedBy });
    const docs = all.filter((id) => s.node("t1", id)?.kind === "document");
    expect(docs).toEqual(["d0-1"]);
    expect(all.length).toBeGreaterThan(1); // the people still pass: only documents are gated
  });

  it("refuses bad cap, cursor and limit with BAD_INPUT", () => {
    const s = seeded();
    for (const extra of [{ cap: 0 }, { cap: 2_000_000 }, { cursor: -1 }, { cursor: 1.5 }, { limit: 0 }, { limit: 1001 }])
      expect(code(() => s.scanTitles("t1", { text: "re", limit: 5, ...extra }))).toBe("BAD_INPUT");
    expect(code(() => s.scanTitles("t1", { text: "\u0000", limit: 5 }))).toBe("BAD_INPUT");
  });
});
