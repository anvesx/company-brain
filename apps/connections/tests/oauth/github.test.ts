import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeTokenFile } from "../../src/tokens/write-token-file.js";
import { ann, root } from "../http/fixture.js";
import { type Harness, harness, redirect } from "./harness.js";

let h: Harness;
beforeEach(async () => {
  h = await harness();
});
afterEach(() => h.close());

describe("github oauth against the replay provider", () => {
  it("start redirects to the provider with client, redirect and state; callback creates the account", async () => {
    const f = await h.signIn(ann, "github", "?label=mine&access=personal");
    expect(f.start.origin).toBe(h.replay.url);
    expect(f.start.searchParams.get("client_id")).toBe("cid");
    expect(f.start.searchParams.get("redirect_uri")).toBe(redirect("github"));
    const r = await f.callback();
    expect(r.status).toBe(201);
    const text = await r.text();
    expect(text).not.toContain("at_");
    expect(JSON.parse(text)).toMatchObject({ owner: "ann", provider: "github", kind: "oauth", label: "mine", access: "personal", dataZone: "private" });
  });
  it("then lists, patches and deletes over HTTP", async () => {
    const f = await h.signIn(ann, "github");
    const { id } = (await (await f.callback()).json()) as { id: string };
    const list = (await (await h.s.call("GET", "/v1/accounts", ann)).json()) as { accounts: { id: string }[] };
    expect(list.accounts.map((a) => a.id)).toEqual([id]);
    expect((await h.s.call("PATCH", `/v1/accounts/${id}`, ann, { label: "renamed" })).status).toBe(200);
    expect((await h.s.call("DELETE", `/v1/accounts/${id}`, ann)).status).toBe(204);
    expect(await (await h.s.call("GET", "/v1/accounts", ann)).json()).toEqual({ accounts: [] });
  });
  it("feeds the token file with the access token the provider issued", async () => {
    const f = await h.signIn(ann, "github");
    await f.callback();
    const file = join(h.s.dir, "tokens.json");
    writeTokenFile(h.s.store, file);
    const token = (JSON.parse(readFileSync(file, "utf8")) as { ann: { github: string } }).ann.github;
    expect(token).toBe(`at_${f.back.searchParams.get("code")}`);
  });
  it("writes the token file when the callback creates the account", async () => {
    const file = join(h.s.dir, "cb-tokens.json");
    const w = await harness({}, undefined, { tokensFile: file });
    const f = await w.signIn(ann, "github");
    await f.callback();
    const token = (JSON.parse(readFileSync(file, "utf8")) as { ann: { github: string } }).ann.github;
    expect(token).toBe(`at_${f.back.searchParams.get("code")}`);
    await w.close();
  });
  it("refuses a company zone for a non-admin at start, and allows it for an admin", async () => {
    expect((await h.s.call("GET", "/v1/oauth/github/start?dataZone=company", ann)).status).toBe(403);
    expect((await h.s.call("GET", "/v1/oauth/github/start?dataZone=company", root)).status).toBe(302);
  });
});
