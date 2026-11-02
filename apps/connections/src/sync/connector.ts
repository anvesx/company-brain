import type { Registry } from "@anvesx/connectors";
import type { Connector } from "@brain/connector-kit";
import type { Account } from "../accounts/types.js";
import type { Deps } from "../deps.js";
import { REPO } from "./repo.js";

/** The graph `source` of everything one account writes, so one disconnect closes only its edges. */
export const sourceOf = (a: Pick<Account, "provider" | "id">): string => `${a.provider}:${a.id}`;

/** The adapter for this account from its manifest, listing with the account's own token. A repo-scoped app (GitHub) needs `owner/repo`. */
export function connectorFor(
  a: Account,
  token: string,
  repo: string | undefined,
  cfg: NonNullable<Deps["sync"]>,
  catalog: Registry,
): Connector | { error: string } {
  const m = catalog.get(a.provider, a.tenant);
  if (!m) return { error: `no connector for provider ${a.provider}` };
  const parsed = m.needsRepo ? REPO.exec(repo ?? "") : null;
  if (m.needsRepo && !parsed) return { error: `body must be {repo: owner/repo} for a ${m.id} account` };
  const baseUrl = ({ github: cfg.githubApiUrl, drive: cfg.driveRootUrl } as Record<string, string | undefined>)[m.id];
  const target = parsed && { owner: parsed[1] as string, name: parsed[2] as string };
  return m.load({ id: sourceOf(a), listToken: token, ...(baseUrl && { baseUrl }), ...(target && { repo: target }) });
}
