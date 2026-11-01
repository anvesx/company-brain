import { afterEach, describe, expect, it, vi } from "vitest";
import { liveCheck, realTimer, type Timer } from "../../src/paging/live.js";
import { req, pagedRig as rig } from "../fakes.js";
import { alice } from "../live-fakes.js";

const pointers = [{ id: "d0000" }, { id: "d0001" }] as never;

afterEach(() => vi.useRealTimers());

describe("realTimer", () => {
  it("fires the callback after the delay and not before", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    realTimer.set(fn, 50);
    vi.advanceTimersByTime(49);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("clear cancels a pending callback", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    realTimer.clear(realTimer.set(fn, 50));
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });

  it("fails closed with the real timer when the verifier hangs", async () => {
    vi.useFakeTimers();
    const run = liveCheck(() => new Promise(() => undefined), realTimer, 30, alice, pointers);
    await vi.advanceTimersByTimeAsync(30);
    expect(await run).toEqual({ allowed: new Set(), denied: 0, unverified: 2 });
  });
});

describe("liveCheck timer handling", () => {
  it("clears the timer it set, exactly once, after a normal answer", async () => {
    const set = vi.fn((_fn: () => void, _ms: number): unknown => "h1");
    const clear = vi.fn();
    const timer: Timer = { set, clear };
    await liveCheck(async () => new Map([["d0000", "allow" as const]]), timer, 30, alice, pointers);
    expect(set).toHaveBeenCalledWith(expect.any(Function), 30);
    expect(clear.mock.calls).toEqual([["h1"]]);
  });

  it("does not call clear when the timer handed back no handle", async () => {
    const clear = vi.fn();
    await liveCheck(async () => new Map(), { set: () => undefined, clear }, 30, alice, pointers);
    expect(clear).not.toHaveBeenCalled();
  });
});

describe("scan termination", () => {
  it("makes a single index call when the first page is short but non-empty", async () => {
    const { service, index } = rig(30, 30);
    await service.searchLive(req());
    expect(index.calls).toHaveLength(1);
  });

  it("stops at the first repeated full page when the index ignores offset, without truncation", async () => {
    const { service, index } = rig(150, 150, {}, { ignoreOffset: true });
    expect(await service.searchLive(req())).toMatchObject({ pointers: [], truncated: false, scanned: 200 });
    expect(index.calls).toHaveLength(2);
  });
});
