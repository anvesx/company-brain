import type { Connector } from "@anvesx/connector-kit";
import type { Account } from "../accounts/types.js";
import { coreZone, keepsSourceAcl } from "./zone.js";

/**
 * Every listed document carries the account's zone as a core-types zone (see `coreZone`).
 * A `private` or `personal` account is written owner-only: each document's readers become the owner alone and no memberships are listed,
 * so nothing from the source's ACL reaches the shared graph. A `company` account keeps the source's readers.
 */
export const withZone = (c: Connector, a: Pick<Account, "dataZone" | "owner">): Connector => {
  const zone = coreZone(a.dataZone);
  const open = keepsSourceAcl(a.dataZone);
  const out: Connector = {
    ...c,
    list: async (q) => {
      const page = await c.list(q);
      const items = page.items.map((d) => ({ ...d, zone, ...(!open && { acl: { allowUsers: [a.owner], allowGroups: [], version: d.acl.version } }) }));
      return { ...page, items };
    },
  };
  if (!open) delete out.listMemberships;
  return out;
};
