import { describe, expect, it } from "vitest";
import { ctx, outcome, type Provider, refresherFor, seeded, status, useEnv } from "../kit.js";
import { racing, refuse, resetRefusal } from "./gate.js";

useEnv();
resetRefusal();

describe("a refusal that races another process: the row changed under it", () => {
  it("another process rotated the token during the call: its token is returned and the row is not marked", async () => {
    const id = await seeded();
    const { real, store } = await refresherFor([]);
    const known = await store.find(id);
    const rotate = async () => {
      await real.update({ model: "account", where: [{ field: "id", value: id }], update: { accessToken: "rotated-at", refreshToken: "rotated-rt" } });
    };
    const provider: Provider = {
      id: "replay",
      refreshAccessToken: async () => {
        await rotate();
        throw { status: 400 };
      },
    };
    const { refresher } = await refresherFor([provider]);
    await refresher.refreshAccount(id, known ?? undefined);
    expect([status(id), (await store.find(id))?.accessToken]).toEqual(["active", "rotated-at"]);
  });

  it("the row vanished during the call: NEEDS_AUTH, not a crash", async () => {
    const id = await seeded();
    const { refresher, store } = await refresherFor(
      [refuse()],
      racing((rowId) => ctx.env.db.prepare("delete from account where id = ?").run(rowId)),
    );
    const known = await store.find(id);
    expect(await outcome(refresher.refreshAccount(id, known ?? undefined))).toEqual({
      code: "NEEDS_AUTH",
      message: "the provider refused the refresh token",
    });
  });
});
