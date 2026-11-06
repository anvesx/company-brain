import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { headers, initialize } from "../../support/client.js";
import { type BrainEnv, bootBrain } from "../../support/server.js";
import { type Member, member } from "../../support/users.js";

// /mcp is for agent clients: a bearer token, nothing else. A browser session cookie rides along on any
// cross-site request, so accepting it would let a hostile page drive the graph as the signed-in user.
let env: BrainEnv;
let ada: Member;
const post = (extra: Record<string, string>) => fetch(env.url, { method: "POST", headers: { ...headers(), ...extra }, body: JSON.stringify(initialize()) });

beforeAll(async () => {
  env = await bootBrain();
  ada = await member(env, "Ada");
});
afterAll(async () => env?.close());

describe("/mcp credentials", () => {
  it("refuses a valid session cookie on its own with 401 and the challenge", async () => {
    const res = await post({ cookie: ada.browser.cookie() });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toMatch(/^Bearer resource_metadata=/);
  });

  it("refuses a valid session cookie sent from a hostile origin", async () => {
    const res = await post({ cookie: ada.browser.cookie(), origin: "https://evil.example" });
    expect(res.status).toBe(401);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("ignores the cookie when a bearer token is also present", async () => {
    const res = await post({ cookie: ada.browser.cookie(), authorization: `Bearer ${ada.token}` });
    expect(res.status).toBe(200);
  });

  it("still serves the bearer token alone", async () => {
    expect((await post({ authorization: `Bearer ${ada.token}` })).status).toBe(200);
  });
});
