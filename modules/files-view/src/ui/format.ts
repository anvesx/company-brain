import type { FilesQuery } from "./types.js";

const UNITS = ["B", "KB", "MB", "GB", "TB"];

/** 1536 -> "1.5 KB". Invalid input renders an em dash. */
export function formatSize(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  let i = 0;
  let v = n;
  while (v >= 1024 && i < UNITS.length - 1) {
    v /= 1024;
    i++;
  }
  return `${i === 0 ? v : v.toFixed(1)} ${UNITS[i]}`;
}

/** ISO to "2026-11-13 09:30 UTC". Unparseable input is returned unchanged. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/** Coarse age for freshness: "just now", "5 min ago", "3 days ago". */
export function age(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (Number.isNaN(s)) return iso;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

/** Build `/files?...` keeping the current query, overriding keys. The cursor resets unless given. */
export function href(base: string, q: FilesQuery, over: Partial<FilesQuery> = {}): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...q, cursor: undefined, ...over })) if (v) p.set(k, String(v));
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}
