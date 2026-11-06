import type { AuthContext } from "better-auth";
import { RefreshError } from "../errors.js";

/** The account columns the refresher reads. Token columns arrive opened (see `accountPlugin`). */
export interface Row {
  id: string;
  userId: string;
  providerId: string;
  /** `active`, or `needs-auth` once the provider has refused the refresh token. */
  status?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  accessTokenExpiresAt?: Date | number | string | null;
  refreshLeaseUntil?: number | null;
  /** Moves on every token write, so "unchanged since I read it" can be checked in a `where` (the token columns are sealed, so they cannot be). */
  updatedAt?: Date | number | string | null;
}

/**
 * Reads and writes of one account row. A database failure is reported as its own RefreshError, STORE_FAILED,
 * so it is never mistaken for the provider being down (the caller then knows the provider may already have answered).
 */
export const createStore = (adapter: () => Promise<AuthContext["adapter"]>) => {
  const guard = async <T>(work: (db: AuthContext["adapter"]) => Promise<T>): Promise<T> => {
    try {
      return await work(await adapter());
    } catch {
      throw new RefreshError("STORE_FAILED", "the database did not answer");
    }
  };
  return {
    find: (id: string) => guard((db) => db.findOne<Row>({ model: "account", where: [{ field: "id", value: id }] })),
    /** Write one row; `also` adds conditions (compare-and-set). Returns how many rows changed: 0 means a condition no longer held. */
    mark: (id: string, update: Record<string, unknown>, also: { field: string; value: Date }[] = []) =>
      guard((db) => db.updateMany({ model: "account", where: [{ field: "id", value: id }, ...also], update })),
    /** Run any other database work under the same STORE_FAILED rule. */
    guard,
  };
};
