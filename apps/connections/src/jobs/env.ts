import { loadKeyring } from "@anvesx/connector-vault";
import type { JobsConfig } from "./queue.js";

type Env = Record<string, string | undefined>;
export type DataConfig = { vaultKeys: string; webhookSecret?: string; cursorPath: string; jobs: JobsConfig };

const int = (env: Env, name: string, dflt: number, max: number, errors: string[]): number => {
  const raw = env[name] ?? String(dflt);
  const n = Number(raw);
  if (!/^\d{1,6}$/.test(raw) || n < 1 || n > max) errors.push(`${name} must be an integer from 1 to ${max}`);
  return n;
};

/** The Postgres side: `CONNECTIONS_DATABASE_URL` (vault and queue), `CONNECTOR_VAULT_KEYS` (checked against the auth secret), the webhook secret and the job limits. */
export function dataFromEnv(env: Env, authSecret: string, dbPath: string): { data?: DataConfig; errors: string[] } {
  const errors: string[] = [];
  const databaseUrl = env.CONNECTIONS_DATABASE_URL ?? "";
  if (!databaseUrl) errors.push("CONNECTIONS_DATABASE_URL is required");
  try {
    loadKeyring(env.CONNECTOR_VAULT_KEYS, authSecret);
  } catch (e) {
    errors.push((e as Error).message);
  }
  const hook = env.CONNECTIONS_GITHUB_WEBHOOK_SECRET;
  if (hook !== undefined && hook.length < 16) errors.push("CONNECTIONS_GITHUB_WEBHOOK_SECRET must be 16+ characters");
  const pollMinutes = int(env, "CONNECTIONS_POLL_MINUTES", 15, 59, errors);
  const tenantConcurrency = int(env, "CONNECTIONS_TENANT_CONCURRENCY", 2, 64, errors);
  const maxBacklogPerTenant = int(env, "CONNECTIONS_MAX_BACKLOG_PER_TENANT", 500, 100_000, errors);
  if (errors.length > 0) return { errors };
  return {
    errors,
    data: {
      vaultKeys: env.CONNECTOR_VAULT_KEYS as string,
      ...(hook && { webhookSecret: hook }),
      cursorPath: env.CONNECTIONS_CURSOR_PATH ?? `${dbPath}.cursors`,
      jobs: { databaseUrl, pollMinutes, tenantConcurrency, maxBacklogPerTenant },
    },
  };
}
