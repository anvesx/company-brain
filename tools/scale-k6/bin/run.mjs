// Starts the connections server, runs the catalog k6 script, stops the server.
// The rank half of this test moved to the rag repo (ADR 0006).
// Usage: node bin/run.mjs
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mint } from "../src/creds.mjs";
import { describeHost } from "../src/env.mjs";
import { connectionsServer, ports, waitFor } from "../src/servers.mjs";
import { exitCode, reportPath } from "./outcome.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(tmpdir(), "scale-k6-"));
mkdirSync(dirname(reportPath("catalog")), { recursive: true });

const k6 = (script, env) => {
  const args = ["run", "--quiet", "--summary-export", reportPath(script), ...Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`])];
  return exitCode(spawnSync("k6", [...args, join(root, "scripts", `${script}.js`)], { stdio: "inherit" }));
};

console.log(describeHost());
const server = connectionsServer(dir);
let code = 1;
try {
  await waitFor(`http://127.0.0.1:${ports.connections}/`);
  code = k6("catalog", { BASE: `http://127.0.0.1:${ports.connections}`, TOKEN: mint("root", "t1") });
} finally {
  server.kill("SIGTERM");
  rmSync(dir, { recursive: true, force: true });
}
process.exit(code);
