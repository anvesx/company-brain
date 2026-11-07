import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { headers, initialize } from "../../support/client.js";
import { type BrainEnv, bootBrain } from "../../support/server.js";
import { type Member, member } from "../../support/users.js";

// Booted with NO limits: the defaults must be a 1 MiB body cap (and a working session cap).
const MiB = 1024 * 1024;
let env: BrainEnv;
let ada: Member;
beforeAll(async () => {
  env = await bootBrain();
  ada = await member(env, "Ada");
});
afterAll(async () => env?.close());

const padded = (size: number) => JSON.stringify(initialize()).padEnd(size, " ");
const post = (body: string) => fetch(env.url, { method: "POST", headers: headers(ada.token), body });

describe("default limits", () => {
  it("rejects a body one byte over 1 MiB with 413", async () => {
    expect((await post(padded(MiB + 1))).status).toBe(413);
  });

  it("accepts a body just under 1 MiB, so the default cap is not smaller", async () => {
    expect((await post(padded(MiB - 100))).status).toBe(200);
  });

  it("opens many sessions without evicting early ones (default session cap is large)", async () => {
    const first = await post(padded(200));
    const sid = first.headers.get("mcp-session-id") ?? "";
    for (let i = 0; i < 12; i++) await post(padded(200));
    const ping = await fetch(env.url, {
      method: "POST",
      headers: headers(ada.token, sid),
      body: JSON.stringify({ jsonrpc: "2.0", id: 5, method: "tools/list" }),
    });
    expect(ping.status).toBe(200);
  });
});
