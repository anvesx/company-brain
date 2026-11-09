import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { call, headers, initialize, open, tokenShapes } from "../support/client.js";
import { seedOrg } from "../support/graph.js";
import { type BrainEnv, bootBrain } from "../support/server.js";
import { linkAccount, type Member, member } from "../support/users.js";

// Rule 6: no token ever leaves the server. Ada has a linked GitHub account whose stored tokens are JWT- and
// base64url-shaped; every tool output, every error result and the 401 body are scanned for them.
const ACCESS = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJnaXRodWItYWRhIn0.Z2l0aHViLWFjY2Vzcy1zaWduYXR1cmU";
const REFRESH = "ghr_ZmFrZXJlZnJlc2h0b2tlbnZhbHVlZm9ydGVzdGluZ29ubHk0Mg";
let env: BrainEnv;
let ada: Member;

beforeAll(async () => {
  env = await bootBrain();
  ada = await member(env, "Ada");
  seedOrg(env.store, ada.tenant, ada.userId, "u-bob");
  linkAccount(env, ada.userId, "github", { access: ACCESS, refresh: REFRESH });
});
afterAll(async () => env?.close());

describe("no token in any output", () => {
  it("is true for every tool, every error result and the resource", async () => {
    const { client } = await open(env.url, ada.token);
    const outputs = [
      await client.listTools(),
      await call(client, "brain.search", { query: "notes" }),
      await call(client, "brain.search", { query: "" }),
      await call(client, "brain.search", { query: 42 }),
      await call(client, "brain.node", { id: "doc-plan" }),
      await call(client, "brain.node", { id: "doc-secret" }),
      await call(client, "brain.graph", {}),
      await call(client, "brain.connectors", {}),
      await client.readResource({ uri: "brain://node/doc-plan" }),
    ];
    await client.close();
    const text = JSON.stringify(outputs);
    expect(text).toContain("github");
    for (const secret of [ACCESS, REFRESH, ada.token]) expect(text).not.toContain(secret);
    expect(tokenShapes(text, [ada.userId, ada.tenant])).toEqual([]);
  });

  it("is true for the 401 answer", async () => {
    const res = await fetch(env.url, { method: "POST", headers: headers(`${ada.token}x`), body: JSON.stringify(initialize()) });
    expect(res.status).toBe(401);
    const text = `${await res.text()} ${res.headers.get("www-authenticate")}`;
    expect(text).not.toContain(ada.token);
    expect(tokenShapes(text, [])).toEqual([]);
  });
});
