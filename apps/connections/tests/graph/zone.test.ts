import { afterEach, describe, expect, it } from "vitest";
import { coreZone } from "../../src/graph/zone.js";
import { ann, pat, root } from "../http/fixture.js";
import { bootSync } from "../sync/fixture.js";

let h: Awaited<ReturnType<typeof bootSync>> | undefined;
afterEach(async () => h?.close());

describe("account zone to core-types zone", () => {
  it.each([
    ["private", "personal"],
    ["personal", "personal"],
    ["company", "company"],
  ] as const)("%s becomes %s", (from, to) => expect(coreZone(from)).toBe(to));

  it.each(["private", "personal"])("a %s account is written owner-only as a personal document", async (dataZone) => {
    h = await bootSync();
    const made = await h.s.call("POST", "/v1/accounts", ann, { ...pat, dataZone });
    const { id } = (await made.json()) as { id: string };
    expect((await h.s.call("POST", `/v1/accounts/${id}/sync`, ann, { repo: "acme/handbook" })).status).toBe(200);
    for (const path of ["README.md", "docs/guide.md"]) {
      const doc = `github:${id}/${path}`;
      expect(h.graph.node("t1", doc)?.props).toMatchObject({ zone: "personal", owner: "ann" });
      expect(h.graph.neighbors("t1", doc, { kind: "can-read", dir: "in" }).map((e) => e.from)).toEqual(["ann"]);
    }
    expect(h.graph.edgesBySource("t1", `github:${id}`, "member-of")).toEqual([]);
  });
  it("a company account keeps the source's readers and the company zone", async () => {
    h = await bootSync();
    const made = await h.s.call("POST", "/v1/accounts", root, { ...pat, dataZone: "company" });
    const { id } = (await made.json()) as { id: string };
    await h.s.call("POST", `/v1/accounts/${id}/sync`, root, { repo: "acme/handbook" });
    expect(h.graph.node("t1", `github:${id}/README.md`)?.props).toMatchObject({ zone: "company", owner: "root" });
    expect(h.graph.neighbors("t1", `github:${id}/README.md`, { kind: "can-read", dir: "in" }).length).toBeGreaterThan(1);
  });
});
