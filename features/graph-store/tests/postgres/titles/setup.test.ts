import { randomBytes } from "node:crypto";
import pg from "pg";
import { describe, expect, it } from "vitest";
import * as gs from "../../../src/index.js";
import { factories, postgresServer } from "../../support/pg/factories.js";

const pgFactory = factories.find((f) => f.name === "postgres")!;

// spec graph-store: the store needs pg_trgm, and a database where it cannot be created must fail at startup, clearly.
describe.skipIf(pgFactory.skip !== undefined)("postgres: pg_trgm cannot be created", () => {
  it("opening the store as a role without CREATE on the database rejects with GraphError SETUP naming pg_trgm", async () => {
    const { url } = await postgresServer();
    const [db, role, password] = [`d_${randomBytes(6).toString("hex")}`, `r_${randomBytes(6).toString("hex")}`, randomBytes(12).toString("hex")];
    const admin = new pg.Client({ connectionString: url });
    await admin.connect();
    await admin.query(`CREATE DATABASE ${db}`);
    await admin.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}'`);
    await admin.end();
    // A new database grants PUBLIC only CONNECT and TEMP. CREATE EXTENSION needs CREATE on it, even for a trusted extension.
    const as = new URL(url);
    [as.username, as.password, as.pathname] = [role, password, `/${db}`];
    const pool = new pg.Pool({ connectionString: as.toString() }).on("error", () => undefined);
    try {
      const err = await gs.createPostgresGraphStore({ pool }).then(
        () => undefined,
        (e: unknown) => e,
      );
      expect(err).toBeInstanceOf(gs.GraphError);
      expect((err as gs.GraphError).code).toBe("SETUP");
      expect((err as Error).message).toMatch(/pg_trgm/);
    } finally {
      await pool.end();
    }
  });
});
