import type { Connector } from "@brain/connector-kit";
import { createFolderConnector } from "@brain/connector-kit";
import { createDriveConnector, createGithubConnector } from "@brain/connectors";
import type { BrainEnv, Env } from "../config/index.js";

export type Built = { connector: Connector; token: string };

const missing = (kind: string, names: string[]): Error => new Error(`BRAIN_CONNECTOR=${kind} needs ${names.join(", ")}`);

/**
 * The tenant's source from the environment, or undefined for the demo.
 * folder: BRAIN_FOLDER_ROOT. github: GITHUB_TOKEN and BRAIN_GITHUB_REPO=owner/repo (BRAIN_GITHUB_API_URL for Enterprise).
 * drive: DRIVE_ACCESS_TOKEN (BRAIN_DRIVE_ROOT_URL to override the API root). The token indexes and fetches as the tenant;
 * github and drive enforce each user's own token at the source, so they also need BRAIN_USER_TOKENS.
 */
export function connectorFromEnv(brain: BrainEnv, env: Env): Built | undefined {
  const kind = brain.connector ?? (brain.folderRoot ? "folder" : undefined);
  if (kind === undefined) return undefined;
  if (kind === "folder") {
    if (!brain.folderRoot) throw missing(kind, ["BRAIN_FOLDER_ROOT"]);
    // The folder connector ignores the token; only the tenant check matters.
    return { connector: createFolderConnector("folder", brain.folderRoot), token: "folder" };
  }
  if (kind === "drive") {
    const token = env.DRIVE_ACCESS_TOKEN;
    if (!token) throw missing(kind, ["DRIVE_ACCESS_TOKEN"]);
    const rootUrl = env.BRAIN_DRIVE_ROOT_URL;
    return { connector: createDriveConnector({ id: "drive", listToken: token, ...(rootUrl && { rootUrl }) }), token };
  }
  const token = env.GITHUB_TOKEN;
  const slug = /^([^/\s]+)\/([^/\s]+)$/.exec(env.BRAIN_GITHUB_REPO ?? "");
  const absent = [...(token ? [] : ["GITHUB_TOKEN"]), ...(slug ? [] : ["BRAIN_GITHUB_REPO (owner/repo)"])];
  if (!token || !slug) throw missing(kind, absent);
  const baseUrl = env.BRAIN_GITHUB_API_URL;
  const [, owner = "", repo = ""] = slug;
  return { connector: createGithubConnector({ id: "github", owner, repo, listToken: token, ...(baseUrl && { baseUrl }) }), token };
}
