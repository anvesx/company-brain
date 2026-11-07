import type { ProviderEntry } from "@anvesx/identity";

/**
 * The connectors a person can link from /connections. Data only: no secret lives here. A tile is live once its
 * `<ID>_CLIENT_ID` and `<ID>_CLIENT_SECRET` are in the environment (`GITHUB_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_ID`,
 * `SLACK_CLIENT_ID`); until then identity shows it greyed as "not configured", never hidden, so the operator can see
 * what is missing. `built-in` rides better-auth's own provider; `generic` names its endpoints. Scopes are the least
 * each source needs to read what the brain indexes.
 */
export const CATALOG: readonly ProviderEntry[] = [
  { id: "github", name: "GitHub", description: "Repositories, issues and pull requests you can read.", scopes: ["read:user", "repo"], kind: "built-in" },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Documents and folders shared with you.",
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    kind: "generic",
    generic: { discoveryUrl: "https://accounts.google.com/.well-known/openid-configuration", accessType: "offline" },
  },
  {
    id: "slack",
    name: "Slack",
    description: "Channels and messages in your workspace.",
    scopes: ["channels:history", "channels:read", "users:read"],
    kind: "generic",
    generic: {
      authorizationUrl: "https://slack.com/oauth/v2/authorize",
      tokenUrl: "https://slack.com/api/oauth.v2.access",
      userInfoUrl: "https://slack.com/api/users.identity",
    },
  },
];
