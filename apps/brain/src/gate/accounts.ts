import type { createIdentity } from "@anvesx/identity";
import { lowerEmail } from "./email.js";

type Identity = ReturnType<typeof createIdentity>;
/** The two reads used from better-auth's adapter; its own types are not visible from this package. */
interface Adapter {
  findOne<T>(q: { model: string; where: { field: string; value: string }[] }): Promise<T | null>;
  findMany<T>(q: { model: string; where: { field: string; value: string }[] }): Promise<T[]>;
}
/** Other names the sources know this person by: ids and emails that connectors write into ACLs. */
export type Aliases = (user: string) => Promise<string[]>;

/**
 * Connectors name people by Drive email or GitHub login, but identity ids are random strings. This reads the
 * person's verified email and every linked account id from identity's own tables (it has no port for them yet).
 * An email that identity has not verified is never an alias, or anyone could sign up as someone else's address.
 */
export const identityAliases =
  (identity: Identity): Aliases =>
  async (user) => {
    const db = (await identity.auth.$context).adapter as Adapter;
    const person = await db.findOne<{ email: string; emailVerified: boolean }>({ model: "user", where: [{ field: "id", value: user }] });
    const linked = await db.findMany<{ accountId: string }>({ model: "account", where: [{ field: "userId", value: user }] });
    const names = [...(person?.emailVerified ? [person.email] : []), ...linked.map((a) => a.accountId)].map(lowerEmail);
    // A blank account id would make graph-store reject the lookup (a 500), so only real names are kept.
    return [...new Set(names.filter((n) => n.trim() !== "" && n !== user))];
  };
