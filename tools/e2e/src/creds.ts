import { createHmac } from "node:crypto";

/** Test-only values, the same 32-character secret the connections app's own tests use. */
export const SECRET = "s".repeat(32);
export const PORT = 18788;

/** A `user:tenant:exp:hmac` bearer, valid for an hour. `root` in `t1` is the tenant admin the server is started with. */
export const mint = (user: string, tenant = "t1"): string => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const sig = createHmac("sha256", SECRET).update(`${user}:${tenant}:${exp}`).digest("hex");
  return `${user}:${tenant}:${exp}:${sig}`;
};
