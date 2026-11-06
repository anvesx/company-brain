import { randomBytes } from "node:crypto";
import type { IdentityConfig } from "../../../src/index.js";
import { one } from "../db.js";
import type { Browser, Person } from "../http.js";
import type { Env } from "../server.js";
import type { Replay } from "./server.js";

/** A fresh 32-byte seal key as 64 hex characters, made per test, never stored in the repo. */
export const newSealKey = (): string => randomBytes(32).toString("hex");

/** Config that adds the replay provider as a generic connector. Client id and secret arrive through `env`. */
export const connectorConfig = (replay: Replay, sealKey: string = newSealKey()): Partial<IdentityConfig> => ({
  sealKey,
  env: { REPLAY_CLIENT_ID: replay.state.clientId, REPLAY_CLIENT_SECRET: replay.state.clientSecret },
  providers: [
    {
      id: "replay",
      name: "Replay",
      description: "Local OAuth provider",
      scopes: ["read"],
      kind: "generic",
      generic: { discoveryUrl: replay.discoveryUrl, accessType: "offline" },
    },
  ],
});

/** Config that turns on Google login against the replay provider's discovery document. Google needs a seal key too: its tokens are stored. */
export const googleConfig = (replay: Replay, sealKey: string = newSealKey()): Partial<IdentityConfig> => ({
  sealKey,
  google: { clientId: replay.state.clientId, clientSecret: replay.state.clientSecret, discoveryUrl: replay.discoveryUrl },
});

/**
 * Follows redirects as a browser would: our own host through the cookie-keeping Browser, any other host
 * (the replay provider) by plain fetch. Returns the last response and the URL it came from.
 */
export async function follow(browser: Browser, first: Response, hops = 8): Promise<{ res: Response; at: URL }> {
  let res = first;
  let at = new URL(browser.base);
  for (let i = 0; i < hops && res.status >= 300 && res.status < 400; i += 1) {
    at = new URL(res.headers.get("location") ?? "/", at);
    res = at.origin === new URL(browser.base).origin ? await browser.call(at.pathname + at.search) : await fetch(at, { redirect: "manual" });
  }
  return { res, at };
}

/** Runs the whole link flow for one person from the tile's form post, and returns the account row id. */
export async function linkReplay(env: Env, person: Person): Promise<{ id: string; at: URL }> {
  const csrf = await env.identity.csrf.issue(person.browser.headers());
  const { at } = await follow(person.browser, await person.browser.call("/connections/link/replay", { form: { csrf } }));
  const row = one(env.db, "select id from account where userId = ? and providerId = 'replay'", person.userId);
  return { id: String(row["id"]), at };
}

/**
 * Writes `n` connector rows for one user through better-auth's own adapter, so the seal transforms run
 * exactly as they do for a linked account. Each row holds a token pair the replay provider will honour.
 */
export async function seedAccounts(env: Env, replay: Replay, userId: string, n: number, expiresInMs: number | null): Promise<string[]> {
  const adapter = await env.identity.adapter();
  const [at, ids] = [new Date(env.clock.now()), [] as string[]];
  for (let i = 0; i < n; i += 1) {
    const pair = replay.grant();
    const data = {
      userId,
      providerId: "replay",
      accountId: `seed-${randomBytes(6).toString("hex")}-${i}`,
      accessToken: pair.access,
      refreshToken: pair.refresh,
      accessTokenExpiresAt: expiresInMs === null ? null : new Date(env.clock.now() + expiresInMs),
      scope: "read",
      createdAt: at,
      updatedAt: at,
    };
    const row = await adapter.create<typeof data, { id: string }>({ model: "account", data });
    ids.push(row.id);
  }
  return ids;
}
