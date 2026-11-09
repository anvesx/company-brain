import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { call, headers, initialize, open } from "../support/client.js";
import { node, seedOrg } from "../support/graph.js";
import { type BrainEnv, bootBrain } from "../support/server.js";
import { colleague, type Member, member } from "../support/users.js";

// Rule 1: no or bad credential is 401 with the identity challenge, never 403.
// Rule 2: a caller sees only what visibility rule 1 grants, through every tool and the resource.
let env: BrainEnv;
let ada: Member;
let bob: Member;
let carol: Member;
let asAda: Client;

beforeAll(async () => {
  env = await bootBrain();
  ada = await member(env, "Ada");
  bob = await colleague(env, ada, "Bob");
  carol = await member(env, "Carol");
  seedOrg(env.store, ada.tenant, ada.userId, bob.userId);
  seedOrg(env.store, carol.tenant, carol.userId, "u-other");
  node(env.store, carol.tenant, "doc-carol", "document", "Quarterly carol only");
  ({ client: asAda } = await open(env.url, ada.token));
});
afterAll(async () => {
  await asAda?.close();
  await env?.close();
});

const post = (token?: string) => fetch(env.url, { method: "POST", headers: headers(token), body: JSON.stringify(initialize()) });

describe("authentication", () => {
  it("answers no token with 401 and the protected-resource challenge", async () => {
    const res = await post();
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toMatch(/^Bearer\b.*resource_metadata="[^"]*\/\.well-known\/oauth-protected-resource\/mcp"/);
  });

  it("answers a forged or malformed token with 401, never 403", async () => {
    for (const token of ["not-a-jwt", `${ada.token.slice(0, -4)}AAAA`]) {
      const res = await post(token);
      expect(res.status).toBe(401);
      expect(res.headers.get("www-authenticate")).toMatch(/^Bearer\b/);
    }
  });
});

describe("visibility through every tool", () => {
  const ids = (x: unknown) => JSON.stringify(x);

  it("Ada never sees Bob's document, though they share an organisation", async () => {
    expect(ids(await call(asAda, "brain.search", { query: "Quarterly", limit: 100 }))).not.toContain("doc-secret");
    expect(ids(await call(asAda, "brain.graph", {}))).not.toContain("doc-secret");
    expect((await call(asAda, "brain.node", { id: "doc-secret" })).structuredContent).toMatchObject({ code: "NOT_FOUND" });
    await expect(asAda.readResource({ uri: "brain://node/doc-secret" })).rejects.toThrow();
  });

  it("Bob sees his document and not Ada's team documents", async () => {
    const { client } = await open(env.url, bob.token);
    const found = ids(await call(client, "brain.search", { query: "Quarterly", limit: 100 }));
    expect(found).toContain("doc-secret");
    expect(found).not.toContain("doc-plan");
    expect((await call(client, "brain.node", { id: "doc-plan" })).structuredContent).toMatchObject({ code: "NOT_FOUND" });
    await client.close();
  });

  it("another organisation's graph is invisible even where ids collide", async () => {
    const all = ids([await call(asAda, "brain.search", { query: "carol", limit: 100 }), await call(asAda, "brain.graph", {})]);
    expect(all).not.toContain("doc-carol");
    expect(all).not.toContain(carol.userId);
    expect((await call(asAda, "brain.node", { id: "doc-carol" })).structuredContent).toMatchObject({ code: "NOT_FOUND" });
  });
});
