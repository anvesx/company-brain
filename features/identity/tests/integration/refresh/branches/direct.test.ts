import { describe, expect, it } from "vitest";
import { IdentityError } from "../../../../src/index.js";
import { MINUTE } from "../../../support/db.js";
import { type Adapter, ctx, ok, outcome, type Provider, refresherFor, seeded, status, useEnv } from "./kit.js";

useEnv();

describe("refreshAccount asked directly", () => {
  it("an unknown account is BAD_INPUT naming accountId", async () => {
    const { refresher } = await refresherFor([{ id: "replay", refreshAccessToken: ok }]);
    const error = await refresher.refreshAccount("no-such-id").then(
      () => new Error("resolved"),
      (e: unknown) => e as IdentityError,
    );
    expect([error instanceof IdentityError, (error as IdentityError).code, (error as IdentityError).field, error.message]).toEqual([
      true,
      "BAD_INPUT",
      "accountId",
      "accountId: no such account",
    ]);
  });

  it("a needs-auth row answers its stored state with the message, and the provider is not called", async () => {
    const id = await seeded();
    ctx.env.db.prepare("update account set status = 'needs-auth' where id = ?").run(id);
    const { refresher } = await refresherFor([{ id: "replay", refreshAccessToken: ok }]);
    expect(await outcome(refresher.refreshAccount(id))).toEqual({ code: "NEEDS_AUTH", message: "sign in to this connector again" });
  });

  it("a row another process leases is LEASED with its message, and the provider is not called", async () => {
    const id = await seeded();
    ctx.env.db.prepare("update account set refreshLease = 'sweep', refreshLeaseUntil = ? where id = ?").run(ctx.env.clock.now() + 2 * MINUTE, id);
    let called = 0;
    const { refresher } = await refresherFor([
      {
        id: "replay",
        refreshAccessToken: async () => {
          called += 1;
          return { accessToken: "x" };
        },
      },
    ]);
    expect(await outcome(refresher.refreshAccount(id))).toEqual({ code: "LEASED", message: "another process is refreshing this account" });
    expect(called).toBe(0);
  });

  it("under its own lease it refreshes the row as it is after the lease is taken, not as it was first read", async () => {
    const id = await seeded();
    let sawToken = "";
    let reads = 0;
    const provider: Provider = {
      id: "replay",
      refreshAccessToken: async (token) => {
        sawToken = token;
        return { accessToken: "fresh" };
      },
    };
    const wrap = (real: Adapter) => ({
      ...real,
      findOne: async (args: Parameters<typeof real.findOne>[0]) => {
        const row = await real.findOne(args);
        if (args.model === "account" && ++reads === 1)
          await real.update({ model: "account", where: [{ field: "id", value: id }], update: { refreshToken: "rotated-since" } });
        return row;
      },
    });
    const { refresher } = await refresherFor([provider], wrap);
    await refresher.refreshAccount(id);
    expect(sawToken).toBe("rotated-since");
    expect(status(id)).toBe("active");
  });
});
