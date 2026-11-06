import { describe, expect, it } from "vitest";
import { cursorKeyFrom } from "../../../src/serve/local/key.js";
import { readEnv } from "../../../src/serve/startup.js";

// Every env mistake must fail at once with a plain message. A typo that slipped through would make
// serve() retry forever (DATABASE_URL), fail every request (short secret) or spin setTimeout (NaN).
const secret = "bin-test-secret-0123456789abcdef"; // exactly 32 characters: the smallest accepted
const good = { DATABASE_URL: "postgres://u:p@db.example/brain", BRAIN_AUTH_SECRET: secret, BASE_URL: "http://localhost", IDENTITY_SECRET: "id-secret" };
const read = (over: Record<string, string | undefined>) => () => readEnv({ ...good, ...over });

describe("readEnv", () => {
  it.each(["DATABASE_URL", "BRAIN_AUTH_SECRET", "BASE_URL", "IDENTITY_SECRET"])("names %s when it is missing or empty", (key) => {
    expect(read({ [key]: undefined })).toThrow(new Error(`${key} is required`));
    expect(read({ [key]: "" })).toThrow(new Error(`${key} is required`));
  });

  const urlMessage = "DATABASE_URL must be a postgres:// or postgresql:// URL with a host";
  it.each(["notaurl", "mysql://u:p@h/db", "postgres://", "postgres:///db", "xpostgres://h/db", "postgresx://h/db"])("refuses DATABASE_URL %s", (url) => {
    expect(read({ DATABASE_URL: url })).toThrow(new Error(urlMessage));
  });
  it("accepts both postgres:// and postgresql://", () => {
    expect(readEnv({ ...good, DATABASE_URL: "postgresql://h/db" }).databaseUrl).toBe("postgresql://h/db");
    expect(readEnv(good).databaseUrl).toBe(good.DATABASE_URL);
  });

  it("refuses a secret of 31 characters and accepts 32", () => {
    expect(read({ BRAIN_AUTH_SECRET: secret.slice(1) })).toThrow(new Error("BRAIN_AUTH_SECRET must be at least 32 characters"));
    expect(read({ BRAIN_AUTH_SECRET: secret })).not.toThrow();
  });

  it.each(["abc", "0", "-5", "1.5", "", "x5", "5x", "05", " 5"])("refuses BRAIN_RETRY_MS %j", (ms) => {
    expect(read({ BRAIN_RETRY_MS: ms })).toThrow(new Error("BRAIN_RETRY_MS must be a positive integer"));
  });
  it("defaults BRAIN_RETRY_MS to 2000 ms and reads a given value as a number", () => {
    expect(readEnv(good).retryMs).toBe(2000);
    expect(readEnv({ ...good, BRAIN_RETRY_MS: "250" }).retryMs).toBe(250);
  });

  it("returns the cursor key derived from the auth secret and passes the rest through", () => {
    const out = readEnv(good);
    expect(out.cursorKey).toEqual(cursorKeyFrom(secret));
    expect(out.cursorKey).not.toEqual(cursorKeyFrom(`${secret}x`));
    expect(out.recheck).toBeUndefined(); // no BRAIN_USER_TOKENS_FILE
    expect(out.baseUrl).toBe("http://localhost");
    expect(out.identitySecret).toBe("id-secret");
  });
});
