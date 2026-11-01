#!/usr/bin/env node
import { createBrainApp } from "./app.js";
import { resolveAuditKey } from "./auth/audit-key.js";
import { signedPrincipalFor } from "./auth/token.js";
import { DEMO_TENANT, demoDeps, readEnv } from "./config.js";

const env = readEnv(process.env);
if (!env.demo) {
  console.error("brain: no connector configured. Set BRAIN_DEMO=1 to run with the demo connector.");
  process.exit(1);
}
let auditKey: string;
try {
  auditKey = resolveAuditKey(process.env, (msg) => console.error(msg));
} catch (error) {
  console.error(`brain: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
const demo = demoDeps();
const app = await createBrainApp({
  ...demo,
  // Unsigned tokens only in demo mode with no secret; a secret switches to signed tokens.
  principalFor: env.authSecret ? signedPrincipalFor(env.authSecret) : demo.principalFor,
  dataDir: env.dataDir,
  cursors: env.dataDir ? undefined : demo.cursors,
  auditKey,
  auditDbPath: env.auditDbPath,
  anchorPath: env.anchorPath,
  transport: "http",
  port: env.port,
});
for (const tenant of [DEMO_TENANT]) {
  const { indexed, failures, quarantined } = await app.ingest(tenant);
  console.log(`brain: ingested tenant ${tenant}: ${indexed} indexed, ${failures.length} failed, ${quarantined.length} quarantined`);
  for (const f of failures) console.error(`brain: ingest failed for ${tenant} ${f.address}: ${f.error}`);
  for (const f of quarantined) console.error(`brain: quarantined for ${tenant} ${f.address}: ${f.error}`);
}
console.log(
  `brain listening on http://127.0.0.1:${app.port}/mcp (demo tenant: acme, ${env.authSecret ? "signed tokens: mintToken(secret, user, tenant)" : "unsigned demo token alice:acme"})`,
);
const stop = () => void app.close().then(() => process.exit(0));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
