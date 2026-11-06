import type { AuthContext, BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import type { Auth } from "../auth/options.js";
import { open, seal } from "./seal.js";

type Adapter = AuthContext["adapter"];
const SEALED = ["accessToken", "refreshToken", "idToken"] as const;

/** A token column that is sealed on the way in and opened on the way out. A value that will not open reads as null. */
const sealed = (key: Buffer, field: string) => ({
  type: "string" as const,
  required: false,
  returned: false,
  transform: {
    input: (value: unknown) => (typeof value === "string" ? seal(key, field, value) : value),
    output: (value: unknown) => {
      if (typeof value !== "string") return value;
      try {
        return open(key, field, value);
      } catch {
        return null;
      }
    },
  },
});

/**
 * Extra columns on better-auth's own `account` table: where the connection stands (`status`), which refresher holds
 * it (`refreshLease`, epoch ms in `refreshLeaseUntil`) and the provider email shown on the tile (`label`).
 * With a key, the three token columns are sealed. The plugin replaces a column's definition, so each one is restated in full.
 */
export const accountPlugin = (key: Buffer | null): BetterAuthPlugin => ({
  id: "identity-accounts",
  schema: {
    account: {
      fields: {
        status: { type: "string", required: false, defaultValue: "active" },
        refreshLease: { type: "string", required: false },
        refreshLeaseUntil: { type: "number", required: false, bigint: true, defaultValue: 0 },
        label: { type: "string", required: false },
        ...(key ? Object.fromEntries(SEALED.map((field) => [field, sealed(key, field)])) : {}),
      },
    },
  },
});

/**
 * Account hooks. A new connector account gets the provider's email as its label (a failed lookup only leaves it empty).
 * A relink writes new tokens but better-auth leaves `status` alone, so new tokens mean `active` again.
 */
export const accountHooks = (
  auth: () => Auth,
  adapter: () => Promise<Adapter>,
  connectors: readonly string[],
): NonNullable<NonNullable<BetterAuthOptions["databaseHooks"]>["account"]> => ({
  create: {
    after: async (account) => {
      if (!connectors.includes(account.providerId)) return;
      try {
        const provider = (await auth().$context).socialProviders.find((p) => p.id === account.providerId);
        const info = await provider?.getUserInfo({
          ...(account.accessToken && { accessToken: account.accessToken }),
          ...(account.idToken && { idToken: account.idToken }),
        });
        const label = info?.user.email;
        if (label) await (await adapter()).update({ model: "account", where: [{ field: "id", value: account.id }], update: { label } });
      } catch {
        // The tile then shows the provider name alone. Linking itself has worked.
      }
    },
  },
  update: {
    before: async (data) => (data.status === undefined && data.accessToken !== undefined ? { data: { ...data, status: "active" } } : undefined),
  },
});
