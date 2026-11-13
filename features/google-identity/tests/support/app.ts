import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { getRequestListener } from "@hono/node-server";
import { createGoogleIdentity, type IdentityInput, migrateIdentity, type SignInPage } from "../../src/index.js";
import { database } from "./db.js";
import { startOidc } from "./oidc/provider.js";

export const CLIENT = { id: "brain-test", secret: "brain-test-secret" };
const SECRET = "0123456789abcdef0123456789abcdef-test-secret";

type Options = { production?: boolean; trustedProxies?: string[]; publicBase?: string; page?: SignInPage };

/** The real app on a real port, a real Postgres database and a real OIDC server. `publicBase` is the URL the outside world sees. */
export async function startApp(options: Options = {}) {
  const db = await database();
  const server = createServer();
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const local = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const base = options.publicBase ?? local;
  const oidc = await startOidc(CLIENT.id, CLIENT.secret, `${base}/api/auth/callback/google`);
  const input: IdentityInput = {
    pool: db.pool,
    baseUrl: base,
    secret: SECRET,
    clientId: CLIENT.id,
    clientSecret: CLIENT.secret,
    issuer: oidc.issuer,
    production: options.production ?? false,
    trustedProxies: options.trustedProxies ?? [],
    ...(options.page && { page: options.page }),
  };
  await migrateIdentity(input);
  const identity = createGoogleIdentity(input);
  server.on("request", getRequestListener(identity.app.fetch));
  return {
    ...identity,
    oidc,
    pool: db.pool,
    base,
    local,
    close: async () => {
      await new Promise<void>((done) => server.close(() => done()));
      await oidc.close();
      await db.close();
    },
  };
}
