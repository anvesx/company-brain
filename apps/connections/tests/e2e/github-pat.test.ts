import { createGraphStore } from "@anvesx/graph-store";
import { afterEach, describe, expect, it } from "vitest";
import { pat, root } from "../http/fixture.js";
import { bootSync } from "../sync/fixture.js";

let h: Awaited<ReturnType<typeof bootSync>> | undefined;
afterEach(async () => h?.close());

describe("github pat account, end to end", () => {
  it("connects, syncs into the brain graph with the chosen zone, and disconnect closes the edges", async () => {
    h = await bootSync();
    const made = await h.s.call("POST", "/v1/accounts", root, { ...pat, dataZone: "company" });
    expect(made.status).toBe(201);
    const { id } = (await made.json()) as { id: string };

    const synced = await h.s.call("POST", `/v1/accounts/${id}/sync`, root, { repo: "acme/handbook" });
    expect(synced.status).toBe(200);

    // What the brain app sees: a separate handle on the same graph file.
    const brain = createGraphStore({ path: h.graphPath });
    try {
      for (const path of ["README.md", "docs/guide.md"]) {
        const doc = `github:${id}/${path}`;
        const n = brain.node("t1", doc);
        expect(n?.props).toMatchObject({ zone: "company" });
        expect(brain.neighbors("t1", doc, { kind: "can-read", dir: "in" }).length).toBeGreaterThan(0);
      }
      expect(brain.neighbors("t1", "octocat", { kind: "member-of", dir: "out" }).length).toBeGreaterThan(0);
      const source = `github:${id}`;
      expect(brain.edgesBySource("t1", source, "can-read").length).toBeGreaterThan(0);

      expect((await h.s.call("DELETE", `/v1/accounts/${id}`, root)).status).toBe(204);
      expect(brain.edgesBySource("t1", source, "can-read")).toEqual([]);
      expect(brain.edgesBySource("t1", source, "member-of")).toEqual([]);
      expect(brain.neighbors("t1", `github:${id}/README.md`, { kind: "can-read", dir: "in" })).toEqual([]);
    } finally {
      brain.close();
    }
  });
});
