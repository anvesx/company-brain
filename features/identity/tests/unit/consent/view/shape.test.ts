import { describe, expect, it } from "vitest";
import { consentView } from "../../../../src/consent/view.js";
import { base, cookie, failureOf, query, world } from "./kit.js";

describe("consentView: what it shows", () => {
  it("shows the stored client, the stored redirect host, the allowed scopes asked for and the organization looked up by id", async () => {
    const w = world();
    expect(await consentView(w.auth, w.adapter, cookie, query(base))).toEqual({
      clientName: "Cursor",
      redirectHost: "app.example",
      scopes: ["read", "write"],
      organization: { id: "o1", name: "Acme" },
    });
    expect(w.queries.find((q) => q.model === "organization")?.where).toEqual([{ field: "id", value: "o1" }]);
    expect(w.queries.find((q) => q.model === "oauthClient")?.where).toEqual([{ field: "clientId", value: "c1" }]);
  });

  it("an unnamed client is shown as 'an app', and no scope parameter asks for no scopes", async () => {
    const w = world({ client: { name: null, redirectUris: ["https://app.example/cb"], scopes: ["read"] } });
    const { scope: _drop, ...noScope } = base;
    const view = await consentView(w.auth, w.adapter, cookie, query(noScope));
    expect([view.clientName, view.scopes]).toEqual(["an app", []]);
  });

  it("scopes the client was not registered for are dropped", async () => {
    const w = world({ client: { name: "C", redirectUris: ["https://app.example/cb"], scopes: ["read"] } });
    expect((await consentView(w.auth, w.adapter, cookie, query({ ...base, scope: "read admin" }))).scopes).toEqual(["read"]);
  });

  it("stored lists read from JSON text, space text, comma text, or a real array", async () => {
    for (const [uris, scopes] of [
      ['["https://app.example/cb"]', '["read","write"]'],
      ["https://app.example/cb", "read write"],
      ["https://other.example/x,https://app.example/cb", "read,write"],
      ["  https://app.example/cb\n", " read \t write\n"],
      [["https://app.example/cb"], ["read", "write"]],
    ] as const) {
      const w = world({ client: { name: "C", redirectUris: uris, scopes } });
      const view = await consentView(w.auth, w.adapter, cookie, query(base));
      expect([view.redirectHost, view.scopes]).toEqual(["app.example", ["read", "write"]]);
    }
  });

  it("a stored list that is JSON but not an array is read as text, and a non-text non-array reads as empty", async () => {
    const asText = world({ client: { name: "C", redirectUris: ["https://app.example/cb"], scopes: '"read"' } });
    expect((await consentView(asText.auth, asText.adapter, cookie, query({ ...base, scope: '"read"' }))).scopes).toEqual(['"read"']);
    const numbers = world({ client: { name: "C", redirectUris: ["https://app.example/cb"], scopes: 7 } });
    expect((await consentView(numbers.auth, numbers.adapter, cookie, query(base))).scopes).toEqual([]);
    const noUris = world({ client: { name: "C", redirectUris: 7, scopes: ["read"] } });
    expect((await failureOf(consentView(noUris.auth, noUris.adapter, cookie, query(base)))).field).toBe("oauth_query");
    const empties = world({ client: { name: "C", redirectUris: [""], scopes: "" } });
    expect((await failureOf(consentView(empties.auth, empties.adapter, cookie, query({ ...base, redirect_uri: "" })))).field).toBe("oauth_query");
  });
});
