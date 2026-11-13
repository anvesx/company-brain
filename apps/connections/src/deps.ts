import type { CursorStore } from "@anvesx/change-cursor";
import type { Vault } from "@anvesx/connector-vault";
import type { Registry } from "@anvesx/connectors";
import type { GraphStore } from "@anvesx/graph-store";
import type { Store } from "./accounts/store.js";
import type { Caller } from "./accounts/types.js";
import type { Session } from "./http/guard/auth.js";
import type { NetPolicy } from "./net/guard.js";
import type { OAuthProvider } from "./oauth/providers.js";

export type Deps = {
  store: Store;
  /** Secret that signs the `user:tenant:exp:hmac` bearer, shared with the brain app. */
  secret: string;
  /** Who a browser session cookie belongs to, when Google sign-in is on. The bearer is tried first. */
  session?: Session;
  /** Current time in epoch seconds. */
  now: () => number;
  /** Whether the caller is an admin of their tenant. */
  isAdmin: (c: Caller) => boolean;
  /** Which urls a tenant's custom connector may name. Default: https to public addresses only; `allowLoopback` is development only. */
  net?: NetPolicy;
  /** The connector catalog: built-in manifests plus each tenant's custom ones. Accounts, sign-in, sync and the page all read it. */
  catalog: Registry;
  /** Configured OAuth clients by app name (`github`, `google`; a manifest's `auth.app`). An app with no client answers 404. */
  oauth?: Record<string, OAuthProvider>;
  /** Where `POST /accounts/:id/sync` writes. Absent: the route answers 501. `githubApiUrl` and `driveRootUrl` point the adapters at another host. */
  sync?: { graph: GraphStore; githubApiUrl?: string; driveRootUrl?: string };
  /** Where every account's token is sealed (AES-GCM, one tenant per transaction). The account rows hold no credential. */
  vault: Vault;
  /** Per account: when it last synced (the watermark the poll reads to skip fresh accounts) and which webhook deliveries were already handled. */
  cursors: CursorStore;
  /** Queues an account sync now (connect, repo change, webhook). Absent: only Sync now and nothing in the background. */
  jobs?: { requestSync: (tenant: string, id: string, reason: string, nonce?: string) => Promise<boolean> };
  /** Shared secret of the GitHub webhook. Absent: no webhook route. */
  webhookSecret?: string;
};
