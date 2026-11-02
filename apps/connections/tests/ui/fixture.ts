import type { AddressInfo } from "node:net";
import { createApp } from "../../src/http/app.js";
import { startServer } from "../../src/http/serve.js";
import { oauthProvider } from "../../src/oauth/providers.js";
import { tempStore } from "../accounts/fixture.js";
import { NOW, SECRET } from "../http/fixture.js";
import { startReplay } from "../oauth/replay-provider.js";

/** The real app with the UI redirect on, over a real SQLite file and the local replay provider. */
export async function bootUi(opts: { deny?: boolean; redirect?: string | undefined } = {}) {
  const replay = await startReplay({ id: "cid", secret: "csecret" }, { deny: opts.deny ?? false });
  const t = tempStore();
  const github = oauthProvider("github", {
    clientId: "cid",
    clientSecret: "csecret",
    redirectURI: "http://app.test/v1/oauth/github/callback",
    authorizeURL: `${replay.url}/authorize`,
    tokenURL: `${replay.url}/token`,
  });
  const app = createApp(
    { store: t.store, secret: SECRET, now: () => NOW, isAdmin: (c) => c.user === "root", oauth: { github } },
    "redirect" in opts ? { uiRedirect: opts.redirect } : { uiRedirect: "/" },
  );
  const server = await startServer(app, 0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const get = (path: string, who?: string, cookie?: string) =>
    fetch(base + path, { redirect: "manual", headers: { ...(who && { authorization: who }), ...(cookie && { cookie }) } });
  return {
    get,
    store: t.store,
    close: () => {
      server.close();
      replay.close();
      t.done();
    },
  };
}
