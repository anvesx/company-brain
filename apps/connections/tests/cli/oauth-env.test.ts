import { describe, expect, it } from "vitest";
import { oauthFromEnv } from "../../src/cli/oauth-env.js";

const url = { CONNECTIONS_PUBLIC_URL: "https://conn.example.com/" };

describe("oauthFromEnv", () => {
  it("configures nothing when no client is set", () => {
    expect(oauthFromEnv({})).toEqual({ providers: {}, errors: [] });
  });
  it("builds github and google with the callback under the public url", () => {
    const { providers, errors } = oauthFromEnv({
      ...url,
      GITHUB_CLIENT_ID: "g",
      GITHUB_CLIENT_SECRET: "gs",
      GOOGLE_CLIENT_ID: "o",
      GOOGLE_CLIENT_SECRET: "os",
    });
    expect(errors).toEqual([]);
    expect(providers.github).toMatchObject({
      source: "github",
      clientId: "g",
      clientSecret: "gs",
      redirectURI: "https://conn.example.com/v1/oauth/github/callback",
    });
    expect(providers.google).toMatchObject({ source: "drive", clientId: "o", redirectURI: "https://conn.example.com/v1/oauth/google/callback" });
  });
  it("reports a half-set client and a missing public url", () => {
    expect(oauthFromEnv({ ...url, GITHUB_CLIENT_ID: "g" }).errors).toEqual(["GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set together"]);
    expect(oauthFromEnv({ GOOGLE_CLIENT_SECRET: "s" }).errors[0]).toMatch(/GOOGLE_CLIENT_ID/);
    expect(oauthFromEnv({ GITHUB_CLIENT_ID: "g", GITHUB_CLIENT_SECRET: "s" }).errors).toEqual([
      "CONNECTIONS_PUBLIC_URL is required when an oauth client is set",
    ]);
  });
});
