import { describe, expect, it } from "vitest";
import { consentView } from "../../../../src/consent/view.js";
import { base, cookie, failureOf, query, world } from "./kit.js";

describe("consentView: what it refuses", () => {
  it("a deleted organization is BAD_INPUT naming organization", async () => {
    const w = world({ org: null });
    const error = await failureOf(consentView(w.auth, w.adapter, cookie, query(base)));
    expect([error.code, error.field, error.message]).toEqual(["BAD_INPUT", "organization", "organization: the active organization no longer exists"]);
  });

  it("a redirect the client did not register is BAD_INPUT naming oauth_query", async () => {
    const w = world();
    const error = await failureOf(consentView(w.auth, w.adapter, cookie, query({ ...base, redirect_uri: "https://evil.example/cb" })));
    expect([error.code, error.field]).toEqual(["BAD_INPUT", "oauth_query"]);
    expect(error.message).toBe("oauth_query: redirect_uri is missing or does not match the client's registration");
  });

  it("a missing client_id and an unknown client are each BAD_INPUT naming oauth_query", async () => {
    const w = world();
    const { client_id: _drop, ...noId } = base;
    expect((await failureOf(consentView(w.auth, w.adapter, cookie, query(noId)))).message).toBe("oauth_query: the client_id parameter is missing");
    const none = world({ client: null });
    expect((await failureOf(consentView(none.auth, none.adapter, cookie, query(base)))).message).toBe(
      "oauth_query: client_id does not match a registered client",
    );
  });

  it("no cookie is UNAUTHENTICATED, and a user with no organization is NO_ORGANIZATION", async () => {
    const w = world();
    const anon = await failureOf(consentView(w.auth, w.adapter, new Headers(), query(base)));
    expect([anon.code, anon.message]).toEqual(["UNAUTHENTICATED", "sign in first"]);
    const loner = world({ member: false });
    const none = await failureOf(consentView(loner.auth, loner.adapter, cookie, query(base)));
    expect([none.code, none.message]).toEqual(["NO_ORGANIZATION", "You do not belong to an organization yet."]);
  });
});
