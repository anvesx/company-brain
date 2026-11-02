import type { Deps } from "../deps.js";
import { writeTokenFile } from "./write-token-file.js";

/** The one place routes rewrite `BRAIN_USER_TOKENS_FILE` after the accounts change. Does nothing when no file is configured. */
export const rewriteTokens = (d: Pick<Deps, "store" | "tokensFile">): void => {
  if (d.tokensFile) writeTokenFile(d.store, d.tokensFile);
};
