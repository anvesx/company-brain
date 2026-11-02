import { describe, expect, it } from "vitest";
import { accessTokenOf } from "../../src/tokens/access-token.js";

describe("accessTokenOf", () => {
  it("returns a non-oauth credential as is", () => {
    expect(accessTokenOf("pat", "ghp_x")).toBe("ghp_x");
    expect(accessTokenOf("api-key", "k")).toBe("k");
  });
  it("reads accessToken out of an oauth credential", () => {
    expect(accessTokenOf("oauth", JSON.stringify({ accessToken: "at", refreshToken: "rt" }))).toBe("at");
  });
  it.each([
    ["not json", "not json"],
    ["no accessToken", "{}"],
    ["empty accessToken", '{"accessToken":""}'],
    ["non-string accessToken", '{"accessToken":5}'],
    ["null accessToken", '{"accessToken":null}'],
  ])("is undefined for an oauth credential with %s", (_n, secret) => {
    expect(accessTokenOf("oauth", secret)).toBeUndefined();
  });
});
