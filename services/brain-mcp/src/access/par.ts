/** `fn` over `items`, `size` at a time, results in the order of `items`. Bounds the queries in flight against a pooled store. */
export async function inChunks<T, R>(items: readonly T[], fn: (item: T) => Promise<R>, size = 32): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}
