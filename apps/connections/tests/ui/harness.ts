import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createBuiltinRegistry } from "@anvesx/connectors";
import { startReplay as startGithub } from "@anvesx/connectors/testing/replay";
import { createGraphStore } from "@anvesx/graph-store";
import { getRequestListener } from "@hono/node-server";
import { Browser } from "../../../../features/google-identity/tests/support/browser.js";
import { database } from "../../../../features/google-identity/tests/support/db.js";
import { startOidc } from "../../../../features/google-identity/tests/support/oidc/provider.js";
import { createApp } from "../../src/http/app.js";
import { startJobs } from "../../src/jobs/queue.js";
import { createLogin } from "../../src/login/identity.js";
import { oauthProvider } from "../../src/oauth/providers.js";
import { tempStore } from "../accounts/fixture.js";
import { NOW, SECRET } from "../http/fixture.js";
import { startReplay } from "../oauth/replay-provider.js";
import { data, databaseUrl } from "../pg/db.js";
import { routes } from "../sync/fixture.js";

const CLIENT = { id: "ui-test", secret: "ui-test-secret" };
/** The real app on a real port: Postgres 16 and the local OIDC server for sign-in, a local OAuth2 provider for Connect, local GitHub JSON for sync. */
export async function bootUi(opts: { deny?: boolean; auto?: { webhookSecret: string; schema: string }; routes?: Parameters<typeof startGithub>[0] } = {}) {
  const db = await database();
  const server = createServer();
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const oidc = await startOidc(CLIENT.id, CLIENT.secret, `${base}/api/auth/callback/google`);
  const provider = await startReplay({ id: "cid", secret: "csecret" }, { deny: opts.deny ?? false });
  const github = await startGithub(opts.routes ?? routes);
  const t = tempStore();
  const d = await data(dirname(t.path), () => NOW * 1000);
  const dir = mkdtempSync(join(tmpdir(), "conn-ui-graph-"));
  const graph = createGraphStore({ path: join(dir, "graph.db") });
  const secret = "0123456789abcdef0123456789abcdef-test-secret";
  const login = await createLogin({ pool: db.pool, baseUrl: base, secret, clientId: CLIENT.id, clientSecret: CLIENT.secret, issuer: oidc.issuer });
  const urls = { authorizeURL: `${provider.url}/authorize`, tokenURL: `${provider.url}/token` };
  const ghProvider = oauthProvider("github", { clientId: "cid", clientSecret: "csecret", redirectURI: `${base}/v1/oauth/github/callback`, ...urls });
  const clock = { t: NOW };
  const deps = { store: t.store, vault: d.vault, cursors: d.cursors, secret: SECRET, now: () => clock.t };
  const full = { ...deps, isAdmin: () => false, catalog: createBuiltinRegistry(), sync: { graph, githubApiUrl: github.url }, oauth: { github: ghProvider } };
  const cfg = { databaseUrl: databaseUrl(), pollMinutes: 15, tenantConcurrency: 2, maxBacklogPerTenant: 100 };
  const jobs = opts.auto && (await startJobs(full, { ...cfg, schema: opts.auto.schema }));
  const app = createApp({ ...full, ...(opts.auto && jobs && { jobs, webhookSecret: opts.auto.webhookSecret }) }, { login, uiRedirect: "/" });
  server.on("request", getRequestListener(app.fetch));
  return {
    base,
    store: t.store,
    graph,
    clock,
    jobs,
    /** Press Continue on the consent page: where the callback sends the browser back to. */
    async connect(b: Browser) {
      const out = await b.send(`${base}/v1/oauth/github/start`);
      const consent = await b.send(out.headers.get("location") ?? "");
      return (await b.send(consent.headers.get("location") ?? "")).headers.get("location") ?? "";
    },
    /** A browser signed in as `name@example.com`. */
    async signedIn(name: string) {
      oidc.signInAs(name, { email: `${name}@example.com`, verified: true });
      const b = new Browser(base, base);
      await b.continueWithGoogle();
      return b;
    },
    close: async () => {
      await new Promise<void>((done) => server.close(() => done()));
      await oidc.close();
      provider.close();
      await github.close();
      graph.close();
      rmSync(dir, { recursive: true, force: true });
      await jobs?.stop();
      await d.close();
      t.done();
      await db.close();
    },
  };
}
