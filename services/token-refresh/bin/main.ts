import { hostname } from "node:os";
import { createIdentity, type IdentityConfig, openSqlite } from "@anvesx/identity";
import { sweep } from "../src/index.js";

const INTERVAL_MS = 15 * 60_000;

/** Read a required setting from the environment, or stop with a message that names it. */
const need = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
};

/**
 * The refresh service as a process. It opens the same SQLite file identity uses, runs one sweep, prints one JSON
 * report line, and with `--once` exits; without it, it sweeps again every 15 minutes until it is stopped.
 * Settings: DATABASE_PATH, BASE_URL, AUTH_SECRET, SEAL_KEY, PROVIDERS (JSON list), and the providers' own
 * <ID>_CLIENT_ID / <ID>_CLIENT_SECRET. REPLICA names this process in the lease column (default host and pid).
 */
async function main(): Promise<void> {
  const baseUrl = need("BASE_URL");
  const config: IdentityConfig = {
    baseUrl,
    resource: `${baseUrl}/mcp`,
    secret: need("AUTH_SECRET"),
    sealKey: need("SEAL_KEY"),
    database: openSqlite(need("DATABASE_PATH")),
    providers: JSON.parse(need("PROVIDERS")) as NonNullable<IdentityConfig["providers"]>,
  };
  const identity = createIdentity(config);
  const lease = process.env["REPLICA"] ?? `${hostname()}-${process.pid}`;
  const tick = async (): Promise<void> => {
    const adapter = await identity.adapter();
    const report = await sweep({ adapter, refresh: identity.refreshAccount, now: Date.now, lease });
    console.log(JSON.stringify({ at: new Date().toISOString(), lease, ...report }));
  };
  await tick();
  if (process.argv.includes("--once")) return process.exit(0);
  // The next tick waits for the one before it, so a slow sweep is never overlapped by its own replica.
  for (;;) {
    await new Promise((wake) => setTimeout(wake, INTERVAL_MS));
    await tick();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
