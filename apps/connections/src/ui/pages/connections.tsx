import { Eyebrow, Heading, Link, Paragraph, Table, TableHeader, TableRow } from "@anvesx/design-system";
import type { Group } from "../model/directory.js";
import { count, when } from "../model/format.js";
import type { Row } from "../model/rows.js";
import { Shell } from "../shell/layout.js";
import { type Note, Status } from "../shell/status.js";

type Props = { email: string; rows: Row[]; groups: Group[]; now: number; note?: Note | undefined };

const Connected = ({ rows, now }: { rows: Row[]; now: number }) => (
  <Table>
    <thead>
      <TableRow>
        {["Provider", "Account", "Status", "Last sync", "Items", "Failures"].map((h) => (
          <TableHeader>{h}</TableHeader>
        ))}
      </TableRow>
    </thead>
    <tbody>
      {rows.map((r) => (
        <tr>
          <td data-label="Provider">{r.provider}</td>
          <td data-label="Account">
            <a href={`/accounts/${encodeURIComponent(r.account.id)}`}>{r.account.label}</a>
          </td>
          <td data-label="Status">
            <Status state={r.state} />
            {r.state.reason && <span class="why">{r.state.reason}</span>}
          </td>
          <td data-label="Last sync">{when(r.account.lastSyncAt, now)}</td>
          <td class="num" data-label="Items">
            {r.items === null ? "n/a" : count(r.items)}
          </td>
          <td class="num" data-label="Failures">
            {count(r.health.failures)}
          </td>
        </tr>
      ))}
    </tbody>
  </Table>
);

/** The home screen: connected accounts first, then everything the catalog offers. */
export const ConnectionsPage = ({ email, rows, groups, now, note }: Props) => (
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
      <section id={g.entries.some((e) => !e.reason) ? "add" : undefined}>
        <Heading level={2}>{g.title}</Heading>
        <ul class="dir">
          {g.entries.map((e) => (
            <li>
              <span class="name">{e.name}</span>
              {e.reason ? <span class="why">{e.reason}</span> : <Link href={`/connect/${encodeURIComponent(e.id)}`}>Add</Link>}
            </li>
          ))}
        </ul>
      </section>
    ))}
  </Shell>
);
