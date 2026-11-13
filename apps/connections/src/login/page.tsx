import { createHash } from "node:crypto";
import { Document, Heading, Main, ProviderButton, styles } from "@anvesx/design-system";
import type { SignInPage } from "@anvesx/google-identity";

/** The sign-in page: one design-system "Continue with Google" button, no input of any kind. The policy allows its one style block by hash, so it needs no 'unsafe-inline'. */
export const signInPage = (): SignInPage => ({
  html: (notice) =>
    `<!doctype html>${(
      (
        <Document title="Sign in - Company Brain" head={<link rel="stylesheet" href="/ui/app.css" />}>
          <div class="signin">
            <Main>
              <div class="card">
                <Heading>Company Brain</Heading>
                <p class="lede">Sign in to connect your apps.</p>
                {notice && <p role="alert">{notice}</p>}
                <form method="post" action="/sign-in/google">
                  <ProviderButton />
                </form>
              </div>
            </Main>
          </div>
        </Document>
      )
    ).toString()}`,
  styleSrc: [`'sha256-${createHash("sha256").update(styles).digest("base64")}'`, "https://fonts.googleapis.com"],
  fontSrc: ["https://fonts.gstatic.com"],
});
