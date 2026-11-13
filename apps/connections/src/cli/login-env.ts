type Env = Record<string, string | undefined>;
export type LoginEnv = {
  databaseUrl: string;
  secret: string;
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  issuer?: string;
  production: boolean;
  trustedProxies: string[];
};

const NEED = ["LOGIN_DATABASE_URL", "LOGIN_SECRET", "LOGIN_GOOGLE_CLIENT_ID", "LOGIN_GOOGLE_CLIENT_SECRET", "CONNECTIONS_PUBLIC_URL"] as const;

/**
 * Google sign-in for the page. No `LOGIN_*` setting at all means no page, only the bearer API.
 * Any one of them means all of `NEED` must be set. `LOGIN_GOOGLE_ISSUER` points at another OIDC server (tests only; default is Google).
 */
export function loginFromEnv(env: Env): { login?: LoginEnv; errors: string[] } {
  if (!NEED.slice(0, 4).some((k) => env[k])) return { errors: [] };
  const missing = NEED.filter((k) => !env[k]);
  if (missing.length > 0) return { errors: [`Google sign-in needs ${missing.join(", ")}`] };
  const [databaseUrl, secret, clientId, clientSecret, baseUrl] = NEED.map((k) => env[k] as string) as [string, string, string, string, string];
  return {
    errors: [],
    login: {
      databaseUrl,
      secret,
      clientId,
      clientSecret,
      baseUrl: baseUrl.replace(/\/+$/, ""),
      ...(env.LOGIN_GOOGLE_ISSUER && { issuer: env.LOGIN_GOOGLE_ISSUER }),
      production: env.CONNECTIONS_PRODUCTION === "1",
      trustedProxies: (env.CONNECTIONS_TRUSTED_PROXIES ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    },
  };
}
