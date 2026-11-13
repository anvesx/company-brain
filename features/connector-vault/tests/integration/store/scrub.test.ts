import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { importRecords, loadKeyring } from "../../../src/index.js";
import { database, hex, skip } from "../../support/db.js";

const SECRET = "SUPER-SECRET-TOKEN-VALUE";
const KEY = hex();
let db: Awaited<ReturnType<typeof database>>;
beforeAll(async () => {
  if (!skip) db = await database(`k1:${KEY}`);
});
afterAll(async () => {
  if (!skip) await db.close();
});

/** Everything a failing call can print: message, stack, name, code, and the JSON of the error object. */
const dump = (e: unknown) => `${String(e)}\n${(e as Error).stack}\n${JSON.stringify(e, Object.getOwnPropertyNames(e as object))}`;

describe.skipIf(skip)("tokens and keys never appear in errors", () => {
  test("failing open, failing put, failing count check, bad keyring", async () => {
    await db.vault.put("t1", { id: "s1", owner: "u", provider: "p", token: { accessToken: SECRET, refreshToken: SECRET } });
    await db.owner.query("UPDATE connector_tokens SET sealed = replace(sealed, 'k1.', 'zz.') WHERE id='s1'");
    const seen: string[] = [];
    await db.vault.get("t1", "s1").catch((e) => seen.push(dump(e)));
    await db.vault.put("t2", { id: "s1", owner: "u", provider: "p", token: { accessToken: SECRET } }).catch((e) => seen.push(dump(e)));
    await importRecords(db.vault, [{ id: "s1", tenant: "t1", owner: "u", provider: "p", token: { accessToken: SECRET } }]).catch((e) => seen.push(dump(e)));
    try {
      loadKeyring(`k1:${KEY},k1:${KEY}`);
    } catch (e) {
      seen.push(dump(e));
    }
    expect(seen.length).toBe(4);
    for (const s of seen) {
      expect(s).not.toContain(SECRET);
      expect(s).not.toContain(KEY);
    }
  });
});
