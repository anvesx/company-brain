import { createGraphStore } from "@brain/graph-store";
import { afterEach, describe, expect, it } from "vitest";
import { root } from "../http/fixture.js";
import { bootDrive } from "./drive-harness.js";

let h: Awaited<ReturnType<typeof bootDrive>> | undefined;
afterEach(async () => h?.close());

describe("drive oauth account, end to end", () => {
  it("signs in, syncs through the HTTP API, stamps the zone and closes edges on disconnect", async () => {
    h = await bootDrive();
    const { made, code } = await h.connect("?dataZone=company&label=drive");
    expect(made.status).toBe(201);
    const account = (await made.json()) as { id: string; provider: string; dataZone: string };
    expect(account).toMatchObject({ provider: "drive", dataZone: "company" });

    const synced = await h.s.call("POST", `/v1/accounts/${account.id}/sync`, root, {});
    expect(synced.status).toBe(200);
    const asked = h.drive.seen.filter((r) => r.path.startsWith("/drive/v3/files?"));
    expect(asked.length).toBeGreaterThan(1);
    expect(asked.every((r) => r.authorization === `Bearer at_${code}`)).toBe(true);

    const brain = createGraphStore({ path: h.graphPath });
    try {
      for (const id of ["doc1", "txt1", "txt2"]) expect(brain.node("t1", `drive:${account.id}/${id}`)?.props).toMatchObject({ zone: "company" });
      expect(brain.neighbors("t1", `drive:${account.id}/doc1`, { kind: "can-read", dir: "in" }).length).toBeGreaterThan(0);
      const source = `drive:${account.id}`;
      expect(brain.edgesBySource("t1", source, "can-read").length).toBeGreaterThan(0);

      expect((await h.s.call("DELETE", `/v1/accounts/${account.id}`, root)).status).toBe(204);
      expect(brain.edgesBySource("t1", source, "can-read")).toEqual([]);
      for (const id of ["doc1", "txt1", "txt2"]) expect(brain.neighbors("t1", `drive:${account.id}/${id}`, { kind: "can-read", dir: "in" })).toEqual([]);
    } finally {
      brain.close();
    }
  });

  it("answers 502 with graph-sync code when Drive rejects the issued token", async () => {
    h = await bootDrive({ tokens: ["someone-else"] });
    const { made } = await h.connect("");
    const { id } = (await made.json()) as { id: string };
    const synced = await h.s.call("POST", `/v1/accounts/${id}/sync`, root, {});
    expect(synced.status).toBe(502);
    expect(await synced.json()).toEqual({ error: "source sync failed", code: "CONNECTOR_FAILED" });
  });
});
