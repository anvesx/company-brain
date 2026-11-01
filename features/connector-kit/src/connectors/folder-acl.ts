import { AclSchema, type Acl } from "@brain/core-types";
import { readFile, realpath } from "node:fs/promises";
import { ConnectorError } from "../core/contract.js";
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
