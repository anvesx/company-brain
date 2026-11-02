export type Zone = "private" | "personal" | "company";
export type Kind = "oauth" | "admin-token" | "pat";
export type Status = "active" | "needs-auth";
export type Caller = { user: string; tenant: string };

/** What the API returns: the credential is never part of it. */
export type Account = {
  id: string;
  tenant: string;
  owner: string;
  provider: string;
  label: string;
  kind: Kind;
  access: Zone;
  dataZone: Zone;
  status: Status;
  /** `owner/name`, github only. Sync uses it when the request body has none. */
  repo: string | null;
};

export type NewAccount = Omit<Account, "id" | "status" | "repo"> & { secret: string; repo?: string | null };
export type Patch = Partial<Pick<Account, "label" | "access" | "dataZone" | "repo">>;
