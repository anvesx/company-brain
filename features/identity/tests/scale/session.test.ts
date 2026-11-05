import type { DatabaseSync } from "node:sqlite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { openDb, rows, tempDbPath } from "../support/db.js";
import { signUp } from "../support/http.js";
import { boot, type Env } from "../support/server.js";

/** Wraps the database so every statement better-auth prepares is recorded, then runs as normal. */
const spy = (db: DatabaseSync, seen: string[]): DatabaseSync =>
  new Proxy(db, {
    get(target, key) {
      if (key === "prepare")
        return (sql: string) => {
          seen.push(sql);
          return target.prepare(sql);
        };
      const value = Reflect.get(target, key) as unknown;
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

const seen: string[] = [];
let env: Env;
beforeAll(async () => {
  const path = tempDbPath();
  env = await boot({ database: spy(openDb(path), seen) }, path);
});
afterAll(() => env.close());

it("rule 15: a session lookup reads by index: the real statements it runs never scan a table", async () => {
  const ada = await signUp(env, "Ada");
  await env.identity.port.fromSession(ada.browser.headers()); // the first lookup also creates the signing key
  seen.length = 0;
  const caller = await env.identity.port.fromSession(ada.browser.headers());
  expect(caller?.user).toBe(ada.userId);
  // Hand count: the lookup runs one select on `session` (by token), one on `user` (by id) and the
  // port's membership count on `member` (user and organization), and none on the signing-key table: exactly 3 selects.
  const selects = seen.filter((sql) => /^\s*select/i.test(sql));
  expect(seen.filter((sql) => /jwks/.test(sql))).toEqual([]);
  expect(selects.length).toBe(3);
  for (const sql of selects) {
    const plan = rows(env.db, `explain query plan ${sql}`).map((r) => String(r["detail"]));
    // SQLite says "SEARCH <table> USING INDEX" for an index read and "SCAN <table>" for a full table read.
    expect(
      plan.filter((line) => /^SCAN /.test(line)),
      sql,
    ).toEqual([]);
    expect(
      plan.some((line) => /^SEARCH .* USING (COVERING )?INDEX|^SEARCH .*PRIMARY KEY/.test(line)),
      sql,
    ).toBe(true);
  }
  expect(selects.some((sql) => /from "session"/i.test(sql) && /"token"/.test(sql))).toBe(true);
});
