import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ToolFailure } from "../../../src/server/errors.js";
import { call, headers, initialize, open } from "../../support/client.js";
import { seedOrg } from "../../support/graph.js";
import { type BrainEnv, bootBrain } from "../../support/server.js";
import { type Member, member } from "../../support/users.js";

// tools/call as a client sees it: result envelope, and the wording of every INVALID_ARGUMENT.
let env: BrainEnv;
let ada: Member;
let client: Client;
beforeAll(async () => {
  env = await bootBrain();
  ada = await member(env, "Ada");
  seedOrg(env.store, ada.tenant, ada.userId, "u-bob");
  ({ client } = await open(env.url, ada.token));
});
afterAll(async () => {
  await client?.close();
  await env?.close();
});

const message = async (name: string, args: Record<string, unknown>) => {
  const r = await call(client, name, args);
  expect(r.isError).toBe(true);
  expect(r.structuredContent).toMatchObject({ code: "INVALID_ARGUMENT" });
  return (r.structuredContent as { message: string }).message;
};

describe("success envelope", () => {
  it("content[0].text is the JSON of structuredContent", async () => {
    const r = await call(client, "brain.search", { query: "quarterly" });
    expect(r.structuredContent?.nodes).toHaveLength(1);
    expect(r.content).toEqual([{ type: "text", text: JSON.stringify(r.structuredContent) }]);
  });
});

describe("INVALID_ARGUMENT wording", () => {
  it("an unknown tool name is cut to its first 100 characters", async () => {
    const name = `${"a".repeat(100)}${"b".repeat(50)}`;
    expect(await message(name, {})).toBe(`unknown tool: ${"a".repeat(100)}`);
  });
  it("names the field and joins several failures with '; '", async () => {
    const m = await message("brain.search", { query: 5, limit: 0 });
    const parts = m.split("; ");
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatch(/^query: /);
    expect(parts[1]).toMatch(/^limit: /);
  });
  it("joins a nested path with '.' (kinds.1)", async () => {
    expect(await message("brain.search", { query: "a", kinds: ["document", "nope"] })).toMatch(/^kinds\.1: /);
  });
  it("is cut to 280 characters when many items fail", async () => {
    const m = await message("brain.search", { query: "a", kinds: Array(30).fill("nope") });
    expect(m).toHaveLength(280);
    expect(m.startsWith("kinds.0: ")).toBe(true);
  });
  it("a tools/call with no params at all is a -32602 protocol error, not a crash or a tool result", async () => {
    const init = await fetch(env.url, { method: "POST", headers: headers(ada.token), body: JSON.stringify(initialize()) });
    const sid = init.headers.get("mcp-session-id") ?? "";
    await init.text();
    const res = await fetch(env.url, {
      method: "POST",
      headers: headers(ada.token, sid),
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call" }),
    });
    expect(await res.text()).toMatch(/"code":-32602/);
  });
});

describe("errors.ts", () => {
  it("a ToolFailure is named, and an unknown code is refused with the code in the message", () => {
    expect(new ToolFailure("NOT_FOUND", "x").name).toBe("ToolFailure");
    expect(() => new ToolFailure("FORBIDDEN" as never, "x")).toThrow("unknown tool failure code: FORBIDDEN");
  });
});
