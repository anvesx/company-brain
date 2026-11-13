import { describe, expect, test } from "vitest";
import { queueOptions, type RawDead, toDeadLetter, toJob } from "../../src/queue/map.ts";

const dead = (output: unknown, extra: Partial<RawDead> = {}): RawDead => ({
  id: "d1",
  data: { n: 1 },
  retryCount: 0,
  groupId: "acme",
  sourceId: "s1",
  sourceRetryCount: 2,
  sourceOutput: output,
  createdOn: new Date(0),
  ...extra,
});

describe("queueOptions", () => {
  test("defaults to backoff retries into the named dead-letter queue", () => {
    expect(queueOptions("sync", {})).toMatchObject({ deadLetter: "sync_dlq", retryLimit: 5, retryBackoff: true, retryDelayMax: 300, heartbeatSeconds: 30 });
  });

  test("honours overrides and never goes under the 10 s heartbeat floor", () => {
    const o = queueOptions("q", { retryLimit: 1, retryDelaySeconds: 7, maxRetryDelaySeconds: 9, expireSeconds: 60, recoverySeconds: 2 });
    expect(o).toMatchObject({ retryLimit: 1, retryDelay: 7, retryDelayMax: 9, expireInSeconds: 60, heartbeatSeconds: 10 });
  });
});

describe("toJob", () => {
  test("maps the group to the tenant, and group-less jobs to system", () => {
    expect(toJob({ id: "a", data: {}, retryCount: 3, groupId: "acme" })).toEqual({ id: "a", tenant: "acme", data: {}, attempt: 3 });
    expect(toJob({ id: "b", data: {}, retryCount: 0 }).tenant).toBe("system");
    expect(toJob({ id: "c", data: {}, retryCount: 0, groupId: null }).tenant).toBe("system");
  });
});

describe("toDeadLetter", () => {
  test("reports the failure message, attempts and source job", () => {
    expect(toDeadLetter(dead({ message: "boom" }))).toEqual({
      id: "d1",
      tenant: "acme",
      data: { n: 1 },
      sourceId: "s1",
      attempts: 3,
      error: "boom",
      failedAt: new Date(0),
    });
  });

  test("falls back to the raw output, the job id and one attempt", () => {
    const row = toDeadLetter(dead({ code: 1 }, { groupId: null, sourceId: null, sourceRetryCount: null }));
    expect(row).toMatchObject({ tenant: "system", sourceId: "d1", attempts: 1, error: '{"code":1}' });
    expect(toDeadLetter(dead(null)).error).toBe("null");
    expect(toDeadLetter(dead(undefined)).error).toBe("null");
  });
});
