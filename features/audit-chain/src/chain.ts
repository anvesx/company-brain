import { type AuditEvent, GENESIS, hashEvent, validateEvent } from "./canonical.js";
import { AuditError } from "./errors.js";
import { openStore, type Row } from "./store.js";

export type { AuditEvent } from "./canonical.js";
export { AuditError } from "./errors.js";
export type Entry = AuditEvent & { seq: number; hash: string };

export interface AuditChain {
  append(e: AuditEvent): { seq: number; hash: string };
  verify(tenantId: string): { ok: true } | { ok: false; brokenAt: number };
  list(tenantId: string, afterSeq?: number, limit?: number): Entry[];
}

const toEvent = (tenantId: string, r: Row): AuditEvent => ({
  tenantId, actor: r.actor, action: r.action, target: r.target, at: r.at,
  ...(r.detail === null ? {} : { detail: JSON.parse(r.detail) as Record<string, unknown> }),
});

const int = (v: number, name: string, min: number, max: number): number => {
  if (!Number.isInteger(v) || v < min || v > max) throw new AuditError("INVALID", `${name} must be an integer in ${min}..${max}`);
  return v;
};

const tenant = (t: unknown): string => {
  if (typeof t !== "string" || t.length === 0) throw new AuditError("INVALID", "tenantId must be a non-empty string");
  return t;
};

export function createAuditChain(dbPath: string): AuditChain {
  const store = openStore(dbPath);
  return {
    append(e) {
      const detail = validateEvent(e);
      return store.append(e.tenantId, detail, e, (prev) => hashEvent(prev, e));
    },
    verify(tenantId) {
      tenant(tenantId);
      let prev = GENESIS;
      let expected = 1;
      for (const r of store.each(tenantId)) {
        if (r.seq !== expected) return { ok: false, brokenAt: expected };
        try {
          prev = hashEvent(prev, toEvent(tenantId, r));
        } catch {
          return { ok: false, brokenAt: r.seq }; // stored detail is not valid JSON
        }
        if (prev !== r.hash) return { ok: false, brokenAt: r.seq };
        expected++;
      }
      return { ok: true };
    },
    list(tenantId, afterSeq = 0, limit = 100) {
      tenant(tenantId);
      int(afterSeq, "afterSeq", 0, Number.MAX_SAFE_INTEGER);
      int(limit, "limit", 1, 1000);
      return store.rows(tenantId, afterSeq, limit).map((r) => ({ ...toEvent(tenantId, r), seq: r.seq, hash: r.hash }));
    },
  };
}
