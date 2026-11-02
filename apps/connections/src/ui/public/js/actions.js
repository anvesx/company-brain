import { call } from "./api.js";

/** The oauth route name for each provider. */
export const ROUTE = { github: "github", drive: "google" };

export const when = (ms) => (ms ? new Date(ms).toLocaleString() : "never");

/** Sync now. `say(text, bad)` shows the outcome; `done()` redraws the page so the new time shows. */
export async function syncNow(a, say, done) {
  say("Syncing...");
  const r = await call("POST", `/v1/accounts/${a.id}/sync`, {});
  if (!r.ok) return say(r.status === 409 ? "This connection needs to be re-authorised first." : r.error, true);
  say("Synced.");
  return done();
}

/** Re-authorise: the same start-url flow as adding an oauth connection, with this account's label and zones. */
export async function reauthorise(a, say) {
  const q = new URLSearchParams({ label: a.label, access: a.access, dataZone: a.dataZone });
  const r = await call("GET", `/v1/oauth/${ROUTE[a.provider]}/start-url?${q}`);
  if (r.ok) return location.assign(r.data.url);
  return say(r.status === 404 ? "Sign-in for this provider is not set up on this server." : r.error, true);
}
