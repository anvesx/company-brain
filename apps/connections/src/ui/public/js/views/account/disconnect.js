import { call } from "../../api.js";
import { h } from "../../dom.js";

/** The hidden confirm line under the form: only its button deletes the account. `say` reports a failure. */
export function disconnectPrompt(id, say) {
  return h(
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
}
