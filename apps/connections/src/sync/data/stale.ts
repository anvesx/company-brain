import { narrows } from "../../accounts/rules/narrow.js";
import type { Account } from "../../accounts/types.js";
import type { Deps } from "../../deps.js";
import { closeAccountEdges } from "./disconnect.js";

/** After a sync that started with `started`: if the account was narrowed or disconnected meanwhile, close the edges the sync wrote at the old zone. */
export function closeStaleEdges(d: Deps, started: Account): void {
  if (!d.sync) return;
  const now = d.store.get(started.id);
  if (!now || narrows(started.dataZone, now.dataZone)) closeAccountEdges(d.sync.graph, started, d.now() * 1000);
}
