import { Eyebrow, Heading, Paragraph } from "@anvesx/design-system";
import type { Group } from "../model/directory.js";
import { count } from "../model/format.js";
import type { Row } from "../model/rows.js";
import { Shell } from "../shell/layout.js";
import type { Note } from "../shell/status.js";
import { Connected } from "./parts.js";

type Props = { email: string; rows: Row[]; groups: Group[]; now: number; note?: Note | undefined };

/** The home screen: connected accounts first, then everything the catalog offers. */
export const ConnectionsPage = ({ email, rows, groups, now, note }: Props) => {
  const first = groups.find((g) => g.entries.some((e) => !e.reason))?.title;
  return (
    <Shell title="Connections" email={email} note={note}>
      <Eyebrow>Connections</Eyebrow>
      <Heading>Connected apps</Heading>
      {rows.length > 0 ? (
        <Connected rows={rows} now={now} />
      ) : (
        <div class="empty">
          <Paragraph>No app is connected yet.</Paragraph>
          <a class="btn" href="#add">
            Choose an app to add
          </a>
        </div>
      )}
      {groups.map((g) => (
        <section id={g.title === first ? "add" : undefined}>
          <Heading level={2}>
            {g.title} <span class="count">{count(g.entries.length)}</span>
          </Heading>
          <ul class="dir">
            {g.entries.map((e) => (
              <li>
                <span class="name">{e.name}</span>
                {e.reason ? (
                  <span class="why">Not available. {e.reason}</span>
                ) : (
                  <a class="btn btn-2 go" href={`/connect/${encodeURIComponent(e.id)}`} aria-label={`Add ${e.name}`}>
                    Add
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Shell>
  );
};
