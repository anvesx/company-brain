import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { openStore } from "../../src/accounts/store.js";
import { key } from "../accounts/fixture.js";
import { bootSync } from "../sync/fixture.js";
import { pat, root } from "./fixture.js";

let h: Awaited<ReturnType<typeof bootSync>> | undefined;
afterEach(async () => {
  await h?.close();
  h = undefined;
});
const json = async (r: Response) => (await r.json()) as Record<string, unknown>;

describe("the repo field of a github account", () => {
  it("is null until set, then returned, patched and cleared", async () => {
    h = await bootSync();
    const made = await json(await h.s.call("POST", "/v1/accounts", root, pat));
    expect(made.repo).toBeNull();
    const withRepo = await json(await h.s.call("POST", "/v1/accounts", root, { ...pat, repo: "acme/handbook" }));
    expect(withRepo.repo).toBe("acme/handbook");
    const patched = await h.s.call("PATCH", `/v1/accounts/${made.id}`, root, { repo: "acme/other" });
    expect((await json(patched)).repo).toBe("acme/other");
    const cleared = await h.s.call("PATCH", `/v1/accounts/${made.id}`, root, { repo: null });
    expect((await json(cleared)).repo).toBeNull();
    const list = (await json(await h.s.call("GET", "/v1/accounts", root))).accounts as { id: string; repo: string | null }[];
    expect(list.find((a) => a.id === withRepo.id)?.repo).toBe("acme/handbook");
  });
  it.each(["handbook", "acme/", "/handbook", "a/b/c", "acme/ handbook", ""])("refuses %j", async (repo) => {
    h = await bootSync();
    expect((await h.s.call("POST", "/v1/accounts", root, { ...pat, repo })).status).toBe(400);
    const ok = await json(await h.s.call("POST", "/v1/accounts", root, pat));
    expect((await h.s.call("PATCH", `/v1/accounts/${ok.id}`, root, { repo })).status).toBe(400);
  });
  it("is refused for a provider that has no repo", async () => {
    h = await bootSync();
    expect((await h.s.call("POST", "/v1/accounts", root, { ...pat, provider: "drive", repo: "acme/handbook" })).status).toBe(400);
  });
  it("is what a sync with no body uses, and a body repo still wins", async () => {
    h = await bootSync();
    const a = await json(await h.s.call("POST", "/v1/accounts", root, { ...pat, repo: "acme/handbook" }));
    expect((await h.s.call("POST", `/v1/accounts/${a.id}/sync`, root, {})).status).toBe(200);
    expect(h.graph.node("t1", `github:${a.id}/README.md`)).toBeDefined();
    const none = await json(await h.s.call("POST", "/v1/accounts", root, pat));
    const r = await h.s.call("POST", `/v1/accounts/${none.id}/sync`, root, {});
    expect(r.status).toBe(400);
    expect((await json(r)).error).toMatch(/repo/);
    expect((await h.s.call("POST", `/v1/accounts/${a.id}/sync`, root, { repo: "acme/missing" })).status).not.toBe(200);
  });
  it("refuses a patch that gives a drive account a repo", async () => {
    h = await bootSync();
    const d = await json(await h.s.call("POST", "/v1/accounts", root, { ...pat, provider: "drive" }));
    expect((await h.s.call("PATCH", `/v1/accounts/${d.id}`, root, { repo: "acme/handbook" })).status).toBe(400);
  });
  it("is added to a database made before the field existed", () => {
    const dir = mkdtempSync(join(tmpdir(), "conn-old-"));
    const path = join(dir, "old.db");
    const old = new DatabaseSync(path);
    old.exec("CREATE TABLE accounts (id TEXT PRIMARY KEY, tenant, owner, provider, label, kind, access, data_zone, status, secret, seq)");
    old.close();
    const store = openStore(path, key);
    const made = store.create({
      tenant: "t1",
      owner: "ann",
      provider: "github",
      label: "x",
      kind: "pat",
      access: "private",
      dataZone: "private",
      secret: "s",
      repo: "a/b",
    });
    expect(store.get("t1", made.id)?.repo).toBe("a/b");
    store.close();
    rmSync(dir, { recursive: true });
  });
});
