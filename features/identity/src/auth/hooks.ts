import type { AuthContext, BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import type { Auth } from "./options.js";

type Adapter = AuthContext["adapter"];

/** The organization a new session starts in: the user's oldest membership, or null if they have none. */
export const firstOrganization = async (adapter: Adapter, userId: string): Promise<string | null> => {
  const memberships = await adapter.findMany<{ organizationId: string }>({
    model: "member",
    where: [{ field: "userId", value: userId }],
    sortBy: { field: "createdAt", direction: "asc" },
    limit: 1,
  });
  return memberships[0]?.organizationId ?? null;
};

/** True when the user is a member of the organization right now. */
export const isMember = async (adapter: Adapter, userId: string, organizationId: string): Promise<boolean> =>
  (await adapter.count({
    model: "member",
    where: [
      { field: "userId", value: userId },
      { field: "organizationId", value: organizationId },
    ],
  })) > 0;

export const countMemberships = (adapter: Adapter, userId: string): Promise<number> =>
  adapter.count({ model: "member", where: [{ field: "userId", value: userId }] });

/**
 * One small table that remembers rate-limit events: a failed sign-in per email, a client registration per address.
 * It lives in the same database as the rest of auth, so the counts survive a restart.
 * `at` is epoch milliseconds from the injected clock, which does not fit in a 32-bit integer, hence bigint.
 */
export const hitsPlugin = (): BetterAuthPlugin => ({
  id: "identity-hits",
  schema: {
    identityHit: {
      fields: {
        kind: { type: "string", required: true },
        key: { type: "string", required: true, index: true },
        at: { type: "number", required: true, bigint: true },
      },
    },
  },
});

/** Database hooks: every user gets a personal organization, and every new session starts in the user's first one. */
export const identityHooks = (auth: () => Auth, adapter: () => Promise<Adapter>): BetterAuthOptions["databaseHooks"] => ({
  user: {
    create: {
      after: async (user) => {
        const org = await auth().api.createOrganization({ body: { name: user.name, slug: `p-${user.id.toLowerCase()}`, userId: user.id } });
        // The sign-up session was made before this organization existed, so point it here.
        await (await adapter()).updateMany({ model: "session", where: [{ field: "userId", value: user.id }], update: { activeOrganizationId: org?.id } });
      },
    },
  },
  session: {
    create: {
      before: async (session) => ({ data: { ...session, activeOrganizationId: await firstOrganization(await adapter(), session.userId) } }),
    },
  },
});
