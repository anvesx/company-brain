import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { headers, initialize } from "../../support/client.js";
import { type BrainEnv, bootBrain } from "../../support/server.js";
import { type Member, member } from "../../support/users.js";

// Where /mcp lives and what an initialize answers with.
let env: BrainEnv;
let ada: Member;
beforeAll(async () => {
  env = await bootBrain();
  ada = await member(env, "Ada");
});
afterAll(async () => env?.close());

const init = (url: string) => fetch(url, { method: "POST", headers: headers(ada.token), body: JSON.stringify(initialize()) });

describe("mount routes", () => {
  it("an initialize answers plain JSON (not an event stream) and opens a session", async () => {
    const res = await init(env.url);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^application\/json/);
    expect(res.headers.get("mcp-session-id")).toBeTruthy();
    expect(await res.json()).toMatchObject({ jsonrpc: "2.0", id: 1, result: { serverInfo: expect.anything() } });
  });

  it("/mcp is the MCP endpoint and a sibling path like /mcpx is not", async () => {
    expect((await init(env.url)).status).toBe(200);
    expect((await init(`${env.url}x`)).status).toBe(404);
  });
});
