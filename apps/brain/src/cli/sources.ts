import { createCursorStore } from "@brain/change-cursor";
import { readTokenPolicy } from "../auth/mode.js";
import { signedPrincipalFor } from "../auth/token.js";
import { type BrainEnv, DEMO_TENANT, type DemoDeps, demoDeps, type Env, embedText } from "../config/index.js";
import { realEmbedding } from "../wire/embedder.js";
import { type Built, connectorFromEnv } from "./connectors.js";
import { userTokensFor } from "./user-tokens.js";

export type Source = DemoDeps & { tenants: string[] };

/**
 * What to serve: the connector chosen by BRAIN_CONNECTOR (folder, github or drive; a folder root alone means folder)
 * as the one tenant BRAIN_TENANT, otherwise the demo. Every mode except BRAIN_DEMO=1 embeds with the real local model.
 */
export function sourceFor(brain: BrainEnv, env: Env, now: () => number = Date.now): Source {
  const built = connectorFromEnv(brain, env);
  const base = built && brain.tenant ? fromConnector(built, brain, env) : { ...demoDeps(), tenants: [DEMO_TENANT] };
  if (!brain.authSecret) return base;
  return { ...base, principalFor: signedPrincipalFor(brain.authSecret, now, readTokenPolicy(env)) };
}

function fromConnector({ connector, token }: Built, brain: BrainEnv, env: Env): Source {
  const tenant = brain.tenant as string;
  const userTokenFor = userTokensFor(connector, brain.userTokensPath);
  const embedding = brain.demo
    ? { embed: async (texts: string[]) => texts.map(embedText), embedQuery: async (text: string) => embedText(text) }
    : realEmbedding(env.BRAIN_EMBEDDER_CACHE_DIR || undefined);
  return {
    connectorFor: (id) => (id === tenant ? connector : undefined),
    tokenFor: (id) => (id === tenant ? token : undefined),
    ...(brain.dataDir === undefined && { cursors: createCursorStore(":memory:", Date.now) }),
    ...(userTokenFor && { userTokenFor }),
    ...embedding,
    clock: Date.now,
    principalFor: () => {
      throw new Error("unauthenticated");
    },
    tenants: [tenant],
  };
}
