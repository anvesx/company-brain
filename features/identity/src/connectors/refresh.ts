import type { AuthContext } from "better-auth";
import type { Auth } from "../auth/options.js";
import type { ResolvedConfig } from "../config.js";
import { IdentityError, RefreshError } from "../errors.js";
import { createOnDemand, createSingleflight, underLease } from "../lease/demand.js";
import { createStore, type Row } from "../lease/store.js";

/** A sweep takes 500 rows at most. */
export const BATCH = 500;

/** A refusal from the token endpoint (400, 401 or invalid_grant) means the grant is gone. Anything else is an outage. */
const refused = (error: unknown): boolean => {
  const { status, error: code } = (error ?? {}) as { status?: number; error?: string };
  return status === 400 || status === 401 || code === "invalid_grant";
};

/** Refresh and read connector tokens. Every error is a RefreshError, or BAD_INPUT for an account that is not the caller's. */
export const createRefresher = (auth: Auth, cfg: ResolvedConfig, adapter: () => Promise<AuthContext["adapter"]>) => {
  const store = createStore(adapter);
  const { find, mark } = store;
  const once = createSingleflight();

  const refresh = async (row: Row): Promise<string> => {
    const provider = (await auth.$context).socialProviders.find((p) => p.id === row.providerId);
    // No refresh token (or one that would not open) cannot be refreshed. The row is left for the person to fix.
    if (!provider?.refreshAccessToken || !row.refreshToken) throw new RefreshError("NEEDS_AUTH", "sign in to this connector again");
    let tokens: Awaited<ReturnType<NonNullable<typeof provider.refreshAccessToken>>>;
    try {
      tokens = await provider.refreshAccessToken(row.refreshToken);
      if (!tokens.accessToken) throw new Error("the provider sent no access token");
    } catch (error) {
      if (!refused(error)) throw new RefreshError("PROVIDER_DOWN", "the provider did not answer");
      // Another refresher may have rotated the token while we asked. Look again before declaring the grant gone.
      const now = await find(row.id);
      if (now?.accessToken && now.refreshToken !== row.refreshToken) return now.accessToken;
      // Compare-and-set: mark only if the row is exactly as we just read it. A write that landed in between (a refresh that
      // worked) moves `updatedAt`, so the mark changes 0 rows and we answer with what that write left.
      const seen = now?.updatedAt == null ? [] : [{ field: "updatedAt", value: new Date(now.updatedAt) }];
      if ((await mark(row.id, { status: "needs-auth" }, seen)) === 0) {
        const after = await find(row.id);
        if (after?.accessToken && after.status === "active") return after.accessToken;
      }
      throw new RefreshError("NEEDS_AUTH", "the provider refused the refresh token");
    }
    await mark(row.id, {
      accessToken: tokens.accessToken,
      ...(tokens.refreshToken ? { refreshToken: tokens.refreshToken } : {}),
      accessTokenExpiresAt: tokens.accessTokenExpiresAt ?? null,
      status: "active",
      updatedAt: new Date(cfg.now()),
    });
    return tokens.accessToken;
  };

  /** Refresh under a lease of our own, so a second process cannot ask the provider about the same row at the same time. */
  const withLease = async (row: Row): Promise<string> => {
    // Read the row again once we hold it: the holder before us may have rotated the token since `row` was read.
    const token = await underLease(adapter, cfg.now, store.guard, row.id, true, async () => refresh((await find(row.id)) ?? row));
    // Not ours (another process holds it, or it is not active): the provider is not asked.
    if (token === undefined) throw new RefreshError("LEASED", "another process is refreshing this account");
    return token;
  };

  return {
    /**
     * Always refreshes, whatever the expiry says, but never a row marked needs-auth (NEEDS_AUTH, no provider call, like `accessToken`).
     * Called directly, it takes the row's lease first, and gets LEASED if another process holds it.
     * The sweep passes the row it already read and leased (`known`), so it takes none. Two calls in this process share one provider call.
     */
    refreshAccount: async (accountId: string, known?: Row): Promise<void> => {
      await once(accountId, async () => {
        const row = known ?? (await find(accountId));
        if (!row) throw new IdentityError("BAD_INPUT", "no such account", "accountId");
        if (row.status === "needs-auth") throw new RefreshError("NEEDS_AUTH", "sign in to this connector again");
        return known ? refresh(row) : withLease(row);
      });
    },
    accessToken: createOnDemand(adapter, cfg.now, store, refresh, once),
  };
};
