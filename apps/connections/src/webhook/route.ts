import { createHmac, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import type { Deps } from "../deps.js";
import { readCapped } from "./body.js";

/** GitHub signs the raw body with the shared secret: `sha256=` plus the hex HMAC. Compared in constant time. */
export function validSignature(secret: string, body: string, header: string | undefined): boolean {
  const want = Buffer.from(`sha256=${createHmac("sha256", secret).update(body).digest("hex")}`);
  const got = Buffer.from(header ?? "");
  return got.length === want.length && timingSafeEqual(got, want);
}

/**
 * `POST /github`: a push or issues event for a repository queues a sync of every active GitHub account that names it.
 * No bearer: the signature is the credential. A redelivery (same X-GitHub-Delivery) is dropped by the cursor store's `seen`, which is released again when the queue refuses the job. The body is capped at 1 MB (413), and a signed body that is not JSON is 400.
 */
export function webhookRoutes(d: Deps, secret: string): Hono {
  const r = new Hono();
  r.post("/github", async (c) => {
    const body = await readCapped(c.req.raw);
    if (body === undefined) return c.json({ error: "body too large" }, 413);
    if (!validSignature(secret, body, c.req.header("x-hub-signature-256"))) return c.json({ error: "bad signature" }, 401);
    const event = c.req.header("x-github-event");
    const delivery = c.req.header("x-github-delivery");
    if (event === "ping") return c.json({ ok: true });
    if (event !== "push" && event !== "issues") return c.json({ ignored: event ?? "" }, 202);
    let repo: unknown;
    try {
      repo = (JSON.parse(body || "{}") as { repository?: { full_name?: unknown } }).repository?.full_name;
    } catch {
      return c.json({ error: "body is not JSON" }, 400);
    }
    if (!delivery || typeof repo !== "string") return c.json({ error: "missing delivery id or repository" }, 400);
    const accounts = d.store.active(repo);
    let queued = 0;
    for (const a of accounts) {
      const key = `gh:${delivery}:${a.id}`;
      if (d.cursors.seen(a.tenant, key)) continue;
      // Recorded first so a parallel redelivery is dropped; released if the queue refused it or failed (the error then surfaces as 500), so GitHub's redelivery can try again.
      const taken = await d.jobs?.requestSync(a.tenant, a.id, "webhook", delivery).catch((e: unknown) => {
        d.cursors.forget(a.tenant, key);
        throw e;
      });
      if (taken) queued++;
      else d.cursors.forget(a.tenant, key);
    }
    return c.json({ queued }, 202);
  });
  return r;
}
