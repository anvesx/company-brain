import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { call, open } from "../../support/client.js";
import { type BrainEnv, bootBrain } from "../../support/server.js";
import { type Member, member } from "../../support/users.js";

// Rule 8: every failure carries structuredContent { code, message }. A value the schema refuses used to come back
// from the SDK as bare text ("MCP error -32602 ..."), with no code a client could act on.
let env: BrainEnv;
let ada: Member;
beforeAll(async () => {
  env = await bootBrain();
  ada = await member(env, "Ada");
});
afterAll(async () => env?.close());

const BAD: [string, Record<string, unknown>][] = [
  ["brain.search", { query: "a", limit: 1e9 }],
  ["brain.search", { query: "a", limit: -1 }],
  ["brain.search", { query: "a", limit: 0 }],
  ["brain.search", { query: "a", limit: 1.5 }],
  ["brain.search", { query: "x".repeat(513) }],
  ["brain.search", { query: 42 }],
  ["brain.search", {}],
  ["brain.search", { query: "a", kinds: ["secret"] }],
  ["brain.search", { query: "a", kinds: "document" }],
  ["brain.search", { query: "\u0000abc" }],
  ["brain.search", { query: "a", cursor: "not a number" }],
  ["brain.node", { id: "" }],
  ["brain.node", { id: "x".repeat(513) }],
  ["brain.node", { id: 7 }],
  ["brain.node", { id: "a", asOf: "yesterday" }],
  ["brain.graph", { limit: 20_001 }],
  ["brain.graph", { limit: "5" }],
  ["brain.graph", { cursor: 5 }],
];

describe("input failures", () => {
  it.each(BAD)("%s %j returns INVALID_ARGUMENT with structuredContent", async (name, args) => {
    const { client } = await open(env.url, ada.token);
    const r = await call(client, name, args);
    expect(r.isError).toBe(true);
    expect(r.structuredContent).toMatchObject({ code: "INVALID_ARGUMENT" });
    expect(typeof r.structuredContent?.["message"]).toBe("string");
    await client.close();
  });

  it("names the offending field and never echoes a long value", async () => {
    const { client } = await open(env.url, ada.token);
    const r = await call(client, "brain.search", { query: "x".repeat(513) });
    expect(String(r.structuredContent?.["message"])).toMatch(/query/);
    expect(String(r.structuredContent?.["message"]).length).toBeLessThan(300);
    await client.close();
  });

  it("an unknown tool is INVALID_ARGUMENT with structuredContent", async () => {
    const { client } = await open(env.url, ada.token);
    const r = await call(client, "brain.nope", {});
    expect(r.isError).toBe(true);
    expect(r.structuredContent).toMatchObject({ code: "INVALID_ARGUMENT", message: "unknown tool: brain.nope" });
    await client.close();
  });

  it("good input still works after the change", async () => {
    const { client } = await open(env.url, ada.token);
    const r = await call(client, "brain.graph", { limit: 20_000 });
    expect(r.isError).toBeFalsy();
    await client.close();
  });
});
