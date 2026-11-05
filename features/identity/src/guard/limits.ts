import type { AuthContext } from "better-auth";

type Adapter = AuthContext["adapter"];

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Sign-in lockout: 5 failures per email per 15 minutes. Registration: 20 per address per hour. */
export const RULES = {
  signin: { max: 5, windowMs: 15 * MINUTE },
  register: { max: 20, windowMs: HOUR },
} as const;
export type LimitKind = keyof typeof RULES;

/** Counts and records events in the identityHit table, using the injected clock. */
export const createLimits = (adapter: () => Promise<Adapter>, now: () => number) => {
  /** Seconds the caller must wait, or null when under the limit. The wait ends when the oldest counted event leaves the window. */
  const wait = async (kind: LimitKind, key: string): Promise<number | null> => {
    const { max, windowMs } = RULES[kind];
    const recent = await (await adapter()).findMany<{ at: number }>({
      model: "identityHit",
      where: [
        { field: "kind", value: kind },
        { field: "key", value: key },
        { field: "at", operator: "gt", value: now() - windowMs },
      ],
      sortBy: { field: "at", direction: "desc" },
      limit: max,
    });
    const oldest = recent[max - 1];
    if (!oldest) return null;
    return Math.min(windowMs / 1000, Math.max(1, Math.ceil((Number(oldest.at) + windowMs - now()) / 1000)));
  };

  const record = async (kind: LimitKind, key: string): Promise<void> => {
    await (await adapter()).create({ model: "identityHit", data: { kind, key, at: now() }, forceAllowId: false });
  };

  return { wait, record };
};

export type Limits = ReturnType<typeof createLimits>;
