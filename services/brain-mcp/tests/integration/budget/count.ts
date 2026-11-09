import type { AsyncGraphStore } from "@anvesx/graph-store";

/** Wraps a store so every method call is recorded by name, in order. The calls still reach the real store. */
export function counted(real: AsyncGraphStore): { store: AsyncGraphStore; calls: string[] } {
  const calls: string[] = [];
  const store = new Proxy(real, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        calls.push(String(key));
        return value.apply(target, args);
      };
    },
  });
  return { store, calls };
}

/** Runs `fn` over `items` 50 at a time: fast enough to seed thousands of rows on Postgres, gentle on its pool. */
export async function seed<T>(items: readonly T[], fn: (item: T) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < items.length; i += 50) await Promise.all(items.slice(i, i + 50).map(fn));
}
