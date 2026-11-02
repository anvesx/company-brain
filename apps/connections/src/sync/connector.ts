import type { Connector } from "@brain/connector-kit";
import { createDriveConnector, createGithubConnector } from "@brain/connectors";
import type { Account } from "../accounts/types.js";
import type { Deps } from "../deps.js";
import { REPO } from "./repo.js";

/** The graph `source` of everything one account writes, so one disconnect closes only its edges. */
export const sourceOf = (a: Pick<Account, "provider" | "id">): string => `${a.provider}:${a.id}`;

/** The adapter for this account, listing with the account's own token. A github account needs `owner/repo`. */
export function connectorFor(a: Account, token: string, repo: string | undefined, cfg: NonNullable<Deps["sync"]>): Connector | { error: string } {
  const id = sourceOf(a);
  if (a.provider === "drive") return createDriveConnector({ id, listToken: token, ...(cfg.driveRootUrl && { rootUrl: cfg.driveRootUrl }) });
  const m = REPO.exec(repo ?? "");
  if (a.provider !== "github") return { error: `no connector for provider ${a.provider}` };
  if (!m) return { error: "body must be {repo: owner/repo} for a github account" };
  return createGithubConnector({ id, owner: m[1] as string, repo: m[2] as string, listToken: token, ...(cfg.githubApiUrl && { baseUrl: cfg.githubApiUrl }) });
}
