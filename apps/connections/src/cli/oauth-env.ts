import { createBuiltinRegistry, type Registry } from "@anvesx/connectors";
import { appOf, type OAuthProvider, oauthProvider } from "../oauth/providers.js";

type Env = Record<string, string | undefined>;
const NEED_URL = "CONNECTIONS_PUBLIC_URL is required when an oauth client is set";

/** `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, and so on for each oauth app in the built-in catalog; the redirect is `CONNECTIONS_PUBLIC_URL/v1/oauth/<app>/callback`. */
export function oauthFromEnv(env: Env, catalog: Registry = createBuiltinRegistry()): { providers: Record<string, OAuthProvider>; errors: string[] } {
  const providers: Record<string, OAuthProvider> = {};
  const errors: string[] = [];
  const base = env.CONNECTIONS_PUBLIC_URL?.replace(/\/+$/, "");
  const apps = new Set(
    catalog
      .list()
      .filter((e) => e.manifest.auth.kind === "oauth2")
      .map((e) => appOf(e.manifest)),
  );
  for (const name of apps) {
    const prefix = name.toUpperCase().replace(/-/g, "_");
    const [id, secret] = [env[`${prefix}_CLIENT_ID`], env[`${prefix}_CLIENT_SECRET`]];
    if (!id && !secret) continue;
    if (!id || !secret) errors.push(`${prefix}_CLIENT_ID and ${prefix}_CLIENT_SECRET must be set together`);
    else if (base) providers[name] = oauthProvider(name, { clientId: id, clientSecret: secret, redirectURI: `${base}/v1/oauth/${name}/callback` });
    else if (!errors.includes(NEED_URL)) errors.push(NEED_URL);
  }
  return { providers, errors };
}
