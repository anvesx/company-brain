import type { JobQueue } from "../types.ts";

/** On the first SIGTERM or SIGINT, stop taking jobs, let running handlers finish, then call `done`. */
export function stopOnSignals(queue: JobQueue, done: (error?: Error) => void, timeoutMs: number, signals: NodeJS.Signals[]): void {
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    queue.stop(timeoutMs).then(() => done(), done);
  };
  for (const signal of signals) process.once(signal, stop);
}
