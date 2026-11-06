import type { BetterAuthOptions } from "better-auth";
import { type GenericOAuthConfig, genericOAuth } from "better-auth/plugins";
import type { Auth } from "../auth/options.js";
import type { ResolvedConfig } from "../config.js";
import { providerSecrets } from "../connectors/catalog.js";
import { accountHooks, accountPlugin } from "../connectors/schema.js";
import { parseSealKey } from "../connectors/seal.js";
import { googleProvider, requireVerifiedGoogle } from "./google.js";

type Adapter = Parameters<typeof accountHooks>[1];

/**
 * Everything better-auth needs for OAuth: Google as a way in, and each configured connector as a way to link.
 * A provider without its env id and secret is left out. A connector is never a sign-in door (see `closedDoor`).
 */
export const oauthOptions = (cfg: ResolvedConfig, auth: () => Auth, adapter: Adapter) => {
  const generic: GenericOAuthConfig[] = [...googleProvider(cfg)];
  const social: Record<string, { clientId: string; clientSecret: string; scope: string[] }> = {};
  for (const entry of cfg.providers ?? []) {
    const secrets = providerSecrets(entry.id, cfg.env);
    if (!secrets) continue;
    if (entry.kind === "generic") generic.push({ providerId: entry.id, ...secrets, scopes: entry.scopes, ...entry.generic });
    if (entry.kind === "built-in") social[entry.id] = { ...secrets, scope: entry.scopes };
  }
  return {
    socialProviders: social as BetterAuthOptions["socialProviders"],
    // A signed-in person links a provider whose email is not theirs, so linking is allowed across emails. A connector is listed as
    // trusted so better-auth does not refuse the link when the provider says `email_verified: false`: the link is to the signed-in
    // session, not to an email. That list never lets a connector sign anyone in (the gate refuses any callback without a link state).
    account: { accountLinking: { enabled: true, allowDifferentEmails: true, trustedProviders: ["google", ...(cfg.providers ?? []).map((p) => p.id)] } },
    user: { validateUserInfo: requireVerifiedGoogle },
    plugins: [accountPlugin(cfg.sealKey ? parseSealKey(cfg.sealKey) : null), ...(generic.length ? [genericOAuth({ config: generic })] : [])],
    accountHooks: accountHooks(
      auth,
      adapter,
      (cfg.providers ?? []).map((p) => p.id),
    ),
  };
};
