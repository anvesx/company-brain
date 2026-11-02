import { when } from "../actions.js";
import { call } from "../api.js";
import { h, mount, select } from "../dom.js";
import { PROVIDERS, ZONES } from "./hints.js";

const name = (pairs, v) => pairs.find(([k]) => k === v)?.[1] ?? v;
const fact = (term, value) => [h("dt", {}, term), h("dd", {}, value)].map((n) => n);

const card = (a) =>
  h(
    "a",
    { class: "card", href: `#/account/${a.id}` },
    h("h3", {}, a.label),
    h("p", { class: "sub" }, `${name(PROVIDERS, a.provider)}, owned by ${a.owner}`),
    h(
      "dl",
      { class: "facts" },
      ...["Credential", "Access", "Data zone", "Status", "Last sync"].map((t, i) => {
        const v = [a.kind, a.access, a.dataZone, a.status, when(a.lastSyncAt)][i];
        return h("div", {}, ...fact(t, i === 3 ? h("span", { class: `status ${v}` }, v) : v));
      }),
    ),
  );

/** Every account the caller may see, as cards, with provider and data zone filters. */
export async function list(root, flash) {
  const r = await call("GET", "/v1/accounts");
  if (!r.ok) return mount(root, h("p", { class: "note bad" }, r.error));
  const rows = h("div", { id: "rows" });
  const provider = select("f-provider", [["", "All providers"], ...PROVIDERS], "");
  const zone = select("f-zone", [["", "Any data zone"], ...ZONES], "");
  const draw = () => {
    const shown = r.data.accounts.filter((a) => (!provider.value || a.provider === provider.value) && (!zone.value || a.dataZone === zone.value));
    const none = r.data.accounts.length === 0 ? "No connections yet. Add one to start." : "No connections match these filters.";
    mount(rows, ...(shown.length ? shown.map(card) : [h("p", { class: "empty" }, none)]));
  };
  provider.addEventListener("change", draw);
  zone.addEventListener("change", draw);
  mount(
    root,
    flash && h("p", { class: `note${flash.bad ? " bad" : ""}` }, flash.text),
    h("h1", {}, "Connections"),
    h("p", { class: "lede" }, "Accounts you own, plus company accounts shared in your tenant. Credentials are never shown."),
    h("div", { class: "filters" }, provider, zone),
    rows,
  );
  draw();
}
