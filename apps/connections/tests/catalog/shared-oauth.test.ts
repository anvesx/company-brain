import { createBuiltinRegistry, driveManifest, type Manifest } from "@brain/connectors";
import { afterEach, describe, expect, it } from "vitest";
import { oauthProvider } from "../../src/oauth/providers.js";
import { ann, boot } from "../http/fixture.js";
import { startReplay } from "../oauth/replay-provider.js";

const suite = (id: string, scopes: string[]): Manifest => ({
  ...driveManifest,
  id,
  name: id,
  auth: {
    kind: "oauth2",
    app: "suite",
    authorizeURL: "https://unused.test/a",
    tokenURL: "https://unused.test/t",
    scopes,
    pkce: false,
    extraParams: { hd: "acme.test" },
  },
});
const closers: (() => unknown)[] = [];
afterEach(async () => {
  for (const c of closers.splice(0)) await c();
});

describe("two manifests sharing one oauth app", () => {
  it("run the same flow with one client and their own scopes, and each makes its own account", async () => {
    const idp = await startReplay({ id: "cid", secret: "csecret" }, {});
    const catalog = createBuiltinRegistry();
    catalog.register(suite("mail", ["read:mail"]));
    catalog.register(suite("cal", ["read:cal", "read:free"]));
    const client = oauthProvider("github", {
      clientId: "cid",
      clientSecret: "csecret",
      redirectURI: "http://app.test/v1/oauth/suite/callback",
      authorizeURL: `${idp.url}/authorize`,
      tokenURL: `${idp.url}/token`,
    });
    const app = await boot({ catalog, oauth: { suite: client } });
    closers.push(app.close, idp.close);
    const flows: Record<string, URL> = {};
    for (const id of ["mail", "cal"]) {
      const start = await app.call("GET", `/v1/oauth/${id}/start`, ann);
      expect(start.status).toBe(302);
      flows[id] = new URL(start.headers.get("location") ?? "");
      const consent = await fetch(flows[id] as URL, { redirect: "manual" });
      const back = new URL(consent.headers.get("location") ?? "");
      expect((await app.call("GET", back.pathname + back.search)).status).toBe(201);
    }
    const [mail, cal] = [flows.mail as URL, flows.cal as URL];
    expect(mail.origin + mail.pathname).toBe(cal.origin + cal.pathname);
    expect([mail, cal].map((u) => u.searchParams.get("client_id"))).toEqual(["cid", "cid"]);
    expect(mail.searchParams.get("scope")).toBe("read:mail");
    expect(cal.searchParams.get("scope")).toBe("read:cal read:free");
    expect(cal.searchParams.get("hd")).toBe("acme.test");
    expect(app.store.listVisible({ user: "ann", tenant: "t1" }).map((a) => a.provider)).toEqual(["mail", "cal"]);
  });
});
