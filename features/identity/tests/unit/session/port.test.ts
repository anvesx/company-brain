import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { failure, signUp } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const none = new Headers();

describe("identity port, session side", () => {
  it("rule 2: fromSession and fromBearer return null when the credential is absent", async () => {
    expect(await env.identity.port.fromSession(none)).toBeNull();
    expect(await env.identity.port.fromBearer(none)).toBeNull();
  });

  it("rule 2: require with no credential throws UNAUTHENTICATED", async () => {
    expect((await failure(env.identity.port.require(none))).code).toBe("UNAUTHENTICATED");
  });

  it("rule 2: an unknown session cookie is no caller", async () => {
    const headers = new Headers({ cookie: "better-auth.session_token=not-a-session.sig" });
    expect(await env.identity.port.fromSession(headers)).toBeNull();
    expect((await failure(env.identity.port.require(headers))).code).toBe("UNAUTHENTICATED");
  });

  it("rule 8: a malformed bearer token throws UNAUTHENTICATED", async () => {
    const headers = new Headers({ authorization: "Bearer not.a.jwt" });
    expect((await failure(env.identity.port.fromBearer(headers))).code).toBe("UNAUTHENTICATED");
    expect((await failure(env.identity.port.require(headers))).code).toBe("UNAUTHENTICATED");
  });

  it("rule 3: a session caller carries the user, the active organization, kind session and no scopes", async () => {
    const ada = await signUp(env, "Ada");
    const caller = await env.identity.port.fromSession(ada.browser.headers());
    expect(caller).toMatchObject({ user: ada.userId, kind: "session", scopes: [] });
    expect(caller?.tenant).toEqual(expect.any(String));
  });

  it("rule 3: a session with no organization throws NO_ORGANIZATION", async () => {
    const ada = await signUp(env, "Ada");
    env.db.prepare("delete from member where userId = ?").run(ada.userId);
    env.db.prepare("update session set activeOrganizationId = null where userId = ?").run(ada.userId);
    expect((await failure(env.identity.port.require(ada.browser.headers()))).code).toBe("NO_ORGANIZATION");
  });

  it("rule 3: an active organization the user has left is not a tenant", async () => {
    const ada = await signUp(env, "Ada");
    env.db.prepare("delete from member where userId = ?").run(ada.userId);
    expect((await failure(env.identity.port.require(ada.browser.headers()))).code).toBe("NO_ORGANIZATION");
  });
});
