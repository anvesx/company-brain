import { createGraphStore } from "@anvesx/graph-store";
import { type SyncReport, syncConnector } from "@anvesx/graph-sync";
import { connectorFromEnv } from "./connector.js";

type Env = Record<string, string | undefined>;

/** Runs one metadata sync for a tenant into the graph file. Reads no document text. */
export async function runSync(env: Env, nowSeconds: () => number): Promise<SyncReport> {
  const [tenant, path] = [env.BRAIN_TENANT, env.BRAIN_GRAPH_PATH];
  if (!tenant) throw new Error("BRAIN_TENANT is required");
  if (!path) throw new Error("BRAIN_GRAPH_PATH is required");
  const connector = connectorFromEnv(env);
  const store = createGraphStore({ path });
  try {
    return await syncConnector({ store, connector, tenant, now: () => nowSeconds() * 1000 });
  } finally {
    store.close();
  }
}
