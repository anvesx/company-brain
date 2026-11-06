import type { Edge, GraphNode, GraphStore } from "@anvesx/graph-store";
import { edge, node } from "./store.js";

/** mulberry32: a tiny seeded PRNG, so the large graph is the same on every run and every machine. */
export const prng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const TENANT = "scale";
export const USER = "u0";
const range = (n: number, prefix: string): string[] => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

/**
 * The integration-sized graph: 10,000 documents u0 can read and exactly 50,000 edges. The visible set
 * is known by construction, not computed by a second copy of the rule:
 *   visible   u0, team0, team1, d0..d9999, p0..p49, person0..person199
 *   invisible team2..team4, x0..x1999 (unreadable docs), p50..p59, o0..o49 (outsiders)
 * Every person{i} can read d{i}, so all 200 are visible. Invisible rows link into visible ones,
 * so a view that forgets the both-ends rule leaks edges and the count below catches it.
 */
export function seedScale(store: GraphStore, at: number) {
  const rand = prng(42);
  const pick = (n: number) => Math.floor(rand() * n);
  const docs = range(10_000, "d");
  const nodes: GraphNode[] = [
    node(TENANT, USER, "person", "slack"),
    ...range(5, "team").map((id) => node(TENANT, id, "team", "slack")),
    ...range(200, "person").map((id) => node(TENANT, id, "person", "slack")),
    ...range(50, "o").map((id) => node(TENANT, id, "person", "slack")),
    ...docs.map((id, i) => node(TENANT, id, "document", ["gdrive", "notion", "github", "slack"][i % 4] as string)),
    ...range(2_000, "x").map((id) => node(TENANT, id, "document", "gdrive")),
    ...range(60, "p").map((id) => node(TENANT, id, "project", "linear")),
  ];
  const seen = new Set<string>();
  const edges: Edge[] = [];
  const add = (from: string, to: string, kind: Edge["kind"]): boolean => {
    const key = `${from}|${to}|${kind}`;
    if (seen.has(key) || from === to) return false;
    seen.add(key);
    edges.push(edge(TENANT, from, to, kind));
    return true;
  };
  add(USER, "team0", "member-of");
  add(USER, "team1", "member-of");
  for (const [i, d] of docs.entries()) add(i < 4_000 ? USER : i < 7_000 ? "team0" : "team1", d, "can-read");
  for (let i = 0; i < 200; i++) add(`person${i}`, `d${i}`, "can-read");
  while (edges.length < 2 + 10_000 + 200 + 9_800) add(`person${pick(200)}`, `d${pick(10_000)}`, "can-read");
  for (const [i, d] of docs.entries()) add(d, `p${i % 50}`, "belongs-to");
  for (let j = 0; j < 2_000; j++) add(`o${j % 50}`, `x${j}`, "can-read");
  for (let j = 0; j < 2_000; j++) add(`x${j}`, `p${50 + (j % 10)}`, "belongs-to");
  for (let j = 0; j < 300; j++) add(`team${2 + (j % 3)}`, `x${j}`, "can-read");
  for (let j = 0; j < 2_000; j++) add(`x${j}`, `d${pick(10_000)}`, "links-to");
  while (edges.length < 50_000) add(`d${pick(10_000)}`, `d${pick(10_000)}`, "links-to");
  for (const n of nodes) store.upsertNode(n, at);
  for (const e of edges) store.addEdge(e, at);
  const visible = [USER, "team0", "team1", ...docs, ...range(50, "p"), ...range(200, "person")].sort();
  // Edges with both ends visible: member-of 2, can-read 10,000 + 10,000, belongs-to 10,000, d-to-d links-to the rest.
  const visibleEdges = edges.filter((e) => !/^(x|o|team[234]$|p5\d$)/.test(e.from) && !/^(x|o|team[234]$|p5\d$)/.test(e.to)).length;
  return { nodes: nodes.length, edges: edges.length, visible, visibleEdges };
}
