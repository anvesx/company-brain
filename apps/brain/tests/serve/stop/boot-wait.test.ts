import { createPostgresGraphStore } from "@anvesx/graph-store";
import { createIdentity } from "@anvesx/identity";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPostgres, type Throwaway } from "../../../../../features/graph-store/tests/support/pg/server.js";
import { serve } from "../../../src/serve/serve.js";
import type { BootDeps } from "../../../src/serve/startup.js";
import { env, freshDb } from "../boot.js";

// close() must wait for the boot in flight. Real server and real Postgres; the only injection is a delay around two
// real calls (serve's `deps` seam), so the boot is still running when close() arrives (a real boot is too fast to catch).
const knobs = { contextMs: 0, storeMs: 0, seeded: false, stored: false, identityMade: () => {} };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const deps: BootDeps = {
  createIdentity: (config) => {
    const id = createIdentity(config);
    knobs.identityMade(); // the migration is done and boot is now past it: the test sends close() here
    // The real $context, then a delay, then a flag: "seeded" only becomes true if somebody waited for $context.
    const context = id.auth.$context.then(async (c) => {
      await sleep(knobs.contextMs);
      knobs.seeded = true;
      return c;
    });
    return { ...id, auth: { ...id.auth, $context: context } };
  },
  createPostgresGraphStore: async (o) => {
    await sleep(knobs.storeMs);
    const store = await createPostgresGraphStore(o); // fails if the pool was already ended under us
    knobs.stored = true;
    return store;
  },
};

let db: Throwaway | undefined;
beforeAll(async () => {
  try {
    db = await startPostgres();
  } catch (e) {
    if (process.env["CI"] === "true") throw e;
    console.warn(`SKIPPED: boot-wait tests need Postgres (${(e as Error).message})`);
  }
}, 60_000);
afterAll(() => db?.stop());

/** Boot against a fresh database, call close() the moment identity is created, and return what the server logged. */
async function closeDuringBoot(set: Partial<typeof knobs>): Promise<string[]> {
  Object.assign(knobs, { contextMs: 0, storeMs: 0, seeded: false, stored: false }, set);
  const made = new Promise<void>((ok) => (knobs.identityMade = ok));
  const logs: string[] = [];
  const server = await serve(env(await freshDb(db as Throwaway)), (m) => logs.push(m), deps);
  await made;
  await server.close();
  return logs;
}

describe("close() during boot", () => {
  it("waits for the graph store to finish building (fails if close() stops awaiting the boot)", async (ctx) => {
    if (!db) return ctx.skip();
    const logs = await closeDuringBoot({ storeMs: 600 });
    expect(knobs.stored).toBe(true);
    expect(logs.join("\n")).not.toContain("Cannot use a pool");
  });

  it("waits for identity's $context, the oauth seed (fails if boot stops awaiting it)", async (ctx) => {
    if (!db) return ctx.skip();
    await closeDuringBoot({ contextMs: 600 });
    expect(knobs.seeded).toBe(true);
  });
});
