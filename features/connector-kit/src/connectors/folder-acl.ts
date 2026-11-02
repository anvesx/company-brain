import { readFile, realpath } from "node:fs/promises";
import { type Acl, AclSchema } from "@anvesx/core-types";
import { ConnectorError } from "../core/contract.js";
import { contentHash } from "../core/hash.js";
import { escapes } from "./folder-path.js";

const denyAll = (): Acl => ({ allowUsers: [], allowGroups: [], version: 0 });

/** Reads `<file>.acl.json`. A missing sidecar denies all; an unparsable or invalid one throws BAD_ACL. */
export const readAcl = async (root: string, documentPath: string): Promise<Acl> => {
  const sidecar = `${documentPath}.acl.json`;
  let text: string;
  try {
    const resolved = await realpath(sidecar);
    if (escapes(root, resolved)) {
      throw new ConnectorError("PATH_ESCAPE", `ACL sidecar leaves root: ${sidecar}`);
    }
    text = await readFile(resolved, "utf8");
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "ENOENT") return denyAll();
    throw error;
  }
  const bad = new ConnectorError("BAD_ACL", `Invalid ACL sidecar: ${sidecar}`);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw bad;
  }
  const parsed = AclSchema.safeParse(raw);
  if (!parsed.success) throw bad;
  return parsed.data;
};

/** Document version `<mtimeMs>:<size>:<content digest>:<acl fingerprint>`: a same-size edit with a restored mtime still changes it. */
export const aclVersion = (info: { mtimeMs: number; size: number }, acl: Acl, text: string): string =>
  `${info.mtimeMs}:${info.size}:${contentHash(text).slice(0, 16)}:${contentHash(JSON.stringify([acl.allowUsers, acl.allowGroups, acl.version])).slice(0, 16)}`;
