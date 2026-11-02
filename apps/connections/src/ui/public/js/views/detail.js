import { call, who } from "../api.js";
import { h, mount } from "../dom.js";
import { WIDENING, zoneField } from "./hints.js";

const fact = (t, v) => h("div", {}, h("dt", {}, t), h("dd", {}, v));

/** One account: facts for everyone; the owner can change zones and disconnect. */
export async function detail(root, id) {
  const r = await call("GET", "/v1/accounts");
  const a = r.ok ? r.data.accounts.find((x) => x.id === id) : undefined;
  if (!a) return mount(root, h("p", { class: "note bad" }, r.ok ? "That connection was not found." : r.error), h("a", { href: "#/" }, "Back to connections"));
  const msg = h("p", { class: "hint", id: "msg" });
  const say = (t, bad) => Object.assign(msg, { textContent: t, className: `hint${bad ? " bad" : ""}` });
  const val = (n) => root.querySelector(`#${n}`).value;
  const save = async (e) => {
    e.preventDefault();
    const p = await call("PATCH", `/v1/accounts/${id}`, { access: val("access"), dataZone: val("dataZone") });
    say(p.ok ? "Saved." : p.error, !p.ok);
  };
  const ask = h(
    "p",
    { hidden: true },
    "Disconnect deletes the stored credential and closes this account's graph edges. ",
    h(
      "button",
      {
        type: "button",
        class: "danger",
        id: "confirm",
        onclick: async () => {
          const d = await call("DELETE", `/v1/accounts/${id}`);
          if (d.ok) location.hash = "#/";
          else say(d.error, true);
        },
      },
      "Yes, disconnect",
    ),
  );
  const mine = a.owner === who().user;
  mount(
    root,
    h("a", { href: "#/" }, "All connections"),
    h("h1", {}, a.label),
    h("dl", { class: "facts" }, fact("Provider", a.provider), fact("Owner", a.owner), fact("Credential", a.kind), fact("Status", a.status)),
    mine
      ? h(
          "form",
          { onsubmit: save },
          h("h2", {}, "Zones"),
          zoneField("access", "Access", "access", a.access),
          zoneField("dataZone", "Data zone", "dataZone", a.dataZone),
          h("p", { class: "rule-box" }, WIDENING),
          msg,
          h(
            "div",
            { class: "actions" },
            h("button", { type: "submit" }, "Save zones"),
            h("button", { type: "button", class: "danger", id: "disconnect", onclick: () => ask.removeAttribute("hidden") }, "Disconnect"),
          ),
          ask,
        )
      : h("p", { class: "note" }, `Shared by ${a.owner}. Only the owner can change or disconnect it. Access is ${a.access}, data zone is ${a.dataZone}.`),
  );
}
