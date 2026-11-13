import { describe, expect, it } from "vitest";
import { count, when } from "../../src/ui/model/format.js";
import { stateOf } from "../../src/ui/model/state.js";

const NOW = Date.UTC(2026, 10, 13, 12, 0);
const ok = { failures: 0, lastError: null, syncing: false };

describe("exact counts and times", () => {
  it("groups thousands and says how long ago in whole units", () => {
    expect(count(1284)).toBe("1,284");
    expect(when(null, NOW)).toBe("Not yet synced");
    expect(when(NOW - 5_000, NOW)).toContain("just now");
    expect(when(NOW - 60_000, NOW)).toContain("1 minute ago");
    expect(when(NOW - 3 * 3_600_000, NOW)).toBe("2026-11-13 09:00 UTC (3 hours ago)");
    expect(when(NOW - 2 * 86_400_000, NOW)).toContain("2 days ago");
  });
});

describe("one state per account, worst first", () => {
  const a = { status: "active" as const, lastSyncAt: 1 };
  it("ranks reconnect over syncing over error over never over healthy", () => {
    const bad = { failures: 2, lastError: "boom", syncing: true };
    expect(stateOf({ ...a, status: "needs-auth" }, bad).label).toBe("Needs reconnect");
    expect(stateOf(a, bad).label).toBe("Syncing");
    expect(stateOf(a, { ...bad, syncing: false })).toMatchObject({ label: "Error", reason: "boom" });
    expect(stateOf({ ...a, lastSyncAt: null }, ok).label).toBe("Not yet synced");
    expect(stateOf(a, ok).label).toBe("Healthy");
  });
});
