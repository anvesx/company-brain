import { ConfigError, checkBaseUrl, usableFile, writableDir } from "./checks.js";

export { ConfigError };

type Env = Record<string, string | undefined>;
export interface ServeConfig {
  graphPath: string;
  authDb: string;
  secret: string;
  port: number;
  host: string | undefined;
  baseUrl: string;
}

const MIN_SECRET_CHARS = 32;

const need = (env: Env, name: string): string => {
  const value = env[name];
  if (!value) throw new ConfigError(`${name} is required`);
  return value;
};

/** Reads and checks every setting up front, so nothing is created or migrated for a config that was wrong. */
export function readServeConfig(env: Env): ServeConfig {
  const graphPath = need(env, "BRAIN_GRAPH_PATH");
  const authDb = need(env, "BRAIN_AUTH_DB");
  const secret = need(env, "BRAIN_AUTH_SECRET");
  if (secret.length < MIN_SECRET_CHARS) throw new ConfigError(`BRAIN_AUTH_SECRET must be at least ${MIN_SECRET_CHARS} characters`);
  // Digits only: Number() would also accept "0x50" and "1e3".
  const raw = env.BRAIN_PORT ?? "8787";
  const port = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new ConfigError(`BRAIN_PORT must be a whole number from 1 to 65535, got "${env.BRAIN_PORT}"`);
  const baseUrl = checkBaseUrl(env.BRAIN_BASE_URL || `http://localhost:${port}`); // the normalised origin, which better-auth then uses
  writableDir("BRAIN_GRAPH_PATH", graphPath);
  writableDir("BRAIN_AUTH_DB", authDb);
  usableFile("BRAIN_GRAPH_PATH", graphPath);
  usableFile("BRAIN_AUTH_DB", authDb);
  return { graphPath, authDb, secret, port, host: env.BRAIN_HOST || undefined, baseUrl };
}
