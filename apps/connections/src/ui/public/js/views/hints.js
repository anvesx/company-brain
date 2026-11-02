import { field, h, select } from "../dom.js";

export const KINDS = [
  ["oauth", "Sign in with the provider (oauth)"],
  ["pat", "Personal access token (pat)"],
  ["admin-token", "Admin token"],
];
export const ZONES = [
  ["private", "Private"],
  ["personal", "Personal"],
  ["company", "Company"],
];

export const WIDENING =
  "Company access or a company data zone, and any admin token, are only allowed when the owner is a tenant admin. " +
  "Everyone else can use private and personal.";

const MEANING = {
  access: "Who may use this connection. Private is you only, personal adds the agents you run, company is anyone in the tenant.",
  dataZone: "Who may read what it syncs. Set separately from access, with the same three choices.",
};

/** What the rule will probably say for this choice, before the server is asked. The server's 403 reason is what counts. */
export function warning(kind, access, dataZone) {
  if (kind === "admin-token") return "An admin token account must be owned by a tenant admin.";
  if (dataZone === "company" || access === "company") return "Company zones need a tenant admin as owner. The server will refuse this otherwise.";
  return null;
}

export const zoneField = (name, label, id, value) => field(label, id, select(id, ZONES, value), h("p", { class: "hint" }, MEANING[name]));
