import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createGraphStore } from "@anvesx/graph-store";
import pg from "pg";
import { openStore } from "../accounts/store.js";
import { type AppOptions, createApp } from "../http/app.js";
import { startServer } from "../http/serve.js";
import { createLogin } from "../login/identity.js";
import { writeTokenFile } from "../tokens/write-token-file.js";
import { type Config, parseConfig } from "./config.js";

type Env = Record<string, string | undefined>;
export type Running = { port: number; config: Config; close: () => Promise<void> };

/** Checks the settings, opens the account store and the graph, then listens on 127.0.0.1. Throws before opening anything when the config is bad. */
export async function start(env: Env, nowSeconds: () => number, opts: Omit<AppOptions, "login"> = {}): Promise<Running> {
  const config = parseConfig(env);
  const store = openStore(config.dbPath, config.key);
  let graph: ReturnType<typeof createGraphStore> | undefined;
  let server: Server | undefined;
  const pool = config.login && new pg.Pool({ connectionString: config.login.databaseUrl });
  const close = async () => {
    await new Promise<void>((done) => (server ? server.close(() => done()) : done()));
    graph?.close();
    await pool?.end();
    store.close();
  };
  try {
    graph = createGraphStore({ path: config.graphPath });
    const { login: l } = config;
    const login =
      l && pool
        ? await createLogin({
            pool,
            baseUrl: l.baseUrl,
            secret: l.secret,
            clientId: l.clientId,
            clientSecret: l.clientSecret,
            production: l.production,
            trustedProxies: l.trustedProxies,
            ...(l.issuer && { issuer: l.issuer }),
          })
        : undefined;
    const app = createApp(
      {
        store,
        secret: config.secret,
        now: nowSeconds,
        isAdmin: (c) => config.admins.has(`${c.tenant}:${c.user}`),
        oauth: config.oauth,
        net: { allowLoopback: config.allowLoopback },
        sync: { graph, ...(config.githubApiUrl && { githubApiUrl: config.githubApiUrl }) },
        ...(config.tokensFile && { tokensFile: config.tokensFile }),
      },
      { ...opts, login },
    );
    if (config.tokensFile) writeTokenFile(store, config.tokensFile);
    server = await startServer(app, config.port);
    return { port: (server.address() as AddressInfo).port, config, close };
  } catch (e) {
    await close();
    throw e;
  }
}
