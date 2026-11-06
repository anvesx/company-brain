import type { AuthContext } from "better-auth";

type Adapter = AuthContext["adapter"];

/** What an app may know about a person: the email on file and the ids of the accounts linked to them. */
export interface Names {
  email: string;
  emailVerified: boolean;
  accountIds: string[];
}

/** Rows per read: a person with more accounts is read page by page (the adapter alone stops at its default of 100). */
const PAGE = 100;

/**
 * Read one person's user row and account rows through better-auth's own adapter, so apps never touch the identity tables.
 * `accountIds` are the `account` row ids that `port.accessToken(user, providerId, accountId)` takes. The password
 * (`credential`) row is not a linked service, so it is left out. An unknown user gives an empty email and no ids.
 */
export const readNames = async (adapter: Adapter, userId: string): Promise<Names> => {
  const user = await adapter.findOne<{ email: string; emailVerified: boolean }>({
    model: "user",
    where: [{ field: "id", value: userId }],
    select: ["email", "emailVerified"],
  });
  if (!user) return { email: "", emailVerified: false, accountIds: [] };
  const rows: { id: string; providerId: string }[] = [];
  for (;;) {
    // Sorted by id so pages never overlap; the first page that is not full is the last.
    const page = await adapter.findMany<{ id: string; providerId: string }>({
      model: "account",
      where: [{ field: "userId", value: userId }],
      select: ["id", "providerId"],
      sortBy: { field: "id", direction: "asc" },
      limit: PAGE,
      offset: rows.length,
    });
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return { email: user.email, emailVerified: Boolean(user.emailVerified), accountIds: rows.filter((r) => r.providerId !== "credential").map((r) => r.id) };
};
