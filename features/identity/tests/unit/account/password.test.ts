import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { breachedPasswords } from "../../../src/index.js";
import { rows } from "../../support/db.js";
import { Browser, json } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
let n = 0;
beforeAll(async () => {
  env = await boot();
});
afterAll(() => env.close());

const tryPassword = (password: string) =>
  new Browser(env.base).call("/api/auth/sign-up/email", { json: { name: "P", email: `p${++n}@example.com`, password } });

// Sixteen different words joined by hyphens: exactly 128 characters, the longest accepted password.
const LONG = "lantern-quartzes-violets-anchors-meadows-pewters-orchids-bramble-thistle-cobalts-marmots-juniper-saffron-wombats-tundras-glacier";

const rejects = async (password: string) => {
  const res = await tryPassword(password);
  expect(res.status).toBe(400);
  expect(await json(res)).toMatchObject({ code: "BAD_INPUT", field: "password" });
};

describe("password rules", () => {
  it("rule 1: the bundled breached list holds the top 10,000", () => {
    expect(breachedPasswords.size).toBe(10_000);
    expect(breachedPasswords.has("123456")).toBe(true);
    expect(breachedPasswords.has("password")).toBe(true);
  });

  it("rule 13: a password of 11 characters is BAD_INPUT naming password", () => rejects("abcdefghijk"));

  it("rule 13: a password of 129 characters is BAD_INPUT naming password", () => rejects("a".repeat(129)));

  it("rule 1: 12 and 128 characters are both accepted", async () => {
    expect((await tryPassword("q7-lantern-zx")).status).toBe(200);
    expect((await tryPassword(LONG)).status).toBe(200);
  });

  it("rule 1: length counts characters, not UTF-16 units", async () => {
    expect((await tryPassword("🔑🌵🚀🎲🍋🧲🪁🦊🎻🛶🧩🪐")).status).toBe(200);
    await rejects("🔑🌵🚀🎲🍋🧲🪁🦊🎻🛶🧩");
  });

  it("rule 13: a breached password long enough to pass length is BAD_INPUT naming password", async () => {
    const breached = [...breachedPasswords].find((p) => [...p].length >= 12 && [...p].length <= 128);
    expect(breached, "the list needs one entry of 12+ characters").toBeDefined();
    await rejects(String(breached));
  });

  it("rule 1: nothing else about shape is checked: all lowercase, no digit, no symbol", async () => {
    expect((await tryPassword("onlylowercaseletters")).status).toBe(200);
  });

  it("rule 1: a rejected password creates no user", async () => {
    const before = rows(env.db, "select id from user").length;
    await rejects("short");
    expect(rows(env.db, "select id from user")).toHaveLength(before);
  });

  it("rule 1: the breached check ignores case and Unicode width", async () => {
    const entry = String([...breachedPasswords].find((p) => [...p].length >= 12 && /^[a-z]+$/.test(p)));
    await rejects(entry.toUpperCase());
    // Full-width letters are the ASCII letters shifted by 0xFEE0; NFKC folds them back, so this is the same password.
    await rejects([...entry].map((ch) => String.fromCodePoint(ch.codePointAt(0)! + 0xfee0)).join(""));
  });

  it("rule 1: zxcvbn rejects patterned passwords the exact list misses: Q1w2e3r4t5y6 and Password1234", async () => {
    await rejects("Q1w2e3r4t5y6");
    await rejects("Password1234");
  });

  it("rule 1: a random 16 character passphrase is accepted", async () => {
    expect((await tryPassword("Xk9#mP2$vL8@nQ4!")).status).toBe(200);
  });
});
