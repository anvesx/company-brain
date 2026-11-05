import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { json } from "../support/http.js";
import { discover, type Meta } from "../support/oauth.js";
import { boot, type Env } from "../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const challenge = async (): Promise<string> => {
  const res = await fetch(`${env.base}/mcp`, { method: "POST" });
  expect(res.status).toBe(401);
  const header = String(res.headers.get("www-authenticate"));
  const found = /^Bearer\b.*resource_metadata="([^"]+)"/.exec(header);
  expect(found, header).not.toBeNull();
  return String(found?.[1]);
};

describe("discovery", () => {
  it("rule 4: an unauthenticated MCP call is 401 naming the resource metadata URL", async () => {
    expect(await challenge()).toMatch(/^http:\/\/localhost:\d+\/\.well-known\/oauth-protected-resource/);
  });

  it("rule 4: the resource metadata names the canonical resource and the authorization server", async () => {
    const doc = await json<{ resource: string; authorization_servers: string[] }>(await fetch(await challenge()));
    const meta = await discover(env.base);
    expect(doc.resource).toBe(env.config.resource);
    expect(doc.authorization_servers).toContain(meta.issuer);
  });

  it("rule 4: the server metadata lists the authorize, token, registration and key set endpoints", async () => {
    const meta = await json<Meta & { code_challenge_methods_supported: string[] }>(await fetch(`${env.base}/.well-known/oauth-authorization-server`));
    expect(meta.issuer.startsWith(env.base)).toBe(true);
    for (const key of ["authorization_endpoint", "token_endpoint", "registration_endpoint", "jwks_uri"] as const) {
      expect(meta[key], key).toMatch(new RegExp(`^${env.base}/`));
    }
    expect(meta.code_challenge_methods_supported).toEqual(["S256"]);
  });

  it("rule 4: the server metadata is also served at the issuer path suffix (RFC 8414 section 3)", async () => {
    const root = await discover(env.base);
    const suffix = new URL(root.issuer).pathname;
    const res = await fetch(`${env.base}/.well-known/oauth-authorization-server${suffix === "/" ? "" : suffix}`);
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual(root);
  });

  it("rule 4: the key set endpoint publishes at least one public signing key", async () => {
    const { keys } = await json<{ keys: { kid?: string; d?: string }[] }>(await fetch((await discover(env.base)).jwks_uri));
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(key.d, "no private part").toBeUndefined();
  });
});
