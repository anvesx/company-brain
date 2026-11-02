import { describe, expect, it } from "vitest";
import { oauthProvider } from "../../src/oauth/providers.js";
import { refreshAccount } from "../../src/oauth/state/refresh.js";
import { input, tempStore } from "../accounts/fixture.js";
import { startReplay } from "../oauth/replay-provider.js";

describe("refreshAccount, unusable stored credentials", () => {
  it.each([
    ["empty refreshToken", '{"accessToken":"a","refreshToken":""}'],
    ["numeric refreshToken", '{"accessToken":"a","refreshToken":5}'],
    ["null refreshToken", '{"accessToken":"a","refreshToken":null}'],
  ])("treats %s as unsupported and never calls the provider", async (_n, secret) => {
    const replay = await startReplay({ id: "cid", secret: "csecret" }, { refresh: true });
    const t = tempStore();
    const p = oauthProvider("github", { clientId: "cid", clientSecret: "csecret", redirectURI: "http://app.test/cb", tokenURL: `${replay.url}/token` });
    const a = t.store.create({ ...input, kind: "oauth", provider: "github", secret });
    expect(await refreshAccount(t.store, p, a.id)).toBe("unsupported");
    expect(replay.tokenCalls).toBe(0);
    expect(t.store.get(a.id)?.status).toBe("active");
    await replay.close();
    t.done();
  });
});
