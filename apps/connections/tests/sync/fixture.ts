import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixture, startReplay } from "@anvesx/connectors/testing/replay";
import { createGraphStore } from "@anvesx/graph-store";
import { boot } from "../http/fixture.js";

const TREE = "9fb037999f264ba9281fc6cbd2d9dff8d1c1d5b1";
const R = "/repos/acme/handbook";
const ok = (name: string) => ({ status: 200, body: fixture(name) });
export const routes = {
  [R]: ok("github/repo"),
  [`${R}/git/trees/main`]: ok("github/tree"),
  [`${R}/git/trees/${TREE}`]: ok("github/tree"),
  [`${R}/collaborators`]: ok("github/collaborators"),
  [`${R}/teams`]: ok("github/teams"),
  "/orgs/acme/teams/justice-league/members": ok("github-members/justice-league"),
  "/orgs/acme/teams/docs/members": ok("github-members/docs"),
};

const O = "/repos/acme/other";
const T2 = "2".repeat(40);
const other = { sha: T2, truncated: false, tree: [{ path: "other.md", mode: "100644", type: "blob", sha: "3".repeat(40), size: 5 }] };
export const withOther = {
  ...routes,
  [O]: { status: 200, body: { ...(fixture("github/repo") as object), name: "other", full_name: "acme/other" } },
  [`${O}/git/trees/main`]: { status: 200, body: other },
  [`${O}/git/trees/${T2}`]: { status: 200, body: other },
  [`${O}/collaborators`]: { status: 200, body: [{ login: "zed", id: 9, type: "User", permissions: { pull: true } }] },
  [`${O}/teams`]: { status: 404, body: { message: "Not Found" } },
};

/** The real app over a real graph file; the GitHub SDK talks to a local HTTP server that answers with recorded JSON. */
export async function bootSync(extra: Parameters<typeof boot>[0] = {}, replayRoutes: Parameters<typeof startReplay>[0] = routes) {
  const gh = await startReplay(replayRoutes);
  const dir = mkdtempSync(join(tmpdir(), "conn-graph-"));
  const graphPath = join(dir, "graph.db");
  const graph = createGraphStore({ path: graphPath });
  const s = await boot({ sync: { graph, githubApiUrl: gh.url }, ...extra });
  return {
    s,
    gh,
    graph,
    graphPath,
    close: async () => {
      await s.close();
      graph.close();
      await gh.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
