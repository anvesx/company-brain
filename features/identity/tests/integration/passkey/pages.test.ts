import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PASSKEY_SCRIPT } from "../../../src/pages/passkey/script.js";
import { count } from "../../support/db.js";
import { Browser, signUp } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const text = async (path: string, browser = new Browser(env.base)) => {
  const res = await browser.call(path);
  return { res, body: await res.text() };
};

describe("passkey pages and scripts", () => {
  it("rule 16: /webauthn.js is the @simplewebauthn/browser bundle, byte for byte, served as cacheable JavaScript", async () => {
    const { res, body } = await text("/webauthn.js");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/javascript; charset=utf-8");
    expect(res.headers.get("cache-control")).toContain("max-age=3600");
    const bundle = await readFile(new URL("../../../node_modules/@simplewebauthn/browser/dist/bundle/index.umd.min.js", import.meta.url), "utf8");
    expect(body).toBe(bundle);
    expect(body).toContain("SimpleWebAuthnBrowser");
  });

  it("rule 16: /passkey.js is our glue and names the four plugin endpoints it calls", async () => {
    const { res, body } = await text("/passkey.js");
    expect(res.status).toBe(200);
    expect(body).toBe(PASSKEY_SCRIPT);
    for (const path of ["generate-authenticate-options", "verify-authentication", "generate-register-options", "verify-registration"]) {
      expect(body).toContain(path);
    }
  });

  it("rule 16: the sign-in page carries the OAuth query on the passkey button, escaped", async () => {
    const { body } = await text("/sign-in?client_id=a&state=%3Cx%3E");
    expect(body).toContain('id="passkey-sign-in" data-query="client_id=a&#38;state=%3Cx%3E"');
    expect(body).not.toContain("<script>");
  });

  it("rule 16: the account page lists no passkeys for a new user and offers to add one", async () => {
    const ada = await signUp(env, "Ada");
    const { body } = await text("/account", ada.browser);
    expect(body).toContain('<section aria-label="Passkeys"><h2>Passkeys</h2><p>No passkeys yet.</p>');
    expect(body).toContain('id="passkey-add"');
    expect(body).toContain('<script src="/webauthn.js" defer></script>');
  });

  it("rule 16: deleting another person's passkey is a 404 and leaves the row; without csrf it is 403", async () => {
    const [ada, bob] = [await signUp(env, "Ada"), await signUp(env, "Bob")];
    // Bob's passkey row, written as the plugin would after a verified registration (the public key is opaque here).
    const id = "pk-bob";
    env.db
      .prepare("insert into passkey (id, name, publicKey, userId, credentialID, counter, deviceType, backedUp, createdAt) values (?,?,?,?,?,?,?,?,?)")
      .run(id, "Bob's phone", "pk", bob.userId, "cred-bob", 0, "singleDevice", 0, Date.now());
    const csrf = await env.identity.csrf.issue(ada.browser.headers());
    const gone = await ada.browser.call("/account/passkey/delete", { form: { csrf, id } });
    expect(gone.status).toBe(404);
    expect(await gone.text()).toContain("not yours or is already gone");
    expect(count(env.db, "select count(*) as n from passkey where id = ?", id)).toBe(1);
    expect((await ada.browser.call("/account/passkey/delete", { form: { id } })).status).toBe(403);
  });
});
