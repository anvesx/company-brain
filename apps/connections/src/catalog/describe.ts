import type { Manifest } from "@anvesx/connectors";

const CATEGORY: Record<string, string> = { github: "Code", drive: "Documents", gmail: "Email", slack: "Chat" };

/** The directory group of a connector; the manifests carry none, so the app names it. A tenant's own connector is `Custom`. */
export const categoryOf = (m: Manifest, custom = false): string => (custom ? "Custom" : (CATEGORY[m.id] ?? "Other"));

const READS: Record<string, string> = {
  repo: "Your GitHub repositories, including private ones. GitHub offers only a read and write grant for this; Company Brain only reads.",
  "https://www.googleapis.com/auth/drive.readonly": "The files in your Google Drive, read only.",
  "https://www.googleapis.com/auth/gmail.readonly": "Your Gmail messages, read only.",
  "channels:read": "The names of public Slack channels.",
  "channels:history": "Messages in public Slack channels.",
  "groups:read": "The names of private Slack channels you are in.",
  "groups:history": "Messages in private Slack channels you are in.",
  "users:read": "The names of people in the Slack workspace.",
};

/** What a scope lets the brain read, in a sentence; an unknown scope is named as asked, never hidden. */
export const readsOf = (m: Manifest): string[] =>
  m.auth.kind === "oauth2" ? m.auth.scopes.map((s) => READS[s] ?? `Access named "${s.split("/").pop()}".`) : [];
