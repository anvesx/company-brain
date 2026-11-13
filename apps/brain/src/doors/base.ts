import type { ProviderEntry } from "@anvesx/identity";
import { ConfigError } from "../serve/local/checks.js";

type Env = Record<string, string | undefined>;
const key = (id: string): string => `${id.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_BASE_URL`;

/** `<ID>_BASE_URL`: an origin that stands in for the provider's hosts (a self-hosted server, or a local provider for a demo). Undefined when unset. */
export const baseUrl = (id: string, env: Env): string | undefined => {
  const raw = env[key(id)];
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("scheme");
    return url.origin;
  } catch {
    throw new ConfigError(`${key(id)} must be an http(s) origin`);
  }
};

/** An entry with a base URL talks OAuth to `<base>/authorize`, `/token` and `/userinfo`; without one it is unchanged. */
export const withBase = (entry: ProviderEntry, env: Env): ProviderEntry => {
  const base = baseUrl(entry.id, env);
  if (!base) return entry;
  return { ...entry, kind: "generic", generic: { authorizationUrl: `${base}/authorize`, tokenUrl: `${base}/token`, userInfoUrl: `${base}/userinfo` } };
};
