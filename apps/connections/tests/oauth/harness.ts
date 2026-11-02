import { expect } from "vitest";
import { oauthProvider } from "../../src/oauth/providers.js";
import { boot } from "../http/fixture.js";
import { startReplay } from "./replay-provider.js";

const client = { id: "cid", secret: "csecret" };
export const redirect = (n: string) => `http://app.test/v1/oauth/${n}/callback`;

/** The real app plus a local replay provider. `secret` overrides the client secret the app sends. */
export async function harness(opts: { refresh?: boolean; deny?: boolean } = {}, secret = client.secret) {
  const replay = await startReplay(client, opts);
  let clock = 0;
  const at = (n: "github" | "google") =>
    oauthProvider(n, {
      clientId: client.id,
      clientSecret: secret,
      redirectURI: redirect(n),
      authorizeURL: `${replay.url}/authorize`,
      tokenURL: `${replay.url}/token`,
    });
  const s = await boot({ oauth: { github: at("github"), google: at("google") }, now: () => 1_800_000_000 + clock });
  /** What a browser does: start with the bearer, follow the redirect to the provider, then hit the callback it redirects to. */
  const signIn = async (who: string, name: string, query = "") => {
    const start = await s.call("GET", `/v1/oauth/${name}/start${query}`, who);
    expect(start.status).toBe(302);
    const consent = await fetch(start.headers.get("location") ?? "", { redirect: "manual" });
    const back = new URL(consent.headers.get("location") ?? "");
    return { start: new URL(start.headers.get("location") ?? ""), back, callback: () => s.call("GET", back.pathname + back.search) };
  };
  return {
    s,
    replay,
    signIn,
    advance: (seconds: number) => {
      clock += seconds;
    },
    close: async () => {
      await s.close();
      replay.close();
    },
  };
}
export type Harness = Awaited<ReturnType<typeof harness>>;
