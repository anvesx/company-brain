import { type Connector, ConnectorError } from "@brain/connector-kit";
import type { Pointer, Principal } from "@brain/core-types";
import type { LiveAcl } from "@brain/query-service";

export type ConnectorAclDeps = {
  connectorFor: (tenantId: string) => Connector | undefined;
  /** The user's own credential at the source, or undefined when they have none. Never the tenant's service credential. */
  userTokenFor: (principal: Principal) => string | undefined;
  /** The registry pointer for a document id, or undefined when it is not known. */
  pointerFor: (tenantId: string, docId: string) => Pointer | undefined;
};

type Verdict = "allow" | "deny" | "unknown";

/**
 * A live ACL that asks the source itself: it fetches each document with the user's token. A read that succeeds is
 * "allow", NOT_FOUND is "deny" (sources hide what a user may not read), anything else is "unknown".
 * Never throws; query-service treats everything but "allow" as fail-closed.
 */
export function createConnectorLiveAcl({ connectorFor, userTokenFor, pointerFor }: ConnectorAclDeps): LiveAcl {
  return async (tenantId, docIds, principal) => {
    const connector = connectorFor(tenantId);
    const token = userTokenFor(principal);
    const verdicts = new Map<string, Verdict>();
    await Promise.all(
      docIds.map(async (id) => {
        const pointer = pointerFor(tenantId, id);
        verdicts.set(id, connector && token && pointer ? await check(connector, pointer.address, token) : "unknown");
      }),
    );
    return new Map(docIds.map((id) => [id, verdicts.get(id) ?? "unknown"] as const));
  };
}

async function check(connector: Connector, address: string, token: string): Promise<Verdict> {
  try {
    await connector.fetch(address, { token });
    return "allow";
  } catch (error) {
    return error instanceof ConnectorError && error.code === "NOT_FOUND" ? "deny" : "unknown";
  }
}
