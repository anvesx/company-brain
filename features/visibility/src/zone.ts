/** Zone as one string the gate compares: `company`, `team:<id>`, `personal:<owner>`. An unknown zone is "" and nothing matches it. */
type Props = Record<string, string>;

/** The zone of one node, from the props the connectors write (`zone`, plus `owner` or `team`). Anything else fails closed. */
export function zoneOf(props: Props): string {
  const { zone, owner, team } = props;
  if (zone === "company") return "company";
  if (zone === "personal" && owner) return `personal:${owner}`;
  if (zone === "team" && team) return `team:${team}`;
  return "";
}

/** Every zone one viewer may see. Same rule as `@anvesx/zone-policy` `canSee`: company for all, personal for its owner, team for members. */
export const zonesFor = (user: string, teams: string[]): string[] => ["company", `personal:${user}`, ...teams.map((t) => `team:${t}`)];
