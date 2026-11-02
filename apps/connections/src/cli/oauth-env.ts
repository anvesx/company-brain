import { type OAuthProvider, oauthProvider } from "../oauth/providers.js";

type Env = Record<string, string | undefined>;
const NAMES = [
  ["github", "GITHUB"],
  ["google", "GOOGLE"],
] as const;

/** Sign-in providers from `GITHUB_CLIENT_ID/SECRET` and `GOOGLE_CLIENT_ID/SECRET`; the redirect is `CONNECTIONS_PUBLIC_URL/v1/oauth/<name>/callback`. */
export function oauthFromEnv(env: Env): { providers: Record<string, OAuthProvider>; errors: string[] } {
  const providers: Record<string, OAuthProvider> = {};
  const errors: string[] = [];
  const base = env.CONNECTIONS_PUBLIC_URL?.replace(/\/+$/, "");
  for (const [name, prefix] of NAMES) {
    const [id, secret] = [env[`${prefix}_CLIENT_ID`], env[`${prefix}_CLIENT_SECRET`]];
    if (!id && !secret) continue;
    if (!id || !secret) errors.push(`${prefix}_CLIENT_ID and ${prefix}_CLIENT_SECRET must be set together`);
    else if (base) providers[name] = oauthProvider(name, { clientId: id, clientSecret: secret, redirectURI: `${base}/v1/oauth/${name}/callback` });
    else if (!errors.includes(NEED_URL)) errors.push(NEED_URL);
  }
  return { providers, errors };
}
const NEED_URL = "CONNECTIONS_PUBLIC_URL is required when an oauth client is set";
