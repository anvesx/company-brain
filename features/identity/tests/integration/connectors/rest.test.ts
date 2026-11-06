import { existsSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createIdentity, IdentityError, RefreshError } from "../../../src/index.js";
import { one } from "../../support/db.js";
import { type Person, signUp } from "../../support/http.js";
import { connectorConfig, linkReplay, newSealKey } from "../../support/replay/flow.js";
import { type Replay, startReplay } from "../../support/replay/server.js";
import { boot, type Env } from "../../support/server.js";

let [env, replay, ada] = [undefined as unknown as Env, undefined as unknown as Replay, undefined as unknown as Person];
const key = newSealKey();
beforeEach(async () => {
  replay = await startReplay();
  env = await boot(connectorConfig(replay, key));
  ada = await signUp(env, "Ada");
});
afterEach(async () => Promise.all([env.close(), replay.close()]));

/** Every byte SQLite has written for this database: the main file plus any write-ahead log. */
const onDisk = (path: string): string =>
  [path, `${path}-wal`, `${path}-journal`]
    .filter(existsSync)
    .map((p) => readFileSync(p).toString("latin1"))
    .join("");

describe("tokens at rest (connector-accounts rule 3)", () => {
  it("rule 3: neither the access nor the refresh token is anywhere in the database file", async () => {
    const { id } = await linkReplay(env, ada);
    const token = await env.identity.port.accessToken(ada.userId, "replay", id);
    expect(token).toMatch(/^at_/);
    const row = one(env.db, "select accessToken, refreshToken from account where id = ?", id);
    expect(String(row["accessToken"])).not.toMatch(/^at_/);
    expect(String(row["refreshToken"])).not.toMatch(/^rt_/);
    expect(onDisk(env.path)).not.toContain(token);
  });

  it("rule 3: a refreshed token pair is sealed too", async () => {
    const { id } = await linkReplay(env, ada);
    await env.identity.refreshAccount(id);
    const token = await env.identity.port.accessToken(ada.userId, "replay", id);
    expect(replay.state.calls.refresh).toBe(1);
    expect(onDisk(env.path)).not.toContain(token);
    expect(String(one(env.db, "select refreshToken from account where id = ?", id)["refreshToken"])).not.toMatch(/^rt_/);
  });

  it("rule 3: the same file opened with another seal key fails closed with NEEDS_AUTH", async () => {
    const { id } = await linkReplay(env, ada);
    await env.close();
    env = await boot(connectorConfig(replay, newSealKey()), env.path);
    const outcome = await env.identity.port.accessToken(ada.userId, "replay", id).catch((error: unknown) => error);
    expect(outcome).toBeInstanceOf(RefreshError);
    expect((outcome as RefreshError).code).toBe("NEEDS_AUTH");
    expect(replay.state.calls.refresh).toBe(0);
  });

  it("rule 3: providers without a seal key refuse to boot with BAD_INPUT naming sealKey", async () => {
    const { sealKey: _dropped, ...noKey } = { ...env.config, ...connectorConfig(replay) };
    const outcome = (() => {
      try {
        return createIdentity(noKey);
      } catch (error) {
        return error;
      }
    })();
    expect(outcome).toBeInstanceOf(IdentityError);
    expect([(outcome as IdentityError).code, (outcome as IdentityError).field]).toEqual(["BAD_INPUT", "sealKey"]);
  });
});
