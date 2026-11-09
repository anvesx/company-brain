import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { open } from "../../support/client.js";
import { type BrainEnv, bootBrain } from "../../support/server.js";
import { type Member, member } from "../../support/users.js";

// What an agent reads before it calls anything: server identity, tool list, descriptions, annotations.
let env: BrainEnv;
let ada: Member;
let client: Client;
beforeAll(async () => {
  env = await bootBrain();
  ada = await member(env, "Ada");
  ({ client } = await open(env.url, ada.token));
});
afterAll(async () => {
  await client?.close();
  await env?.close();
});

type Props = Record<string, { description?: string }>;
const tool = async (name: string) => (await client.listTools()).tools.find((t) => t.name === name)!;
const described = async (name: string) =>
  Object.fromEntries(Object.entries((await tool(name)).inputSchema.properties as Props).map(([k, v]) => [k, v.description]));

describe("server identity (build.ts)", () => {
  it("announces its name, version and instructions", () => {
    expect(client.getServerVersion()).toMatchObject({ name: "company-brain", version: "0.1.0" });
    expect(client.getInstructions()).toBe("Read-only access to the company graph, limited to what the signed-in user may see.");
  });
});

describe("tool descriptions and annotations (register.ts)", () => {
  it.each([
    ["brain.search", "Find nodes by title."],
    ["brain.node", "One node and its visible edges."],
    ["brain.graph", "A page of the visible graph."],
    ["brain.connectors", "The connectors linked to the caller."],
  ])("%s is described exactly and marked read-only, closed-world", async (name, description) => {
    const t = await tool(name);
    expect(t.description).toBe(description);
    expect(t.annotations).toEqual({ readOnlyHint: true, openWorldHint: false });
  });
});

describe("input field descriptions (schema.ts)", () => {
  it("brain.search", async () => {
    expect(await described("brain.search")).toEqual({
      query: "Text to find in node titles (case-insensitive for ASCII).",
      kinds: "Only nodes of these kinds.",
      limit: "Most results to return.",
      cursor: "The `next` value of the previous page.",
    });
  });
  it("brain.node", async () => {
    expect(await described("brain.node")).toEqual({
      id: "Node id.",
      asOf: "Read the graph as it was at this time (epoch milliseconds).",
    });
  });
  it("brain.graph", async () => {
    expect(await described("brain.graph")).toEqual({ cursor: "The `next` value of the previous page.", limit: "Most nodes per page." });
  });
  it("brain.connectors takes no fields", async () => {
    expect(await described("brain.connectors")).toEqual({});
  });
});
