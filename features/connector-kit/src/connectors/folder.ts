import { readFile, realpath, stat } from "node:fs/promises";
import { join } from "node:path";
import { type Connector, ConnectorError } from "../core/contract.js";
import { pageWalk, type Walks } from "../core/walks.js";
import { aclVersion, readAcl } from "./folder-acl.js";
import { escapes, safeRealpath } from "./folder-path.js";
import { scan } from "./folder-scan.js";

export const createFolderConnector = (id: string, rootDir: string): Connector => {
  // A listing without a cursor starts a walk and rescans; later pages reuse that walk's own snapshot, so a
  // full walk costs one scan and concurrent walks never disturb each other.
  const walks: Walks = new Map();
  return {
    id,
    enforcesUserToken: false,
    async list(query) {
      return pageWalk(walks, async () => scan(await realpath(rootDir)), query);
    },
    async fetch(address) {
      const root = await realpath(rootDir);
      const candidate = join(root, address);
      if (escapes(root, candidate)) throw new ConnectorError("PATH_ESCAPE", `Path leaves root: ${address}`);
      const resolved = await safeRealpath(root, candidate);
      const info = await stat(resolved);
      if (!info.isFile()) throw new ConnectorError("NOT_FOUND", `Document not found: ${address}`);
      const text = await readFile(resolved, "utf8");
      return { text, version: aclVersion(info, await readAcl(root, candidate), text) };
    },
  };
};
