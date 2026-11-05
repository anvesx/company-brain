import { describe, expect, it } from "vitest";
import { type CopyEdge, resolveClaims, type Source } from "../../../src/index.js";

const sources: Source[] = [
  { id: "s1", class: "signed" },
  { id: "o", class: "record" },
  { id: "k", class: "record" },
];
const claims = [
  { id: "c1", source: "s1", item: "x", value: "a", at: 1 },
  { id: "c2", source: "o", item: "x", value: "b", at: 1 },
  { id: "c3", source: "k", item: "x", value: "b", at: 1 },
];
const run = (copies: CopyEdge[]) => resolveClaims({ sources, claims, copies }, { now: 10 });
const score = (r: ReturnType<typeof run>, value: string) => r.items[0]!.groups.find((g) => g.value === value)!.score;

describe("resolve: copy factor", () => {
  it("rule 4: a copier cannot flip a vote it copied", () => {
    // n = 1. signed log2(19) = 4.2479. record log2(0.9 / 0.1) = log2(9) = 3.1699.
    // No edge: C(b) = 3.1699 * 2 = 6.3399 > 4.2479, so b wins on the copier's echo.
    expect(run([]).items[0]!.value).toBe("b");
    // Edge share 0.8: k counts 1 - 0.8 = 0.2. C(b) = 3.1699 * 1.2 = 3.8039 < 4.2479.
    // P(a) = 19 / (19 + 9^1.2) = 19 / (19 + 13.967) = 0.5763.
    const r = run([{ copier: "k", original: "o", share: 0.8 }]);
    expect(r.items[0]!.value).toBe("a");
    expect(score(r, "b")).toBeCloseTo(3.8039, 4);
    expect(r.items[0]!.confidence).toBeCloseTo(0.5763, 4);
  });

  it("rule 4: copies never add a vote; share 1 leaves only the original", () => {
    expect(score(run([{ copier: "k", original: "o", share: 1 }]), "b")).toBeCloseTo(Math.log2(9), 10);
  });

  it("rule 4: no discount when the original gives a different value", () => {
    const r = resolveClaims({ sources, claims, copies: [{ copier: "k", original: "s1", share: 1 }] }, { now: 10 });
    expect(score(r, "b")).toBeCloseTo(2 * Math.log2(9), 10);
  });

  it("rule 4: a chain A copies B copies C discounts A against both", () => {
    const chain: Source[] = ["A", "B", "C"].map((id) => ({ id, class: "wiki" }));
    const chainClaims = ["A", "B", "C"].map((id) => ({ id: `c${id}`, source: id, item: "x", value: "b", at: 1 }));
    const copies = [
      { copier: "A", original: "B", share: 0.5 },
      { copier: "B", original: "C", share: 0.5 },
    ];
    const r = resolveClaims({ sources: [...chain, sources[0]!], claims: [...chainClaims, claims[0]!], copies }, { now: 10 });
    // wiki log2(3) = 1.585. C counts 1, B counts 0.5, A counts 0.5 * 0.5 = 0.25 (Eq 13 product).
    // C(b) = 1.585 * 1.75 = 2.7737.
    expect(score(r, "b")).toBeCloseTo(Math.log2(3) * 1.75, 10);
  });

  it("rule 10: the output does not depend on the order of the copy edges", () => {
    // Four wiki sources; a, b, c say v and d says w. b and c copy each other and a copies both,
    // so the edge sort tie-break on `original` decides the factor product order.
    const wiki = ["a", "b", "c", "d"].map((id): Source => ({ id, class: "wiki" }));
    const said = [
      ["a", "v"],
      ["b", "v"],
      ["c", "v"],
      ["d", "w"],
    ] as const;
    const rows = said.map(([source, value], i) => ({ id: `c${i}`, source, item: "x", value, at: 1 }));
    const edges: CopyEdge[] = [
      { copier: "a", original: "b", share: 0.5 },
      { copier: "a", original: "c", share: 0.5 },
      { copier: "b", original: "c", share: 0.9 },
      { copier: "c", original: "b", share: 0.2 },
    ];
    const orders = [
      edges,
      [edges[1]!, edges[0]!, edges[3]!, edges[2]!],
      [edges[3]!, edges[2]!, edges[1]!, edges[0]!],
      [edges[2]!, edges[3]!, edges[0]!, edges[1]!],
    ];
    const outputs = orders.map((copies) => JSON.stringify(resolveClaims({ sources: wiki, claims: rows, copies }, { now: 10 })));
    for (const out of outputs) expect(out).toBe(outputs[0]);
    expect(score(JSON.parse(outputs[0]!), "v")).toBeCloseTo(1.420126400646156, 12);
  });
});
