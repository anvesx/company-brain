import { type Connector, createFolderConnector } from "@anvesx/connector-kit";
import { createDriveConnector, createGithubConnector } from "@anvesx/connectors";

type Env = Record<string, string | undefined>;
const need = (kind: string, env: Env, names: string[]): string[] => {
  const absent = names.filter((n) => !env[n]);
  if (absent.length > 0) throw new Error(`BRAIN_CONNECTOR=${kind} needs ${absent.join(", ")}`);
  return names.map((n) => env[n] as string);
};

/** The source whose metadata fills the graph: folder, github or drive, configured as in the rag app. */
export function connectorFromEnv(env: Env): Connector {
  const kind = env.BRAIN_CONNECTOR;
  if (kind === "folder") return createFolderConnector("folder", need(kind, env, ["BRAIN_FOLDER_ROOT"])[0] as string);
  if (kind === "drive") {
    const [token] = need(kind, env, ["DRIVE_ACCESS_TOKEN"]);
    return createDriveConnector({ id: "drive", listToken: token as string, ...(env.BRAIN_DRIVE_ROOT_URL && { rootUrl: env.BRAIN_DRIVE_ROOT_URL }) });
  }
  if (kind === "github") {
    const [token, slug] = need(kind, env, ["GITHUB_TOKEN", "BRAIN_GITHUB_REPO"]);
    const m = /^([^/\s]+)\/([^/\s]+)$/.exec(slug as string);
    if (!m) throw new Error("BRAIN_GITHUB_REPO must be owner/repo");
    const base = env.BRAIN_GITHUB_API_URL;
    return createGithubConnector({ id: "github", owner: m[1] as string, repo: m[2] as string, listToken: token as string, ...(base && { baseUrl: base }) });
  }
  throw new Error("BRAIN_CONNECTOR must be folder, github or drive");
}
