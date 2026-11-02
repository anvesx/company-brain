import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";
import { dirname } from "node:path";
import { createApp } from "../../src/http/app.js";
import { startServer } from "../../src/http/serve.js";
import { tempStore } from "../accounts/fixture.js";

export const SECRET = "s".repeat(32);
export const NOW = 1_800_000_000;
export const mint = (user: string, tenant: string, exp = NOW + 600): string =>
  `Bearer ${user}:${tenant}:${exp}:${createHmac("sha256", SECRET).update(`${user}:${tenant}:${exp}`).digest("hex")}`;

/** The real app on a real port over a real SQLite file. `ann` and `root` are tenant admins only for `root`. */
export async function boot(extra: Partial<Parameters<typeof createApp>[0]> = {}) {
  const t = tempStore();
  const app = createApp({
    net: { resolve: async () => ["93.184.216.34"] },
    store: t.store,
    secret: SECRET,
    now: () => NOW,
    isAdmin: (c) => c.user === "root",
    ...extra,
  });
  const server = await startServer(app, 0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = (method: string, path: string, who?: string, body?: unknown, cookie?: string) =>
    fetch(base + path, {
      method,
      redirect: "manual",
      headers: { ...(who && { authorization: who }), ...(cookie && { cookie }), ...(body !== undefined && { "content-type": "application/json" }) },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  return {
    dir: dirname(t.path),
    base,
    call,
    store: t.store,
    close: async () => {
      server.close();
      t.done();
    },
  };
}

export const ann = mint("ann", "t1");
export const bob = mint("bob", "t1");
export const root = mint("root", "t1");
export const pat = { provider: "github", label: "work", kind: "pat", token: "ghp_secret", access: "private", dataZone: "private" };
