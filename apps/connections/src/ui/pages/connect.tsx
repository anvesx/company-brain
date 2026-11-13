import { Button, Eyebrow, Heading, Link, Paragraph } from "@anvesx/design-system";
import type { Entry } from "../model/directory.js";
import { Shell } from "../shell/layout.js";

type Props = { email: string; entry: Entry; startUrl: string };

/** Before consent: exactly what the brain will read, then one full-page hop to the provider's own sign-in. */
export const ConnectPage = ({ email, entry, startUrl }: Props) => (
  <Shell title={`Add ${entry.name}`} email={email}>
    <Eyebrow>Add connector</Eyebrow>
    <Heading>Connect {entry.name}</Heading>
    <Paragraph>
      You will sign in on {entry.name}'s own page at <code>{entry.origin}</code>. Company Brain never sees your password.
    </Paragraph>
    <Heading level={2}>What it reads</Heading>
    {entry.scopes.length > 0 ? (
      <ul class="scopes">
        {entry.scopes.map((s) => (
          <li>
            <code>{s}</code>
          </li>
        ))}
      </ul>
    ) : (
      <Paragraph>The provider asks for no named permission.</Paragraph>
    )}
    <Paragraph>Everything it reads is stored as private: only you can see it until you widen it on the account page.</Paragraph>
    <form class="acts" method="get" action={startUrl}>
      <Button type="submit">Continue to {entry.name}</Button>
      <Link href="/">Cancel</Link>
    </form>
  </Shell>
);
