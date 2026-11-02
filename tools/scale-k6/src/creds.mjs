import { createHmac } from "node:crypto";

/** Test-only values, the same 32-character secret the connections app's own tests use. */
export const SECRET = "s".repeat(32);

/** A `user:tenant:exp:hmac` bearer, valid for `ttlSec` seconds. */
export const mint = (user, tenant, ttlSec = 3600, nowMs = Date.now()) => {
  const exp = Math.floor(nowMs / 1000) + ttlSec;
  const sig = createHmac("sha256", SECRET).update(`${user}:${tenant}:${exp}`).digest("hex");
  return `${user}:${tenant}:${exp}:${sig}`;
};
