import { afterEach, describe, expect, it } from "vitest";
import { root } from "../../http/fixture.js";
import { bootSync } from "../fixture.js";

let h: Awaited<ReturnType<typeof bootSync>> | undefined;
afterEach(async () => h?.close());
const cur = () => h as NonNullable<typeof h>;
const pat = { provider: "github", label: "work", kind: "pat", token: "ghp_secret", access: "private" };
const make = async (dataZone: string) => ((await (await cur().s.call("POST", "/v1/accounts", root, { ...pat, dataZone })).json()) as { id: string }).id;
const patch = (id: string, body: object) => cur().s.call("PATCH", `/v1/accounts/${id}`, root, body);
const edges = (id: string) => (["can-read", "member-of"] as const).reduce((n, k) => n + cur().graph.edgesBySource("t1", `github:${id}`, k).length, 0);
const synced = async (zone: string) => {
  h = await bootSync();
  const id = await make(zone);
  await cur().s.call("POST", `/v1/accounts/${id}/sync`, root, { repo: "acme/handbook" });
  expect(edges(id)).toBeGreaterThan(0);
  return id;
};

describe("PATCH /v1/accounts/:id narrowing dataZone", () => {
  it("closes the edges written at the wider zone", async () => {
    const id = await synced("company");
    expect((await patch(id, { dataZone: "private" })).status).toBe(200);
    expect(edges(id)).toBe(0);
  });
  it("closes them when narrowing company to personal", async () => {
    const id = await synced("company");
    await patch(id, { dataZone: "personal" });
    expect(edges(id)).toBe(0);
  });
  it("keeps edges when the zone stays or widens, or another field changes", async () => {
    const id = await synced("personal");
    await patch(id, { label: "renamed" });
    await patch(id, { dataZone: "personal" });
    expect(edges(id)).toBeGreaterThan(0);
    await patch(id, { dataZone: "company" });
    expect(edges(id)).toBeGreaterThan(0);
  });
  it("keeps the edges when the patch is refused", async () => {
    const id = await synced("company");
    expect((await patch(id, { dataZone: "bogus" })).status).toBe(400);
    expect(edges(id)).toBeGreaterThan(0);
  });
});
