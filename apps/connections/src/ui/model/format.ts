/** A whole number with thousands separators: `1,284`. */
export const count = (n: number): string => n.toLocaleString("en-US");

const AGO: [number, string][] = [
  [86_400, "day"],
  [3_600, "hour"],
  [60, "minute"],
];

/** `2026-11-13 11:36 UTC (5 minutes ago)`; `Not yet synced` for null. */
export function when(ms: number | null, nowMs: number): string {
  if (ms === null) return "Not yet synced";
  const at = `${new Date(ms).toISOString().slice(0, 16).replace("T", " ")} UTC`;
  const secs = Math.max(0, Math.floor((nowMs - ms) / 1000));
  const unit = AGO.find(([size]) => secs >= size);
  if (!unit) return `${at} (just now)`;
  const n = Math.floor(secs / unit[0]);
  return `${at} (${n} ${unit[1]}${n === 1 ? "" : "s"} ago)`;
}
