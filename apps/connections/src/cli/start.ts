import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createCursorStore } from "@anvesx/change-cursor";
import { createBuiltinRegistry } from "@anvesx/connectors";
import { createGraphStore } from "@anvesx/graph-store";
import pg from "pg";
import { openStore } from "../accounts/store.js";
import type { Deps } from "../deps.js";
import { type AppOptions, createApp } from "../http/app.js";
import { startServer } from "../http/serve.js";
import { startJobs } from "../jobs/queue.js";
import { createLogin } from "../login/identity.js";
import { openVault } from "../tokens/open.js";
import { type Config, parseConfig } from "./config.js";

type Env = Record<string, string | undefined>;
export type Running = { port: number; config: Config; close: () => Promise<void> };

/** Checks the settings, opens the account store, the graph, the vault and the job queue, then listens on 127.0.0.1. Throws before opening anything when the config is bad. */
export async function start(env: Env, nowSeconds: () => number, opts: Omit<AppOptions, "login"> = {}): Promise<Running> {
  const config = parseConfig(env);
  const store = openStore(config.dbPath);
  const cursors = createCursorStore(config.data.cursorPath, () => nowSeconds() * 1000);
  let graph: ReturnType<typeof createGraphStore> | undefined;
  let server: Server | undefined;
  let jobs: Awaited<ReturnType<typeof startJobs>> | undefined;
  const pool = new pg.Pool({ connectionString: config.data.jobs.databaseUrl });
  const loginPool = config.login && new pg.Pool({ connectionString: config.login.databaseUrl });
  const close = async () => {
    await new Promise<void>((done) => (server ? server.close(() => done()) : done()));
    await jobs?.stop();
    graph?.close();
    await Promise.all([pool.end(), loginPool?.end()]);
    cursors.close();
    store.close();
  };
  try {
    graph = createGraphStore({ path: config.graphPath });
    const { login: l } = config;
    const login =
      l && loginPool
        ? await createLogin({
            pool: loginPool,
            baseUrl: l.baseUrl,
            secret: l.secret,
            clientId: l.clientId,
            clientSecret: l.clientSecret,
            production: l.production,
            trustedProxies: l.trustedProxies,
            ...(l.issuer && { issuer: l.issuer }),
          })
        : undefined;
    const deps: Deps = {
      store,
      vault: await openVault(pool, config.data.vaultKeys, config.secret),
      cursors,
      secret: config.secret,
      now: nowSeconds,
      isAdmin: (c) => config.admins.has(`${c.tenant}:${c.user}`),
      oauth: config.oauth,
      net: { allowLoopback: config.allowLoopback },
      sync: { graph, ...(config.githubApiUrl && { githubApiUrl: config.githubApiUrl }) },
      catalog: createBuiltinRegistry(),
    };
    jobs = await startJobs(deps, config.data.jobs);
    const app = createApp({ ...deps, jobs, ...(config.data.webhookSecret && { webhookSecret: config.data.webhookSecret }) }, { ...opts, login });
    server = await startServer(app, config.port);
    return { port: (server.address() as AddressInfo).port, config, close };
  } catch (e) {
    await close();
    throw e;
  }
}
