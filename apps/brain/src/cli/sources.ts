import { createCursorStore } from "@brain/change-cursor";
import { createFolderConnector } from "@brain/connector-kit";
import { readTokenPolicy } from "../auth/mode.js";
import { signedPrincipalFor } from "../auth/token.js";
import { type BrainEnv, DEMO_TENANT, type DemoDeps, demoDeps, type Env, embedText } from "../config/index.js";
import { userTokensFor } from "./user-tokens.js";

export type Source = DemoDeps & { tenants: string[] };

/**
 * What to serve: BRAIN_FOLDER_ROOT as the one tenant BRAIN_TENANT, otherwise the demo.
 * Folder mode still embeds with the demo's toy embedder: search finds every permitted match but ranking is meaningless.
 */
export function sourceFor(brain: BrainEnv, env: Env, now: () => number = Date.now): Source {
  const base =
    brain.folderRoot && brain.tenant
      ? folder(brain.folderRoot, brain.tenant, brain.dataDir === undefined, brain.userTokensPath)
      : { ...demoDeps(), tenants: [DEMO_TENANT] };
  if (!brain.authSecret) return base;
  return { ...base, principalFor: signedPrincipalFor(brain.authSecret, now, readTokenPolicy(env)) };
}

function folder(root: string, tenant: string, inMemory: boolean, userTokens: string | undefined): Source {
  const connector = createFolderConnector("folder", root);
  const userTokenFor = userTokensFor(connector, userTokens);
  return {
    connectorFor: (id) => (id === tenant ? connector : undefined),
    // The folder connector ignores the token; only the tenant check matters.
    tokenFor: (id) => (id === tenant ? "folder" : undefined),
    ...(inMemory && { cursors: createCursorStore(":memory:", Date.now) }),
    ...(userTokenFor && { userTokenFor }),
    clock: Date.now,
    embed: async (texts) => texts.map(embedText),
    embedQuery: async (text) => embedText(text),
    principalFor: () => {
      throw new Error("unauthenticated");
    },
    tenants: [tenant],
  };
}
