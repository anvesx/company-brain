import type { GraphStore } from "@brain/graph-store";
import type { Store } from "./accounts/store.js";
import type { Caller } from "./accounts/types.js";
import type { OAuthProvider } from "./oauth/providers.js";

export type Deps = {
  store: Store;
  /** Secret that signs the `user:tenant:exp:hmac` bearer, shared with the brain app. */
  secret: string;
  /** Current time in epoch seconds. */
  now: () => number;
  /** Whether the caller is an admin of their tenant. */
  isAdmin: (c: Caller) => boolean;
  /** Configured sign-in providers by route name (`github`, `google`). Absent names answer 404. */
  oauth?: Record<string, OAuthProvider>;
  /** Where `POST /accounts/:id/sync` writes. Absent: the route answers 501. `githubApiUrl` and `driveRootUrl` point the adapters at another host. */
  sync?: { graph: GraphStore; githubApiUrl?: string; driveRootUrl?: string };
  /** When set, the per-user token file is rewritten after a refresh or a disconnect. */
  tokensFile?: string;
};
