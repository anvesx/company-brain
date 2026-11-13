import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBuiltinRegistry } from "@anvesx/connectors";
import { startReplay } from "@anvesx/connectors/testing/replay";
import { createGraphStore } from "@anvesx/graph-store";
import type { Deps } from "../../src/deps.js";
import { tempStore } from "../accounts/fixture.js";
import { NOW } from "../http/fixture.js";
import { data } from "../pg/db.js";
import { routes } from "../sync/fixture.js";

/** Real `Deps` (SQLite accounts, Postgres vault, cursor file, graph file) with `sync` pointed at a local replay of GitHub. */
export async function bootJobs(replayRoutes: Parameters<typeof startReplay>[0] = routes) {
  const gh = await startReplay(replayRoutes);
  const t = tempStore();
  const dir = mkdtempSync(join(tmpdir(), "conn-jobs-"));
  const d = await data(dir, () => NOW * 1000);
  const graph = createGraphStore({ path: join(dir, "graph.db") });
  const clock = { t: NOW };
  const deps: Deps = {
    store: t.store,
    vault: d.vault,
    cursors: d.cursors,
    secret: "x".repeat(32),
    now: () => clock.t,
    isAdmin: () => false,
    catalog: createBuiltinRegistry(),
    sync: { graph, githubApiUrl: gh.url },
  };
  const close = async () => {
    graph.close();
    await d.close();
    t.done();
    await gh.close();
    rmSync(dir, { recursive: true, force: true });
  };
  return { deps, clock, close };
}
