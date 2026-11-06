import type { BetterAuthOptions } from "better-auth";
import { getOAuthState } from "better-auth/api";
import type { GenericOAuthConfig } from "better-auth/plugins";
import type { Hono } from "hono";
import type { ResolvedConfig } from "../config.js";
import type { Limits } from "../guard/limits.js";
import { api, type Deps, oops, readForm, redirect } from "../pages/actions.js";
import { bodyOf, tooMany } from "../routes/validate.js";

const DISCOVERY = "https://accounts.google.com/.well-known/openid-configuration";

/** Google as a generic OAuth provider (OIDC discovery). The account picker is always shown. Empty when Google is off. */
export const googleProvider = (cfg: ResolvedConfig): GenericOAuthConfig[] =>
  cfg.google
    ? [
        {
          providerId: "google",
          clientId: cfg.google.clientId,
          clientSecret: cfg.google.clientSecret,
          discoveryUrl: cfg.google.discoveryUrl ?? DISCOVERY,
          scopes: ["openid", "email", "profile"],
          prompt: "select_account",
        },
      ]
    : [];

/**
 * The gate every OAuth sign-in passes before better-auth makes a user, links an account or opens a session.
 * Google must vouch for the email. A connector provider is only ever a link started by a signed-in person: its state
 * carries `link`. Any other connector callback (a state borrowed from a Google start, say) is refused, so it leaves no user and no session.
 */
export const requireVerifiedGoogle: NonNullable<NonNullable<BetterAuthOptions["user"]>["validateUserInfo"]> = async ({ user, source }) => {
  if (source.method !== "oauth") return undefined;
  if (source.oauth?.providerId === "google") {
    return user.emailVerified ? undefined : { error: "email_not_verified", errorDescription: "Google has not verified this email." };
  }
  return (await getOAuthState())?.link
    ? undefined
    : { error: "connector_not_a_door", errorDescription: "A connector can only be linked from your connections page." };
};

/** Connector providers are never a way in. Only `sign-in/social` for a configured Google is open; every other start is a 404. */
export const closedDoor = async (path: string, req: Request, cfg: ResolvedConfig): Promise<Response | null> => {
  if (path !== "/api/auth/sign-in/social" && path !== "/api/auth/sign-in/oauth2") return null;
  const open = path.endsWith("/social") && cfg.google !== undefined && (await bodyOf(req))?.["provider"] === "google";
  return open ? null : new Response(null, { status: 404 });
};

/**
 * Google sign-in starts: 5 per address per 15 minutes, counted on the API route so the button page (which calls it)
 * and a direct post share one counter. Returns the 429, or null to carry on.
 */
export const limitGoogle = async (path: string, req: Request, address: string, limits: Limits): Promise<Response | null> => {
  if (path !== "/api/auth/sign-in/social" || (await bodyOf(req))?.["provider"] !== "google") return null;
  const wait = await limits.wait("google", address);
  if (wait !== null) return tooMany(wait);
  await limits.record("google", address);
  return null;
};

/** The Continue with Google button. It has no csrf field: nobody is signed in yet, and Origin is checked on the post. */
export const googleButton = (): string => `<form method="post" action="/sign-in/google"><button type="submit">Continue with Google</button></form>`;

/** `POST /sign-in/google`: a redirect to Google's account picker. The 5 starts per address per 15 minutes are counted by the API route it calls. */
export const mountGoogle = (app: Hono, d: Deps): void => {
  app.post("/sign-in/google", async (c) => {
    if (!d.cfg.google) return c.notFound();
    const form = await readForm(d, c.req.raw);
    if (form instanceof Response) return form;
    const res = await api(d, c.req.raw, "sign-in/social", { provider: "google", callbackURL: "/connections", errorCallbackURL: "/sign-in" }, c.env);
    // The API route answers 429 with Retry-After when the address is over its limit: hand that straight back.
    if (res.status === 429) return res;
    const { url } = (await res.json().catch(() => ({}))) as { url?: string };
    return res.ok && url ? redirect(url, res) : oops(new Error("Google sign-in is not available."), 502);
  });
};
