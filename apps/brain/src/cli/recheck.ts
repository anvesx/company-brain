import { readFileSync } from "node:fs";
import type { Recheck } from "../live/recheck.js";
import { sourceRecheck } from "../live/source-recheck.js";
import { connectorFromEnv } from "./connector.js";

type Env = Record<string, string | undefined>;
type Tokens = Record<string, Record<string, string>>;

/** Per-query source recheck, on when `BRAIN_USER_TOKENS_FILE` names a JSON map of user to source to token. Otherwise undefined. */
export function recheckFromEnv(env: Env): Recheck | undefined {
  const file = env.BRAIN_USER_TOKENS_FILE;
  if (!file) return undefined;
  const tokens = JSON.parse(readFileSync(file, "utf8")) as Tokens;
  const connector = connectorFromEnv(env);
  return sourceRecheck({
    connectors: { [connector.id]: connector },
    tokenFor: (caller, source) => tokens[caller.user]?.[source],
  });
}
