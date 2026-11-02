import type { Kind, Patch, Zone } from "../accounts/types.js";

export const PROVIDERS = ["github", "drive"] as const;
const ZONES: readonly string[] = ["private", "personal", "company"];
export type Parsed<T> = { value: T } | { error: string };
export type NewBody = { provider: string; label: string; kind: Kind; token: string; access: Zone; dataZone: Zone };

const obj = (b: unknown): Record<string, unknown> | undefined =>
  typeof b === "object" && b !== null && !Array.isArray(b) ? (b as Record<string, unknown>) : undefined;
const text = (v: unknown): v is string => typeof v === "string" && v.trim() !== "" && v.length <= 200;
const zone = (v: unknown): v is Zone => typeof v === "string" && ZONES.includes(v);

export function parseNew(body: unknown): Parsed<NewBody> {
  const b = obj(body);
  const bad = (m: string) => ({ error: m });
  if (!b) return bad("body must be a JSON object");
  const unknown = Object.keys(b).filter((k) => !["provider", "label", "kind", "token", "access", "dataZone"].includes(k));
  if (unknown.length > 0) return bad(`unknown fields: ${unknown.join(", ")}`);
  if (!PROVIDERS.includes(b.provider as never)) return bad(`provider must be one of ${PROVIDERS.join(", ")}`);
  if (!text(b.label)) return bad("label must be a non-empty string");
  if (b.kind === "oauth") return bad("oauth accounts are created through /v1/oauth/:provider/start");
  if (b.kind !== "pat" && b.kind !== "admin-token") return bad("kind must be pat or admin-token");
  if (typeof b.token !== "string" || b.token.trim() === "") return bad("token must be a non-empty string");
  const access = b.access ?? "private";
  const dataZone = b.dataZone ?? "private";
  if (!zone(access) || !zone(dataZone)) return bad("access and dataZone must be private, personal or company");
  return { value: { provider: b.provider as string, label: b.label, kind: b.kind, token: b.token as string, access, dataZone } };
}

export function parsePatch(body: unknown): Parsed<Patch> {
  const b = obj(body);
  if (!b || Object.keys(b).length === 0) return { error: "body must set label, access or dataZone" };
  const unknown = Object.keys(b).filter((k) => !["label", "access", "dataZone"].includes(k));
  if (unknown.length > 0) return { error: `only label, access and dataZone can change, not ${unknown.join(", ")}` };
  if (b.label !== undefined && !text(b.label)) return { error: "label must be a non-empty string" };
  if ((b.access !== undefined && !zone(b.access)) || (b.dataZone !== undefined && !zone(b.dataZone)))
    return { error: "access and dataZone must be private, personal or company" };
  return { value: b as Patch };
}
