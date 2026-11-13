import type { JobQueue } from "../types.ts";

/** Recurring jobs the product needs (JQ-07). The queue name is the contract with the services that consume them. */
export const SCHEDULES = [
  { queue: "connector.poll", cron: "*/15 * * * *" },
  { queue: "connector.sweep", cron: "0 3 * * *" },
  { queue: "cluster.build", cron: "30 2 * * *" },
] as const;

export async function registerSchedules(queue: JobQueue, schedules: ReadonlyArray<{ queue: string; cron: string }> = SCHEDULES): Promise<void> {
  for (const entry of schedules) {
    await queue.register(entry.queue);
    await queue.schedule(entry.queue, entry.cron);
  }
}
