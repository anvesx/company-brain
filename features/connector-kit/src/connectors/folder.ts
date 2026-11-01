import { readFile, realpath, stat } from "node:fs/promises";
import { join } from "node:path";
import { type Connector, ConnectorError, type ListedDoc } from "../core/contract.js";
import { pageItems } from "../core/paging.js";
import { escapes, safeRealpath } from "./folder-path.js";
import { scan } from "./folder-scan.js";

export const createFolderConnector = (id: string, rootDir: string): Connector => {
  // A listing without a cursor starts a walk and rescans; later pages reuse that snapshot so a
  // full walk costs one scan, not one per page.
  let snapshot: ListedDoc[] | undefined;
  return {
    id,
    async list(query) {
      if (query.cursor === undefined || snapshot === undefined) snapshot = await scan(await realpath(rootDir));
      return pageItems(snapshot, query);
    },
    async fetch(address) {
      const root = await realpath(rootDir);
      const candidate = join(root, address);
      if (escapes(root, candidate)) throw new ConnectorError("PATH_ESCAPE", `Path leaves root: ${address}`);
      const resolved = await safeRealpath(root, candidate);
      const info = await stat(resolved);
      if (!info.isFile()) throw new ConnectorError("NOT_FOUND", `Document not found: ${address}`);
      return { text: await readFile(resolved, "utf8"), version: `${info.mtimeMs}:${info.size}` };
    },
  };
};
