import { afterEach, describe, expect, it } from "vitest";
import { root } from "../../http/fixture.js";
import { bootSync } from "../fixture.js";

let h: Awaited<ReturnType<typeof bootSync>> | undefined;
afterEach(async () => h?.close());
const cur = () => h as NonNullable<typeof h>;
const pat = { provider: "github", label: "work", kind: "pat", token: "ghp_secret", access: "private" };
const edges = (id: string) => (["can-read", "member-of"] as const).reduce((n, k) => n + cur().graph.edgesBySource("t1", `github:${id}`, k).length, 0);

/** Starts a sync, holds it on the network, runs `during`, then lets it finish. */
async function raceWith(zone: string, during: (id: string) => Promise<unknown>) {
  h = await bootSync({}, undefined, true);
  const made = await cur().s.call("POST", "/v1/accounts", root, { ...pat, dataZone: zone });
  const id = ((await made.json()) as { id: string }).id;
  cur().gate.hold();
  const sync = cur().s.call("POST", `/v1/accounts/${id}/sync`, root, { repo: "acme/handbook" });
  await cur().gate.reached();
  await during(id);
  cur().gate.release();
  expect((await sync).status).toBe(200);
  return id;
}

describe("a sync in flight while dataZone is narrowed", () => {
  it("leaves no edges at the old zone", async () => {
    const id = await raceWith("company", (i) => cur().s.call("PATCH", `/v1/accounts/${i}`, root, { dataZone: "private" }));
    expect(edges(id)).toBe(0);
  });
  it("keeps the edges when the zone widens meanwhile", async () => {
    const id = await raceWith("personal", (i) => cur().s.call("PATCH", `/v1/accounts/${i}`, root, { dataZone: "company" }));
    expect(edges(id)).toBeGreaterThan(0);
  });
  it("leaves no edges when the account is disconnected meanwhile", async () => {
    const id = await raceWith("company", (i) => cur().s.call("DELETE", `/v1/accounts/${i}`, root));
    expect(edges(id)).toBe(0);
  });
});
