import { mcp } from "@better-auth/mcp";
import type { AuthContext, BetterAuthPlugin } from "better-auth";
import { APIError } from "better-auth/api";
import type { ResolvedConfig } from "../config.js";
import { resolveTenant } from "../guard/session.js";
import { countMemberships, isMember } from "./hooks.js";

const DAY = 86_400;

/** The MCP OAuth provider: sign-in and consent pages, token lifetimes, and the organization claim in every access token. */
export const mcpPlugin = (cfg: ResolvedConfig, adapter: () => Promise<AuthContext["adapter"]>): BetterAuthPlugin =>
  mcp({
    resource: cfg.resource,
    loginPage: "/sign-in",
    consentPage: "/consent",
    scopes: ["openid", "offline_access"],
    grantTypes: ["authorization_code", "refresh_token"],
    accessTokenExpiresIn: cfg.accessTokenTtlSeconds,
    refreshTokenExpiresIn: 30 * DAY,
    refreshTokenReuseInterval: 0,
    allowDynamicClientRegistration: true,
    allowUnauthenticatedClientRegistration: true,
    // The organization is chosen once, before consent, and stored as the consent reference. The reference may be async,
    // so it goes through the same resolveTenant as the consent page: a stale or empty active organization is healed
    // here too. One race remains: if membership is removed between the page render and Allow, the grant binds the old
    // organization and the token exchange fails later with invalid_grant (checked in customAccessTokenClaims).
    postLogin: {
      page: "/picker",
      consentReferenceId: async ({ session }) =>
        (await resolveTenant(await adapter(), {
          userId: session.userId,
          sessionId: session.id,
          organizationId: (session as { activeOrganizationId?: string | null }).activeOrganizationId ?? null,
        })) ?? undefined,
      shouldRedirect: async ({ user, isContinuation }) => !isContinuation && (await countMemberships(await adapter(), user.id)) > 1,
    },
    // org_id comes from the consent reference. A user who has left that organization gets invalid_grant on refresh.
    customAccessTokenClaims: async ({ user, referenceId }) => {
      if (!referenceId) return {};
      if (!user || !(await isMember(await adapter(), user.id, referenceId))) {
        throw new APIError("BAD_REQUEST", { error: "invalid_grant", error_description: "no longer a member of the organization" });
      }
      return { org_id: referenceId };
    },
  });
