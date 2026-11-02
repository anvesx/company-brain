import { createBuiltinRegistry, customManifest } from "@anvesx/connectors";
import { afterEach, describe, expect, it } from "vitest";
import { manifestFor, oauthProvider, providerFor } from "../../src/oauth/providers.js";
import { ann, boot, root } from "../http/fixture.js";

const auth = { kind: "oauth2", authorizeURL: "https://evil.example/a", tokenURL: "https://evil.example/t", scopes: ["drive", "gmail"] };
const custom = (id: string) => ({ id, name: id, auth, endpoint: "https://evil.example" });
let s: Awaited<ReturnType<typeof boot>>;
afterEach(async () => {
  await s?.close();
  s = undefined as never;
});

describe("a custom manifest cannot take a built-in id or a server oauth app name", () => {
  it("refuses every built-in id and every built-in app name with 409", async () => {
    s = await boot();
    for (const id of ["github", "drive", "slack", "gmail", "google"]) expect((await s.call("POST", "/v1/catalog", root, custom(id))).status, id).toBe(409);
    expect((await s.call("POST", "/v1/catalog", root, custom("wiki"))).status).toBe(201);
  });
  it("maps a name to a server oauth app only through a built-in manifest", async () => {
    const catalog = createBuiltinRegistry();
    const spec = { id: "google", name: "g", endpoint: "https://evil.example", defaultZone: "team" as const, canRead: false, auth: { kind: "token" as const } };
    const evil = { ...customManifest(spec), auth: { ...auth, kind: "oauth2" as const, pkce: false, extraParams: {} } };
    catalog.register(evil, "t1");
    expect(manifestFor(catalog, "google", "t1")?.id).toBe("drive");
    const idp = oauthProvider("google", { clientId: "cid", clientSecret: "x", redirectURI: "http://app.test/cb" });
    s = await boot({ catalog, oauth: { google: idp } });
    const start = await s.call("GET", "/v1/oauth/google/start", ann);
    const scope = new URL(start.headers.get("location") ?? "").searchParams.get("scope") ?? "";
    expect(scope).not.toContain("gmail");
    expect(scope.split(" ")).toEqual(idp.scopes);
  });
  it("providerFor itself refuses a non-built-in manifest that names a server app or reuses a reserved id", () => {
    const idp = oauthProvider("google", { clientId: "cid", clientSecret: "x", redirectURI: "http://app.test/cb" });
    const evil = {
      ...customManifest({ id: "wiki", name: "w", endpoint: "https://evil.example", defaultZone: "team", canRead: false, auth: { kind: "token" } }),
      auth: { ...auth, kind: "oauth2" as const, pkce: false, extraParams: {}, app: "google" },
    };
    expect(providerFor({ google: idp }, evil)).toBeUndefined();
    expect(providerFor({ google: idp }, { ...evil, id: "google", auth: { ...evil.auth, app: undefined } })).toBeUndefined();
    const drive = createBuiltinRegistry()
      .list()
      .find((e) => e.manifest.id === "drive")?.manifest;
    expect(drive && providerFor({ google: idp }, drive)?.source).toBe("drive");
  });
});
