import { type BetterAuthOptions, betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import type { IdentityConfig } from "./config.js";

const DAY = 86_400;

/** Google must vouch for the email before better-auth makes a user or a session. */
export const requireVerifiedEmail: NonNullable<NonNullable<BetterAuthOptions["user"]>["validateUserInfo"]> = ({ user }) =>
  user.emailVerified ? undefined : { error: "email_not_verified", errorDescription: "Google has not verified this email." };

/**
 * The one better-auth instance. Sign-in is Google OIDC only: the built-in credential sign-in is off and no other plugin is loaded.
 * Sessions live in Postgres (the `session` table). Rate limits live in Postgres too, so two instances share them.
 */
export const authOptions = (cfg: IdentityConfig): BetterAuthOptions => ({
  baseURL: cfg.baseUrl,
  secret: cfg.secret,
  database: cfg.pool,
  logger: { level: "error" },
  emailAndPassword: { enabled: false },
  session: { expiresIn: 7 * DAY },
  user: { validateUserInfo: requireVerifiedEmail },
  rateLimit: { enabled: cfg.production, storage: "database", customRules: { "/sign-in/social": { window: 900, max: 5 } } },
  advanced: {
    useSecureCookies: cfg.production,
    ipAddress: { ipAddressHeaders: ["x-forwarded-for"], trustedProxies: cfg.trustedProxies },
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "google",
          clientId: cfg.clientId,
          clientSecret: cfg.clientSecret,
          discoveryUrl: `${cfg.issuer.replace(/\/$/, "")}/.well-known/openid-configuration`,
          scopes: ["openid", "email", "profile"],
          pkce: true,
          prompt: "select_account",
        },
      ],
    }),
  ],
});

export const buildAuth = (cfg: IdentityConfig) => betterAuth(authOptions(cfg));
