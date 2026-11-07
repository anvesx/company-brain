import { afterEach, describe, expect, it } from "vitest";
import { call, data, headers, initialize, open } from "../../../../services/brain-mcp/tests/support/client.js";
import { bootBrain, connect, type Env, signUp } from "../identity/boot.js";

// The install guide on /connections points MCP clients at `${base}/mcp`. Before 2026-11-07 the brain app never
// mounted the MCP server, so that URL was a 404. These drive the mounted server with the token identity issues.
let env: Env | undefined;
afterEach(async () => {
  await env?.close();
  env = undefined;
});

describe("/mcp on the brain app", () => {
  it("refuses a request with no bearer with identity's 401 challenge, never a 404", async () => {
    env = await bootBrain();
    const res = await fetch(`${env.base}/mcp`, { method: "POST", headers: headers(), body: JSON.stringify(initialize()) });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("Bearer");
  });

  it("completes the initialize handshake for the bearer token the OAuth flow issued", async () => {
    env = await bootBrain();
    const ann = await signUp(env, "Ann");
    const { tokens } = await connect(ann.browser, env.base, `${env.base}/mcp`);
    const res = await fetch(`${env.base}/mcp`, { method: "POST", headers: headers(tokens.access_token), body: JSON.stringify(initialize()) });
    expect(res.status).toBe(200);
    expect(res.headers.get("mcp-session-id")).toMatch(/\S/);
    const text = await res.text(); // SSE or JSON, by what the server negotiates
    expect(text).toContain('"serverInfo"');
  });

  it("lists the four brain tools and answers brain.connectors with the caller's own linked accounts", async () => {
    env = await bootBrain();
    const ann = await signUp(env, "Ann");
    const { tokens } = await connect(ann.browser, env.base, `${env.base}/mcp`);
    const { client, transport } = await open(`${env.base}/mcp`, tokens.access_token);
    try {
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name).sort()).toEqual(["brain.connectors", "brain.graph", "brain.node", "brain.search"]);
      // Ann linked nothing: the row behind her MCP token is a credential account, which the tool leaves out.
      const { providers } = await data<{ providers: unknown[] }>(client, "brain.connectors");
      expect(providers).toEqual([]);
      const search = await call(client, "brain.search", { query: "anything" });
      expect(search.isError).toBeFalsy();
    } finally {
      await transport.close();
    }
  });
});
