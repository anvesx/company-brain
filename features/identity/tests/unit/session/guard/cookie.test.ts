import { describe, expect, it } from "vitest";
import type { Auth } from "../../../../src/auth/options.js";
import { readSession } from "../../../../src/guard/session.js";

const authAnswering = (found: unknown) => {
  const calls: Headers[] = [];
  const auth = {
    api: {
      getSession: async ({ headers }: { headers: Headers }) => {
        calls.push(headers);
        return found;
      },
    },
  } as unknown as Auth;
  return { auth, calls };
};
const session = { user: { id: "u1" }, session: { id: "s1", activeOrganizationId: "o1" } };

describe("readSession", () => {
  it("a request with no cookie is anonymous and never reaches the session store", async () => {
    const { auth, calls } = authAnswering(session);
    expect(await readSession(auth, new Headers({ authorization: "Bearer x" }))).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("a cookie the store does not know reads as null", async () => {
    const { auth, calls } = authAnswering(null);
    expect(await readSession(auth, new Headers({ cookie: "a=b" }))).toBeNull();
    expect(calls).toHaveLength(1);
  });

  it("a known session reads as user, session and active organization (null when unset)", async () => {
    const headers = new Headers({ cookie: "a=b" });
    expect(await readSession(authAnswering(session).auth, headers)).toEqual({ userId: "u1", sessionId: "s1", organizationId: "o1" });
    const bare = { user: { id: "u2" }, session: { id: "s2" } };
    expect(await readSession(authAnswering(bare).auth, headers)).toEqual({ userId: "u2", sessionId: "s2", organizationId: null });
  });
});
