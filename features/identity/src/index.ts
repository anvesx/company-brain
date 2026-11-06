import type { AuthContext } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { ensureStaticClients, revokeClient } from "./auth/clients.js";
import { authOptions, buildAuth } from "./auth/options.js";
import { type IdentityConfig, resolveConfig } from "./config.js";
import { createRefresher } from "./connectors/refresh.js";
import { readNames } from "./consent/names.js";
import { consentView } from "./consent/view.js";
import { createLimits } from "./guard/limits.js";
import { createCsrf, createPort, createProtect } from "./port.js";
import { buildRoutes } from "./routes/mount.js";

export type { IdentityConfig, OutgoingEmail, StaticClient } from "./config.js";
export { catalogTiles, type ProviderEntry, providerSecrets } from "./connectors/catalog.js";
export { BATCH } from "./connectors/refresh.js";
export { open, parseSealKey, seal } from "./connectors/seal.js";
export { IDENTITY_ERROR_CODES, IdentityError, type IdentityErrorCode, InstallRenderError, RefreshError } from "./errors.js";
export {
  INSTALL_CLIENTS,
  type InstallClient,
  type InstallManifest,
  type InstallOutput,
  type InstallTemplate,
  renderInstall,
  TEMPLATES,
} from "./install/render.js";
export { dueWhere, LEASE_MS, releaseLease, takeLease, WINDOW_MS } from "./lease/lease.js";
export { BUSY_MS, openSqlite } from "./lease/open.js";
export type { Row as AccountRow } from "./lease/store.js";
export { breachedPasswords } from "./policy/password.js";
export type { Caller, IdentityPort } from "./port.js";

/**
 * Create or update the tables. Run it, and wait for it, before `createIdentity`: better-auth checks the schema
 * as soon as it boots, so tables made afterwards would first show up as a "schema mismatch" error in the log.
 */
export const migrateDatabase = async (input: IdentityConfig): Promise<void> => {
  const notBooted = (): never => {
    throw new Error("better-auth has not booted yet");
  };
  await (await getMigrations(authOptions(resolveConfig(input), notBooted))).runMigrations();
};

/** Build the identity service: sign-in, organizations, and the OAuth server MCP clients use. Throws BAD_INPUT on a bad config. */
export const createIdentity = (input: IdentityConfig) => {
  const cfg = resolveConfig(input);
  const auth = buildAuth(cfg);
  const adapter = async () => (await auth.$context).adapter as AuthContext["adapter"];
  const { accessToken, refreshAccount } = createRefresher(auth, cfg, adapter);
  const port = { ...createPort(auth, cfg, adapter), accessToken };
  return {
    auth,
    port,
    adapter,
    /** Refresh one connector account now, whatever its expiry. Throws RefreshError. Used by the token-refresh service. */
    refreshAccount,
    routes: buildRoutes(auth, cfg, createLimits(adapter, cfg.now)),
    protect: createProtect(port, cfg),
    csrf: createCsrf(auth, cfg),
    revokeClient: async (headers: Headers, clientId: string) => revokeClient(auth, await adapter(), headers, clientId),
    /** The email on file and the linked account ids for one person, so an app never reads the identity tables itself. */
    names: async (userId: string) => readNames(await adapter(), userId),
    consentView: async (headers: Headers, query: string) => consentView(auth, await adapter(), headers, query),
    /** Create or update the tables, then add the host's static clients. Run once at start. */
    migrate: async () => {
      await (await getMigrations(auth.options)).runMigrations();
      await ensureStaticClients(await adapter(), cfg);
    },
  };
};
