import type { Kind, Patch, Zone } from "../../accounts/types.js";
import { validRepo } from "../../sync/data/repo.js";

const ZONES: readonly string[] = ["private", "personal", "company"];
export type Parsed<T> = { value: T } | { error: string };
export type NewBody = { provider: string; label: string; kind: Kind; token: string; access: Zone; dataZone: Zone; repo?: string };

const obj = (b: unknown): Record<string, unknown> | undefined =>
  typeof b === "object" && b !== null && !Array.isArray(b) ? (b as Record<string, unknown>) : undefined;
const text = (v: unknown): v is string => typeof v === "string" && v.trim() !== "" && v.length <= 200;
const zone = (v: unknown): v is Zone => typeof v === "string" && ZONES.includes(v);

/** `apps` are the catalog rows the caller may use. A kind the app does not accept is refused. */
export function parseNew(body: unknown, apps: readonly { id: string; kinds: readonly Kind[]; needsRepo: boolean }[]): Parsed<NewBody> {
  const b = obj(body);
  const bad = (m: string) => ({ error: m });
  if (!b) return bad("body must be a JSON object");
  const unknown = Object.keys(b).filter((k) => !["provider", "label", "kind", "token", "access", "dataZone", "repo"].includes(k));
  if (unknown.length > 0) return bad(`unknown fields: ${unknown.join(", ")}`);
  const app = apps.find((a) => a.id === b.provider);
  if (!app) return bad(`provider must be one of ${apps.map((a) => a.id).join(", ")}`);
  if (!text(b.label)) return bad("label must be a non-empty string");
  if (b.kind === "oauth") return bad("oauth accounts are created through /v1/oauth/:provider/start");
  if (b.kind !== "pat" && b.kind !== "admin-token") return bad("kind must be pat or admin-token");
  if (!app.kinds.includes(b.kind)) return bad(`a ${app.id} account cannot use a ${b.kind} credential`);
  if (typeof b.token !== "string" || b.token.trim() === "") return bad("token must be a non-empty string");
  const access = b.access ?? "private";
  const dataZone = b.dataZone ?? "private";
  if (!zone(access) || !zone(dataZone)) return bad("access and dataZone must be private, personal or company");
  if (b.repo !== undefined && (!app.needsRepo || !validRepo(b.repo))) return bad("repo must be owner/name, and only a github account has one");
  const repo = b.repo === undefined ? {} : { repo: b.repo as string };
  return { value: { provider: b.provider as string, label: b.label, kind: b.kind, token: b.token as string, access, dataZone, ...repo } };
}

export function parsePatch(body: unknown): Parsed<Patch> {
  const b = obj(body);
  if (!b || Object.keys(b).length === 0) return { error: "body must set label, access, dataZone or repo" };
  const unknown = Object.keys(b).filter((k) => !["label", "access", "dataZone", "repo"].includes(k));
  if (unknown.length > 0) return { error: `only label, access, dataZone and repo can change, not ${unknown.join(", ")}` };
  if (b.label !== undefined && !text(b.label)) return { error: "label must be a non-empty string" };
  if (b.repo !== undefined && b.repo !== null && !validRepo(b.repo)) return { error: "repo must be owner/name or null" };
  if ((b.access !== undefined && !zone(b.access)) || (b.dataZone !== undefined && !zone(b.dataZone)))
    return { error: "access and dataZone must be private, personal or company" };
  return { value: b as Patch };
}

export function parseStart(q: Record<string, string>, provider: string): Parsed<{ label: string; access: Zone; dataZone: Zone }> {
  const access = q.access ?? "private";
  const dataZone = q.dataZone ?? "private";
  if (!zone(access) || !zone(dataZone)) return { error: "access and dataZone must be private, personal or company" };
  const label = q.label ?? `${provider} account`;
  return text(label) ? { value: { label, access, dataZone } } : { error: "label must be a non-empty string" };
}
