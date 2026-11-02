import { setToken, token, who } from "./api.js";
import { mount } from "./dom.js";
import { detail } from "./views/account/detail.js";
import { add } from "./views/add.js";
import { list } from "./views/list.js";
import { signin } from "./views/signin.js";

const view = document.getElementById("view");
const params = new URLSearchParams(location.search);
// The OAuth callback lands here with ?connected=id or ?oauth_error=reason. Read it once, then clean the address bar.
let flash = params.has("connected")
  ? { text: "Connection added.", id: params.get("connected") }
  : params.has("oauth_error")
    ? { text: `Sign-in did not finish: ${params.get("oauth_error")}`, bad: true }
    : null;
if (params.size > 0) history.replaceState(null, "", `/${location.hash}`);

async function render() {
  const authed = Boolean(token());
  document.getElementById("nav").hidden = !authed;
  if (!authed) return signin(view, render);
  const { user, tenant } = who();
  document.getElementById("who").textContent = `${user} in ${tenant}`;
  const [name, id] = location.hash.slice(2).split("/");
  const shown = flash;
  flash = null;
  if (name === "add") return add(view);
  if (name === "account" && id) return detail(view, id);
  mount(view);
  return list(view, shown);
}

document.getElementById("signout").addEventListener("click", () => {
  setToken(null);
  location.hash = "#/";
  render();
});
addEventListener("hashchange", render);
render();
