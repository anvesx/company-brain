import type { ProviderEntry } from "@anvesx/identity";
import { describe, expect, it } from "vitest";
import { baseUrl, withBase } from "../../src/doors/base.js";

const entry: ProviderEntry = { id: "google-drive", name: "Google Drive", description: "d", kind: "google", scopes: [] } as unknown as ProviderEntry;

describe("<ID>_BASE_URL", () => {
  it("is undefined when unset or empty", () => {
    expect(baseUrl("slack", {})).toBeUndefined();
    expect(baseUrl("slack", { SLACK_BASE_URL: "" })).toBeUndefined();
  });

  it("reads the key from the id (dashes become underscores) and keeps only the origin", () => {
    expect(baseUrl("google-drive", { GOOGLE_DRIVE_BASE_URL: "http://127.0.0.1:9100/some/path?x=1" })).toBe("http://127.0.0.1:9100");
  });

  it("refuses a non-http scheme and garbage, naming the variable", () => {
    expect(() => baseUrl("slack", { SLACK_BASE_URL: "ftp://x" })).toThrow("SLACK_BASE_URL must be an http(s) origin");
    expect(() => baseUrl("slack", { SLACK_BASE_URL: "not a url" })).toThrow("SLACK_BASE_URL");
  });

  it("leaves an entry alone without a base, and turns it generic with one", () => {
    expect(withBase(entry, {})).toBe(entry);
    const out = withBase(entry, { GOOGLE_DRIVE_BASE_URL: "https://idp.example.com" });
    expect(out.kind).toBe("generic");
    expect(out).toMatchObject({
      generic: {
        authorizationUrl: "https://idp.example.com/authorize",
        tokenUrl: "https://idp.example.com/token",
        userInfoUrl: "https://idp.example.com/userinfo",
      },
    });
  });
});
