// Starts the servers, runs the two k6 scripts one after the other, stops the servers.
// Usage: node bin/run.mjs [--docs 10000] [--only rank|catalog]
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { makeQueries } from "../../../features/rank/scripts/bench/corpus.mjs";
import { mint } from "../src/creds.mjs";
import { describeHost } from "../src/env.mjs";
import { connectionsServer, ports, rankServer, waitFor } from "../src/servers.mjs";
import { exitCode, reportPath } from "./outcome.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, dflt) => (process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : dflt);
const docs = Number(arg("docs", 10000));
const only = arg("only", "");
const dir = mkdtempSync(join(tmpdir(), "scale-k6-"));
const queries = join(dir, "queries.json");
writeFileSync(queries, JSON.stringify(makeQueries(500)));
mkdirSync(dirname(reportPath("rank")), { recursive: true });

const k6 = (script, env) => {
  const args = ["run", "--quiet", "--summary-export", reportPath(script), ...Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`])];
  return exitCode(spawnSync("k6", [...args, join(root, "scripts", `${script}.js`)], { stdio: "inherit" }));
};

console.log(describeHost());
const servers = [];
let code = 0;
try {
  if (only !== "catalog") {
    servers.push(rankServer(docs));
    await waitFor(`http://127.0.0.1:${ports.rank}/healthz`);
    code = k6("rank", { BASE: `http://127.0.0.1:${ports.rank}`, QUERIES: queries, DOCS: docs }) || code;
  }
  if (only !== "rank") {
    servers.push(connectionsServer(dir));
    await waitFor(`http://127.0.0.1:${ports.connections}/`);
    code = k6("catalog", { BASE: `http://127.0.0.1:${ports.connections}`, TOKEN: mint("root", "t1") }) || code;
  }
} finally {
  for (const s of servers) s.kill("SIGTERM");
  rmSync(dir, { recursive: true, force: true });
}
process.exit(code ?? 1);
