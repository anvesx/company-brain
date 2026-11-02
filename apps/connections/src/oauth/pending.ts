import type { Caller, Zone } from "../accounts/types.js";

export type Pending = { provider: string; caller: Caller; verifier: string; label: string; access: Zone; dataZone: Zone; expires: number };

/** Sign-ins in flight, kept in memory: a state is single use and lives `ttl` seconds. A restart drops them and the user starts again. */
export function createPending(now: () => number, ttl = 600) {
  const m = new Map<string, Pending>();
  return {
    put(state: string, p: Omit<Pending, "expires">): void {
      for (const [k, v] of m) if (v.expires <= now()) m.delete(k);
      m.set(state, { ...p, expires: now() + ttl });
    },
    take(state: string): Pending | undefined {
      const p = m.get(state);
      m.delete(state);
      return p && p.expires > now() ? p : undefined;
    },
  };
}
export type PendingStore = ReturnType<typeof createPending>;
