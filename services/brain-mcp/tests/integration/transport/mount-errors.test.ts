import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { headers, initialize } from "../../support/client.js";
import { type BrainEnv, bootBrain } from "../../support/server.js";
import { type Member, member } from "../../support/users.js";

// The JSON-RPC error bodies /mcp answers itself (not the SDK). Codes and messages are what clients branch on.
let env: BrainEnv;
let ada: Member;
beforeAll(async () => {
  env = await bootBrain({ sessions: 10, body: 1024 });
  ada = await member(env, "Ada");
});
afterAll(async () => env?.close());

const post = (body: string, session?: string) => fetch(env.url, { method: "POST", headers: headers(ada.token, session), body });
const err = async (res: Response) => ({ status: res.status, error: ((await res.json()) as { error: object }).error });

describe("mount error bodies", () => {
  it("413 carries code -32600 and the exact message, and the connection stays usable (body was drained)", async () => {
    const big = await post(JSON.stringify(initialize()).padEnd(50_000, " "));
    expect(await err(big)).toEqual({ status: 413, error: { code: -32600, message: "request body too large" } });
    // A follow-up request must still be served: an undrained upload would wedge or reset the socket.
    expect((await post(JSON.stringify(initialize()))).status).toBe(200);
  });

  it("invalid JSON is 400 / -32700 'parse error'", async () => {
    expect(await err(await post("{not json"))).toEqual({ status: 400, error: { code: -32700, message: "parse error" } });
  });

  it("a non-initialize POST without a session id is 400 / -32600 with the header message", async () => {
    const res = await post(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }));
    expect(await err(res)).toEqual({ status: 400, error: { code: -32600, message: "Mcp-Session-Id header is required" } });
  });

  it("a batch of two non-initialize requests is refused the same way", async () => {
    const one = { jsonrpc: "2.0", id: 1, method: "tools/list" };
    expect((await err(await post(JSON.stringify([one, { ...one, id: 2 }])))).error).toMatchObject({ message: "Mcp-Session-Id header is required" });
  });

  it("a batch holding one initialize passes the mount gate; the transport then refuses it (not the header message)", async () => {
    const res = await post(JSON.stringify([initialize(), { jsonrpc: "2.0", id: 2, method: "tools/list" }]));
    expect(await err(res)).toEqual({ status: 400, error: { code: -32600, message: "Invalid Request: Only one initialization request is allowed" } });
  });

  it("an unknown session id is 404 / -32001 'session not found'", async () => {
    const res = await post(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }), "no-such-session");
    expect(await err(res)).toEqual({ status: 404, error: { code: -32001, message: "session not found" } });
  });

  it("GET without a session id is the header error, never a parse error", async () => {
    const res = await fetch(env.url, { method: "GET", headers: headers(ada.token) });
    expect(await err(res)).toEqual({ status: 400, error: { code: -32600, message: "Mcp-Session-Id header is required" } });
  });

  it("DELETE without a session id ignores its body: header error, even if the body is an initialize", async () => {
    const res = await fetch(env.url, { method: "DELETE", headers: headers(ada.token), body: JSON.stringify(initialize()) });
    expect(await err(res)).toEqual({ status: 400, error: { code: -32600, message: "Mcp-Session-Id header is required" } });
  });
});
