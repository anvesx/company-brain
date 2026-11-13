import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPostgresGraphStore } from "@anvesx/graph-store";
import pg from "pg";

const port = (): Promise<number> =>
  new Promise((ok, fail) => {
    const s = createServer().listen(0, "127.0.0.1", () => {
      const { port: p } = s.address() as { port: number };
      s.close(() => ok(p));
    });
    s.on("error", fail);
  });

/** A real, empty Postgres 16 in a temp data dir on a free port. `stop()` shuts it down and rm -rf's the dir. */
export async function startPg() {
  const bin = process.env["PG_BIN"] ?? "/opt/homebrew/opt/postgresql@16/bin";
  const [dir, p] = [mkdtempSync(join(tmpdir(), "files-view-pg-")), await port()];
  const data = join(dir, "data");
  const env = { ...process.env, LC_ALL: "en_US.UTF-8" };
  const run = (cmd: string, args: string[]) => execFileSync(join(bin, cmd), args, { env, stdio: "pipe" });
  run("initdb", ["-D", data, "-U", "postgres", "--auth=trust", "-E", "UTF8"]);
  run("pg_ctl", [
    "-D",
    data,
    "-l",
    join(dir, "log"),
    "-w",
    "-o",
    `-p ${p} -c listen_addresses=127.0.0.1 -c unix_socket_directories= -c max_connections=100`,
    "start",
  ]);
  const pool = new pg.Pool({ connectionString: `postgres://postgres@127.0.0.1:${p}/postgres`, max: 10 });
  pool.on("error", () => undefined);
  const store = await createPostgresGraphStore({ pool });
  const stop = async () => {
    await pool.end();
    run("pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"]);
    rmSync(dir, { recursive: true, force: true });
  };
  return { pool, store, stop };
}
export type Pg = Awaited<ReturnType<typeof startPg>>;
