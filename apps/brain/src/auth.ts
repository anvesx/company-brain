import { createHmac, timingSafeEqual } from "node:crypto";

export const MIN_SECRET_CHARS = 32;
export type Caller = { user: string; tenant: string };
const BEARER = /^Bearer ([^:\s]+):([^:\s]+):(\d{1,12}):([0-9a-f]{64})$/;

/** Same token shape as the rag app's legacy form: `user:tenant:exp:hmac`. Returns undefined for anything invalid or expired. */
export function verify(header: string | undefined, secret: string, nowSeconds: number): Caller | undefined {
  const m = BEARER.exec(header ?? "");
  if (!m) return undefined;
  const [, user, tenant, exp, sig] = m as unknown as [string, string, string, string, string];
  const want = createHmac("sha256", secret).update(`${user}:${tenant}:${exp}`).digest();
  const got = Buffer.from(sig, "hex");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return undefined;
  return Number(exp) > nowSeconds ? { user, tenant } : undefined;
}
