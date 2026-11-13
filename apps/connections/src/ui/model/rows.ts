import type { Health } from "../../accounts/health/health.js";
import type { Account, Caller } from "../../accounts/types.js";
import type { Deps } from "../../deps.js";
import { sourceOf } from "../../sync/connector.js";
import { type State, stateOf } from "./state.js";

export type Row = { account: Account; provider: string; state: State; health: Health; items: number | null };

/** Live documents this account put in the graph; null when the app has no graph to count in. */
const itemsOf = (d: Deps, a: Account): number | null =>
  d.sync ? d.sync.graph.neighbors(a.tenant, `connector:${sourceOf(a)}`, { kind: "belongs-to", dir: "in" }).length : null;

/** The accounts this caller may see, each with its state and exact counts. */
export function connected(d: Deps, caller: Caller): Row[] {
  return d.store.listVisible(caller).map((account) => {
    const health = d.store.health.read(account.tenant, account.id);
    const provider = d.catalog.get(account.provider, account.tenant)?.name ?? account.provider;
    return { account, provider, state: stateOf(account, health), health, items: itemsOf(d, account) };
  });
}

export const findRow = (d: Deps, caller: Caller, id: string): Row | undefined => connected(d, caller).find((r) => r.account.id === id);
