import type { Auth } from "../../../../src/auth/options.js";
import type { consentView } from "../../../../src/consent/view.js";
import { IdentityError } from "../../../../src/index.js";

export type Row = Record<string, unknown>;
export type Seed = { client?: Row | null; org?: Row | null; member?: boolean };

/** An adapter that answers from fixed rows, and records the queries consentView made. */
export const world = (seed: Seed = {}) => {
  const queries: { model: string; where?: unknown }[] = [];
  const client = seed.client === undefined ? { name: "Cursor", redirectUris: ["https://app.example/cb"], scopes: ["read", "write"] } : seed.client;
  const org = seed.org === undefined ? { id: "o1", name: "Acme" } : seed.org;
  const adapter = {
    findOne: async (q: { model: string; where?: unknown }) => {
      queries.push(q);
      return q.model === "oauthClient" ? client : org;
    },
    findMany: async () => (seed.member === false ? [] : [{ organizationId: "o1" }]),
    count: async () => (seed.member === false ? 0 : 1),
    update: async () => null,
  } as unknown as Parameters<typeof consentView>[1];
  const signedIn = { user: { id: "u1" }, session: { id: "s1", activeOrganizationId: "o1" } };
  const auth = { api: { getSession: async () => signedIn } } as unknown as Auth;
  return { adapter, auth, queries };
};
export const cookie = new Headers({ cookie: "a=b" });
export const query = (o: Record<string, string>) => new URLSearchParams(o).toString();
export const base = { client_id: "c1", redirect_uri: "https://app.example/cb", scope: "read write" };
export const failureOf = async (p: Promise<unknown>): Promise<IdentityError> =>
  p.then(
    () => new IdentityError("EXPIRED", "no failure"),
    (e: unknown) => e as IdentityError,
  );
