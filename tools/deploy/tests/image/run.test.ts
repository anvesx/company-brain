import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPostgres, type Throwaway } from "../../../../features/graph-store/tests/support/pg/server.js";
import { buildImage, dockerSkipReason, runImage, stopContainer } from "../support/docker.js";
import { until } from "../support/http.js";

// spec deploy, Behaviour 9-11: the real image against a real Postgres on this machine. No mocks.
const reason = process.env.CI === "true" ? undefined : dockerSkipReason();
if (reason) console.warn(`image tests skipped: ${reason}`);

const secret = randomBytes(32).toString("hex");
const identitySecret = randomBytes(32).toString("hex");
// identity accepts http only on a loopback host; the real deployment sets an https BASE_URL.
const origin = "http://localhost:8080";

describe.skipIf(reason !== undefined)("the image, run against a local Postgres", () => {
  let server: Throwaway;
  const containers: string[] = [];
  const start = (databaseUrl: string) => {
    const env = { DATABASE_URL: databaseUrl, BRAIN_AUTH_SECRET: secret, IDENTITY_SECRET: identitySecret, BASE_URL: origin };
    const c = runImage(env);
    containers.push(c.id);
    return `http://127.0.0.1:${c.port}`;
  };
  const health = async (base: string) => (await fetch(`${base}/healthz`)).status;
  let base = "";

  beforeAll(async () => {
    buildImage();
    server = await startPostgres({ listenAll: true });
    base = start(server.url.replace("127.0.0.1", "host.docker.internal"));
    await until(async () => (await health(base)) === 200, 90_000);
  }, 20 * 60_000);
  afterAll(() => {
    for (const id of containers) stopContainer(id);
    server?.stop();
  });

  it("GET /healthz answers 200 ok without a token", async () => {
    const res = await fetch(`${base}/healthz`);
    expect([res.status, await res.json()]).toEqual([200, { status: "ok" }]);
  });

  it("identity is mounted: email sign-up from the app's own origin succeeds", async () => {
    const body = JSON.stringify({ email: `a${randomBytes(4).toString("hex")}@brain.test`, password: randomBytes(12).toString("hex"), name: "A" });
    const res = await fetch(`${base}/api/auth/sign-up/email`, { method: "POST", body, headers: { "content-type": "application/json", origin } });
    expect(res.status).toBe(200);
  });

  it("the graph API reads the seeded document with a session cookie, and refuses a request without one", async () => {
    // Imported here so a skipped run never needs the built packages. The same helpers the non-Docker `serve` test uses.
    const { seed, signUp } = await import("../../../../apps/brain/tests/serve/session.js");
    const cfg = { BASE_URL: origin, IDENTITY_SECRET: identitySecret };
    const ann = await signUp(base, server.url, cfg);
    await seed(server.url, ann.who); // under the tenant and user identity assigned, in the database the container uses
    const res = await fetch(`${base}/v1/documents`, { headers: { cookie: ann.cookie } });
    expect(res.status).toBe(200);
    expect((await res.json()).documents.map((d: { id: string }) => d.id)).toEqual(["d1"]);
    expect((await fetch(`${base}/v1/documents`)).status).toBe(401);
    const bob = await signUp(base, server.url, cfg);
    expect((await (await fetch(`${base}/v1/documents`, { headers: { cookie: bob.cookie } })).json()).documents).toEqual([]);
  });

  it("an unreachable database gives 503 unavailable, and the process stays up", async () => {
    const dead = start("postgres://postgres:x@host.docker.internal:1/postgres");
    await until(async () => (await health(dead)) === 503, 60_000);
    expect(await (await fetch(`${dead}/healthz`)).json()).toEqual({ status: "unavailable" });
    expect(await health(dead)).toBe(503);
  });

  it("a Postgres restart under the running container recovers to 200", async () => {
    server.restart();
    await until(async () => (await health(base)) === 200, 30_000);
  });
});
