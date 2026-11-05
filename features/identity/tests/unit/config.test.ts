import { describe, expect, it } from "vitest";
import { createIdentity, type IdentityConfig } from "../../src/index.js";
import { openDb } from "../support/db.js";
import { SECRET } from "../support/server.js";

const good = (): IdentityConfig => ({ baseUrl: "http://localhost:8787", secret: SECRET, database: openDb(), resource: "http://localhost:8787/mcp" });

const fieldOf = (cfg: IdentityConfig): unknown => {
  try {
    createIdentity(cfg);
  } catch (error) {
    return { code: (error as { code?: unknown }).code, field: (error as { field?: unknown }).field };
  }
  return "accepted";
};

describe("config", () => {
  it("rule 13: a valid config builds the instance, routes, port and helpers", () => {
    const identity = createIdentity(good());
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
  ] as const)("rule 13: a bad %s raises BAD_INPUT naming it (%o)", (field, patch) => {
    expect(fieldOf({ ...good(), ...patch })).toEqual({ code: "BAD_INPUT", field });
  });

  it("rule 5: a static web client with an http redirect is BAD_INPUT naming the redirect", () => {
    const clients = [{ id: "web", name: "Web", redirectUris: ["http://app.example.com/cb"] }];
    expect(fieldOf({ ...good(), clients })).toEqual({ code: "BAD_INPUT", field: "clients[0].redirectUris[0]" });
  });

  it("rule 2: https on any host and http on localhost are both accepted", () => {
    expect(fieldOf({ ...good(), baseUrl: "https://brain.example.com", resource: "https://brain.example.com/mcp" })).toBe("accepted");
    expect(fieldOf({ ...good(), baseUrl: "http://127.0.0.1:9000", resource: "http://127.0.0.1:9000/mcp" })).toBe("accepted");
  });

  it("rule 13: serverName defaults to company-brain and a hyphenated lowercase name is accepted", () => {
    expect(fieldOf({ ...good(), serverName: "acme-brain" })).toBe("accepted");
    expect(fieldOf(good())).toBe("accepted");
  });
});
