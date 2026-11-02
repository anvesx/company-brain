import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { SECRET } from "./creds.mjs";

const here = dirname(fileURLToPath(import.meta.url));
export const ports = { rank: 18790, connections: 18789 };

/** Polls until `url` answers with any HTTP status, or throws after `ms`. */
export const waitFor = async (url, ms = 120_000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (
      await fetch(url).then(
        () => true,
        () => false,
      )
    )
      return;
    await sleep(250);
  }
  throw new Error(`${url} did not answer within ${ms}ms`);
};

const child = (args, env = {}) => spawn(process.execPath, args, { stdio: "inherit", env: { ...process.env, ...env } });

/** The rank HTTP wrapper over a freshly seeded corpus of `size` docs. */
export const rankServer = (size) => child([join(here, "rank-server.mjs"), String(size), String(ports.rank)]);

/** The real connections launcher over fresh SQLite files in `dir`; `root` in tenant `t1` is the only admin. */
export const connectionsServer = (dir) =>
  child([join(here, "../../../apps/connections/dist/bin.js")], {
    CONNECTIONS_KEY: "ab".repeat(32),
    CONNECTIONS_AUTH_SECRET: SECRET,
    CONNECTIONS_DB_PATH: join(dir, "connections.db"),
    CONNECTIONS_GRAPH_PATH: join(dir, "graph.db"),
    CONNECTIONS_ADMINS: "t1:root",
    CONNECTIONS_PORT: String(ports.connections),
  });
