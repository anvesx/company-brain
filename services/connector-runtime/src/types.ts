import type { CursorStore } from "@brain/change-cursor";
import type { Connector } from "@brain/connector-kit";

/** One document at one version, delivered to the sink at most once per tenant. */
export interface ChangeEvent {
  tenantId: string;
  connectorId: string;
  address: string;
  version: string;
  title: string;
  /** Injected clock reading, ms. */
  emittedAt: number;
}

export type Sink = (event: ChangeEvent) => void | Promise<void>;

export interface RuntimeDeps {
  connector: Connector;
  cursors: CursorStore;
  sink: Sink;
  clock: () => number;
  /** Items per list call, integer 1-1000. Default 100. */
  pageSize?: number;
}

export interface RunResult {
  emitted: number;
  skipped: number;
  /** True when a BAD_CURSOR forced a full rescan. */
  restarted: boolean;
}

export interface ConnectorRuntime {
  runOnce(tenantId: string): Promise<RunResult>;
}
