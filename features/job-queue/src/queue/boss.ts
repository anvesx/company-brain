import { PgBoss } from "pg-boss";
import { guardBacklog, type Sql } from "../ops/backlog.ts";
import type { EnqueueOptions, Handler, JobQueue, QueuePolicy, WorkOptions } from "../types.ts";
import { dlqName, idempotentId } from "./ids.ts";
import { queueOptions, type RawDead, toDeadLetter } from "./map.ts";
import { startWorker } from "./work.ts";

export type Options = { connectionString: string; schema?: string; maxBacklogPerTenant?: number; poolSize?: number; monitorSeconds?: number };

type Item = { data: object; key?: string };

/** The only file that imports the queue library. Everything else sees the JobQueue port. */
export async function createJobQueue(options: Options): Promise<JobQueue> {
  const schema = options.schema ?? "pgboss";
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error(`invalid schema name: ${schema}`);
  const boss = new PgBoss({
    connectionString: options.connectionString,
    schema,
    max: options.poolSize ?? 10,
    monitorIntervalSeconds: options.monitorSeconds ?? 10,
  });
  boss.on("error", (error) => console.error("job-queue", error));
  await boss.start();
  const guard = async (queue: string, tenant: string) => {
    if (options.maxBacklogPerTenant !== undefined) await guardBacklog(boss.getDb() as Sql, schema, queue, tenant, options.maxBacklogPerTenant);
  };
  const toRow = (queue: string, tenant: string, { data, key }: Item) => ({
    data,
    group: { id: tenant },
    ...(key === undefined ? {} : { id: idempotentId(queue, tenant, key) }),
  });
  return {
    async register(queue: string, policy: QueuePolicy = {}) {
      await boss.createQueue(dlqName(queue), { retentionSeconds: 90 * 86_400 });
      await boss.createQueue(queue, queueOptions(queue, policy));
    },
    async enqueue(queue: string, tenant: string, data: object, o: EnqueueOptions = {}) {
      await guard(queue, tenant);
      const { group, id } = toRow(queue, tenant, { data, ...(o.key === undefined ? {} : { key: o.key }) }) as { group: { id: string }; id?: string };
      return boss.send(queue, data, { group, ...(id === undefined ? {} : { id }), ...(o.delaySeconds === undefined ? {} : { startAfter: o.delaySeconds }) });
    },
    async enqueueMany(queue: string, tenant: string, items: Item[]) {
      await guard(queue, tenant);
      const keys = new Set<string>();
      const unique = items.filter((item) => item.key === undefined || (!keys.has(item.key) && keys.add(item.key)));
      return (
        (
          await boss.insert(
            queue,
            unique.map((item) => toRow(queue, tenant, item)),
            { returnId: true },
          )
        )?.length ?? 0
      );
    },
    work: <T extends object>(queue: string, handler: Handler<T>, o?: WorkOptions) => startWorker(boss as never, queue, handler, o),
    schedule: (queue: string, cron: string, data: object = {}) => boss.schedule(queue, cron, data),
    async deadLetters(queue: string, limit = 100) {
      return (await boss.findJobs<object>(dlqName(queue), { limit })).map((job) => toDeadLetter(job as unknown as RawDead));
    },
    async depth(queue: string) {
      const [stats] = await boss.getQueueStats(queue);
      return { queued: stats!.queuedCount, active: stats!.activeCount, failed: stats!.failedCount };
    },
    stop: (timeoutMs = 30_000) => boss.stop({ graceful: true, timeout: timeoutMs }),
  };
}
