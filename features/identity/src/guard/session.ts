import { createHmac, timingSafeEqual } from "node:crypto";
import type { AuthContext } from "better-auth";
import { firstOrganization, isMember } from "../auth/hooks.js";
import type { Auth } from "../auth/options.js";

type Adapter = AuthContext["adapter"];
export interface SessionView {
  userId: string;
  sessionId: string;
  organizationId: string | null;
}

/** Reads the cookie session. Null when there is no valid cookie. Expired and signed-out sessions read as null. */
export const readSession = async (auth: Auth, headers: Headers): Promise<SessionView | null> => {
  if (!headers.has("cookie")) return null;
  const found = await auth.api.getSession({ headers });
  if (!found) return null;
  const active = (found.session as { activeOrganizationId?: string | null }).activeOrganizationId ?? null;
  return { userId: found.user.id, sessionId: found.session.id, organizationId: active };
};

/**
 * The session's active organization. When none is set (better-auth clears it after a refused switch) or the user
 * has left it, fall back to their oldest membership. Null only when they belong to no organization at all.
 */
export const activeTenant = async (adapter: Adapter, view: SessionView): Promise<string | null> =>
  view.organizationId !== null && (await isMember(adapter, view.userId, view.organizationId)) ? view.organizationId : firstOrganization(adapter, view.userId);

/** A form token bound to one session: an HMAC of the session id under the secret. */
export const signCsrf = (secret: string, sessionId: string): string => createHmac("sha256", secret).update(`csrf:${sessionId}`).digest("base64url");

/** Constant-time comparison, so response time does not leak how much of a guess was right. */
export const sameToken = (a: string, b: string): boolean => {
  const [x, y] = [Buffer.from(a), Buffer.from(b)];
  return x.length === y.length && timingSafeEqual(x, y);
};
