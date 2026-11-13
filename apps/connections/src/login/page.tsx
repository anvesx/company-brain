import { createHash } from "node:crypto";
import { Document, Heading, Main, ProviderButton, styles } from "@anvesx/design-system";
import type { SignInPage } from "@anvesx/google-identity";

/** The sign-in page: one design-system "Continue with Google" button, no input of any kind. The policy allows its one style block by hash, so it needs no 'unsafe-inline'. */
export const signInPage = (): SignInPage => ({
  html: `<!doctype html>${(
    (
      <Document title="Sign in">
        <Main>
          <Heading>Company Brain</Heading>
          <form method="post" action="/sign-in/google">
            <ProviderButton />
          </form>
        </Main>
      </Document>
    )
  ).toString()}`,
  styleSrc: [`'sha256-${createHash("sha256").update(styles).digest("base64")}'`, "https://fonts.googleapis.com"],
  fontSrc: ["https://fonts.gstatic.com"],
});
