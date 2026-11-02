import { call, setToken } from "../api.js";
import { field, h, mount } from "../dom.js";

/** Ask for the `user:tenant:exp:hmac` bearer the brain app also uses, and keep it only if the API accepts it. */
export function signin(root, done) {
  const note = h("p", { class: "hint", id: "signin-note" }, "Tokens are issued by your tenant admin and expire.");
  const input = h("input", { id: "bearer", type: "password", autocomplete: "off", required: true, placeholder: "user:tenant:expiry:signature" });
  const form = h(
    "form",
    {
      onsubmit: async (e) => {
        e.preventDefault();
        setToken(input.value.trim().replace(/^Bearer\s+/i, ""));
        const r = await call("GET", "/v1/accounts");
        if (r.ok) return done();
        setToken(null);
        note.textContent = r.status === 401 ? "That token was not accepted. It may be mistyped or expired." : r.error;
        note.className = "hint bad";
      },
    },
    field("Access token", "bearer", input, note),
    h("button", { type: "submit" }, "Sign in"),
  );
  mount(root, h("h1", {}, "Sign in"), h("p", { class: "lede" }, "Connections shows the accounts you have linked to the company brain."), form);
}
