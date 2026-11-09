import { afterEach, beforeEach } from "vitest";
import type { Auth } from "../../../../src/auth/options.js";
import { resolveConfig } from "../../../../src/config.js";
import { createRefresher } from "../../../../src/connectors/refresh.js";
import type { RefreshError } from "../../../../src/index.js";
import { createStore } from "../../../../src/lease/store.js";
import { MINUTE, one } from "../../../support/db.js";
import { signUp } from "../../../support/http.js";
import { connectorConfig, seedAccounts } from "../../../support/replay/flow.js";
import { type Replay, startReplay } from "../../../support/replay/server.js";
import { boot, type Env } from "../../../support/server.js";

export const ctx = { env: undefined as unknown as Env, replay: undefined as unknown as Replay };
/** Boots the app and the replay provider around every test of the calling file. */
export const useEnv = () => {
  beforeEach(async () => {
    ctx.replay = await startReplay();
    ctx.env = await boot(connectorConfig(ctx.replay));
  });
  afterEach(async () => Promise.all([ctx.env.close(), ctx.replay.close()]));
};

export type Tokens = { accessToken?: string; refreshToken?: string; accessTokenExpiresAt?: Date };
export type Refresh = (token: string) => Promise<Tokens>;
export type Provider = { id: string; refreshAccessToken?: Refresh };
export type Adapter = Awaited<ReturnType<Env["identity"]["adapter"]>>;

/** A refresher over the real database whose providers are ours, so every answer the token endpoint can give is reachable. */
export const refresherFor = async (providers: Provider[], wrap?: (real: Adapter) => unknown) => {
  const real = await ctx.env.identity.adapter();
  const adapter = (wrap ? wrap(real) : real) as typeof real;
  const auth = { $context: Promise.resolve({ socialProviders: providers }) } as unknown as Auth;
  const refresher = createRefresher(auth, resolveConfig(ctx.env.config), async () => adapter);
  return { refresher, store: createStore(async () => adapter), real };
};
export const seeded = async () => {
  const ada = await signUp(ctx.env, "Ada");
  const [id = ""] = await seedAccounts(ctx.env, ctx.replay, ada.userId, 1, MINUTE);
  return id;
};
export const outcome = async (p: Promise<unknown>) =>
  p.then(
    () => ({ code: "OK", message: "" }),
    (e: unknown) => ({ code: (e as RefreshError).code, message: (e as Error).message }),
  );
export const status = (id: string) => String(one(ctx.env.db, "select status from account where id = ?", id)["status"]);
export const row = (id: string) => one(ctx.env.db, "select * from account where id = ?", id);
export const ok: Refresh = async () => ({ accessToken: "new-at" });
export const failing =
  (error: unknown): Refresh =>
  async () => {
    throw error;
  };
