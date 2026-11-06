import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Oldest major we accept on a dev machine. Production (ADR 0010) is 16; nothing in our SQL needs more than 14. */
const MIN_MAJOR = 14;
export interface Throwaway {
  url: string; // postgres://postgres:<random password>@127.0.0.1:<port>/postgres
  port: number;
  version: string;
  restart(): void; // stops the hard way (`-m immediate`, like a crash) and starts again on the same port
  stop(): void; // stops the server and deletes its data directory
}

/** Where the Postgres binaries are: $PG_BIN if set, else whatever is on PATH. Returns a reason when unusable. */
export function findPostgres(): { bin: (name: string) => string; version: string } | { reason: string } {
  const bin = (name: string) => (process.env["PG_BIN"] ? join(process.env["PG_BIN"], name) : name);
  try {
    const version = execFileSync(bin("postgres"), ["--version"], { encoding: "utf8" }).trim();
    const major = Number(/(\d+)\.\d+/.exec(version)?.[1] ?? 0);
    if (major < MIN_MAJOR) return { reason: `${version} is older than ${MIN_MAJOR}; set PG_BIN to a newer bin dir` };
    return { bin, version };
  } catch {
    return { reason: "postgres binaries not found on PATH (or in $PG_BIN)" };
  }
}

/** True when the suite must not skip: in CI a missing Postgres is a failure, not a pass that measured nothing. */
export const mustRun = (): boolean => process.env["CI"] === "true";
const freePort = (): Promise<number> =>
  new Promise((ok, fail) => {
    const s = createServer().listen(0, "127.0.0.1", () => {
      const { port } = s.address() as { port: number }; // read before close: a closed server has no address
      s.close(() => ok(port));
    });
    s.on("error", fail);
  });

/** A real, empty Postgres in a temp dir on a free port (`initdb`, `pg_ctl start`): scram with a random password,
 * no Unix socket. `listenAll` also accepts connections from containers. */
export async function startPostgres(opts: { listenAll?: boolean } = {}): Promise<Throwaway> {
  const found = findPostgres();
  if ("reason" in found) throw new Error(found.reason);
  const [dir, password, port] = [mkdtempSync(join(tmpdir(), "pg-")), randomBytes(18).toString("hex"), await freePort()];
  const [data, log, pw] = [join(dir, "data"), join(dir, "log"), join(dir, "pw")];
  // LC_ALL=C: on macOS a postmaster with no valid locale stops with "became multithreaded during startup".
  const quiet = { stdio: "pipe", env: { ...process.env, LC_ALL: "C" } } as const;
  writeFileSync(pw, password);
  execFileSync(found.bin("initdb"), ["-D", data, "-U", "postgres", "--auth=scram-sha-256", `--pwfile=${pw}`, "-E", "UTF8", "--no-locale"], quiet);
  rmSync(pw);
  // Containers reach the host through its bridge address, so allow any address, still password-only.
  if (opts.listenAll) appendFileSync(join(data, "pg_hba.conf"), "host all all 0.0.0.0/0 scram-sha-256\n");
  const serverOpts = `-p ${port} -c listen_addresses='${opts.listenAll ? "*" : "127.0.0.1"}' -c unix_socket_directories='' -c max_connections=200`;
  const ctl = (...args: string[]) => {
    try {
      execFileSync(found.bin("pg_ctl"), ["-D", data, "-l", log, "-w", ...args], quiet);
    } catch (e) {
      // pg_ctl only says "could not start"; the reason is in the server log.
      throw new Error(`pg_ctl ${args.at(-1)} failed: ${readFileSync(log, "utf8").slice(-600)}`, { cause: e });
    }
  };
  ctl("-o", serverOpts, "start");
  return {
    url: `postgres://postgres:${password}@127.0.0.1:${port}/postgres`,
    port,
    version: found.version,
    restart: () => {
      ctl("-m", "immediate", "stop");
      ctl("-o", serverOpts, "start");
    },
    stop: () => {
      ctl("-m", "fast", "stop");
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
