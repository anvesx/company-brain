import type { Connector } from "@anvesx/connector-kit";
import type { Caller } from "../auth.js";
import type { Recheck } from "./recheck.js";

export interface SourceRecheckDeps {
  /** Connectors keyed by `GraphNode.source`, which is the connector id. */
  connectors: Record<string, Connector>;
  /** The asker's own token for that source, or undefined when they have none. */
  tokenFor(caller: Caller, source: string): string | undefined;
}

/** A `Recheck` that asks the document's source with the asker's own token. No token, connector or `canRead` means deny. */
export const sourceRecheck =
  ({ connectors, tokenFor }: SourceRecheckDeps): Recheck =>
  async (doc, caller) => {
    const connector = connectors[doc.source];
    const token = tokenFor(caller, doc.source);
    if (connector?.canRead === undefined || token === undefined) return false;
    return connector.canRead(doc.address, { token });
  };
