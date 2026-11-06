import type { GraphStore } from "./schema.js";

/** The GraphStore contract with every method returning a Promise. Errors are rejected GraphErrors, never sync throws. */
export type AsyncGraphStore = { [K in keyof GraphStore]: (...a: Parameters<GraphStore[K]>) => Promise<Awaited<ReturnType<GraphStore[K]>>> };

/** Wraps a sync store. Each call runs inside a promise, so a sync throw becomes a rejection. */
export function toAsync(store: GraphStore): AsyncGraphStore {
  const wrapped = Object.entries(store).map(([name, fn]) => [
    name,
    (...a: unknown[]) => Promise.resolve().then(() => (fn as (...x: unknown[]) => unknown)(...a)),
  ]);
  return Object.fromEntries(wrapped) as AsyncGraphStore;
}
