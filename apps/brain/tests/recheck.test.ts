import { afterEach, describe, expect, it } from "vitest";
import type { Recheck } from "../src/live/recheck.js";
import { bootBrain, type Env, signUp, whoIs } from "./identity/boot.js";

let env: Env | undefined;
afterEach(async () => env?.close());

/** Boots the brain with Ann able to read d1 and d2, and an optional live check. */
async function boot(recheck?: Recheck) {
  env = await bootBrain(recheck ? { recheck } : {});
  const ann = await signUp(env, "Ann");
  const { tenant, user } = await whoIs(env, ann.browser.cookie());
  const n = (id: string, kind: "person" | "document") => ({ tenant, id, kind, source: "drive", address: `addr-${id}`, title: id, version: "1", props: {} });
  for (const x of [n(user, "person"), n("d1", "document"), n("d2", "document")]) env.store.upsertNode(x, 1);
  for (const d of ["d1", "d2"]) env.store.addEdge({ tenant, from: user, to: d, kind: "can-read", source: "drive" }, 1);
  return { get: (path: string) => fetch(`${env?.base}${path}`, { headers: { cookie: ann.browser.cookie() } }), user, tenant };
}

describe("live permission recheck", () => {
  it("drops a document the source no longer lets the asker read, from the list and by id", async () => {
    const { get } = await boot(async (doc) => doc.id !== "d2");
    const list = (await (await get("/v1/documents")).json()) as { documents: { id: string }[] };
    expect(list.documents.map((d) => d.id)).toEqual(["d1"]);
    expect((await get("/v1/documents/d2")).status).toBe(404);
    expect((await get("/v1/documents/d1")).status).toBe(200);
  });

  it("passes the document and the asker to the check", async () => {
    const seen: string[] = [];
    const { get, user, tenant } = await boot(async (doc, caller) => {
      seen.push(`${doc.source}:${doc.address}:${caller.user}:${caller.tenant}`);
      return true;
    });
    await get("/v1/documents/d1");
    expect(seen).toEqual([`drive:addr-d1:${user}:${tenant}`]);
  });

  it("fails closed when the check throws: hidden, never a 500", async () => {
    const { get } = await boot(async () => {
      throw new Error("source down");
    });
    const list = (await (await get("/v1/documents")).json()) as { documents: unknown[] };
    expect(list.documents).toEqual([]);
    expect((await get("/v1/documents/d1")).status).toBe(404);
  });

  it("changes nothing when no check is configured", async () => {
    const { get } = await boot();
    const list = (await (await get("/v1/documents")).json()) as { documents: unknown[] };
    expect(list.documents).toHaveLength(2);
  });
});
