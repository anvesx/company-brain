import { call } from "../api.js";
import { field, h, mount, select } from "../dom.js";
import { KINDS, PROVIDERS, WIDENING, warning, zoneField } from "./hints.js";

const ROUTE = { github: "github", drive: "google" };

/** The add form. oauth asks the server for a provider url and navigates to it; the others post the pasted token. */
export function add(root) {
  const el = (id) => root.querySelector(`#${id}`);
  const say = (text, bad) => {
    const m = el("msg");
    m.textContent = text ?? "";
    m.className = `hint${bad ? " bad" : ""}`;
  };
  const sync = () => {
    el("token-field").hidden = el("kind").value === "oauth";
    el("go").textContent = el("kind").value === "oauth" ? "Continue to sign in" : "Add connection";
    say(warning(el("kind").value, el("access").value, el("dataZone").value), true);
  };
  const submit = async (e) => {
    e.preventDefault();
    const v = { label: el("label").value.trim(), access: el("access").value, dataZone: el("dataZone").value };
    const kind = el("kind").value;
    const provider = el("provider").value;
    if (kind === "oauth") {
      const r = await call("GET", `/v1/oauth/${ROUTE[provider]}/start-url?${new URLSearchParams(v)}`);
      if (r.ok) return location.assign(r.data.url);
      return say(r.status === 404 ? "Sign-in for this provider is not set up on this server." : r.error, true);
    }
    const r = await call("POST", "/v1/accounts", { ...v, provider, kind, token: el("token").value });
    if (r.ok) location.hash = `#/account/${r.data.id}`;
    else say(r.error, true);
  };
  const form = h(
    "form",
    { onsubmit: submit, onchange: sync },
    field("Provider", "provider", select("provider", PROVIDERS, "github")),
    field("Credential", "kind", select("kind", KINDS, "oauth")),
    field("Label", "label", h("input", { id: "label", required: true, maxlength: 200, placeholder: "Work GitHub" })),
    h(
      "div",
      { class: "field", id: "token-field", hidden: true },
      h("label", { for: "token" }, "Token"),
      h("input", { id: "token", type: "password", autocomplete: "off" }),
      h("p", { class: "hint" }, "Stored encrypted and never shown again."),
    ),
    zoneField("access", "Access", "access", "private"),
    zoneField("dataZone", "Data zone", "dataZone", "private"),
    h("p", { class: "rule-box" }, WIDENING),
    h("p", { id: "msg", class: "hint" }),
    h("button", { id: "go", type: "submit" }, "Continue to sign in"),
  );
  mount(root, h("h1", {}, "Add connection"), h("p", { class: "lede" }, "Link an account, then decide who may use it and who may read what it syncs."), form);
}
