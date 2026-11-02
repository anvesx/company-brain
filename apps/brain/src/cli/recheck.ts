import { readFileSync, statSync } from "node:fs";
import type { Recheck } from "../live/recheck.js";
import { sourceRecheck } from "../live/source-recheck.js";
import { connectorFromEnv } from "./connector.js";
import { userKey } from "./user-key.js";

type Env = Record<string, string | undefined>;
type Tokens = Record<string, Record<string, string>>;

function load(file: string): Tokens {
  if (process.platform !== "win32" && (statSync(file).mode & 0o077) !== 0) {
    throw new Error(`BRAIN_USER_TOKENS_FILE ${file} is readable by group or others; run chmod 600`);
  }
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  const users = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? Object.values(parsed) : undefined;
  const flat = (u: unknown) => typeof u === "object" && u !== null && Object.values(u).every((t) => typeof t === "string" && t !== "");
  if (!users?.every(flat)) throw new Error(`BRAIN_USER_TOKENS_FILE ${file} must be {"tenant:user": {source: token}} with string tokens`);
  return parsed as Tokens;
}

/** Per-query source recheck, on when `BRAIN_USER_TOKENS_FILE` names a JSON map of `tenant:user` to source to token. Otherwise undefined. */
export function recheckFromEnv(env: Env): Recheck | undefined {
  const file = env.BRAIN_USER_TOKENS_FILE;
  if (!file) return undefined;
  const tokens = load(file);
  const connector = connectorFromEnv(env);
  return sourceRecheck({
    connectors: { [connector.id]: connector },
    tokenFor: (caller, source) => tokens[userKey(caller.tenant, caller.user)]?.[source],
  });
}
