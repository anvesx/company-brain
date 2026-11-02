import { describe, expect, it } from "vitest";
import type { EdgeKind } from "../../../src/index.js";
import { edge, message, node, openStore } from "../../support/helpers.js";

const R = { kinds: ["links-to" as EdgeKind], depth: 1, limit: 1 };
const alien = "alien" as never;
const NaNs = Number.NaN;

// Each rejected call must say which argument was wrong, so callers can fix it.
type S = ReturnType<typeof openStore>;
const cases: [string, (s: S) => unknown, RegExp][] = [
  ["edge tenant", (s) => s.addEdge(edge("a", "b", { tenant: "" }), 1), /^tenant must be a non-empty string/],
  ["edge from", (s) => s.addEdge(edge("", "b"), 1), /^from must be a non-empty string/],
  ["edge to", (s) => s.addEdge(edge("a", ""), 1), /^to must be a non-empty string/],
  ["edge source", (s) => s.addEdge(edge("a", "b", { source: "" }), 1), /^source must be a non-empty string/],
  ["edge kind", (s) => s.addEdge(edge("a", "b", { kind: alien }), 1), /^kind is not a known kind/],
  ["add at", (s) => s.addEdge(edge("a", "b"), NaNs), /^at must be a finite number/],
  ["remove at", (s) => s.removeEdge(edge("a", "b"), NaNs), /^at must be a finite number/],
  ["neighbors tenant", (s) => s.neighbors("", "a"), /^tenant must be a non-empty string/],
  ["neighbors id", (s) => s.neighbors("t1", ""), /^id must be a non-empty string/],
  ["neighbors dir", (s) => s.neighbors("t1", "a", { dir: alien }), /^dir must be "out" or "in"/],
  ["neighbors asOf", (s) => s.neighbors("t1", "a", { asOf: NaNs }), /^asOf must be a finite number/],
  ["neighbors kind", (s) => s.neighbors("t1", "a", { kind: alien }), /^kind is not a known kind/],
  ["bySource tenant", (s) => s.edgesBySource("", "x", "mentions"), /^tenant must be a non-empty string/],
  ["bySource source", (s) => s.edgesBySource("t1", "", "mentions"), /^source must be a non-empty string/],
  ["bySource kind", (s) => s.edgesBySource("t1", "x", alien), /^kind is not a known kind/],
  ["node tenant", (s) => s.upsertNode(node("a", { tenant: "" }), 1), /^tenant must be a non-empty string/],
  ["node id", (s) => s.upsertNode(node(""), 1), /^id must be a non-empty string/],
  ["node at", (s) => s.upsertNode(node("a"), NaNs), /^at must be a finite number/],
  ["node kind", (s) => s.upsertNode(node("a", { kind: alien }), 1), /^kind is not a known kind/],
  ["node strings", (s) => s.upsertNode(node("a", { title: 1 as never }), 1), /^source, address, title, version must be strings/],
  ["get tenant", (s) => s.node("", "a"), /^tenant must be a non-empty string/],
  ["get id", (s) => s.node("t1", ""), /^id must be a non-empty string/],
  ["get asOf", (s) => s.node("t1", "a", NaNs), /^asOf must be a finite number/],
  ["history tenant", (s) => s.history("", "a"), /^tenant must be a non-empty string/],
  ["history id", (s) => s.history("t1", ""), /^id must be a non-empty string/],
  ["reach tenant", (s) => s.reach("", "a", R), /^tenant must be a non-empty string/],
  ["reach from", (s) => s.reach("t1", "", R), /^from must be a non-empty string/],
  ["reach kinds", (s) => s.reach("t1", "a", { ...R, kinds: "" as never }), /^kinds must be an array/],
  ["reach kind", (s) => s.reach("t1", "a", { ...R, kinds: [alien] }), /^kind is not a known kind/],
  ["reach depth", (s) => s.reach("t1", "a", { ...R, depth: -1 }), /^depth must be a non-negative integer/],
  ["reach cap", (s) => s.reach("t1", "a", { ...R, depth: 7 }), /^depth is capped at 6/],
  ["reach limit", (s) => s.reach("t1", "a", { ...R, limit: -1 }), /^limit must be a non-negative integer/],
  ["reach asOf", (s) => s.reach("t1", "a", { ...R, asOf: NaNs }), /^asOf must be a finite number/],
  ["props object", (s) => s.upsertNode(node("a", { props: "abc" as never }), 1), /^props must be an object/],
  ["props key", (s) => s.upsertNode(node("a", { props: { body: "x" } }), 1), /^props key "body" is not allowed: metadata only/],
  ["props type", (s) => s.upsertNode(node("a", { props: { k: 1 as never } }), 1), /^props\["k"\] must be a string/],
  ["props size", (s) => s.upsertNode(node("a", { props: { k: "x".repeat(1025) } }), 1), /^props\["k"\] is over 1 KiB/],
];

describe("error messages name the offending argument", () => {
  it.each(cases)("%s", (_name, call, re) => {
    expect(message(() => call(openStore()))).toMatch(re);
  });
  it("undefined edge, node and reach options are rejected as BAD_INPUT, not a TypeError", () => {
    const s = openStore();
    expect(message(() => s.addEdge(undefined as never, 1))).toMatch(/^kind is not a known kind/);
    expect(message(() => s.upsertNode(undefined as never, 1))).toMatch(/^tenant must be/);
    expect(message(() => s.reach("t1", "a", undefined as never))).toMatch(/^kinds must be an array/);
  });
});
