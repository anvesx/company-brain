import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import * as gs from "../../src/index.js";
import { factories, schemaPool } from "../support/pg/factories.js";

const pgFactory = factories.find((f) => f.name === "postgres")!;

// spec deploy, Behaviour 5: the store must not pile listeners onto a pool the caller reuses across retries.
describe.skipIf(pgFactory.skip !== undefined)("postgres: pool listeners", () => {
  it("opening a store 15 times on one pool adds no 'error' listener of its own", async () => {
    const pool = await schemaPool(`p_${randomBytes(6).toString("hex")}`);
    const before = pool.listenerCount("error");
    for (let i = 0; i < 15; i++) await gs.createPostgresGraphStore({ pool });
    expect(pool.listenerCount("error")).toBe(before);
  });
});
