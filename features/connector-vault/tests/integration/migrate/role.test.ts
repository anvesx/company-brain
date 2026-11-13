import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { migrate } from "../../../src/index.js";
import { database, skip } from "../../support/db.js";

let db: Awaited<ReturnType<typeof database>>;
const quoted = `cv_q"${Date.now()}`;
const q = (n: string) => `"${n.replaceAll('"', '""')}"`;
beforeAll(async () => {
  if (!skip) db = await database();
});
afterAll(async () => {
  if (skip) return;
  for (const r of [quoted, "cv_su", "cv_bypass"]) await db.owner.query(`DROP OWNED BY ${q(r)}; DROP ROLE IF EXISTS ${q(r)}`).catch(() => undefined);
  await db.close();
});

describe.skipIf(skip)("migrate appRole", () => {
  test("a role name containing a double quote is escaped as an identifier and gets the grant", async () => {
    await db.owner.query(`CREATE ROLE ${q(quoted)}`);
    await migrate(db.owner, quoted);
    const r = await db.owner.query("SELECT has_table_privilege($1, 'connector_tokens', 'SELECT') AS ok", [quoted]);
    expect(r.rows[0].ok).toBe(true);
  });
  test("a superuser role is rejected", async () => {
    await db.owner.query("CREATE ROLE cv_su SUPERUSER");
    await expect(migrate(db.owner, "cv_su")).rejects.toMatchObject({ code: "UNSAFE_ROLE" });
  });
  test("a bypassrls role is rejected", async () => {
    await db.owner.query("CREATE ROLE cv_bypass BYPASSRLS");
    await expect(migrate(db.owner, "cv_bypass")).rejects.toMatchObject({ code: "UNSAFE_ROLE" });
  });
});
