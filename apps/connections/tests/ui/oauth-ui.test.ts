import { afterEach, describe, expect, it } from "vitest";
import { ann, root } from "../http/fixture.js";
import { bootUi } from "./fixture.js";

let s: Awaited<ReturnType<typeof bootUi>>;
afterEach(() => s.close());

/** What the page does: ask for the url with the bearer, open it, land on the callback the provider sends back to. */
const walk = async (who: string, query = "") => {
  const r = await s.get(`/v1/oauth/github/start-url${query}`, who);
  const { url } = (await r.json()) as { url: string };
  const consent = await fetch(url, { redirect: "manual" });
  const back = new URL(consent.headers.get("location") ?? "");
  return { start: r, url, callback: () => s.get(back.pathname + back.search) };
};

describe("start-url", () => {
  it("needs the bearer and answers json, not a redirect", async () => {
    s = await bootUi();
    expect((await s.get("/v1/oauth/github/start-url")).status).toBe(401);
    const r = await s.get("/v1/oauth/github/start-url?label=mine", ann);
    expect(r.status).toBe(200);
    const { url } = (await r.json()) as { url: string };
    expect(new URL(url).searchParams.get("client_id")).toBe("cid");
    expect(new URL(url).searchParams.get("state")).toBeTruthy();
  });
  it("passes the widening reason, unknown provider and bad input through", async () => {
    s = await bootUi();
    const wide = await s.get("/v1/oauth/github/start-url?dataZone=company", ann);
    expect(wide.status).toBe(403);
    expect(((await wide.json()) as { error: string }).error).toContain("tenant admin");
    expect((await s.get("/v1/oauth/slack/start-url", ann)).status).toBe(404);
    expect((await s.get("/v1/oauth/github/start-url?access=everyone", ann)).status).toBe(400);
  });
});

describe("callback with the UI redirect on", () => {
  it("redirects to /?connected=id after creating the account", async () => {
    s = await bootUi();
    const r = await (await walk(ann, "?label=mine")).callback();
    expect(r.status).toBe(302);
    const id = s.store.listVisible({ user: "ann", tenant: "t1" })[0]?.id;
    expect(r.headers.get("location")).toBe(`/?connected=${id}`);
  });
  it("redirects a refusal to /?oauth_error=reason and creates nothing", async () => {
    s = await bootUi({ deny: true });
    const r = await (await walk(root)).callback();
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toBe("/?oauth_error=provider+refused%3A+access_denied");
    expect(s.store.listVisible({ user: "root", tenant: "t1" })).toEqual([]);
  });
  it("keeps the json 201 when no redirect is configured", async () => {
    s = await bootUi({ redirect: undefined });
    const r = await (await walk(ann)).callback();
    expect(r.status).toBe(201);
    expect(((await r.json()) as { owner: string }).owner).toBe("ann");
  });
});
