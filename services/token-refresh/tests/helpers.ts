import { one } from "../../../features/identity/tests/support/db.js";
import { signUp } from "../../../features/identity/tests/support/http.js";
import { connectorConfig, seedAccounts } from "../../../features/identity/tests/support/replay/flow.js";
import { type Replay, startReplay } from "../../../features/identity/tests/support/replay/server.js";
import { boot, type Env } from "../../../features/identity/tests/support/server.js";

/** better-auth's adapter, exactly as `identity.adapter()` hands it out. */
export type Adapter = Awaited<ReturnType<Env["identity"]["adapter"]>>;

/**
 * One real stack per test: the identity app over a fresh SQLite file, the local replay OAuth provider,
 * and one signed-up person who owns every seeded connector row. Nothing here is replaced or simulated.
 */
export async function world() {
  const replay: Replay = await startReplay();
  const env: Env = await boot(connectorConfig(replay));
  const person = await signUp(env, "Ada");
  const adapter = await env.identity.adapter();
  /** `n` connector rows whose access token expires `expiresInMs` after the test clock's now (null: never). */
  const seed = (n: number, expiresInMs: number | null) => seedAccounts(env, replay, person.userId, n, expiresInMs);
  const close = async () => void (await Promise.all([env.close(), replay.close()]));
  return { env, replay, adapter, seed, userId: person.userId, close };
}
export type World = Awaited<ReturnType<typeof world>>;

/** The lease columns and status of one account row, read straight from SQLite. */
export const leaseOf = (env: Env, id: string) => {
  const row = one(env.db, "select refreshLease, refreshLeaseUntil, status from account where id = ?", id);
  return { lease: row["refreshLease"] ?? null, until: Number(row["refreshLeaseUntil"] ?? 0), status: row["status"] };
};

/** The sealed token columns of one row, to prove a failed refresh left them byte for byte alone. */
export const tokensOf = (env: Env, id: string) => one(env.db, "select accessToken, refreshToken, accessTokenExpiresAt from account where id = ?", id);

/**
 * Wraps the real adapter and writes down every update and updateMany call before passing it through, so a
 * test can count how many writes the lease code issued. Reads and the writes themselves are untouched.
 */
export function recording(adapter: Adapter) {
  const writes: { method: "update" | "updateMany"; update: Record<string, unknown> }[] = [];
  const wrapped: Adapter = {
    ...adapter,
    update: ((args: { update: Record<string, unknown> }) => {
      writes.push({ method: "update", update: args.update });
      return adapter.update(args as Parameters<Adapter["update"]>[0]);
    }) as Adapter["update"],
    updateMany: ((args: { update: Record<string, unknown> }) => {
      writes.push({ method: "updateMany", update: args.update });
      return adapter.updateMany(args as Parameters<Adapter["updateMany"]>[0]);
    }) as Adapter["updateMany"],
  };
  return { adapter: wrapped, writes };
}

/** Lease writes are the ones that set a non-null `refreshLease`; releases set it back to null. */
export const leaseWrites = (writes: ReturnType<typeof recording>["writes"]) => writes.filter((w) => typeof w.update["refreshLease"] === "string").length;
