import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { open } from "../../support/client.js";
import { seedOrg } from "../../support/graph.js";
import { type BrainEnv, bootBrain } from "../../support/server.js";
import { type Member, member } from "../../support/users.js";

// The brain://node/{id} resource: how it is listed, what it returns, and how its failures map to JSON-RPC codes.
let env: BrainEnv;
let ada: Member;
beforeAll(async () => {
  env = await bootBrain();
  ada = await member(env, "Ada");
  seedOrg(env.store, ada.tenant, ada.userId, "u-bob");
});
afterAll(async () => env?.close());

const failure = async (uri: string) => {
  const { client } = await open(env.url, ada.token);
  try {
    await client.readResource({ uri });
  } catch (e) {
    return e as McpError;
  } finally {
    await client.close();
  }
  throw new Error("read did not fail");
};

describe("node resource", () => {
  it("is listed as a template with its name, title, description and mime type", async () => {
    const { client } = await open(env.url, ada.token);
    const { resourceTemplates } = await client.listResourceTemplates();
    await client.close();
    expect(resourceTemplates).toEqual([
      {
        uriTemplate: "brain://node/{id}",
        name: "node",
        title: "Graph node",
        description: "A node the caller may see, with its visible edges.",
        mimeType: "application/json",
      },
    ]);
  });

  it("reads a visible node, echoing the requested uri and the json mime type", async () => {
    const { client } = await open(env.url, ada.token);
    const r = await client.readResource({ uri: "brain://node/doc-plan" });
    await client.close();
    expect(r.contents[0]).toMatchObject({ uri: "brain://node/doc-plan", mimeType: "application/json" });
    expect(JSON.parse((r.contents[0] as { text: string }).text)).toMatchObject({ id: "doc-plan", title: "Quarterly plan final" });
  });

  it("a hidden node is InvalidParams (-32602) with the tool's NOT_FOUND wording", async () => {
    const e = await failure("brain://node/doc-secret");
    expect(e.code).toBe(ErrorCode.InvalidParams);
    expect(e.message).toContain("no node doc-secret");
  });

  it("a store failure is InternalError (-32603) and leaks nothing", async () => {
    const own = await bootBrain(); // its own server: this test closes the graph file under it
    try {
      const u = await member(own, "Eve");
      seedOrg(own.store, u.tenant, u.userId, "u-bob");
      const { client } = await open(own.url, u.token);
      own.store.close(); // a real failure: every read now throws GraphError CLOSED
      const e = await client.readResource({ uri: "brain://node/doc-plan" }).catch((x) => x as McpError);
      await client.close();
      expect(e).toBeInstanceOf(McpError);
      expect((e as McpError).code).toBe(ErrorCode.InternalError);
      expect((e as McpError).message).toContain("internal error");
    } finally {
      await own.close().catch(() => undefined); // close() closes the store a second time and throws; the server is already down
    }
  });
});
