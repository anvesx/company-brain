/**
 * Per-key single-flight: concurrent calls with the same key share one run of `fn` and one outcome
 * (value or rejection). The entry is dropped when the run settles, so a failure never poisons later calls.
 * Different keys run independently. In-process only; one Node event loop, no locks needed.
 */
export function singleFlight<T>(): (key: string, fn: () => Promise<T>) => Promise<T> {
  const inflight = new Map<string, Promise<T>>();
  return (key, fn) => {
    const running = inflight.get(key);
    if (running) return running;
    const p = fn().finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  };
}
