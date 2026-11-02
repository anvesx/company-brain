import { DEFAULT_TTL_SECONDS, mintToken } from "../auth/mint.js";
import { readTokenPolicy } from "../auth/mode.js";
import type { Env } from "../config/env.js";

const FLAGS = new Set(["--user", "--tenant", "--groups", "--ttl", "--kid"]);

function flagsOf(argv: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i] as string;
    const value = argv[i + 1];
    if (!FLAGS.has(flag)) throw new Error(`unknown flag ${flag}; use ${[...FLAGS].join(" ")}`);
    if (value === undefined) throw new Error(`${flag} needs a value`);
    flags[flag] = value;
  }
  return flags;
}

/**
 * `brain mint-token --user U --tenant T [--groups a,b] [--ttl SECONDS] [--kid K]`. Prints nothing itself: returns the token.
 * Signs with BRAIN_AUTH_SECRET, or with BRAIN_AUTH_KEYS[kid]; never mints past BRAIN_TOKEN_MAX_TTL_SECONDS.
 */
export function mintTokenCli(argv: string[], env: Env, now: () => number = Date.now): string {
  const flags = flagsOf(argv);
  const user = flags["--user"];
  const tenant = flags["--tenant"];
  if (!user) throw new Error("--user is required");
  if (!tenant) throw new Error("--tenant is required");
  const secret = env.BRAIN_AUTH_SECRET;
  if (secret === undefined) throw new Error("BRAIN_AUTH_SECRET is required to mint a token");
  const policy = readTokenPolicy(env);
  const kid = flags["--kid"];
  const key = kid === undefined ? secret : policy.keys?.[kid];
  if (key === undefined) throw new Error(`kid ${JSON.stringify(kid)} is not in BRAIN_AUTH_KEYS`);
  const ttl = flags["--ttl"];
  const ttlSeconds = ttl === undefined ? Math.min(DEFAULT_TTL_SECONDS, policy.maxLifetimeSeconds) : Number(ttl);
  const groups = flags["--groups"]?.split(",") ?? [];
  return mintToken(key, user, tenant, { now, ttlSeconds, groups, ...(kid !== undefined && { kid }), maxLifetimeSeconds: policy.maxLifetimeSeconds });
}
