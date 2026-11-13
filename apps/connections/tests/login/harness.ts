import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { dirname } from "node:path";
import { getRequestListener } from "@hono/node-server";
import { Browser } from "../../../../features/google-identity/tests/support/browser.js";
import { database } from "../../../../features/google-identity/tests/support/db.js";
import { startOidc } from "../../../../features/google-identity/tests/support/oidc/provider.js";
import { createApp } from "../../src/http/app.js";
import { createLogin } from "../../src/login/identity.js";
import { tempStore } from "../accounts/fixture.js";
import { NOW, SECRET } from "../http/fixture.js";
import { data } from "../pg/db.js";

const CLIENT = { id: "conn-test", secret: "conn-test-secret" };

/** The real app on a real port, real Postgres 16 and the real local OIDC server standing in for Google. */
export async function bootLogin() {
  const db = await database();
  const server = createServer();
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const oidc = await startOidc(CLIENT.id, CLIENT.secret, `${base}/api/auth/callback/google`);
  const t = tempStore();
  const d = await data(dirname(t.path), () => NOW * 1000);
  const login = await createLogin({
    pool: db.pool,
    baseUrl: base,
    secret: "0123456789abcdef0123456789abcdef-test-secret",
    clientId: CLIENT.id,
    clientSecret: CLIENT.secret,
    issuer: oidc.issuer,
  });
  const app = createApp(
    { store: t.store, vault: d.vault, cursors: d.cursors, secret: SECRET, now: () => NOW, isAdmin: () => false },
    { login, uiRedirect: "/" },
  );
  server.on("request", getRequestListener(app.fetch));
  return {
    base,
    oidc,
    pool: db.pool,
    /** A cookie-jar browser. `signIn(id, email)` presses Continue with Google as that person. */
    browser: () => new Browser(base, base),
    close: async () => {
      await new Promise<void>((done) => server.close(() => done()));
      await oidc.close();
      await d.close();
      t.done();
      await db.close();
    },
  };
}
