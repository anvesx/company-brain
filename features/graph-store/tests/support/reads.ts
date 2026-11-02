import { DatabaseSync } from "node:sqlite";
import { edge, node, openStore } from "./helpers.js";

type Proto = Record<"all" | "get", (...a: unknown[]) => unknown>;
const proto = Object.getPrototypeOf(new DatabaseSync(":memory:").prepare("SELECT 1")) as Proto;
const orig = { all: proto.all, get: proto.get };

/** Runs fn and returns how many statement reads (all/get) it issued. */
export function countReads(fn: () => void): number {
  let reads = 0;
  for (const m of ["all", "get"] as const)
    proto[m] = function (this: unknown, ...a: unknown[]) {
      reads++;
      return orig[m].apply(this, a);
    };
  try {
    fn();
  } finally {
    proto.all = orig.all;
    proto.get = orig.get;
  }
  return reads;
}

/** Node "r" with links-to edges to n0..n(targets-1); only the first `existing` of them exist as nodes. */
export function star(targets: number, existing: number) {
  const s = openStore();
  s.upsertNode(node("r"), 1);
  for (let i = 0; i < targets; i++) {
    if (i < existing) s.upsertNode(node(`n${i}`), 1);
    s.addEdge(edge("r", `n${i}`), 1);
  }
  return s;
}

export const opts = (limit: number, depth = 1) => ({ kinds: ["links-to" as const], depth, limit });
