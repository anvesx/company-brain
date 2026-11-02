import { createBrainApp } from "../app.js";
import { resolveAuditKey } from "../auth/audit-key.js";
import { requireAuthMode } from "../auth/mode.js";
import { type Env, readEnv, readOps } from "../config/index.js";
import type { BrainApp } from "../types.js";
import { sourceFor } from "./sources.js";

export type Io = { log: (line: string) => void; error: (line: string) => void };
export type Started = { app: BrainApp; forceExitMs: number; host: string };

/**
 * Reads the environment, refuses an insecure combination, starts the app, then ingests each tenant once.
 * Throws a plain Error for any configuration problem, before any port is opened.
 */
export async function startFromEnv(env: Env, io: Io): Promise<Started> {
  const brain = readEnv(env);
  const ops = readOps(env, brain.port);
  if (!brain.demo && !brain.folderRoot) throw new Error("no source configured. Set BRAIN_FOLDER_ROOT and BRAIN_TENANT, or BRAIN_DEMO=1 for the demo connector");
  requireAuthMode(brain);
  const auditKey = resolveAuditKey(env, io.error);
  const source = sourceFor(brain, env);
  const { tenants, ...deps } = source;
  const app = await createBrainApp({
    ...deps,
    cursors: brain.dataDir ? undefined : deps.cursors,
    dataDir: brain.dataDir,
    auditKey,
    auditDbPath: brain.auditDbPath,
    anchorPath: brain.anchorPath,
    transport: "http",
    port: brain.port,
    host: brain.host,
    allowedHosts: brain.allowedHosts,
    allowedOrigins: brain.allowedOrigins,
    timeouts: ops.timeouts,
    drainMs: ops.drainMs,
    healthPort: ops.healthPort,
  });
  try {
    for (const tenant of tenants) {
      const { indexed, failures, quarantined } = await app.ingest(tenant);
      io.log(`brain: ingested tenant ${tenant}: ${indexed} indexed, ${failures.length} failed, ${quarantined.length} quarantined`);
      for (const f of failures) io.error(`brain: ingest failed for ${tenant} ${f.address}: ${f.error}`);
      for (const f of quarantined) io.error(`brain: quarantined for ${tenant} ${f.address}: ${f.error}`);
    }
  } catch (error) {
    await app.close();
    throw error;
  }
  return { app, forceExitMs: ops.forceExitMs, host: brain.host ?? "127.0.0.1" };
}
