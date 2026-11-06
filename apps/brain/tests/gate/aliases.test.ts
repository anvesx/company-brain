import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createGraphStore } from "@anvesx/graph-store";
import { afterEach, describe, expect, it } from "vitest";
import { runSync } from "../../src/cli/sync.js";
import { bootBrain, type Env, signUp, whoIs } from "../identity/boot.js";

let env: Env | undefined;
afterEach(async () => {
  await env?.close();
  env = undefined;
});

const put = (root: string, rel: string, users: string[]) => {
  const f = join(root, rel);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, "body");
  writeFileSync(`${f}.acl.json`, JSON.stringify({ allowUsers: users, allowGroups: [], version: 1 }));
};

/** Signs Ann up and syncs a real folder whose ACLs name people the way a source does, by email or login. */
async function boot(acls: Record<string, string[]>) {
  const dir = mkdtempSync(join(tmpdir(), "brain-alias-"));
  const graph = join(dir, "graph.db");
  const store = createGraphStore({ path: graph });
  env = await bootBrain({ store });
  const ann = await signUp(env, "Ann");
  const { tenant, user } = await whoIs(env, ann.browser.cookie());
  for (const [rel, users] of Object.entries(acls)) put(join(dir, "src"), rel, users);
  const sync = { BRAIN_CONNECTOR: "folder", BRAIN_FOLDER_ROOT: join(dir, "src"), BRAIN_TENANT: tenant, BRAIN_GRAPH_PATH: graph };
  await runSync(sync, () => 1000);
  const read = async <T>(path: string) => (await (await fetch(`${env?.base}${path}`, { headers: { cookie: ann.browser.cookie() } })).json()) as T;
  const ids = async () => (await read<{ documents: { id: string }[] }>("/v1/documents")).documents.map((d) => d.id);
  const db = async () => (await env?.identity.auth.$context)?.adapter as Db;
  const graphIds = async () => (await read<{ nodes: { id: string; kind: string }[] }>("/v1/graph")).nodes.filter((n) => n.kind === "document").map((n) => n.id);
  return { ids, graphIds, user, db, email: ann.email, store, tenant };
}

type Db = {
  update(q: { model: string; where: { field: string; value: string }[]; update: object }): Promise<unknown>;
  create(q: { model: string; data: object }): Promise<unknown>;
};

describe("ACLs written with source names reach the identity user", () => {
  it("shows a document whose ACL names the user's verified email, and hides one naming another email", async () => {
    const { ids, user, db, email } = await boot({ "mine.md": ["ann@example.com"], "theirs.md": ["bob@example.com"] });
    await (await db()).update({ model: "user", where: [{ field: "id", value: user }], update: { emailVerified: true } });
    expect(email).toBe("ann@example.com");
    expect(await ids()).toEqual(["folder/mine.md"]);
  });

  it("never trusts an email identity has not verified", async () => {
    const { ids } = await boot({ "mine.md": ["ann@example.com"] });
    expect(await ids()).toEqual([]);
  });

  it("shows a document whose ACL names a linked connector account id", async () => {
    const { ids, user, db } = await boot({ "gh.md": ["ann-gh"], "other.md": ["bob-gh"] });
    const now = new Date();
    await (await db()).create({ model: "account", data: { userId: user, accountId: "ann-gh", providerId: "github", createdAt: now, updatedAt: now } });
    expect(await ids()).toEqual(["folder/gh.md"]);
  });

  it("/v1/graph and /v1/documents agree for a document only an alias can read", async () => {
    const { ids, graphIds, user, db } = await boot({ "gh.md": ["ann-gh"], "other.md": ["bob-gh"] });
    expect(await graphIds()).toEqual([]);
    const now = new Date();
    await (await db()).create({ model: "account", data: { userId: user, accountId: "ann-gh", providerId: "github", createdAt: now, updatedAt: now } });
    expect(await graphIds()).toEqual(["folder/gh.md"]);
    expect(await graphIds()).toEqual(await ids());
  });

  it("a team with no node of its own still grants what it can read, in /v1/graph as in /v1/documents", async () => {
    const { ids, graphIds, user, store, tenant } = await boot({ "t.md": ["team-x"] }); // team-x can read t.md; no team node exists
    store.addEdge({ tenant, from: user, to: "team-x", kind: "member-of", source: "test" }, 2000); // the user is a member of it
    expect(await ids()).toEqual(["folder/t.md"]);
    expect(await graphIds()).toEqual(await ids());
  });
});
