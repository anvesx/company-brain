import type { BetterAuthOptions } from "better-auth";
import { type ConnectorConfig, checkConnectors } from "./connectors/catalog.js";
import { IdentityError } from "./errors.js";
import { type InstallClient, type InstallTemplate, TEMPLATES } from "./install/templates.js";
import { httpsOrLoopback, parseUrl } from "./install/url.js";

/** A message the package asks the host to deliver (invitation emails). */
export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
}

/** A static OAuth client the host trusts without dynamic registration. */
export interface StaticClient {
  id: string;
  name: string;
  redirectUris: string[];
}

export interface IdentityConfig extends ConnectorConfig {
  /** Public origin of this service, for example https://brain.example.com. */
  baseUrl: string;
  /** At least 32 characters. Signs cookies and encrypts the signing keys. */
  secret: string;
  /** A node:sqlite DatabaseSync in tests, or a Kysely dialect config in production. */
  database: BetterAuthOptions["database"];
  /** The canonical MCP resource URL. Access tokens are issued for this audience. https, or http on loopback. */
  resource: string;
  /** Access token life in whole seconds, 1 to 900. Default 900. */
  accessTokenTtlSeconds?: number;
  /** Clock in epoch milliseconds. The default is the wall clock. */
  now?: () => number;
  sendEmail?: (message: OutgoingEmail) => Promise<void>;
  clients?: StaticClient[];
  /** Static tiles shown when there are no connections. Link-able connectors come from `providers`. */
  catalog?: { name: string; description: string }[];
  /** The organization's connections, for the connections page. Without it the list is empty. */
  connections?: (tenant: string) => Promise<{ name: string; detail: string }[]>;
  /** The name each MCP client files the brain under in the install guide: 1 to 63 of a-z, 0-9, hyphen. Default company-brain. */
  serverName?: string;
  /** True only behind a reverse proxy you run: the last X-Forwarded-For hop is then the client address. Default false. */
  trustProxy?: boolean;
  /** Install templates per client, for when a vendor changes its config format. Default: the built-in ones. */
  templates?: Readonly<Record<InstallClient, InstallTemplate>>;
}

type Optional = "sendEmail" | "clients" | "catalog" | "connections" | "providers" | "sealKey" | "google";
export type ResolvedConfig = Required<Omit<IdentityConfig, Optional>> & Pick<IdentityConfig, Optional>;

const bad = (field: string, why: string): IdentityError => new IdentityError("BAD_INPUT", why, field);

/** Check every field and fill the defaults. Throws BAD_INPUT naming the first bad field. */
export const resolveConfig = (cfg: IdentityConfig): ResolvedConfig => {
  if (!httpsOrLoopback(cfg.baseUrl)) throw bad("baseUrl", "must be https, or http on localhost");
  if (typeof cfg.secret !== "string" || cfg.secret.length < 32) throw bad("secret", "must be at least 32 characters");
  if (!httpsOrLoopback(cfg.resource) || parseUrl(cfg.resource)?.username) throw bad("resource", "must be https, or http on localhost");
  const ttl = cfg.accessTokenTtlSeconds ?? 900;
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > 900) throw bad("accessTokenTtlSeconds", "must be a whole number from 1 to 900");
  const serverName = cfg.serverName ?? "company-brain";
  if (!/^[a-z0-9-]{1,63}$/.test(serverName)) throw bad("serverName", "use 1 to 63 of a-z, 0-9 and hyphen");
  for (const [i, client] of (cfg.clients ?? []).entries()) {
    for (const [j, uri] of client.redirectUris.entries()) {
      if (!httpsOrLoopback(uri)) throw bad(`clients[${i}].redirectUris[${j}]`, "must be https, or http on loopback");
    }
  }
  checkConnectors(cfg);
  // The only wall-clock read in the package is this default.
  return {
    ...cfg,
    baseUrl: cfg.baseUrl.replace(/\/$/, ""),
    accessTokenTtlSeconds: ttl,
    now: cfg.now ?? Date.now,
    env: cfg.env ?? process.env,
    serverName,
    trustProxy: cfg.trustProxy ?? false,
    templates: cfg.templates ?? TEMPLATES,
  };
};
