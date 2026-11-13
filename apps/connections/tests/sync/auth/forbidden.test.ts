import { afterEach, describe, expect, it } from "vitest";
import { root, seed } from "../../http/fixture.js";
import { bootSync, routes } from "../fixture.js";

let h: Awaited<ReturnType<typeof bootSync>> | undefined;
afterEach(async () => {
  await h?.close();
  h = undefined;
});

const TREE = "/repos/acme/handbook/git/trees/main";
/** The repo tree answers `tree`, and `GET /user` (the token check) answers `user`. */
async function run(tree: number, user: number) {
  h = await bootSync({}, { ...routes, [TREE]: { status: tree, body: { message: "no" } }, "/user": { status: user, body: { login: "x" } } });
  const a = await seed(h.s, {});
  const r = await h.s.call("POST", `/v1/accounts/${a.id}/sync`, root, { repo: "acme/handbook" });
  return { r, a, s: h.s };
}

describe("401 and 403 from the source", () => {
  it("a 403 with a live token keeps the account connected and says why", async () => {
    const { r, a, s } = await run(403, 200);
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: "the provider denied access to this source" });
    expect(s.store.get("t1", a.id)?.status).toBe("active");
    expect(s.store.health.read("t1", a.id)?.lastError).toContain("denied access (403)");
  });
  it("a 401 (dead token) asks to reconnect", async () => {
    const { r, a, s } = await run(401, 401);
    expect(r.status).toBe(409);
    expect(s.store.get("t1", a.id)?.status).toBe("needs-auth");
  });
  it("a refusal that cannot be told apart is a retryable failure, not a reconnect", async () => {
    const { r, a, s } = await run(403, 500);
    expect(r.status).toBe(502);
    expect(await r.json()).toMatchObject({ code: "UNVERIFIED" });
    expect(s.store.get("t1", a.id)?.status).toBe("active");
  });
});
