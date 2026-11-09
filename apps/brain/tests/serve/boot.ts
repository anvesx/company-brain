import { spawn } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { createPostgresGraphStore } from "@anvesx/graph-store";
import pg from "pg";
import type { Throwaway } from "../../../../features/graph-store/tests/support/pg/server.js";

/** One shared secret for the brain API tokens of a test run. */
export const secret = randomBytes(32).toString("hex");

/** A brain API token, `Bearer user:tenant:exp:hmac`, valid for 10 minutes. */
export const bearer = (user: string, tenant: string): string => {
  const exp = Math.floor(Date.now() / 1000) + 600;
  return `Bearer ${user}:${tenant}:${exp}:${createHmac("sha256", secret).update(`${user}:${tenant}:${exp}`).digest("hex")}`;
};

/** The env `serve()` reads. PORT 0 lets the OS pick a free port; BASE_URL is loopback because identity requires it. */
export const env = (url: string) => ({
  DATABASE_URL: url,
  BRAIN_AUTH_SECRET: secret,
  IDENTITY_SECRET: randomBytes(32).toString("hex"),
  BASE_URL: "http://localhost",
  PORT: "0",
  HOST: "127.0.0.1",
});

/** Poll until ok() is true; a thrown check (server not up yet) counts as "not yet". */
export const until = async (ok: () => Promise<boolean>, ms: number): Promise<void> => {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 200))) if (await ok().catch(() => false)) return;
  throw new Error(`condition not met within ${ms} ms`);
};

/** Put one readable document (u1 can read d1, tenant acme) into the database, the way sync would. */
export async function seed(db: Throwaway): Promise<void> {
  const pool = new pg.Pool({ connectionString: db.url });
  const store = await createPostgresGraphStore({ pool });
  await store.upsertNode({ tenant: "acme", id: "d1", kind: "document", source: "drive", address: "d1", title: "Plan", version: "1", props: {} }, 1);
  await store.addEdge({ tenant: "acme", from: "u1", to: "d1", kind: "can-read", source: "drive" }, 1);
  await store.close();
  await pool.end();
}

/** A new, empty database on the same server, so two boots can race on migrations that have never run. */
export async function freshDb(db: Throwaway): Promise<string> {
  const name = `f_${randomBytes(6).toString("hex")}`;
  const admin = new pg.Client({ connectionString: db.url });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();
  return db.url.replace(/\/postgres$/, `/${name}`);
}

/** A port the OS has just handed out and released, for a child process that cannot report port 0. */
export const freePort = async (): Promise<number> => {
  const s = createServer().listen(0, "127.0.0.1");
  await new Promise((ok) => s.once("listening", ok));
  const { port } = s.address() as { port: number };
  await new Promise((ok) => s.close(ok));
  return port;
};

/** Run `node <bin> serve` with exactly this env. `signal` sends a signal once; `exit` resolves with code and stderr (SIGKILL after 20 s). */
export function spawnServe(bin: string, e: Record<string, string>) {
  const child = spawn("node", [bin, "serve"], { env: { PATH: process.env["PATH"] ?? "", ...e } });
  let err = "";
  const waiters: Array<() => void> = [];
  child.stderr.on("data", (d) => {
    err += d;
    for (const w of waiters) w();
  });
  const timer = setTimeout(() => child.kill("SIGKILL"), 20_000);
  const exit = new Promise<{ code: number | null; err: string }>((ok) =>
    child.on("exit", (code) => {
      clearTimeout(timer);
      ok({ code, err });
    }),
  );
  const saw = (re: RegExp) => new Promise<void>((ok) => (re.test(err) ? ok() : waiters.push(() => re.test(err) && ok())));
  return { child, exit, saw };
}
