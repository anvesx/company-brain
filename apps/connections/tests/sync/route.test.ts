import { afterEach, describe, expect, it } from "vitest";
import { ann, bob, pat, root } from "../http/fixture.js";
import { bootSync } from "./fixture.js";

type H = Awaited<ReturnType<typeof bootSync>>;
let h: H | undefined;
afterEach(async () => h?.close());
const cur = () => h as NonNullable<typeof h>;
const make = async (who = root, extra: object = {}) => {
  const r = await cur().s.call("POST", "/v1/accounts", who, { ...pat, dataZone: "company", ...extra });
  return ((await r.json()) as { id: string }).id;
};
const sync = (id: string, who = root, b: unknown = { repo: "acme/handbook" }) => cur().s.call("POST", `/v1/accounts/${id}/sync`, who, b) as Promise<Response>;

describe("POST /v1/accounts/:id/sync", () => {
  it("runs the github connector with the stored token and stamps zone and owner", async () => {
    h = await bootSync();
    const id = await make();
    const r = await sync(id);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ pages: 1, removed: 0 });
    expect(h.gh.seen.some((s) => s.authorization === "token ghp_secret")).toBe(true);
    for (const path of ["README.md", "docs/guide.md"]) {
      const doc = `github:${id}/${path}`;
      const n = h.graph.node("t1", doc);
      expect(n).toMatchObject({ kind: "document", source: `github:${id}`, address: path, props: { zone: "company", owner: "root" } });
      expect(
        h.graph
          .neighbors("t1", doc, { kind: "can-read", dir: "in" })
          .map((e) => e.from)
          .sort(),
      ).toEqual([`github:${id}/acme/docs`, `github:${id}/acme/justice-league`, "hubot", "octocat"]);
    }
  });
  it("converges: a second run writes nothing", async () => {
    h = await bootSync();
    const id = await make();
    await sync(id);
    expect(await (await sync(id)).json()).toMatchObject({ nodes: 0, edges: 0, removed: 0 });
  });
  it("answers 401, 404, 403 and 400 before touching the source", async () => {
    h = await bootSync();
    const id = await make(root, { access: "company" });
    expect((await h.s.call("POST", `/v1/accounts/${id}/sync`)).status).toBe(401);
    expect((await sync("nope")).status).toBe(404);
    expect((await sync(id, ann)).status).toBe(403);
    expect((await sync(id, root, {})).status).toBe(400);
    expect((await sync(id, root, { repo: "acme" })).status).toBe(400);
    expect((await sync(id, root, null)).status).toBe(400);
    expect(h.gh.seen).toEqual([]);
  });
  it("hides another owner's private account", async () => {
    h = await bootSync();
    const id = await make(ann, { dataZone: "private" });
    expect((await sync(id, bob)).status).toBe(404);
  });
  it("refuses a needs-auth account with 409", async () => {
    h = await bootSync();
    const id = await make();
    h.s.store.setStatus("t1", id, "needs-auth");
    const r = await sync(id);
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toMatch(/re-authoris/);
    expect(h.gh.seen).toEqual([]);
  });
  it("answers 502 when the source fails, without echoing the token", async () => {
    h = await bootSync();
    const id = await make();
    const r = await sync(id, root, { repo: "acme/missing" });
    expect(r.status).toBe(502);
    expect(await r.text()).not.toContain("ghp_secret");
  });
  it("answers 501 when no graph is configured", async () => {
    h = await bootSync({ sync: undefined as never });
    const id = await make();
    expect((await sync(id)).status).toBe(501);
  });
});
