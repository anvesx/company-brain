import { join } from "node:path";
import { MIN_SECRET_CHARS } from "../auth/claims.js";

export type Env = Record<string, string | undefined>;
export const CONNECTOR_KINDS = ["folder", "github", "drive"] as const;
export type ConnectorKind = (typeof CONNECTOR_KINDS)[number];
export type BrainEnv = {
  port: number;
  auditDbPath: string;
  anchorPath: string;
  demo: boolean;
  /** Bind address. Absent: loopback. */
  host?: string;
  /** Host and Origin allow-lists (Host values include the port). Absent: loopback on the bound port. */
  allowedHosts?: string[];
  allowedOrigins?: string[];
  dataDir?: string;
  authSecret?: string;
  /** A directory of documents with `<name>.acl.json` sidecars, served as one tenant. */
  folderRoot?: string;
  /** Which source to serve (`BRAIN_CONNECTOR`). Absent with a folder root: folder. */
  connector?: ConnectorKind;
  tenant?: string;
  /** JSON file `{"tenant:user": "credential"}`: each user's own token at the source. */
  userTokensPath?: string;
};

const list = (raw: string | undefined): string[] | undefined =>
  raw === undefined
    ? undefined
    : raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

export function readEnv(env: Env): BrainEnv {
  const raw = env.BRAIN_PORT ?? "3000";
  const port = Number(raw);
  if (!/^\d{1,5}$/.test(raw) || port > 65535) throw new Error(`invalid BRAIN_PORT: ${raw}`);
  const secret = env.BRAIN_AUTH_SECRET;
  if (secret !== undefined && secret.length < MIN_SECRET_CHARS) throw new Error(`BRAIN_AUTH_SECRET must be at least ${MIN_SECRET_CHARS} characters`);
  const dataDir = env.BRAIN_DATA_DIR || undefined;
  if (dataDir && secret === undefined)
    throw new Error("BRAIN_AUTH_SECRET is required when BRAIN_DATA_DIR is set: persistent data must not sit behind unsigned tokens");
  const kind = env.BRAIN_CONNECTOR || undefined;
  if (kind !== undefined && !(CONNECTOR_KINDS as readonly string[]).includes(kind))
    throw new Error(`invalid BRAIN_CONNECTOR: ${kind} (use ${CONNECTOR_KINDS.join(", ")})`);
  if (env.BRAIN_FOLDER_ROOT && !env.BRAIN_TENANT) throw new Error("BRAIN_TENANT is required with BRAIN_FOLDER_ROOT");
  if (kind && !env.BRAIN_TENANT) throw new Error("BRAIN_TENANT is required with BRAIN_CONNECTOR");
  const under = (name: string, fallback: string) => (dataDir ? join(dataDir, name) : fallback);
  const allowedHosts = list(env.BRAIN_ALLOWED_HOSTS);
  const allowedOrigins = list(env.BRAIN_ALLOWED_ORIGINS);
  return {
    ...(dataDir && { dataDir }),
    ...(secret !== undefined && { authSecret: secret }),
    ...(env.BRAIN_HOST && { host: env.BRAIN_HOST }),
    ...(allowedHosts && { allowedHosts }),
    ...(allowedOrigins && { allowedOrigins }),
    ...(env.BRAIN_FOLDER_ROOT && { folderRoot: env.BRAIN_FOLDER_ROOT }),
    ...((env.BRAIN_FOLDER_ROOT || kind) && { tenant: env.BRAIN_TENANT as string }),
    ...(kind && { connector: kind as ConnectorKind }),
    ...(env.BRAIN_USER_TOKENS && { userTokensPath: env.BRAIN_USER_TOKENS }),
    port,
    auditDbPath: env.BRAIN_AUDIT_DB ?? under("audit.db", "brain-audit.db"),
    anchorPath: env.BRAIN_ANCHOR ?? under("anchors.log", "brain-anchors.log"),
    demo: env.BRAIN_DEMO === "1",
  };
}
