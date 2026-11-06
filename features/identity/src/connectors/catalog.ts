import { IdentityError } from "../errors.js";
import { parseSealKey } from "./seal.js";

export type Env = Readonly<Record<string, string | undefined>>;

/** One connector tile. `built-in` uses better-auth's own provider; `generic` takes endpoints from `generic`. */
export interface ProviderEntry {
  id: string;
  name: string;
  description: string;
  scopes: string[];
  kind: "built-in" | "generic" | "mcp";
  generic?: { discoveryUrl?: string; authorizationUrl?: string; tokenUrl?: string; userInfoUrl?: string; accessType?: "offline" };
}

/** The config fields that belong to connector accounts. `IdentityConfig` extends this. */
export interface ConnectorConfig {
  /** The connector catalog, in the order the tiles show. Secrets are never here: they come from `env`. */
  providers?: ProviderEntry[];
  /** 64 hex characters. Seals tokens at rest. Required when `providers` is not empty or `google` is set. */
  sealKey?: string;
  /** Where `<ID>_CLIENT_ID` and `<ID>_CLIENT_SECRET` are read. Default process.env. */
  env?: Env;
  /** Turns on Continue with Google. Client id and secret are the host's, never in the repo. */
  google?: { clientId: string; clientSecret: string; discoveryUrl?: string };
}

/** `my-tool` reads MY_TOOL_CLIENT_ID and MY_TOOL_CLIENT_SECRET. Null unless both are set and not empty. */
export const providerSecrets = (id: string, env: Env): { clientId: string; clientSecret: string } | null => {
  const prefix = id.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const [clientId, clientSecret] = [env[`${prefix}_CLIENT_ID`], env[`${prefix}_CLIENT_SECRET`]];
  return clientId && clientSecret ? { clientId, clientSecret } : null;
};

/** The tiles for the page: the entries as given, plus whether each can be linked. No secret is copied. */
export const catalogTiles = (entries: readonly ProviderEntry[], env: Env): (ProviderEntry & { configured: boolean })[] =>
  entries.map((entry) => ({ ...entry, configured: providerSecrets(entry.id, env) !== null }));

/** Boot checks: a seal key is needed for connectors and for Google (its tokens are stored too), and no connector may take the id `google` (the sign-in door). */
export const checkConnectors = (cfg: ConnectorConfig): void => {
  if (cfg.sealKey !== undefined || cfg.providers?.length || cfg.google) parseSealKey(cfg.sealKey);
  if (cfg.providers?.some((p) => p.id === "google")) throw new IdentityError("BAD_INPUT", "google is reserved for sign-in", "providers");
};

/** The slice of a better-auth social provider this package calls. */
export interface SocialProvider {
  id: string;
  refreshAccessToken?: (refreshToken: string) => Promise<{ accessToken?: string; refreshToken?: string; accessTokenExpiresAt?: Date; idToken?: string }>;
  getUserInfo: (tokens: { accessToken?: string; idToken?: string }) => Promise<{ user: { email?: string | null } } | null>;
}
