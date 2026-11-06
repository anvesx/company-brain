import type { Connector } from "@anvesx/connector-kit";

/** The one rule for email names: lowercase. identity stores emails lowercased, so ACLs and aliases must be too. */
export const lowerEmail = (name: string): string => (name.includes("@") ? name.toLowerCase() : name);

/**
 * The same connector, but every email in its ACLs and group memberships is lowercased as it is read. This is the
 * one place source names enter the graph, so `Alice@Example.COM` in Drive and `alice@example.com` in identity meet.
 * Logins, group ids and anything without an `@` are left exactly as the source wrote them.
 */
export function withLowercaseEmails(inner: Connector): Connector {
  const wrapped: Connector = {
    id: inner.id,
    list: async (query) => {
      const page = await inner.list(query);
      return { ...page, items: page.items.map((d) => ({ ...d, acl: { ...d.acl, allowUsers: d.acl.allowUsers.map(lowerEmail) } })) };
    },
    fetch: (address, context) => inner.fetch(address, context),
  };
  if (inner.enforcesUserToken !== undefined) wrapped.enforcesUserToken = inner.enforcesUserToken;
  if (inner.canRead) wrapped.canRead = (address, context) => (inner.canRead as NonNullable<Connector["canRead"]>)(address, context);
  if (inner.listMemberships) {
    wrapped.listMemberships = async () =>
      (await (inner.listMemberships as NonNullable<Connector["listMemberships"]>)()).map((m) => ({ ...m, user: lowerEmail(m.user) }));
  }
  return wrapped;
}
