import { DatabaseSync } from "node:sqlite";
import { createGraphStore, toAsync } from "@anvesx/graph-store";
import { createIdentity, IdentityError, migrateDatabase } from "@anvesx/identity";
import { type BrainApp, createBrainApp } from "../../app.js";
import { recheckFromEnv } from "../../cli/recheck.js";
import { doorsFromEnv } from "../../doors/env.js";
import { ConfigError, readServeConfig } from "./config.js";
import { cursorKeyFrom } from "./key.js";

/** One line for anything an operator can fix; a bug still shows its stack. */
export const explain = (error: unknown, port: number): string | undefined => {
  if (error instanceof ConfigError) return error.message;
  if (error instanceof IdentityError) return error.message;
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  if (code === "EADDRINUSE") return `port ${port} in use`;
  if (code === "EACCES") return (error as Error).message; // e.g. "listen EACCES: permission denied 127.0.0.1:80"
  if (code === "ERR_SQLITE_ERROR") return `database: ${(error as Error).message}`;
  return undefined;
};

/** Opens both databases, starts identity, then listens. The settings are all checked before any of that. */
export async function startBrain(env: Record<string, string | undefined>): Promise<{ app: BrainApp; config: ReturnType<typeof readServeConfig> }> {
  const config = readServeConfig(env);
  // Doors (Google login, connector catalog, seal key) are checked before the database file is opened, like every other setting.
  const doors = doorsFromEnv(env, config.secret);
  const identityConfig = {
    baseUrl: config.baseUrl,
    secret: config.secret,
    database: new DatabaseSync(config.authDb),
    resource: `${config.baseUrl}/mcp`,
    ...doors,
  };
  await migrateDatabase(identityConfig);
  const identity = createIdentity(identityConfig);
  await identity.migrate();
  const recheck = recheckFromEnv(env);
  const app = createBrainApp({
    ...(recheck && { recheck }),
    store: toAsync(createGraphStore({ path: config.graphPath })),
    identity,
    cursorKey: cursorKeyFrom(config.secret),
    port: config.port,
    ...(config.host && { host: config.host }),
  });
  await app.listen();
  return { app, config };
}
