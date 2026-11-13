import { createHmac } from "node:crypto";
import { fixture } from "@anvesx/connectors/testing/replay";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { skip } from "../../../../features/google-identity/tests/support/db.js";
import { routes } from "../sync/fixture.js";
import { bootUi } from "../ui/harness.js";

const HOOK = "hook-secret";
const live: Record<string, { status: number; body: unknown }> = { ...routes };
let s: Awaited<ReturnType<typeof bootUi>>;
beforeAll(async () => {
  if (!skip) s = await bootUi({ routes: live, auto: { webhookSecret: HOOK, schema: `ws_${Date.now()}` } });
});
afterAll(() => s?.close());

const until = async <T>(f: () => T | undefined | Promise<T | undefined>, ms = 20_000): Promise<T> => {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 100))) {
    const v = await f();
    if (v) return v;
  }
  throw new Error("timed out");
};
const form = { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" } };
const push = (id: string, repo: string, key = HOOK) => {
  const body = JSON.stringify({ repository: { full_name: repo } });
  const sig = `sha256=${createHmac("sha256", key).update(body).digest("hex")}`;
  return { method: "POST", body, headers: { "x-github-event": "push", "x-github-delivery": id, "x-hub-signature-256": sig } };
};
const grow = (path: string) => {
  const tree = fixture("github/tree") as { tree: object[] };
  const next = { ...tree, tree: [...tree.tree, { path, mode: "100644", type: "blob", sha: "7".repeat(40), size: 9 }] };
  for (const k of Object.keys(live)) if (k.includes("/git/trees/")) live[k] = { status: 200, body: next };
};

describe.skipIf(skip)("auto sync", () => {
  it("syncs after connect and repo change, then on a signed webhook and on a poll tick, with no Sync now", async () => {
    const b = await s.signedIn("ann");
    const id = /connected=([^&]+)/.exec(await s.connect(b))?.[1] ?? "";
    const page = async () => (await b.send(`${s.base}/accounts/${id}`)).text();
    const node = (p: string) => s.graph.node("ann@example.com", `github:${id}/${p}`);

    await b.send(`${s.base}/accounts/${id}/repo`, { ...form, headers: { ...form.headers, origin: s.base }, body: "repo=acme%2Fhandbook" });
    await until(() => node("README.md"));
    const first = await until(async () => ((await page()).includes("Healthy") ? await page() : undefined));
    expect(first).not.toMatch(/Items<\/dt><dd class="big">0</);
    expect(first).not.toContain("Not yet synced");

    grow("docs/new.md");
    const bad = await fetch(`${s.base}/v1/webhooks/github`, push("d-0", "acme/handbook", "wrong"));
    expect(bad.status).toBe(401);
    const hook = await fetch(`${s.base}/v1/webhooks/github`, push("d-1", "acme/handbook"));
    expect(await hook.json()).toEqual({ queued: 1 });
    await until(() => node("docs/new.md"));
    expect(await (await fetch(`${s.base}/v1/webhooks/github`, push("d-1", "acme/handbook"))).json()).toEqual({ queued: 0 });

    grow("docs/polled.md");
    s.clock.t += 30 * 60 * 1000;
    expect(await s.jobs?.tick()).toMatchObject({ queued: 1 });
    await until(() => node("docs/polled.md"));
    expect(s.store.health.read("ann@example.com", id).failures).toBe(0);
    expect(await page()).toContain("Healthy");
  }, 60_000);
});
