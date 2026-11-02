import type { GraphStore } from "@brain/graph-store";

/** The real store behind a thin counter of mutating calls. */
export const counted = (store: GraphStore) => {
  const calls = { upsertNode: 0, addEdge: 0, removeEdge: 0, tombstone: 0 };
  const wrap =
    <K extends keyof typeof calls>(k: K) =>
    (...a: Parameters<GraphStore[K]>): void => {
      calls[k]++;
      (store[k] as (...x: unknown[]) => void)(...a);
    };
  const proxy: GraphStore = {
    ...store,
    upsertNode: wrap("upsertNode"),
    addEdge: wrap("addEdge"),
    removeEdge: wrap("removeEdge"),
    tombstone: wrap("tombstone"),
  };
  return { store: proxy, calls };
};
