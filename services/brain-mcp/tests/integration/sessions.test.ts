import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { data, headers, initialize, open } from "../support/client.js";
import { seedOrg } from "../support/graph.js";
import { type BrainEnv, bootBrain } from "../support/server.js";
import { colleague, type Member, member } from "../support/users.js";

// Rules 7, 8 and 11: sessions are owner-bound and capped (LRU, 404 once evicted), bodies over 1 MiB are 413,
// and three interleaved clients of two users never see each other's answers. The cap is 3 here so a test can reach it.
const MiB = 1024 * 1024;
let env: BrainEnv;
let ada: Member;
let bob: Member;

beforeAll(async () => {
  env = await bootBrain({ sessions: 3, body: MiB });
  ada = await member(env, "Ada");
  bob = await colleague(env, ada, "Bob");
  seedOrg(env.store, ada.tenant, ada.userId, bob.userId);
});
afterAll(async () => env?.close());

const post = (body: string, token?: string, session?: string) => fetch(env.url, { method: "POST", headers: headers(token, session), body });
const ping = (token: string, session: string) => post(JSON.stringify({ jsonrpc: "2.0", id: 9, method: "tools/list" }), token, session);
const search = async (c: Awaited<ReturnType<typeof open>>["client"], query: string) =>
  (await data<{ nodes: { id: string }[] }>(c, "brain.search", { query, limit: 100 })).nodes.map((n) => n.id);

describe("sessions", () => {
  it("keeps three interleaved clients of two users apart", async () => {
    const [a1, a2, b1] = await Promise.all([open(env.url, ada.token), open(env.url, ada.token), open(env.url, bob.token)]);
    const ids = new Set([a1, a2, b1].map((x) => x.transport.sessionId));
    expect(ids.size).toBe(3);
    const rounds = await Promise.all([search(a1.client, "Quarterly"), search(b1.client, "Quarterly"), search(a2.client, "Quarterly")]);
    expect(rounds).toEqual([["doc-plan"], ["doc-secret"], ["doc-plan"]]);
    await Promise.all([a1, a2, b1].map((x) => x.client.close()));
  });

  it("answers another user's session id with 404, as if it did not exist", async () => {
    const mine = await open(env.url, bob.token);
    expect((await ping(ada.token, String(mine.transport.sessionId))).status).toBe(404);
    expect((await ping(bob.token, String(mine.transport.sessionId))).status).toBe(200);
    await mine.client.close();
  });

  it("evicts the least recently used session past the cap, and the evicted id is 404", async () => {
    const first = await open(env.url, ada.token);
    for (const token of [ada.token, bob.token, bob.token]) await open(env.url, token);
    const res = await ping(ada.token, String(first.transport.sessionId));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ jsonrpc: "2.0", error: { code: -32001 } });
  });

  it("closes a session on DELETE, after which its id is 404", async () => {
    const s = await open(env.url, ada.token);
    const id = String(s.transport.sessionId);
    await s.transport.terminateSession();
    expect((await ping(ada.token, id)).status).toBe(404);
  });

  it("answers a non-initialize request without a session id with 400", async () => {
    expect((await post(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }), ada.token)).status).toBe(400);
  });

  it("answers a body over 1 MiB with 413, checks the token first, and accepts exactly 1 MiB", async () => {
    const padded = (size: number) => JSON.stringify(initialize()).padEnd(size, " ");
    expect((await post(padded(MiB + 1), ada.token)).status).toBe(413);
    expect((await post(padded(MiB + 1))).status).toBe(401);
    expect((await post(padded(MiB), ada.token)).status).toBe(200);
  });
});
