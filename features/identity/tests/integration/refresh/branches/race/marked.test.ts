import { describe, expect, it } from "vitest";
import { type Adapter, ctx, outcome, refresherFor, seeded, status, useEnv } from "../kit.js";
import { racing, refuse, refusedOnce, resetRefusal } from "./gate.js";

useEnv();
resetRefusal();

const LATER = "update account set updatedAt = '2099-01-01T00:00:00.000Z',";

describe("a refusal that races another process: the row was rewritten under it", () => {
  it("someone else marked it needs-auth in between: still NEEDS_AUTH, their stored token is not handed out", async () => {
    const id = await seeded();
    const act = (rowId: string) => ctx.env.db.prepare(`${LATER} status = 'needs-auth' where id = ?`).run(rowId);
    const { refresher, store } = await refresherFor([refuse()], racing(act));
    const known = await store.find(id);
    expect((await outcome(refresher.refreshAccount(id, known ?? undefined))).code).toBe("NEEDS_AUTH");
    expect(status(id)).toBe("needs-auth");
  });

  it("an active row with no access token in between: NEEDS_AUTH", async () => {
    const id = await seeded();
    const act = (rowId: string) => ctx.env.db.prepare(`${LATER} accessToken = NULL where id = ?`).run(rowId);
    const { refresher, store } = await refresherFor([refuse()], racing(act));
    const known = await store.find(id);
    expect((await outcome(refresher.refreshAccount(id, known ?? undefined))).code).toBe("NEEDS_AUTH");
  });

  it("a row read back with no updatedAt is still marked needs-auth on a refusal", async () => {
    const id = await seeded();
    const blank = (real: Adapter) => ({
      ...real,
      findOne: async (args: Parameters<typeof real.findOne>[0]) => {
        const row = await real.findOne(args);
        return refusedOnce.value && row ? { ...row, updatedAt: null } : row;
      },
    });
    const { refresher, store } = await refresherFor([refuse()], blank);
    const known = await store.find(id);
    expect((await outcome(refresher.refreshAccount(id, known ?? undefined))).code).toBe("NEEDS_AUTH");
    expect(status(id)).toBe("needs-auth");
  });
});
