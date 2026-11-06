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
type Db = { update(q: object): Promise<unknown>; create(q: object): Promise<unknown> };

/** Signs Ann up (email ann@example.com, verified) and syncs one doc per ACL, each naming `users`. */
async function boot(acls: Record<string, string[]>) {
  const dir = mkdtempSync(join(tmpdir(), "brain-edge-"));
  const graph = join(dir, "graph.db");
  env = await bootBrain({ store: createGraphStore({ path: graph }) });
  const ann = await signUp(env, "Ann");
  const { tenant, user } = await whoIs(env, ann.browser.cookie());
  for (const [rel, users] of Object.entries(acls)) {
    const f = join(dir, "src", rel);
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, "body");
    writeFileSync(`${f}.acl.json`, JSON.stringify({ allowUsers: users, allowGroups: [], version: 1 }));
  }
  await runSync({ BRAIN_CONNECTOR: "folder", BRAIN_FOLDER_ROOT: join(dir, "src"), BRAIN_TENANT: tenant, BRAIN_GRAPH_PATH: graph }, () => 1000);
  const db = (await env.identity.auth.$context).adapter as unknown as Db;
  await db.update({ model: "user", where: [{ field: "id", value: user }], update: { emailVerified: true } });
  const get = (path: string) => fetch(`${env?.base}/v1/documents${path}`, { headers: { cookie: ann.browser.cookie() } });
  return { db, user, get };
}
const idsOf = async (res: Response) => ((await res.json()) as { documents: { id: string }[] }).documents.map((d) => d.id);

describe("odd identity data and mixed-case ACLs", () => {
  it("a blank linked accountId does not break the list or one document", async () => {
    const { db, user, get } = await boot({ "mine.md": ["ann@example.com"] });
    const now = new Date();
    await db.create({ model: "account", data: { userId: user, accountId: "", providerId: "github", createdAt: now, updatedAt: now } });
    const list = await get("");
    expect(list.status).toBe(200);
    expect(await idsOf(list)).toEqual(["folder/mine.md"]);
    expect((await get("/folder%2Fmine.md")).status).toBe(200);
  });

  it("an ACL written Ann@Example.COM still reaches the user, and another email stays hidden", async () => {
    const { get } = await boot({ "mine.md": ["Ann@Example.COM"], "theirs.md": ["Bob@Example.COM"] });
    expect(await idsOf(await get(""))).toEqual(["folder/mine.md"]);
  });

  it("an email stored with capitals still matches a lowercase ACL", async () => {
    const { db, user, get } = await boot({ "mine.md": ["ann@example.com"] });
    await db.update({ model: "user", where: [{ field: "id", value: user }], update: { email: "Ann@Example.com" } });
    expect(await idsOf(await get(""))).toEqual(["folder/mine.md"]);
  });
});
