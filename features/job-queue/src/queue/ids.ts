import { createHash } from "node:crypto";

/**
 * A stable UUID for (queue, tenant, key). The queue stores jobs under a unique id, so a second
 * enqueue with the same key is refused for as long as the first job row is retained (the queue's
 * `dedupeWindowSeconds`). That is enqueue de-duplication; delivery of an accepted job stays at least
 * once. 122 id bits: a collision between distinct keys needs about 2^61 keys, so it is not tested.
 */
export function idempotentId(queue: string, tenant: string, key: string): string {
  const bytes = createHash("sha256").update(`${queue}\0${tenant}\0${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const SYSTEM_TENANT = "system";
export const dlqName = (queue: string): string => `${queue}_dlq`;
