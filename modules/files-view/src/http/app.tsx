import type { Who } from "@anvesx/visibility/gate";
import { type Context, Hono } from "hono";
import type pg from "pg";
import { visibleAncestors, visibleChildren, visibleCluster, visibleTree } from "../cluster/tree.js";
import { BadInput } from "../db/cursor.js";
import type { CountedGate, GateFactory } from "../gate/gate.js";
import { visibleFile, visibleFiles } from "../gate/visible.js";
import { ClusterScreen, ClustersScreen, ErrorScreen, FileScreen, FilesScreen } from "../ui/index.js";
import type { Auth } from "./auth.js";
import { GONE, secure, toNode, toPage, toRow } from "./models.js";
import { CLUSTER_KEYS, LIST_KEYS, pageSize, parseList, SAFE_ID, strict } from "./params.js";

type Env = { Variables: { gate: CountedGate; who: Who } };
const TREE_DEPTH = 3;
const asJson = (c: Context): boolean => (c.req.header("accept") ?? "").includes("application/json");

/** The Files and Clusters screen as a Hono app: `auth` verifies a bearer token (401 otherwise), `gate` builds each viewer's permission gate. */
export function createFilesView({ pool, gate, auth }: { pool: pg.Pool; gate: GateFactory; auth: Auth }): Hono<Env> {
  const app = new Hono<Env>();
  const fail = (c: Context, status: 400 | 401 | 404 | 500, message?: string) => c.html(<ErrorScreen status={status} message={message} />, status);
  const missing = (c: Context) => fail(c, 404, "This item was removed, or you no longer have access.");
  const removed = (c: Context<Env>) => c.html(<FileScreen detail={{ file: GONE, removed: true }} viewer={viewer(c)} />, 404);
  app.use("*", async (c, next) => {
    secure(c.header.bind(c));
    const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(c.req.header("authorization") ?? "")?.[1];
    const who = token ? await auth(token).catch(() => null) : null;
    if (!who?.tenant || !who.user) {
      c.header("www-authenticate", "Bearer");
      return fail(c, 401, "Send a valid access token to view files.");
    }
    c.set("who", who);
    c.set("gate", gate(who));
    await next();
  });
  app.onError((e, c) => {
    if (e instanceof BadInput) return fail(c, 400, e.message);
    console.error(e);
    return fail(c, 500);
  });
  const viewer = (c: Context<Env>) => ({ name: c.get("who").user, admin: c.get("who").role === "admin" });
  const ctx = (c: Context<Env>) => [pool, c.get("gate"), c.get("who").tenant] as const;

  app.get("/files", async (c) => {
    const p = strict(new URL(c.req.url).searchParams, LIST_KEYS);
    const { query, cluster } = parseList(p);
    const clusters = cluster ? ((await visibleCluster(...ctx(c), cluster))?.subtree ?? []) : undefined;
    const page = await visibleFiles(...ctx(c), { ...query, ...(clusters && { clusters }) });
    return asJson(c) ? c.json(page) : c.html(<FilesScreen page={toPage(page, p)} viewer={viewer(c)} />);
  });
  app.get("/files/:id", async (c) => {
    const id = c.req.param("id");
    if (!SAFE_ID.test(id)) return missing(c);
    const row = await visibleFile(...ctx(c), id);
    if (!row) return (await c.get("gate").removed(id)) ? removed(c) : missing(c);
    return asJson(c) ? c.json(row) : c.html(<FileScreen detail={{ file: toRow(row), readers: row.readers }} viewer={viewer(c)} />);
  });
  app.get("/clusters", async (c) => {
    const p = strict(new URL(c.req.url).searchParams, ["limit"]);
    const limit = pageSize(p["limit"]);
    const tree = await visibleTree(...ctx(c), "", limit, TREE_DEPTH);
    return asJson(c) ? c.json({ clusters: tree.map(toNode) }) : c.html(<ClustersScreen roots={tree.map(toNode)} viewer={viewer(c)} />);
  });
  app.get("/clusters/:id", async (c) => {
    const id = c.req.param("id");
    const p = strict(new URL(c.req.url).searchParams, CLUSTER_KEYS);
    const info = SAFE_ID.test(id) ? await visibleCluster(...ctx(c), id) : undefined;
    if (!info) return missing(c);
    const files = await visibleFiles(...ctx(c), { ...parseList(p).query, clusters: info.subtree });
    if (asJson(c)) return c.json({ cluster: toNode(info), files });
    const ancestors = await visibleAncestors(pool, c.get("who").tenant, info);
    const children = (await visibleChildren(...ctx(c), id, 50)).clusters.map(toNode);
    const detail = { node: { ...toNode(info), children }, ancestors: ancestors.map((a) => ({ id: a.id, name: a.title })), members: toPage(files, p) };
    return c.html(<ClusterScreen detail={detail} viewer={viewer(c)} />);
  });
  return app;
}
