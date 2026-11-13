import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { boot, type Env, ids } from "../support/app.js";
import { doc } from "../support/world.js";

// SPEC item 12: the modified range is compared as parsed instants, never text.
let env: Env;
const v = { tenant: "dt", user: "v" };
const AT: Record<string, string> = {
  before: "2026-05-05T09:59:59Z",
  a: "2026-05-05T10:00:00Z",
  frac: "2026-05-05T10:00:00.500Z",
  b: "2026-05-05T10:00:01Z",
  offsetSame: "2026-05-05T15:30:01+05:30", // the same instant as b, written with an offset
  offsetEarly: "2026-05-05T10:00:00+05:30", // 04:30Z: text-sorts after 05:00Z, instant is before it
};
beforeAll(async () => {
  env = await boot();
  const s = env.store;
  await s.upsertNode({ tenant: "dt", id: "v", kind: "person", source: "x", address: "v", title: "v", version: "1", props: {} }, 1);
  for (const [i, [id, modified]] of Object.entries(AT).entries()) {
    await s.upsertNode(doc("dt", id, i, { zone: "company", owner: "v", modified }), 1);
    await s.addEdge({ tenant: "dt", from: "v", to: id, kind: "can-read", source: "t" }, 1);
  }
}, 120_000);
afterAll(async () => env.stop(), 120_000);

const got = async (qs: string) => ids((await env.call(`/files?${qs}`, v)).body).sort();
const z = (s: string) => encodeURIComponent(s);
describe("modified range compares instants", () => {
  it("to is inclusive of the whole second it names (a fraction inside it still matches)", async () => {
    expect(await got("to=2026-05-05T10:00:00Z&from=2026-05-05T10:00:00Z")).toEqual(["a", "frac"]);
    expect(await got("to=2026-05-05T10:00:00Z&from=2026-05-05T09:00:00Z")).toEqual(["a", "before", "frac"]);
  });
  it("from == to matches exactly that second", async () => expect(await got("from=2026-05-05T10:00:01Z&to=2026-05-05T10:00:01Z")).toEqual(["b", "offsetSame"]));
  it("+05:30 is the same instant as its UTC form, in from and in to", async () => {
    const t = z("2026-05-05T15:30:01+05:30");
    expect(await got(`from=${t}&to=${t}`)).toEqual(["b", "offsetSame"]);
    expect(await got(`from=2026-05-05T10:00:01Z&to=2026-05-05T10:00:01Z`)).toEqual(await got(`from=${t}&to=${t}`));
  });
  it("a file written with an offset is placed by its instant, not by its text", async () => {
    expect(await got("from=2026-05-05T05:00:00Z")).toEqual(["a", "b", "before", "frac", "offsetSame"]);
    expect(await got(`to=${z("2026-05-05T05:00:00+00:00")}`)).toEqual(["offsetEarly"]);
  });
  it("a date alone covers its whole UTC day on both ends", async () => {
    expect(await got("from=2026-05-05&to=2026-05-05")).toHaveLength(6);
    expect(await got("from=2026-05-06")).toEqual([]);
    expect(await got("to=2026-05-04")).toEqual([]);
  });
  it("an empty range is an empty page, 200", async () =>
    expect((await env.call("/files?from=2026-05-05T11:00:00Z&to=2026-05-05T10:00:00Z", v)).status).toBe(200));
  for (const bad of ["yesterday", "2026-13-01", "2026-02-30", "2026-05-05T10:00:00", "10:00"])
    it(`${bad} is 400, never 500`, async () => expect((await env.call(`/files?from=${z(bad)}`, v)).status).toBe(400));
});
