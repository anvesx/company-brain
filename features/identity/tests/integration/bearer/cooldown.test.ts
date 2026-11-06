import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { failure, signUp } from "../../support/http.js";
import { connect } from "../../support/oauth.js";
import { boot, type Env } from "../../support/server.js";
import { verify as check, fetches, login, MIN } from "./helpers.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const verify = (token: string) => check(env, token);
const count = () => fetches(env);

describe("unknown key id cooldown", () => {
  const foreignToken = async () => {
    const other = await boot();
    const ada = await signUp(other, "Ada");
    const token = (await connect(ada.browser, other.base, other.config.resource)).tokens.access_token;
    await other.close();
    return token;
  };

  it("rule 8: an unknown key id inside 60 s refetches nothing; at 60 s it refetches once; both end UNAUTHENTICATED", async () => {
    const foreign = await foreignToken();
    await verify((await login(env, "Ada")).tokens.access_token);
    const first = count();
    env.clock.advance(MIN - 1);
    expect((await failure(verify(foreign))).code).toBe("UNAUTHENTICATED");
    expect(count()).toBe(first);
    env.clock.advance(1);
    const error = await failure(verify(foreign));
    expect([error.code, error.message, count()]).toEqual(["UNAUTHENTICATED", "access token is not valid", first + 1]);
  });

  it("rule 8: a refetch for an unknown key id restarts the cooldown", async () => {
    const foreign = await foreignToken();
    await verify((await login(env, "Ada")).tokens.access_token);
    env.clock.advance(MIN);
    await failure(verify(foreign));
    const after = count();
    env.clock.advance(MIN - 1);
    await failure(verify(foreign));
    expect(count()).toBe(after);
  });

  it("rule 8: a stale key set is fetched once, not twice, for an unknown key id", async () => {
    const foreign = await foreignToken();
    await verify((await login(env, "Ada")).tokens.access_token);
    const first = count();
    env.clock.advance(60 * MIN);
    await failure(verify(foreign));
    expect(count()).toBe(first + 1);
  });
});
