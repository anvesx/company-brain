import type { Ctx } from "../schema.js";

const MAX_PROVIDERS = 100;
// A stored time may be epoch milliseconds, an ISO string or a Date; anything else has no usable time.
const iso = (v: unknown): string | undefined => {
  const d = typeof v === "number" || typeof v === "string" || v instanceof Date ? new Date(v) : undefined;
  return d === undefined || Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

/**
 * The caller's linked provider accounts. Only the provider id and the link time are copied out of each row,
 * so no token can leave by accident. The sign-in password row is not a connector and is skipped.
 */
export async function connectors(ctx: Ctx) {
  const rows = await ctx.accounts(ctx.caller.user);
  const providers = rows
    .filter((r) => typeof r["providerId"] === "string" && r["providerId"] !== "credential")
    .slice(0, MAX_PROVIDERS)
    .map((r) => {
      const linkedAt = iso(r["createdAt"]);
      // A row exists only while the account is linked, so every listed provider is active.
      return { id: r["providerId"] as string, status: "active", ...(linkedAt === undefined ? {} : { linkedAt }) };
    });
  return { providers };
}
