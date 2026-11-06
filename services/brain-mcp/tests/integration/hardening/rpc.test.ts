import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { headers, initialize } from "../../support/client.js";
import { type BrainEnv, bootBrain } from "../../support/server.js";
import { type Member, member } from "../../support/users.js";

// Raw JSON-RPC cases the SDK client cannot send: a malformed envelope, and a browser-style preflight.
let env: BrainEnv;
let ada: Member;
beforeAll(async () => {
  env = await bootBrain();
  ada = await member(env, "Ada");
});
afterAll(async () => env?.close());

describe("raw JSON-RPC", () => {
  // `params` is sent as given: a call with no `arguments` key at all is a distinct case from `arguments: undefined`.
  const rpc = async (args: unknown, params: object | "omit" = { name: "brain.graph", arguments: args }) => {
    const init = await fetch(env.url, { method: "POST", headers: headers(ada.token), body: JSON.stringify(initialize()) });
    const sid = init.headers.get("mcp-session-id") ?? "";
    await init.text();
    const res = await fetch(env.url, {
      method: "POST",
      headers: headers(ada.token, sid),
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", ...(params === "omit" ? {} : { params }) }),
    });
    return res.text();
  };

  it("string `arguments` is a protocol error -32602, not -32603", async () => {
    expect(await rpc("limit=5")).toMatch(/"code":-32602/);
  });

  it.each([
    ["no `params` at all", "omit" as const],
    ["`params` without `name`", {}],
  ])("%s is a protocol error -32602 with no zod dump", async (_, params) => {
    const out = await rpc(undefined, params);
    expect(out).toMatch(/"code":-32602/);
    expect(out).not.toMatch(/"path"/);
  });

  it("a call without `arguments` is spec-legal: brain.connectors answers a result, not -32603", async () => {
    const out = await rpc(undefined, { name: "brain.connectors" });
    expect(out).toContain('"providers":[]');
    expect(out).not.toMatch(/"error"/);
  });

  it("CORS preflight is refused with 401 and no CORS headers: browser MCP clients are not supported", async () => {
    const res = await fetch(env.url, { method: "OPTIONS", headers: { origin: "https://app.example", "access-control-request-method": "POST" } });
    expect(res.status).toBe(401);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
