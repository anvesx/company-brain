import { afterEach, describe, expect, it } from "vitest";
import { NOW, pat, root } from "../../http/fixture.js";
import { bootSync } from "../../sync/fixture.js";

let h: Awaited<ReturnType<typeof bootSync>> | undefined;
afterEach(async () => {
  await h?.close();
  h = undefined;
});
const json = async (r: Response) => (await r.json()) as Record<string, unknown>;
const shown = async (id: unknown) => {
  const list = (await json(await (h as NonNullable<typeof h>).s.call("GET", "/v1/accounts", root))).accounts as { id: string; lastSyncAt: number | null }[];
  return list.find((a) => a.id === id)?.lastSyncAt;
};

describe("lastSyncAt, which the account card shows", () => {
  it("is null until a sync succeeds, then the request clock in milliseconds", async () => {
    h = await bootSync();
    const a = await json(await h.s.call("POST", "/v1/accounts", root, { ...pat, repo: "acme/handbook" }));
    expect(a.lastSyncAt).toBeNull();
    expect((await h.s.call("POST", `/v1/accounts/${a.id}/sync`, root, {})).status).toBe(200);
    expect(await shown(a.id)).toBe(NOW * 1000);
  });
  it("is not set by a sync that failed", async () => {
    h = await bootSync();
    const a = await json(await h.s.call("POST", "/v1/accounts", root, pat));
    expect((await h.s.call("POST", `/v1/accounts/${a.id}/sync`, root, {})).status).toBe(400);
    expect((await h.s.call("POST", `/v1/accounts/${a.id}/sync`, root, { repo: "acme/missing" })).status).toBe(502);
    expect(await shown(a.id)).toBeNull();
  });
});
