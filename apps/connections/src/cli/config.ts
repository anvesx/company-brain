import { type DataConfig, dataFromEnv } from "../jobs/env.js";
import type { OAuthProvider } from "../oauth/providers.js";
import { type LoginEnv, loginFromEnv } from "./login-env.js";
import { oauthFromEnv } from "./oauth-env.js";

type Env = Record<string, string | undefined>;
export type Config = {
  secret: string;
  dbPath: string;
  graphPath: string;
  /** Tenant admins as `tenant:user`. */
  admins: Set<string>;
  port: number;
  oauth: Record<string, OAuthProvider>;
  /** The Postgres side: the vault keys, the webhook secret, the cursor file and the job limits. */
  data: DataConfig;
  /** Google sign-in for the page. Absent: no page, only the bearer API. */
  login?: LoginEnv;
  /** Development only: lets a custom connector on this machine be registered over http. */
  allowLoopback: boolean;
  /** GitHub REST base URL, for GitHub Enterprise or a test server. */
  githubApiUrl?: string;
};

const ADMIN = /^[^:\s,]+:[^:\s,]+$/;

/** Reads the launcher settings from the environment. Throws one error that names every bad setting. */
export function parseConfig(env: Env): Config {
  const errors: string[] = [];
  const fail = (m: string) => void errors.push(m);
  const secret = env.CONNECTIONS_AUTH_SECRET ?? "";
  if (secret.length < 32) fail("CONNECTIONS_AUTH_SECRET is required and must be 32+ characters");
  const [dbPath, graphPath] = [env.CONNECTIONS_DB_PATH ?? "", env.CONNECTIONS_GRAPH_PATH ?? ""];
  if (!dbPath) fail("CONNECTIONS_DB_PATH is required");
  if (!graphPath) fail("CONNECTIONS_GRAPH_PATH is required");
  const list = env.CONNECTIONS_ADMINS === undefined ? [] : env.CONNECTIONS_ADMINS.split(",").map((s) => s.trim());
  const badAdmin = list.filter((a) => !ADMIN.test(a));
  if (badAdmin.length > 0) fail(`CONNECTIONS_ADMINS entries must be tenant:user, got ${JSON.stringify(badAdmin)}`);
  const rawPort = env.CONNECTIONS_PORT ?? "8788";
  const port = Number(rawPort);
  if (!/^\d{1,5}$/.test(rawPort) || port > 65535) fail("CONNECTIONS_PORT must be an integer from 0 to 65535");
  const data = dataFromEnv(env, secret, dbPath);
  errors.push(...data.errors);
  const oauth = oauthFromEnv(env);
  errors.push(...oauth.errors);
  const login = loginFromEnv(env);
  errors.push(...login.errors);
  if (errors.length > 0) throw new Error(errors.join("; "));
  return {
    data: data.data as DataConfig,
    secret,
    dbPath,
    graphPath,
    admins: new Set(list),
    port,
    oauth: oauth.providers,
    ...(login.login && { login: login.login }),
    allowLoopback: env.CONNECTIONS_ALLOW_LOOPBACK === "1",
    ...(env.CONNECTIONS_GITHUB_API_URL && { githubApiUrl: env.CONNECTIONS_GITHUB_API_URL }),
  };
}
