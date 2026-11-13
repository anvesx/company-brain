import { Button, Eyebrow, Heading, Link, Paragraph } from "@anvesx/design-system";
import type { Row } from "../model/rows.js";
import { Shell } from "../shell/layout.js";
import { type Note, Status } from "../shell/status.js";
import { RepoForm, Strip } from "./parts.js";

type Props = { email: string; row: Row; now: number; needsRepo: boolean; confirming?: boolean; note?: Note | undefined };

/** One account: its state, its health, and the three things you can do to it. */
export const AccountPage = ({ email, row, now, needsRepo, confirming, note }: Props) => {
  const { account: a, state } = row;
  const base = `/accounts/${encodeURIComponent(a.id)}`;
  const blocked = needsRepo && !a.repo;
  return (
    <Shell title={a.label} email={email} note={note}>
      <Eyebrow>{row.provider}</Eyebrow>
      <Heading>{a.label}</Heading>
      <Status state={state} />
      {state.reason && <Paragraph>{state.reason}</Paragraph>}
      <Strip row={row} now={now} />
      <div class="acts">
        {state.label === "Needs reconnect" ? (
          <form method="get" action={`/v1/oauth/${encodeURIComponent(a.provider)}/start`}>
            <Button type="submit">Reconnect {row.provider}</Button>
          </form>
        ) : (
          <form method="post" action={`${base}/sync`}>
            <Button type="submit" disabled={blocked}>
              Sync now
            </Button>
          </form>
        )}
        <form method="get" action={base}>
          <input type="hidden" name="confirm" value="1" />
          <Button secondary type="submit">
            Disconnect
          </Button>
        </form>
      </div>
      {confirming && (
        <section class="confirm" role="alertdialog" aria-label={`Disconnect ${a.label}`}>
          <Heading level={2}>Disconnect {a.label}?</Heading>
          <p>This removes the saved sign-in and stops reading {row.provider}.</p>
          <form method="post" action={`${base}/disconnect`} class="acts">
            <Button danger type="submit">
              Disconnect
            </Button>
            <Link href={base}>Keep it</Link>
          </form>
        </section>
      )}
      {blocked && state.label !== "Needs reconnect" && <Paragraph>Set a repository below, then Sync now is available.</Paragraph>}
      {needsRepo && <RepoForm base={base} repo={a.repo} />}
      <Paragraph>
        <Link href="/">Back to connections</Link>
      </Paragraph>
    </Shell>
  );
};
