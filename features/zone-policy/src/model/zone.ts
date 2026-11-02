/**
 * A trust zone. Personal data belongs to one owner, team data to one team,
 * company data to everyone. Defined locally: core-types' Zone is a bare enum
 * with no owner or team.
 */
export type Zone = { kind: "personal"; owner: string } | { kind: "team"; team: string } | { kind: "company" };

/** Outward order. A higher rank is less restricted. Promotion needs a strictly higher rank. */
export const ZONE_RANK: Readonly<Record<Zone["kind"], number>> = { personal: 0, team: 1, company: 2 };

/** A viewer: a user id and the teams that user belongs to. */
export type Principal = { user: string; teams: string[] };

/** The owner's consent to promote data. `at` is recorded by the caller and not validated here. */
export type Consent = { by: string; at: number };

/** Caller-supplied proof that a user belongs to a team. Absent proof means no membership. */
export type Membership = (user: string, team: string) => boolean;

/** An identity is a non-empty string. The empty string matches nothing. */
export const hasId = (id: string): boolean => id !== "";
