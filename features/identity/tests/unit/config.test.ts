import { describe, expect, it } from "vitest";
import { createIdentity, type IdentityConfig, migrateDatabase } from "../../src/index.js";
import { openDb } from "../support/db.js";
import { SECRET } from "../support/server.js";

const good = (): IdentityConfig => ({ baseUrl: "http://localhost:8787", secret: SECRET, database: openDb(), resource: "http://localhost:8787/mcp" });

// Tables are made first, as a host would, so better-auth's start-up schema check has nothing to complain about.
const fieldOf = async (cfg: IdentityConfig): Promise<unknown> => {
  try {
    await migrateDatabase(cfg);
    createIdentity(cfg);
  } catch (error) {
    return { code: (error as { code?: unknown }).code, field: (error as { field?: unknown }).field };
  }
  return "accepted";
};

describe("config", () => {
  it("rule 13: a valid config builds the instance, routes, port and helpers", async () => {
    const cfg = good();
    await migrateDatabase(cfg);
    const identity = createIdentity(cfg);
    for (const key of ["auth", "routes", "port", "migrate", "protect", "revokeClient", "consentView", "csrf"]) expect(identity).toHaveProperty(key);
  });

  it.each([
    ["baseUrl", { baseUrl: "not a url" }],
    ["baseUrl", { baseUrl: "ftp://brain.example.com" }],
    ["baseUrl", { baseUrl: "http://brain.example.com" }],
    ["secret", { secret: "short" }],
    ["resource", { resource: "/mcp" }],
    ["resource", { resource: "ws://localhost:8787/mcp" }],
    ["resource", { resource: "http://brain.example.com/mcp" }],
    ["resource", { resource: "https://user:pw@brain.example.com/mcp" }],
    ["serverName", { serverName: "has space" }],
    ["accessTokenTtlSeconds", { accessTokenTtlSeconds: 0 }],
    ["accessTokenTtlSeconds", { accessTokenTtlSeconds: 901 }],
    ["accessTokenTtlSeconds", { accessTokenTtlSeconds: 1.5 }],
  ] as const)("rule 13: a bad %s raises BAD_INPUT naming it (%o)", async (field, patch) => {
    expect(await fieldOf({ ...good(), ...patch })).toEqual({ code: "BAD_INPUT", field });
  });

  it("rule 5: a static web client with an http redirect is BAD_INPUT naming the redirect", async () => {
    const clients = [{ id: "web", name: "Web", redirectUris: ["http://app.example.com/cb"] }];
    expect(await fieldOf({ ...good(), clients })).toEqual({ code: "BAD_INPUT", field: "clients[0].redirectUris[0]" });
  });

  it("rule 2: https on any host and http on localhost are both accepted", async () => {
    expect(await fieldOf({ ...good(), baseUrl: "https://brain.example.com", resource: "https://brain.example.com/mcp" })).toBe("accepted");
    expect(await fieldOf({ ...good(), baseUrl: "http://127.0.0.1:9000", resource: "http://127.0.0.1:9000/mcp" })).toBe("accepted");
  });

  it("rule 13: serverName defaults to company-brain and a hyphenated lowercase name is accepted", async () => {
    expect(await fieldOf({ ...good(), serverName: "acme-brain" })).toBe("accepted");
    expect(await fieldOf(good())).toBe("accepted");
  });
});
