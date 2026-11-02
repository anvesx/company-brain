import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Caller } from "../../accounts/types.js";

export const BIND_COOKIE = "oauth_bind";
export const BIND_TTL = 600;

const digest = (state: string) => createHash("sha256").update(state).digest("hex");
const mac = (secret: string, hash: string, c: Caller) => createHmac("sha256", secret).update(`oauth-bind:${hash}:${c.user}:${c.tenant}`).digest("hex");

/** Cookie value that ties one `state` to the caller who started it: `hash(state).hmac(hash, caller)`. The state itself never goes in it. */
export const bindValue = (secret: string, state: string, c: Caller): string => {
  const h = digest(state);
  return `${h}.${mac(secret, h, c)}`;
};

/** True only for the cookie `bindValue` made for this exact state and caller. A URL handed to someone else has no such cookie in their browser. */
export function bindingHolds(secret: string, cookie: string | undefined, state: string, c: Caller): boolean {
  const want = Buffer.from(bindValue(secret, state, c));
  const got = Buffer.from(cookie ?? "");
  return got.length === want.length && timingSafeEqual(got, want);
}
