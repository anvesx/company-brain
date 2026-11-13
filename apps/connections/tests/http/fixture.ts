import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";
import { dirname } from "node:path";
import type { NewAccount } from "../../src/accounts/types.js";
import { createApp } from "../../src/http/app.js";
import { startServer } from "../../src/http/serve.js";
import { createWithToken } from "../../src/tokens/open.js";
import { tempStore } from "../accounts/fixture.js";
import { AUTH, data } from "../pg/db.js";

export const SECRET = AUTH;
export const NOW = 1_800_000_000;
export const mint = (user: string, tenant: string, exp = NOW + 600): string =>
  `Bearer ${user}:${tenant}:${exp}:${createHmac("sha256", SECRET).update(`${user}:${tenant}:${exp}`).digest("hex")}`;

/** The real app on a real port over a real SQLite file. `ann` and `root` are tenant admins only for `root`. */
export async function boot(extra: Partial<Parameters<typeof createApp>[0]> = {}) {
  const t = tempStore();
  const d = await data(dirname(t.path), () => NOW * 1000);
  const app = createApp({
    net: { resolve: async () => ["93.184.216.34"] },
    store: t.store,
    vault: d.vault,
    cursors: d.cursors,
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
    vault: d.vault,
    cursors: d.cursors,
    close: async () => {
      server.close();
      await d.close();
      t.done();
    },
  };
}

export const ann = mint("ann", "t1");
export const bob = mint("bob", "t1");
export const root = mint("root", "t1");
export const pat = { provider: "github", label: "work", kind: "pat", token: "ghp_secret", access: "private", dataZone: "private" };

/** A company-zone account of `root` in tenant t1 with its token sealed in the vault, as the API would create it. */
export const seed = (
  s: { store: Parameters<typeof createWithToken>[0]["store"]; vault: Parameters<typeof createWithToken>[0]["vault"] },
  extra: Partial<NewAccount> = {},
  token: Parameters<typeof createWithToken>[2] = { accessToken: "ghp_secret" },
) => createWithToken(s, { tenant: "t1", owner: "root", provider: "github", label: "x", kind: "pat", access: "private", dataZone: "company", ...extra }, token);
