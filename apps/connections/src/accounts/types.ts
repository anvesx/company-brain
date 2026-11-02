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
};

export type NewAccount = Omit<Account, "id" | "status"> & { secret: string };
export type Patch = Partial<Pick<Account, "label" | "access" | "dataZone">>;
