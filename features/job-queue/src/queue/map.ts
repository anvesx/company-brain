import type { DeadLetter, Job, QueuePolicy } from "../types.ts";
import { dlqName, SYSTEM_TENANT } from "./ids.ts";

export type RawJob = { id: string; data: object; retryCount: number; groupId?: string | null };
export type RawDead = RawJob & { sourceId: string | null; sourceRetryCount: number | null; sourceOutput: unknown; completedOn?: Date | null; createdOn: Date };

export const queueOptions = (queue: string, p: QueuePolicy) => ({
  deadLetter: dlqName(queue),
  retryLimit: p.retryLimit ?? 5,
  retryDelay: p.retryDelaySeconds ?? 2,
  retryBackoff: true,
  retryDelayMax: p.maxRetryDelaySeconds ?? 300,
  expireInSeconds: p.expireSeconds ?? 900,
  heartbeatSeconds: Math.max(10, p.recoverySeconds ?? 30),
});

export const toJob = <T>(raw: RawJob): Job<T> => ({ id: raw.id, tenant: raw.groupId ?? SYSTEM_TENANT, data: raw.data as T, attempt: raw.retryCount });

const message = (output: unknown): string => {
  const text = (output as { message?: unknown } | null)?.message;
  return typeof text === "string" ? text : JSON.stringify(output ?? null);
};

export const toDeadLetter = (raw: RawDead): DeadLetter => ({
  id: raw.id,
  tenant: raw.groupId ?? SYSTEM_TENANT,
  data: raw.data,
  sourceId: raw.sourceId ?? raw.id,
  attempts: (raw.sourceRetryCount ?? 0) + 1,
  error: message(raw.sourceOutput),
  failedAt: raw.createdOn,
});
