import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { call, open } from "../../support/client.js";
import { seedOrg } from "../../support/graph.js";
import { type BrainEnv, bootBrain } from "../../support/server.js";
import { type Member, member } from "../../support/users.js";

// brain.search cursor: only 1 to 15 digits (a previous page's `next`) is accepted; the rule is /^\d{1,15}$/.
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

const search = (cursor: string) => call(client, "brain.search", { query: "budget", cursor });

describe("brain.search cursor shape", () => {
  it.each([
    ["trailing letter", "12a"],
    ["leading letter", "a12"],
    ["empty", ""],
    ["16 digits", "1234567890123456"],
  ])("rejects %s with the schema's message", async (_, cursor) => {
    const r = await search(cursor);
    expect(r.isError).toBe(true);
    expect(r.structuredContent).toMatchObject({ code: "INVALID_ARGUMENT" });
    // The message names the field and the regex message: it tells the agent where a cursor comes from.
    expect((r.structuredContent as { message: string }).message).toBe("cursor: must be the `next` of a previous page");
  });

  it("accepts a plain digit string, 15 digits included", async () => {
    for (const cursor of ["1234567890", "123456789012345"]) expect((await search(cursor)).isError, cursor).toBeUndefined();
  });

  it("follows a real `next` from a first page", async () => {
    const first = await call(client, "brain.search", { query: "budget", limit: 1 });
    const next = first.structuredContent?.next as string;
    expect(next).toMatch(/^\d+$/);
    const second = await call(client, "brain.search", { query: "budget", limit: 1, cursor: next });
    expect(second.isError).toBeUndefined();
  });
});
