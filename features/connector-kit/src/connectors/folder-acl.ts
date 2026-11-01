import { readFile, realpath } from "node:fs/promises";
import { type Acl, AclSchema } from "@brain/core-types";
import { ConnectorError } from "../core/contract.js";
import { contentHash } from "../core/hash.js";
import { escapes } from "./folder-path.js";

const denyAll = (): Acl => ({ allowUsers: [], allowGroups: [], version: 0 });

export const readAcl = async (root: string, documentPath: string): Promise<Acl> => {
  const sidecar = `${documentPath}.acl.json`;
  try {
    const resolved = await realpath(sidecar);
    if (escapes(root, resolved)) {
      throw new ConnectorError("PATH_ESCAPE", `ACL sidecar leaves root: ${sidecar}`);
    }
    return AclSchema.parse(JSON.parse(await readFile(resolved, "utf8")));
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "ENOENT") return denyAll();
    throw error;
  }
};

/** Document version `<mtimeMs>:<size>:<acl fingerprint>`, so an ACL-only edit changes the version. */
export const aclVersion = (info: { mtimeMs: number; size: number }, acl: Acl): string =>
  `${info.mtimeMs}:${info.size}:${contentHash(JSON.stringify([acl.allowUsers, acl.allowGroups, acl.version])).slice(0, 16)}`;
